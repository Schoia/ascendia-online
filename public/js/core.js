'use strict';
/* Ascendia Online · core: helpers, noise, settings, data tables, save data and shared state. */
if (!window.THREE) {
  const lm = document.getElementById('loadmsg');
  if (lm) lm.textContent = 'The 3D engine could not load. Check your connection and reload the page.';
  throw new Error('three.js failed to load');
}
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, z, s) { const h = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, s) { let t = 0, a = 1, f = 1, n = 0; for (let i = 0; i < 4; i++) { t += a * vnoise(x * f, z * f, s + i * 13); n += a; a *= .5; f *= 2; } return t / n; }
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; let t = l ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = clamp(t, 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const hexStr = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
const isTouch = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);

/* ---------- per-device settings ---------- */
const SET_KEY = 'ascendia.settings.v1';
function loadJSON(k) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
const SETTINGS = Object.assign({ quality: isTouch ? 'low' : 'medium', music: .35, sfx: .7, sens: 1, fov: 62, dmgNums: true }, loadJSON(SET_KEY) || {});
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); } catch (e) {} }
const QUALITY = {
  low:    { pr: 1,    bloom: false, shadow: 0,    grass: 1600, flowers: 200, particles: 120, trees: 380 },
  medium: { pr: 1.25, bloom: true,  shadow: 2048, grass: 5200, flowers: 500, particles: 260, trees: 520 },
  high:   { pr: 1.75, bloom: true,  shadow: 4096, grass: 9500, flowers: 900, particles: 420, trees: 620 },
};
const Q = () => QUALITY[SETTINGS.quality] || QUALITY.medium;

/* ---------- geometry & material helpers ---------- */
const GC = {};
function cg(k, fn) { let g = GC[k]; if (!g) { g = fn(); g.userData.keep = true; GC[k] = g; } return g; }
const Gs = (r, w = 12, h = 10) => cg(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const Ghs = r => cg(`hs${r}`, () => new THREE.SphereGeometry(r, 14, 7, 0, TAU, 0, Math.PI / 2));
const Gb = (x, y, z) => cg(`b${x},${y},${z}`, () => new THREE.BoxGeometry(x, y, z));
const Gc = (a, b, h, n = 10) => cg(`c${a},${b},${h},${n}`, () => new THREE.CylinderGeometry(a, b, h, n));
const Gcs = (a, b, h, n, ts, tl) => cg(`cs${a},${b},${h},${n},${ts},${tl}`, () => { const g = new THREE.CylinderGeometry(a, b, h, n, 1, true, ts, tl); g.translate(0, -h / 2, 0); return g; });
const Gk = (r, h, n = 6) => cg(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n));
const Gd = r => cg(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const Gi = r => cg(`i${r}`, () => new THREE.IcosahedronGeometry(r, 0));
const Go = r => cg(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));
const Gt = (r, t, arc = TAU) => cg(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 6, 18, arc));
function P(par, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m;
}
function grp(par, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (par) par.add(g); return g; }
/* Per-object material factory: every monster/avatar gets its own materials so it can flash on hit. */
function mats(tint) {
  const c = {};
  return (col, o) => {
    const k = col + '|' + (o ? JSON.stringify(o) : ''); if (c[k]) return c[k];
    const color = new THREE.Color(col); if (tint && !(o && o.emissive)) color.lerp(tint.c, tint.a);
    return c[k] = new THREE.MeshStandardMaterial(Object.assign({ flatShading: true, roughness: .78, metalness: .05 }, o || {}, { color }));
  };
}
function glowMat(m, c, i = 2.6) { return m(c, { emissive: c, emissiveIntensity: i }); }
/* Shared world materials (houses, rocks, props). */
const WM = {};
function wm(col, o) { const k = col + '|' + (o ? JSON.stringify(o, (key, v) => (v && v.isTexture) ? v.uuid : v) : ''); return WM[k] || (WM[k] = new THREE.MeshStandardMaterial(Object.assign({ color: col, flatShading: true, roughness: .85 }, o || {}))); }

