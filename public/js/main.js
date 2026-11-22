// App bootstrap: decides between platform admin, public pages, login and the tenant app.
import { t, setLang, getLang, LANGS, initLang } from './i18n.js';
import { api, state, route, resolveRoute, go, icon, esc, can, credit, loading, toast, errText, modal, $ } from './core.js';

let contactCfg;
export async function suggestSheet() {
  if (!contactCfg) contactCfg = await api('public/config').catch(() => ({ email: 'sales@onecode.gr' }));
  const text = encodeURIComponent(t('suggest.message', { org: state.me?.tenant?.name || '' }));
  const links = [];
  if (contactCfg.whatsapp) links.push(['WhatsApp', `https://wa.me/${contactCfg.whatsapp}?text=${text}`]);
  if (contactCfg.viber) links.push(['Viber', `viber://chat?number=${encodeURIComponent(contactCfg.viber)}`]);
  if (contactCfg.telegram) links.push(['Telegram', `https://t.me/${contactCfg.telegram}`]);
  links.push(['Email', `mailto:${contactCfg.email || 'sales@onecode.gr'}?subject=${encodeURIComponent('Members — ' + t('suggest.title'))}&body=${text}`]);
  modal({
    title: t('suggest.title'),
    body: `<p class="muted">${esc(t('suggest.text'))}</p><div class="channel-list">${links.map(([n, h]) => `<a class="channel" href="${esc(h)}" target="_blank" rel="noopener">${esc(n)}<span>→</span></a>`).join('')}</div>`,
  });
}

const app = document.getElementById('app');


// ---------- shell ----------
const NAV = [
  { path: '/', icon: 'home', key: 'nav.home', tab: true },
  { path: '/members', icon: 'users', key: 'nav.members', tab: true },
  { path: '/scan', icon: 'scan', key: 'nav.scan', tab: true, center: true },
  { path: '/payments', icon: 'wallet', key: 'nav.payments', tab: true },
  { path: '/events', icon: 'ticket', key: 'nav.events' },
  { path: '/transactions', icon: 'list', key: 'nav.transactions' },
  { path: '/reports', icon: 'chart', key: 'nav.reports' },
  { path: '/debits', icon: 'calendar', key: 'nav.debits', role: 'admin' },
  { path: '/initial', icon: 'scale', key: 'nav.initial', role: 'admin' },
  { path: '/import', icon: 'upload', key: 'nav.import', role: 'admin' },
  { path: '/cards', icon: 'card', key: 'nav.cards' },
  { path: '/settings', icon: 'settings', key: 'nav.settings' },
];

function langSwitch() {
  return `<div class="lang-switch" role="group" aria-label="${esc(t('common.language'))}">${LANGS.map(
    (l) => `<button class="${l === getLang() ? 'on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`,
  ).join('')}</div>`;
}

function shell() {
  const tn = state.me.tenant;
  const items = NAV.filter((n) => !n.role || can(n.role));
  app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="#/">
        ${tn.logo ? `<img src="${esc(tn.logo)}" alt="">` : `<span class="brand-mono">${esc(tn.name.slice(0, 1))}</span>`}
        <span class="brand-name">${esc(tn.name)}</span>
      </a>
      <nav class="side-nav">${items
        .map((n) => `<a href="#${n.path}" data-path="${n.path}">${icon(n.icon)}<span>${esc(t(n.key))}</span></a>`)
        .join('')}</nav>
      <div class="side-foot">
        <button class="side-suggest" data-suggest>${icon('mail')}<span>${esc(t('suggest.button'))}</span></button>
        ${langSwitch()}
        <div class="side-user">${icon('shield')}<span>${esc(state.me.user.full_name || state.me.user.username)}<small>${esc(t(`role.${state.me.user.role}`))}</small></span>
          <button class="icon-btn" data-logout title="${esc(t('auth.logout'))}">${icon('logout')}</button></div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn back-btn" hidden aria-label="${esc(t('common.back'))}">${icon('back')}</button>
        <h1 class="page-title"></h1>
        <div class="top-actions"></div>
      </header>
      <main id="view" tabindex="-1"></main>
      ${credit()}
    </div>
    <nav class="tabbar">${NAV.filter((n) => n.tab)
      .map((n) => `<a href="#${n.path}" data-path="${n.path}" class="${n.center ? 'tab-center' : ''}">${icon(n.icon)}<span>${esc(t(n.key))}</span></a>`)
      .join('')}<a href="#/more" data-path="/more">${icon('menu')}<span>${esc(t('nav.more'))}</span></a></nav>
  </div>`;
}

export function setPage(title, { back, actions = '' } = {}) {
  $('.page-title').textContent = title;
  document.title = `${title} · ${state.me.tenant.name}`;
  const b = $('.back-btn');
  b.hidden = !back;
  b.onclick = back ? () => (typeof back === 'string' ? go(back) : history.back()) : null;
  $('.top-actions').innerHTML = actions;
}

function markNav(path) {
  const top = `/${path.split('/')[1] || ''}`;
  for (const a of document.querySelectorAll('[data-path]')) {
    const p = a.dataset.path;
    a.classList.toggle('active', p === top || (p === '/more' && ['/transactions', '/reports', '/debits', '/initial', '/import', '/settings', '/cards', '/events'].includes(top)));
  }
}

