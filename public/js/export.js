// File exports: PDF (jsPDF + embedded Greek-capable fonts), CSV (; separated), XLSX (minimal writer).
// Doc spec columns: { label, align?: 'right', w?: number, money?: boolean }. Money cells hold cents (numbers).
import { t } from './i18n.js';
import { money, fmtDateTime, state } from './core.js';
import { qrMatrix } from './qr.js';

// ---------- lazy loading ----------
const loaded = {};
function loadScript(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`load ${src}`));
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}

const fontCache = {};
async function fontB64(url) {
  if (!fontCache[url]) {
    fontCache[url] = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
      });
  }
  return fontCache[url];
}

async function newPdf(opts) {
  await loadScript('/vendor/jspdf.umd.min.js');
  await loadScript('/vendor/jspdf.plugin.autotable.min.js');
  const [sans, sansBold, serif] = await Promise.all([fontB64('/fonts/pdf-sans.ttf'), fontB64('/fonts/pdf-sans-bold.ttf'), fontB64('/fonts/pdf-serif.ttf')]);
  const doc = new window.jspdf.jsPDF(opts);
  doc.addFileToVFS('sans.ttf', sans);
  doc.addFont('sans.ttf', 'Sans', 'normal');
  doc.addFileToVFS('sans-bold.ttf', sansBold);
  doc.addFont('sans-bold.ttf', 'Sans', 'bold');
  doc.addFileToVFS('serif.ttf', serif);
  doc.addFont('serif.ttf', 'Serif', 'normal');
  doc.setFont('Sans', 'normal');
  return doc;
}

function imageInfo(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const i = new Image();
    i.onload = () => {
      // Re-encode to PNG/JPEG via canvas so jsPDF always gets a supported format.
      const c = document.createElement('canvas');
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      c.getContext('2d').drawImage(i, 0, 0);
      const isJpg = /\.jpe?g($|\?)/i.test(src) || src.startsWith('data:image/jpeg');
      resolve({ data: c.toDataURL(isJpg ? 'image/jpeg' : 'image/png', 0.92), fmt: isJpg ? 'JPEG' : 'PNG', w: i.naturalWidth, h: i.naturalHeight });
    };
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

const hex = (h, fallback = [176, 141, 87]) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Uppercase that drops Greek tonos/dialytika (Greek typographic rule); keeps French accents.
export const upper = (v) => String(v ?? '').toUpperCase().normalize('NFD').replace(/([\u0391-\u03A9])[\u0301\u0308]/g, '$1').normalize('NFC');

const INK = [18, 18, 18];
const MUTED = [107, 102, 93];
const GOLD = [154, 122, 69];

export function cellText(col, v, currency) {
  if (col.money) return v === '' || v === null || v === undefined ? '' : money(v, currency);
  return String(v ?? '');
}

function drawQr(doc, text, x, y, size, rgb = INK) {
  const q = qrMatrix(text);
  const n = q.getModuleCount();
  const cell = size / n;
  doc.setFillColor(...rgb);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (q.isDark(r, c)) {
        let run = 1;
        while (c + run < n && q.isDark(r, c + run)) run++;
        doc.rect(x + c * cell, y + r * cell, cell * run + 0.01, cell + 0.01, 'F');
        c += run;
      } else c++;
    }
  }
}

