import { t } from '../i18n.js';
import { api, esc, icon, money, fullName, state, empty, hashQuery, debounce, avatar, can } from '../core.js';
import { setPage } from '../main.js';
import { shareSheet, balancesSpec, createShareLink, cardShareSheet } from '../print.js';

const rState = { only: '', status: 'active', type: '' };

export async function reports(el) {
  const hq = hashQuery();
  if (hq.only) rState.only = hq.only;
  setPage(t('nav.reports'), { actions: `<button class="btn btn-primary btn-sm" data-export aria-label="${esc(t('common.export'))}">${icon('share')}<span class="hide-sm">${esc(t('common.export'))}</span></button>` });
  const types = state.me.types || [];
  el.innerHTML = `
  <section class="panel intro">
    <span class="eyebrow">${esc(t('reports.eyebrow'))}</span>
    <h2 class="display">${esc(t('doc.balances'))}</h2>
    <p class="muted">${esc(t('reports.text'))}</p>
  </section>
  <div class="toolbar">
    <div class="chips">${['', 'owing', 'credit', 'settled'].map((o) => `<button class="chip ${rState.only === o ? 'on' : ''}" data-only="${o}">${esc(o ? t(`report.only_${o}`) : t('common.all'))}</button>`).join('')}</div>
    <div class="toolbar-row">
      <select data-k="status" aria-label="${esc(t('member.status'))}"><option value="">${esc(t('common.all_statuses'))}</option>${['active', 'inactive'].map((s) => `<option value="${s}" ${rState.status === s ? 'selected' : ''}>${esc(t(`status.${s}`))}</option>`).join('')}</select>
      ${types.length ? `<select data-k="type" aria-label="${esc(t('member.type'))}"><option value="">${esc(t('member.all_types'))}</option>${types.map((x) => `<option value="${x.id}" ${String(rState.type) === String(x.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
    </div>
  </div>
  <section class="stats stats-3 report-stats"></section>
  <section class="panel"><div class="table-scroll" tabindex="0"><table class="table report-table">
    <thead><tr><th>${esc(t('member.no_short'))}</th><th>${esc(t('member.name'))}</th><th class="r hide-sm">${esc(t('doc.total_charged'))}</th><th class="r hide-sm">${esc(t('doc.total_paid'))}</th><th class="r">${esc(t('bal.balance'))}</th></tr></thead>
    <tbody></tbody></table></div></section>`;

  let report;
  const load = async () => {
    el.querySelector('tbody').innerHTML = `<tr><td colspan="5"><div class="loading"><span class="spinner"></span></div></td></tr>`;
    report = await api('reports/balances', { query: rState });
    const tt = report.totals;
    el.querySelector('.report-stats').innerHTML = `
      <div class="stat"><span class="stat-label">${esc(t('doc.total_charged'))}</span><span class="stat-value">${esc(money(tt.charged))}</span><span class="stat-sub">${esc(t('member.count', { n: tt.count }))}</span></div>
      <div class="stat"><span class="stat-label">${esc(t('doc.total_paid'))}</span><span class="stat-value">${esc(money(tt.paid))}</span>
        <span class="stat-sub">${tt.charged ? `${Math.round((tt.paid / tt.charged) * 100)}%` : '&nbsp;'}</span>${tt.charged ? `<span class="meter"><span style="width:${Math.min(100, Math.round((tt.paid / tt.charged) * 100))}%"></span></span>` : ''}</div>
      <div class="stat stat-attn"><span class="stat-label">${esc(t('doc.total_outstanding'))}</span><span class="stat-value">${esc(money(tt.owing))}</span><span class="stat-sub">${esc(t('dash.owing_members', { n: report.rows.filter((r) => r.balance > 0).length }))}</span></div>`;
    el.querySelector('tbody').innerHTML = report.rows.length ? report.rows.map((r) => `<tr data-href="#/members/${r.id}">
      <td>${r.member_no}</td><td><a href="#/members/${r.id}">${esc(fullName(r))}</a>${r.type_name ? `<small class="muted block">${esc(r.type_name)}</small>` : ''}</td>
      <td class="r hide-sm">${esc(money(r.charged))}</td><td class="r hide-sm">${esc(money(r.paid))}</td>
      <td class="r"><b class="${r.balance > 0 ? 'amount-out' : r.balance < 0 ? 'amount-in' : ''}">${esc(money(r.balance))}</b></td></tr>`).join('')
      : `<tr><td colspan="5">${empty(t('member.no_results'), 'chart')}</td></tr>`;
  };
  el.onclick = (e) => {
    const o = e.target.closest('[data-only]');
    if (o) {
      rState.only = o.dataset.only;
      el.querySelectorAll('[data-only]').forEach((c) => c.classList.toggle('on', c === o));
      load();
    }
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a')) location.hash = tr.dataset.href;
  };
  el.onchange = (e) => {
    const k = e.target.dataset.k;
    if (k) {
      rState[k] = e.target.value;
      load();
    }
  };
  document.querySelector('[data-export]').onclick = () =>
    shareSheet({
      title: t('doc.balances'),
      text: `${t('doc.balances')} · ${state.me.tenant.name}`,
      spec: balancesSpec(report, rState),
      link: can('staff') ? () => createShareLink({ kind: 'balances', filters: rState }) : undefined,
    });
  await load();
}

// ---------- batch cards ----------
export async function cards(el) {
  setPage(t('nav.cards'));
  el.innerHTML = `
  <section class="panel intro">
    <span class="eyebrow">${esc(t('card.eyebrow'))}</span>
    <h2 class="display">${esc(t('card.batch_title'))}</h2>
    <p class="muted">${esc(t('card.batch_text'))}</p>
  </section>
  <div class="toolbar">
    <div class="search">${icon('search')}<input type="search" placeholder="${esc(t('member.search'))}" aria-label="${esc(t('member.search'))}"></div>
    <label class="check-all"><input type="checkbox" data-all> ${esc(t('common.select_all'))}</label>
  </div>
  <ul class="rows card-pick"></ul>
  <div class="sticky-actions" hidden><span class="sel-count"></span><button class="btn btn-primary" data-go>${icon('card')}<span>${esc(t('card.print_selected'))}</span></button></div>`;
  let members = [];
  const ul = el.querySelector('.card-pick');
  const sel = new Set();
  const draw = () => {
    const q = el.querySelector('input[type=search]').value.toLowerCase().trim();
    const shown = members.filter((m) => !q || `${fullName(m)} ${m.first_name} ${m.member_no}`.toLowerCase().includes(q));
    ul.innerHTML = shown.map((m) => `<li><label class="row"><input type="checkbox" data-id="${m.id}" ${sel.has(m.id) ? 'checked' : ''}>${avatar(m)}
      <span class="row-main"><b>${esc(fullName(m))}</b><small>№ ${m.member_no}${m.type_name ? ` · ${esc(m.type_name)}` : ''}</small></span></label></li>`).join('') || `<li>${empty(t('member.no_results'), 'users')}</li>`;
    bar();
  };
  const bar = () => {
    const b = el.querySelector('.sticky-actions');
    b.hidden = !sel.size;
    b.querySelector('.sel-count').textContent = t('card.selected', { n: sel.size });
  };
  ul.innerHTML = '<li class="loading"><span class="spinner"></span></li>';
  members = (await api('members', { query: { status: 'active', all: 1, sort: 'name' } })).members;
  draw();
  el.querySelector('input[type=search]').oninput = debounce(draw, 150);
  el.onchange = (e) => {
    if (e.target.matches('[data-all]')) {
      ul.querySelectorAll('[data-id]').forEach((c) => {
        c.checked = e.target.checked;
        if (c.checked) sel.add(+c.dataset.id);
        else sel.delete(+c.dataset.id);
      });
    } else if (e.target.matches('[data-id]')) {
      if (e.target.checked) sel.add(+e.target.dataset.id);
      else sel.delete(+e.target.dataset.id);
    }
    bar();
  };
  el.querySelector('[data-go]').onclick = () => cardShareSheet(members.filter((m) => sel.has(m.id)));
}
