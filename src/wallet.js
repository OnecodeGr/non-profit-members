// Apple Wallet (.pkpass, CMS-signed) and Google Wallet (signed JWT "save" link) passes for member cards.
import { HttpError, json, b64url } from './util.js';

const enc = new TextEncoder();
const LABELS = {
  el: { member: 'Μέλος', no: 'Αρ. μητρώου', type: 'Κατηγορία', since: 'Μέλος από', verify: 'Επαλήθευση', org: 'Φορέας', status: 'Κατάσταση', active: 'Ενεργό', inactive: 'Ανενεργό', desc: 'Κάρτα μέλους' },
  en: { member: 'Member', no: 'Member no.', type: 'Category', since: 'Member since', verify: 'Verify', org: 'Organisation', status: 'Status', active: 'Active', inactive: 'Inactive', desc: 'Membership card' },
  fr: { member: 'Membre', no: 'N° de membre', type: 'Catégorie', since: 'Membre depuis', verify: 'Vérifier', org: 'Organisation', status: 'Statut', active: 'Actif', inactive: 'Inactif', desc: 'Carte de membre' },
};

export function walletFlags(env) {
  return {
    apple: !!(env.APPLE_PASS_CERT && env.APPLE_PASS_KEY && env.APPLE_WWDR_CERT && env.APPLE_PASS_TYPE_ID && env.APPLE_TEAM_ID),
    google: !!(env.GOOGLE_WALLET_ISSUER_ID && env.GOOGLE_WALLET_SERVICE_ACCOUNT),
  };
}

// ---------- byte helpers ----------
function concat(parts) {
  const arrs = parts.map((p) => (p instanceof Uint8Array ? p : new Uint8Array(p)));
  const out = new Uint8Array(arrs.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of arrs) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------- minimal DER encoder / decoder ----------
function derLen(n) {
  if (n < 128) return [n];
  const b = [];
  while (n) {
    b.unshift(n & 255);
    n >>= 8;
  }
  return [0x80 | b.length, ...b];
}
const tlv = (tag, ...parts) => {
  const c = concat(parts);
  return concat([Uint8Array.from([tag, ...derLen(c.length)]), c]);
};
const seq = (...p) => tlv(0x30, ...p);
const set = (...p) => tlv(0x31, ...p);
const NULL = Uint8Array.of(5, 0);
const derInt = (n) => tlv(2, Uint8Array.of(n));
const octet = (b) => tlv(4, b);
function oid(s) {
  const p = s.split('.').map(Number);
  const out = [40 * p[0] + p[1]];
  for (const v0 of p.slice(2)) {
    let v = v0;
    const st = [v & 127];
    v = Math.floor(v / 128);
    while (v) {
      st.unshift((v & 127) | 128);
      v = Math.floor(v / 128);
    }
    out.push(...st);
  }
  return tlv(6, Uint8Array.from(out));
}
function utcTime(d) {
  const s = `${d.toISOString().replace(/[-:T]/g, '').slice(2, 14)}Z`;
  return tlv(0x17, enc.encode(s));
}
function readTlv(buf, off) {
  const tag = buf[off];
  let len = buf[off + 1];
  let hdr = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[off + 2 + i];
    hdr = 2 + n;
  }
  return { tag, start: off, hdr, len, end: off + hdr + len };
}

function pemBlocks(pem, label) {
  const text = String(pem || '').replace(/\\n/g, '\n');
  const re = new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const bin = atob(m[1].replace(/\s+/g, ''));
    out.push(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  return out;
}

// Extract the issuer Name and serialNumber (raw DER) from an X.509 certificate.
function certIssuerSerial(der) {
  const cert = readTlv(der, 0);
  const tbs = readTlv(der, cert.start + cert.hdr);
  let off = tbs.start + tbs.hdr;
  let el = readTlv(der, off);
  if (el.tag === 0xa0) {
    off = el.end;
    el = readTlv(der, off);
  }
  const serial = der.slice(el.start, el.end);
  const sigAlg = readTlv(der, el.end);
  const issuer = readTlv(der, sigAlg.end);
  return { serial, issuer: der.slice(issuer.start, issuer.end) };
}

async function importRsaKey(pem, usage = 'sign') {
  let der = pemBlocks(pem, 'PRIVATE KEY')[0];
  if (!der) {
    const pkcs1 = pemBlocks(pem, 'RSA PRIVATE KEY')[0];
    if (!pkcs1) throw new HttpError(500, 'wallet_key_invalid');
    der = seq(derInt(0), seq(oid('1.2.840.113549.1.1.1'), NULL), octet(pkcs1)); // wrap PKCS#1 into PKCS#8
  }
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [usage]);
}

