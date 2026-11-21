// Printing and sharing for cards and documents.
// A "doc spec" describes a document once and is rendered to print HTML, PDF, XLSX or CSV.
import { qrSvg } from './qr.js';
import { docPdf, cardsPdf, docCsv, docXlsx, cellText } from './export.js';
import { t } from './i18n.js';
import { esc, icon, modal, toast, money, fmtDate, fmtDateTime, state, api, errText, fullName } from './core.js';

const CARD_BG = '/img/card-texture.jpg';
export { qrSvg };

export const cardUrl = (m) => `${state.me?.public_url || location.origin}/c/${m.qr_token}`;

// ---------- print host ----------
export function printHtml(html, { pageCss = '@page { size: A4; margin: 12mm; }' } = {}) {
  let root = document.getElementById('print-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'print-root';
    document.body.appendChild(root);
  }
  let style = document.getElementById('print-page-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'print-page-style';
    document.head.appendChild(style);
  }
  style.textContent = `@media print { ${pageCss} }`;
  root.innerHTML = html;
  document.body.classList.add('printing');
  const imgs = [...root.querySelectorAll('img')];
  Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => {
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing');
        root.innerHTML = '';
      }, 500);
    }, 100);
  });
}

// ---------- membership card ----------
export function cardHtml(m, tenant = state.me.tenant) {
  const year = new Date().getFullYear();
  return `
  <div class="mcard" style="--brand:${esc(tenant.color || '#b08d57')}"><div class="mcard-in">
    <div class="mcard-bg" style="background-image:url('${CARD_BG}')"></div>
    <div class="mcard-top">
      ${tenant.logo ? `<img class="mcard-logo" src="${esc(tenant.logo)}" alt="">` : `<span class="mcard-mono">${esc((tenant.name || '?').slice(0, 1))}</span>`}
      <span class="mcard-org">${esc(tenant.name)}</span>
    </div>
    <div class="mcard-main">
      <div class="mcard-info">
        <span class="mcard-label">${esc(t('card.member'))}</span>
        <span class="mcard-name">${esc(m.first_name)}<br>${esc(m.last_name)}</span>
        <span class="mcard-meta">
          <b>${esc(t('card.no'))} ${esc(m.member_no)}</b>${m.type_name ? ` · ${esc(m.type_name)}` : ''}
        </span>
        <span class="mcard-meta small">${m.join_date ? `${esc(t('card.since'))} ${esc(m.join_date.slice(0, 4))}` : `${year}`}${tenant.card_note ? ` · ${esc(tenant.card_note)}` : ''}</span>
      </div>
      <div class="mcard-qr">${qrSvg(cardUrl(m))}</div>
    </div>
  </div></div>`;
}

export function printCards(members, layout = 'a4') {
  const tenant = state.me.tenant;
  if (layout === 'cr80') {
    printHtml(`<div class="cards-cr80">${members.map((m) => `<div class="cr80-page">${cardHtml(m, tenant)}</div>`).join('')}</div>`, {
      pageCss: '@page { size: 85.6mm 54mm; margin: 0; }',
    });
  } else {
    printHtml(`<div class="cards-sheet">${members.map((m) => `<div class="cut">${cardHtml(m, tenant)}</div>`).join('')}</div>`, {
      pageCss: '@page { size: A4; margin: 10mm 19mm; }',
    });
  }
}

// ---------- document specs ----------
// spec = { title, subtitle?: string[], meta?: [label, value][], columns: [{label, align}], rows: any[][],
//          totals?: [label, value][], note?, filename }
function orgHeaderHtml(tenant) {
  const lines = [tenant.address, [tenant.phone, tenant.email].filter(Boolean).join(' · '), tenant.tax_id ? `${t('settings.tax_id')}: ${tenant.tax_id}` : '', tenant.website]
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join('');
  return `<div class="doc-head">
    ${tenant.logo ? `<img src="${esc(tenant.logo)}" alt="" class="doc-logo">` : ''}
    <div><div class="doc-org">${esc(tenant.name)}</div><div class="doc-org-lines">${lines}</div></div>
  </div>`;
}

