import { t } from '../i18n.js';
import {
  api, esc, icon, money, fmtDate, fullName, can, go, toast, errText, formData, debounce, avatar, balanceBadge,
  parseAmount, todayIso, empty, hashQuery, confirmDialog, centsToInput, currencySymbol,
} from '../core.js';
import { setPage } from '../main.js';
import { shareSheet, transactionsSpec, txLabel } from '../print.js';
import { receiptSheet, txDialog } from './members.js';

// ---------- pending + recent ----------
export async function payments(el, _p, stale) {
  setPage(t('nav.payments'), {
    actions: can('staff') ? `<a class="btn btn-primary btn-sm" href="#/payments/new">${icon('plus')}<span class="hide-sm">${esc(t('pay.record'))}</span></a>` : '',
  });
  const [pending, recent] = await Promise.all([
    api('transactions', { query: { type: 'payment', status: 'pending', limit: 500 } }),
    api('transactions', { query: { type: 'payment', status: 'confirmed', limit: 20 } }),
  ]);
  if (stale()) return;
  const admin = can('admin');
  el.innerHTML = `
  <section class="panel">
    <div class="panel-head"><h3>${esc(t('pay.pending_title'))} <span class="pill pill-warn">${pending.rows.length}</span></h3>
      ${admin && pending.rows.length ? `<label class="check-all"><input type="checkbox" data-all> ${esc(t('common.select_all'))}</label>` : ''}</div>
    <p class="muted small pad-x">${esc(admin ? t('pay.pending_hint_admin') : t('pay.pending_hint_staff'))}</p>
    ${pending.rows.length ? `<ul class="rows">${pending.rows.map((x) => `<li class="row pending-row">
        ${admin ? `<input type="checkbox" data-id="${x.id}" aria-label="${esc(t('common.select'))}">` : ''}
        <a class="row-main" href="#/members/${x.member_id}"><b>${esc(fullName(x))} <small class="muted">№ ${x.member_no}</small></b>
          <small>${esc(fmtDate(x.date))} · ${esc(t(`method.${x.method || 'other'}`))}${x.reference ? ` · ${esc(x.reference)}` : ''}${x.source === 'member' ? ` · ${esc(t('portal.from_member'))}` : x.created_by_name ? ` · ${esc(x.created_by_name)}` : ''}</small>
          ${x.note ? `<small class="muted">“${esc(x.note)}”</small>` : ''}</a>
        ${x.proof_key ? `<a class="icon-btn" href="/api/transactions/${x.id}/proof" target="_blank" rel="noopener" title="${esc(t('portal.view_proof'))}">${icon('paperclip')}</a>` : ''}
        <span class="row-end"><b class="amount-in">${esc(money(-x.amount))}</b>
          ${admin ? `<span class="row-btns"><button class="icon-btn ok" data-confirm="${x.id}" title="${esc(t('pay.confirm'))}">${icon('check')}</button>
          <button class="icon-btn no" data-reject="${x.id}" title="${esc(t('pay.reject'))}">${icon('x')}</button></span>` : ''}</span>
      </li>`).join('')}</ul>
      ${admin ? `<div class="sticky-actions" hidden><span class="sel-count"></span><button class="btn btn-primary" data-bulk>${icon('check')}<span>${esc(t('pay.confirm_selected'))}</span></button></div>` : ''}`
    : empty(t('pay.no_pending'), 'check')}
  </section>
  <section class="panel">
    <div class="panel-head"><h3>${esc(t('pay.recent'))}</h3><a class="link" href="#/transactions?type=payment">${esc(t('common.view_all'))}</a></div>
    ${recent.rows.length ? `<ul class="rows">${recent.rows.map((x) => `<li><button class="row" data-receipt="${x.id}" data-member="${x.member_id}">
      <span class="row-main"><b>${esc(fullName(x))}</b><small>${esc(fmtDate(x.date))} · ${esc(t(`method.${x.method || 'other'}`))} · #${x.receipt_no}</small></span>
      <span class="row-end"><b class="amount-in">${esc(money(-x.amount))}</b>${icon('receipt')}</span></button></li>`).join('')}</ul>` : `<p class="muted pad">${esc(t('dash.no_payments'))}</p>`}
  </section>`;

  const refresh = () => payments(el, _p, stale);
  const selected = () => [...el.querySelectorAll('[data-id]:checked')].map((c) => +c.dataset.id);
  const updateBar = () => {
    const bar = el.querySelector('.sticky-actions');
    if (!bar) return;
    const ids = selected();
    bar.hidden = !ids.length;
    const total = pending.rows.filter((x) => ids.includes(x.id)).reduce((a, x) => a - x.amount, 0);
    bar.querySelector('.sel-count').textContent = `${ids.length} · ${money(total)}`;
  };
  el.onchange = (e) => {
    if (e.target.matches('[data-all]')) el.querySelectorAll('[data-id]').forEach((c) => (c.checked = e.target.checked));
    updateBar();
  };
  el.onclick = async (e) => {
    const c = e.target.closest('[data-confirm]');
    const r = e.target.closest('[data-reject]');
    const rc = e.target.closest('[data-receipt]');
    try {
      if (c) {
        await api('transactions/confirm', { method: 'POST', body: { ids: [+c.dataset.confirm] } });
        toast(t('pay.confirmed'));
        refresh();
      } else if (r) {
        if (!(await confirmDialog(t('pay.reject_confirm'), { danger: true, ok: t('pay.reject') }))) return;
        await api(`transactions/${r.dataset.reject}/reject`, { method: 'POST' });
        toast(t('pay.rejected'));
        refresh();
      } else if (e.target.closest('[data-bulk]')) {
        const ids = selected();
        if (!(await confirmDialog(t('pay.confirm_bulk', { n: ids.length })))) return;
        const res = await api('transactions/confirm', { method: 'POST', body: { ids } });
        toast(t('pay.confirmed_n', { n: res.confirmed }));
        refresh();
      } else if (rc) {
        receiptSheet(null, { id: +rc.dataset.receipt });
      }
    } catch (err) {
      toast(errText(err), 'err');
    }
  };
}