let renderSeq = 0;
async function render() {
  const old = $('#view');
  if (!old) return;
  const view = old.cloneNode(false); // fresh element: drops listeners from the previous view
  old.replaceWith(view);
  const r = resolveRoute();
  const seq = ++renderSeq;
  markNav(location.hash.replace(/^#/, '').split('?')[0] || '/');
  view.innerHTML = loading();
  window.scrollTo(0, 0);
  if (!r) return go('/');
  try {
    await r.handler(view, r.params, () => seq !== renderSeq);
  } catch (e) {
    console.error(e);
    if (seq === renderSeq) view.innerHTML = `<div class="empty">${icon('x')}<p>${esc(errText(e))}</p></div>`;
  }
}

function lazy(mod, fn) {
  return async (el, params, stale) => {
    const m = await import(`./views/${mod}.js`);
    return m[fn](el, params, stale);
  };
}

function registerRoutes() {
  route('/', lazy('dashboard', 'dashboard'));
  route('/members', lazy('members', 'list'));
  route('/members/new', lazy('members', 'form'));
  route('/members/:id', lazy('members', 'detail'));
  route('/members/:id/edit', lazy('members', 'form'));
  route('/scan', lazy('scan', 'scan'));
  route('/payments', lazy('payments', 'payments'));
  route('/payments/new', lazy('payments', 'newPayment'));
  route('/transactions', lazy('payments', 'transactions'));
  route('/debits', lazy('debits', 'debits'));
  route('/initial', lazy('debits', 'initial'));
  route('/import', lazy('import', 'importView'));
  route('/reports', lazy('reports', 'reports'));
  route('/cards', lazy('reports', 'cards'));
  route('/settings', lazy('settings', 'settings'));
  route('/events', lazy('events', 'events'));
  route('/events/:id', lazy('events', 'eventDetail'));
  route('/more', lazy('settings', 'more'));
}

function subscriptionBanner() {
  const s = state.me.subscription;
  if (!s || !can('admin')) return;
  let key = null;
  if (s.status === 'expired') key = 'sub.banner_expired';
  else if (s.status === 'grace') key = 'sub.banner_grace';
  else if (s.status === 'expiring') key = 'sub.banner_expiring';
  else if (s.over_limit) key = 'sub.banner_over';
  else if (s.near_limit) key = 'sub.banner_near';
  if (!key) return;
  try {
    if (sessionStorage.getItem(`dismiss:${key}`) && !['sub.banner_expired', 'sub.banner_grace'].includes(key)) return;
  } catch { /* ignore */ }
  const el = document.createElement('aside');
  el.setAttribute('aria-label', t('sub.title'));
  el.className = `sub-banner ${['sub.banner_expired', 'sub.banner_grace', 'sub.banner_over'].includes(key) ? 'bad' : ''}`;
  el.innerHTML = `${icon('clock')}<span>${esc(t(key, { days: Math.abs(s.days_left ?? 0), grace: s.grace_days + (s.days_left ?? 0), count: s.member_count, limit: s.member_limit }))}</span>
    <button class="link" data-suggest>${esc(t('sub.contact'))}</button><button class="icon-btn" data-dismiss aria-label="${esc(t('common.close'))}">${icon('x')}</button>`;
  el.querySelector('[data-dismiss]').onclick = () => {
    try { sessionStorage.setItem(`dismiss:${key}`, '1'); } catch { /* ignore */ }
    el.remove();
  };
  $('.topbar').after(el);
}

function demoBanner() {
  if (!state.me.tenant.is_demo) return;
  const el = document.createElement('aside');
  el.setAttribute('aria-label', t('admin.demo'));
  el.className = 'sub-banner demo-banner';
  el.innerHTML = `${icon('sparkle')}<span>${esc(t('demo.banner'))}</span><a class="link" href="/#contact">${esc(t('demo.cta'))}</a>`;
  $('.topbar').after(el);
}

async function startTenantApp() {
  shell();
  demoBanner();
  subscriptionBanner();
  render();
}

document.addEventListener('click', async (e) => {
  const l = e.target.closest('[data-lang]');
  if (l) {
    setLang(l.dataset.lang);
    boot(true);
    return;
  }
  if (e.target.closest('[data-logout]')) {
    const key = state.me?.tenant?.key;
    await api('logout', { method: 'POST' }).catch(() => {});
    state.me = null;
    location.href = key ? `/?soc=${encodeURIComponent(key)}` : '/';
  }
  if (e.target.closest('[data-suggest]')) suggestSheet();
});

window.addEventListener('hashchange', () => {
  if (state.me && $('#view')) render();
});

window.addEventListener('session-expired', () => {
  toast(t('auth.expired'), 'err');
  boot();
});

async function boot(keepView = false) {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  document.documentElement.lang = getLang();
  if (path === '/admin') {
    const m = await import('./views/admin.js');
    return m.adminApp(app);
  }
  const pub = path.match(/^\/(c|s|m)\/([^/]+)$/);
  if (pub) {
    const m = await import('./views/public.js');
    if (pub[1] === 'm') return m.memberPortal(app, pub[2]);
    return pub[1] === 'c' ? m.publicCard(app, pub[2]) : m.publicShare(app, pub[2]);
  }
  if (!state.me || !keepView) {
    app.innerHTML = `<div class="splash">${loading()}</div>`;
    try {
      state.me = await api('me');
    } catch {
      state.me = null;
    }
  }
  if (!state.me) {
    const m = await import('./views/login.js');
    return m.login(app, () => {
      if (location.pathname !== '/app') location.href = '/app';
      else boot();
    });
  }
  if (path === '/') {
    location.replace('/app');
    return;
  }
  let storedLang = null;
  try { storedLang = localStorage.getItem('lang'); } catch { /* ignore */ }
  if (!storedLang) setLang(state.me.tenant.default_lang || 'el', false);
  document.documentElement.lang = getLang();
  startTenantApp();
}

initLang();
registerRoutes();
boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
