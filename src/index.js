// Cloudflare Worker entry: JSON API under /api, static SPA for everything else.
import { HttpError, json } from './util.js';
import { handleAdmin } from './admin.js';
import { handleTenant, handlePublic } from './tenant.js';
import { handleContact } from './contact.js';
import { renderLanding, contactConfig } from './landing.js';
import { verify, getCookie } from './util.js';
import { handlePortal } from './features.js';
import { handleWallet, walletFlags } from './wallet.js';
import { weeklyDigest } from './admin.js';
import { resetAllDemos } from './demo.js';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(self), microphone=(), geolocation=()',
};

async function api(req, env, path) {
  // Basic CSRF protection: state-changing requests must come from our own origin.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) throw new HttpError(403, 'bad_origin');
    if (!(req.headers.get('content-type') || '').includes('application/json')) throw new HttpError(415, 'json_required');
  }
  if (path.startsWith('/api/admin/')) return handleAdmin(req, env, path);
  if (path === '/api/public/contact' && req.method === 'POST') return handleContact(req, env);
  if (path === '/api/public/config' && req.method === 'GET') return json({ ...contactConfig(env), wallet: walletFlags(env) });
  if (path.startsWith('/api/public/wallet/') || path.startsWith('/api/public/logo/')) return handleWallet(req, env, path);
  if (path.startsWith('/api/portal/')) return handlePortal(req, env, path);
  if (path.startsWith('/api/public/')) return handlePublic(req, env, path);
  return handleTenant(req, env, path);
}

const DEMO_RESET_CRON = '7 3 * * *'; // must match wrangler.jsonc triggers

// Landing styles are inlined into the server-rendered page (no render-blocking requests).
// Cached per isolate; a redeploy starts fresh isolates, so styles never go stale.
let cssCache = null;
async function landingCss(env, url) {
  if (cssCache !== null) return cssCache;
  try {
    const parts = await Promise.all(['/css/app.css', '/css/landing.css'].map(async (p) => {
      const r = await env.ASSETS.fetch(new Request(new URL(p, url)));
      if (!r.ok) throw new Error(p);
      return r.text();
    }));
    cssCache = parts.join('\n').replace(/<\/style/gi, '<\\/style');
  } catch {
    cssCache = ''; // fall back to <link> tags
  }
  return cssCache;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/api/')) {
      let res;
      try {
        res = (await api(req, env, path)) || json({ error: 'not_found' }, 404);
      } catch (e) {
        if (e instanceof HttpError) res = json({ error: e.code, message: e.message }, e.status);
        else {
          console.error(e);
          res = json({ error: 'server_error' }, 500);
        }
      }
      res = new Response(res.body, res); // redirects and fetched responses have immutable headers
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
      return res;
    }
    // Landing pages (server-rendered for SEO). /?soc=<key> opens the tenant's branded sign-in instead.
    const LANDING = { '/': 'el', '/en': 'en', '/fr': 'fr' };
    if (req.method === 'GET' && LANDING[path]) {
      if (path === '/' && url.searchParams.get('soc')) return env.ASSETS.fetch(new Request(new URL('/app', url), req));
      if (await verify(env, getCookie(req, 'm_sess'), 'tenant').catch(() => null)) return Response.redirect(new URL('/app', url).toString(), 302);
      return new Response(renderLanding(LANDING[path], env, url.origin, await landingCss(env, url)), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=0, s-maxage=300',
          'content-language': LANDING[path],
          vary: 'cookie',
          ...SECURITY_HEADERS,
        },
      });
    }
    return env.ASSETS.fetch(req);
  },

  // Scheduled jobs (wrangler.jsonc "triggers"): nightly demo reset and the weekly billing digest.
  async scheduled(event, env, ctx) {
    if (event.cron === DEMO_RESET_CRON) ctx.waitUntil(resetAllDemos(env));
    else ctx.waitUntil(weeklyDigest(env));
  },
};
