import { t } from '../i18n.js';
import {
  api, esc, icon, money, fmtDate, fullName, can, toast, errText, formData, debounce, parseAmount, centsToInput,
  todayIso, empty, confirmDialog, state,
} from '../core.js';
import { setPage } from '../main.js';

// ---------- yearly debits ----------
export async function debits(el, _p, stale) {
  setPage(t('nav.debits'));
  if (!can('admin')) return (el.innerHTML = empty(t('err.forbidden'), 'shield'));
  const [{ types }, { runs }] = await Promise.all([api('types'), api('debits')]);
  if (stale()) return;
  const year = new Date().getFullYear();
  const doneYears = new Set(runs.map((r) => r.year));
  const defYear = doneYears.has(year) && !doneYears.has(year + 1) && new Date().getMonth() >= 9 ? year + 1 : year;

  el.innerHTML = `
  <section class="panel intro">
    <span class="eyebrow">${esc(t('debits.eyebrow'))}</span>
    <h2 class="display">${esc(t('debits.title'))}</h2>
    <p class="muted">${esc(t('debits.text'))}</p>
  </section>
  <form class="form panel" novalidate>
    <div class="grid-3">
      <label class="field"><span>${esc(t('debits.year'))}</span><input name="year" type="number" min="1990" max="2200" value="${defYear}" required></label>
      <label class="field"><span>${esc(t('tx.date'))}</span><input name="date" type="date" value="${defYear}-01-01"></label>
      <label class="field"><span>${esc(t('tx.description'))}</span><input name="description" value="${esc(t('debits.default_desc', { year: defYear }))}"></label>
    </div>
    <h3 class="sub-title">${esc(t('debits.amounts'))}</h3>
    <div class="fee-list">
      ${types.map((ty) => `<label class="fee-row"><span><b>${esc(ty.name)}</b><small class="muted">${esc(t('member.count', { n: ty.member_count }))}</small></span>
        <div class="amount-input sm"><input data-type="${ty.id}" inputmode="decimal" value="${esc(centsToInput(ty.annual_fee))}" placeholder="0,00"></div></label>`).join('')}
      <label class="fee-row"><span><b>${esc(t('debits.no_type'))}</b><small class="muted">${esc(t('debits.no_type_hint'))}</small></span>
        <div class="amount-input sm"><input data-type="none" inputmode="decimal" placeholder="0,00"></div></label>
    </div>
    <label class="switch"><input type="checkbox" name="only_joined" checked><span class="track"></span><span>${esc(t('debits.only_joined'))}<small class="muted">${esc(t('debits.only_joined_hint'))}</small></span></label>
    <div class="preview"></div>
    <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit" disabled>${icon('calendar')}<span>${esc(t('debits.run'))}</span></button></div>
  </form>
  <section class="panel">
    <div class="panel-head"><h2>${esc(t('debits.history'))}</h2></div>
    ${runs.length ? `<ul class="rows">${runs.map((r) => `<li class="row">
      <span class="tx-ic out">${icon('calendar')}</span>
      <span class="row-main"><b>${esc(r.description || t('debits.default_desc', { year: r.year }))}</b><small>${esc(t('debits.run_meta', { year: r.year, n: r.member_count, date: fmtDate(r.created_at) }))}${r.created_by_name ? ` · ${esc(r.created_by_name)}` : ''}</small></span>
      <span class="row-end"><b>${esc(money(r.total))}</b><button class="icon-btn no" data-undo="${r.id}" title="${esc(t('debits.undo'))}">${icon('trash')}</button></span></li>`).join('')}</ul>`
    : `<p class="muted pad">${esc(t('debits.none'))}</p>`}
  </section>`;

  const formEl = el.querySelector('form');
  const btn = formEl.querySelector('[type=submit]');
  const payload = () => {
    const d = formData(formEl);
    const amounts = {};
    formEl.querySelectorAll('[data-type]').forEach((i) => {
      const v = parseAmount(i.value);
      amounts[i.dataset.type] = Number.isNaN(v) ? 0 : Math.max(0, v);
    });
    return { year: +d.year, date: d.date, description: d.description, amounts, only_joined: d.only_joined };
  };
  let last;
  const preview = debounce(async () => {
    const p = payload();
    const box = el.querySelector('.preview');
    if (!p.year) return;
    try {
      last = await api('debits/preview', { method: 'POST', body: p });
      const rows = last.groups.filter((g) => g.eligible);
      box.innerHTML = `<div class="table-scroll">
        <table class="table">
          <thead><tr><th>${esc(t('member.type'))}</th><th class="r">${esc(t('debits.eligible'))}</th><th class="r">${esc(t('debits.already'))}</th><th class="r">${esc(t('debits.to_charge'))}</th><th class="r">${esc(t('debits.total'))}</th></tr></thead>
          <tbody>${rows.map((g) => `<tr><td>${esc(g.name || t('debits.no_type'))}</td><td class="r">${g.eligible}</td><td class="r">${g.already}</td><td class="r"><b>${g.to_charge}</b></td><td class="r">${esc(money(g.total))}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${esc(t('debits.no_members'))}</td></tr>`}</tbody>
          <tfoot><tr><td colspan="3">${esc(t('debits.summary'))}</td><td class="r"><b>${last.summary.members}</b></td><td class="r"><b>${esc(money(last.summary.total))}</b></td></tr></tfoot>
        </table></div>`;
      btn.disabled = !last.summary.members;
    } catch (e) {
      box.innerHTML = `<p class="alert">${esc(errText(e))}</p>`;
      btn.disabled = true;
    }
  }, 300);
  formEl.oninput = (e) => {
    if (e.target.name === 'year') {
      const y = e.target.value;
      formEl.date.value = `${y}-01-01`;
      formEl.description.value = t('debits.default_desc', { year: y });
    }
    preview();
  };
  formEl.onchange = preview;
  preview();
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    if (!last?.summary.members) return;
    const p = payload();
    if (!(await confirmDialog(t('debits.confirm', { n: last.summary.members, total: money(last.summary.total), year: p.year }), { ok: t('debits.run') }))) return;
    btn.disabled = true;
    try {
      const r = await api('debits', { method: 'POST', body: p });
      toast(t('debits.done', { n: r.members, total: money(r.total) }));
      debits(el, _p, stale);
    } catch (err) {
      toast(errText(err), 'err');
      btn.disabled = false;
    }
  };
  el.onclick = async (e) => {
    const u = e.target.closest('[data-undo]');
    if (!u) return;
    if (!(await confirmDialog(t('debits.undo_confirm'), { danger: true, ok: t('debits.undo') }))) return;
    try {
      await api(`debits/${u.dataset.undo}`, { method: 'DELETE' });
      toast(t('debits.undone'));
      debits(el, _p, stale);
    } catch (err) {
      toast(errText(err), 'err');
    }
  };
}

