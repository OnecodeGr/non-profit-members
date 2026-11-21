// QR helpers (vector SVG for screen/print, matrix for PDF).
import qrcode from '../vendor/qrcode.mjs';

export function qrMatrix(text) {
  const q = qrcode(0, 'M');
  q.addData(text, 'Byte');
  q.make();
  return q;
}

export function qrSvg(text, { dark = '#111', light = 'transparent', margin = 0 } = {}) {
  const q = qrMatrix(text);
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + margin},${r + margin}h1v1h-1z`;
  const size = n + margin * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
