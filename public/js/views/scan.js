import { t } from '../i18n.js';
import { api, esc, icon, money, fullName, avatar, can, errText } from '../core.js';
import { setPage } from '../main.js';

let jsqrLoading;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  if (!jsqrLoading) {
    jsqrLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/jsQR.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return jsqrLoading;
}

export async function scan(el) {
  setPage(t('nav.scan'));
  el.innerHTML = `
  <div class="scan-wrap">
    <div class="scanner">
      <video playsinline muted></video>
      <div class="scan-frame"><span></span></div>
      <div class="scan-msg">${esc(t('scan.starting'))}</div>
    </div>
    <form class="scan-manual">
      <label class="field"><span>${esc(t('scan.manual'))}</span>
        <div class="input-group"><input name="code" inputmode="numeric" placeholder="${esc(t('scan.manual_placeholder'))}" autocomplete="off">
        <button class="btn btn-primary">${icon('search')}</button></div></label>
    </form>
    <div class="scan-result" aria-live="polite"></div>
  </div>`;
  const video = el.querySelector('video');
  const msg = el.querySelector('.scan-msg');
  const result = el.querySelector('.scan-result');
  let stream;
  let running = true;
  let busy = false;
  let last = '';

  const stop = () => {
    running = false;
    if (stream) stream.getTracks().forEach((tr) => tr.stop());
  };
  window.addEventListener('hashchange', stop, { once: true });

  const identify = async (code) => {
    if (busy || !code) return;
    busy = true;
    try {
      const { member: m } = await api('identify', { query: { code } });
      if (navigator.vibrate) navigator.vibrate(60);
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
      setTimeout(() => (busy = false), 1200);
    }
  };

  el.querySelector('.scan-manual').onsubmit = (e) => {
    e.preventDefault();
    identify(e.target.code.value.trim());
  };

  if (!navigator.mediaDevices?.getUserMedia) {
    msg.textContent = t('scan.no_camera');
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
  } catch {
    msg.textContent = t('scan.denied');
    return;
  }
  if (!running) return stop();
  video.srcObject = stream;
  await video.play().catch(() => {});
  msg.textContent = t('scan.point');

  let detector = null;
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch { /* fall back */ }
  }
  if (!detector) await loadJsQR();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tick = async () => {
    if (!running || !document.body.contains(video)) return stop();
    if (video.readyState >= 2 && !busy) {
      let code = null;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          code = codes[0]?.rawValue;
        } else {
          const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          code = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data;
        }
      } catch { /* ignore frame errors */ }
      if (code && code !== last) {
        last = code;
        setTimeout(() => (last = ''), 4000);
        identify(code);
      }
    }
    setTimeout(() => requestAnimationFrame(tick), 120);
  };
  tick();
}
