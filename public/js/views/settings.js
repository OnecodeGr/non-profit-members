import { t, LANGS, getLang } from '../i18n.js';
import {
  api, esc, icon, money, fmtDateTime, fmtDate, can, state, toast, errText, formData, parseAmount, centsToInput, confirmDialog,
  modal, readImage, credit, debounce,
} from '../core.js';
import { setPage } from '../main.js';
import { cardHtml, shareSheet } from '../print.js';
import { zipFiles, docCsv } from '../export.js';

export async function more(el) {
  setPage(t('nav.more'));
  const items = [
    ['/transactions', 'list', 'nav.transactions', 'tx.hint'],
    ['/reports', 'chart', 'nav.reports', 'reports.hint'],
    ['/cards', 'card', 'nav.cards', 'card.batch_hint'],
    ...(can('admin') ? [
      ['/debits', 'calendar', 'nav.debits', 'debits.hint'],
      ['/initial', 'scale', 'nav.initial', 'initial.hint'],
      ['/import', 'upload', 'nav.import', 'import.hint'],
    ] : []),
    ['/settings', 'settings', 'nav.settings', 'settings.hint'],
  ];
  el.innerHTML = `
  <ul class="rows menu-list panel">${items.map(([p, i, k, h]) => `<li><a class="row" href="#${p}"><span class="tx-ic">${icon(i)}</span><span class="row-main"><b>${esc(t(k))}</b><small>${esc(t(h))}</small></span>${icon('chevron')}</a></li>`).join('')}</ul>
  <section class="panel pad">
    <span class="eyebrow">${esc(t('common.language'))}</span>
    <div class="lang-switch big">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-lang="${l}">${esc(t(`lang.${l}`))}</button>`).join('')}</div>
  </section>
  <button class="row panel suggest-row" data-suggest><span class="tx-ic">${icon('mail')}</span><span class="row-main"><b>${esc(t('suggest.button'))}</b><small>${esc(t('suggest.text'))}</small></span>${icon('chevron')}</button>
  <section class="panel pad user-box">
    <div><b>${esc(state.me.user.full_name || state.me.user.username)}</b><small class="muted">${esc(state.me.user.username)} · ${esc(t(`role.${state.me.user.role}`))}</small></div>
    <button class="btn btn-ghost" data-logout>${icon('logout')}<span>${esc(t('auth.logout'))}</span></button>
  </section>`;
}

export async function settings(el, _p, stale) {
  setPage(t('nav.settings'));
  const tabs = [
    ...(can('admin') ? [['org', t('settings.org')], ['types', t('settings.types')], ['users', t('settings.users')], ['audit', t('audit.tab')]] : []),
    ['account', t('settings.account')],
  ];
  let saved = null;
  try { saved = sessionStorage.getItem('settings_tab'); } catch { /* ignore */ }
  const active = tabs.some(([k]) => k === saved) ? saved : tabs[0][0];
  el.innerHTML = `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${k === active ? 'on' : ''}" data-tab="${k}">${esc(l)}</button>`).join('')}</div><div class="tab-body"></div>`;
  const show = async (k) => {
    try { sessionStorage.setItem('settings_tab', k); } catch { /* ignore */ }
    el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
    const fresh = document.createElement('div');
    fresh.className = 'tab-body';
    fresh.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    el.querySelector('.tab-body').replaceWith(fresh);
    await { org, types, users, account, audit: auditTab }[k](fresh);
  };
  el.querySelector('.tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) show(b.dataset.tab);
  };
  await show(active);
  void stale;
}

