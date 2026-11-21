// Tenant (organisation) API: members, cards, transactions, debits, reports, settings, users.
import {
  HttpError, json, body, now, today, sign, verify, getCookie, setCookie, hashPassword, verifyPassword,
  randomToken, str, int, cents, isoDate, checkRateLimit, recordFailure, clearFailures, clientIp, LANGS,
} from './util.js';
import { audit } from './audit.js';
import { subscriptionState, activeMemberCount } from './billing.js';
import { handleFeatures } from './features.js';
import { walletFlags } from './wallet.js';

const COOKIE = 'm_sess';
const TTL = 12 * 3600;
const SHARE_TTL = 30 * 24 * 3600;

const ROLE_LEVEL = { viewer: 1, staff: 2, admin: 3 };
const TX_TYPES = ['initial', 'annual', 'charge', 'payment', 'credit'];
const METHODS = ['cash', 'bank', 'card', 'other'];

// Confirmed balance per member (positive = owes, negative = in credit).
const BALANCE_SQL = `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.member_id = m.id AND t.status = 'confirmed'), 0)`;
const PENDING_SQL = `COALESCE((SELECT SUM(-t.amount) FROM transactions t WHERE t.member_id = m.id AND t.status = 'pending'), 0)`;

function publicUrl(env, req) {
  return (env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');
}

export function tenantPublic(t) {
  return {
    key: t.key, name: t.name, address: t.address, phone: t.phone, email: t.email, tax_id: t.tax_id,
    website: t.website, logo: t.logo, color: t.color, currency: t.currency, default_lang: t.default_lang,
    card_note: t.card_note, bank_name: t.bank_name, bank_iban: t.bank_iban, bank_beneficiary: t.bank_beneficiary,
  };
}

async function session(req, env) {
  const s = await verify(env, getCookie(req, COOKIE), 'tenant');
  if (!s) throw new HttpError(401, 'unauthorized');
  const row = await env.DB.prepare(
    `SELECT u.id AS uid, u.username, u.full_name, u.role, u.active AS uactive, t.*
     FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = ? AND t.id = ?`,
  ).bind(s.u, s.t).first();
  if (!row || !row.uactive) throw new HttpError(401, 'unauthorized');
  if (!row.active) throw new HttpError(403, 'tenant_inactive');
  return {
    user: { id: row.uid, username: row.username, full_name: row.full_name, role: row.role },
    tenant: row,
    tid: row.id,
    who: { tid: row.id, userId: row.uid, actor: row.username, ip: clientIp(req) },
  };
}

function need(ctx, role) {
  if ((ROLE_LEVEL[ctx.user.role] || 0) < ROLE_LEVEL[role]) throw new HttpError(403, 'forbidden');
}

async function getMember(env, tid, id) {
  const m = await env.DB.prepare(
    `SELECT m.*, mt.name AS type_name, ${BALANCE_SQL} AS balance, ${PENDING_SQL} AS pending
     FROM members m LEFT JOIN membership_types mt ON mt.id = m.membership_type_id
     WHERE m.tenant_id = ? AND m.id = ?`,
  ).bind(tid, id).first();
  if (!m) throw new HttpError(404, 'not_found');
  return m;
}

async function memberTransactions(env, tid, memberId) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM transactions WHERE tenant_id = ? AND member_id = ? ORDER BY date, id`,
  ).bind(tid, memberId).all();
  return results;
}

async function nextMemberNo(env, tid) {
  const r = await env.DB.prepare('SELECT COALESCE(MAX(member_no), 0) + 1 AS n FROM members WHERE tenant_id = ?').bind(tid).first();
  return r.n;
}

async function nextReceipt(env, tid) {
  const r = await env.DB.prepare('UPDATE tenants SET receipt_seq = receipt_seq + 1 WHERE id = ? RETURNING receipt_seq').bind(tid).first();
  return r.receipt_seq;
}

function memberFields(b, existing = {}) {
  const pick = (k, max = 200) => (b[k] === undefined ? existing[k] ?? '' : str(b[k], max));
  const f = {
    first_name: pick('first_name', 100),
    last_name: pick('last_name', 100),
    father_name: pick('father_name', 100),
    email: pick('email', 200),
    phone: pick('phone', 50),
    address: pick('address', 300),
    city: pick('city', 100),
    postal_code: pick('postal_code', 20),
    birth_date: b.birth_date === undefined ? existing.birth_date ?? '' : isoDate(b.birth_date),
    id_number: pick('id_number', 50),
    join_date: b.join_date === undefined ? existing.join_date ?? '' : isoDate(b.join_date),
    status: ['active', 'inactive'].includes(b.status) ? b.status : existing.status || 'active',
    notes: pick('notes', 4000),
    membership_type_id: b.membership_type_id === undefined ? existing.membership_type_id ?? null : int(b.membership_type_id, 0) || null,
  };
  if (b.photo !== undefined) {
    const p = String(b.photo || '');
    if (p && (!p.startsWith('data:image/') || p.length > 400000)) throw new HttpError(400, 'invalid_photo');
    f.photo = p;
  } else f.photo = existing.photo ?? '';
  if (!f.first_name || !f.last_name) throw new HttpError(400, 'name_required');
  return f;
}

async function checkType(env, tid, typeId) {
  if (!typeId) return;
  const t = await env.DB.prepare('SELECT id FROM membership_types WHERE id = ? AND tenant_id = ?').bind(typeId, tid).first();
  if (!t) throw new HttpError(400, 'invalid_membership_type');
}

function txSign(type, amount) {
  const a = Math.abs(amount);
  if (type === 'payment' || type === 'credit') return -a;
  if (type === 'initial') return amount;
  return a;
}

async function makeShareUrl(env, req, ctx, payload) {
  const token = await sign(env, { ...payload, t: ctx.tid, exp: Math.floor(Date.now() / 1000) + SHARE_TTL }, 'share');
  return `${publicUrl(env, req)}/s/${token}`;
}

// ---------- reports ----------
async function balancesReport(env, tid, q = {}) {
  const where = ['m.tenant_id = ?'];
  const args = [tid];
  if (q.status) { where.push('m.status = ?'); args.push(q.status); }
  if (q.type) { where.push('m.membership_type_id = ?'); args.push(int(q.type)); }
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.member_no, m.first_name, m.last_name, m.status, m.phone, m.email, mt.name AS type_name,
       COALESCE(SUM(CASE WHEN t.status='confirmed' AND t.amount > 0 THEN t.amount END), 0) AS charged,
       COALESCE(SUM(CASE WHEN t.status='confirmed' AND t.amount < 0 THEN -t.amount END), 0) AS paid,
       COALESCE(SUM(CASE WHEN t.status='confirmed' THEN t.amount END), 0) AS balance
     FROM members m
     LEFT JOIN membership_types mt ON mt.id = m.membership_type_id
     LEFT JOIN transactions t ON t.member_id = m.id
     WHERE ${where.join(' AND ')}
     GROUP BY m.id ORDER BY m.last_name COLLATE NOCASE, m.first_name COLLATE NOCASE`,
  ).bind(...args).all();
  let rows = results;
  if (q.only === 'owing') rows = rows.filter((r) => r.balance > 0);
  if (q.only === 'credit') rows = rows.filter((r) => r.balance < 0);
  if (q.only === 'settled') rows = rows.filter((r) => r.balance === 0);
  const totals = rows.reduce(
    (a, r) => ({ charged: a.charged + r.charged, paid: a.paid + r.paid, balance: a.balance + r.balance,
      owing: a.owing + (r.balance > 0 ? r.balance : 0), count: a.count + 1 }),
    { charged: 0, paid: 0, balance: 0, owing: 0, count: 0 },
  );
  return { rows, totals };
}