/* ---------- data ---------- */
const THEMES = [
  { k: 'verdant', name: 'Verdant Plains', prefix: '', g: [0x5f9a3c, 0x86b84a], hi: 0x7d8a5a, path: 0xb89a68, sand: 0xcdbb86, rock: 0x7f8580, sky: [0x5fa8e8, 0xd8f0ff], fog: 0xbfe3f2, tree: 'oak', leaf: [0x3f7f2f, 0x5a9b3a, 0x4e8a30], trunk: 0x5a4030, water: 0x3d8fbf, mobs: ['boar', 'wolf', 'plant', 'hornet'], boss: 'boar', tint: null, grass: 0x5a9a3a, flowers: [0xffffff, 0xffe066, 0xff8fb0, 0x8fb8ff], wall: [0xe9e1cf, 0xd8cdb4], roof: [0xb24a3a, 0x3d5d8a, 0x8a5a3a], hemiG: 0x4a5a3a, parts: 'pollen', flies: true },
  { k: 'ruins', name: 'Amber Highlands', prefix: 'Highland', g: [0x9a8a3e, 0xc2a14e], hi: 0x8a7a62, path: 0xa88a60, sand: 0xc8b080, rock: 0x8a8072, sky: [0x6aa0d8, 0xffe8c8], fog: 0xf0dcc0, tree: 'oak', leaf: [0xc0672b, 0xd99a2f, 0xb04a22], trunk: 0x4a3424, water: 0x4a8aa8, mobs: ['goblin', 'wolf', 'skeleton'], boss: 'golem', tint: { c: new THREE.Color(0xb06a30), a: .18 }, grass: 0xb09a48, flowers: [0xffd070, 0xff9a4a], wall: [0xc8bca4, 0xb0a48c], roof: [0x6a4a3a, 0x8a3a2a, 0x4a5a6a], hemiG: 0x6a5a3a, parts: 'leaves', flies: false },
  { k: 'desert', name: 'Sunscar Dunes', prefix: 'Dune', g: [0xd6b46c, 0xe8cf8d], hi: 0xc89a5a, path: 0xb8946a, sand: 0xe8d49a, rock: 0xb08a62, sky: [0x4aa0e8, 0xfff0d0], fog: 0xf4e2c0, tree: 'cactus', leaf: [0x4a8a4a, 0x5a9a52, 0x3a7a40], trunk: 0x5a7a3a, water: 0x3aa0b8, mobs: ['lizard', 'hornet', 'skeleton'], boss: 'lizard', tint: { c: new THREE.Color(0xd8b070), a: .2 }, grass: null, flowers: null, wall: [0xe8d4a8, 0xd8c08c], roof: [0xc89a5a, 0xe8d4a8, 0xa86a3a], hemiG: 0x8a7050, parts: 'sand', flies: false },
  { k: 'frost', name: 'Rimefall Tundra', prefix: 'Rime', g: [0xdde8f0, 0xc3d6e4], hi: 0xa8b8c8, path: 0x9aa8b8, sand: 0xe8eef4, rock: 0x6a7888, sky: [0x7ab0e0, 0xeaf4ff], fog: 0xdce8f2, tree: 'pine', leaf: [0x2f5a4a, 0x3d6e5c, 0x284a40], trunk: 0x4a3a30, water: 0x6aa8d0, mobs: ['wolf', 'golem', 'skeleton'], boss: 'wolf', tint: { c: new THREE.Color(0xe8f2ff), a: .42 }, grass: null, flowers: null, wall: [0xd8dee6, 0xb8c4d0], roof: [0x3a4a6a, 0x6a3a3a, 0x2a3a4a], hemiG: 0x8a98a8, parts: 'snow', flies: false },
  { k: 'swamp', name: 'Murkhollow Fen', prefix: 'Bog', g: [0x4a5a32, 0x5c6b3a], hi: 0x4a4a38, path: 0x6a5a40, sand: 0x5a5a3a, rock: 0x4a5048, sky: [0x4a6a62, 0xb8c8a8], fog: 0x8a9a80, tree: 'willow', leaf: [0x3a5a2a, 0x4a6a30, 0x2e4a24], trunk: 0x3a3024, water: 0x3a5a48, mobs: ['plant', 'lizard', 'hornet'], boss: 'plant', tint: { c: new THREE.Color(0x4a5a30), a: .2 }, grass: 0x4a6a32, flowers: [0xc8a0ff, 0x9affd0], wall: [0x8a8070, 0x6a6050], roof: [0x3a4a2a, 0x4a3a2a, 0x2a3a30], hemiG: 0x3a4a2a, parts: 'spores', flies: true },
  { k: 'ember', name: 'Cinder Reach', prefix: 'Cinder', g: [0x4a3a36, 0x6a4a3a], hi: 0x2a2220, path: 0x7a5a48, sand: 0x5a4038, rock: 0x3a3030, sky: [0x3a2a40, 0xe88a5a], fog: 0x8a5a48, tree: 'dead', leaf: [0xff7a2a, 0xe85a1a, 0xffa03a], trunk: 0x2a2020, water: 0xff6a1a, mobs: ['golem', 'skeleton', 'goblin'], boss: 'skeleton', tint: { c: new THREE.Color(0x6a2a1a), a: .22 }, grass: null, flowers: null, wall: [0x5a4a44, 0x4a3a36], roof: [0x8a2a1a, 0x3a2a2a, 0x6a3a2a], hemiG: 0x5a2a1a, parts: 'embers', flies: false },
];
const BOSS_NAMES = ['Grimjaw, Warden of the First Gate', 'Basalt Colossus', 'Sunscar Matriarch', 'Rimefang the Pale', 'Mirethorn Devourer', 'Ashen Reaver King', 'Gorehorn Ravager', 'Thornspire Tyrant', 'Glacier Juggernaut', 'The Tenth Sentinel'];
const ELITE_PREFIX = ['Alpha', 'Elder', 'Savage', 'Dread', 'Ancient'];
const WEAPONS = [
  { n: 'Worn Shortsword', atk: 5, price: 0, fl: 1 }, { n: 'Iron Longsword', atk: 9, price: 280, fl: 1 }, { n: 'Steel Saber', atk: 15, price: 850, fl: 2 },
  { n: 'Silvered Edge', atk: 23, price: 2100, fl: 3 }, { n: 'Moonsteel Blade', atk: 33, price: 4600, fl: 5 }, { n: 'Starforged Sword', atk: 46, price: 8800, fl: 8 },
  { n: 'Aether Longblade', atk: 62, price: 15500, fl: 12 }, { n: 'Skybreaker', atk: 82, price: 26000, fl: 18 }, { n: 'Hundredfold Edge', atk: 110, price: 44000, fl: 30 },
];
const ARMORS = [
  { n: "Traveler's Coat", def: 2, price: 0, fl: 1, t: 0 }, { n: 'Hardened Leather Coat', def: 7, price: 300, fl: 1, t: 1 }, { n: 'Studded Longcoat', def: 13, price: 900, fl: 2, t: 2 },
  { n: 'Chainweave Coat', def: 21, price: 2200, fl: 3, t: 3 }, { n: 'Midnight Battlecoat', def: 31, price: 4800, fl: 5, t: 4 }, { n: 'Skyguard Coat', def: 45, price: 9200, fl: 8, t: 5 },
  { n: 'Aether Mantle', def: 62, price: 16000, fl: 12, t: 5 },
];
const SKILLS = [
  { id: 'slant', name: 'Slant Edge', key: '1', lvl: 1, cd: 3, dur: .55, hits: [.48], mult: 2.0, arc: 120, range: 3.9, color: 0x5fb8ff, anim: 'slant', desc: 'A heavy diagonal cut.' },
  { id: 'rising', name: 'Rising Arc', key: '2', lvl: 3, cd: 5, dur: .72, hits: [.3, .6], mult: 1.45, arc: 130, range: 3.9, color: 0x63f0a0, anim: 'rising', desc: 'Two fast cuts that knock foes upward.' },
  { id: 'whirl', name: 'Whirlwind Circle', key: '3', lvl: 6, cd: 8, dur: .8, hits: [.35, .7], mult: 1.35, arc: 360, range: 4.8, color: 0xffa040, anim: 'spin', desc: 'A full spin that hits everything around you.' },
  { id: 'comet', name: 'Comet Lunge', key: '4', lvl: 10, cd: 10, dur: .7, hits: [.55], mult: 3.1, arc: 100, range: 4.2, dash: 15, color: 0xc27bff, anim: 'thrust', desc: 'Dash forward and pierce the first enemy.' },
  { id: 'starfall', name: 'Starfall Combo', key: '5', lvl: 15, cd: 18, dur: 1.4, hits: [.12, .27, .42, .56, .84], mult: 1.15, arc: 150, range: 4.2, color: 0xffe066, anim: 'flurry', desc: 'A five-strike combination finisher.' },
];
const COMBO = [{ anim: 'slashR', dur: .42, hits: [.5], mult: 1 }, { anim: 'slashL', dur: .42, hits: [.5], mult: 1.05 }, { anim: 'overhead', dur: .55, hits: [.55], mult: 1.4 }];
const COAT_COLORS = ['#3d7be0', '#1f2a44', '#141418', '#c23b3b', '#e8e2d0', '#2f9a6a', '#8a4ad8', '#e0902a'];
const HAIR_COLORS = ['#2a2420', '#5a3a24', '#c8a060', '#e8e0d0', '#b03a2a', '#3a5ab0', '#d87ab0', '#4a4a52'];
const SKIN_TONES = ['#f6d6bc', '#f0c9a5', '#d8a47c', '#a8754e', '#6e4a32'];
const HAIR_STYLES = ['Swept', 'Spiky', 'Long', 'Ponytail'];

