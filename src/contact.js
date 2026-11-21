// Public contact form: Turnstile verification, honeypot, rate limit, D1 backup, email to sales.
import { HttpError, json, body, now, str, clientIp, checkRateLimit, recordFailure } from './util.js';
import { contactConfig } from './landing.js';

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured (local dev): rely on honeypot + rate limit
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip && ip !== 'local') form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json().catch(() => ({}));
  return !!d.success;
}

const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const encHeader = (s) => `=?UTF-8?B?${b64(s)}?=`;
const cleanHeader = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

function mime({ from, fromName, to, replyTo, subject, text }) {
  const domain = from.split('@')[1] || 'onecode.win';
  return [
    `From: ${encHeader(fromName)} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${cleanHeader(replyTo)}>` : '',
    `Subject: ${encHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(text)),
  ].filter((l, i, a) => l !== '' || i === a.length - 2).join('\r\n');
}

export async function sendMail(env, msg) {
  // 1) Cloudflare Email Routing "send_email" binding (preferred, no third party).
  if (env.SEND_EMAIL) {
    const { EmailMessage } = await import('cloudflare:email');
    await env.SEND_EMAIL.send(new EmailMessage(msg.from, msg.to, mime(msg)));
    return true;
  }
  // 2) Optional fallback: Resend API if a key is configured.
  if (env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `${msg.fromName} <${msg.from}>`, to: [msg.to], reply_to: msg.replyTo, subject: msg.subject, text: msg.text }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
    return true;
  }
  return false;
}

export async function handleContact(req, env) {
  const b = await body(req);
  const ip = clientIp(req);
  const bucket = `contact:${ip}`;
  await checkRateLimit(env, bucket); // max 10 per 15 minutes per IP
  await recordFailure(env, bucket); // every submission counts toward the limit
  if (str(b.website)) return json({ ok: true }); // honeypot: silently accept bots
  const name = str(b.name, 120);
  const email = str(b.email, 200);
  const message = str(b.message, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_input');
  if (!(await verifyTurnstile(env, str(b.turnstile, 4000), ip))) throw new HttpError(400, 'captcha_failed');
  const row = { phone: str(b.phone, 40), org: str(b.org, 200), members: str(b.members, 8), lang: str(b.lang, 5) };
  const saved = await env.DB.prepare(
    `INSERT INTO contact_messages (name, email, phone, org, members, message, lang, ip, created_at) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`,
  ).bind(name, email, row.phone, row.org, row.members, message, row.lang, ip, now()).first();
  const cfg = contactConfig(env);
  const text = [
    `Νέο μήνυμα από τη φόρμα επικοινωνίας του Members`,
    '',
    `Όνομα: ${name}`,
    `Email: ${email}`,
    `Τηλέφωνο: ${row.phone || '-'}`,
    `Φορέας: ${row.org || '-'}`,
    `Μέλη: ${row.members || '-'}`,
    `Γλώσσα: ${row.lang || '-'}`,
    '',
    message,
    '',
    `— #${saved.id} · ${now()}`,
  ].join('\n');
  let emailed = false;
  try {
    emailed = await sendMail(env, {
      from: env.MAIL_FROM || 'noreply@onecode.win', fromName: 'Members · OneCode', to: cfg.email, replyTo: email,
      subject: `Members: ${row.org || name}`, text,
    });
  } catch (e) {
    console.error('contact email failed', e);
  }
  if (emailed) await env.DB.prepare('UPDATE contact_messages SET emailed = 1 WHERE id = ?').bind(saved.id).run();
  return json({ ok: true });
}