async function transactionsQuery(env, tid, q) {
  const where = ['t.tenant_id = ?'];
  const args = [tid];
  if (q.member_id) { where.push('t.member_id = ?'); args.push(int(q.member_id)); }
  if (q.type) {
    const types = String(q.type).split(',').filter((x) => TX_TYPES.includes(x));
    if (types.length) { where.push(`t.type IN (${types.map(() => '?').join(',')})`); args.push(...types); }
  }
  if (q.status) { where.push('t.status = ?'); args.push(q.status); }
  if (q.from) { where.push('t.date >= ?'); args.push(isoDate(q.from)); }
  if (q.to) { where.push('t.date <= ?'); args.push(isoDate(q.to)); }
  if (q.method) { where.push('t.method = ?'); args.push(q.method); }
  if (q.q) {
    where.push(`(m.first_name LIKE ? OR m.last_name LIKE ? OR CAST(m.member_no AS TEXT) = ? OR t.reference LIKE ? OR t.description LIKE ?)`);
    const like = `%${q.q}%`;
    args.push(like, like, String(q.q), like, like);
  }
  const limit = Math.min(int(q.limit, 100), 2000);
  const offset = Math.max(int(q.offset, 0), 0);
  const sqlWhere = where.join(' AND ');
  const [{ results }, sum] = await Promise.all([
    env.DB.prepare(
      `SELECT t.*, m.member_no, m.first_name, m.last_name, u.username AS created_by_name
       FROM transactions t JOIN members m ON m.id = t.member_id LEFT JOIN users u ON u.id = t.created_by
       WHERE ${sqlWhere} ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`,
    ).bind(...args, limit, offset).all(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount END), 0) AS charges,
         COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount END), 0) AS payments
       FROM transactions t JOIN members m ON m.id = t.member_id WHERE ${sqlWhere}`,
    ).bind(...args).first(),
  ]);
  return { rows: results, summary: sum };
}

// ---------- public (no login) ----------
export async function handlePublic(req, env, path) {
  if (path === '/api/public/tenant' && req.method === 'GET') {
    const key = new URL(req.url).searchParams.get('soc') || '';
    const t = await env.DB.prepare('SELECT * FROM tenants WHERE key = ? AND active = 1').bind(key.toLowerCase()).first();
    if (!t) throw new HttpError(404, 'tenant_not_found');
    return json({ tenant: { key: t.key, name: t.name, logo: t.logo, color: t.color, default_lang: t.default_lang } });
  }

  let m = path.match(/^\/api\/public\/card\/([A-Za-z0-9_-]{10,64})$/);
  if (m && req.method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT m.id, m.member_no, m.first_name, m.last_name, m.status, m.photo, m.join_date, m.tenant_id,
         mt.name AS type_name, ${BALANCE_SQL} AS balance
       FROM members m LEFT JOIN membership_types mt ON mt.id = m.membership_type_id WHERE m.qr_token = ?`,
    ).bind(m[1]).first();
    if (!row) throw new HttpError(404, 'not_found');
    const t = await env.DB.prepare('SELECT * FROM tenants WHERE id = ? AND active = 1').bind(row.tenant_id).first();
    if (!t) throw new HttpError(404, 'not_found');
    return json({
      tenant: { name: t.name, logo: t.logo, color: t.color, default_lang: t.default_lang, key: t.key },
      wallet: walletFlags(env),
      member: {
        member_no: row.member_no, first_name: row.first_name, last_name: row.last_name, status: row.status,
        photo: row.photo, type_name: row.type_name, join_date: row.join_date, in_good_standing: row.balance <= 0,
      },
    });
  }

  m = path.match(/^\/api\/public\/share\/([A-Za-z0-9_.-]+)$/);
  if (m && req.method === 'GET') {
    const p = await verify(env, m[1], 'share');
    if (!p) throw new HttpError(404, 'link_expired');
    const t = await env.DB.prepare('SELECT * FROM tenants WHERE id = ? AND active = 1').bind(p.t).first();
    if (!t) throw new HttpError(404, 'not_found');
    const out = { kind: p.k, tenant: tenantPublic(t), generated_at: now(), expires_at: new Date(p.exp * 1000).toISOString() };
    if (p.k === 'statement' || p.k === 'card') {
      const mem = await getMember(env, t.id, p.m);
      delete mem.notes;
      out.member = mem;
      if (p.k === 'statement') out.transactions = (await memberTransactions(env, t.id, p.m)).filter((x) => x.status !== 'void');
    } else if (p.k === 'receipt') {
      const tx = await env.DB.prepare(`SELECT * FROM transactions WHERE id = ? AND tenant_id = ?`).bind(p.x, t.id).first();
      if (!tx) throw new HttpError(404, 'not_found');
      out.transaction = tx;
      const mem = await getMember(env, t.id, tx.member_id);
      delete mem.notes;
      out.member = mem;
    } else if (p.k === 'balances') {
      out.report = await balancesReport(env, t.id, p.q || {});
      out.filters = p.q || {};
    } else throw new HttpError(404, 'not_found');
    return json(out);
  }

  throw new HttpError(404, 'not_found');
}

