// Append-only audit trail of changes per tenant.
import { now } from './util.js';

// who = { tid, userId, actor, ip }
export async function audit(env, who, action, { entity = '', id = null, summary = '', details = null } = {}) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (tenant_id, user_id, actor, action, entity, entity_id, summary, details, ip, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).bind(who.tid, who.userId ?? null, who.actor || '?', action, entity, id, String(summary).slice(0, 300),
      details ? JSON.stringify(details).slice(0, 4000) : '', who.ip || '', now()).run();
  } catch (e) {
    console.error('audit failed', e);
  }
}
