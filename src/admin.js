// Platform admin API: manage tenants (organisations) and their login accounts.
import {
  HttpError, json, body, now, sign, verify, getCookie, setCookie, hashPassword,
  timingSafeEqual, randomKey, str, int, checkRateLimit, recordFailure, clearFailures,
  clientIp, LANGS, TENANT_KEY_RE,
} from './util.js';

const COOKIE = 'm_admin';
const TTL = 8 * 3600;

async function requireAdmin(req, env) {
  const s = await verify(env, getCookie(req, COOKIE), 'admin');
  if (!s || s.role !== 'platform') throw new HttpError(401, 'unauthorized');
  return s;
}

function publicUrl(env, req) {
  return (env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');
}

async function tenantList(env, req) {
  const { results } = await env.DB.prepare(`
    SELECT t.id, t.key, t.name, t.email, t.phone, t.active, t.default_lang, t.currency, t.notes, t.created_at,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
      (SELECT username FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) AS admin_username
    FROM tenants t ORDER BY t.name COLLATE NOCASE`).all();
  const base = publicUrl(env, req);
  return results.map((t) => ({ ...t, link: `${base}/?soc=${encodeURIComponent(t.key)}` }));
}

function validKey(key) {
  if (!TENANT_KEY_RE.test(key)) throw new HttpError(400, 'invalid_tenant_key');
  return key;
}

function validPassword(pw) {
  if (!pw || String(pw).length < 8) throw new HttpError(400, 'password_too_short');
  return String(pw);
}

export async function handleAdmin(req, env, path) {
  const method = req.method;

  if (path === '/api/admin/login' && method === 'POST') {
    const b = await body(req);
    const bucket = 'admin:' + clientIp(req);
    await checkRateLimit(env, bucket);
    const user = str(b.username, 100);
    const pass = String(b.password || '');
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) throw new HttpError(500, 'server_misconfigured');
    const ok = timingSafeEqual(user.toLowerCase(), String(env.ADMIN_USERNAME).toLowerCase()) &
      timingSafeEqual(pass, String(env.ADMIN_PASSWORD));
    if (!ok) {
      await recordFailure(env, bucket);
      throw new HttpError(401, 'invalid_credentials');
    }
    await clearFailures(env, bucket);
    const token = await sign(env, { role: 'platform', u: user, exp: Math.floor(Date.now() / 1000) + TTL }, 'admin');
    return json({ ok: true, username: user }, 200, { 'set-cookie': setCookie(COOKIE, token, TTL, req) });
  }

  if (path === '/api/admin/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, '', 0, req) });
  }

  const admin = await requireAdmin(req, env);

  if (path === '/api/admin/me' && method === 'GET') {
    return json({ username: admin.u, public_url: publicUrl(env, req) });
  }

  if (path === '/api/admin/tenants' && method === 'GET') {
    return json({ tenants: await tenantList(env, req) });
  }

  if (path === '/api/admin/suggest-key' && method === 'GET') {
    return json({ key: randomKey(8) });
  }

  if (path === '/api/admin/tenants' && method === 'POST') {
    const b = await body(req);
    const name = str(b.name, 200);
    if (!name) throw new HttpError(400, 'name_required');
    const key = validKey(str(b.key, 40).toLowerCase() || randomKey(8));
    const username = str(b.username, 60);
    if (!username) throw new HttpError(400, 'username_required');
    const password = validPassword(b.password);
    const lang = LANGS.includes(b.default_lang) ? b.default_lang : 'el';
    const exists = await env.DB.prepare('SELECT id FROM tenants WHERE key = ?').bind(key).first();
    if (exists) throw new HttpError(409, 'tenant_key_taken');
    const ts = now();
    const t = await env.DB.prepare(
      `INSERT INTO tenants (key, name, email, phone, default_lang, currency, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ).bind(key, name, str(b.email, 200), str(b.phone, 50), lang, str(b.currency, 3) || 'EUR', str(b.notes, 2000), ts).first();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (tenant_id, username, full_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)`,
      ).bind(t.id, username, str(b.full_name, 100), await hashPassword(password), ts),
      env.DB.prepare(`INSERT INTO membership_types (tenant_id, name, annual_fee, created_at) VALUES (?, ?, ?, ?)`)
        .bind(t.id, lang === 'en' ? 'Regular' : lang === 'fr' ? 'Ordinaire' : 'Τακτικό μέλος', int(b.annual_fee, 0), ts),
    ]);
    return json({ ok: true, id: t.id, key, link: `${publicUrl(env, req)}/?soc=${encodeURIComponent(key)}` }, 201);
  }

  let m = path.match(/^\/api\/admin\/tenants\/(\d+)$/);
  if (m && method === 'PUT') {
    const id = int(m[1]);
    const b = await body(req);
    const cur = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    if (!cur) throw new HttpError(404, 'not_found');
    const key = b.key !== undefined ? validKey(str(b.key, 40).toLowerCase()) : cur.key;
    if (key !== cur.key) {
      const exists = await env.DB.prepare('SELECT id FROM tenants WHERE key = ? AND id != ?').bind(key, id).first();
      if (exists) throw new HttpError(409, 'tenant_key_taken');
    }
    await env.DB.prepare(
      `UPDATE tenants SET key = ?, name = ?, email = ?, phone = ?, default_lang = ?, active = ?, notes = ? WHERE id = ?`,
    ).bind(
      key,
      str(b.name ?? cur.name, 200) || cur.name,
      str(b.email ?? cur.email, 200),
      str(b.phone ?? cur.phone, 50),
      LANGS.includes(b.default_lang) ? b.default_lang : cur.default_lang,
      b.active === undefined ? cur.active : b.active ? 1 : 0,
      str(b.notes ?? cur.notes, 2000),
      id,
    ).run();
    return json({ ok: true });
  }

  if (m && method === 'DELETE') {
    const id = int(m[1]);
    const b = await body(req);
    const cur = await env.DB.prepare('SELECT key FROM tenants WHERE id = ?').bind(id).first();
    if (!cur) throw new HttpError(404, 'not_found');
    if (b.confirm_key !== cur.key) throw new HttpError(400, 'confirm_key_mismatch');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM transactions WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM debit_runs WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM members WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM membership_types WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM users WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  }

  // Set (or create) a tenant login and its password.
  m = path.match(/^\/api\/admin\/tenants\/(\d+)\/credentials$/);
  if (m && method === 'POST') {
    const id = int(m[1]);
    const b = await body(req);
    const username = str(b.username, 60);
    if (!username) throw new HttpError(400, 'username_required');
    const password = validPassword(b.password);
    const t = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
    if (!t) throw new HttpError(404, 'not_found');
    const hash = await hashPassword(password);
    const existing = await env.DB.prepare('SELECT id FROM users WHERE tenant_id = ? AND username = ?').bind(id, username).first();
    if (existing) {
      await env.DB.prepare('UPDATE users SET password_hash = ?, active = 1 WHERE id = ?').bind(hash, existing.id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO users (tenant_id, username, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)`,
      ).bind(id, username, hash, now()).run();
    }
    return json({ ok: true, created: !existing });
  }

  throw new HttpError(404, 'not_found');
}
