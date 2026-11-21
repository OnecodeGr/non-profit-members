// Platform administration (/admin): create and manage tenants and their logins.
import { t, setLang, getLang, LANGS } from '../i18n.js';
import { api, esc, icon, toast, errText, formData, modal, confirmDialog, fmtDate, credit, parseAmount, loading } from '../core.js';
import { qrSvg } from '../qr.js';

function genPassword() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(r, (b) => a[b % a.length]).join('');
}

export async function adminApp(app) {
  document.title = `${t('admin.title')} · ${t('app.name')}`;
  app.innerHTML = `<div class="splash">${loading()}</div>`;
  let me;
  try {
    me = await api('admin/me');
  } catch {
    return adminLogin(app);
  }
  adminHome(app, me);
}

function adminLogin(app, error = '') {
  app.innerHTML = `
  <div class="auth">
    <div class="auth-hero" aria-hidden="true"><div class="auth-hero-inner"><span class="eyebrow">OneCode</span><h2>${esc(t('admin.hero'))}</h2><p>${esc(t('admin.hero_text'))}</p></div></div>
    <div class="auth-panel">
      <div class="auth-lang">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      <form class="auth-form">
        <div class="auth-brand"><span class="brand-mono lg">${icon('shield')}</span><span class="eyebrow">${esc(t('admin.title'))}</span><h1>${esc(t('app.name'))}</h1></div>
        <label class="field"><span>${esc(t('auth.username'))}</span><div class="input-icon">${icon('users')}<input name="username" autocomplete="username" autocapitalize="none" required></div></label>
        <label class="field"><span>${esc(t('auth.password'))}</span><div class="input-icon">${icon('shield')}<input name="password" type="password" autocomplete="current-password" required></div></label>
        ${error ? `<p class="alert">${esc(error)}</p>` : ''}
        <button class="btn btn-primary btn-lg btn-block">${esc(t('auth.login'))}</button>
      </form>
      ${credit()}
    </div>
  </div>`;
  app.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
    setLang(b.dataset.l);
    adminLogin(app);
  }));
  const f = app.querySelector('form');
  f.username.focus();
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('admin/login', { method: 'POST', body: formData(f) });
      adminApp(app);
    } catch (err) {
      adminLogin(app, errText(err));
    }
  };
}

async function adminHome(app, me) {
  app.innerHTML = `
  <div class="admin">
    <header class="admin-top">
      <div class="brand"><span class="brand-mono">${icon('shield')}</span><span class="brand-name">${esc(t('admin.title'))}</span></div>
      <div class="admin-top-actions">
        <div class="lang-switch">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
        <button class="btn btn-ghost btn-sm" data-out>${icon('logout')}<span class="hide-sm">${esc(t('auth.logout'))}</span></button>
      </div>
    </header>
    <main class="admin-main">
      <section class="hero-card">
        <div><span class="eyebrow">${esc(me.username)}</span><h2 class="display">${esc(t('admin.tenants'))}</h2><p class="muted">${esc(t('admin.tenants_text'))}</p></div>
        <div class="hero-actions"><button class="btn btn-primary" data-new>${icon('plus')}<span>${esc(t('admin.new_tenant'))}</span></button></div>
      </section>
      <div class="toolbar"><div class="search">${icon('search')}<input type="search" placeholder="${esc(t('admin.search'))}"></div></div>
      <ul class="rows tenant-list panel"><li class="loading"><span class="spinner"></span></li></ul>
    </main>
    ${credit()}
  </div>`;
  app.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
    setLang(b.dataset.l);
    adminHome(app, me);
  }));
  app.querySelector('[data-out]').onclick = async () => {
    await api('admin/logout', { method: 'POST' });
    adminLogin(app);
  };
  let tenants = [];
  const list = app.querySelector('.tenant-list');
  const draw = () => {
    const q = app.querySelector('input[type=search]').value.toLowerCase().trim();
    const shown = tenants.filter((x) => !q || `${x.name} ${x.key} ${x.email} ${x.admin_username}`.toLowerCase().includes(q));
    list.innerHTML = shown.map((x) => `<li><button class="row" data-id="${x.id}">
      <span class="tx-ic">${icon('building')}</span>
      <span class="row-main"><b>${esc(x.name)} ${x.active ? '' : `<span class="pill">${esc(t('status.inactive'))}</span>`}</b>
        <small>?soc=<b>${esc(x.key)}</b> · ${esc(x.admin_username || '—')} · ${esc(t('member.count', { n: x.member_count }))} · ${esc(fmtDate(x.created_at))}</small></span>
      ${icon('chevron')}</button></li>`).join('') || `<li class="muted pad">${esc(t('admin.no_tenants'))}</li>`;
  };
  const load = async () => {
    tenants = (await api('admin/tenants')).tenants;
    draw();
  };
  app.querySelector('input[type=search]').oninput = draw;
  app.querySelector('[data-new]').onclick = () => createTenant(load);
  list.onclick = (e) => {
    const b = e.target.closest('[data-id]');
    if (b) tenantDialog(tenants.find((x) => x.id === +b.dataset.id), load);
  };
  await load();
}