export function docHtml(spec, tenant = state.me.tenant) {
  const cols = spec.columns || [];
  return `<article class="doc">
    ${orgHeaderHtml(tenant)}
    <h1 class="doc-title">${esc(spec.title)}</h1>
    ${(spec.subtitle || []).map((s) => `<p class="doc-sub">${esc(s)}</p>`).join('')}
    ${spec.meta?.length ? `<dl class="doc-meta">${spec.meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${cols.length ? `<table class="doc-table"><thead><tr>${cols.map((c) => `<th class="${c.align === 'right' ? 'r' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${spec.rows.map((r) => `<tr>${r.map((v, i) => `<td class="${cols[i].align === 'right' ? 'r' : ''}">${esc(cellText(cols[i], v, tenant.currency))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
    ${spec.totals?.length ? `<dl class="doc-totals">${spec.totals.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${spec.note ? `<p class="doc-note">${esc(spec.note)}</p>` : ''}
    ${spec.qr ? `<div class="doc-qr">${qrSvg(spec.qr)}</div>` : ''}
    <footer class="doc-foot"><span>${esc(t('doc.generated'))} ${esc(fmtDateTime(new Date().toISOString()))}</span><span>${esc(t('common.created_by'))} OneCode · onecode.gr</span></footer>
  </article>`;
}

export function printDoc(spec, tenant) {
  printHtml(docHtml(spec, tenant));
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}

// Share a file through the OS share sheet when possible, otherwise download it.
export async function shareFile(blob, filename, title, preferDownload = false) {
  const file = new File([blob], filename, { type: blob.type });
  if (!preferDownload && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, filename);
  toast(t('share.downloaded'));
}

async function nativeShareLink(url, title, text) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return true;
    }
  }
  return false;
}

const safeName = (s) => String(s || 'document').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 80);

// Unified share sheet.
// opts: { title, text?, spec?, pdf?: () => Promise<Blob>, print?: () => void, link?: () => Promise<string>, filename }
export function shareSheet(opts) {
  const fname = safeName(opts.filename || opts.spec?.filename || opts.title);
  const items = [];
  if (opts.print || opts.spec) items.push({ id: 'print', icon: 'print', label: t('share.print'), hint: t('share.print_hint') });
  if (opts.pdf || opts.spec) {
    items.push({ id: 'pdf-share', icon: 'share', label: t('share.pdf_share'), hint: t('share.pdf_share_hint') });
    items.push({ id: 'pdf', icon: 'download', label: t('share.pdf'), hint: t('share.pdf_hint') });
  }
  if (opts.link) items.push({ id: 'link', icon: 'link', label: t('share.link'), hint: t('share.link_hint') });
  if (opts.spec?.columns?.length) {
    items.push({ id: 'xlsx', icon: 'list', label: t('share.xlsx'), hint: t('share.xlsx_hint') });
    items.push({ id: 'csv', icon: 'list', label: t('share.csv'), hint: t('share.csv_hint') });
  }
  return modal({
    title: opts.title,
    body: `<div class="share-grid">${items
      .map((i) => `<button class="share-item" data-share="${i.id}">${icon(i.icon)}<span><b>${esc(i.label)}</b><small>${esc(i.hint)}</small></span></button>`)
      .join('')}</div><div class="share-link-box" hidden></div>`,
    onOpen: (el, close) => {
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-share]');
        if (!b || b.classList.contains('busy')) return;
        const id = b.dataset.share;
        b.classList.add('busy');
        try {
          if (id === 'print') {
            close();
            if (opts.print) opts.print();
            else printDoc(opts.spec);
          } else if (id === 'pdf' || id === 'pdf-share') {
            const blob = opts.pdf ? await opts.pdf() : await docPdf(opts.spec);
            await shareFile(blob, `${fname}.pdf`, opts.title, id === 'pdf');
          } else if (id === 'csv') {
            downloadBlob(docCsv(opts.spec), `${fname}.csv`);
          } else if (id === 'xlsx') {
            downloadBlob(docXlsx(opts.spec), `${fname}.xlsx`);
          } else if (id === 'link') {
            const url = await opts.link();
            const text = opts.text || opts.title;
            if (await nativeShareLink(url, opts.title, text)) return;
            const box = el.querySelector('.share-link-box');
            const enc = encodeURIComponent(`${text}\n${url}`);
            box.hidden = false;
            box.innerHTML = `
              <label class="field"><span>${esc(t('share.link'))}</span>
                <div class="input-group"><input readonly value="${esc(url)}"><button type="button" class="btn btn-ghost" data-copy>${icon('copy')}</button></div></label>
              <div class="share-apps">
                <a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${enc}">WhatsApp</a>
                <a class="chip" href="viber://forward?text=${enc}">Viber</a>
                <a class="chip" href="mailto:?subject=${encodeURIComponent(opts.title)}&body=${enc}">Email</a>
                <a class="chip" href="sms:?&body=${enc}">SMS</a>
              </div>
              <p class="muted small">${esc(t('share.link_expiry'))}</p>`;
            box.querySelector('[data-copy]').onclick = async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast(t('share.copied'));
              } catch {
                box.querySelector('input').select();
              }
            };
          }
        } catch (err) {
          console.error(err);
          toast(errText(err), 'err');
        } finally {
          b.classList.remove('busy');
        }
      });
    },
  });
}