// Detached CMS SignedData over `content`, signed with the pass certificate, including the Apple WWDR cert.
async function cmsSign(content, certPem, keyPem, wwdrPem) {
  const cert = pemBlocks(certPem, 'CERTIFICATE')[0];
  const wwdr = pemBlocks(wwdrPem, 'CERTIFICATE')[0];
  if (!cert || !wwdr) throw new HttpError(500, 'wallet_cert_invalid');
  const key = await importRsaKey(keyPem);
  const sha256 = seq(oid('2.16.840.1.101.3.4.2.1'), NULL);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', content));
  const attrs = [
    seq(oid('1.2.840.113549.1.9.3'), set(oid('1.2.840.113549.1.7.1'))),
    seq(oid('1.2.840.113549.1.9.5'), set(utcTime(new Date()))),
    seq(oid('1.2.840.113549.1.9.4'), set(octet(digest))),
  ].sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  }); // DER SET OF ordering
  const signedAttrs = set(...attrs);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, signedAttrs));
  const { issuer, serial } = certIssuerSerial(cert);
  const implicitAttrs = Uint8Array.from(signedAttrs);
  implicitAttrs[0] = 0xa0; // [0] IMPLICIT SET OF Attribute
  const signerInfo = seq(
    derInt(1),
    seq(issuer, serial),
    sha256,
    implicitAttrs,
    seq(oid('1.2.840.113549.1.1.1'), NULL),
    octet(signature),
  );
  const signedData = seq(
    derInt(1),
    set(sha256),
    seq(oid('1.2.840.113549.1.7.1')),
    tlv(0xa0, cert, wwdr),
    set(signerInfo),
  );
  return seq(oid('1.2.840.113549.1.7.2'), tlv(0xa0, signedData));
}

// ---------- store-only ZIP ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const chunks = [];
  const central = [];
  let off = 0;
  for (const [name, data] of files) {
    const nb = enc.encode(name);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, nb.length, true);
    chunks.push(new Uint8Array(lh.buffer), nb, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, nb.length, true);
    ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const cen = concat(central);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cen.length, true);
  end.setUint32(16, off, true);
  return concat([...chunks, cen, new Uint8Array(end.buffer)]);
}

// ---------- data ----------
async function cardData(env, qrToken) {
  const row = await env.DB.prepare(
    `SELECT m.member_no, m.first_name, m.last_name, m.status, m.join_date, m.qr_token, mt.name AS type_name, t.key, t.name AS org,
       t.logo, t.default_lang, t.color, t.website, t.phone, t.email
     FROM members m JOIN tenants t ON t.id = m.tenant_id LEFT JOIN membership_types mt ON mt.id = m.membership_type_id
     WHERE m.qr_token = ? AND t.active = 1`,
  ).bind(qrToken).first();
  if (!row) throw new HttpError(404, 'not_found');
  return row;
}

function pngFromDataUrl(dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
}

async function asset(env, req, path) {
  const r = await env.ASSETS.fetch(new Request(new URL(path, req.url)));
  if (!r.ok) throw new HttpError(500, 'asset_missing');
  return new Uint8Array(await r.arrayBuffer());
}