// ---------- initial balances ----------
export async function initial(el, _p, stale) {
  setPage(t('nav.initial'));
  if (!can('admin')) return (el.innerHTML = empty(t('err.forbidden'), 'shield'));
  const { members } = await api('initial-balances');
  if (stale()) return;
  el.innerHTML = `
  <section class="panel intro">
    <span class="eyebrow">${esc(t('initial.eyebrow'))}</span>
    <h2 class="display">${esc(t('initial.title'))}</h2>
    <p class="muted">${esc(t('initial.text'))}</p>
  </section>
  <form class="form panel" novalidate>
    <div class="grid-2">
      <label class="field"><span>${esc(t('initial.date'))}</span><input name="date" type="date" value="${todayIso()}"></label>
      <label class="field"><span>${esc(t('tx.description'))}</span><input name="description" value="${esc(t('initial.default_desc'))}"></label>
    </div>
    <div class="search">${icon('search')}<input type="search" data-filter placeholder="${esc(t('member.search'))}"></div>
    ${members.length ? `<ul class="rows initial-list">${members.map((m) => `<li class="row" data-name="${esc(`${fullName(m)} ${m.first_name} ${m.member_no}`.toLowerCase())}">
      <span class="row-main"><b>${esc(fullName(m))}</b><small>№ ${m.member_no}${m.status === 'inactive' ? ` · ${esc(t('status.inactive'))}` : ''}</small></span>
      <div class="amount-input sm"><input data-mid="${m.id}" data-orig="${m.initial ?? 0}" inputmode="decimal" value="${esc(m.initial ? centsToInput(m.initial) : '')}" placeholder="0,00"></div></li>`).join('')}</ul>` : empty(t('member.empty'), 'users')}
    <div class="sticky-actions"><span class="sel-count">${esc(t('initial.changed', { n: 0 }))}</span>
      <button class="btn btn-primary" type="submit" disabled>${icon('check')}<span>${esc(t('common.save'))}</span></button></div>
  </form>`;
  const formEl = el.querySelector('form');
  const btn = formEl.querySelector('[type=submit]');
  const changed = () => [...formEl.querySelectorAll('[data-mid]')].filter((i) => {
    const v = parseAmount(i.value);
    return !Number.isNaN(v) && v !== +i.dataset.orig;
  });
  formEl.oninput = (e) => {
    if (e.target.matches('[data-filter]')) {
      const q = e.target.value.toLowerCase().trim();
      formEl.querySelectorAll('.initial-list li').forEach((li) => (li.hidden = q && !li.dataset.name.includes(q)));
      return;
    }
    if (e.target.matches('[data-mid]')) e.target.classList.toggle('invalid', Number.isNaN(parseAmount(e.target.value)));
    const n = changed().length;
    formEl.querySelector('.sel-count').textContent = t('initial.changed', { n });
    btn.disabled = !n;
  };
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const items = changed().map((i) => ({ member_id: +i.dataset.mid, amount: parseAmount(i.value) }));
    if (!items.length) return;
    btn.disabled = true;
    try {
      await api('initial-balances', { method: 'POST', body: { items, date: formEl.date.value, description: formEl.description.value } });
      toast(t('initial.saved', { n: items.length }));
      initial(el, _p, stale);
    } catch (err) {
      toast(errText(err), 'err');
      btn.disabled = false;
    }
  };
  void state;
}
