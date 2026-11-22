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
    app.innerHTML = `<main class="public"><div class="panel pad center">${icon('x')}<p>${esc(errText(e))}</p></div>${credit()}</main>`;
    return;
  }
  if (!hasStoredLang()) setLang(data.tenant.default_lang || 'el', false);
  const draw = () => {
    const { tenant: tn, member: m } = data;
    const valid = m.status === 'active';
    document.title = `${fullName(m)} · ${tn.name}`;
    app.innerHTML = `
    <main class="public">
      <header class="pub-head">${tn.logo ? `<img src="${esc(tn.logo)}" alt="">` : `<span class="brand-mono">${esc(tn.name.slice(0, 1))}</span>`}<span>${esc(tn.name)}</span></header>
      <section class="verify ${valid ? 'ok' : 'bad'}">
        <div class="verify-mark">${icon(valid ? 'shield' : 'x')}</div>
        <span class="eyebrow">${esc(t('verify.title'))}</span>
        <h1 class="display">${esc(valid ? t('verify.valid') : t('verify.inactive'))}</h1>
        ${valid ? `<p class="${m.in_good_standing ? 'good' : 'warn'}">${icon(m.in_good_standing ? 'check' : 'clock')} ${esc(m.in_good_standing ? t('bal.good_standing') : t('verify.dues'))}</p>` : ''}
      </section>
      <section class="card-preview">${cardHtml({ ...m, qr_token: token }, tn)}</section>
      ${walletButtons(data.wallet, token)}
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
    </main>`;
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
    app.innerHTML = `<main class="public"><div class="panel pad center">${icon('clock')}<p>${esc(e.code === 'link_expired' ? t('err.link_expired') : errText(e))}</p></div>${credit()}</main>`;
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
      app.innerHTML = `<main class="public"><section class="card-preview">${cardHtml(data.member, tn)}</section>${credit()}</main>`;
      return;
    }
    document.title = `${spec.title} · ${tn.name}`;
    app.innerHTML = `
    <main class="public public-doc">
      <div class="pub-actions">
        <button class="btn btn-primary" data-pdf>${icon('download')}<span>${esc(t('share.pdf'))}</span></button>
        <button class="btn btn-ghost" data-print>${icon('print')}<span>${esc(t('share.print'))}</span></button>
      </div>
      <div class="paper" tabindex="0" role="region" aria-label="${esc(spec.title)}">${docHtml(spec, tn)}</div>
      <p class="muted small center">${esc(t('share.valid_until', { date: fmtDate(data.expires_at) }))}</p>
      ${credit()}
    </main>`;
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

// ---------- member self-service portal (/m/<token>) ----------
function walletButtons(wallet, qrToken) {
  if (!wallet || (!wallet.apple && !wallet.google)) return '';
  return `<div class="wallet-buttons">
    ${wallet.apple ? `<a class="wallet-btn" href="/api/public/wallet/apple/${esc(qrToken)}">${icon('card')}<span><small>${esc(t('wallet.add_to'))}</small>Apple Wallet</span></a>` : ''}
    ${wallet.google ? `<a class="wallet-btn" href="/api/public/wallet/google/${esc(qrToken)}" target="_blank" rel="noopener">${icon('card')}<span><small>${esc(t('wallet.add_to'))}</small>Google Wallet</span></a>` : ''}
  </div>`;
}
export { walletButtons };

