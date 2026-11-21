// Public, no-login pages: QR card verification and shared documents.
import { t, setLang, getLang, LANGS } from '../i18n.js';
import { api, esc, icon, fmtDate, fullName, credit, errText, loading } from '../core.js';
import { cardHtml, docHtml, statementSpec, receiptSpec, balancesSpec, shareFile, printDoc } from '../print.js';
import { docPdf } from '../export.js';

function langBar(rerender) {
  const el = document.createElement('div');
  el.className = 'auth-lang pub-lang';
  el.innerHTML = LANGS.map((l) => `<button class="${l === getLang() ? 'on' : ''}" data-l="${l}">${l.toUpperCase()}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('[data-l]');
    if (b) {
      setLang(b.dataset.l);
      rerender();
    }
  };
  return el;
}

function hasStoredLang() {
  try {
    return !!localStorage.getItem('lang');
  } catch {
    return false;
  }
}

export async function publicCard(app, token) {
  app.innerHTML = `<div class="splash">${loading()}</div>`;
  let data;
  try {
    data = await api(`public/card/${token}`);
  } catch (e) {
    app.innerHTML = `<div class="public"><div class="panel pad center">${icon('x')}<p>${esc(errText(e))}</p></div>${credit()}</div>`;
    return;
  }
  if (!hasStoredLang()) setLang(data.tenant.default_lang || 'el', false);
  const draw = () => {
    const { tenant: tn, member: m } = data;
    const valid = m.status === 'active';
    document.title = `${fullName(m)} · ${tn.name}`;
    app.innerHTML = `
    <div class="public">
      <header class="pub-head">${tn.logo ? `<img src="${esc(tn.logo)}" alt="">` : `<span class="brand-mono">${esc(tn.name.slice(0, 1))}</span>`}<span>${esc(tn.name)}</span></header>
      <section class="verify ${valid ? 'ok' : 'bad'}">
        <div class="verify-mark">${icon(valid ? 'shield' : 'x')}</div>
        <span class="eyebrow">${esc(t('verify.title'))}</span>
        <h1 class="display">${esc(valid ? t('verify.valid') : t('verify.inactive'))}</h1>
        ${valid ? `<p class="${m.in_good_standing ? 'good' : 'warn'}">${icon(m.in_good_standing ? 'check' : 'clock')} ${esc(m.in_good_standing ? t('bal.good_standing') : t('verify.dues'))}</p>` : ''}
      </section>
      <section class="card-preview">${cardHtml({ ...m, qr_token: token }, tn)}</section>
      <section class="panel pad pub-member">
        ${m.photo ? `<img class="pub-photo" src="${esc(m.photo)}" alt="">` : ''}
        <dl class="info-list">
          <div><dt>${esc(t('member.name'))}</dt><dd>${esc(fullName(m))}</dd></div>
          <div><dt>${esc(t('member.no'))}</dt><dd>${esc(m.member_no)}</dd></div>
          ${m.type_name ? `<div><dt>${esc(t('member.type'))}</dt><dd>${esc(m.type_name)}</dd></div>` : ''}
          ${m.join_date ? `<div><dt>${esc(t('member.join_date'))}</dt><dd>${esc(fmtDate(m.join_date))}</dd></div>` : ''}
        </dl>
        <p class="muted small">${esc(t('verify.save_hint'))}</p>
      </section>
      ${credit()}
    </div>`;
    app.querySelector('.public').prepend(langBar(draw));
  };
  draw();
}

export async function publicShare(app, token) {
  app.innerHTML = `<div class="splash">${loading()}</div>`;
  let data;
  try {
    data = await api(`public/share/${token}`);
  } catch (e) {
    app.innerHTML = `<div class="public"><div class="panel pad center">${icon('clock')}<p>${esc(e.code === 'link_expired' ? t('err.link_expired') : errText(e))}</p></div>${credit()}</div>`;
    return;
  }
  if (!hasStoredLang()) setLang(data.tenant.default_lang || 'el', false);
  const draw = () => {
    const tn = data.tenant;
    let spec;
    if (data.kind === 'statement') spec = statementSpec(data.member, data.transactions, tn);
    else if (data.kind === 'receipt') spec = receiptSpec(data.member, data.transaction, tn);
    else if (data.kind === 'balances') spec = balancesSpec(data.report, data.filters, tn);
    else if (data.kind === 'card') {
      app.innerHTML = `<div class="public"><section class="card-preview">${cardHtml(data.member, tn)}</section>${credit()}</div>`;
      return;
    }
    document.title = `${spec.title} · ${tn.name}`;
    app.innerHTML = `
    <div class="public public-doc">
      <div class="pub-actions">
        <button class="btn btn-primary" data-pdf>${icon('download')}<span>${esc(t('share.pdf'))}</span></button>
        <button class="btn btn-ghost" data-print>${icon('print')}<span>${esc(t('share.print'))}</span></button>
      </div>
      <div class="paper">${docHtml(spec, tn)}</div>
      <p class="muted small center">${esc(t('share.valid_until', { date: fmtDate(data.expires_at) }))}</p>
      ${credit()}
    </div>`;
    app.querySelector('.public').prepend(langBar(draw));
    app.querySelector('[data-pdf]').onclick = async (e) => {
      e.currentTarget.classList.add('busy');
      try {
        await shareFile(await docPdf(spec, tn), `${spec.filename.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.pdf`, spec.title, true);
      } finally {
        e.currentTarget?.classList.remove('busy');
      }
    };
    app.querySelector('[data-print]').onclick = () => printDoc(spec, tn);
  };
  draw();
}