// ---------- authenticated tenant API ----------
export async function handleTenant(req, env, path) {
  const method = req.method;
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams);

  if (path === '/api/login' && method === 'POST') {
    const b = await body(req);
    const key = str(b.tenant_key, 40).toLowerCase();
    const bucket = `t:${key}:${clientIp(req)}`;
    await checkRateLimit(env, bucket);
    const row = await env.DB.prepare(
      `SELECT u.id, u.password_hash, u.active AS uactive, t.id AS tid, t.active AS tactive
       FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE t.key = ? AND u.username = ?`,
    ).bind(key, str(b.username, 60)).first();
    const ok = row && row.uactive && (await verifyPassword(String(b.password || ''), row.password_hash));
    if (!ok) {
      await recordFailure(env, bucket);
      throw new HttpError(401, 'invalid_credentials');
    }
    if (!row.tactive) throw new HttpError(403, 'tenant_inactive');
    await clearFailures(env, bucket);
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now(), row.id).run();
    await audit(env, { tid: row.tid, userId: row.id, actor: str(b.username, 60), ip: clientIp(req) }, 'user.login', { entity: 'user', id: row.id });
    const token = await sign(env, { t: row.tid, u: row.id, exp: Math.floor(Date.now() / 1000) + TTL }, 'tenant');
    return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, token, TTL, req) });
  }

  if (path === '/api/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': setCookie(COOKIE, '', 0, req) });
  }

  const ctx = await session(req, env);
  const tid = ctx.tid;
  const DB = env.DB;
  const who = ctx.who;
  // Subscription expired beyond the grace period: the organisation keeps read-only access.
  if (method !== 'GET' && !['/api/logout', '/api/me/password'].includes(path) && subscriptionState(ctx.tenant).status === 'expired') {
    throw new HttpError(402, 'subscription_expired');
  }

  if (path === '/api/me' && method === 'GET') {
    const { results: types } = await DB.prepare('SELECT * FROM membership_types WHERE tenant_id = ? ORDER BY name COLLATE NOCASE').bind(tid).all();
    const subscription = subscriptionState(ctx.tenant, await activeMemberCount(env, tid));
    return json({ user: ctx.user, tenant: tenantPublic(ctx.tenant), types, public_url: publicUrl(env, req), subscription });
  }

  if (path === '/api/me/password' && method === 'POST') {
    const b = await body(req);
    const u = await DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(ctx.user.id).first();
    if (!(await verifyPassword(String(b.current || ''), u.password_hash))) throw new HttpError(400, 'wrong_password');
    if (!b.password || String(b.password).length < 8) throw new HttpError(400, 'password_too_short');
    await DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(String(b.password)), ctx.user.id).run();
    await audit(env, who, 'user.password', { entity: 'user', id: ctx.user.id });
    return json({ ok: true });
  }

  if (path === '/api/dashboard' && method === 'GET') {
    const year = new Date().getFullYear();
    const [counts, money, pending, recent] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM members WHERE tenant_id = ?`).bind(tid).first(),
      DB.prepare(`SELECT
          COALESCE(SUM(CASE WHEN status='confirmed' THEN amount END), 0) AS outstanding,
          COALESCE(SUM(CASE WHEN status='confirmed' AND type='payment' AND substr(date,1,4)=? THEN -amount END), 0) AS collected_year,
          COALESCE(SUM(CASE WHEN status='confirmed' AND type='annual' AND year=? THEN amount END), 0) AS charged_year
        FROM transactions WHERE tenant_id = ?`).bind(String(year), year, tid).first(),
      DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(-amount),0) AS total FROM transactions WHERE tenant_id = ? AND status = 'pending'`).bind(tid).first(),
      DB.prepare(`SELECT t.*, m.first_name, m.last_name, m.member_no FROM transactions t JOIN members m ON m.id = t.member_id
        WHERE t.tenant_id = ? AND t.type = 'payment' AND t.status != 'void' ORDER BY t.created_at DESC LIMIT 8`).bind(tid).all(),
    ]);
    const owing = await DB.prepare(`SELECT COUNT(*) AS n FROM (SELECT m.id FROM members m JOIN transactions t ON t.member_id = m.id
        WHERE m.tenant_id = ? AND t.status='confirmed' GROUP BY m.id HAVING SUM(t.amount) > 0)`).bind(tid).first();
    return json({ year, members: counts, money, pending, owing_count: owing.n, recent: recent.results });
  }

  // ----- members -----
  if (path === '/api/members' && method === 'GET') {
    const where = ['m.tenant_id = ?'];
    const args = [tid];
    if (q.q) {
      const like = `%${q.q.trim()}%`;
      where.push(`(m.first_name LIKE ? OR m.last_name LIKE ? OR (m.last_name || ' ' || m.first_name) LIKE ? OR (m.first_name || ' ' || m.last_name) LIKE ?
        OR m.phone LIKE ? OR m.email LIKE ? OR CAST(m.member_no AS TEXT) = ?)`);
      args.push(like, like, like, like, like, like, q.q.trim());
    }
    if (q.status) { where.push('m.status = ?'); args.push(q.status); }
    if (q.type) { where.push('m.membership_type_id = ?'); args.push(int(q.type)); }
    const sorts = { name: 'last_name COLLATE NOCASE, first_name COLLATE NOCASE', no: 'member_no', recent: 'id DESC', balance: 'balance DESC, last_name COLLATE NOCASE' };
    const order = sorts[q.sort] || sorts.name;
    const limit = q.all ? 100000 : Math.min(int(q.limit, 50), 500);
    const offset = Math.max(int(q.offset, 0), 0);
    let sql = `SELECT m.id, m.member_no, m.first_name, m.last_name, m.father_name, m.email, m.phone, m.address, m.city,
        m.postal_code, m.birth_date, m.id_number, m.join_date, m.status, m.membership_type_id, m.qr_token, m.notes,
        ${q.photos ? 'm.photo,' : ''} mt.name AS type_name, ${BALANCE_SQL} AS balance, ${PENDING_SQL} AS pending
      FROM members m LEFT JOIN membership_types mt ON mt.id = m.membership_type_id WHERE ${where.join(' AND ')}`;
    sql = `SELECT * FROM (${sql})${q.only === 'owing' ? ' WHERE balance > 0' : q.only === 'credit' ? ' WHERE balance < 0' : ''}`;
    const [{ results }, total] = await Promise.all([
      DB.prepare(`${sql} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...args, limit, offset).all(),
      DB.prepare(`SELECT COUNT(*) AS n FROM (${sql})`).bind(...args).first(),
    ]);
    return json({ members: results, total: total.n });
  }

  if (path === '/api/members' && method === 'POST') {
    need(ctx, 'staff');
    const b = await body(req);
    const f = memberFields(b);
    await checkType(env, tid, f.membership_type_id);
    if (ctx.tenant.member_limit && f.status === 'active' && (await activeMemberCount(env, tid)) >= ctx.tenant.member_limit) {
      throw new HttpError(403, 'member_limit_reached');
    }
    let no = int(b.member_no, 0);
    if (no) {
      const dup = await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND member_no = ?').bind(tid, no).first();
      if (dup) throw new HttpError(409, 'member_no_taken');
    } else no = await nextMemberNo(env, tid);
    const ts = now();
    const r = await DB.prepare(
      `INSERT INTO members (tenant_id, member_no, first_name, last_name, father_name, email, phone, address, city, postal_code,
        birth_date, id_number, join_date, membership_type_id, status, notes, photo, qr_token, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
    ).bind(tid, no, f.first_name, f.last_name, f.father_name, f.email, f.phone, f.address, f.city, f.postal_code,
      f.birth_date, f.id_number, f.join_date || today(), f.membership_type_id, f.status, f.notes, f.photo, randomToken(18), ts, ts).first();
    if (b.initial_balance !== undefined && b.initial_balance !== null && cents(b.initial_balance) !== 0) {
      await DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, date, description, status, created_by, created_at)
        VALUES (?, ?, 'initial', ?, ?, '', 'confirmed', ?, ?)`).bind(tid, r.id, cents(b.initial_balance), today(), ctx.user.id, ts).run();
    }
    await audit(env, who, 'member.create', { entity: 'member', id: r.id, summary: `№${no} ${f.last_name} ${f.first_name}` });
    return json({ member: await getMember(env, tid, r.id) }, 201);
  }

  if (path === '/api/members/import' && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
    const mode = b.mode === 'update' ? 'update' : 'skip';
    const { results: types } = await DB.prepare('SELECT id, name FROM membership_types WHERE tenant_id = ?').bind(tid).all();
    const typeByName = new Map(types.map((t) => [t.name.trim().toLowerCase(), t.id]));
    const { results: existing } = await DB.prepare('SELECT id, member_no FROM members WHERE tenant_id = ?').bind(tid).all();
    const byNo = new Map(existing.map((e) => [e.member_no, e.id]));
    let next = await nextMemberNo(env, tid);
    const ts = now();
    const report = { created: 0, updated: 0, skipped: 0, errors: [] };
    const stmts = [];
    const initials = []; // [member_no, amount]
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      try {
        let typeId = null;
        if (raw.membership_type) {
          const name = String(raw.membership_type).trim();
          typeId = typeByName.get(name.toLowerCase());
          if (!typeId) {
            const nt = await DB.prepare('INSERT INTO membership_types (tenant_id, name, annual_fee, created_at) VALUES (?, ?, 0, ?) RETURNING id')
              .bind(tid, name.slice(0, 100), ts).first();
            typeId = nt.id;
            typeByName.set(name.toLowerCase(), typeId);
          }
        }
        const f = memberFields({ ...raw, membership_type_id: typeId, status: raw.status || 'active' });
        let no = int(raw.member_no, 0);
        if (no && byNo.has(no)) {
          if (mode === 'skip') { report.skipped++; continue; }
          stmts.push(DB.prepare(`UPDATE members SET first_name=?, last_name=?, father_name=?, email=?, phone=?, address=?, city=?, postal_code=?,
              birth_date=?, id_number=?, join_date=COALESCE(NULLIF(?, ''), join_date), membership_type_id=COALESCE(?, membership_type_id), status=?, notes=?, updated_at=?
              WHERE id = ?`).bind(f.first_name, f.last_name, f.father_name, f.email, f.phone, f.address, f.city, f.postal_code,
            f.birth_date, f.id_number, f.join_date, f.membership_type_id, f.status, f.notes, ts, byNo.get(no)));
          report.updated++;
        } else {
          if (!no) no = next++;
          else if (no >= next) next = no + 1;
          byNo.set(no, -1);
          stmts.push(DB.prepare(`INSERT INTO members (tenant_id, member_no, first_name, last_name, father_name, email, phone, address, city,
              postal_code, birth_date, id_number, join_date, membership_type_id, status, notes, photo, qr_token, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?)`).bind(tid, no, f.first_name, f.last_name, f.father_name, f.email, f.phone,
            f.address, f.city, f.postal_code, f.birth_date, f.id_number, f.join_date || today(), f.membership_type_id, f.status, f.notes,
            randomToken(18), ts, ts));
          report.created++;
        }
        if (raw.initial_balance !== undefined && raw.initial_balance !== '' && raw.initial_balance !== null) {
          initials.push([no, cents(raw.initial_balance)]);
        }
      } catch (e) {
        report.errors.push({ row: (b.offset || 0) + i + 1, error: e.code || String(e.message || e) });
      }
    }
    if (ctx.tenant.member_limit && report.created) {
      const active = await activeMemberCount(env, tid);
      if (active + report.created > ctx.tenant.member_limit) throw new HttpError(403, 'member_limit_reached');
    }
    for (let i = 0; i < stmts.length; i += 50) await DB.batch(stmts.slice(i, i + 50));
    if (initials.length) {
      const ist = [];
      for (const [no, amount] of initials) {
        ist.push(DB.prepare(`DELETE FROM transactions WHERE tenant_id = ? AND type = 'initial' AND member_id = (SELECT id FROM members WHERE tenant_id = ? AND member_no = ?)`).bind(tid, tid, no));
        if (amount !== 0) {
          ist.push(DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, date, description, status, created_by, created_at)
            SELECT ?, id, 'initial', ?, ?, '', 'confirmed', ?, ? FROM members WHERE tenant_id = ? AND member_no = ?`)
            .bind(tid, amount, isoDate(b.initial_date, today()), ctx.user.id, ts, tid, no));
        }
      }
      for (let i = 0; i < ist.length; i += 50) await DB.batch(ist.slice(i, i + 50));
    }
    await audit(env, who, 'member.import', { summary: `+${report.created} / ~${report.updated} / =${report.skipped}`, details: { errors: report.errors.length } });
    return json(report);
  }

  let m = path.match(/^\/api\/members\/(\d+)$/);
  if (m) {
    const id = int(m[1]);
    if (method === 'GET') {
      const member = await getMember(env, tid, id);
      return json({ member, transactions: await memberTransactions(env, tid, id) });
    }
    if (method === 'PUT') {
      need(ctx, 'staff');
      const cur = await getMember(env, tid, id);
      const b = await body(req);
      const f = memberFields(b, cur);
      await checkType(env, tid, f.membership_type_id);
      let no = b.member_no === undefined ? cur.member_no : int(b.member_no, cur.member_no);
      if (no !== cur.member_no) {
        const dup = await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND member_no = ? AND id != ?').bind(tid, no, id).first();
        if (dup) throw new HttpError(409, 'member_no_taken');
      }
      await DB.prepare(`UPDATE members SET member_no=?, first_name=?, last_name=?, father_name=?, email=?, phone=?, address=?, city=?, postal_code=?,
          birth_date=?, id_number=?, join_date=?, membership_type_id=?, status=?, notes=?, photo=?, updated_at=? WHERE id = ? AND tenant_id = ?`)
        .bind(no, f.first_name, f.last_name, f.father_name, f.email, f.phone, f.address, f.city, f.postal_code, f.birth_date,
          f.id_number, f.join_date, f.membership_type_id, f.status, f.notes, f.photo, now(), id, tid).run();
      const changed = Object.keys(f).filter((k) => k !== 'photo' && String(f[k] ?? '') !== String(cur[k] ?? ''));
      if (f.photo !== cur.photo) changed.push('photo');
      if (no !== cur.member_no) changed.push('member_no');
      await audit(env, who, 'member.update', { entity: 'member', id, summary: `№${no} ${f.last_name} ${f.first_name}`,
        details: Object.fromEntries(changed.map((k) => [k, k === 'photo' ? '…' : [k === 'member_no' ? cur.member_no : cur[k], k === 'member_no' ? no : f[k]]])) });
      return json({ member: await getMember(env, tid, id) });
    }
    if (method === 'DELETE') {
      need(ctx, 'admin');
      const gone = await getMember(env, tid, id);
      await audit(env, who, 'member.delete', { entity: 'member', id, summary: `№${gone.member_no} ${gone.last_name} ${gone.first_name}`, details: { balance: gone.balance } });
      await DB.batch([
        DB.prepare('DELETE FROM transactions WHERE member_id = ? AND tenant_id = ?').bind(id, tid),
        DB.prepare('DELETE FROM members WHERE id = ? AND tenant_id = ?').bind(id, tid),
      ]);
      return json({ ok: true });
    }
  }

  m = path.match(/^\/api\/members\/(\d+)\/regenerate-qr$/);
  if (m && method === 'POST') {
    need(ctx, 'admin');
    await DB.prepare('UPDATE members SET qr_token = ?, updated_at = ? WHERE id = ? AND tenant_id = ?').bind(randomToken(18), now(), int(m[1]), tid).run();
    await audit(env, who, 'member.regen_qr', { entity: 'member', id: int(m[1]) });
    return json({ member: await getMember(env, tid, int(m[1])) });
  }

  // Identify a member from a scanned QR (token or full URL) or a typed member number.
  if (path === '/api/identify' && method === 'GET') {
    let code = String(q.code || '').trim();
    const mm = code.match(/\/c\/([A-Za-z0-9_-]{10,64})/);
    if (mm) code = mm[1];
    let row;
    if (/^\d+$/.test(code)) row = await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND member_no = ?').bind(tid, int(code)).first();
    else row = await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND qr_token = ?').bind(tid, code).first();
    if (!row) throw new HttpError(404, 'member_not_found');
    return json({ member: await getMember(env, tid, row.id) });
  }

  // ----- membership types -----
  if (path === '/api/types' && method === 'GET') {
    const { results } = await DB.prepare(`SELECT mt.*, (SELECT COUNT(*) FROM members m WHERE m.membership_type_id = mt.id) AS member_count
      FROM membership_types mt WHERE tenant_id = ? ORDER BY name COLLATE NOCASE`).bind(tid).all();
    return json({ types: results });
  }
  if (path === '/api/types' && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const name = str(b.name, 100);
    if (!name) throw new HttpError(400, 'name_required');
    const r = await DB.prepare('INSERT INTO membership_types (tenant_id, name, annual_fee, active, created_at) VALUES (?, ?, ?, 1, ?) RETURNING *')
      .bind(tid, name, Math.max(0, cents(b.annual_fee)), now()).first();
    await audit(env, who, 'type.create', { entity: 'type', id: r.id, summary: name, details: { annual_fee: r.annual_fee } });
    return json({ type: r }, 201);
  }
  m = path.match(/^\/api\/types\/(\d+)$/);
  if (m && method === 'PUT') {
    need(ctx, 'admin');
    const b = await body(req);
    const name = str(b.name, 100);
    if (!name) throw new HttpError(400, 'name_required');
    await DB.prepare('UPDATE membership_types SET name = ?, annual_fee = ?, active = ? WHERE id = ? AND tenant_id = ?')
      .bind(name, Math.max(0, cents(b.annual_fee)), b.active === false || b.active === 0 ? 0 : 1, int(m[1]), tid).run();
    await audit(env, who, 'type.update', { entity: 'type', id: int(m[1]), summary: name, details: { annual_fee: Math.max(0, cents(b.annual_fee)) } });
    return json({ ok: true });
  }
  if (m && method === 'DELETE') {
    need(ctx, 'admin');
    await DB.batch([
      DB.prepare('UPDATE members SET membership_type_id = NULL WHERE membership_type_id = ? AND tenant_id = ?').bind(int(m[1]), tid),
      DB.prepare('DELETE FROM membership_types WHERE id = ? AND tenant_id = ?').bind(int(m[1]), tid),
    ]);
    await audit(env, who, 'type.delete', { entity: 'type', id: int(m[1]) });
    return json({ ok: true });
  }

  // ----- transactions -----
  if (path === '/api/transactions' && method === 'GET') {
    return json(await transactionsQuery(env, tid, q));
  }

  if (path === '/api/transactions' && method === 'POST') {
    need(ctx, 'staff');
    const b = await body(req);
    const type = b.type;
    if (!['payment', 'charge', 'credit'].includes(type)) throw new HttpError(400, 'invalid_type');
    const amount = Math.abs(cents(b.amount));
    if (!amount) throw new HttpError(400, 'invalid_amount');
    const member = await getMember(env, tid, int(b.member_id));
    // Only admins may record a payment as already confirmed; staff payments wait for confirmation.
    const confirmNow = type !== 'payment' || (b.confirm && ctx.user.role === 'admin');
    if (type !== 'payment') need(ctx, 'admin');
    const ts = now();
    const receipt = type === 'payment' && confirmNow ? await nextReceipt(env, tid) : null;
    const r = await DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, year, date, description, method, reference, status,
        receipt_no, created_by, confirmed_by, confirmed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`)
      .bind(tid, member.id, type, txSign(type, amount), b.year ? int(b.year) : null, isoDate(b.date, today()), str(b.description, 300),
        METHODS.includes(b.method) ? b.method : type === 'payment' ? 'cash' : '', str(b.reference, 100),
        confirmNow ? 'confirmed' : 'pending', receipt, ctx.user.id, confirmNow ? ctx.user.id : null, confirmNow ? ts : null, ts).first();
    await audit(env, who, `${type}.create`, { entity: 'transaction', id: r.id, summary: `№${member.member_no} ${member.last_name} · ${(amount / 100).toFixed(2)}`,
      details: { status: r.status, receipt_no: r.receipt_no, method: r.method } });
    return json({ transaction: r }, 201);
  }

  if (path === '/api/transactions/confirm' && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const ids = (Array.isArray(b.ids) ? b.ids : []).map((x) => int(x)).filter(Boolean).slice(0, 500);
    let done = 0;
    for (const id of ids) {
      const tx = await DB.prepare(`SELECT id, amount, member_id FROM transactions WHERE id = ? AND tenant_id = ? AND status = 'pending'`).bind(id, tid).first();
      if (!tx) continue;
      const receipt = await nextReceipt(env, tid);
      await DB.prepare(`UPDATE transactions SET status='confirmed', receipt_no=?, confirmed_by=?, confirmed_at=? WHERE id = ?`)
        .bind(receipt, ctx.user.id, now(), id).run();
      await audit(env, who, 'payment.confirm', { entity: 'transaction', id, summary: `#${receipt} · ${(-tx.amount / 100).toFixed(2)}`, details: { member_id: tx.member_id } });
      done++;
    }
    return json({ ok: true, confirmed: done });
  }

  m = path.match(/^\/api\/transactions\/(\d+)\/(void|reject)$/);
  if (m && method === 'POST') {
    need(ctx, 'admin');
    const r = await DB.prepare(`UPDATE transactions SET status='void', confirmed_by=?, confirmed_at=? WHERE id = ? AND tenant_id = ? AND status != 'void'`)
      .bind(ctx.user.id, now(), int(m[1]), tid).run();
    if (r.meta.changes) await audit(env, who, m[2] === 'reject' ? 'payment.reject' : 'transaction.void', { entity: 'transaction', id: int(m[1]) });
    return json({ ok: true, changed: r.meta.changes });
  }

  m = path.match(/^\/api\/transactions\/(\d+)$/);
  if (m && method === 'GET') {
    const tx = await DB.prepare(`SELECT * FROM transactions WHERE id = ? AND tenant_id = ?`).bind(int(m[1]), tid).first();
    if (!tx) throw new HttpError(404, 'not_found');
    return json({ transaction: tx, member: await getMember(env, tid, tx.member_id) });
  }

  // ----- initial balances -----
  if (path === '/api/initial-balances' && method === 'GET') {
    const { results } = await DB.prepare(`SELECT m.id, m.member_no, m.first_name, m.last_name, m.status,
        (SELECT t.amount FROM transactions t WHERE t.member_id = m.id AND t.type = 'initial' AND t.status = 'confirmed' ORDER BY t.id DESC LIMIT 1) AS initial
      FROM members m WHERE m.tenant_id = ? ORDER BY m.last_name COLLATE NOCASE, m.first_name COLLATE NOCASE`).bind(tid).all();
    return json({ members: results });
  }
  if (path === '/api/initial-balances' && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const items = Array.isArray(b.items) ? b.items.slice(0, 5000) : [];
    const date = isoDate(b.date, today());
    const desc = str(b.description, 300);
    const ts = now();
    const stmts = [];
    for (const it of items) {
      const mid = int(it.member_id);
      if (!mid) continue;
      stmts.push(DB.prepare(`DELETE FROM transactions WHERE tenant_id = ? AND member_id = ? AND type = 'initial'`).bind(tid, mid));
      const amount = cents(it.amount);
      if (amount !== 0) {
        stmts.push(DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, date, description, status, created_by, created_at)
          SELECT ?, id, 'initial', ?, ?, ?, 'confirmed', ?, ? FROM members WHERE id = ? AND tenant_id = ?`)
          .bind(tid, amount, date, desc, ctx.user.id, ts, mid, tid));
      }
    }
    for (let i = 0; i < stmts.length; i += 80) await DB.batch(stmts.slice(i, i + 80));
    await audit(env, who, 'initial.save', { summary: `${items.length}`, details: { date, items: items.slice(0, 50) } });
    return json({ ok: true, count: items.length });
  }

  // ----- yearly debits -----
  if (path === '/api/debits' && method === 'GET') {
    const { results } = await DB.prepare(`SELECT r.*, u.username AS created_by_name FROM debit_runs r LEFT JOIN users u ON u.id = r.created_by
      WHERE r.tenant_id = ? ORDER BY r.year DESC, r.id DESC`).bind(tid).all();
    return json({ runs: results });
  }

  if ((path === '/api/debits/preview' || path === '/api/debits') && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const year = int(b.year, 0);
    if (year < 1990 || year > 2200) throw new HttpError(400, 'invalid_year');
    const amounts = b.amounts || {}; // { "<typeId>|none": cents }
    const onlyJoined = b.only_joined !== false;
    const preview = [];
    const { results: types } = await DB.prepare('SELECT id, name FROM membership_types WHERE tenant_id = ?').bind(tid).all();
    const groups = [...types.map((t) => ({ id: t.id, name: t.name })), { id: 0, name: null }];
    const joinSql = onlyJoined ? `AND (m.join_date IS NULL OR m.join_date = '' OR CAST(substr(m.join_date,1,4) AS INTEGER) <= ?)` : '';
    for (const g of groups) {
      const amount = Math.max(0, cents(amounts[g.id ? String(g.id) : 'none']));
      const args = [tid, g.id, ...(onlyJoined ? [year] : []), year];
      const r = await DB.prepare(`SELECT COUNT(*) AS eligible,
          SUM(EXISTS (SELECT 1 FROM transactions t WHERE t.member_id = m.id AND t.type='annual' AND t.year = ? AND t.status != 'void')) AS already
        FROM members m WHERE m.tenant_id = ? AND m.status = 'active' AND COALESCE(m.membership_type_id, 0) = ? ${joinSql}`)
        .bind(year, ...args.slice(0, -1)).first();
      const toCharge = amount > 0 ? (r.eligible || 0) - (r.already || 0) : 0;
      preview.push({ type_id: g.id, name: g.name, amount, eligible: r.eligible || 0, already: r.already || 0, to_charge: toCharge, total: toCharge * amount });
    }
    const summary = { members: preview.reduce((a, p) => a + p.to_charge, 0), total: preview.reduce((a, p) => a + p.total, 0) };
    if (path === '/api/debits/preview') return json({ year, groups: preview, summary });

    if (!summary.members) throw new HttpError(400, 'nothing_to_charge');
    const date = isoDate(b.date, `${year}-01-01`);
    const desc = str(b.description, 300);
    const ts = now();
    const run = await DB.prepare(`INSERT INTO debit_runs (tenant_id, year, description, date, created_by, created_at) VALUES (?,?,?,?,?,?) RETURNING id`)
      .bind(tid, year, desc, date, ctx.user.id, ts).first();
    const stmts = preview.filter((p) => p.amount > 0 && p.to_charge > 0).map((p) =>
      DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, year, date, description, status, run_id, created_by, created_at)
        SELECT ?, m.id, 'annual', ?, ?, ?, ?, 'confirmed', ?, ?, ? FROM members m
        WHERE m.tenant_id = ? AND m.status = 'active' AND COALESCE(m.membership_type_id, 0) = ? ${joinSql}
          AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.member_id = m.id AND t.type='annual' AND t.year = ? AND t.status != 'void')`)
        .bind(tid, p.amount, year, date, desc, run.id, ctx.user.id, ts, tid, p.type_id, ...(onlyJoined ? [year] : []), year));
    await DB.batch(stmts);
    const tot = await DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS s FROM transactions WHERE run_id = ?`).bind(run.id).first();
    await DB.prepare('UPDATE debit_runs SET member_count = ?, total = ? WHERE id = ?').bind(tot.n, tot.s, run.id).run();
    await audit(env, who, 'debits.run', { entity: 'debit_run', id: run.id, summary: `${year} · ${tot.n} · ${(tot.s / 100).toFixed(2)}`, details: { amounts } });
    return json({ ok: true, run_id: run.id, members: tot.n, total: tot.s }, 201);
  }

  m = path.match(/^\/api\/debits\/(\d+)$/);
  if (m && method === 'DELETE') {
    need(ctx, 'admin');
    const id = int(m[1]);
    const run = await DB.prepare('SELECT id FROM debit_runs WHERE id = ? AND tenant_id = ?').bind(id, tid).first();
    if (!run) throw new HttpError(404, 'not_found');
    await DB.batch([
      DB.prepare('DELETE FROM transactions WHERE run_id = ? AND tenant_id = ?').bind(id, tid),
      DB.prepare('DELETE FROM debit_runs WHERE id = ?').bind(id),
    ]);
    await audit(env, who, 'debits.undo', { entity: 'debit_run', id });
    return json({ ok: true });
  }

  // ----- reports -----
  if (path === '/api/reports/balances' && method === 'GET') {
    return json(await balancesReport(env, tid, q));
  }

  // ----- share links -----
  if (path === '/api/share' && method === 'POST') {
    const b = await body(req);
    let payload;
    if (b.kind === 'statement' || b.kind === 'card') {
      await getMember(env, tid, int(b.member_id));
      payload = { k: b.kind, m: int(b.member_id) };
    } else if (b.kind === 'receipt') {
      const tx = await DB.prepare(`SELECT id FROM transactions WHERE id = ? AND tenant_id = ? AND type = 'payment'`).bind(int(b.transaction_id), tid).first();
      if (!tx) throw new HttpError(404, 'not_found');
      payload = { k: 'receipt', x: tx.id };
    } else if (b.kind === 'balances') {
      need(ctx, 'staff');
      const f = b.filters || {};
      payload = { k: 'balances', q: { status: str(f.status, 20), type: str(f.type, 10), only: str(f.only, 10) } };
    } else throw new HttpError(400, 'invalid_kind');
    return json({ url: await makeShareUrl(env, req, ctx, payload), expires_in_days: SHARE_TTL / 86400 });
  }

  // ----- settings -----
  if (path === '/api/settings' && method === 'PUT') {
    need(ctx, 'admin');
    const b = await body(req);
    const t = ctx.tenant;
    const logo = b.logo === undefined ? t.logo : String(b.logo || '');
    if (logo && (!logo.startsWith('data:image/') || logo.length > 300000)) throw new HttpError(400, 'invalid_logo');
    const color = /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : t.color;
    await DB.prepare(`UPDATE tenants SET name=?, address=?, phone=?, email=?, tax_id=?, website=?, logo=?, color=?, currency=?, default_lang=?, card_note=?,
        bank_name=?, bank_iban=?, bank_beneficiary=? WHERE id = ?`)
      .bind(str(b.name ?? t.name, 200) || t.name, str(b.address ?? t.address, 300), str(b.phone ?? t.phone, 50), str(b.email ?? t.email, 200),
        str(b.tax_id ?? t.tax_id, 50), str(b.website ?? t.website, 200), logo, color,
        /^[A-Z]{3}$/.test(b.currency || '') ? b.currency : t.currency, LANGS.includes(b.default_lang) ? b.default_lang : t.default_lang,
        str(b.card_note ?? t.card_note, 200), str(b.bank_name ?? t.bank_name, 100), str(b.bank_iban ?? t.bank_iban, 40).replace(/\s+/g, ' '),
        str(b.bank_beneficiary ?? t.bank_beneficiary, 150), tid).run();
    await audit(env, who, 'settings.update', { entity: 'tenant', id: tid, details: Object.fromEntries(Object.keys(b).filter((k) => k !== 'logo' && String(b[k] ?? '') !== String(t[k] ?? '')).map((k) => [k, b[k]])) });
    return json({ ok: true });
  }

  // ----- users -----
  if (path === '/api/users' && method === 'GET') {
    need(ctx, 'admin');
    const { results } = await DB.prepare('SELECT id, username, full_name, role, active, last_login, created_at FROM users WHERE tenant_id = ? ORDER BY username').bind(tid).all();
    return json({ users: results });
  }
  if (path === '/api/users' && method === 'POST') {
    need(ctx, 'admin');
    const b = await body(req);
    const username = str(b.username, 60);
    if (!username) throw new HttpError(400, 'username_required');
    if (!b.password || String(b.password).length < 8) throw new HttpError(400, 'password_too_short');
    const role = ROLE_LEVEL[b.role] ? b.role : 'staff';
    const dup = await DB.prepare('SELECT id FROM users WHERE tenant_id = ? AND username = ?').bind(tid, username).first();
    if (dup) throw new HttpError(409, 'username_taken');
    await DB.prepare('INSERT INTO users (tenant_id, username, full_name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)')
      .bind(tid, username, str(b.full_name, 100), await hashPassword(String(b.password)), role, now()).run();
    await audit(env, who, 'user.create', { entity: 'user', summary: `${username} (${role})` });
    return json({ ok: true }, 201);
  }
  m = path.match(/^\/api\/users\/(\d+)$/);
  if (m && (method === 'PUT' || method === 'DELETE')) {
    need(ctx, 'admin');
    const id = int(m[1]);
    const u = await DB.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').bind(id, tid).first();
    if (!u) throw new HttpError(404, 'not_found');
    if (id === ctx.user.id && (method === 'DELETE')) throw new HttpError(400, 'cannot_delete_self');
    if (method === 'DELETE') {
      await DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
      await audit(env, who, 'user.delete', { entity: 'user', id, summary: u.username });
      return json({ ok: true });
    }
    const b = await body(req);
    const role = id === ctx.user.id ? u.role : ROLE_LEVEL[b.role] ? b.role : u.role;
    const active = id === ctx.user.id ? 1 : b.active === undefined ? u.active : b.active ? 1 : 0;
    let hash = u.password_hash;
    if (b.password) {
      if (String(b.password).length < 8) throw new HttpError(400, 'password_too_short');
      hash = await hashPassword(String(b.password));
    }
    await DB.prepare('UPDATE users SET full_name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?')
      .bind(str(b.full_name ?? u.full_name, 100), role, active, hash, id).run();
    await audit(env, who, 'user.update', { entity: 'user', id, summary: u.username, details: { role, active, password_changed: !!b.password } });
    return json({ ok: true });
  }

  const handled = await handleFeatures(req, env, path, ctx, q, { getMember, memberTransactions, need, publicUrl });
  if (handled) return handled;

  throw new HttpError(404, 'not_found');
}