export async function memberPortal(app, token) {
  app.innerHTML = `<div class="splash">${loading()}</div>`;
  let data;
  const load = async () => {
    data = await api(`portal/${token}`);
  };
  try {
    await load();
  } catch (e) {
    app.innerHTML = `<main class="public"><div class="panel pad center">${icon('clock')}<p>${esc(e.code === 'link_expired' ? t('portal.invalid') : errText(e))}</p></div>${credit()}</main>`;
    return;
  }
  if (!hasStoredLang()) setLang(data.tenant.default_lang || 'el', false);
  const { money: fmtMoney, readImage, parseAmount, todayIso, fmtDate: fd, toast, formData } = await import('../core.js');
  const { cardsPdf } = await import('../export.js');
  const { statementSpec, receiptSpec, txLabel } = await import('../print.js');

  const draw = () => {
    const { tenant: tn, member: m, transactions: txs } = data;
    const cur = (c) => fmtMoney(c, tn.currency);
    document.title = `${fullName(m)} · ${tn.name}`;
    const receipts = txs.filter((x) => x.type === 'payment' && x.status === 'confirmed').reverse();
    const pendingTx = txs.filter((x) => x.status === 'pending');
    const ref = `${t('portal.ref_prefix')} №${m.member_no} ${m.last_name}`;
    app.innerHTML = `
    <main class="public portal">
      <header class="pub-head">${tn.logo ? `<img src="${esc(tn.logo)}" alt="">` : `<span class="brand-mono">${esc(tn.name.slice(0, 1))}</span>`}<span>${esc(tn.name)}</span></header>
      <section class="portal-hello">
        <span class="eyebrow">${esc(t('portal.eyebrow'))}</span>
        <h1 class="display">${esc(t('portal.hello', { name: m.first_name }))}</h1>
      </section>
      <section class="balance-box ${m.balance > 0 ? 'owe' : m.balance < 0 ? 'credit' : 'zero'}">
        <span class="eyebrow">${esc(m.balance > 0 ? t('bal.owed') : m.balance < 0 ? t('bal.credit') : t('bal.balance'))}</span>
        <span class="balance-value">${esc(cur(Math.abs(m.balance)))}</span>
        <small>${m.pending ? esc(t('pay.pending_amount', { amount: cur(m.pending) })) : esc(m.balance <= 0 ? t('bal.good_standing') : t('portal.please_pay'))}</small>
      </section>
      <section class="card-preview">${cardHtml({ ...m }, tn)}</section>
      ${walletButtons(data.wallet, m.qr_token)}
      <div class="action-bar center"><button class="btn btn-ghost" data-card-pdf>${icon('download')}<span>${esc(t('portal.card_pdf'))}</span></button>
        <button class="btn btn-ghost" data-statement>${icon('receipt')}<span>${esc(t('portal.statement_pdf'))}</span></button></div>

      ${tn.bank_iban ? `<section class="panel portal-bank">
        <div class="panel-head"><h2>${esc(t('portal.pay_title'))}</h2></div>
        <div class="pad">
          <p class="muted small">${esc(t('portal.pay_text'))}</p>
          <dl class="info-list">
            ${tn.bank_beneficiary ? `<div><dt>${esc(t('portal.beneficiary'))}</dt><dd>${esc(tn.bank_beneficiary)}</dd></div>` : ''}
            ${tn.bank_name ? `<div><dt>${esc(t('portal.bank'))}</dt><dd>${esc(tn.bank_name)}</dd></div>` : ''}
            <div><dt>IBAN</dt><dd class="copyable"><code>${esc(tn.bank_iban)}</code><button class="icon-btn" data-copy="${esc(tn.bank_iban.replace(/\s/g, ''))}">${icon('copy')}</button></dd></div>
            <div><dt>${esc(t('portal.reference'))}</dt><dd class="copyable"><code>${esc(ref)}</code><button class="icon-btn" data-copy="${esc(ref)}">${icon('copy')}</button></dd></div>
            ${m.balance > 0 ? `<div><dt>${esc(t('tx.amount'))}</dt><dd><b>${esc(cur(m.balance))}</b></dd></div>` : ''}
          </dl>
        </div>
      </section>` : ''}

      <section class="panel">
        <div class="panel-head"><h2>${esc(t('portal.report_title'))}</h2></div>
        <form class="form pad portal-pay" novalidate>
          <p class="muted small">${esc(t('portal.report_text'))}</p>
          <div class="grid-2">
            <label class="field"><span>${esc(t('tx.amount'))} *</span><input name="amount" inputmode="decimal" required placeholder="0,00" value="${m.balance > 0 ? esc((m.balance / 100).toFixed(2).replace('.', ',')) : ''}"></label>
            <label class="field"><span>${esc(t('portal.paid_on'))}</span><input type="date" name="date" value="${todayIso()}"></label>
          </div>
          <label class="field"><span>${esc(t('portal.bank_ref'))}</span><input name="reference" placeholder="${esc(t('pay.reference_placeholder'))}"></label>
          <label class="field"><span>${esc(t('portal.note'))}</span><input name="note"></label>
          ${data.proofs_enabled ? `<label class="field"><span>${esc(t('portal.proof'))}</span><input type="file" name="proof" accept="image/*,application/pdf"><small class="muted">${esc(t('portal.proof_hint'))}</small></label>` : ''}
          <p class="alert" hidden></p>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')}<span>${esc(t('portal.send'))}</span></button>
        </form>
      </section>

      ${pendingTx.length ? `<section class="panel"><div class="panel-head"><h2>${esc(t('portal.pending'))}</h2></div><ul class="rows">${pendingTx.map((x) => `<li class="row">
        <span class="row-main"><b>${esc(cur(-x.amount))}</b><small>${esc(fd(x.date))}${x.reference ? ` · ${esc(x.reference)}` : ''}</small></span><span class="pill pill-warn">${esc(t('txstatus.pending'))}</span></li>`).join('')}</ul></section>` : ''}

      <section class="panel">
        <div class="panel-head"><h2>${esc(t('tx.history'))}</h2></div>
        <ul class="rows">${txs.filter((x) => x.status === 'confirmed').reverse().map((x) => `<li class="row">
          <span class="row-main"><b>${esc(txLabel(x))}</b><small>${esc(fd(x.date))}${x.receipt_no ? ` · #${x.receipt_no}` : ''}</small></span>
          <span class="row-end"><b class="${x.amount < 0 ? 'amount-in' : 'amount-out'}">${x.amount < 0 ? '−' : '+'}${esc(cur(Math.abs(x.amount)))}</b>
          ${x.receipt_no ? `<button class="link" data-receipt="${x.id}">${esc(t('doc.receipt'))}</button>` : ''}</span></li>`).join('') || `<li class="muted pad">${esc(t('tx.none'))}</li>`}</ul>
      </section>

      ${data.events.length ? `<section class="panel"><div class="panel-head"><h2>${esc(t('nav.events'))}</h2></div><ul class="rows">${data.events.map((e) => `<li class="row">
        <span class="row-main"><b>${esc(e.title)}</b><small>${esc(fd(e.date))}${e.location ? ` · ${esc(e.location)}` : ''}</small></span>
        ${e.checked_at ? `<span class="pill pill-ok">${esc(t('ev.attended'))}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
      <p class="muted small center">${esc(t('portal.private'))}</p>
      ${credit()}
    </main>`;
    app.querySelector('.public').prepend(langBar(draw));

    const statementMember = { ...m, type_name: m.type_name };
    app.querySelector('[data-statement]').onclick = async (e) => {
      const b = e.currentTarget;
      b.classList.add('busy');
      try {
        const spec = statementSpec(statementMember, txs, tn);
        await shareFile(await docPdf(spec, tn), `${spec.filename.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.pdf`, spec.title);
      } finally {
        b.classList.remove('busy');
      }
    };
    app.querySelector('[data-card-pdf]').onclick = async (e) => {
      const b = e.currentTarget;
      b.classList.add('busy');
      try {
        await shareFile(await cardsPdf([m], 'cr80', tn), `card_${m.member_no}.pdf`, tn.name);
      } finally {
        b.classList.remove('busy');
      }
    };
    app.querySelectorAll('[data-receipt]').forEach((b) => (b.onclick = async () => {
      const tx = txs.find((x) => x.id === +b.dataset.receipt);
      const spec = receiptSpec(statementMember, tx, tn);
      await shareFile(await docPdf(spec, tn), `${spec.filename.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.pdf`, spec.title);
    }));
    app.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = async () => {
      await navigator.clipboard.writeText(b.dataset.copy).catch(() => {});
      toast(t('share.copied'));
    }));
    const form = app.querySelector('.portal-pay');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const alert = form.querySelector('.alert');
      alert.hidden = true;
      const d = formData(form);
      const amount = parseAmount(d.amount);
      if (!amount || Number.isNaN(amount) || amount < 0) {
        alert.textContent = t('err.invalid_amount');
        alert.hidden = false;
        return;
      }
      const btn = form.querySelector('[type=submit]');
      btn.classList.add('busy');
      try {
        let proof;
        const file = form.proof?.files?.[0];
        if (file) {
          if (file.type === 'application/pdf') {
            if (file.size > 6 * 1024 * 1024) throw Object.assign(new Error(), { code: 'proof_too_large' });
            proof = await new Promise((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result);
              fr.onerror = rej;
              fr.readAsDataURL(file);
            });
          } else proof = await readImage(file, 1800, 'image/jpeg');
        }
        await api(`portal/${token}/payment`, { method: 'POST', body: { amount, date: d.date, reference: d.reference, note: d.note, proof } });
        await load();
        draw();
        toast(t('portal.sent'));
        app.querySelector('.portal-pay').closest('.panel').insertAdjacentHTML('afterbegin', `<p class="lp-ok">${esc(t('portal.sent_long'))}</p>`);
      } catch (err) {
        alert.textContent = errText(err);
        alert.hidden = false;
        btn.classList.remove('busy');
      }
    };
  };
  draw();
}
