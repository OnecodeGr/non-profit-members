import { t, LANGS, getLang } from '../i18n.js';
import {
  api, esc, icon, money, fmtDateTime, can, state, toast, errText, formData, parseAmount, centsToInput, confirmDialog,
  modal, readImage, credit,
} from '../core.js';
import { setPage } from '../main.js';
import { cardHtml } from '../print.js';

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
    ...(can('admin') ? [['org', t('settings.org')], ['types', t('settings.types')], ['users', t('settings.users')]] : []),
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
    await { org, types, users, account }[k](fresh);
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
