// Shared helpers: responses, crypto, sessions, validation.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export const now = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export async function body(req) {
  try {
    return (await req.json()) || {};
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

// ---------- encoding ----------
const enc = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 18) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

// Human friendly tenant key: lowercase letters/digits, no confusing chars.
export function randomKey(len = 8) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(r, (b) => alphabet[b % alphabet.length]).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export { timingSafeEqual };

// ---------- passwords (PBKDF2-SHA256) ----------
const PBKDF2_ITER = 100000; // Workers runtime maximum

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const hash = await pbkdf2(password, unb64url(parts[2]), parseInt(parts[1], 10));
  return timingSafeEqual(b64url(hash), parts[3]);
}

// ---------- signed tokens (sessions, share links) ----------
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function secretOf(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) {
    throw new HttpError(500, 'server_misconfigured', 'SESSION_SECRET is not set');
  }
  return env.SESSION_SECRET;
}

export async function sign(env, payload, purpose) {
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secretOf(env) + ':' + purpose);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

export async function verify(env, token, purpose) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const key = await hmacKey(secretOf(env) + ':' + purpose);
  const expected = b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(unb64url(data)));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- cookies ----------
export function getCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function setCookie(name, value, maxAge, req) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// ---------- login rate limiting ----------
const WINDOW_SEC = 15 * 60;
const MAX_FAILS = 10;

export async function checkRateLimit(env, bucket) {
  const since = Math.floor(Date.now() / 1000) - WINDOW_SEC;
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE bucket = ? AND at > ?')
    .bind(bucket, since)
    .first();
  if (row && row.n >= MAX_FAILS) throw new HttpError(429, 'too_many_attempts');
}

export async function recordFailure(env, bucket) {
  const t = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO login_attempts (bucket, at) VALUES (?, ?)').bind(bucket, t),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(t - WINDOW_SEC),
  ]);
}

export async function clearFailures(env, bucket) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE bucket = ?').bind(bucket).run();
}

export function clientIp(req) {
  return req.headers.get('cf-connecting-ip') || 'local';
}

// ---------- validation ----------
export function str(v, max = 500) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, max);
}

export function cents(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) throw new HttpError(400, 'invalid_amount');
  return Math.round(n);
}

export function isoDate(v, fallback = '') {
  const s = str(v, 10);
  if (!s) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, 'invalid_date');
  return s;
}

export function int(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

export const LANGS = ['el', 'en', 'fr'];
export const TENANT_KEY_RE = /^[a-z0-9][a-z0-9-]{2,39}$/;
