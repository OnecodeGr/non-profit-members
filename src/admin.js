// Platform admin API: manage tenants (organisations) and their login accounts.
import {
  HttpError, json, body, now, sign, verify, getCookie, setCookie, hashPassword,
  timingSafeEqual, randomKey, str, int, checkRateLimit, recordFailure, clearFailures,
  clientIp, LANGS, TENANT_KEY_RE,
  isoDate, today,
} from './util.js';
import { subscriptionState, quote, limitTiers, addYear, netPriceFor, VAT_RATE } from './billing.js';
import { audit } from './audit.js';
import { sendMail, tenantEmailAllowed } from './contact.js';
import { contactConfig } from './landing.js';

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
      t.paid_until, t.member_limit, t.billing_email, t.is_demo, t.demo_username, t.demo_password, t.email_enabled,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) AS member_count,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id AND m.status = 'active') AS active_count,
      (SELECT MAX(period_end) FROM subscriptions s WHERE s.tenant_id = t.id) AS last_period_end,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
      (SELECT username FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) AS admin_username
    FROM tenants t ORDER BY t.name COLLATE NOCASE`).all();
  const base = publicUrl(env, req);
  return results.map((t) => ({ ...t, link: `${base}/?soc=${encodeURIComponent(t.key)}`, subscription: subscriptionState(t, t.active_count) }));
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
    const limit = b.member_limit === '' || b.member_limit === null || b.member_limit === undefined ? null : Math.max(1, int(b.member_limit, 100));
    const paidUntil = b.paid_until ? isoDate(b.paid_until) : null;
    const t = await env.DB.prepare(
      `INSERT INTO tenants (key, name, email, phone, default_lang, currency, notes, member_limit, paid_until, billing_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ).bind(key, name, str(b.email, 200), str(b.phone, 50), lang, str(b.currency, 3) || 'EUR', str(b.notes, 2000), limit, paidUntil,
      str(b.billing_email || b.email, 200), ts).first();
    if (b.record_payment && limit && paidUntil) {
      const qt = quote(limit);
      await env.DB.prepare(`INSERT INTO subscriptions (tenant_id, period_start, period_end, member_limit, net, vat, total, reference, notes, paid_at, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(t.id, today(), paidUntil, limit, qt.net, qt.vat, qt.total, str(b.reference, 100), '', ts, ts).run();
    }
    await audit(env, { tid: t.id, actor: `platform:${admin.u}` }, 'tenant.create', { summary: name, details: { key, member_limit: limit, paid_until: paidUntil } });
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
    const limit = b.member_limit === undefined ? cur.member_limit : b.member_limit === '' || b.member_limit === null ? null : Math.max(1, int(b.member_limit, 100));
    const paidUntil = b.paid_until === undefined ? cur.paid_until : b.paid_until ? isoDate(b.paid_until) : null;
    const isDemo = b.is_demo === undefined ? cur.is_demo : b.is_demo ? 1 : 0;
    await env.DB.prepare(
      `UPDATE tenants SET member_limit = ?, paid_until = ?, billing_email = ?, is_demo = ?, demo_username = ?, demo_password = ?, email_enabled = ? WHERE id = ?`,
    ).bind(limit, paidUntil, str(b.billing_email ?? cur.billing_email, 200), isDemo,
      str(b.demo_username ?? cur.demo_username, 60), str(b.demo_password ?? cur.demo_password, 100),
      // Demo organisations never send e-mail.
      isDemo ? 0 : b.email_enabled === undefined ? cur.email_enabled : b.email_enabled ? 1 : 0, id).run();
    await audit(env, { tid: id, actor: `platform:${admin.u}` }, 'tenant.update', { details: Object.fromEntries(Object.entries(b).filter(([k, v]) => String(v ?? '') !== String(cur[k] ?? ''))) });
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
      env.DB.prepare('DELETE FROM attendance WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM events WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM subscriptions WHERE tenant_id = ?').bind(id),
      env.DB.prepare('DELETE FROM audit_log WHERE tenant_id = ?').bind(id),
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
    await audit(env, { tid: id, actor: `platform:${admin.u}` }, 'tenant.credentials', { summary: username, details: { created: !existing } });
    return json({ ok: true, created: !existing });
  }

  // ----- billing -----
  if (path === '/api/admin/pricing' && method === 'GET') {
    return json({ tiers: limitTiers().map(quote), vat_rate: VAT_RATE });
  }
  if (path === '/api/admin/summary' && method === 'GET') {
    const list = await tenantList(env, req);
    const year = String(new Date().getFullYear());
    const rev = await env.DB.prepare(`SELECT COALESCE(SUM(net),0) AS net, COALESCE(SUM(total),0) AS total, COUNT(*) AS n
      FROM subscriptions WHERE paid_at IS NOT NULL AND substr(paid_at,1,4) = ?`).bind(year).first();
    const unpaid = await env.DB.prepare(`SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS n FROM subscriptions WHERE paid_at IS NULL`).first();
    const st = (s) => list.filter((t) => t.active && t.subscription.status === s).length;
    return json({
      tenants: list.length, active: list.filter((t) => t.active).length,
      expiring: st('expiring'), grace: st('grace'), expired: st('expired'), none: st('none'),
      over_limit: list.filter((t) => t.subscription.over_limit).length,
      revenue: { year, ...rev }, unpaid,
      members: list.reduce((a, t) => a + t.member_count, 0),
    });
  }
  m = path.match(/^\/api\/admin\/tenants\/(\d+)\/subscriptions$/);
  if (m && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY period_end DESC, id DESC').bind(int(m[1])).all();
    return json({ subscriptions: results });
  }
  if (m && method === 'POST') {
    const id = int(m[1]);
    const cur = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    if (!cur) throw new HttpError(404, 'not_found');
    const b = await body(req);
    const limit = Math.max(1, int(b.member_limit, cur.member_limit || 100));
    const start = isoDate(b.period_start, today());
    const end = isoDate(b.period_end, addYear(start));
    const qt = quote(limit);
    const net = b.net === undefined || b.net === '' ? qt.net : Math.max(0, Math.round(Number(b.net)));
    const vat = Math.round(net * VAT_RATE);
    const paidAt = b.paid ? (b.paid_at ? isoDate(b.paid_at) : today()) : null;
    const r = await env.DB.prepare(`INSERT INTO subscriptions (tenant_id, period_start, period_end, member_limit, net, vat, total, reference, notes, paid_at, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *`).bind(id, start, end, limit, net, vat, net + vat, str(b.reference, 100), str(b.notes, 500), paidAt, now()).first();
    // The subscription period extends access and sets the member limit.
    const newUntil = !cur.paid_until || end > cur.paid_until ? end : cur.paid_until;
    await env.DB.prepare('UPDATE tenants SET paid_until = ?, member_limit = ? WHERE id = ?').bind(newUntil, limit, id).run();
    await audit(env, { tid: id, actor: `platform:${admin.u}` }, 'subscription.create', { summary: `${start} → ${end} · ${limit} · ${((net + vat) / 100).toFixed(2)}`, details: { paid: !!paidAt } });
    return json({ subscription: r, paid_until: newUntil }, 201);
  }
  m = path.match(/^\/api\/admin\/subscriptions\/(\d+)(\/paid)?$/);
  if (m && method === 'POST' && m[2]) {
    const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(int(m[1])).first();
    if (!sub) throw new HttpError(404, 'not_found');
    await env.DB.prepare('UPDATE subscriptions SET paid_at = ? WHERE id = ?').bind(today(), sub.id).run();
    await audit(env, { tid: sub.tenant_id, actor: `platform:${admin.u}` }, 'subscription.paid', { entity: 'subscription', id: sub.id });
    return json({ ok: true });
  }
  if (m && method === 'DELETE' && !m[2]) {
    const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(int(m[1])).first();
    if (!sub) throw new HttpError(404, 'not_found');
    await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(sub.id).run();
    const last = await env.DB.prepare('SELECT MAX(period_end) AS e FROM subscriptions WHERE tenant_id = ?').bind(sub.tenant_id).first();
    await env.DB.prepare('UPDATE tenants SET paid_until = ? WHERE id = ?').bind(last.e || null, sub.tenant_id).run();
    await audit(env, { tid: sub.tenant_id, actor: `platform:${admin.u}` }, 'subscription.delete', { entity: 'subscription', id: sub.id });
    return json({ ok: true, paid_until: last.e || null });
  }

  throw new HttpError(404, 'not_found');
}


// Weekly e-mail to OneCode sales listing organisations that need attention.
export async function weeklyDigest(env) {
  const { results } = await env.DB.prepare(`SELECT t.id, t.key, t.name, t.paid_until, t.member_limit, t.billing_email, t.phone, t.active, t.is_demo, t.email_enabled,
      (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id AND m.status = 'active') AS active_count FROM tenants t WHERE t.active = 1`).all();
  const rows = results.filter(tenantEmailAllowed).map((t) => ({ ...t, s: subscriptionState(t, t.active_count) }))
    .filter((t) => ['expiring', 'grace', 'expired'].includes(t.s.status) || t.s.over_limit);
  if (!rows.length) return;
  const label = { expiring: 'Λήγει σύντομα', grace: 'Σε περίοδο χάριτος', expired: 'Έληξε', ok: 'OK', none: '-' };
  const lines = rows.map((t) => {
    const next = quote(t.s.over_limit ? Math.max(t.active_count, t.member_limit || 0) : t.member_limit || 100);
    return `• ${t.name} (?soc=${t.key})\n  ${label[t.s.status]} · έως ${t.paid_until || '-'} (${t.s.days_left ?? '-'} ημ.)\n  Μέλη: ${t.active_count}/${t.member_limit || '∞'}${t.s.over_limit ? ' — ΥΠΕΡΒΑΣΗ ΟΡΙΟΥ' : ''}\n  Ανανέωση: ${(next.net / 100).toFixed(2)} € + ΦΠΑ = ${(next.total / 100).toFixed(2)} €\n  ${[t.billing_email, t.phone].filter(Boolean).join(' · ')}`;
  });
  const cfg = contactConfig(env);
  try {
    await sendMail(env, {
      from: env.MAIL_FROM || 'noreply@onecode.win', fromName: 'Members · OneCode', to: cfg.email,
      subject: `Members: ${rows.length} φορείς χρειάζονται ανανέωση`,
      text: `Εβδομαδιαία σύνοψη συνδρομών\n\n${lines.join('\n\n')}\n\n${(env.PUBLIC_URL || '').replace(/\/$/, '')}/admin`,
    });
  } catch (e) {
    console.error('digest failed', e);
  }
}
