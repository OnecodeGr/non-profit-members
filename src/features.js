// Tenant features: member portal links, payment proofs, events & attendance, audit log, data export.
import {
  HttpError, json, body, now, today, randomToken, str, int, cents, isoDate, checkRateLimit, recordFailure, clientIp,
} from './util.js';
import { audit } from './audit.js';
import { tenantPublic } from './tenant.js';
import { walletFlags } from './wallet.js';

const BAL = `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.member_id = m.id AND t.status = 'confirmed'), 0)`;
const PROOF_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

function decodeDataUrl(dataUrl, maxBytes) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m || !PROOF_TYPES[m[1]]) throw new HttpError(400, 'invalid_proof');
  const bin = atob(m[2]);
  if (bin.length > maxBytes) throw new HttpError(413, 'proof_too_large');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { type: m[1], bytes };
}

const portalUrl = (base, token) => `${base}/m/${token}`;

// ---------- events helpers ----------
function eligibleSql(goodStanding) {
  return `m.status = 'active'${goodStanding ? ` AND ${BAL} <= 0` : ''}`;
}

async function eventStats(env, tid, ev) {
  const elig = await env.DB.prepare(`SELECT COUNT(*) AS n FROM members m WHERE m.tenant_id = ? AND ${eligibleSql(ev.only_good_standing)}`).bind(tid).first();
  const { results: attendees } = await env.DB.prepare(
    `SELECT a.id, a.member_id, a.method, a.checked_at, m.member_no, m.first_name, m.last_name, m.status, m.photo, ${BAL} AS balance, u.username AS checked_by_name
     FROM attendance a JOIN members m ON m.id = a.member_id LEFT JOIN users u ON u.id = a.checked_by
     WHERE a.event_id = ? AND a.tenant_id = ? ORDER BY a.checked_at DESC`,
  ).bind(ev.id, tid).all();
  for (const a of attendees) a.eligible = a.status === 'active' && (!ev.only_good_standing || a.balance <= 0);
  const presentEligible = attendees.filter((a) => a.eligible).length;
  const required = Math.ceil((elig.n * ev.quorum_percent) / 100);
  return {
    attendees,
    stats: { eligible: elig.n, present: attendees.length, present_eligible: presentEligible, required, quorum_met: elig.n > 0 && presentEligible >= required },
  };
}

function eventFields(b, cur = {}) {
  const title = str(b.title ?? cur.title, 200);
  if (!title) throw new HttpError(400, 'title_required');
  return {
    title,
    date: isoDate(b.date ?? cur.date, today()),
    location: str(b.location ?? cur.location, 200),
    kind: ['event', 'assembly'].includes(b.kind) ? b.kind : cur.kind || 'event',
    quorum_percent: Math.min(100, Math.max(1, int(b.quorum_percent ?? cur.quorum_percent, 50))),
    only_good_standing: (b.only_good_standing ?? cur.only_good_standing) ? 1 : 0,
    notes: str(b.notes ?? cur.notes, 2000),
    closed: (b.closed ?? cur.closed) ? 1 : 0,
  };
}

