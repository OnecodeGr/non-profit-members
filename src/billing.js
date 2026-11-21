// Tenant subscription state, pricing and enforcement.
export const VAT_RATE = 0.24;
export const GRACE_DAYS = 30;

// Net yearly price (EUR) for a member limit: 35 € ≤100, 90 € ≤500, +10 € per extra 200.
export function netPriceFor(limit) {
  const n = Math.max(1, Math.ceil(limit || 0));
  if (n <= 100) return 35;
  if (n <= 500) return 90;
  return 90 + Math.ceil((n - 500) / 200) * 10;
}

// Standard member-limit tiers offered in the admin panel.
export function limitTiers(max = 5100) {
  const out = [100, 500];
  for (let n = 700; n <= max; n += 200) out.push(n);
  return out;
}

export function quote(limit) {
  const net = netPriceFor(limit) * 100;
  const vat = Math.round(net * VAT_RATE);
  return { member_limit: limit, net, vat, total: net + vat };
}

export function daysLeft(paidUntil) {
  if (!paidUntil) return null;
  const end = Date.parse(`${paidUntil}T23:59:59Z`);
  return Math.floor((end - Date.now()) / 86400000);
}

export function subscriptionState(t, activeMembers = null) {
  const days = daysLeft(t.paid_until);
  let status = 'none';
  if (days !== null) status = days < -GRACE_DAYS ? 'expired' : days < 0 ? 'grace' : days <= 30 ? 'expiring' : 'ok';
  const limit = t.member_limit || null;
  return {
    paid_until: t.paid_until || null,
    days_left: days,
    status,
    member_limit: limit,
    member_count: activeMembers,
    over_limit: !!(limit && activeMembers !== null && activeMembers > limit),
    near_limit: !!(limit && activeMembers !== null && activeMembers >= Math.floor(limit * 0.9)),
    grace_days: GRACE_DAYS,
  };
}

export async function activeMemberCount(env, tid) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM members WHERE tenant_id = ? AND status = 'active'`).bind(tid).first();
  return r.n;
}

export function addYear(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
