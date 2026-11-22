// Quality audit for Members: axe-core (WCAG 2.2 AA, light + dark), Lighthouse and html-validate.
//
//   cd tools/audit && npm install && node audit.mjs
//
// Env: BASE (default http://localhost:8787), TENANT_KEY / TENANT_USER / TENANT_PASS (default demo/demo/demo1234),
//      PLAYWRIGHT (module path, optional), LIGHTHOUSE=0 to skip Lighthouse.
// Writes tools/audit/report/report.json and report.md. Exit code 1 if any check fails.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { HtmlValidate } from 'html-validate';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require(process.env.PLAYWRIGHT || 'playwright');
} catch {
  pw = require('/opt/node-tools/node_modules/playwright');
}
const { chromium } = pw;

const BASE = (process.env.BASE || 'http://localhost:8787').replace(/\/$/, '');
const CREDS = { tenant_key: process.env.TENANT_KEY || 'demo', username: process.env.TENANT_USER || 'demo', password: process.env.TENANT_PASS || 'demo1234' };
const RUN_LH = process.env.LIGHTHOUSE !== '0';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const LH_MIN = { accessibility: 0.95, 'best-practices': 0.9, seo: 0.9, performance: 0.8 };

async function api(path, { method = 'GET', body, cookie } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, json, text, headers: r.headers };
}

async function prepare() {
  const login = await api('/api/login', { method: 'POST', body: CREDS });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${login.text}`);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  let members = (await api('/api/members?limit=1', { cookie })).json.members;
  if (!members.length) {
    await api('/api/members', { method: 'POST', cookie, body: { first_name: 'Ελένη', last_name: 'Αλεξίου', phone: '6900000000' } });
    members = (await api('/api/members?limit=1', { cookie })).json.members;
  }
  const m = members[0];
  const portal = (await api(`/api/members/${m.id}/portal`, { method: 'POST', cookie })).json.url;
  const share = (await api('/api/share', { method: 'POST', cookie, body: { kind: 'statement', member_id: m.id } })).json.url;
  let ev = (await api('/api/events', { cookie })).json.events[0];
  if (!ev) ev = (await api('/api/events', { method: 'POST', cookie, body: { title: 'Γενική Συνέλευση', kind: 'assembly' } })).json.event;
  const local = (u) => u.replace(/^https?:\/\/[^/]+/, BASE);
  return { cookie, memberId: m.id, qr: m.qr_token, portal: local(portal), share: local(share), eventId: ev.id };
}

function pages(ctx) {
  return {
    public: [
      ['Landing (el)', '/'], ['Landing (en)', '/en'], ['Landing (fr)', '/fr'],
      ['Tenant sign-in', `/?soc=${CREDS.tenant_key}`], ['Admin sign-in', '/admin'],
      ['Public card', `/c/${ctx.qr}`], ['Member portal', new URL(ctx.portal).pathname], ['Shared statement', new URL(ctx.share).pathname],
    ],
    app: [
      ['Dashboard', '/'], ['Members', '/members'], ['Member', `/members/${ctx.memberId}`], ['New member', '/members/new'],
      ['Payments', '/payments'], ['Record payment', `/payments/new?member=${ctx.memberId}`], ['Transactions', '/transactions'],
      ['Events', '/events'], ['Event', `/events/${ctx.eventId}`], ['Annual dues', '/debits'], ['Opening balances', '/initial'],
      ['Import', '/import'], ['Balances report', '/reports'], ['Cards', '/cards'], ['Settings', '/settings'], ['Menu', '/more'],
    ],
  };
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.splash, #view > .loading, .loading .spinner'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function runAxe(browser, ctx) {
  const results = [];
  for (const scheme of ['light', 'dark']) {
    for (const viewport of [{ width: 390, height: 844, name: 'mobile' }, { width: 1366, height: 900, name: 'desktop' }]) {
      const context = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: 'reduce' });
      await context.addCookies([{ name: ctx.cookie.split('=')[0], value: ctx.cookie.split('=').slice(1).join('='), url: BASE }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const p = pages(ctx);
      const list = [
        ...p.public.map(([n, u]) => [n, u, true]),
        ...p.app.map(([n, u]) => [`App · ${n}`, `/app#${u}`, false]),
      ];
      for (const [name, url, isPublic] of list) {
        if (isPublic) {
          // public pages must render the same for anonymous visitors
          await context.clearCookies();
        } else if (!(await context.cookies()).length) {
          await context.addCookies([{ name: ctx.cookie.split('=')[0], value: ctx.cookie.split('=').slice(1).join('='), url: BASE }]);
        }
        await page.goto(BASE + url);
        await settle(page);
        const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        results.push({
          page: name, url, scheme, viewport: viewport.name,
          violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(' '), summary: n.failureSummary })) })),
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
          errors: [...errors],
        });
        errors.length = 0;
      }
      await context.close();
    }
  }
  return results;
}