export async function handleFeatures(req, env, path, ctx, q, h) {
  const { method } = req;
  const DB = env.DB;
  const tid = ctx.tid;
  const who = ctx.who;
  const base = h.publicUrl(env, req);
  let m;

  // ----- member portal links -----
  m = path.match(/^\/api\/members\/(\d+)\/portal$/);
  if (m) {
    h.need(ctx, 'staff');
    const id = int(m[1]);
    const mem = await h.getMember(env, tid, id);
    if (method === 'GET') return json({ url: mem.portal_token ? portalUrl(base, mem.portal_token) : null });
    if (method === 'POST') {
      let token = mem.portal_token;
      if (!token || q.regenerate) {
        token = randomToken(24);
        await DB.prepare('UPDATE members SET portal_token = ?, updated_at = ? WHERE id = ? AND tenant_id = ?').bind(token, now(), id, tid).run();
        await audit(env, who, mem.portal_token ? 'portal.regenerate' : 'portal.create', { entity: 'member', id, summary: `№${mem.member_no} ${mem.last_name}` });
      }
      return json({ url: portalUrl(base, token) });
    }
    if (method === 'DELETE') {
      await DB.prepare('UPDATE members SET portal_token = NULL, updated_at = ? WHERE id = ? AND tenant_id = ?').bind(now(), id, tid).run();
      await audit(env, who, 'portal.revoke', { entity: 'member', id, summary: `№${mem.member_no} ${mem.last_name}` });
      return json({ ok: true });
    }
  }

  // ----- payment proof (stored in R2) -----
  m = path.match(/^\/api\/transactions\/(\d+)\/proof$/);
  if (m && method === 'GET') {
    const tx = await DB.prepare('SELECT proof_key, proof_type FROM transactions WHERE id = ? AND tenant_id = ?').bind(int(m[1]), tid).first();
    if (!tx || !tx.proof_key || !env.PROOFS) throw new HttpError(404, 'not_found');
    const obj = await env.PROOFS.get(tx.proof_key);
    if (!obj) throw new HttpError(404, 'not_found');
    return new Response(obj.body, {
      headers: { 'content-type': tx.proof_type || 'application/octet-stream', 'cache-control': 'private, max-age=300', 'content-disposition': 'inline' },
    });
  }

  // ----- events -----
  if (path === '/api/events' && method === 'GET') {
    const { results } = await DB.prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) AS present
       FROM events e WHERE e.tenant_id = ? ORDER BY e.date DESC, e.id DESC LIMIT 200`,
    ).bind(tid).all();
    return json({ events: results });
  }
  if (path === '/api/events' && method === 'POST') {
    h.need(ctx, 'staff');
    const f = eventFields(await body(req));
    const r = await DB.prepare(
      `INSERT INTO events (tenant_id, title, date, location, kind, quorum_percent, only_good_standing, notes, closed, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,0,?,?) RETURNING *`,
    ).bind(tid, f.title, f.date, f.location, f.kind, f.quorum_percent, f.only_good_standing, f.notes, ctx.user.id, now()).first();
    await audit(env, who, 'event.create', { entity: 'event', id: r.id, summary: `${f.date} ${f.title}` });
    return json({ event: r }, 201);
  }
  m = path.match(/^\/api\/events\/(\d+)(\/sheet)?$/);
  if (m) {
    const ev = await DB.prepare('SELECT * FROM events WHERE id = ? AND tenant_id = ?').bind(int(m[1]), tid).first();
    if (!ev) throw new HttpError(404, 'not_found');
    if (m[2] && method === 'GET') {
      const { results } = await DB.prepare(
        `SELECT m.id, m.member_no, m.first_name, m.last_name, a.checked_at FROM members m
         LEFT JOIN attendance a ON a.member_id = m.id AND a.event_id = ?
         WHERE m.tenant_id = ? AND ${eligibleSql(ev.only_good_standing)} ORDER BY m.last_name COLLATE NOCASE, m.first_name COLLATE NOCASE`,
      ).bind(ev.id, tid).all();
      return json({ event: ev, members: results });
    }
    if (method === 'GET') return json({ event: ev, ...(await eventStats(env, tid, ev)) });
    if (method === 'PUT') {
      h.need(ctx, 'staff');
      const f = eventFields(await body(req), ev);
      await DB.prepare(`UPDATE events SET title=?, date=?, location=?, kind=?, quorum_percent=?, only_good_standing=?, notes=?, closed=? WHERE id = ?`)
        .bind(f.title, f.date, f.location, f.kind, f.quorum_percent, f.only_good_standing, f.notes, f.closed, ev.id).run();
      await audit(env, who, 'event.update', { entity: 'event', id: ev.id, summary: `${f.date} ${f.title}`, details: { closed: f.closed } });
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      h.need(ctx, 'admin');
      await DB.batch([
        DB.prepare('DELETE FROM attendance WHERE event_id = ?').bind(ev.id),
        DB.prepare('DELETE FROM events WHERE id = ?').bind(ev.id),
      ]);
      await audit(env, who, 'event.delete', { entity: 'event', id: ev.id, summary: `${ev.date} ${ev.title}` });
      return json({ ok: true });
    }
  }
  m = path.match(/^\/api\/events\/(\d+)\/checkin$/);
  if (m && method === 'POST') {
    h.need(ctx, 'staff');
    const ev = await DB.prepare('SELECT * FROM events WHERE id = ? AND tenant_id = ?').bind(int(m[1]), tid).first();
    if (!ev) throw new HttpError(404, 'not_found');
    if (ev.closed) throw new HttpError(409, 'event_closed');
    const b = await body(req);
    let memberId = int(b.member_id, 0);
    if (!memberId) {
      let code = String(b.code || '').trim();
      const mm = code.match(/\/c\/([A-Za-z0-9_-]{10,64})/);
      if (mm) code = mm[1];
      const row = /^\d+$/.test(code)
        ? await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND member_no = ?').bind(tid, int(code)).first()
        : await DB.prepare('SELECT id FROM members WHERE tenant_id = ? AND qr_token = ?').bind(tid, code).first();
      if (!row) throw new HttpError(404, 'member_not_found');
      memberId = row.id;
    }
    const mem = await h.getMember(env, tid, memberId);
    const r = await DB.prepare(
      `INSERT INTO attendance (tenant_id, event_id, member_id, method, checked_by, checked_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(event_id, member_id) DO NOTHING`,
    ).bind(tid, ev.id, memberId, b.member_id ? 'manual' : 'qr', ctx.user.id, now()).run();
    const duplicate = !r.meta.changes;
    if (!duplicate) await audit(env, who, 'event.checkin', { entity: 'event', id: ev.id, summary: `№${mem.member_no} ${mem.last_name} ${mem.first_name}` });
    const eligible = mem.status === 'active' && (!ev.only_good_standing || mem.balance <= 0);
    return json({ member: mem, duplicate, eligible, ...(await eventStats(env, tid, ev)) });
  }
  m = path.match(/^\/api\/events\/(\d+)\/attendance\/(\d+)$/);
  if (m && method === 'DELETE') {
    h.need(ctx, 'staff');
    const r = await DB.prepare('DELETE FROM attendance WHERE event_id = ? AND member_id = ? AND tenant_id = ?').bind(int(m[1]), int(m[2]), tid).run();
    if (r.meta.changes) await audit(env, who, 'event.checkout', { entity: 'event', id: int(m[1]), details: { member_id: int(m[2]) } });
    return json({ ok: true });
  }

  // ----- audit log -----
  if (path === '/api/audit' && method === 'GET') {
    h.need(ctx, 'admin');
    const where = ['tenant_id = ?'];
    const args = [tid];
    if (q.action) { where.push('action LIKE ?'); args.push(`${q.action}%`); }
    if (q.actor) { where.push('actor = ?'); args.push(q.actor); }
    if (q.from) { where.push('created_at >= ?'); args.push(isoDate(q.from)); }
    if (q.to) { where.push('created_at < ?'); args.push(`${isoDate(q.to)}T99`); }
    if (q.q) { where.push('(summary LIKE ? OR details LIKE ? OR actor LIKE ?)'); args.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`); }
    const limit = Math.min(int(q.limit, 100), 5000);
    const offset = Math.max(int(q.offset, 0), 0);
    const [{ results }, total, actors] = await Promise.all([
      DB.prepare(`SELECT * FROM audit_log WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...args, limit, offset).all(),
      DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE ${where.join(' AND ')}`).bind(...args).first(),
      DB.prepare(`SELECT DISTINCT actor FROM audit_log WHERE tenant_id = ? ORDER BY actor LIMIT 200`).bind(tid).all(),
    ]);
    return json({ rows: results, total: total.n, actors: actors.results.map((r) => r.actor) });
  }

  // ----- full data export (GDPR portability / backup) -----
  if (path === '/api/export' && method === 'GET') {
    h.need(ctx, 'admin');
    const all = (sql) => DB.prepare(sql).bind(tid).all().then((r) => r.results);
    const t = { ...ctx.tenant };
    for (const k of ['uid', 'username', 'full_name', 'role', 'uactive']) delete t[k];
    const data = {
      exported_at: now(),
      format: 'members.onecode.win/v1',
      tenant: t,
      users: await all('SELECT id, username, full_name, role, active, last_login, created_at FROM users WHERE tenant_id = ?'),
      membership_types: await all('SELECT * FROM membership_types WHERE tenant_id = ?'),
      members: await all('SELECT * FROM members WHERE tenant_id = ? ORDER BY member_no'),
      transactions: await all('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY id'),
      debit_runs: await all('SELECT * FROM debit_runs WHERE tenant_id = ? ORDER BY id'),
      events: await all('SELECT * FROM events WHERE tenant_id = ? ORDER BY id'),
      attendance: await all('SELECT * FROM attendance WHERE tenant_id = ? ORDER BY id'),
      subscriptions: await all('SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY id'),
      audit_log: await all('SELECT * FROM audit_log WHERE tenant_id = ? ORDER BY id DESC LIMIT 20000'),
    };
    await audit(env, who, 'data.export', { summary: `${data.members.length} members · ${data.transactions.length} transactions` });
    return json(data);
  }

  return null;
}

