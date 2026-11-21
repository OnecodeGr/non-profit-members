// Reusable camera QR scanner: BarcodeDetector when available, jsQR fallback.
import { t } from './i18n.js';

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

// Renders a scanner into `host` and calls onCode(text) for each new code. Returns stop().
export function startScanner(host, onCode, { cooldown = 2500 } = {}) {
  host.innerHTML = `<div class="scanner"><video playsinline muted></video><div class="scan-frame"><span></span></div><div class="scan-msg">${t('scan.starting')}</div></div>`;
  const video = host.querySelector('video');
  const msg = host.querySelector('.scan-msg');
  let stream;
  let running = true;
  let last = '';
  let lastAt = 0;
  const stop = () => {
    running = false;
    if (stream) stream.getTracks().forEach((tr) => tr.stop());
  };
  window.addEventListener('hashchange', stop, { once: true });

  (async () => {
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
      if (video.readyState >= 2) {
        let code = null;
        try {
          if (detector) code = (await detector.detect(video))[0]?.rawValue;
          else {
            const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data;
          }
        } catch { /* ignore frame errors */ }
        const nowMs = Date.now();
        if (code && (code !== last || nowMs - lastAt > cooldown * 2) && nowMs - lastAt > cooldown) {
          last = code;
          lastAt = nowMs;
          if (navigator.vibrate) navigator.vibrate(50);
          onCode(code);
        }
      }
      setTimeout(() => requestAnimationFrame(tick), 120);
    };
    tick();
  })();
  return stop;
}