// ---------- record payment ----------
export async function newPayment(el, _p, stale) {
  const q = hashQuery();
  setPage(t('pay.record'), { back: q.member ? `#/members/${q.member}` : '#/payments' });
  let member = q.member ? (await api(`members/${q.member}`)).member : null;
  if (stale()) return;
  const admin = can('admin');

  const draw = () => {
    el.innerHTML = `
    <form class="form panel pay-form" novalidate>
      <div class="member-pick">
        ${member ? `<div class="picked">${avatar(member)}<span class="row-main"><b>${esc(fullName(member))}</b><small>№ ${member.member_no} · ${esc(t('bal.balance'))}: ${balanceBadge(member.balance)}</small></span>
          ${q.member ? '' : `<button type="button" class="link" data-change>${esc(t('common.change'))}</button>`}</div>`
        : `<label class="field"><span>${esc(t('pay.member'))}</span><div class="search">${icon('search')}<input data-msearch placeholder="${esc(t('member.search'))}" autocomplete="off"></div></label>
           <ul class="rows suggest"></ul>`}
      </div>
      ${member ? `
      <label class="field amount-field"><span>${esc(t('tx.amount'))}</span>
        <div class="amount-input"><span class="cur">${esc(currencySymbol())}</span><input name="amount" inputmode="decimal" placeholder="0,00" value="${member.balance > 0 ? esc(centsToInput(member.balance)) : ''}" required></div></label>
      ${member.balance > 0 ? `<div class="chips quick-amounts"><button type="button" class="chip" data-amt="${member.balance}">${esc(t('pay.full_balance'))} ${esc(money(member.balance))}</button>
        ${[1000, 2000, 5000].filter((v) => v < member.balance).map((v) => `<button type="button" class="chip" data-amt="${v}">${esc(money(v))}</button>`).join('')}</div>` : ''}
      <div class="field"><span>${esc(t('tx.method'))}</span>
        <div class="seg">${['cash', 'bank', 'card', 'other'].map((mth, i) => `<label><input type="radio" name="method" value="${mth}" ${i === 0 ? 'checked' : ''}><span>${esc(t(`method.${mth}`))}</span></label>`).join('')}</div></div>
      <div class="grid-2">
        <label class="field"><span>${esc(t('tx.date'))}</span><input type="date" name="date" value="${todayIso()}"></label>
        <label class="field"><span>${esc(t('tx.reference'))}</span><input name="reference" placeholder="${esc(t('pay.reference_placeholder'))}"></label>
      </div>
      <label class="field"><span>${esc(t('tx.description'))}</span><input name="description" placeholder="${esc(t('pay.description_placeholder'))}"></label>
      ${admin ? `<label class="switch"><input type="checkbox" name="confirm" checked><span class="track"></span><span>${esc(t('pay.confirm_now'))}<small class="muted">${esc(t('pay.confirm_now_hint'))}</small></span></label>`
        : `<p class="note">${icon('clock')} ${esc(t('pay.will_be_pending'))}</p>`}
      <div class="form-actions"><button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')}<span>${esc(t('pay.save'))}</span></button></div>` : ''}
    </form>`;
    bind();
  };

  const bind = () => {
    const formEl = el.querySelector('form');
    const ms = el.querySelector('[data-msearch]');
    if (ms) {
      ms.focus();
      const sug = el.querySelector('.suggest');
      const search = debounce(async () => {
        if (!ms.value.trim()) return (sug.innerHTML = '');
        const r = await api('members', { query: { q: ms.value.trim(), limit: 8 } });
        sug.innerHTML = r.members.map((m) => `<li><button type="button" class="row" data-pick="${m.id}">${avatar(m)}<span class="row-main"><b>${esc(fullName(m))}</b><small>№ ${m.member_no}</small></span><span class="row-end">${balanceBadge(m.balance)}</span></button></li>`).join('') || `<li class="muted pad">${esc(t('member.no_results'))}</li>`;
      }, 200);
      ms.oninput = search;
    }
    formEl.onclick = async (e) => {
      const p = e.target.closest('[data-pick]');
      if (p) {
        member = (await api(`members/${p.dataset.pick}`)).member;
        draw();
      }
      if (e.target.closest('[data-change]')) {
        member = null;
        draw();
      }
      const a = e.target.closest('[data-amt]');
      if (a) formEl.amount.value = centsToInput(+a.dataset.amt);
    };
    formEl.onsubmit = async (e) => {
      e.preventDefault();
      if (!member) return;
      const d = formData(formEl);
      const amount = parseAmount(d.amount);
      if (!amount || Number.isNaN(amount) || amount < 0) return toast(t('err.invalid_amount'), 'err');
      const btn = formEl.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const r = await api('transactions', { method: 'POST', body: { ...d, type: 'payment', amount, member_id: member.id } });
        success(r.transaction);
      } catch (err) {
        toast(errText(err), 'err');
        btn.disabled = false;
      }
    };
  };

  const success = (tx) => {
    const confirmed = tx.status === 'confirmed';
    el.innerHTML = `
    <section class="panel success">
      <div class="success-mark">${icon(confirmed ? 'check' : 'clock')}</div>
      <h2 class="display">${esc(money(-tx.amount))}</h2>
      <p>${esc(confirmed ? t('pay.success_confirmed', { no: tx.receipt_no }) : t('pay.success_pending'))}</p>
      <p class="muted">${esc(fullName(member))} · № ${member.member_no}</p>
      <div class="action-bar center">
        <button class="btn btn-primary" data-receipt>${icon('receipt')}<span>${esc(t('pay.receipt_share'))}</span></button>
        <a class="btn btn-ghost" href="#/members/${member.id}">${icon('users')}<span>${esc(t('scan.open'))}</span></a>
        <a class="btn btn-ghost" href="#/scan">${icon('scan')}<span>${esc(t('pay.next_scan'))}</span></a>
      </div>
    </section>`;
    el.querySelector('[data-receipt]').onclick = () => receiptSheet(member, tx);
  };
  draw();
}

// ---------- all transactions ----------
const txState = { from: '', to: '', type: '', status: '', q: '' };

export async function transactions(el) {
  const hq = hashQuery();
  if (hq.type) txState.type = hq.type;
  setPage(t('nav.transactions'), { actions: `<button class="icon-btn" data-export title="${esc(t('common.export'))}">${icon('download')}</button>` });
  const year = new Date().getFullYear();
  el.innerHTML = `
  <div class="toolbar">
    <div class="search">${icon('search')}<input type="search" data-k="q" placeholder="${esc(t('tx.search'))}" value="${esc(txState.q)}"></div>
    <div class="chips">
      <button class="chip" data-range="month">${esc(t('range.month'))}</button>
      <button class="chip" data-range="year">${esc(t('range.year', { year }))}</button>
      <button class="chip" data-range="last">${esc(t('range.year', { year: year - 1 }))}</button>
      <button class="chip" data-range="all">${esc(t('range.all'))}</button>
    </div>
    <div class="toolbar-row">
      <input type="date" data-k="from" value="${esc(txState.from)}" aria-label="${esc(t('range.from'))}">
      <input type="date" data-k="to" value="${esc(txState.to)}" aria-label="${esc(t('range.to'))}">
      <select data-k="type"><option value="">${esc(t('tx.all_types'))}</option>
        ${['payment', 'annual', 'charge', 'credit', 'initial'].map((x) => `<option value="${x}" ${txState.type === x ? 'selected' : ''}>${esc(t(`tx.${x}`))}</option>`).join('')}</select>
      <select data-k="status"><option value="">${esc(t('tx.all_statuses'))}</option>
        ${['confirmed', 'pending', 'void'].map((x) => `<option value="${x}" ${txState.status === x ? 'selected' : ''}>${esc(t(`txstatus.${x}`))}</option>`).join('')}</select>
    </div>
  </div>
  <div class="summary-strip"></div>
  <ul class="rows tx-list"></ul>
  <div class="more-wrap"></div>`;

  let offset = 0;
  let data;
  const ul = el.querySelector('.tx-list');
  const load = async (reset) => {
    if (reset) {
      offset = 0;
      ul.innerHTML = '<li class="loading"><span class="spinner"></span></li>';
    }
    data = await api('transactions', { query: { ...txState, offset, limit: 100 } });
    if (reset) ul.innerHTML = '';
    el.querySelector('.summary-strip').innerHTML = `
      <div><span>${esc(t('doc.count'))}</span><b>${data.summary.count}</b></div>
      <div><span>${esc(t('doc.total_charges'))}</span><b>${esc(money(data.summary.charges))}</b></div>
      <div><span>${esc(t('doc.total_payments'))}</span><b class="amount-in">${esc(money(data.summary.payments))}</b></div>`;
    if (!data.rows.length && reset) ul.innerHTML = `<li>${empty(t('tx.none'), 'list')}</li>`;
    ul.insertAdjacentHTML('beforeend', data.rows.map((x) => `<li><button class="row tx-row ${x.status}" data-tx="${x.id}">
      <span class="tx-ic ${x.amount < 0 ? 'in' : 'out'}">${icon(x.amount < 0 ? 'wallet' : 'calendar')}</span>
      <span class="row-main"><b>${esc(fullName(x))} <small class="muted">№ ${x.member_no}</small></b><small>${esc(fmtDate(x.date))} · ${esc(txLabel(x))}${x.method ? ` · ${esc(t(`method.${x.method}`))}` : ''}${x.receipt_no ? ` · #${x.receipt_no}` : ''}</small></span>
      <span class="row-end"><b class="${x.amount < 0 ? 'amount-in' : 'amount-out'}">${x.amount < 0 ? '−' : '+'}${esc(money(Math.abs(x.amount)))}</b>
      ${x.status !== 'confirmed' ? `<span class="pill ${x.status === 'pending' ? 'pill-warn' : ''}">${esc(t(`txstatus.${x.status}`))}</span>` : ''}</span></button></li>`).join(''));
    offset += data.rows.length;
    el.querySelector('.more-wrap').innerHTML = offset < data.summary.count ? `<button class="btn btn-ghost btn-block" data-more>${esc(t('common.load_more'))}</button>` : '';
  };
  const reload = debounce(() => load(true), 250);
  el.oninput = (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    txState[k] = e.target.value;
    reload();
  };
  el.onclick = async (e) => {
    const r = e.target.closest('[data-range]');
    if (r) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const map = {
        month: [`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, todayIso()],
        year: [`${year}-01-01`, `${year}-12-31`],
        last: [`${year - 1}-01-01`, `${year - 1}-12-31`],
        all: ['', ''],
      };
      [txState.from, txState.to] = map[r.dataset.range];
      el.querySelector('[data-k=from]').value = txState.from;
      el.querySelector('[data-k=to]').value = txState.to;
      return load(true);
    }
    if (e.target.closest('[data-more]')) return load(false);
    const b = e.target.closest('[data-tx]');
    if (b) {
      const r2 = await api(`transactions/${b.dataset.tx}`);
      txDialog(r2.member, r2.transaction, () => load(true));
    }
  };
  document.querySelector('[data-export]').onclick = async () => {
    const all = await api('transactions', { query: { ...txState, limit: 2000 } });
    const sub = [txState.from || txState.to ? `${fmtDate(txState.from) || '…'} – ${fmtDate(txState.to) || '…'}` : t('range.all'),
      txState.type ? t(`tx.${txState.type}`) : '', txState.status ? t(`txstatus.${txState.status}`) : ''].filter(Boolean).join(' · ');
    shareSheet({ title: t('doc.transactions'), spec: transactionsSpec(all.rows, all.summary, sub) });
  };
  await load(true);
}