function linkBlock(link) {
  return `<div class="link-block">
    <div class="link-qr">${qrSvg(link)}</div>
    <div class="link-info"><span class="eyebrow">${esc(t('admin.tenant_link'))}</span>
      <div class="input-group"><input readonly value="${esc(link)}"><button type="button" class="btn btn-ghost" data-copy="${esc(link)}">${icon('copy')}</button></div>
      <a class="link" href="${esc(link)}" target="_blank" rel="noopener">${esc(t('admin.open_link'))} ↗</a></div>
  </div>`;
}

function bindCopy(box) {
  box.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]');
    if (!c) return;
    await navigator.clipboard.writeText(c.dataset.copy).catch(() => {});
    toast(t('share.copied'));
  });
}

async function createTenant(reload) {
  const { key } = await api('admin/suggest-key');
  const pw = genPassword();
  const result = await modal({
    title: t('admin.new_tenant'),
    wide: true,
    body: `<form class="form" onsubmit="return false">
      <div class="grid-2">
        <label class="field span-2"><span>${esc(t('settings.name'))} *</span><input name="name" required></label>
        <label class="field"><span>${esc(t('auth.tenant_key'))} *</span><input name="key" value="${esc(key)}" pattern="[a-z0-9-]{3,40}" autocapitalize="none" spellcheck="false"><small class="muted">${esc(t('admin.key_hint'))}</small></label>
        <label class="field"><span>${esc(t('settings.default_lang'))}</span><select name="default_lang">${LANGS.map((l) => `<option value="${l}">${esc(t(`lang.${l}`))}</option>`).join('')}</select></label>
        <label class="field"><span>${esc(t('admin.admin_username'))} *</span><input name="username" value="admin" autocapitalize="none" required></label>
        <label class="field"><span>${esc(t('auth.password'))} *</span><div class="input-group"><input name="password" value="${esc(pw)}" required minlength="8"><button type="button" class="btn btn-ghost" data-gen title="${esc(t('admin.generate'))}">${icon('sparkle')}</button></div></label>
        <label class="field"><span>${esc(t('member.email'))}</span><input name="email" type="email"></label>
        <label class="field"><span>${esc(t('member.phone'))}</span><input name="phone"></label>
        <label class="field"><span>${esc(t('settings.annual_fee'))}</span><input name="annual_fee" inputmode="decimal" placeholder="0,00"></label>
        <label class="field"><span>${esc(t('member.notes'))}</span><input name="notes"></label>
      </div>
      <p class="muted small">${esc(t('admin.password_note'))}</p>
    </form>`,
    onOpen: (box) => {
      box.querySelector('[data-gen]').onclick = () => (box.querySelector('[name=password]').value = genPassword());
      box.querySelector('[name=name]').focus();
    },
    actions: [
      { label: t('common.cancel'), kind: 'ghost', value: false },
      {
        label: t('admin.create'), kind: 'primary', onClick: async (box) => {
          const d = formData(box.querySelector('form'));
          const fee = parseAmount(d.annual_fee);
          d.annual_fee = Number.isNaN(fee) ? 0 : fee;
          const r = await api('admin/tenants', { method: 'POST', body: d });
          return { ...r, username: d.username, password: d.password, name: d.name };
        },
      },
    ],
  });
  if (!result) return;
  reload();
  const credsText = `${result.name}\n${t('admin.tenant_link')}: ${result.link}\n${t('auth.tenant_key')}: ${result.key}\n${t('auth.username')}: ${result.username}\n${t('auth.password')}: ${result.password}`;
  modal({
    title: t('admin.created'),
    wide: true,
    body: `<p class="lead">${esc(t('admin.created_text'))}</p>
      ${linkBlock(result.link)}
      <dl class="info-list"><div><dt>${esc(t('auth.tenant_key'))}</dt><dd><code>${esc(result.key)}</code></dd></div>
      <div><dt>${esc(t('auth.username'))}</dt><dd><code>${esc(result.username)}</code></dd></div>
      <div><dt>${esc(t('auth.password'))}</dt><dd><code>${esc(result.password)}</code></dd></div></dl>
      <button class="btn btn-ghost" data-copy="${esc(credsText)}">${icon('copy')}<span>${esc(t('admin.copy_all'))}</span></button>`,
    onOpen: bindCopy,
    actions: [{ label: t('common.done'), kind: 'primary' }],
  });
}

