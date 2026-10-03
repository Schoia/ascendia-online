'use strict';
/* Ascendia Online · rendering, sky & day/night, post-processing, and world/floor construction. */

/* ================= renderer ================= */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(SETTINGS.fov, 1, .1, 2600);
const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, .74); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, .88);
sun.castShadow = true;
const sc0 = sun.shadow.camera; sc0.left = -50; sc0.right = 50; sc0.top = 50; sc0.bottom = -50; sc0.near = 1; sc0.far = 320; sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
scene.add(sun); scene.add(sun.target);
const sunOffset = new THREE.Vector3(70, 90, 40);
scene.fog = new THREE.Fog(0xbfe3f2, 90, 560);

let composer = null, bloomPass = null, hdr = false;
function setupComposer() {
  if (composer || !THREE.EffectComposer || !THREE.UnrealBloomPass || !THREE.RenderPass) return;
  try {
    const gl = renderer.getContext(), gl2 = renderer.capabilities.isWebGL2;
    hdr = gl2 && !!gl.getExtension('EXT_color_buffer_float');
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType };
    const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = (gl2 && THREE.WebGLMultisampleRenderTarget) ? new THREE.WebGLMultisampleRenderTarget(sz.x, sz.y, opts) : new THREE.WebGLRenderTarget(sz.x, sz.y, opts);
    composer = new THREE.EffectComposer(renderer, rt);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), hdr ? .8 : .4, .55, hdr ? 1.45 : .97);
    composer.addPass(bloomPass);
  } catch (e) { console.warn('Bloom unavailable', e); composer = null; }
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q().pr));
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = SETTINGS.fov; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
function applyQuality() {
  const q = Q();
  renderer.shadowMap.enabled = q.shadow > 0;
  if (q.shadow > 0 && sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
  if (q.bloom) setupComposer();
  resize();
}
function renderFrame() { if (composer && Q().bloom) composer.render(); else renderer.render(scene, camera); }
window.addEventListener('resize', resize);

/* ================= sky, stars, sun/moon, clouds ================= */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x5fa8e8) }, mid: { value: new THREE.Color(0xd8f0ff) }, bot: { value: new THREE.Color(0x2b4a78) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xffd8a0) }, glow: { value: .4 } },
  vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,mid,bot,sunCol,sunDir;uniform float glow;varying vec3 vP;void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=h>0.?mix(mid,top,smoothstep(0.,.55,h)):mix(mid,bot,smoothstep(0.,-.5,h));float s=max(dot(d,sunDir),0.);c+=sunCol*(pow(s,5.)*.35+pow(s,90.)*.8)*glow;gl_FragColor=vec4(c,1.);}',
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat); scene.add(sky);
const stars = (() => {
  const n = 1500, pos = new Float32Array(n * 3), r = mulberry(77);
  for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * s * 1350; pos[i * 3 + 1] = u * 1350; pos[i * 3 + 2] = Math.sin(a) * s * 1350; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p); return p;
})();
const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDot(), color: 0xfff0c8, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
sunSpr.scale.set(190, 190, 1); scene.add(sunSpr);
const moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDot(), color: 0xdfe8ff, fog: false, transparent: true, depthWrite: false }));
moonSpr.scale.set(70, 70, 1); scene.add(moonSpr);
const cloudMat = new THREE.SpriteMaterial({ map: texCloud(), color: 0xffffff, transparent: true, opacity: .92, depthWrite: false, fog: false });
const clouds = new THREE.Group(); scene.add(clouds);
(() => {
  const r = mulberry(99);
  for (let i = 0; i < 80; i++) {
    const s = new THREE.Sprite(cloudMat), a = r() * TAU, below = i < 52;
    const d = below ? 140 + r() * 700 : 760 + r() * 420;
    s.position.set(Math.cos(a) * d, below ? -55 - r() * 120 : -40 + r() * 110, Math.sin(a) * d);
    const sz = below ? 150 + r() * 220 : 260 + r() * 320; s.scale.set(sz, sz * .5, 1); clouds.add(s);
  }
})();