/* ---------- save data ---------- */
const SAVE_KEY = 'ascendia.save.v1';
function defaults() {
  return {
    v: 2, name: '', color: '#3d7be0', hair: '#2a2420', hs: 0, skin: '#f0c9a5', hardcore: false,
    lvl: 1, xp: 0, pts: 0, str: 0, agi: 0, vit: 0, col: 150, hp: 120, potions: 5, hipotions: 0, mats: {},
    weapons: [{ n: 'Worn Shortsword', atk: 5, plus: 0 }], eq: 0, armors: [{ n: "Traveler's Coat", def: 2, t: 0, plus: 0 }], aeq: 0,
    maxFloor: 1, cleared: {}, floor: 1, kills: 0, quests: [], qgen: {}, qdone: 0, qhist: [],
  };
}
let S = defaults();
function loadSave() {
  const o = loadJSON(SAVE_KEY);
  if (!o || !o.name) return null;
  const s = Object.assign(defaults(), o);
  if (!Array.isArray(s.armors) || !s.armors.length) s.armors = defaults().armors;
  s.weapons.forEach(w => { if (w.plus == null) w.plus = 0; });
  return s;
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
const wAtk = w => Math.round(w.atk + Math.max(w.plus || 0, w.atk * .1 * (w.plus || 0)));
const aDef = a => Math.round(a.def + Math.max(a.plus || 0, a.def * .1 * (a.plus || 0)));
const curW = () => S.weapons[S.eq] || S.weapons[0];
const curA = () => S.armors[S.aeq] || S.armors[0];
const maxHp = () => 120 + (S.lvl - 1) * 22 + S.vit * 12;
const atkPow = () => wAtk(curW()) + S.str * 2 + S.lvl * 3 + 4;
const defPow = () => aDef(curA()) + Math.floor(S.vit * .5);
const critCh = () => .05 + S.agi * .012;
const spdMul = () => 1 + S.agi * .008;
const cdMul = () => 1 / (1 + S.agi * .012);
const xpNeed = l => Math.round(50 * Math.pow(l, 1.5));
const itemName = it => it.n + (it.plus ? ` +${it.plus}` : '');

/* ---------- shared world state ---------- */
const R = 220, CEIL = 150;
let F = null, world = null, arena = null, inArena = false, colliders = [], zones = [], monsters = [], boss = null;
let NOW = 0, mode = 'title', uiOpen = null;
