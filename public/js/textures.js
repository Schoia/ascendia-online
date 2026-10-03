'use strict';
/* Ascendia Online · procedural canvas textures (no image files needed). Textures are greyscale/white so material colours tint them. */
const TEX = {};
function canvasTex(key, size, draw, clampEdge) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 4;
  return TEX[key] = t;
}
function periodicNoise(size, cells, seed, octaves = 4) {
  const out = new Float32Array(size * size); let amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o, sd = seed + o * 17;
    const h = (a, b) => hash2(((a % n) + n) % n, ((b % n) + n) % n, sd);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = i / size * n, y = j / size * n, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      out[j * size + i] += amp * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
    }
    norm += amp; amp *= .5;
  }
  for (let k = 0; k < out.length; k++) out[k] /= norm;
  return out;
}
function grayImage(x, s, fn) { const img = x.createImageData(s, s); for (let k = 0; k < s * s; k++) { const v = clamp(Math.round(fn(k)), 0, 255); img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = v; img.data[k * 4 + 3] = 255; } x.putImageData(img, 0, 0); }
function rrect(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
function wrapDraw(s, fn) { for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) fn(ox, oy); }

const texDetail = () => canvasTex('detail', 256, (x, s) => { const n = periodicNoise(s, 8, 3); grayImage(x, s, k => 178 + n[k] * 77); });
const texPlaster = () => canvasTex('plaster', 256, (x, s) => {
  const n = periodicNoise(s, 6, 11), m = periodicNoise(s, 24, 5, 2); grayImage(x, s, k => 205 + n[k] * 40 + m[k] * 12);
});
const texCobble = () => canvasTex('cobble', 512, (x, s) => {
  x.fillStyle = '#5e5b55'; x.fillRect(0, 0, s, s);
  const r = mulberry(7), N = 12, cell = s / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const cx = (i + .5 + (r() - .5) * .3 + (j % 2) * .5) * cell, cy = (j + .5 + (r() - .5) * .25) * cell;
    const w = cell * (.8 + r() * .1), h = cell * (.74 + r() * .14), g = Math.round(168 + r() * 70);
    wrapDraw(s, (ox, oy) => {
      x.fillStyle = `rgb(${g},${g - 3},${g - 9})`; rrect(x, cx - w / 2 + ox, cy - h / 2 + oy, w, h, cell * .24); x.fill();
      x.fillStyle = 'rgba(255,255,255,.12)'; rrect(x, cx - w / 2 + ox + 3, cy - h / 2 + oy + 3, w * .55, h * .35, cell * .15); x.fill();
    });
  }
  const img = x.getImageData(0, 0, s, s), r2 = mulberry(9); for (let k = 0; k < img.data.length; k += 4) { const v = (r2() - .5) * 22; img.data[k] += v; img.data[k + 1] += v; img.data[k + 2] += v; } x.putImageData(img, 0, 0);
});
const texBrick = () => canvasTex('brick', 512, (x, s) => {
  x.fillStyle = '#6a6762'; x.fillRect(0, 0, s, s);
  const r = mulberry(21), rows = 10, cols = 4, bh = s / rows, bw = s / cols;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols + 1; i++) {
    const g = Math.round(150 + r() * 80), ox = (j % 2) * bw / 2;
    x.fillStyle = `rgb(${g},${g - 2},${g - 6})`; x.fillRect(i * bw - ox + 3, j * bh + 3, bw - 6, bh - 6);
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i * bw - ox + 3, j * bh + bh - 9, bw - 6, 6);
  }
  const img = x.getImageData(0, 0, s, s), n = periodicNoise(s, 16, 4, 3); for (let k = 0; k < s * s; k++) { const v = (n[k] - .5) * 50; img.data[k * 4] += v; img.data[k * 4 + 1] += v; img.data[k * 4 + 2] += v; } x.putImageData(img, 0, 0);
});
const texRoof = () => canvasTex('roof', 256, (x, s) => {
  x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, s, s);
  const rows = 8, rh = s / rows, r = mulberry(3);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < 9; i++) { const g = Math.round(195 + r() * 55), w = s / 8, ox = (j % 2) * w / 2; x.fillStyle = `rgb(${g},${g},${g})`; rrect(x, i * w - ox + 1, j * rh + 1, w - 2, rh - 1, 4); x.fill(); }
    const gr = x.createLinearGradient(0, j * rh + rh * .6, 0, j * rh + rh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = gr; x.fillRect(0, j * rh, s, rh);
  }
});
const texWood = () => canvasTex('wood', 256, (x, s) => {
  const n = periodicNoise(s, 4, 13, 3);
  grayImage(x, s, k => { const i = k % s, j = (k / s) | 0; const plank = Math.floor(i / (s / 4)); const grain = Math.sin((j / s) * 60 + n[k] * 12 + plank * 3) * 14; const edge = (i % (s / 4)) < 3 ? -60 : 0; return 170 + grain + edge + n[k] * 30; });
});
const texWaterNormal = () => canvasTex('waterN', 256, (x, s) => {
  const n = periodicNoise(s, 6, 41, 3), hgt = new Float32Array(s * s);
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const u = i / s * TAU, v = j / s * TAU; hgt[j * s + i] = Math.sin(u * 3 + v) * .35 + Math.sin(v * 4 - u * 2) * .25 + n[j * s + i] * 1.4; }
  const img = x.createImageData(s, s), H = (i, j) => hgt[((j + s) % s) * s + ((i + s) % s)];
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * 3, dy = (H(i, j + 1) - H(i, j - 1)) * 3, l = Math.hypot(dx, dy, 1), k = (j * s + i) * 4;
    img.data[k] = (-dx / l * .5 + .5) * 255; img.data[k + 1] = (-dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
});
const texDot = () => canvasTex('dot', 64, (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, true);
const texLeaf = () => canvasTex('leafp', 64, (x, s) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s / 2, s / 2, s * .42, s * .2, .6, 0, TAU); x.fill(); }, true);
const texCloud = () => canvasTex('cloud', 256, (x, s) => {
  const r = mulberry(5);
  for (let i = 0; i < 22; i++) {
    const cx = s * (.3 + r() * .4), cy = s * (.4 + r() * .2), rad = s * (.08 + r() * .12);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
  x.globalCompositeOperation = 'destination-in'; const m = x.createRadialGradient(s / 2, s / 2, s * .2, s / 2, s / 2, s * .5); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = m; x.fillRect(0, 0, s, s);
}, true);
const texRuneRing = () => canvasTex('runering', 256, (x, s) => {
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(s / 2, s / 2, s * .44, 0, TAU); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(s / 2, s / 2, s * .36, 0, TAU); x.stroke();
  const r = mulberry(17), g = s * .028;
  x.lineWidth = 2.5; x.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU; x.save(); x.translate(s / 2 + Math.cos(a) * s * .4, s / 2 + Math.sin(a) * s * .4); x.rotate(a + Math.PI / 2);
    x.beginPath(); x.moveTo(0, -g); x.lineTo(0, g);
    for (let k = 0; k < 2; k++) { const y = (r() - .5) * g * 1.6, d = r() < .5 ? -1 : 1; x.moveTo(0, y); x.lineTo(d * g * .8, y + (r() - .5) * g); }
    x.stroke(); x.restore();
  }
}, true);