const rgb = (h, fb) => {
  const m = /^#([0-9a-f]{6})$/i.exec(h || '');
  if (!m) return fb;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

async function applePass(req, env, d, base) {
  const L = LABELS[d.default_lang] || LABELS.el;
  const url = `${base}/c/${d.qr_token}`;
  const pass = {
    formatVersion: 1,
    passTypeIdentifier: env.APPLE_PASS_TYPE_ID,
    teamIdentifier: env.APPLE_TEAM_ID,
    serialNumber: `${d.key}-${d.member_no}-${d.qr_token.slice(0, 10)}`,
    organizationName: d.org,
    description: `${L.desc} · ${d.org}`,
    logoText: d.org.length > 26 ? `${d.org.slice(0, 25)}…` : d.org,
    foregroundColor: 'rgb(246, 239, 226)',
    backgroundColor: 'rgb(16, 15, 13)',
    labelColor: rgb(d.color, 'rgb(201, 165, 106)'),
    sharingProhibited: true,
    generic: {
      primaryFields: [{ key: 'name', label: L.member, value: `${d.first_name} ${d.last_name}` }],
      secondaryFields: [
        { key: 'no', label: L.no, value: String(d.member_no) },
        ...(d.type_name ? [{ key: 'type', label: L.type, value: d.type_name }] : []),
      ],
      auxiliaryFields: [
        ...(d.join_date ? [{ key: 'since', label: L.since, value: d.join_date.slice(0, 4) }] : []),
        { key: 'status', label: L.status, value: d.status === 'active' ? L.active : L.inactive },
      ],
      backFields: [
        { key: 'verify', label: L.verify, value: url },
        { key: 'org', label: L.org, value: [d.org, d.phone, d.email, d.website].filter(Boolean).join('\n') },
        { key: 'by', label: 'Members', value: 'Created by OneCode · https://onecode.gr' },
      ],
    },
    barcodes: [{ format: 'PKBarcodeFormatQR', message: url, messageEncoding: 'iso-8859-1', altText: `№ ${d.member_no}` }],
    barcode: { format: 'PKBarcodeFormatQR', message: url, messageEncoding: 'iso-8859-1', altText: `№ ${d.member_no}` },
  };
  const tenantLogo = pngFromDataUrl(d.logo);
  const files = [
    ['pass.json', enc.encode(JSON.stringify(pass))],
    ['icon.png', await asset(env, req, '/img/wallet/icon.png')],
    ['icon@2x.png', await asset(env, req, '/img/wallet/icon@2x.png')],
    ['icon@3x.png', await asset(env, req, '/img/wallet/icon@3x.png')],
    ['logo.png', tenantLogo || (await asset(env, req, '/img/wallet/logo.png'))],
    ['logo@2x.png', tenantLogo || (await asset(env, req, '/img/wallet/logo@2x.png'))],
  ];
  const manifest = {};
  for (const [name, data] of files) manifest[name] = hex(await crypto.subtle.digest('SHA-1', data));
  const manifestBytes = enc.encode(JSON.stringify(manifest));
  const signature = await cmsSign(manifestBytes, env.APPLE_PASS_CERT, env.APPLE_PASS_KEY, env.APPLE_WWDR_CERT);
  files.push(['manifest.json', manifestBytes], ['signature', signature]);
  return new Response(zip(files), {
    headers: {
      'content-type': 'application/vnd.apple.pkpass',
      'content-disposition': `attachment; filename="member-${d.member_no}.pkpass"`,
      'cache-control': 'no-store',
    },
  });
}

async function googleSaveUrl(env, d, base) {
  let sa;
  try {
    sa = JSON.parse(String(env.GOOGLE_WALLET_SERVICE_ACCOUNT));
  } catch {
    throw new HttpError(500, 'wallet_key_invalid');
  }
  const L = LABELS[d.default_lang] || LABELS.el;
  const lang = d.default_lang || 'el';
  const issuer = String(env.GOOGLE_WALLET_ISSUER_ID);
  const safe = (s) => String(s).replace(/[^\w.-]/g, '_');
  const classId = `${issuer}.members_${safe(d.key)}`;
  const url = `${base}/c/${d.qr_token}`;
  const lv = (value) => ({ defaultValue: { language: lang, value } });
  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [base],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [{
        id: `${issuer}.m_${safe(d.key)}_${d.member_no}_${safe(d.qr_token.slice(0, 10))}`,
        classId,
        state: 'ACTIVE',
        cardTitle: lv(d.org),
        subheader: lv(L.member),
        header: lv(`${d.first_name} ${d.last_name}`),
        hexBackgroundColor: '#100f0d',
        logo: { sourceUri: { uri: `${base}/api/public/logo/${encodeURIComponent(d.key)}.png` }, contentDescription: lv(d.org) },
        heroImage: { sourceUri: { uri: `${base}/img/card-texture.jpg` }, contentDescription: lv(L.desc) },
        textModulesData: [
          { id: 'no', header: L.no, body: String(d.member_no) },
          ...(d.type_name ? [{ id: 'type', header: L.type, body: d.type_name }] : []),
          ...(d.join_date ? [{ id: 'since', header: L.since, body: d.join_date.slice(0, 4) }] : []),
        ],
        barcode: { type: 'QR_CODE', value: url, alternateText: `№ ${d.member_no}` },
        linksModuleData: { uris: [{ uri: url, description: L.verify, id: 'verify' }] },
      }],
    },
  };
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const key = await importRsaKey(sa.private_key);
  const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${body}`)));
  return `https://pay.google.com/gp/v/save/${head}.${body}.${sig}`;
}

export async function handleWallet(req, env, path) {
  const base = (env.PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');
  let m = path.match(/^\/api\/public\/logo\/([a-z0-9-]{3,40})\.png$/);
  if (m) {
    const t = await env.DB.prepare('SELECT logo FROM tenants WHERE key = ? AND active = 1').bind(m[1]).first();
    const png = t && pngFromDataUrl(t.logo);
    if (!png) return Response.redirect(`${new URL(req.url).origin}/img/icon-512.png`, 302);
    return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
  }
  m = path.match(/^\/api\/public\/wallet\/(apple|google)\/([A-Za-z0-9_-]{10,64})$/);
  if (!m) return null;
  const flags = walletFlags(env);
  if (!flags[m[1]]) throw new HttpError(404, 'wallet_not_configured');
  const d = await cardData(env, m[2]);
  if (m[1] === 'apple') return applePass(req, env, d, base);
  const url = await googleSaveUrl(env, d, base);
  if (new URL(req.url).searchParams.get('json')) return json({ url });
  return Response.redirect(url, 302);
}