// Share sheet for membership cards.
export function cardShareSheet(members, title) {
  const one = members.length === 1;
  const base = one ? `${t('card.title')}_${members[0].member_no}_${members[0].last_name}` : `${t('card.title_plural')}_${members.length}`;
  return modal({
    title: title || (one ? t('card.title') : `${t('card.title_plural')} (${members.length})`),
    body: `<div class="share-grid">
      <button class="share-item" data-c="print-a4">${icon('print')}<span><b>${esc(t('card.print_a4'))}</b><small>${esc(t('card.print_a4_hint'))}</small></span></button>
      <button class="share-item" data-c="print-cr80">${icon('card')}<span><b>${esc(t('card.print_cr80'))}</b><small>${esc(t('card.print_cr80_hint'))}</small></span></button>
      <button class="share-item" data-c="pdf-share">${icon('share')}<span><b>${esc(t('share.pdf_share'))}</b><small>${esc(t('card.pdf_share_hint'))}</small></span></button>
      <button class="share-item" data-c="pdf-a4">${icon('download')}<span><b>${esc(t('card.pdf_a4'))}</b><small>${esc(t('card.pdf_a4_hint'))}</small></span></button>
      ${one ? `<button class="share-item" data-c="link">${icon('link')}<span><b>${esc(t('card.link'))}</b><small>${esc(t('card.link_hint'))}</small></span></button>` : ''}
    </div><div class="share-link-box" hidden></div>`,
    onOpen: (el, close) => {
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-c]');
        if (!b || b.classList.contains('busy')) return;
        b.classList.add('busy');
        try {
          const c = b.dataset.c;
          if (c === 'print-a4' || c === 'print-cr80') {
            close();
            printCards(members, c === 'print-a4' ? 'a4' : 'cr80');
          } else if (c === 'pdf-share') {
            await shareFile(await cardsPdf(members, 'cr80'), `${safeName(base)}.pdf`, title || t('card.title'));
          } else if (c === 'pdf-a4') {
            await shareFile(await cardsPdf(members, 'a4'), `${safeName(base)}_A4.pdf`, title || t('card.title'), true);
          } else if (c === 'link') {
            const url = cardUrl(members[0]);
            if (await nativeShareLink(url, t('card.title'), `${t('card.title')} · ${fullName(members[0])}`)) return;
            await navigator.clipboard.writeText(url).catch(() => {});
            toast(t('share.copied'));
          }
        } catch (err) {
          console.error(err);
          toast(errText(err), 'err');
        } finally {
          b.classList.remove('busy');
        }
      });
    },
  });
}

