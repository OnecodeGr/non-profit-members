import { t } from '../i18n.js';
import { api, esc, icon, money, fmtDate, fullName, can, state } from '../core.js';
import { setPage } from '../main.js';

export async function dashboard(el, _p, stale) {
  setPage(t('nav.home'));
  const d = await api('dashboard');
  if (stale()) return;
  const hour = new Date().getHours();
  const greet = hour < 12 ? t('dash.morning') : hour < 18 ? t('dash.afternoon') : t('dash.evening');
  el.innerHTML = `
  <section class="hero-card">
    <div>
      <span class="eyebrow">${esc(greet)}, ${esc(state.me.user.full_name || state.me.user.username)}</span>
      <h2 class="display">${esc(state.me.tenant.name)}</h2>
      <p class="muted">${esc(t('dash.subtitle', { year: d.year }))}</p>
    </div>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#/scan">${icon('scan')}<span>${esc(t('nav.scan'))}</span></a>
      ${can('staff') ? `<a class="btn btn-ghost" href="#/payments/new">${icon('wallet')}<span>${esc(t('pay.record'))}</span></a>
      <a class="btn btn-ghost" href="#/members/new">${icon('plus')}<span>${esc(t('member.new'))}</span></a>` : ''}
    </div>
  </section>

  <section class="stats">
    <a class="stat" href="#/members"><span class="stat-label">${esc(t('dash.members'))}</span><span class="stat-value">${d.members.active || 0}</span><span class="stat-sub">${esc(t('dash.of_total', { n: d.members.total || 0 }))}</span></a>
    <a class="stat" href="#/reports?only=owing"><span class="stat-label">${esc(t('dash.outstanding'))}</span><span class="stat-value">${esc(money(Math.max(0, d.money.outstanding)))}</span><span class="stat-sub">${esc(t('dash.owing_members', { n: d.owing_count }))}</span></a>
    <a class="stat" href="#/transactions?type=payment"><span class="stat-label">${esc(t('dash.collected', { year: d.year }))}</span><span class="stat-value">${esc(money(d.money.collected_year))}</span>
      <span class="stat-sub">${d.money.charged_year ? esc(t('dash.of_charged', { amount: money(d.money.charged_year) })) : '&nbsp;'}</span>
      ${d.money.charged_year ? `<span class="meter"><span style="width:${Math.min(100, Math.round((d.money.collected_year / d.money.charged_year) * 100))}%"></span></span>` : ''}</a>
    <a class="stat ${d.pending.n ? 'stat-attn' : ''}" href="#/payments"><span class="stat-label">${esc(t('dash.pending'))}</span><span class="stat-value">${d.pending.n}</span><span class="stat-sub">${esc(money(d.pending.total))}</span></a>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>${esc(t('dash.recent_payments'))}</h2><a class="link" href="#/transactions?type=payment">${esc(t('common.view_all'))}</a></div>
    ${d.recent.length ? `<ul class="rows">${d.recent
      .map((x) => `<li><a class="row" href="#/members/${x.member_id}">
        <span class="row-main"><b>${esc(fullName(x))}</b><small>${esc(fmtDate(x.date))} · ${esc(t(`method.${x.method || 'other'}`))}${x.receipt_no ? ` · #${x.receipt_no}` : ''}</small></span>
        <span class="row-end"><b class="amount-in">${esc(money(-x.amount))}</b>${x.status === 'pending' ? `<span class="pill pill-warn">${esc(t('txstatus.pending'))}</span>` : ''}</span></a></li>`)
      .join('')}</ul>` : `<p class="muted pad">${esc(t('dash.no_payments'))}</p>`}
  </section>

  ${can('admin') ? `<section class="quick-grid">
    <a class="quick" href="#/debits">${icon('calendar')}<b>${esc(t('nav.debits'))}</b><small>${esc(t('debits.hint'))}</small></a>
    <a class="quick" href="#/initial">${icon('scale')}<b>${esc(t('nav.initial'))}</b><small>${esc(t('initial.hint'))}</small></a>
    <a class="quick" href="#/import">${icon('upload')}<b>${esc(t('nav.import'))}</b><small>${esc(t('import.hint'))}</small></a>
    <a class="quick" href="#/reports">${icon('chart')}<b>${esc(t('nav.reports'))}</b><small>${esc(t('reports.hint'))}</small></a>
  </section>` : ''}`;
}