async function tenantDialog(x, reload) {
  const r = await modal({
    title: x.name,
    wide: true,
    body: `${linkBlock(x.link)}
    <form class="form" onsubmit="return false">
      <div class="grid-2">
        <label class="field"><span>${esc(t('settings.name'))}</span><input name="name" value="${esc(x.name)}"></label>
        <label class="field"><span>${esc(t('auth.tenant_key'))}</span><input name="key" value="${esc(x.key)}" autocapitalize="none"><small class="muted">${esc(t('admin.key_change_hint'))}</small></label>
        <label class="field"><span>${esc(t('member.email'))}</span><input name="email" value="${esc(x.email)}"></label>
        <label class="field"><span>${esc(t('member.phone'))}</span><input name="phone" value="${esc(x.phone)}"></label>
        <label class="field"><span>${esc(t('settings.default_lang'))}</span><select name="default_lang">${LANGS.map((l) => `<option value="${l}" ${x.default_lang === l ? 'selected' : ''}>${esc(t(`lang.${l}`))}</option>`).join('')}</select></label>
        <label class="field"><span>${esc(t('member.notes'))}</span><input name="notes" value="${esc(x.notes)}"></label>
      </div>
      <label class="switch"><input type="checkbox" name="active" ${x.active ? 'checked' : ''}><span class="track"></span><span>${esc(t('admin.active'))}<small class="muted">${esc(t('admin.active_hint'))}</small></span></label>
      <p class="muted small">${esc(t('admin.stats', { m: x.member_count, u: x.user_count }))}</p>
    </form>`,
    onOpen: bindCopy,
    actions: [
      { label: t('common.delete'), kind: 'danger-ghost', value: 'delete' },
      { label: t('admin.credentials'), kind: 'ghost', icon: 'key', value: 'creds' },
      {
        label: t('common.save'), kind: 'primary', onClick: async (box) => {
          await api(`admin/tenants/${x.id}`, { method: 'PUT', body: formData(box.querySelector('form')) });
          toast(t('common.saved'));
          return 'saved';
        },
      },
    ],
  });
  if (r === 'saved') reload();
  if (r === 'creds') {
    const pw = genPassword();
    const c = await modal({
      title: t('admin.credentials'),
      body: `<form class="form" onsubmit="return false">
        <p class="muted small">${esc(t('admin.credentials_hint'))}</p>
        <label class="field"><span>${esc(t('auth.username'))}</span><input name="username" value="${esc(x.admin_username || 'admin')}" autocapitalize="none"></label>
        <label class="field"><span>${esc(t('settings.new_password'))}</span><input name="password" value="${esc(pw)}" minlength="8"></label>
      </form>`,
      actions: [
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.save'), kind: 'primary', onClick: async (box) => {
            const d = formData(box.querySelector('form'));
            await api(`admin/tenants/${x.id}/credentials`, { method: 'POST', body: d });
            return d;
          },
        },
      ],
    });
    if (c) {
      const txt = `${x.name}\n${x.link}\n${t('auth.username')}: ${c.username}\n${t('auth.password')}: ${c.password}`;
      modal({ title: t('admin.credentials_saved'), body: `<pre class="creds">${esc(txt)}</pre><button class="btn btn-ghost" data-copy="${esc(txt)}">${icon('copy')}<span>${esc(t('admin.copy_all'))}</span></button>`, onOpen: bindCopy, actions: [{ label: t('common.done'), kind: 'primary' }] });
      reload();
    }
  }
  if (r === 'delete') {
    const typed = await modal({
      title: t('admin.delete_title'),
      body: `<p class="lead">${esc(t('admin.delete_text', { name: x.name, m: x.member_count }))}</p>
        <label class="field"><span>${esc(t('admin.delete_type_key', { key: x.key }))}</span><input name="confirm_key" autocapitalize="none" autocomplete="off"></label>`,
      actions: [
        { label: t('common.cancel'), kind: 'ghost', value: false },
        {
          label: t('common.delete'), kind: 'danger', onClick: async (box) => {
            await api(`admin/tenants/${x.id}`, { method: 'DELETE', body: { confirm_key: box.querySelector('[name=confirm_key]').value.trim() } });
            return true;
          },
        },
      ],
    });
    if (typed) {
      toast(t('admin.deleted'));
      reload();
    }
  }
  void confirmDialog;
}