/* ================= wind (grass & leaves sway in the shader) ================= */
const WIND = { uTime: { value: 0 } };
function addWind(mat, strength, hscale) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = WIND.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float wk = max(position.y, 0.0) * ${hscale.toFixed(3)};
      float ws = sin(uTime * 1.7 + ip.x * .13 + ip.z * .11) + .45 * sin(uTime * 3.3 + ip.x * .37 + ip.z * .2);
      transformed.x += ws * wk * ${strength.toFixed(3)};
      transformed.z += cos(uTime * 1.3 + ip.z * .17) * wk * ${(strength * .6).toFixed(3)};`);
  };
  mat.customProgramCacheKey = () => 'wind' + strength + '_' + hscale;
  return mat;
}
function grassGeo() {
  return cg('grassTuft', () => {
    const pos = [], col = [], nor = [], r = mulberry(31);
    for (let b = 0; b < 6; b++) {
      const a = r() * Math.PI, ox = (r() - .5) * .35, oz = (r() - .5) * .35, w = .05, h = .3 + r() * .32, dx = Math.cos(a) * w, dz = Math.sin(a) * w, lx = (r() - .5) * .3, lz = (r() - .5) * .3;
      pos.push(ox - dx, 0, oz - dz, ox + dx, 0, oz + dz, ox + lx, h, oz + lz);
      col.push(.68, .68, .68, .68, .68, .68, 1.15, 1.15, 1.08);
      nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  });
}

/* ================= ambient particles ================= */
const AMB = { pts: null, v: null, n: 0, type: '', flies: null };
const AMB_CFG = { pollen: { c: 0xfff6c8, s: .22, add: false, op: .8 }, leaves: { c: 0xd98a3a, s: .5, add: false, op: .95, leaf: true }, sand: { c: 0xe8d4a0, s: .2, add: false, op: .55 }, snow: { c: 0xffffff, s: .34, add: false, op: .92 }, spores: { c: 0x9aff7a, s: .3, add: true, op: .85 }, embers: { c: 0xff8a3a, s: .3, add: true, op: 1 } };
function buildAmbient() {
  for (const k of ['pts', 'flies']) if (AMB[k]) { scene.remove(AMB[k]); AMB[k].geometry.dispose(); AMB[k].material.dispose(); AMB[k] = null; }
  const th = F.theme, type = th.parts, cfg = AMB_CFG[type], n = Q().particles, r = mulberry(F.seed + 5);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - .5) * 80; pos[i * 3 + 1] = r() * 30; pos[i * 3 + 2] = (r() - .5) * 80;
    const vy = { pollen: (r() - .5) * .3, leaves: -.6 - r() * .6, sand: (r() - .5) * .4, snow: -1 - r() * .8, spores: .25 + r() * .4, embers: .8 + r() * 1.4 }[type];
    vel[i * 3] = type === 'sand' ? 6 + r() * 4 : (r() - .5) * .6; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = type === 'sand' ? 1 + r() : (r() - .5) * .6;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: cfg.c, size: cfg.s, map: cfg.leaf ? texLeaf() : texDot(), transparent: true, opacity: cfg.op, depthWrite: false, blending: cfg.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  if (cfg.add) mat.color.multiplyScalar(2.4);
  AMB.pts = new THREE.Points(g, mat); AMB.pts.frustumCulled = false; scene.add(AMB.pts);
  AMB.v = vel; AMB.n = n; AMB.type = type;
  if (th.flies) {
    const fn = 80, fp = new Float32Array(fn * 3); for (let i = 0; i < fn; i++) { fp[i * 3] = (r() - .5) * 70; fp[i * 3 + 1] = .5 + r() * 3; fp[i * 3 + 2] = (r() - .5) * 70; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const fm = new THREE.PointsMaterial({ color: 0xd8ff6a, size: .22, map: texDot(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); fm.color.multiplyScalar(3);
    AMB.flies = new THREE.Points(fg, fm); AMB.flies.frustumCulled = false; scene.add(AMB.flies);
  }
}
function updateAmbient(dt, cx, cy, cz) {
  if (!AMB.pts) return;
  AMB.pts.visible = !inArena; if (AMB.flies) AMB.flies.visible = !inArena;
  if (inArena) return;
  const a = AMB.pts.geometry.attributes.position, p = a.array, v = AMB.v, t = NOW;
  for (let i = 0; i < AMB.n; i++) {
    const k = i * 3, sway = AMB.type === 'sand' ? 0 : Math.sin(t * 1.3 + i) * .4;
    p[k] += (v[k] + sway) * dt; p[k + 1] += v[k + 1] * dt; p[k + 2] += (v[k + 2] + Math.cos(t * 1.1 + i * .7) * .3) * dt;
    if (p[k] - cx > 40) p[k] -= 80; else if (p[k] - cx < -40) p[k] += 80;
    if (p[k + 2] - cz > 40) p[k + 2] -= 80; else if (p[k + 2] - cz < -40) p[k + 2] += 80;
    if (p[k + 1] > cy + 26) p[k + 1] -= 30; else if (p[k + 1] < cy - 4) p[k + 1] += 30;
  }
  a.needsUpdate = true;
  if (AMB.flies) {
    const fa = AMB.flies.geometry.attributes.position, fp = fa.array;
    for (let i = 0; i < fp.length / 3; i++) {
      const k = i * 3; fp[k] += Math.sin(t * .7 + i) * .5 * dt; fp[k + 1] += Math.sin(t * 1.3 + i * 2) * .3 * dt; fp[k + 2] += Math.cos(t * .6 + i) * .5 * dt;
      if (fp[k] - cx > 35) fp[k] -= 70; else if (fp[k] - cx < -35) fp[k] += 70; if (fp[k + 2] - cz > 35) fp[k + 2] -= 70; else if (fp[k + 2] - cz < -35) fp[k + 2] += 70;
      const gy = terrainH(fp[k], fp[k + 2]); if (fp[k + 1] < gy + .4 || fp[k + 1] > gy + 4) fp[k + 1] = gy + 1 + Math.random() * 2;
    }
    fa.needsUpdate = true; AMB.flies.material.opacity = (1 - DAYK) * (.55 + .45 * Math.sin(t * 2.3));
  }
}

/* ================= day / night ================= */
const DAY_LEN = 1440; // seconds per in-game day; based on the real clock so every player shares it
let DAYK = 1, DUSK = 0, DAYPHASE = .5;
let NIGHT = []; // {m, d, n}: emissive intensity by day/night
let DAY_OFFSET = 0;
const dayPhase = () => ((Date.now() / 1000) / DAY_LEN + .35 + DAY_OFFSET) % 1;
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color(), _sd = new THREE.Vector3(), _ld = new THREE.Vector3();
function updateDayNight() {
  if (!F || inArena) return;
  const th = F.theme, p = dayPhase(); DAYPHASE = p;
  const ang = (p - .25) * TAU, elev = Math.sin(ang);
  DAYK = smooth(-.14, .2, elev); DUSK = clamp(1 - Math.abs(elev) / .3, 0, 1);
  _sd.set(Math.cos(ang), elev, .35).normalize();
  if (DAYK > .5) _ld.set(Math.cos(ang), Math.max(.3, elev), .35); else _ld.set(-Math.cos(ang), Math.max(.35, -elev), -.3);
  sunOffset.copy(_ld.normalize()).multiplyScalar(150);
  sun.intensity = lerp(.3, th.k === 'ember' ? .74 : .88, DAYK);
  sun.color.setHex(0x8fa4ff).lerp(_c1.setHex(th.k === 'ember' ? 0xffb080 : 0xfff1dc), DAYK).lerp(_c2.setHex(0xffa060), DUSK * .55 * DAYK);
  hemi.intensity = lerp(.32, .74, DAYK);
  hemi.color.setHex(0x5a6a9a).lerp(_c1.setHex(0xdfefff), DAYK);
  hemi.groundColor.setHex(th.hemiG).multiplyScalar(lerp(.45, 1, DAYK));
  const top = _c1.setHex(0x050914).lerp(_c3.setHex(th.sky[0]), DAYK);
  const mid = _c2.setHex(0x141d38).lerp(_c3.setHex(th.sky[1]), DAYK).lerp(_c3.setHex(0xf09060), DUSK * .5);
  top.lerp(_c3.setHex(0x5a6aa8), DUSK * .25);
  skyMat.uniforms.top.value.copy(top); skyMat.uniforms.mid.value.copy(mid);
  skyMat.uniforms.bot.value.setHex(0x1a2a50).lerp(_c3.setHex(0x04060c), 1 - DAYK);
  skyMat.uniforms.sunDir.value.copy(_sd); skyMat.uniforms.glow.value = (.3 + DUSK * .9) * smooth(-.2, .05, elev);
  scene.fog.color.copy(mid).lerp(_c3.setHex(th.fog), DAYK * .65);
  stars.material.opacity = clamp(1 - DAYK * 1.5, 0, 1);
  sunSpr.position.copy(_sd).multiplyScalar(1250); sunSpr.material.color.setHex(0xffe8b0).multiplyScalar(hdr ? 2.2 : 1);
  moonSpr.position.copy(_sd).multiplyScalar(-1250); moonSpr.position.z += 200; moonSpr.material.opacity = 1 - DAYK;
  const cl = lerp(.22, 1, DAYK); cloudMat.color.setRGB(cl, cl * lerp(.9, 1, DAYK), cl * lerp(1.1, 1, DAYK)).lerp(_c3.setHex(0xffb890), DUSK * .35 * DAYK);
  for (const nm of NIGHT) nm.m.emissiveIntensity = lerp(nm.n, nm.d, DAYK);
}
function applyAtmos() {
  const out = !inArena;
  sky.visible = stars.visible = clouds.visible = sunSpr.visible = moonSpr.visible = out;
  if (inArena) {
    scene.fog.color.setHex(0x14161e); scene.fog.near = 40; scene.fog.far = 150;
    hemi.intensity = .5; hemi.color.setHex(0xb0c0ff); hemi.groundColor.setHex(0x302820);
    sun.intensity = .32; sun.color.setHex(0xffd0a0); sunOffset.set(40, 90, 30); renderer.setClearColor(0x0a0b10);
  } else { scene.fog.near = 90; scene.fog.far = 560; updateDayNight(); }
}

/* ================= terrain ================= */
function placeName(rng) { const a = ['Ash', 'Bryn', 'Cal', 'Dun', 'Eld', 'Fen', 'Gal', 'Hal', 'Iver', 'Kel', 'Lor', 'Mar', 'Nor', 'Oak', 'Pell', 'Quill', 'Rav', 'Sel', 'Thorn', 'Ul', 'Vey', 'Wyn', 'Brae', 'Cor'], b = ['ford', 'mere', 'wick', 'hold', 'vale', 'crest', 'haven', 'gate', 'fall', 'reach', 'stead', 'moor', 'brook', 'well']; return a[(rng() * a.length) | 0] + b[(rng() * b.length) | 0]; }
function makeFloor(n) {
  const rng = mulberry(n * 7919 + 17), theme = THEMES[(n - 1) % THEMES.length], mir = n % 2 === 0 ? -1 : 1;
  const town = { x: 0, z: 150, r: 38, city: true, name: n === 1 ? 'Firstlight City' : placeName(rng) + ' City' };
  const v1 = { x: -130 * mir, z: 25, r: 18, name: n === 1 ? 'Mossbrook Village' : placeName(rng) + ' Village' };
  const v2 = { x: 130 * mir, z: -75, r: 18, name: n === 1 ? 'Lanternreach' : placeName(rng) };
  const tower = { x: 0, z: -165, r: 18 }, lake = { x: 105 * mir, z: 72, r: 30 };
  const P2 = (a, b) => ({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
  return {
    n, seed: n * 31 + 7, theme, town, v1, v2, tower, lake,
    paths: [P2(town, tower), P2(town, v1), P2(v1, tower), P2(town, v2), P2(v2, tower)],
    flat: [{ x: town.x, z: town.z, r: town.r + 4, b: 26 }, { x: v1.x, z: v1.z, r: v1.r + 3, b: 18 }, { x: v2.x, z: v2.z, r: v2.r + 3, b: 18 }, { x: tower.x, z: tower.z, r: tower.r + 12, b: 20 }],
    colliders: [], npcs: [], anim: [],
    zones: [{ x: town.x, z: town.z, r: town.r, name: town.name, city: true }, { x: v1.x, z: v1.z, r: v1.r + 4, name: v1.name }, { x: v2.x, z: v2.z, r: v2.r + 4, name: v2.name }],
    bossName: n <= BOSS_NAMES.length ? BOSS_NAMES[n - 1] : placeName(rng) + ', ' + ['Lord', 'Tyrant', 'Warden', 'Sovereign', 'Devourer'][n % 5] + ' of Floor ' + n,
  };
}
function pathF(x, z) { let pf = 0; for (const p of F.paths) { const d = segDist(x, z, p.ax, p.az, p.bx, p.bz); if (d < 8) pf = Math.max(pf, 1 - smooth(2.6, 6, d)); } return pf; }
function terrainH(x, z) {
  const s = F.seed, d = Math.hypot(x, z);
  let h = (fbm(x * .011, z * .011, s) - .5) * 30 + (fbm(x * .045, z * .045, s + 7) - .5) * 4;
  h *= .35 + .9 * smooth(40, 200, d);
  h += 5 * smooth(150, 215, d) * fbm(x * .03, z * .03, s + 3);
  const L = F.lake, dl = Math.hypot(x - L.x, z - L.z);
  h = lerp(-4.5, h, smooth(L.r * .55, L.r * 1.2, dl));
  const pf = pathF(x, z); h = lerp(h, h * .2, pf);
  for (const zn of F.flat) { const dz = Math.hypot(x - zn.x, z - zn.z); if (dz < zn.r + zn.b) h = lerp(0, h, smooth(zn.r, zn.r + zn.b, dz)); }
  return h;
}
const groundAt = (x, z) => inArena ? 0 : terrainH(x, z);
function inFlat(x, z, pad) { for (const zn of F.flat) if (Math.hypot(x - zn.x, z - zn.z) < zn.r + pad) return true; return false; }
function safeAt(x, z, pad = 0) { if (inArena) return null; for (const zn of zones) if (Math.hypot(x - zn.x, z - zn.z) < zn.r + pad) return zn; return null; }
function disposeGroup(g) { g.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }); }
const REP = {};
function rep(base, x, y) { const k = base.uuid + x + 'x' + y; if (REP[k]) return REP[k]; const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return REP[k] = t; }
const INTER = []; // interactables {x,z,r,label,act}

function buildWorld() {
  const th = F.theme, rng = mulberry(F.seed), W = new THREE.Group(), q = Q();
  NIGHT = [];
  // terrain mesh
  const SIZE = 480, SEG = 170, geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const c0 = new THREE.Color(th.g[0]), c1 = new THREE.Color(th.g[1]), chi = new THREE.Color(th.hi), cp = new THREE.Color(th.path), cs = new THREE.Color(th.sand), cr = new THREE.Color(th.rock), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z); let y;
    if (d > R + 1) { y = -26 - (d - R) * .4 - fbm(x * .05, z * .05, 3) * 10; cc.copy(cr).multiplyScalar(.75); }
    else {
      y = terrainH(x, z);
      cc.copy(c0).lerp(c1, fbm(x * .05, z * .05, F.seed + 21)); cc.lerp(chi, smooth(5, 14, y));
      const pf = pathF(x, z); if (pf > 0) cc.lerp(cp, pf * .9);
      const dl = Math.hypot(x - F.lake.x, z - F.lake.z); if (dl < F.lake.r * 1.35) cc.lerp(cs, 1 - smooth(F.lake.r * .9, F.lake.r * 1.35, dl));
      if (d > R - 5) cc.lerp(cr, smooth(R - 5, R + 1, d));
      for (const zn of F.flat) { const dz = Math.hypot(x - zn.x, z - zn.z); if (dz < zn.r) cc.lerp(cp, .35 * (1 - dz / zn.r)); }
      const v = (hash2(x, z, 5) - .5) * .05; cc.r += v; cc.g += v; cc.b += v;
    }
    pos.setY(i, y); cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, map: rep(texDetail(), 52, 52) }));
  terrain.receiveShadow = true; W.add(terrain);
  const under = new THREE.Mesh(new THREE.ConeGeometry(R + 4, 120, 40, 4, true), wm(th.rock, { map: rep(texBrick(), 30, 6) })); under.rotation.x = Math.PI; under.position.y = -86; W.add(under);
  // water
  const lava = th.k === 'ember';
  const water = new THREE.Mesh(new THREE.CircleGeometry(F.lake.r * 1.15, 48), new THREE.MeshStandardMaterial({ color: th.water, transparent: true, opacity: lava ? .95 : .8, roughness: lava ? .6 : .08, metalness: .1, normalMap: rep(texWaterNormal(), 5, 5), normalScale: new THREE.Vector2(.7, .7), emissive: lava ? th.water : 0x000000, emissiveIntensity: lava ? 1.6 : 0 }));
  water.rotation.x = -Math.PI / 2; water.position.set(F.lake.x, -1.3, F.lake.z); W.add(water);
  F.anim.push(dt => { const t = water.material.normalMap; t.offset.x = (t.offset.x + dt * (lava ? .004 : .012)) % 1; t.offset.y = (t.offset.y + dt * (lava ? .003 : .008)) % 1; });
  // ceiling (the floor above) & outer pillars
  const ceil = new THREE.Mesh(new THREE.CylinderGeometry(R + 30, R + 30, 14, 64), wm(0x4a4c55, { map: rep(texBrick(), 40, 2) })); ceil.position.y = CEIL + 7; W.add(ceil);
  const o = new THREE.Object3D();
  const stal = new THREE.InstancedMesh(Gk(1, 1, 5), wm(0x55575f), 90);
  for (let i = 0; i < 90; i++) { const a = rng() * TAU, d = Math.sqrt(rng()) * (R + 10); o.scale.set(4 + rng() * 8, 10 + rng() * 24, 4 + rng() * 8); o.position.set(Math.cos(a) * d, CEIL - o.scale.y / 2 + 1, Math.sin(a) * d); o.rotation.set(Math.PI, rng() * TAU, 0); o.updateMatrix(); stal.setMatrixAt(i, o.matrix); }
  W.add(stal);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU + .1, x = Math.cos(a) * (R + 18), z = Math.sin(a) * (R + 18);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, CEIL + 70, 10), wm(0x8a8c94, { map: rep(texBrick(), 6, 14) })); p.position.set(x, CEIL / 2 - 35, z); W.add(p);
    const cap = new THREE.Mesh(Gb(16, 6, 16), wm(0x6a6c74, { map: rep(texBrick(), 3, 1) })); cap.position.set(x, CEIL - 3, z); W.add(cap);
  }
  buildTrees(W, rng, q);
  // rocks
  const rocks = new THREE.InstancedMesh(Gd(1), wm(th.rock, { map: rep(texDetail(), 2, 2) }), 120); rocks.castShadow = rocks.receiveShadow = true; let rk = 0;
  for (let i = 0; i < 450 && rk < 120; i++) { const a = rng() * TAU, d = Math.sqrt(rng()) * (R - 6), x = Math.cos(a) * d, z = Math.sin(a) * d; if (inFlat(x, z, 2) || pathF(x, z) > .2) continue; const s = .6 + rng() * rng() * 3.2; o.position.set(x, terrainH(x, z) + s * .3, z); o.scale.set(s, s * .7, s * 1.1); o.rotation.set(rng(), rng() * 3, rng()); o.updateMatrix(); rocks.setMatrixAt(rk++, o.matrix); if (s > 1.4) F.colliders.push({ x, z, r: s * .9 }); }
  rocks.count = rk; W.add(rocks);
  // grass & flowers
  if (th.grass) {
    const gmat = addWind(new THREE.MeshStandardMaterial({ color: th.grass, vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), .22, 1.2);
    const gm = new THREE.InstancedMesh(grassGeo(), gmat, q.grass); let gi = 0; const gc = new THREE.Color();
    for (let i = 0; i < q.grass * 2.2 && gi < q.grass; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * (R - 6), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inFlat(x, z, 0) || pathF(x, z) > .3 || Math.hypot(x - F.lake.x, z - F.lake.z) < F.lake.r * 1.05) continue;
      const s = .6 + rng() * .55; o.position.set(x, terrainH(x, z) - .02, z); o.scale.set(s, s * (.75 + rng() * .4), s); o.rotation.set(0, rng() * TAU, 0); o.updateMatrix(); gm.setMatrixAt(gi, o.matrix);
      gc.setHSL(0, 0, .8 + rng() * .35); gm.setColorAt(gi++, gc);
    }
    gm.count = gi; if (gm.instanceColor) gm.instanceColor.needsUpdate = true; W.add(gm);
  }
  if (th.flowers) {
    const n = q.flowers, stems = new THREE.InstancedMesh(Gc(.015, .015, .4, 3), wm(0x3f7a2a), n), heads = new THREE.InstancedMesh(Gi(.09), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: .6 }), n); let fi = 0; const fc = new THREE.Color();
    for (let i = 0; i < n * 4 && fi < n; i++) {
      const cx = (rng() - .5) * 2 * (R - 20), cz = (rng() - .5) * 2 * (R - 20); if (Math.hypot(cx, cz) > R - 10 || inFlat(cx, cz, 2) || pathF(cx, cz) > .1) continue;
      if (fbm(cx * .03, cz * .03, F.seed + 41) < .52) continue;
      const y = terrainH(cx, cz); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
      o.position.set(cx, y + .2, cz); o.updateMatrix(); stems.setMatrixAt(fi, o.matrix);
      o.position.set(cx, y + .42, cz); o.updateMatrix(); heads.setMatrixAt(fi, o.matrix);
      fc.setHex(th.flowers[(rng() * th.flowers.length) | 0]); heads.setColorAt(fi++, fc);
    }
    stems.count = heads.count = fi; if (heads.instanceColor) heads.instanceColor.needsUpdate = true; W.add(stems); W.add(heads);
  }
  buildTown(W, F.town, true, rng); buildTown(W, F.v1, false, rng); buildTown(W, F.v2, false, rng);
  buildTower(W);
  return W;
}
function buildTrees(W, rng, q) {
  const th = F.theme, trees = [], o = new THREE.Object3D();
  for (let i = 0; i < 2000 && trees.length < q.trees; i++) {
    const a = rng() * TAU, d = Math.sqrt(rng()) * (R - 8), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (inFlat(x, z, 4) || pathF(x, z) > .15 || Math.hypot(x - F.lake.x, z - F.lake.z) < F.lake.r * 1.25) continue;
    if (fbm(x * .018, z * .018, F.seed + 11) < .5 && rng() > .06) continue;
    trees.push([x, z, .8 + rng() * .7, rng() * TAU]);
  }
  const n = trees.length, type = th.tree;
  const parts = { oak: [[Gc(.32, .55, 3.6, 7), 'trunk'], [Gi(2.4), 'leaf', 0, 4.6, 0, 1], [Gi(1.9), 'leaf', 1.2, 4.0, .4, .9], [Gi(1.7), 'leaf', -1, 4.3, -.6, .9], [Gi(1.5), 'leaf', .2, 5.9, -.2, .8]],
    pine: [[Gc(.3, .45, 3.4, 7), 'trunk'], [Gk(2.7, 4.2, 8), 'leaf', 0, 3.6, 0, 1], [Gk(2.1, 3.6, 8), 'leaf', 0, 5.6, 0, 1], [Gk(1.4, 3, 8), 'leaf', 0, 7.4, 0, 1]],
    cactus: [[Gc(.5, .58, 5, 9), 'trunk'], [Gc(.32, .36, 2, 8), 'trunk', .9, 3.1, 0, 1], [Gc(.32, .36, 1.6, 8), 'trunk', -.85, 2.5, .1, 1], [Gs(.5, 9, 6), 'trunk', 0, 5, 0, 1]],
    dead: [[Gc(.22, .55, 6, 6), 'trunk'], [Gc(.07, .14, 2.4, 5), 'trunk', .8, 4.5, 0, 1], [Gc(.06, .12, 2, 5), 'trunk', -.7, 3.8, .3, 1], [Go(.35), 'leaf', 0, 6.2, 0, 1]],
    willow: [[Gc(.4, .7, 4, 7), 'trunk'], [Gs(3, 10, 7), 'leaf', 0, 5, 0, 1], [Gc(2.6, 3.3, 3.2, 10), 'leaf', 0, 3.4, 0, 1]] }[type];
  const trunkMat = wm(th.trunk, { map: rep(texWood(), 1, 2) });
  const leafMat = addWind(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: .85 }), .05, .22);
  const meshes = parts.map(p => { const im = new THREE.InstancedMesh(p[0], p[1] === 'trunk' ? (type === 'cactus' ? wm(0x4f8a46, { map: rep(texDetail(), 1, 2) }) : trunkMat) : leafMat, n); im.castShadow = true; im.receiveShadow = p[1] !== 'leaf'; W.add(im); return im; });
  const lc = new THREE.Color(), snow = new THREE.Color(0xf4f8ff), ember = new THREE.Color(0xff8a3a);
  for (let i = 0; i < n; i++) {
    const [x, z, s, r] = trees[i], y = terrainH(x, z);
    parts.forEach((p, j) => {
      const ox = p[2] || 0, oy = p[3] != null ? p[3] : (p[0].parameters.height || 3) / 2, oz = p[4] || 0, sc = p[5] || 1;
      const cx = Math.cos(r), sx = Math.sin(r);
      o.position.set(x + (ox * cx + oz * sx) * s, y + oy * s, z + (-ox * sx + oz * cx) * s);
      o.rotation.set(type === 'dead' && j > 0 && j < 3 ? (j === 1 ? .9 : -.8) : 0, r, type === 'cactus' && j === 1 ? 0 : 0);
      o.scale.setScalar(s * sc); o.updateMatrix(); meshes[j].setMatrixAt(i, o.matrix);
      if (p[1] === 'leaf') { lc.setHex(th.leaf[(i + j) % 3]); if (th.k === 'frost' && j > 1) lc.lerp(snow, .6); if (type === 'dead') lc.copy(ember).multiplyScalar(2.5); meshes[j].setColorAt(i, lc); }
    });
    F.colliders.push({ x, z, r: (type === 'cactus' ? .8 : .65) * s });
  }
  meshes.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
}

/* ================= settlements ================= */
function npcAt(W, x, z, faceX, faceZ, opts, name, extra) {
  const A = buildAvatar(opts); A.g.position.set(x, 0, z); A.g.rotation.y = Math.atan2(faceX - x, faceZ - z); W.add(A.g);
  F.npcs.push(Object.assign({ x, z, h: 2.5, name, A }, extra || {}));
  F.colliders.push({ x, z, r: .7 });
  return A;
}
function lampMat() { const m = wm(0xfff0c0, { emissive: 0xffc060, emissiveIntensity: 1 }); NIGHT.push({ m, d: .5, n: 2.2 }); return m; }
function windowMat() { const m = wm(0x3a2a18, { emissive: 0xffb050, emissiveIntensity: .3 }); NIGHT.push({ m, d: .15, n: 1.1 }); return m; }
function buildTown(W, t, city, rng) {
  const th = F.theme, stone = wm(0xb7b0a2, { map: rep(texCobble(), city ? 5 : 3, city ? 5 : 3) }), stone2 = wm(0x8f897d, { map: rep(texBrick(), 2, 1) });
  const plasterT = texPlaster(), roofT = rep(texRoof(), 3, 2), wood = wm(0x6a4a30, { map: rep(texWood(), 1, 1) });
  const pr = city ? 14 : 8, lamp = lampMat(), win = windowMat();
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr + .4, .4, 48), stone); plaza.position.set(t.x, -.08, t.z); plaza.receiveShadow = true; W.add(plaza);
  const ring = new THREE.Mesh(new THREE.RingGeometry(pr * .55, pr * .6, 48), stone2); ring.rotation.x = -Math.PI / 2; ring.position.set(t.x, .13, t.z); W.add(ring);
  if (city) {
    const segs = 44, wallM = wm(th.wall[1], { map: rep(texBrick(), 1.5, 1.5) }), towerM = wm(th.wall[0], { map: rep(texBrick(), 3, 2) });
    for (let i = 0; i < segs; i++) {
      const a = (i + .5) / segs * TAU; let gap = false;
      for (const ga of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const dd = Math.abs(((a - ga + Math.PI) % TAU + TAU) % TAU - Math.PI); if (dd < .1) gap = true; }
      if (gap) continue;
      const x = t.x + Math.cos(a) * t.r, z = t.z + Math.sin(a) * t.r;
      const wl = new THREE.Mesh(Gb(TAU * t.r / segs * 1.06, 6, 1.4), wallM); wl.position.set(x, 2.6, z); wl.rotation.y = -a - Math.PI / 2; wl.castShadow = wl.receiveShadow = true; W.add(wl);
      for (const k of [-1, 1]) { const cr = new THREE.Mesh(Gb(1.1, 1, 1.6), wallM); cr.position.set(x + Math.sin(a) * k * 1.4, 6.1, z - Math.cos(a) * k * 1.4); cr.rotation.y = -a - Math.PI / 2; W.add(cr); }
      F.colliders.push({ x, z, r: 2.2 });
      if (i % 4 === 0) {
        const tw = new THREE.Mesh(Gc(2.2, 2.5, 9, 10), towerM); tw.position.set(x, 4.5, z); tw.castShadow = true; W.add(tw);
        const rf = new THREE.Mesh(Gk(3, 3.5, 10), wm(th.roof[0], { map: roofT })); rf.position.set(x, 10.7, z); rf.castShadow = true; W.add(rf);
        const fl = new THREE.Mesh(Gb(.05, 1.2, .8), wm(0xc23b3b, { side: THREE.DoubleSide })); fl.position.set(x, 13.1, z + .4); W.add(fl); const pole = new THREE.Mesh(Gc(.04, .04, 2, 4), wm(0x3a3a3a)); pole.position.set(x, 12.9, z); W.add(pole);
        F.colliders.push({ x, z, r: 2.6 });
      }
    }
    // teleport gate
    const gx = t.x, gz = t.z - 3, gateM = wm(0xe8e4da, { map: rep(texBrick(), 1, 3) });
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(Gb(1.3, 8, 1.3), gateM); pl.position.set(gx + s * 4.3, 4, gz); pl.castShadow = true; W.add(pl); F.colliders.push({ x: gx + s * 4.3, z: gz, r: 1.1 }); }
    const arch = new THREE.Mesh(Gt(4.3, .65, Math.PI), wm(0xe8e4da)); arch.position.set(gx, 8, gz); W.add(arch);
    const pm = new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const portal = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), pm); portal.position.set(gx, 5.2, gz); W.add(portal);
    const rr = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), new THREE.MeshBasicMaterial({ map: texRuneRing(), color: new THREE.Color(0x7fc8f0).multiplyScalar(hdr ? .95 : .7), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    rr.position.copy(portal.position); W.add(rr);
    const crystal = new THREE.Mesh(Go(.7), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x4fb8ff, emissiveIntensity: 1.7, flatShading: true })); crystal.position.set(gx, 10.2, gz); W.add(crystal);
    F.anim.push(dt => { pm.opacity = .16 + Math.sin(NOW * 2) * .06; rr.rotation.z += dt * .5; crystal.rotation.y += dt; crystal.position.y = 10.2 + Math.sin(NOW * 1.5) * .2; });
    INTER.push({ x: gx, z: gz + 1.5, r: 4.5, label: 'Use Teleport Gate', act: () => openWin('gate') });
    // fountain (west)
    const fx = t.x - 9.5, fz = t.z - 1;
    const basin = new THREE.Mesh(Gc(3, 3.2, .9, 18), stone2); basin.position.set(fx, .45, fz); W.add(basin);
    const fw = new THREE.Mesh(new THREE.CircleGeometry(2.7, 24), new THREE.MeshStandardMaterial({ color: 0x6ac0f0, transparent: true, opacity: .8, roughness: .05, normalMap: rep(texWaterNormal(), 1, 1) })); fw.rotation.x = -Math.PI / 2; fw.position.set(fx, .86, fz); W.add(fw);
    const colm = new THREE.Mesh(Gc(.35, .5, 2.4, 10), stone2); colm.position.set(fx, 1.6, fz); W.add(colm);
    const bowl = new THREE.Mesh(Gc(1, .4, .4, 12), stone2); bowl.position.set(fx, 2.8, fz); W.add(bowl);
    F.colliders.push({ x: fx, z: fz, r: 3.2 });
    // merchant stall (east)
    const mx = t.x + 9.5, mz = t.z - 1;
    const table = new THREE.Mesh(Gb(3.2, 1, 1.4), wood); table.position.set(mx, .5, mz); table.castShadow = true; W.add(table);
    for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(Gb(.8, .1, 2.6), wm(k % 2 ? 0xf0e6d0 : th.roof[1])); st.position.set(mx - 1.2 + k * .8, 3, mz + .4); st.rotation.x = -.35; W.add(st); }
    for (const s of [-1, 1]) { const p = new THREE.Mesh(Gc(.08, .08, 3, 5), wood); p.position.set(mx + s * 1.5, 1.5, mz - .7); W.add(p); }
    for (let k = 0; k < 3; k++) { const pt = new THREE.Mesh(Gs(.18, 8, 6), new THREE.MeshStandardMaterial({ color: [0xff5a6a, 0x5ad0ff, 0x7aff8a][k], emissive: [0xff2a3a, 0x2aa0ff, 0x3aff5a][k], emissiveIntensity: 1.2 })); pt.position.set(mx - .8 + k * .8, 1.2, mz); W.add(pt); }
    const mA = npcAt(W, mx, mz - 1.4, mx, mz + 5, { coat: '#8a5a2b', hair: '#c8b890', hs: 0, noSword: true }, 'Brenn · Merchant', { kind: 'shop' });
    F.anim.push(dt => { animAvatar(mA, dt, { speed: 0, sheathed: true }); mA.head.rotation.y = Math.sin(NOW * .7) * .4; });
    F.colliders.push({ x: mx, z: mz, r: 1.8 });
    INTER.push({ x: mx, z: mz + 1.6, r: 3.5, label: 'Trade with Brenn', act: () => openWin('shop') });
    // blacksmith (south-east)
    const sx = t.x + 8.5, sz = t.z + 8.5;
    const forge = new THREE.Mesh(Gb(2.4, 1.4, 1.6), stone2); forge.position.set(sx + 1.6, .7, sz + 1); forge.castShadow = true; W.add(forge);
    const coals = new THREE.Mesh(Gb(1.8, .15, 1.1), new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff5a10, emissiveIntensity: 2.6 })); coals.position.set(sx + 1.6, 1.45, sz + 1); W.add(coals);
    const chim = new THREE.Mesh(Gc(.45, .6, 4, 8), stone2); chim.position.set(sx + 2.3, 3.4, sz + 1.5); W.add(chim);
    const anvil = grp(W, sx - .2, 0, sz - .6); P(anvil, Gb(.5, .6, .4), wm(0x3a3a40, { metalness: .5 }), 0, .3, 0); P(anvil, Gb(1, .25, .45), wm(0x4a4a52, { metalness: .6, roughness: .35 }), 0, .72, 0); P(anvil, Gk(.18, .45, 6), wm(0x4a4a52, { metalness: .6 }), .7, .72, 0, 0, 0, -Math.PI / 2);
    const sA = npcAt(W, sx - .2, sz + .6, t.x, t.z, { coat: '#5a4636', hair: '#3a2a20', hs: 1, skin: '#d8a47c', noSword: true, tier: 1 }, 'Dalla · Blacksmith', { kind: 'smith' });
    const hammer = grp(sA.armR.pitch, 0, -.82, 0); P(hammer, Gc(.03, .03, .5, 5), wood, 0, 0, .2, Math.PI / 2, 0, 0); P(hammer, Gb(.16, .14, .26), wm(0x5a5a62, { metalness: .6 }), 0, 0, .45);
    F.anim.push(dt => { animAvatar(sA, dt, { speed: 0, sheathed: true }); const k = (NOW * 1.4) % 1; sA.armR.pitch.rotation.x = k < .6 ? lerp(-.3, -2.2, k / .6) : lerp(-2.2, -.3, (k - .6) / .4); sA.armR.yaw.rotation.y = -.3; coals.material.emissiveIntensity = 2.2 + Math.sin(NOW * 7) * .5; });
    F.colliders.push({ x: sx + 1.6, z: sz + 1, r: 1.6 }, { x: sx - .2, z: sz - .6, r: .7 });
    INTER.push({ x: sx - .6, z: sz - 2.2, r: 3.4, label: 'Enhance gear with Dalla', act: () => openWin('smith') });
    addQuestBoard(W, t.x - 8.5, t.z + 8.5, t.x, t.z, wood);
  } else {
    const ws = new THREE.Mesh(Go(1), new THREE.MeshStandardMaterial({ color: 0x9fffd0, emissive: 0x3fd090, emissiveIntensity: 2.2, flatShading: true })); ws.position.set(t.x, 2.4, t.z); ws.scale.set(.8, 1.6, .8); W.add(ws);
    const ped = new THREE.Mesh(Gc(1, 1.3, 1, 8), stone2); ped.position.set(t.x, .5, t.z); W.add(ped); F.colliders.push({ x: t.x, z: t.z, r: 1.4 });
    F.anim.push(() => { ws.rotation.y = NOW * .8; ws.position.y = 2.6 + Math.sin(NOW * 1.4) * .2; });
    addQuestBoard(W, t.x + 4.5, t.z + 4, t.x, t.z, wood);
  }
  // houses
  const placed = [], n = city ? 34 : 7, minR = pr + 5, maxR = city ? t.r - 6 : t.r + 2;
  for (let k = 0, tries = 0; k < n && tries < 500; tries++) {
    const a = rng() * TAU, d = minR + rng() * (maxR - minR), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    if (city) { let st = false; for (const ga of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const dd = Math.abs(((a - ga + Math.PI) % TAU + TAU) % TAU - Math.PI); if (dd * d < 4.5) st = true; } if (st) continue; }
    else if (pathF(x, z) > .1) continue;
    const w = 4.5 + rng() * 3.5, dp = 4.5 + rng() * 3, h = 3.6 + rng() * (city ? 4 : 2), rad = Math.max(w, dp) * .62;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + rad + 1.2)) continue;
    placed.push([x, z, rad]); k++;
    const hg = grp(W, x, 0, z); hg.rotation.y = Math.atan2(t.x - x, t.z - z);
    const wallC = th.wall[(rng() * 2) | 0];
    const b = P(hg, Gb(w, h, dp), wm(wallC, { map: plasterT }), 0, h / 2, 0); b.receiveShadow = true;
    P(hg, Gb(w + .3, .5, dp + .3), stone2, 0, .25, 0);
    if (rng() < .65) { for (const s of [-1, 1]) for (const f of [-1, 1]) P(hg, Gb(.26, h, .26), wood, s * (w / 2), h / 2, f * (dp / 2)); for (const f of [-1, 1]) { P(hg, Gb(w + .1, .22, .2), wood, 0, h * .52, f * dp / 2); P(hg, Gb(w + .1, .22, .2), wood, 0, h - .1, f * dp / 2); } }
    P(hg, Gk(1, 2.8 + rng(), 4), wm(th.roof[(rng() * th.roof.length) | 0], { map: roofT }), 0, h + 1.45, 0, 0, Math.PI / 4, 0, w / 1.414 * 1.18, 1, dp / 1.414 * 1.18);
    P(hg, Gb(1.2, 2.1, .15), wood, 0, 1.05, dp / 2 + .03);
    P(hg, Gb(1.5, .15, .5), wood, 0, 2.3, dp / 2 + .25);
    for (const s of [-1, 1]) { P(hg, Gb(.8, .8, .12), win, s * w * .3, h * .62, dp / 2 + .03); P(hg, Gb(.95, .1, .2), wood, s * w * .3, h * .62 - .45, dp / 2 + .08); }
    if (rng() < .45) P(hg, Gb(.7, 1.8, .7), stone2, w * .25, h + 1.7, -dp * .2);
    F.colliders.push({ x, z, r: rad });
  }
  // lamps
  const lc = city ? 10 : 4;
  for (let k = 0; k < lc; k++) {
    const a = k / lc * TAU + .3, d = pr + 1.8, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    const p = new THREE.Mesh(Gc(.08, .12, 3.2, 6), wm(0x2a2a30, { metalness: .4 })); p.position.set(x, 1.6, z); W.add(p);
    const cage = new THREE.Mesh(Gc(.2, .14, .45, 6), wm(0x2a2a30, { metalness: .4 })); cage.position.set(x, 3.35, z); W.add(cage);
    const l = new THREE.Mesh(Gs(.17, 8, 6), lamp); l.position.set(x, 3.32, z); W.add(l);
  }
}
function addQuestBoard(W, x, z, fx, fz, wood) {
  const b = grp(W, x, 0, z); b.rotation.y = Math.atan2(fx - x, fz - z);
  for (const s of [-1, 1]) P(b, Gc(.09, .1, 2.6, 6), wood, s * 1.1, 1.3, 0);
  P(b, Gb(2.5, 1.5, .12), wm(0x8a6a44, { map: rep(texWood(), 1, 1) }), 0, 1.75, 0);
  P(b, Gb(2.8, .16, .5), wood, 0, 2.6, .05, -.25, 0, 0);
  const r = mulberry(Math.round(x * 13 + z));
  for (let i = 0; i < 6; i++) P(b, Gb(.42, .52, .02), wm(i % 3 ? 0xf2ead8 : 0xfff2c8), -.85 + (i % 3) * .85 + (r() - .5) * .15, 2.0 - Math.floor(i / 3) * .62 + (r() - .5) * .1, .07, 0, 0, (r() - .5) * .2);
  F.npcs.push({ x, z, h: 3.0, name: 'Quest Board', kind: 'quest' });
  F.colliders.push({ x, z, r: 1.2 });
  INTER.push({ x: x + Math.sin(b.rotation.y) * 2, z: z + Math.cos(b.rotation.y) * 2, r: 3, label: 'Read the Quest Board', act: () => openWin('quests') });
}
function buildTower(W) {
  const T = F.tower, stone = wm(0x9a98a2, { map: rep(texBrick(), 14, 4) }), stone2 = wm(0x7a7884, { map: rep(texBrick(), 14, 4) }), band = wm(0xc8c4d0, { map: rep(texBrick(), 18, 1) });
  const winMs = [0, 1, 2].map(i => { const m = wm(0x1a2236, { emissive: 0x5fb0ff, emissiveIntensity: .4 + i * .2 }); NIGHT.push({ m, d: .3 + i * .15, n: 1.6 + i * .6 }); return m; });
  let y = 0, r = T.r;
  for (let i = 0; i < 8; i++) {
    const h = CEIL / 8, c = new THREE.Mesh(new THREE.CylinderGeometry(r - .6, r, h, 10), i % 2 ? stone : stone2); c.position.set(T.x, y + h / 2, T.z); c.castShadow = c.receiveShadow = true; W.add(c);
    const bnd = new THREE.Mesh(new THREE.CylinderGeometry(r + .35, r + .35, 1.2, 10), band); bnd.position.set(T.x, y + h - .6, T.z); W.add(bnd);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + TAU / 20, wx = T.x + Math.sin(a) * (r - .75), wz = T.z + Math.cos(a) * (r - .75); const w = new THREE.Mesh(Gb(1.3, 3, .4), winMs[(i + k) % 3]); w.position.set(wx, y + h * .5, wz); w.rotation.y = a; W.add(w); }
    y += h; r -= .6;
  }
  const dz = T.z + T.r - .2;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(Gb(1.6, 11, 1.6), band); p.position.set(T.x + s * 4.2, 5.5, dz + .4); W.add(p); }
  const lin = new THREE.Mesh(Gb(10, 1.6, 1.8), band); lin.position.set(T.x, 11.5, dz + .4); W.add(lin);
  const door = new THREE.Mesh(Gb(6.8, 10, .4), new THREE.MeshStandardMaterial({ color: 0x0a0c14, emissive: 0x2a1a60, emissiveIntensity: .8 })); door.position.set(T.x, 5, dz + .3); W.add(door);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: texRuneRing(), color: new THREE.Color(0xb08aff).multiplyScalar(hdr ? 2.4 : 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); rune.position.set(T.x, 6.4, dz + .55); W.add(rune);
  for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(Gb(10 - k * .8, .4, 1.4), stone2); st.position.set(T.x, .2, dz + 3.6 - k * 1.0); W.add(st); }
  for (const s of [-1, 1]) { const br = grp(W, T.x + s * 6.5, 0, dz + 3); P(br, Gc(.5, .7, 2.6, 8), stone2, 0, 1.3, 0); const fl = P(br, Gk(.55, 1.6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb08aff).multiplyScalar(hdr ? 2.6 : 1), transparent: true, opacity: .9, blending: THREE.AdditiveBlending }), 0, 3.4, 0); F.anim.push(() => { fl.scale.set(1 + Math.sin(NOW * 11 + s) * .12, 1 + Math.sin(NOW * 8) * .2, 1); }); F.colliders.push({ x: T.x + s * 6.5, z: dz + 3, r: .9 }); }
  F.anim.push(dt => { rune.rotation.z += dt * .5; rune.material.opacity = .7 + Math.sin(NOW * 3) * .3; });
  F.colliders.push({ x: T.x, z: T.z, r: T.r + .5 });
  INTER.push({ x: T.x, z: dz + 3, r: 5, label: 'Enter the Labyrinth', act: () => enterArena() });
}

/* ================= boss hall (inside the labyrinth) ================= */
function buildArena() {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const tile = rep(texCobble(), 9, 9), brickW = rep(texBrick(), 30, 5), brickP = rep(texBrick(), 2, 8);
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 1, 56), new THREE.MeshStandardMaterial({ color: 0x6b6f7b, map: tile, roughness: .85 })); fl.position.y = -.5; fl.receiveShadow = true; g.add(fl);
  const lines = new THREE.MeshStandardMaterial({ color: 0x2a3040, emissive: 0x5fa0ff, emissiveIntensity: .55 });
  for (let i = 1; i <= 4; i++) { const rg = new THREE.Mesh(new THREE.RingGeometry(i * 9 - .25, i * 9 + .25, 72), lines); rg.rotation.x = -Math.PI / 2; rg.position.y = .02; g.add(rg); }
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(Gb(.4, .04, 36), lines); sp.position.y = .02; sp.rotation.y = i / 8 * Math.PI; g.add(sp); }
  const sigilM = new THREE.MeshBasicMaterial({ map: texRuneRing(), color: 0x5fa0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sigil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), sigilM); sigil.rotation.x = -Math.PI / 2; sigil.position.set(0, .04, -14); g.add(sigil);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 36, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0x4a4d58, side: THREE.BackSide, map: brickW })); wall.position.y = 18; g.add(wall);
  const top = new THREE.Mesh(new THREE.CircleGeometry(46, 56), new THREE.MeshStandardMaterial({ color: 0x1e2028, side: THREE.DoubleSide })); top.rotation.x = Math.PI / 2; top.position.y = 36; g.add(top);
  const cols = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + TAU / 24, x = Math.cos(a) * 37, z = Math.sin(a) * 37;
    const p = new THREE.Mesh(Gc(1.7, 2, 36, 10), new THREE.MeshStandardMaterial({ color: 0x7e7c86, map: brickP })); p.position.set(x, 18, z); p.castShadow = true; g.add(p);
    const b = new THREE.Mesh(Gb(5, 2, 5), new THREE.MeshStandardMaterial({ color: 0x5e5c66, map: rep(texBrick(), 2, 1) })); b.position.set(x, 1, z); g.add(b);
    const ban = new THREE.Mesh(Gb(2.2, 7, .1), new THREE.MeshStandardMaterial({ color: 0x6a1a2a, side: THREE.DoubleSide })); ban.position.set(x * .95, 22, z * .95); ban.lookAt(0, 22, 0); g.add(ban);
    cols.push({ x, z, r: 2.8 });
  }
  const fires = [], fireM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(2.6), transparent: true, opacity: .9, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, x = Math.cos(a) * 42, z = Math.sin(a) * 42;
    const st = new THREE.Mesh(Gc(.6, .9, 3, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a30 })); st.position.set(x, 1.5, z); g.add(st);
    const bowl = new THREE.Mesh(Gc(1.3, .7, .8, 8), new THREE.MeshStandardMaterial({ color: 0x4a4038, metalness: .4 })); bowl.position.set(x, 3.3, z); g.add(bowl);
    const f = new THREE.Mesh(Gk(.9, 2.4, 6), fireM); f.position.set(x, 4.6, z); g.add(f); fires.push(f);
  }
  const l1 = new THREE.PointLight(0xff9a50, 1.5, 95, 1.6); l1.position.set(0, 14, -30); g.add(l1);
  const l2 = new THREE.PointLight(0x7fb0ff, .9, 95, 1.6); l2.position.set(0, 14, 30); g.add(l2);
  const exitP = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fd8ff).multiplyScalar(1.6), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); exitP.position.set(0, 3, 44.5); g.add(exitP);
  const stairs = new THREE.Group(); g.add(stairs);
  for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(Gb(8, .5, 1.8), new THREE.MeshStandardMaterial({ color: 0xd8d0b8, emissive: 0xffc860, emissiveIntensity: .35, map: rep(texBrick(), 2, .3) })); s.scale.y = 1 + k * 2; s.position.set(0, (1 + k * 2) * .25, -36 - k * 1.1); stairs.add(s); }
  const gold = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: texRuneRing(), color: new THREE.Color(0xffd870).multiplyScalar(2.4), transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); gold.position.set(0, 9, -44.5); stairs.add(gold);
  const goldIn = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: .35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); goldIn.position.copy(gold.position); stairs.add(goldIn);
  arena = { g, colliders: cols, fires, stairs, exitP, gold, lines, sigil };
}
function updateArenaAnim(dt) {
  if (!arena || !arena.g.visible) return;
  arena.fires.forEach((f, i) => f.scale.set(1 + Math.sin(NOW * 13 + i) * .12, 1 + Math.sin(NOW * 9 + i * 2) * .2, 1 + Math.cos(NOW * 11 + i) * .12));
  arena.gold.rotation.z += dt * .5; arena.sigil.rotation.z -= dt * .2;
  arena.exitP.material.opacity = .35 + Math.sin(NOW * 2) * .12;
}
