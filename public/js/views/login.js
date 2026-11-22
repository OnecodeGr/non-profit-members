// Tenant login. With ?soc=<key> the organisation is fixed; otherwise the key is asked for.
import { t, setLang, getLang, LANGS } from '../i18n.js';
import { api, esc, icon, errText, formData, credit } from '../core.js';

function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {
    return null;
  }
  return null;
}

export async function login(app, done) {
  const params = new URLSearchParams(location.search);
  const soc = (params.get('soc') || '').trim().toLowerCase();
  let tenant = null;
  let demo = null; // demo organisations publish their sign-in so visitors can try the service
  if (soc) {
    try {
      const info = await api('public/tenant', { query: { soc } });
      tenant = info.tenant;
      demo = info.demo;
      if (!store('lang')) setLang(tenant.default_lang || 'el', false);
    } catch {
      tenant = null;
    }
  }
  const lastKey = store('last_tenant') || '';

  const draw = (error = '') => {
    app.innerHTML = `
    <div class="auth">
      <div class="auth-hero" aria-hidden="true">
        <div class="auth-hero-inner">
          <span class="eyebrow">${esc(t('auth.eyebrow'))}</span>
          <h2>${esc(t('auth.hero_title'))}</h2>
          <p>${esc(t('auth.hero_text'))}</p>
        </div>
      </div>
      <main class="auth-panel">
        <div class="auth-lang">${LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}</div>
        <form class="auth-form" novalidate>
          <div class="auth-brand">
            ${tenant?.logo ? `<img src="${esc(tenant.logo)}" alt="">` : `<span class="brand-mono lg">${esc(tenant ? tenant.name.slice(0, 1) : 'M')}</span>`}
            <span class="eyebrow">${esc(tenant ? t('auth.welcome_to') : t('auth.members_area'))}</span>
            <h1>${esc(tenant ? tenant.name : t('app.name'))}</h1>
            ${soc && !tenant ? `<p class="alert">${esc(t('err.tenant_not_found'))}</p>` : ''}
          </div>
          ${tenant ? `<input type="hidden" name="tenant_key" value="${esc(tenant.key)}">` : `
          <label class="field"><span>${esc(t('auth.tenant_key'))}</span>
            <div class="input-icon">${icon('key')}<input name="tenant_key" autocomplete="organization" autocapitalize="none" spellcheck="false" required value="${esc(soc || lastKey)}"></div></label>`}
          <label class="field"><span>${esc(t('auth.username'))}</span>
            <div class="input-icon">${icon('users')}<input name="username" autocomplete="${demo ? 'off' : 'username'}" autocapitalize="none" spellcheck="false" required value="${esc(demo?.username || '')}"></div></label>
          <label class="field"><span>${esc(t('auth.password'))}</span>
            <div class="input-icon">${icon('shield')}<input name="password" type="password" autocomplete="${demo ? 'off' : 'current-password'}" required value="${esc(demo?.password || '')}">
            <button type="button" class="icon-btn reveal" aria-label="${esc(t('auth.show_password'))}">${icon('eye')}</button></div></label>
          ${demo ? `<p class="note">${icon('sparkle')} ${esc(t('auth.demo_note'))}</p>` : ''}
          ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ''}
          <button class="btn btn-primary btn-lg btn-block" type="submit"><span>${esc(t('auth.login'))}</span></button>
        </form>
        ${credit()}
      </main>
    </div>`;
    app.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => {
      setLang(b.dataset.l);
      draw();
    }));
    app.querySelector('.reveal').onclick = () => {
      const p = app.querySelector('[name=password]');
      p.type = p.type === 'password' ? 'text' : 'password';
    };
    const form = app.querySelector('form');
    if (demo) form.querySelector('[type=submit]').focus();
    else (form.querySelector('[name=tenant_key]:not([type=hidden])') && !form.tenant_key.value ? form.tenant_key : form.username).focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const d = formData(form);
      if (!d.tenant_key || !d.username || !d.password) return draw(t('auth.fill_all'));
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      btn.classList.add('busy');
      try {
        await api('login', { method: 'POST', body: d });
        store('last_tenant', d.tenant_key.toLowerCase());
        done();
      } catch (err) {
        draw(errText(err));
        const f = app.querySelector('form');
        if (f.tenant_key && f.tenant_key.type !== 'hidden') f.tenant_key.value = d.tenant_key;
        f.username.value = d.username;
        f.password.focus();
      }
    };
  };
  draw();
}