async function runLighthouse(ctx) {
  const browser = await chromium.launch({ args: ['--remote-debugging-port=9333'] });
  const targets = [
    ['Landing (el) · mobile', '/', 'mobile', false],
    ['Landing (en) · desktop', '/en', 'desktop', false],
    ['Member portal · mobile', new URL(ctx.portal).pathname, 'mobile', false],
    ['Public card · mobile', `/c/${ctx.qr}`, 'mobile', false],
    ['App dashboard · mobile', '/app', 'mobile', true],
  ];
  const out = [];
  for (const [name, path, ff, auth] of targets) {
    const flags = { port: 9333, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], extraHeaders: auth ? { cookie: ctx.cookie } : undefined };
    // Official Lighthouse presets: desktop (fast network, no CPU slowdown) and the default mobile (slow 4G, 4× CPU).
    const config = ff === 'desktop' ? desktopConfig : { extends: 'lighthouse:default', settings: { formFactor: 'mobile', throttlingMethod: 'simulate' } };
    const r = await lighthouse(BASE + path, flags, config);
    const lhr = r.lhr;
    const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, v.score]));
    const failing = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable')
      .map((a) => ({ id: a.id, title: a.title, score: a.score, value: a.displayValue || '' }));
    out.push({ name, path, formFactor: ff, scores, failing, metrics: { lcp: lhr.audits['largest-contentful-paint']?.displayValue, cls: lhr.audits['cumulative-layout-shift']?.displayValue, tbt: lhr.audits['total-blocking-time']?.displayValue } });
  }
  await browser.close();
  return out;
}

async function runHtmlValidate(ctx) {
  const hv = new HtmlValidate({
    extends: ['html-validate:recommended'],
    rules: {
      'no-inline-style': 'off', // card background image + CSS custom properties are set inline on purpose
      'long-title': 'off', // SEO titles are intentionally descriptive
      'no-trailing-whitespace': 'off',
      'attribute-boolean-style': 'off',
      'void-style': 'off',
      'doctype-style': 'off', // lowercase <!doctype html> is valid HTML5
    },
  });
  const out = [];
  for (const [name, path] of [['Landing (el)', '/'], ['Landing (en)', '/en'], ['Landing (fr)', '/fr'], ['App shell', '/app']]) {
    const html = (await api(path)).text;
    const report = await hv.validateString(html, `${path}.html`);
    out.push({ name, path, valid: report.valid, messages: report.results.flatMap((r) => r.messages).map((m) => ({ rule: m.ruleId, line: m.line, message: m.message })) });
  }
  return out;
}

async function runHeaders() {
  const r = await fetch(`${BASE}/`);
  const h = Object.fromEntries(r.headers);
  const need = ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'content-language'];
  return { missing: need.filter((k) => !h[k]), headers: Object.fromEntries(need.map((k) => [k, h[k] || null])) };
}

(async () => {
  console.log(`Auditing ${BASE}`);
  const ctx = await prepare();
  const browser = await chromium.launch();
  const axe = await runAxe(browser, ctx);
  await browser.close();
  const html = await runHtmlValidate(ctx);
  const headers = await runHeaders();
  const lh = RUN_LH ? await runLighthouse(ctx) : [];

  const axeFail = axe.filter((r) => r.violations.length || r.overflow || r.errors.length);
  // Private pages (portal, card, app) are intentionally noindex, so SEO is only enforced on marketing pages.
  const lhFail = lh.filter((r) => Object.entries(LH_MIN).some(([k, min]) => (k !== 'seo' || r.path === '/' || r.path.startsWith('/en') || r.path.startsWith('/fr')) && (r.scores[k] ?? 1) < min));
  const htmlFail = html.filter((r) => !r.valid);

  const md = [];
  md.push(`# Members quality audit\n\n${new Date().toISOString()} · ${BASE}\n`);
  md.push(`## axe-core (WCAG 2.2 AA + best practices)\n\n${axe.length} page renders (light/dark × mobile/desktop) · ${axeFail.length} with issues\n`);
  const byRule = {};
  for (const r of axe) for (const v of r.violations) {
    byRule[v.id] ||= { ...v, pages: [] };
    byRule[v.id].pages.push(`${r.page} (${r.scheme}/${r.viewport})`);
  }
  for (const v of Object.values(byRule)) md.push(`- **${v.id}** (${v.impact}) — ${v.help}: ${v.pages.length} renders, e.g. ${v.pages.slice(0, 4).join(', ')}\n  - ${v.nodes.map((n) => `\`${n.target}\``).slice(0, 4).join(', ')}`);
  for (const r of axe.filter((x) => x.overflow)) md.push(`- horizontal overflow: ${r.page} (${r.scheme}/${r.viewport})`);
  for (const r of axe.filter((x) => x.errors.length)) md.push(`- JS errors on ${r.page}: ${r.errors.join('; ')}`);
  md.push(`\n## Lighthouse\n\n| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|`);
  for (const r of lh) md.push(`| ${r.name}${['/', '/en', '/fr'].includes(r.path) ? '' : ' (noindex)'} | ${Math.round(r.scores.performance * 100)} | ${Math.round(r.scores.accessibility * 100)} | ${Math.round(r.scores['best-practices'] * 100)} | ${Math.round(r.scores.seo * 100)} | ${r.metrics.lcp} | ${r.metrics.cls} | ${r.metrics.tbt} |`);
  for (const r of lh) if (r.failing.length) md.push(`\n**${r.name}** audits below 90: ${r.failing.map((a) => `${a.id}${a.value ? ` (${a.value})` : ''}`).join(', ')}`);
  md.push(`\n## html-validate\n`);
  for (const r of html) md.push(`- ${r.name}: ${r.valid ? 'valid' : r.messages.map((m) => `${m.rule} @${m.line}: ${m.message}`).join('; ')}`);
  md.push(`\n## Security headers\n\n${headers.missing.length ? `missing: ${headers.missing.join(', ')}` : 'all present'}\n`);

  mkdirSync(new URL('./report/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./report/report.json', import.meta.url), JSON.stringify({ axe, lh, html, headers }, null, 2));
  writeFileSync(new URL('./report/report.md', import.meta.url), md.join('\n'));
  console.log(md.join('\n'));
  const failed = axeFail.length + lhFail.length + htmlFail.length + headers.missing.length;
  console.log(`\n${failed ? `✗ ${failed} check group(s) failing` : '✓ all checks passed'}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
