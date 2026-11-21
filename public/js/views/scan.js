import { t } from '../i18n.js';
import { api, esc, icon, money, fullName, avatar, can, errText } from '../core.js';
import { setPage } from '../main.js';
import { startScanner } from '../scanner.js';

export async function scan(el) {
  setPage(t('nav.scan'));
  el.innerHTML = `
  <div class="scan-wrap">
    <div class="scan-host"></div>
    <form class="scan-manual">
      <label class="field"><span>${esc(t('scan.manual'))}</span>
        <div class="input-group"><input name="code" inputmode="numeric" placeholder="${esc(t('scan.manual_placeholder'))}" autocomplete="off">
        <button class="btn btn-primary">${icon('search')}</button></div></label>
    </form>
    <div class="scan-result" aria-live="polite"></div>
  </div>`;
  const result = el.querySelector('.scan-result');
  let busy = false;
  const identify = async (code) => {
    if (busy || !code) return;
    busy = true;
    try {
      const { member: m } = await api('identify', { query: { code } });
      const good = m.balance <= 0 && m.status === 'active';
      result.innerHTML = `
        <div class="scan-card ${good ? 'good' : 'bad'}">
          <div class="scan-card-head">${avatar(m, 'lg')}
            <div><span class="eyebrow">№ ${esc(m.member_no)}${m.type_name ? ` · ${esc(m.type_name)}` : ''}</span><h3>${esc(fullName(m))}</h3>
            <span class="verdict">${icon(good ? 'check' : 'x')} ${esc(m.status !== 'active' ? t('status.inactive') : good ? t('bal.good_standing') : t('scan.owes', { amount: money(m.balance) }))}</span></div>
          </div>
          <div class="scan-card-actions">
            <a class="btn btn-ghost" href="#/members/${m.id}">${icon('users')}<span>${esc(t('scan.open'))}</span></a>
            ${can('staff') ? `<a class="btn btn-primary" href="#/payments/new?member=${m.id}">${icon('wallet')}<span>${esc(t('pay.record'))}</span></a>` : ''}
          </div>
        </div>`;
    } catch (e) {
      result.innerHTML = `<div class="scan-card bad"><p>${icon('x')} ${esc(errText(e))}</p></div>`;
    } finally {
      setTimeout(() => (busy = false), 800);
    }
  };
  el.querySelector('.scan-manual').onsubmit = (e) => {
    e.preventDefault();
    identify(e.target.code.value.trim());
  };
  startScanner(el.querySelector('.scan-host'), identify);
}