// ---------- public member portal (/m/<token>) ----------
export async function handlePortal(req, env, path) {
  const m = path.match(/^\/api\/portal\/([A-Za-z0-9_-]{20,64})(\/payment)?$/);
  if (!m) return null;
  const DB = env.DB;
  const mem = await DB.prepare(`SELECT m.*, mt.name AS type_name, ${BAL} AS balance FROM members m
    LEFT JOIN membership_types mt ON mt.id = m.membership_type_id WHERE m.portal_token = ?`).bind(m[1]).first();
  if (!mem) throw new HttpError(404, 'link_expired');
  const t = await DB.prepare('SELECT * FROM tenants WHERE id = ? AND active = 1').bind(mem.tenant_id).first();
  if (!t) throw new HttpError(404, 'link_expired');
  const base = (env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');

  if (!m[2] && req.method === 'GET') {
    const { results: txs } = await DB.prepare(`SELECT id, type, amount, year, date, description, method, reference, status, receipt_no, source, note,
        (proof_key IS NOT NULL) AS has_proof FROM transactions WHERE member_id = ? AND status != 'void' ORDER BY date, id`).bind(mem.id).all();
    const { results: events } = await DB.prepare(`SELECT e.id, e.title, e.date, e.location, e.kind, a.checked_at FROM events e
        LEFT JOIN attendance a ON a.event_id = e.id AND a.member_id = ? WHERE e.tenant_id = ? AND (e.date >= ? OR a.id IS NOT NULL)
        ORDER BY e.date DESC LIMIT 20`).bind(mem.id, t.id, today()).all();
    return json({
      tenant: tenantPublic(t),
      public_url: base,
      member: {
        member_no: mem.member_no, first_name: mem.first_name, last_name: mem.last_name, father_name: mem.father_name, email: mem.email,
        phone: mem.phone, status: mem.status, photo: mem.photo, join_date: mem.join_date, type_name: mem.type_name, balance: mem.balance,
        pending: txs.filter((x) => x.status === 'pending').reduce((a, x) => a - x.amount, 0), qr_token: mem.qr_token,
      },
      transactions: txs,
      events,
      wallet: walletFlags(env),
      proofs_enabled: !!env.PROOFS,
    });
  }

  if (m[2] && req.method === 'POST') {
    const bucket = `portal:${mem.id}`;
    await checkRateLimit(env, bucket);
    await recordFailure(env, bucket); // every submission counts (max 10 per 15 min)
    const b = await body(req);
    const amount = Math.abs(cents(b.amount));
    if (!amount || amount > 10000000) throw new HttpError(400, 'invalid_amount');
    let proof = null;
    if (b.proof) {
      if (!env.PROOFS) throw new HttpError(400, 'proofs_disabled');
      proof = decodeDataUrl(b.proof, 6 * 1024 * 1024);
    }
    const ts = now();
    const tx = await DB.prepare(`INSERT INTO transactions (tenant_id, member_id, type, amount, date, description, method, reference, status, source, note, created_at)
      VALUES (?, ?, 'payment', ?, ?, ?, 'bank', ?, 'pending', 'member', ?, ?) RETURNING id`)
      .bind(t.id, mem.id, -amount, isoDate(b.date, today()), str(b.description, 300), str(b.reference, 100), str(b.note, 1000), ts).first();
    if (proof) {
      const key = `${t.id}/${tx.id}-${randomToken(8)}.${PROOF_TYPES[proof.type]}`;
      await env.PROOFS.put(key, proof.bytes, { httpMetadata: { contentType: proof.type } });
      await DB.prepare('UPDATE transactions SET proof_key = ?, proof_type = ? WHERE id = ?').bind(key, proof.type, tx.id).run();
    }
    await audit(env, { tid: t.id, actor: `member:№${mem.member_no}`, ip: clientIp(req) }, 'portal.payment', {
      entity: 'transaction', id: tx.id, summary: `№${mem.member_no} ${mem.last_name} · ${(amount / 100).toFixed(2)}`, details: { proof: !!proof },
    });
    return json({ ok: true }, 201);
  }
  throw new HttpError(405, 'method_not_allowed');
}
