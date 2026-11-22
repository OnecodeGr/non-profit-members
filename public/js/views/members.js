import { t } from '../i18n.js';
import {
  api, esc, icon, money, fmtDate, fullName, can, state, go, toast, errText, formData, debounce, avatar, balanceBadge,
  confirmDialog, modal, parseAmount, centsToInput, todayIso, empty, readImage, hashQuery,
} from '../core.js';
import { setPage } from '../main.js';
import { cardHtml, cardShareSheet, shareSheet, statementSpec, receiptSpec, rosterSpec, createShareLink, txLabel } from '../print.js';

// Private self-service link for a member: create, share, regenerate, revoke.
export async function portalSheet(m) {
  let { url } = await api(`members/${m.id}/portal`);
  const render = (box) => {
    const text = t('portal.share_text', { name: m.first_name, org: state.me.tenant.name });
    const enc = encodeURIComponent(`${text}\n${url}`);
    box.querySelector('.portal-body').innerHTML = url ? `
      <label class="field"><span>${esc(t('portal.link'))}</span>
        <div class="input-group"><input readonly value="${esc(url)}"><button type="button" class="btn btn-ghost" data-copy>${icon('copy')}</button></div></label>
      <div class="share-apps">
        ${m.phone ? `<a class="chip" target="_blank" rel="noopener" href="https://wa.me/${esc(m.phone.replace(/[^\d]/g, '').replace(/^69/, '3069'))}?text=${enc}">WhatsApp</a>
        <a class="chip" href="sms:${esc(m.phone)}?&body=${enc}">SMS</a>` : `<a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${enc}">WhatsApp</a>`}
        <a class="chip" href="viber://forward?text=${enc}">Viber</a>
        <a class="chip" href="mailto:${esc(m.email || '')}?subject=${encodeURIComponent(state.me.tenant.name)}&body=${enc}">Email</a>
      </div>
      <p class="muted small">${esc(t('portal.link_hint'))}</p>
      <div class="action-bar"><button class="btn btn-ghost btn-sm" data-regen>${icon('qr')}<span>${esc(t('portal.regenerate'))}</span></button>
        <button class="btn btn-danger-ghost btn-sm" data-revoke>${icon('x')}<span>${esc(t('portal.revoke'))}</span></button></div>`
      : `<p class="lead">${esc(t('portal.none'))}</p><button class="btn btn-primary" data-create>${icon('portal')}<span>${esc(t('portal.create'))}</span></button>`;
  };
  modal({
    title: `${t('portal.title')} · ${fullName(m)}`,
    body: `<p class="muted">${esc(t('portal.explain'))}</p><div class="portal-body"></div>`,
    onOpen: (box) => {
      render(box);
      box.addEventListener('click', async (e) => {
        try {
          if (e.target.closest('[data-copy]')) {
            await navigator.clipboard.writeText(url).catch(() => {});
            toast(t('share.copied'));
          }
          if (e.target.closest('[data-create]')) ({ url } = await api(`members/${m.id}/portal`, { method: 'POST' }));
          if (e.target.closest('[data-regen]')) {
            if (!(await confirmDialog(t('portal.regen_confirm')))) return;
            ({ url } = await api(`members/${m.id}/portal`, { method: 'POST', query: { regenerate: 1 } }));
          }
          if (e.target.closest('[data-revoke]')) {
            if (!(await confirmDialog(t('portal.revoke_confirm'), { danger: true, ok: t('portal.revoke') }))) return;
            await api(`members/${m.id}/portal`, { method: 'DELETE' });
            url = null;
          }
          if (e.target.closest('[data-create],[data-regen],[data-revoke]')) render(box);
        } catch (err) {
          toast(errText(err), 'err');
        }
      });
    },
  });
}

// ---------- list ----------
const listState = { q: '', status: 'active', type: '', sort: 'name', only: '' };

export async function list(el) {
  const hq = hashQuery();
  if (hq.only) listState.only = hq.only;
  setPage(t('nav.members'), {
    actions: `${can('staff') ? `<a class="btn btn-primary btn-sm" href="#/members/new" aria-label="${esc(t('member.new'))}">${icon('plus')}<span class="hide-sm">${esc(t('member.new'))}</span></a>` : ''}
      <button class="icon-btn" data-export title="${esc(t('common.export'))}" aria-label="${esc(t('common.export'))}">${icon('download')}</button>`,
  });
  const types = state.me.types || [];
  el.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input type="search" placeholder="${esc(t('member.search'))}" value="${esc(listState.q)}" aria-label="${esc(t('member.search'))}"></div>
      <div class="chips" role="group">
        ${[['active', t('status.active')], ['inactive', t('status.inactive')], ['', t('common.all')], ['owing', t('report.only_owing')]]
          .map(([v, l]) => `<button class="chip ${(v === 'owing' ? listState.only === 'owing' : !listState.only && listState.status === v) ? 'on' : ''}" data-f="${v}">${esc(l)}</button>`).join('')}
      </div>
      <div class="toolbar-row">
        ${types.length ? `<select data-type aria-label="${esc(t('member.type'))}"><option value="">${esc(t('member.all_types'))}</option>${types.map((x) => `<option value="${x.id}" ${String(listState.type) === String(x.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
        <select data-sort aria-label="${esc(t('common.sort'))}">
          ${['name', 'no', 'recent', 'balance'].map((s) => `<option value="${s}" ${listState.sort === s ? 'selected' : ''}>${esc(t(`sort.${s}`))}</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="count muted small"></p>
    <ul class="rows members-list"></ul>
    <div class="more-wrap"></div>`;

  const ul = el.querySelector('.members-list');
  let offset = 0;
  const query = () => ({
    q: listState.q, status: listState.only ? '' : listState.status, type: listState.type, sort: listState.sort, only: listState.only,
  });
  const load = async (reset) => {
    if (reset) {
      offset = 0;
      ul.innerHTML = '<li class="loading"><span class="spinner"></span></li>';
    }
    const r = await api('members', { query: { ...query(), offset, limit: 50 } });
    if (reset) ul.innerHTML = '';
    el.querySelector('.count').textContent = t('member.count', { n: r.total });
    if (!r.members.length && reset) ul.innerHTML = `<li>${empty(listState.q ? t('member.no_results') : t('member.empty'), 'users')}</li>`;
    ul.insertAdjacentHTML('beforeend', r.members.map(memberRow).join(''));
    offset += r.members.length;
    el.querySelector('.more-wrap').innerHTML = offset < r.total ? `<button class="btn btn-ghost btn-block" data-more>${esc(t('common.load_more'))}</button>` : '';
  };
  const reload = debounce(() => load(true), 220);
  el.querySelector('input[type=search]').addEventListener('input', (e) => {
    listState.q = e.target.value;
    reload();
  });
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) {
      if (f.dataset.f === 'owing') listState.only = 'owing';
      else {
        listState.only = '';
        listState.status = f.dataset.f;
      }
      el.querySelectorAll('[data-f]').forEach((c) => c.classList.toggle('on', c === f));
      load(true);
    }
    if (e.target.closest('[data-more]')) load(false);
  });
  el.querySelector('[data-sort]').onchange = (e) => {
    listState.sort = e.target.value;
    load(true);
  };
  const ts = el.querySelector('[data-type]');
  if (ts) ts.onchange = (e) => {
    listState.type = e.target.value;
    load(true);
  };
  document.querySelector('[data-export]').onclick = async () => {
    const r = await api('members', { query: { ...query(), all: 1 } });
    shareSheet({ title: t('doc.roster'), spec: rosterSpec(r.members) });
  };
  await load(true);
}

function memberRow(m) {
  return `<li><a class="row" href="#/members/${m.id}">
    ${avatar(m)}
    <span class="row-main"><b>${esc(fullName(m))}</b>
      <small>№ ${esc(m.member_no)}${m.type_name ? ` · ${esc(m.type_name)}` : ''}${m.status === 'inactive' ? ` · <span class="pill">${esc(t('status.inactive'))}</span>` : ''}</small></span>
    <span class="row-end">${balanceBadge(m.balance)}${m.pending ? `<small class="warn">${esc(t('pay.pending_amount', { amount: money(m.pending) }))}</small>` : ''}</span>
  </a></li>`;
}

// ---------- detail ----------
export async function detail(el, { id }, stale) {
  const { member: m, transactions: txs } = await api(`members/${id}`);
  if (stale()) return;
  setPage(fullName(m), {
    back: '#/members',
    actions: can('staff') ? `<a class="icon-btn" href="#/members/${m.id}/edit" title="${esc(t('common.edit'))}" aria-label="${esc(t('common.edit'))}">${icon('edit')}</a>` : '',
  });
  const info = [
    ['phone', m.phone ? `<a href="tel:${esc(m.phone)}">${esc(m.phone)}</a>` : ''],
    ['email', m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ''],
    ['address', esc([m.address, m.postal_code, m.city].filter(Boolean).join(', '))],
    ['father_name', esc(m.father_name)],
    ['birth_date', esc(fmtDate(m.birth_date))],
    ['id_number', esc(m.id_number)],
    ['join_date', esc(fmtDate(m.join_date))],
  ].filter(([, v]) => v);
  const visible = txs.filter((x) => x.status !== 'void');
  const voided = txs.length - visible.length;

  el.innerHTML = `
  <div class="member-layout">
    <section class="member-head panel">
      <div class="member-id">
        ${avatar(m, 'xl')}
        <div>
          <span class="eyebrow">№ ${esc(m.member_no)}${m.type_name ? ` · ${esc(m.type_name)}` : ''}</span>
          <h2 class="display">${esc(m.first_name)} ${esc(m.last_name)}</h2>
          <span class="pill ${m.status === 'active' ? 'pill-ok' : ''}">${esc(t(`status.${m.status}`))}</span>
        </div>
      </div>
      <div class="balance-box ${m.balance > 0 ? 'owe' : m.balance < 0 ? 'credit' : 'zero'}">
        <span class="eyebrow">${esc(m.balance > 0 ? t('bal.owed') : m.balance < 0 ? t('bal.credit') : t('bal.balance'))}</span>
        <span class="balance-value">${esc(money(Math.abs(m.balance)))}</span>
        ${m.pending ? `<small>${esc(t('pay.pending_amount', { amount: money(m.pending) }))}</small>` : `<small>${esc(m.balance <= 0 ? t('bal.good_standing') : t('bal.outstanding_hint'))}</small>`}
      </div>
      <div class="action-bar">
        ${can('staff') ? `<a class="btn btn-primary" href="#/payments/new?member=${m.id}">${icon('wallet')}<span>${esc(t('pay.record'))}</span></a>` : ''}
        <button class="btn btn-ghost" data-card>${icon('card')}<span>${esc(t('card.title'))}</span></button>
        <button class="btn btn-ghost" data-statement>${icon('receipt')}<span>${esc(t('doc.statement'))}</span></button>
        ${can('staff') ? `<button class="btn btn-ghost" data-portal>${icon('portal')}<span>${esc(t('portal.title'))}</span></button>` : ''}
        ${can('admin') ? `<button class="btn btn-ghost" data-charge>${icon('plus')}<span>${esc(t('tx.add_charge'))}</span></button>` : ''}
      </div>
    </section>

    <section class="card-preview" data-card>${cardHtml(m)}</section>

    <section class="panel">
      <div class="panel-head"><h2>${esc(t('tx.history'))}</h2>${voided ? `<button class="link" data-show-void>${esc(t('tx.show_void', { n: voided }))}</button>` : ''}</div>
      <ul class="rows timeline">${visible.length ? txRows(visible.slice().reverse()) : `<li class="muted pad">${esc(t('tx.none'))}</li>`}</ul>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>${esc(t('member.details'))}</h2></div>
      <dl class="info-list">${info.map(([k, v]) => `<div><dt>${esc(t(`member.${k}`))}</dt><dd>${v}</dd></div>`).join('') || `<p class="muted pad">—</p>`}</dl>
      ${m.notes ? `<div class="notes"><span class="eyebrow">${esc(t('member.notes'))}</span><p>${esc(m.notes)}</p></div>` : ''}
      ${can('admin') ? `<div class="danger-zone">
        <button class="btn btn-ghost btn-sm" data-regen>${icon('qr')}<span>${esc(t('card.regen'))}</span></button>
        <button class="btn btn-danger-ghost btn-sm" data-delete>${icon('trash')}<span>${esc(t('member.delete'))}</span></button></div>` : ''}
    </section>
  </div>`;

  const refresh = () => detail(el, { id }, stale);
  el.onclick = async (e) => {
    if (e.target.closest('[data-card]')) return cardShareSheet([m]);
    if (e.target.closest('[data-statement]')) {
      return shareSheet({
        title: `${t('doc.statement')} · ${fullName(m)}`,
        text: `${t('doc.statement')} · ${state.me.tenant.name}`,
        spec: statementSpec(m, txs),
        link: () => createShareLink({ kind: 'statement', member_id: m.id }),
      });
    }
    if (e.target.closest('[data-show-void]')) {
      el.querySelector('.timeline').innerHTML = txRows(txs.slice().reverse());
      e.target.closest('[data-show-void]').remove();
      return;
    }
    if (e.target.closest('[data-charge]')) return chargeDialog(m, refresh);
    if (e.target.closest('[data-portal]')) return portalSheet(m);
    const tx = e.target.closest('[data-tx]');
    if (tx) return txDialog(m, txs.find((x) => x.id === +tx.dataset.tx), refresh);
    if (e.target.closest('[data-regen]')) {
      if (!(await confirmDialog(t('card.regen_confirm')))) return;
      await api(`members/${m.id}/regenerate-qr`, { method: 'POST' });
      toast(t('card.regen_done'));
      return refresh();
    }
    if (e.target.closest('[data-delete]')) {
      if (!(await confirmDialog(t('member.delete_confirm', { name: fullName(m) }), { danger: true, ok: t('common.delete') }))) return;
      await api(`members/${m.id}`, { method: 'DELETE' });
      toast(t('member.deleted'));
      go('/members');
    }
  };
}

export function txRows(txs) {
  return txs
    .map((x) => `<li><button class="row tx-row ${x.status}" data-tx="${x.id}">
      <span class="tx-ic ${x.amount < 0 ? 'in' : 'out'}">${icon(x.amount < 0 ? 'wallet' : x.type === 'initial' ? 'scale' : 'calendar')}</span>
      <span class="row-main"><b>${esc(txLabel(x))}</b><small>${esc(fmtDate(x.date))}${x.method ? ` · ${esc(t(`method.${x.method}`))}` : ''}${x.receipt_no ? ` · #${x.receipt_no}` : ''}${x.description ? ` · ${esc(x.description)}` : ''}</small></span>
      <span class="row-end"><b class="${x.amount < 0 ? 'amount-in' : 'amount-out'}">${x.amount < 0 ? '−' : '+'}${esc(money(Math.abs(x.amount)))}</b>
        ${x.status !== 'confirmed' ? `<span class="pill ${x.status === 'pending' ? 'pill-warn' : ''}">${esc(t(`txstatus.${x.status}`))}</span>` : ''}
        ${x.source === 'member' ? `<span class="pill">${esc(t('portal.from_member'))}</span>` : ''}</span>
    </button></li>`)
    .join('');
}

export async function txDialog(member, tx, refresh) {
  const isPay = tx.type === 'payment';
  const actions = [];
  if (isPay) actions.push({ label: t('doc.receipt'), icon: 'receipt', kind: 'ghost', value: 'receipt' });
  if (can('admin') && tx.status === 'pending') actions.push({ label: t('pay.confirm'), icon: 'check', kind: 'primary', value: 'confirm' });
  if (can('admin') && tx.status !== 'void') actions.push({ label: tx.status === 'pending' ? t('pay.reject') : t('tx.void'), icon: 'x', kind: 'danger-ghost', value: 'void' });
  const r = await modal({
    title: txLabel(tx),
    body: `<dl class="info-list">
      <div><dt>${esc(t('tx.amount'))}</dt><dd><b>${esc(money(Math.abs(tx.amount)))}</b></dd></div>
      <div><dt>${esc(t('tx.date'))}</dt><dd>${esc(fmtDate(tx.date))}</dd></div>
      <div><dt>${esc(t('tx.status'))}</dt><dd>${esc(t(`txstatus.${tx.status}`))}</dd></div>
      ${tx.method ? `<div><dt>${esc(t('tx.method'))}</dt><dd>${esc(t(`method.${tx.method}`))}</dd></div>` : ''}
      ${tx.reference ? `<div><dt>${esc(t('tx.reference'))}</dt><dd>${esc(tx.reference)}</dd></div>` : ''}
      ${tx.receipt_no ? `<div><dt>${esc(t('doc.receipt'))}</dt><dd>#${esc(tx.receipt_no)}</dd></div>` : ''}
      ${tx.description ? `<div><dt>${esc(t('tx.description'))}</dt><dd>${esc(tx.description)}</dd></div>` : ''}
      ${tx.note ? `<div><dt>${esc(t('portal.note'))}</dt><dd>${esc(tx.note)}</dd></div>` : ''}
      ${tx.source === 'member' ? `<div><dt>${esc(t('portal.source'))}</dt><dd>${esc(t('portal.from_member'))}</dd></div>` : ''}
      ${tx.proof_key ? `<div><dt>${esc(t('portal.proof'))}</dt><dd><a class="link" href="/api/transactions/${tx.id}/proof" target="_blank" rel="noopener">${icon('paperclip')} ${esc(t('portal.view_proof'))}</a></dd></div>` : ''}
    </dl>`,
    actions,
  });
  if (r === 'receipt') return receiptSheet(member, tx);
  if (r === 'confirm') {
    await api('transactions/confirm', { method: 'POST', body: { ids: [tx.id] } });
    toast(t('pay.confirmed'));
    refresh();
  }
  if (r === 'void') {
    if (!(await confirmDialog(t('tx.void_confirm'), { danger: true, ok: t('tx.void') }))) return;
    await api(`transactions/${tx.id}/void`, { method: 'POST' });
    toast(t('tx.voided'));
    refresh();
  }
}

export async function receiptSheet(member, tx) {
  const fresh = await api(`transactions/${tx.id}`);
  return shareSheet({
    title: `${t('doc.receipt')}${fresh.transaction.receipt_no ? ` #${fresh.transaction.receipt_no}` : ''}`,
    text: `${t('doc.receipt')} · ${state.me.tenant.name}`,
    spec: receiptSpec(fresh.member, fresh.transaction),
    link: () => createShareLink({ kind: 'receipt', transaction_id: tx.id }),
  });
}

async function chargeDialog(m, refresh) {
  await modal({
    title: t('tx.add_charge'),
    body: `<form class="form" onsubmit="return false">
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="type" value="charge" checked><span>${esc(t('tx.charge'))}</span></label>
        <label><input type="radio" name="type" value="credit"><span>${esc(t('tx.credit'))}</span></label>
      </div>
      <label class="field"><span>${esc(t('tx.amount'))}</span><input name="amount" inputmode="decimal" required placeholder="0,00"></label>
      <label class="field"><span>${esc(t('tx.date'))}</span><input name="date" type="date" value="${todayIso()}"></label>
      <label class="field"><span>${esc(t('tx.description'))}</span><input name="description" placeholder="${esc(t('tx.charge_placeholder'))}"></label>
    </form>`,
    actions: [
      { label: t('common.cancel'), kind: 'ghost', value: false },
      {
        label: t('common.save'), kind: 'primary', onClick: async (box) => {
          const d = formData(box.querySelector('form'));
          const amount = parseAmount(d.amount);
          if (!amount || Number.isNaN(amount)) {
            toast(t('err.invalid_amount'), 'err');
            return false;
          }
          await api('transactions', { method: 'POST', body: { ...d, amount: Math.abs(amount), member_id: m.id } });
          toast(t('common.saved'));
          refresh();
        },
      },
    ],
  });
}

// ---------- form ----------
export async function form(el, { id }, stale) {
  const editing = !!id;
  const m = editing ? (await api(`members/${id}`)).member : { status: 'active', join_date: todayIso(), membership_type_id: state.me.types[0]?.id };
  if (stale()) return;
  setPage(editing ? t('member.edit') : t('member.new'), { back: editing ? `#/members/${id}` : '#/members' });
  const types = state.me.types || [];
  const f = (name, label, attrs = '', val = m[name]) =>
    `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(val ?? '')}" ${attrs}></label>`;
  el.innerHTML = `
  <form class="form panel form-member" novalidate>
    <div class="photo-pick">
      <label class="photo-btn">${m.photo ? `<img src="${esc(m.photo)}" alt="">` : icon('camera')}
        <input type="file" accept="image/*" capture="user" hidden></label>
      <div><b>${esc(t('member.photo'))}</b><small class="muted">${esc(t('member.photo_hint'))}</small>
        ${m.photo ? `<button type="button" class="link" data-rm-photo>${esc(t('common.remove'))}</button>` : ''}</div>
    </div>
    <div class="grid-2">
      ${f('first_name', t('member.first_name') + ' *', 'required autocomplete="given-name"')}
      ${f('last_name', t('member.last_name') + ' *', 'required autocomplete="family-name"')}
      ${f('father_name', t('member.father_name'))}
      ${f('member_no', t('member.no'), `inputmode="numeric" placeholder="${esc(t('member.auto'))}"`)}
      ${f('phone', t('member.phone'), 'type="tel" autocomplete="tel"')}
      ${f('email', t('member.email'), 'type="email" autocomplete="email"')}
      ${f('address', t('member.address'), 'autocomplete="street-address"')}
      ${f('city', t('member.city'))}
      ${f('postal_code', t('member.postal_code'), 'inputmode="numeric"')}
      ${f('id_number', t('member.id_number'))}
      ${f('birth_date', t('member.birth_date'), 'type="date"')}
      ${f('join_date', t('member.join_date'), 'type="date"')}
      <label class="field"><span>${esc(t('member.type'))}</span><select name="membership_type_id"><option value="">—</option>
        ${types.map((x) => `<option value="${x.id}" ${String(m.membership_type_id) === String(x.id) ? 'selected' : ''}>${esc(x.name)}${x.annual_fee ? ` (${esc(money(x.annual_fee))})` : ''}</option>`).join('')}</select></label>
      <label class="field"><span>${esc(t('member.status'))}</span><select name="status">
        ${['active', 'inactive'].map((s) => `<option value="${s}" ${m.status === s ? 'selected' : ''}>${esc(t(`status.${s}`))}</option>`).join('')}</select></label>
      ${editing ? '' : `${f('initial_balance', t('initial.amount'), `inputmode="decimal" placeholder="0,00"`, '')}`}
    </div>
    ${editing ? '' : `<p class="muted small">${esc(t('initial.form_hint'))}</p>`}
    <label class="field"><span>${esc(t('member.notes'))}</span><textarea name="notes" rows="3">${esc(m.notes || '')}</textarea></label>
    <div class="form-actions">
      <a class="btn btn-ghost" href="${editing ? `#/members/${id}` : '#/members'}">${esc(t('common.cancel'))}</a>
      <button class="btn btn-primary" type="submit">${icon('check')}<span>${esc(t('common.save'))}</span></button>
    </div>
  </form>`;
  let photo;
  const formEl = el.querySelector('form');
  formEl.querySelector('input[type=file]').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photo = await readImage(file, 360);
    formEl.querySelector('.photo-btn').innerHTML = `<img src="${photo}" alt=""><input type="file" accept="image/*" capture="user" hidden>`;
  };
  const rm = formEl.querySelector('[data-rm-photo]');
  if (rm) rm.onclick = () => {
    photo = '';
    formEl.querySelector('.photo-btn img')?.remove();
    rm.remove();
  };
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(formEl);
    if (!d.first_name.trim() || !d.last_name.trim()) return toast(t('err.name_required'), 'err');
    if (photo !== undefined) d.photo = photo;
    if (!editing) {
      const ib = parseAmount(d.initial_balance);
      if (Number.isNaN(ib)) return toast(t('err.invalid_amount'), 'err');
      d.initial_balance = ib;
    } else delete d.initial_balance;
    if (!d.member_no) delete d.member_no;
    const btn = formEl.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const r = await api(editing ? `members/${id}` : 'members', { method: editing ? 'PUT' : 'POST', body: d });
      toast(t('common.saved'));
      go(`/members/${r.member.id}`);
    } catch (err) {
      toast(errText(err), 'err');
      btn.disabled = false;
    }
  };
}

export { centsToInput };