// ---------- organisation ----------
async function org(el) {
  const tn = state.me.tenant;
  let logo = tn.logo;
  el.innerHTML = `
  ${subscriptionPanel()}
  <form class="form panel" novalidate>
    <div class="grid-2">
      <label class="field span-2"><span>${esc(t('settings.name'))}</span><input name="name" value="${esc(tn.name)}" required></label>
      <label class="field"><span>${esc(t('member.address'))}</span><input name="address" value="${esc(tn.address)}"></label>
      <label class="field"><span>${esc(t('member.phone'))}</span><input name="phone" value="${esc(tn.phone)}"></label>
      <label class="field"><span>${esc(t('member.email'))}</span><input name="email" type="email" value="${esc(tn.email)}"></label>
      <label class="field"><span>${esc(t('settings.website'))}</span><input name="website" value="${esc(tn.website)}"></label>
      <label class="field"><span>${esc(t('settings.tax_id'))}</span><input name="tax_id" value="${esc(tn.tax_id)}"></label>
      <label class="field"><span>${esc(t('settings.currency'))}</span><select name="currency">${['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'].map((c) => `<option ${tn.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>${esc(t('settings.default_lang'))}</span><select name="default_lang">${LANGS.map((l) => `<option value="${l}" ${tn.default_lang === l ? 'selected' : ''}>${esc(t(`lang.${l}`))}</option>`).join('')}</select></label>
      <label class="field"><span>${esc(t('settings.color'))}</span><input name="color" type="color" value="${esc(tn.color || '#b08d57')}"></label>
      <label class="field span-2"><span>${esc(t('settings.card_note'))}</span><input name="card_note" value="${esc(tn.card_note)}" maxlength="60" placeholder="${esc(t('settings.card_note_placeholder'))}"></label>
    </div>
    <h4 class="sub-title">${esc(t('settings.bank_title'))}</h4>
    <p class="muted small">${esc(t('settings.bank_hint'))}</p>
    <div class="grid-2">
      <label class="field span-2"><span>IBAN</span><input name="bank_iban" value="${esc(tn.bank_iban || '')}" autocapitalize="characters" placeholder="GR00 0000 0000 0000 0000 0000 000"></label>
      <label class="field"><span>${esc(t('portal.bank'))}</span><input name="bank_name" value="${esc(tn.bank_name || '')}"></label>
      <label class="field"><span>${esc(t('portal.beneficiary'))}</span><input name="bank_beneficiary" value="${esc(tn.bank_beneficiary || '')}"></label>
    </div>
    <div class="photo-pick">
      <label class="photo-btn logo">${logo ? `<img src="${esc(logo)}" alt="">` : icon('image')}<input type="file" accept="image/*" hidden></label>
      <div><b>${esc(t('settings.logo'))}</b><small class="muted">${esc(t('settings.logo_hint'))}</small>${logo ? `<button type="button" class="link" data-rm>${esc(t('common.remove'))}</button>` : ''}</div>
    </div>
    <div class="card-preview small"></div>
    <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')}<span>${esc(t('common.save'))}</span></button></div>
  </form>`;
  const formEl = el.querySelector('form');
  const sample = { first_name: 'Ελένη', last_name: 'Αλεξίου', member_no: 128, type_name: state.me.types[0]?.name, join_date: '2019-05-01', qr_token: 'preview-sample-token' };
  const preview = () => {
    const d = formData(formEl);
    el.querySelector('.card-preview').innerHTML = cardHtml(sample, { ...tn, ...d, logo });
  };
  preview();
  formEl.oninput = preview;
  formEl.querySelector('input[type=file]').onchange = async (e) => {
    if (!e.target.files[0]) return;
    logo = await readImage(e.target.files[0], 400, 'image/png');
    formEl.querySelector('.photo-btn').innerHTML = `<img src="${logo}" alt=""><input type="file" accept="image/*" hidden>`;
    preview();
  };
  formEl.onclick = (e) => {
    if (e.target.closest('[data-rm]')) {
      logo = '';
      formEl.querySelector('.photo-btn img')?.remove();
      e.target.remove();
      preview();
    }
  };
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('settings', { method: 'PUT', body: { ...formData(formEl), logo } });
      state.me = await api('me');
      toast(t('common.saved'));
      location.reload();
    } catch (err) {
      toast(errText(err), 'err');
    }
  };
}

// ---------- membership types ----------
async function types(el) {
  const { types: list } = await api('types');
  el.innerHTML = `
  <section class="panel">
    <div class="panel-head"><h3>${esc(t('settings.types'))}</h3><button class="btn btn-primary btn-sm" data-add>${icon('plus')}<span>${esc(t('common.add'))}</span></button></div>
    <p class="muted small pad-x">${esc(t('settings.types_hint'))}</p>
    <ul class="rows">${list.map((x) => `<li><button class="row" data-edit="${x.id}"><span class="tx-ic">${icon('card')}</span>
      <span class="row-main"><b>${esc(x.name)}</b><small>${esc(t('member.count', { n: x.member_count }))}</small></span>
      <span class="row-end"><b>${esc(money(x.annual_fee))}</b><small class="muted">${esc(t('settings.per_year'))}</small></span></button></li>`).join('')}</ul>
  </section>`;
  const edit = async (x) => {
    const r = await modal({
      title: x ? t('settings.edit_type') : t('settings.new_type'),
      body: `<form class="form" onsubmit="return false">
        <label class="field"><span>${esc(t('settings.type_name'))}</span><input name="name" value="${esc(x?.name || '')}" required></label>
        <label class="field"><span>${esc(t('settings.annual_fee'))}</span><input name="annual_fee" inputmode="decimal" value="${esc(centsToInput(x?.annual_fee || 0))}" placeholder="0,00"></label>
      </form>`,
      actions: [
        ...(x ? [{ label: t('common.delete'), kind: 'danger-ghost', value: 'delete' }] : []),
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.save'), kind: 'primary', onClick: async (box) => {
            const d = formData(box.querySelector('form'));
            const fee = parseAmount(d.annual_fee);
            if (!d.name.trim() || Number.isNaN(fee)) {
              toast(t('err.invalid_input'), 'err');
              return false;
            }
            await api(x ? `types/${x.id}` : 'types', { method: x ? 'PUT' : 'POST', body: { name: d.name, annual_fee: fee } });
            return 'saved';
          },
        },
      ],
    });
    if (r === 'delete') {
      if (!(await confirmDialog(t('settings.delete_type_confirm'), { danger: true, ok: t('common.delete') }))) return;
      await api(`types/${x.id}`, { method: 'DELETE' });
    }
    if (r) {
      state.me.types = (await api('me')).types;
      toast(t('common.saved'));
      types(el);
    }
  };
  el.onclick = (e) => {
    if (e.target.closest('[data-add]')) edit(null);
    const b = e.target.closest('[data-edit]');
    if (b) edit(list.find((x) => x.id === +b.dataset.edit));
  };
}

// ---------- users ----------
async function users(el) {
  const { users: list } = await api('users');
  el.innerHTML = `
  <section class="panel">
    <div class="panel-head"><h3>${esc(t('settings.users'))}</h3><button class="btn btn-primary btn-sm" data-add>${icon('plus')}<span>${esc(t('common.add'))}</span></button></div>
    <p class="muted small pad-x">${esc(t('settings.roles_hint'))}</p>
    <ul class="rows">${list.map((u) => `<li><button class="row" data-edit="${u.id}"><span class="avatar">${esc((u.full_name || u.username).slice(0, 1).toUpperCase())}</span>
      <span class="row-main"><b>${esc(u.full_name || u.username)}</b><small>${esc(u.username)} · ${esc(t(`role.${u.role}`))}${u.last_login ? ` · ${esc(fmtDateTime(u.last_login))}` : ''}</small></span>
      <span class="row-end">${u.active ? '' : `<span class="pill">${esc(t('status.inactive'))}</span>`}</span></button></li>`).join('')}</ul>
  </section>`;
  const edit = async (u) => {
    const self = u && u.id === state.me.user.id;
    const r = await modal({
      title: u ? u.username : t('settings.new_user'),
      body: `<form class="form" onsubmit="return false">
        ${u ? '' : `<label class="field"><span>${esc(t('auth.username'))}</span><input name="username" autocapitalize="none" required></label>`}
        <label class="field"><span>${esc(t('settings.full_name'))}</span><input name="full_name" value="${esc(u?.full_name || '')}"></label>
        <label class="field"><span>${esc(t('settings.role'))}</span><select name="role" ${self ? 'disabled' : ''}>${['admin', 'staff', 'viewer'].map((r2) => `<option value="${r2}" ${(u?.role || 'staff') === r2 ? 'selected' : ''}>${esc(t(`role.${r2}`))}</option>`).join('')}</select></label>
        <label class="field"><span>${esc(u ? t('settings.new_password') : t('auth.password'))}</span><input name="password" type="password" autocomplete="new-password" minlength="8" ${u ? `placeholder="${esc(t('settings.keep_password'))}"` : 'required'}></label>
        ${u && !self ? `<label class="switch"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}><span class="track"></span><span>${esc(t('status.active'))}</span></label>` : ''}
      </form>`,
      actions: [
        ...(u && !self ? [{ label: t('common.delete'), kind: 'danger-ghost', value: 'delete' }] : []),
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.save'), kind: 'primary', onClick: async (box) => {
            const d = formData(box.querySelector('form'));
            if (!d.password) delete d.password;
            await api(u ? `users/${u.id}` : 'users', { method: u ? 'PUT' : 'POST', body: d });
            return 'saved';
          },
        },
      ],
    });
    if (r === 'delete') {
      if (!(await confirmDialog(t('settings.delete_user_confirm', { name: u.username }), { danger: true, ok: t('common.delete') }))) return;
      await api(`users/${u.id}`, { method: 'DELETE' });
    }
    if (r) {
      toast(t('common.saved'));
      users(el);
    }
  };
  el.onclick = (e) => {
    if (e.target.closest('[data-add]')) edit(null);
    const b = e.target.closest('[data-edit]');
    if (b) edit(list.find((x) => x.id === +b.dataset.edit));
  };
}

// ---------- my account ----------
async function account(el) {
  el.innerHTML = `
  <form class="form panel" novalidate>
    <h3>${esc(t('settings.change_password'))}</h3>
    <label class="field"><span>${esc(t('settings.current_password'))}</span><input name="current" type="password" autocomplete="current-password" required></label>
    <label class="field"><span>${esc(t('settings.new_password'))}</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
    <label class="field"><span>${esc(t('settings.repeat_password'))}</span><input name="password2" type="password" autocomplete="new-password" required></label>
    <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')}<span>${esc(t('common.save'))}</span></button></div>
  </form>
  <section class="panel pad">
    <span class="eyebrow">${esc(t('settings.login_link'))}</span>
    <p class="muted small">${esc(t('settings.login_link_hint'))}</p>
    <div class="input-group"><input readonly value="${esc(`${state.me.public_url}/?soc=${state.me.tenant.key}`)}"><button class="btn btn-ghost" data-copy>${icon('copy')}</button></div>
  </section>
  ${credit()}`;
  el.querySelector('[data-copy]').onclick = async () => {
    await navigator.clipboard.writeText(el.querySelector('.input-group input').value).catch(() => {});
    toast(t('share.copied'));
  };
  const formEl = el.querySelector('form');
  formEl.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(formEl);
    if (d.password !== d.password2) return toast(t('err.passwords_differ'), 'err');
    try {
      await api('me/password', { method: 'POST', body: d });
      toast(t('settings.password_changed'));
      formEl.reset();
    } catch (err) {
      toast(errText(err), 'err');
    }
  };
}


// ---------- subscription status ----------
export function subscriptionPanel() {
  const s = state.me.subscription;
  if (!s || (s.status === 'none' && !s.member_limit)) return '';
  const cls = { ok: 'ok', expiring: 'warn', grace: 'bad', expired: 'bad', none: 'ok' }[s.status];
  const pct = s.member_limit ? Math.min(100, Math.round((s.member_count / s.member_limit) * 100)) : 0;
  return `<section class="panel sub-panel ${cls}">
    <div class="sub-col"><span class="eyebrow">${esc(t('sub.title'))}</span>
      <b>${s.paid_until ? esc(t('sub.until', { date: fmtDate(s.paid_until) })) : esc(t('sub.no_expiry'))}</b>
      <small class="muted">${esc(t(`sub.status_${s.status}`, { days: Math.abs(s.days_left ?? 0), grace: s.grace_days }))}</small></div>
    ${s.member_limit ? `<div class="sub-col"><span class="eyebrow">${esc(t('sub.members'))}</span><b>${s.member_count} / ${s.member_limit}</b>
      <span class="meter ${s.near_limit ? 'hot' : ''}"><span style="width:${pct}%"></span></span></div>` : ''}
    <button class="btn btn-ghost btn-sm" data-suggest>${icon('mail')}<span>${esc(t('sub.contact'))}</span></button>
  </section>`;
}

// ---------- audit log + data export ----------
const auditState = { q: '', actor: '', action: '', from: '', to: '' };
const ACTION_GROUPS = ['member', 'payment', 'charge', 'credit', 'transaction', 'debits', 'initial', 'event', 'portal', 'user', 'type', 'settings', 'tenant', 'subscription', 'data'];

function auditSpec(rows) {
  return {
    title: t('audit.title'),
    subtitle: [fmtDateTime(new Date().toISOString())],
    columns: [
      { label: t('audit.when'), w: 1.1 }, { label: t('audit.who'), w: 1 }, { label: t('audit.action'), w: 1.3 },
      { label: t('audit.summary'), w: 2.2 }, { label: 'IP', w: 0.9 },
    ],
    rows: rows.map((r) => [fmtDateTime(r.created_at), r.actor, actionLabel(r.action), [r.summary, r.details && r.details !== '{}' ? r.details : ''].filter(Boolean).join(' · '), r.ip]),
    filename: `audit_${new Date().toISOString().slice(0, 10)}`,
  };
}

function actionLabel(a) {
  const k = `audit.a.${a}`;
  const v = t(k);
  return v === k ? a : v;
}

async function auditTab(el) {
  el.innerHTML = `
  <section class="panel pad export-box">
    <div><b>${esc(t('export.title'))}</b><p class="muted small">${esc(t('export.text'))}</p></div>
    <button class="btn btn-primary" data-export-all>${icon('download')}<span>${esc(t('export.button'))}</span></button>
  </section>
  <div class="toolbar">
    <div class="search">${icon('search')}<input type="search" data-k="q" placeholder="${esc(t('audit.search'))}" value="${esc(auditState.q)}"></div>
    <div class="toolbar-row">
      <select data-k="action"><option value="">${esc(t('audit.all_actions'))}</option>${ACTION_GROUPS.map((g) => `<option value="${g}." ${auditState.action === `${g}.` ? 'selected' : ''}>${esc(t(`audit.g.${g}`))}</option>`).join('')}</select>
      <select data-k="actor"><option value="">${esc(t('audit.all_users'))}</option></select>
      <input type="date" data-k="from" value="${esc(auditState.from)}" aria-label="${esc(t('range.from'))}">
      <input type="date" data-k="to" value="${esc(auditState.to)}" aria-label="${esc(t('range.to'))}">
    </div>
  </div>
  <section class="panel"><div class="panel-head"><h3>${esc(t('audit.title'))} <span class="pill" data-total>…</span></h3>
    <button class="btn btn-ghost btn-sm" data-export-log>${icon('share')}<span>${esc(t('common.export'))}</span></button></div>
    <ul class="rows audit-list"></ul><div class="more-wrap pad"></div></section>`;
  let offset = 0;
  let actorsLoaded = false;
  const ul = el.querySelector('.audit-list');
  const load = async (reset) => {
    if (reset) {
      offset = 0;
      ul.innerHTML = '<li class="loading"><span class="spinner"></span></li>';
    }
    const r = await api('audit', { query: { ...auditState, offset, limit: 100 } });
    if (reset) ul.innerHTML = '';
    if (!actorsLoaded) {
      el.querySelector('[data-k=actor]').insertAdjacentHTML('beforeend', r.actors.map((a) => `<option ${auditState.actor === a ? 'selected' : ''}>${esc(a)}</option>`).join(''));
      actorsLoaded = true;
    }
    el.querySelector('[data-total]').textContent = r.total;
    ul.insertAdjacentHTML('beforeend', r.rows.map((x) => {
      let det = '';
      try {
        const d = x.details ? JSON.parse(x.details) : null;
        if (d && Object.keys(d).length) det = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) && v.length === 2 ? `${v[0] ?? '—'} → ${v[1] ?? '—'}` : typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
      } catch { /* ignore */ }
      return `<li class="row audit-row"><span class="tx-ic">${icon(x.actor.startsWith('member:') ? 'portal' : x.actor.startsWith('platform:') ? 'shield' : 'history')}</span>
        <span class="row-main"><b>${esc(actionLabel(x.action))}${x.summary ? ` <span class="muted">· ${esc(x.summary)}</span>` : ''}</b>
        <small>${esc(fmtDateTime(x.created_at))} · ${esc(x.actor)}${x.ip ? ` · ${esc(x.ip)}` : ''}</small>${det ? `<small class="audit-det">${esc(det)}</small>` : ''}</span></li>`;
    }).join('') || (reset ? `<li class="muted pad">${esc(t('audit.empty'))}</li>` : ''));
    offset += r.rows.length;
    el.querySelector('.more-wrap').innerHTML = offset < r.total ? `<button class="btn btn-ghost btn-block" data-more>${esc(t('common.load_more'))}</button>` : '';
  };
  const reload = debounce(() => load(true), 250);
  el.oninput = (e) => {
    const k = e.target.dataset.k;
    if (k) {
      auditState[k] = e.target.value;
      reload();
    }
  };
  el.onclick = async (e) => {
    if (e.target.closest('[data-more]')) load(false);
    if (e.target.closest('[data-export-log]')) {
      const r = await api('audit', { query: { ...auditState, limit: 5000 } });
      shareSheet({ title: t('audit.title'), spec: auditSpec(r.rows) });
    }
    const b = e.target.closest('[data-export-all]');
    if (b) {
      b.classList.add('busy');
      try {
        await exportAll();
      } catch (err) {
        toast(errText(err), 'err');
      } finally {
        b.classList.remove('busy');
      }
    }
  };
  await load(true);
}

// Full organisation backup: data.json + one CSV per table, zipped.
async function exportAll() {
  const data = await api('export');
  const files = [['data.json', JSON.stringify(data, null, 2)], ['README.txt', `${state.me.tenant.name}\nMembers · OneCode export ${data.exported_at}\nAmounts are in cents.\n`]];
  for (const [k, v] of Object.entries(data)) {
    if (!Array.isArray(v) || !v.length) continue;
    const cols = Object.keys(v[0]).filter((c) => !['photo', 'password_hash'].includes(c));
    const spec = { columns: cols.map((c) => ({ label: c })), rows: v.map((r) => cols.map((c) => r[c] ?? '')) };
    files.push([`${k}.csv`, new Uint8Array(await docCsv(spec).arrayBuffer())]);
  }
  const blob = zipFiles(files, 'application/zip');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.me.tenant.key}_export_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('export.done'));
}