// ---------- domain specs ----------
export function txLabel(tx) {
  const base = t(`tx.${tx.type}`);
  if (tx.type === 'annual' && tx.year) return `${base} ${tx.year}`;
  return base;
}

export function statementSpec(member, txs, tenant = state.me?.tenant) {
  let run = 0;
  const rows = [];
  for (const x of txs.filter((x) => x.status === 'confirmed')) {
    run += x.amount;
    rows.push([
      fmtDate(x.date),
      [txLabel(x), x.description, x.receipt_no ? `#${x.receipt_no}` : ''].filter(Boolean).join(' · '),
      x.amount > 0 ? x.amount : '',
      x.amount < 0 ? -x.amount : '',
      run,
    ]);
  }
  const charged = txs.filter((x) => x.status === 'confirmed' && x.amount > 0).reduce((a, x) => a + x.amount, 0);
  const paid = txs.filter((x) => x.status === 'confirmed' && x.amount < 0).reduce((a, x) => a - x.amount, 0);
  const pending = txs.filter((x) => x.status === 'pending').reduce((a, x) => a - x.amount, 0);
  return {
    title: t('doc.statement'),
    meta: [
      [t('member.name'), fullName(member)],
      [t('member.no'), member.member_no],
      [t('member.type'), member.type_name || '—'],
      [t('member.status'), t(`status.${member.status}`)],
    ],
    columns: [
      { label: t('tx.date'), w: 0.9 },
      { label: t('tx.description'), w: 2.2 },
      { label: t('tx.charge_col'), align: 'right', money: true },
      { label: t('tx.payment_col'), align: 'right', money: true },
      { label: t('tx.balance_col'), align: 'right', money: true },
    ],
    rows,
    totals: [
      [t('doc.total_charged'), money(charged, tenant.currency)],
      [t('doc.total_paid'), money(paid, tenant.currency)],
      ...(pending ? [[t('doc.pending'), money(pending, tenant.currency)]] : []),
      [run > 0 ? t('bal.owed') : run < 0 ? t('bal.credit') : t('bal.balance'), money(Math.abs(run), tenant.currency)],
    ],
    filename: `${t('doc.statement')}_${member.member_no}_${member.last_name}`,
  };
}

export function receiptSpec(member, tx, tenant = state.me?.tenant) {
  return {
    title: `${t('doc.receipt')}${tx.receipt_no ? ` #${tx.receipt_no}` : ''}`,
    subtitle: tx.status === 'pending' ? [t('doc.receipt_pending')] : tx.status === 'void' ? [t('txstatus.void')] : [],
    meta: [
      [t('member.name'), fullName(member)],
      [t('member.no'), member.member_no],
      [t('tx.date'), fmtDate(tx.date)],
      [t('tx.method'), tx.method ? t(`method.${tx.method}`) : '—'],
      ...(tx.reference ? [[t('tx.reference'), tx.reference]] : []),
      ...(tx.description ? [[t('tx.description'), tx.description]] : []),
    ],
    totals: [
      [t('doc.amount_received'), money(-tx.amount, tenant.currency)],
      [t('doc.balance_now'), money(member.balance, tenant.currency)],
    ],
    note: t('doc.receipt_thanks'),
    filename: `${t('doc.receipt')}_${tx.receipt_no || tx.id}`,
  };
}