function fitText(doc, text, maxW) {
  let s = String(text ?? '');
  if (doc.getTextWidth(s) <= maxW) return s;
  while (s.length > 1 && doc.getTextWidth(`${s}…`) > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

// ---------- documents ----------
export async function docPdf(spec, tenant = state.me.tenant) {
  const landscape = (spec.columns?.length || 0) > 6;
  const doc = await newPdf({ unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const cur = tenant.currency;

  // header band
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 4, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 4, W, 0.8, 'F');

  let y = 18;
  let x = M;
  const logo = await imageInfo(tenant.logo);
  if (logo) {
    const h = 16, w = Math.min((logo.w / logo.h) * h, 40);
    doc.addImage(logo.data, logo.fmt, M, y - 6, w, h);
    x += w + 5;
  }
  doc.setFont('Serif', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(fitText(doc, tenant.name, W - x - M), x, y);
  doc.setFont('Sans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const lines = [tenant.address, [tenant.phone, tenant.email].filter(Boolean).join(' · '), [tenant.tax_id ? `${t('settings.tax_id')}: ${tenant.tax_id}` : '', tenant.website].filter(Boolean).join(' · ')].filter(Boolean);
  lines.forEach((l, i) => doc.text(fitText(doc, l, W - x - M), x, y + 5 + i * 4));
  y = Math.max(y + 8 + lines.length * 4, 34);

  doc.setFont('Serif', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(fitText(doc, spec.title, W - 2 * M), M, y + 6);
  y += 9;
  doc.setFont('Sans', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  for (const s of spec.subtitle || []) {
    y += 5;
    doc.text(fitText(doc, s, W - 2 * M), M, y);
  }
  y += 6;

  if (spec.meta?.length) {
    const cw = (W - 2 * M) / 2;
    spec.meta.forEach(([k, v], i) => {
      const cx = M + (i % 2) * cw, cy = y + Math.floor(i / 2) * 12;
      doc.setFont('Sans', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(139, 133, 122);
      doc.text(upper(k), cx, cy + 3);
      doc.setFont('Sans', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(fitText(doc, String(v ?? ''), cw - 4), cx, cy + 8.5);
    });
    y += Math.ceil(spec.meta.length / 2) * 12 + 4;
  }

  const footer = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('Sans', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(139, 133, 122);
      doc.text(`${t('doc.generated')} ${fmtDateTime(new Date().toISOString())}`, M, H - 8);
      doc.text(`${p} / ${pages}`, W / 2, H - 8, { align: 'center' });
      doc.textWithLink(`${t('common.created_by')} OneCode · onecode.gr`, W - M - doc.getTextWidth(`${t('common.created_by')} OneCode · onecode.gr`), H - 8, { url: 'https://onecode.gr' });
    }
  };

  if (spec.columns?.length) {
    const cols = spec.columns;
    const totalW = cols.reduce((a, c) => a + (c.w || (c.align === 'right' ? 1 : 1.6)), 0);
    const columnStyles = {};
    cols.forEach((c, i) => {
      columnStyles[i] = { halign: c.align === 'right' ? 'right' : 'left', cellWidth: ((c.w || (c.align === 'right' ? 1 : 1.6)) / totalW) * (W - 2 * M) };
    });
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, bottom: 16 },
      head: [cols.map((c) => upper(c.label))],
      body: spec.rows.map((r) => r.map((v, i) => cellText(cols[i], v, cur))),
      styles: { font: 'Sans', fontSize: 8.5, textColor: [29, 27, 24], cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, lineWidth: 0, overflow: 'ellipsize' },
      headStyles: { fillColor: INK, textColor: [233, 217, 182], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [246, 241, 232] },
      bodyStyles: spec.tall ? { minCellHeight: 10, valign: 'middle' } : {},
      columnStyles,
      didParseCell: (d) => {
        if (d.section === 'head') d.cell.styles.halign = columnStyles[d.column.index].halign;
      },
    });
    y = doc.lastAutoTable.finalY + 2;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 2;
  }

  if (spec.totals?.length) {
    if (y + spec.totals.length * 7 + 10 > H - 20) {
      doc.addPage();
      y = 20;
    }
    for (const [k, v] of spec.totals) {
      y += 7;
      doc.setFont('Sans', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(String(k), W - M - 48, y, { align: 'right' });
      doc.setFont('Sans', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(String(v), W - M, y, { align: 'right' });
    }
  }
  if (spec.note) {
    y += 12;
    doc.setFont('Sans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(spec.note, W - 2 * M), M, y);
  }
  if (spec.qr) {
    y += 8;
    if (y + 34 > H - 16) {
      doc.addPage();
      y = 20;
    }
    drawQr(doc, spec.qr, M, y, 30);
  }
  footer();
  return doc.output('blob');
}

// ---------- membership cards ----------
const CARD_W = 85.6;
const CARD_H = 54;
const cardUrlOf = (m) => `${state.me?.public_url || location.origin}/c/${m.qr_token}`;

async function drawCard(doc, m, ox, oy, tenant, assets) {
  const gold = hex(tenant.color);
  doc.setFillColor(13, 13, 15);
  doc.rect(ox, oy, CARD_W, CARD_H, 'F');
  if (assets.bg) doc.addImage(assets.bg.data, assets.bg.fmt, ox, oy, CARD_W, CARD_H, 'cardbg', 'FAST');
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.2);
  doc.roundedRect(ox + 1.6, oy + 1.6, CARD_W - 3.2, CARD_H - 3.2, 2, 2, 'S');

  let x = ox + 5;
  if (assets.logo) {
    const h = 6.5, w = Math.min((assets.logo.w / assets.logo.h) * h, 18);
    doc.addImage(assets.logo.data, assets.logo.fmt, x, oy + 4.6, w, h, 'logo', 'FAST');
    x += w + 2.2;
  }
  doc.setFont('Serif', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text(fitText(doc, tenant.name, ox + CARD_W - 5 - x), x, oy + 9);

  doc.setFont('Sans', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(190, 184, 172);
  doc.text(upper(t('card.member')), ox + 5, oy + 21, { charSpace: 0.6 });
  doc.setFont('Serif', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(246, 239, 226);
  doc.text(fitText(doc, m.first_name, 46), ox + 5, oy + 27);
  doc.text(fitText(doc, m.last_name, 46), ox + 5, oy + 32.6);
  doc.setFont('Sans', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...gold);
  doc.text(fitText(doc, `${t('card.no')} ${m.member_no}${m.type_name ? `  ·  ${m.type_name}` : ''}`, 48), ox + 5, oy + 40);
  doc.setFont('Sans', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(190, 184, 172);
  const since = m.join_date ? `${t('card.since')} ${m.join_date.slice(0, 4)}` : '';
  doc.text(fitText(doc, [since, tenant.card_note].filter(Boolean).join('  ·  '), 48), ox + 5, oy + 44.5);

  const qs = 22, qx = ox + CARD_W - qs - 6, qy = oy + CARD_H - qs - 7;
  doc.setFillColor(246, 239, 226);
  doc.roundedRect(qx - 1.8, qy - 1.8, qs + 3.6, qs + 3.6, 1.4, 1.4, 'F');
  drawQr(doc, cardUrlOf(m), qx, qy, qs, INK);
}

export async function cardsPdf(members, layout = 'cr80', tenant = state.me.tenant) {
  const assets = { bg: await imageInfo('/img/card-texture.jpg'), logo: await imageInfo(tenant.logo) };
  if (layout === 'cr80') {
    const doc = await newPdf({ unit: 'mm', format: [CARD_W, CARD_H], orientation: 'landscape' });
    for (let i = 0; i < members.length; i++) {
      if (i) doc.addPage([CARD_W, CARD_H], 'landscape');
      await drawCard(doc, members[i], 0, 0, tenant, assets);
    }
    return doc.output('blob');
  }
  const doc = await newPdf({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const cols = 2, rows = 5, gx = (210 - cols * CARD_W) / 2, gy = (297 - rows * CARD_H) / 2;
  for (let i = 0; i < members.length; i++) {
    const slot = i % (cols * rows);
    if (i && slot === 0) doc.addPage('a4', 'portrait');
    const cx = gx + (slot % cols) * CARD_W, cy = gy + Math.floor(slot / cols) * CARD_H;
    await drawCard(doc, members[i], cx, cy, tenant, assets);
    // crop marks
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.1);
    for (const [px, py] of [[cx, cy], [cx + CARD_W, cy], [cx, cy + CARD_H], [cx + CARD_W, cy + CARD_H]]) {
      doc.line(px - 1.5, py, px + 1.5, py);
      doc.line(px, py - 1.5, px, py + 1.5);
    }
  }
  return doc.output('blob');
}

// ---------- CSV ----------
export function docCsv(spec) {
  const q = (v) => {
    const s = String(v ?? '');
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const num = (c) => (c === '' || c === null || c === undefined ? '' : (c / 100).toFixed(2).replace('.', ','));
  const lines = [
    spec.columns.map((c) => q(c.label)).join(';'),
    ...spec.rows.map((r) => r.map((v, i) => (spec.columns[i].money ? num(v) : q(v))).join(';')),
  ];
  return new Blob([`﻿${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
}

// ---------- XLSX (store-only zip) ----------
const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c >>> 0;
  }
  return tbl;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipFiles(files, type) {
  const b = zip(files);
  return type ? new Blob([b], { type }) : b;
}

function zip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameB = enc.encode(name);
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameB.length, true);
    chunks.push(new Uint8Array(local.buffer), nameB, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameB.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cenSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const xmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function colName(i) {
  let s = '';
  i++;
  while (i) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function docXlsx(spec) {
  const cols = spec.columns;
  const cell = (r, c, v, col, header) => {
    const ref = `${colName(c)}${r}`;
    if (header) return `<c r="${ref}" t="inlineStr" s="1"><is><t>${xmlEsc(v)}</t></is></c>`;
    if (col.money && typeof v === 'number') return `<c r="${ref}" s="2"><v>${(v / 100).toFixed(2)}</v></c>`;
    if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
    if (v === '' || v === null || v === undefined) return '';
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  };
  const rowsXml = [
    `<row r="1">${cols.map((c, i) => cell(1, i, c.label, c, true)).join('')}</row>`,
    ...spec.rows.map((r, ri) => `<row r="${ri + 2}">${r.map((v, i) => cell(ri + 2, i, v, cols[i])).join('')}</row>`),
  ].join('');
  const widths = cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.money ? 14 : Math.min(48, Math.max(10, (c.w || 1) * 14))}" customWidth="1"/>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${rowsXml}</sheetData><autoFilter ref="A1:${colName(cols.length - 1)}${spec.rows.length + 1}"/></worksheet>`;
  const sheetName = xmlEsc(String(spec.title || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheetName}'!$A$1:$${colName(cols.length - 1)}$${spec.rows.length + 1}</definedName></definedNames></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF121212"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheet],
  ]);
}
