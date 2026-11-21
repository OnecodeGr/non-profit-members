// Core helpers: API client, state, formatting, DOM utilities, dialogs, router.
import { t, getLang } from './i18n.js';

export const state = {
  me: null, // { user, tenant, types, public_url }
};

// ---------- API ----------
export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = path.startsWith('/') ? path : `/api/${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...qs].length) url += `?${qs}`;
  }
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined || method !== 'GET') {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body || {});
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError(0, 'network_error');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) {
    if (res.status === 401 && state.me && !url.includes('/login') && !url.startsWith('/api/admin') && !url.startsWith('/api/public')) {
      state.me = null;
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new ApiError(res.status, data.error || 'error');
  }
  return data;
}

export function errText(e) {
  const code = e && e.code ? e.code : 'error';
  const k = `err.${code}`;
  const msg = t(k);
  return msg === k ? t('err.error') : msg;
}

// ---------- formatting ----------
const LOCALES = { el: 'el-GR', en: 'en-GB', fr: 'fr-FR' };
export const locale = () => LOCALES[getLang()] || 'el-GR';

export function money(centsValue, currency) {
  const cur = currency || state.me?.tenant?.currency || 'EUR';
  return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur }).format((centsValue || 0) / 100);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Parse a user-typed amount ("12,50", "12.50", "1.234,50") into cents.
export function parseAmount(v) {
  let s = String(v ?? '').trim().replace(/[€\s]/g, '');
  if (!s) return 0;
  const neg = s.startsWith('-');
  s = s.replace(/^[-+]/, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else s = s.replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) * (neg ? -1 : 1);
}

export const centsToInput = (c) => (c ? (c / 100).toFixed(2).replace('.', getLang() === 'en' ? '.' : ',') : '');

export const fullName = (m) => `${m.last_name || ''} ${m.first_name || ''}`.trim();

// ---------- DOM ----------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

export function debounce(fn, ms = 250) {
  let h;
  return (...a) => {
    clearTimeout(h);
    h = setTimeout(() => fn(...a), ms);
  };
}

// ---------- icons (inline SVG, stroke style) ----------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.4.3 4.2 2 4.8 4.9"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M6 6V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.5-1.5 1.4-2.2 2.5-2.2s2 .7 2.5 2.2M14 10h4M14 13h3"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4M20 17v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  scale: '<path d="M12 4v16M6 20h12"/><path d="M5 8h14"/><path d="m5 8-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01M2 21h20"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  portal: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M10 18.5h4"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 14.5c.6-1.5 1.9-2.3 3.5-2.3s2.9.8 3.5 2.3"/>',
  paperclip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---------- toast ----------
export function toast(msg, kind = 'ok') {
  let host = $('#toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('role', 'status');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ---------- modal / sheet ----------
export function modal({ title, body, actions = [], wide = false, onOpen }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title || '')}">
        <div class="modal-head">
          <h3>${esc(title || '')}</h3>
          <button class="icon-btn" data-close aria-label="${esc(t('common.close'))}">${icon('x')}</button>
        </div>
        <div class="modal-body">${body || ''}</div>
        ${actions.length ? `<div class="modal-actions">${actions
          .map((a, i) => `<button class="btn ${a.kind ? `btn-${a.kind}` : ''}" data-act="${i}">${a.icon ? icon(a.icon) : ''}<span>${esc(a.label)}</span></button>`)
          .join('')}</div>` : ''}
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const close = (val) => {
      wrap.classList.remove('open');
      document.body.classList.remove('no-scroll');
      setTimeout(() => wrap.remove(), 200);
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };
    const onKey = (e) => e.key === 'Escape' && close(null);
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) return close(null);
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = actions[+b.dataset.act];
      if (a.onClick) {
        b.disabled = true;
        try {
          const r = await a.onClick(wrap.querySelector('.modal'));
          if (r !== false) close(r === undefined ? a.value ?? true : r);
        } catch (err) {
          toast(errText(err), 'err');
        } finally {
          b.disabled = false;
        }
      } else close(a.value ?? true);
    });
    requestAnimationFrame(() => wrap.classList.add('open'));
    if (onOpen) onOpen(wrap.querySelector('.modal'), close);
  });
}

export function confirmDialog(message, { ok, danger = false, title } = {}) {
  return modal({
    title: title || t('common.confirm'),
    body: `<p class="lead">${esc(message)}</p>`,
    actions: [
      { label: t('common.cancel'), value: false, kind: 'ghost' },
      { label: ok || t('common.ok'), value: true, kind: danger ? 'danger' : 'primary' },
    ],
  });
}

// ---------- router (hash based) ----------
const routes = [];
export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  routes.push({ re, keys, handler });
}

export function currentPath() {
  const h = location.hash.replace(/^#/, '') || '/';
  return h.split('?')[0];
}

export function hashQuery() {
  const h = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(h));
}

export function go(path) {
  if (location.hash === `#${path}`) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = path;
}

export function resolveRoute() {
  const p = currentPath();
  for (const r of routes) {
    const m = p.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: r.handler, params };
    }
  }
  return null;
}

export const can = (role) => {
  const lvl = { viewer: 1, staff: 2, admin: 3 };
  return (lvl[state.me?.user?.role] || 0) >= lvl[role];
};

export function loading() {
  return `<div class="loading"><span class="spinner"></span></div>`;
}

export function empty(text, iconName = 'sparkle') {
  return `<div class="empty">${icon(iconName)}<p>${esc(text)}</p></div>`;
}

export function credit() {
  return `<footer class="credit">${esc(t('common.created_by'))} <a href="https://onecode.gr" target="_blank" rel="noopener">OneCode</a></footer>`;
}

export function memberInitials(m) {
  return `${(m.first_name || '?')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase();
}

export function avatar(m, size = '') {
  if (m.photo) return `<span class="avatar ${size}"><img src="${esc(m.photo)}" alt=""></span>`;
  return `<span class="avatar ${size}">${esc(memberInitials(m))}</span>`;
}

export function balanceBadge(balance) {
  if (balance > 0) return `<span class="bal bal-owe">${esc(money(balance))}</span>`;
  if (balance < 0) return `<span class="bal bal-credit">${esc(money(-balance))} ${esc(t('bal.cr'))}</span>`;
  return `<span class="bal bal-zero">${esc(t('bal.settled'))}</span>`;
}

// Read an image file, downscale it and return a JPEG/PNG data URL.
export function readImage(file, maxSize = 480, type = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(type, 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function currencySymbol() {
  const cur = state.me?.tenant?.currency || 'EUR';
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur }).formatToParts(0).find((p) => p.type === 'currency')?.value || cur;
  } catch {
    return cur;
  }
}