export function balancesSpec(report, filters = {}, tenant = state.me?.tenant) {
  const sub = [];
  if (filters.only) sub.push(t(`report.only_${filters.only}`));
  if (filters.status) sub.push(t(`status.${filters.status}`));
  return {
    title: t('doc.balances'),
    subtitle: [[fmtDate(new Date().toISOString()), ...sub].join(' · ')],
    columns: [
      { label: t('member.no_short'), w: 0.5 },
      { label: t('member.name'), w: 2 },
      { label: t('member.type'), w: 1.1 },
      { label: t('doc.total_charged'), align: 'right', money: true },
      { label: t('doc.total_paid'), align: 'right', money: true },
      { label: t('bal.balance'), align: 'right', money: true },
    ],
    rows: report.rows.map((r) => [r.member_no, fullName(r), r.type_name || '', r.charged, r.paid, r.balance]),
    totals: [
      [t('doc.members_count'), String(report.totals.count)],
      [t('doc.total_charged'), money(report.totals.charged, tenant.currency)],
      [t('doc.total_paid'), money(report.totals.paid, tenant.currency)],
      [t('doc.total_outstanding'), money(report.totals.owing, tenant.currency)],
    ],
    filename: `${t('doc.balances')}_${new Date().toISOString().slice(0, 10)}`,
  };
}

export function rosterSpec(members, tenant = state.me?.tenant) {
  return {
    title: t('doc.roster'),
    subtitle: [`${fmtDate(new Date().toISOString())} · ${members.length} ${t('nav.members').toLowerCase()}`],
    columns: [
      { label: t('member.no_short'), w: 0.45 },
      { label: t('member.last_name'), w: 1.2 },
      { label: t('member.first_name'), w: 1 },
      { label: t('member.father_name'), w: 0.9 },
      { label: t('member.phone'), w: 1 },
      { label: t('member.email'), w: 1.5 },
      { label: t('member.address'), w: 1.6 },
      { label: t('member.type'), w: 1 },
      { label: t('member.status'), w: 0.7 },
      { label: t('member.join_date'), w: 0.8 },
      { label: t('bal.balance'), align: 'right', money: true, w: 0.9 },
    ],
    rows: members.map((m) => [
      m.member_no, m.last_name, m.first_name, m.father_name || '', m.phone || '', m.email || '',
      [m.address, m.postal_code, m.city].filter(Boolean).join(', '), m.type_name || '', t(`status.${m.status}`),
      m.join_date ? fmtDate(m.join_date) : '', m.balance,
    ]),
    totals: [[t('doc.members_count'), String(members.length)], [t('doc.total_outstanding'), money(members.reduce((a, m) => a + Math.max(0, m.balance), 0), tenant.currency)]],
    filename: `${t('doc.roster')}_${new Date().toISOString().slice(0, 10)}`,
  };
}

export function transactionsSpec(rows, summary, subtitle, tenant = state.me?.tenant) {
  return {
    title: t('doc.transactions'),
    subtitle: subtitle ? [subtitle] : [],
    columns: [
      { label: t('tx.date'), w: 0.8 },
      { label: t('member.no_short'), w: 0.45 },
      { label: t('member.name'), w: 1.5 },
      { label: t('tx.type'), w: 1.2 },
      { label: t('tx.method'), w: 0.8 },
      { label: t('tx.status'), w: 0.9 },
      { label: t('tx.charge_col'), align: 'right', money: true },
      { label: t('tx.payment_col'), align: 'right', money: true },
    ],
    rows: rows.map((x) => [
      fmtDate(x.date),
      x.member_no,
      fullName(x),
      [txLabel(x), x.receipt_no ? `#${x.receipt_no}` : ''].filter(Boolean).join(' '),
      x.method ? t(`method.${x.method}`) : '',
      t(`txstatus.${x.status}`),
      x.amount > 0 ? x.amount : '',
      x.amount < 0 ? -x.amount : '',
    ]),
    totals: [
      [t('doc.count'), String(summary.count)],
      [t('doc.total_charges'), money(summary.charges, tenant.currency)],
      [t('doc.total_payments'), money(summary.payments, tenant.currency)],
    ],
    filename: `${t('doc.transactions')}_${new Date().toISOString().slice(0, 10)}`,
  };
}

export async function createShareLink(payload) {
  const r = await api('share', { method: 'POST', body: payload });
  return r.url;
}
