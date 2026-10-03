'use strict';
/* Ascendia Online · 3D models: player avatar (customizable, armor tiers), monsters, elites and floor bosses. */

/* ================= avatar ================= */
function buildAvatar(o) {
  o = Object.assign({ coat: '#3d7be0', hair: '#2a2420', hs: 0, skin: '#f0c9a5', tier: 0, noSword: false }, o || {});
  const m = mats(), g = new THREE.Group(), hx = c => new THREE.Color(c).getHex();
  const coatHex = hx(o.coat);
  const coat = m(coatHex, { roughness: .72, side: THREE.DoubleSide });
  const lining = m(new THREE.Color(coatHex).multiplyScalar(.45).getHex(), { side: THREE.DoubleSide });
  const shirt = m(0x1f2433), pants = m(0x262b3b), skin = m(hx(o.skin), { roughness: .6, flatShading: false }), hair = m(hx(o.hair), { roughness: .5 });
  const trim = m(0xe8e2d0), leather = m(0x4a3426), glove = m(0x2e2622), boot = m(0x2a2220), dark = m(0x15161c);
  const metal = m(0xb8c2cc, { metalness: .75, roughness: .28 }), gold = m(0xd8b45a, { metalness: .75, roughness: .3 });
  const eyeW = m(0xffffff, { roughness: .3, flatShading: false }), iris = m(0x2a3f6a, { roughness: .2, flatShading: false });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, metalness: .85, roughness: .18, flatShading: true, emissive: 0x000000, emissiveIntensity: 0 });

  // hips & belt
  const body = grp(g, 0, .98, 0);
  P(body, Gc(.28, .27, .2, 12), pants, 0, 0, 0);
  P(body, Gc(.305, .305, .07, 14), leather, 0, .1, 0);
  P(body, Gb(.11, .085, .04), gold, 0, .1, .31);
  P(body, Gb(.12, .16, .07), leather, -.22, .02, .2, 0, .5, 0);
  // chest & open long coat
  const chest = grp(body, 0, .13, 0);
  P(chest, Gc(.27, .25, .52, 12), shirt, 0, .26, 0);
  P(chest, Gcs(.315, .295, .56, 14, .55, TAU - 1.1), coat, 0, .56, 0);
  for (const s of [-1, 1]) P(chest, Gb(.08, .44, .025), lining, s * .13, .32, .275, -.06, 0, s * .18);
  P(chest, Gcs(.2, .25, .17, 14, .62, TAU - 1.24), coat, 0, .74, 0);
  P(chest, Gb(.06, .78, .03), leather, 0, .3, .283, 0, 0, -.72);
  for (const s of [-1, 1]) P(chest, Gs(.125, 10, 8), coat, s * .36, .6, 0);
  // neck & head
  P(chest, Gc(.085, .095, .16, 8), skin, 0, .72, 0);
  const head = grp(chest, 0, .95, 0);
  P(head, Gs(.235, 16, 12), skin, 0, 0, 0, 0, 0, 0, 1, 1.06, 1);
  for (const s of [-1, 1]) {
    P(head, Gs(.05, 10, 8), eyeW, s * .085, -.005, .205, 0, 0, 0, 1, 1.3, .45);
    P(head, Gs(.035, 10, 8), iris, s * .085, -.01, .222, 0, 0, 0, .95, 1.35, .4);
    P(head, Gs(.011, 6, 4), eyeW, s * .074, .016, .236);
    P(head, Gb(.075, .016, .02), hair, s * .09, .072, .212, 0, 0, s * -.15);
    P(head, Gs(.045, 8, 6), skin, s * .232, -.01, 0, 0, 0, 0, .5, 1, .8);
  }
  P(head, Gs(.02, 6, 4), skin, 0, -.045, .236);
  P(head, Gb(.05, .012, .012), m(0x8a4a4a), 0, -.115, .214);
  const ptail = addHair(head, o.hs, hair);
  // arms
  const arm = (x, side) => {
    const yaw = grp(chest, x, .6, 0), pitch = grp(yaw);
    P(pitch, Gc(.09, .082, .42, 10), coat, 0, -.22, 0);
    P(pitch, Gs(.078, 8, 6), coat, 0, -.44, 0);
    P(pitch, Gc(.08, .092, .3, 10), coat, 0, -.59, 0);
    P(pitch, Gc(.097, .097, .05, 10), trim, 0, -.73, 0);
    P(pitch, Gs(.072, 8, 6), glove, 0, -.81, 0, 0, 0, 0, 1, 1.15, .9);
    return { yaw, pitch };
  };
  const armR = arm(-.37, -1), armL = arm(.37, 1);
  armL.yaw.rotation.z = .1;
  // legs with knees
  const legs = [], knees = [];
  for (const s of [-1, 1]) {
    const L = grp(g, s * .14, .96, 0);
    P(L, Gc(.11, .095, .46, 10), pants, 0, -.23, 0);
    const kn = grp(L, 0, -.46, 0);
    P(kn, Gs(.09, 8, 6), pants, 0, 0, 0);
    P(kn, Gc(.1, .085, .38, 10), boot, 0, -.25, 0);
    P(kn, Gc(.112, .112, .07, 10), leather, 0, -.06, 0);
    P(kn, Gb(.17, .1, .31), boot, 0, -.455, .05);
    legs.push(L); knees.push(kn);
  }
  // coat tails (two halves that flare when running)
  const tails = [];
  for (const s of [-1, 1]) {
    const t = grp(body, 0, .07, 0);
    P(t, Gcs(.31, .47, .8, 10, s < 0 ? Math.PI : .5, Math.PI - .5), coat, 0, 0, 0);
    if (o.tier >= 5) P(t, Gb(.025, .55, .012), glowMat(m, 0x7fd8ff, 3), Math.sin(Math.PI + s * .45) * .4, -.42, Math.cos(Math.PI + s * .45) * .4);
    tails.push(t);
  }
  // armor tiers
  if (o.tier >= 1) for (const [a, s] of [[armL, 1], [armR, -1]]) {
    if (s === -1 && o.tier < 2) continue;
    P(a.yaw, Ghs(.15), metal, 0, .03, 0, 0, 0, s * -.35, 1.15, .85, 1.15);
    P(a.yaw, Gt(.15, .018), o.tier >= 4 ? gold : leather, 0, .03, 0, Math.PI / 2, 0, s * -.35);
  }
  if (o.tier >= 3) { P(chest, Gcs(.3, .285, .34, 12, -1, 2), metal, 0, .54, 0); P(chest, Gb(.08, .08, .03), o.tier >= 4 ? gold : metal, 0, .38, .3); }
  if (o.tier >= 4) for (const a of [armL, armR]) P(a.pitch, Gc(.1, .105, .18, 10), gold, 0, -.6, 0);
  // sword & scabbard
  const sword = grp(armR.pitch), backMount = grp(chest, 0, .4, -.31); backMount.rotation.z = .55;
  P(backMount, Gb(.11, 1.18, .06), leather, 0, -.36, 0);
  P(backMount, Gb(.13, .06, .08), gold, 0, .22, 0);
  P(backMount, Gk(.06, .12, 4), metal, 0, -1.0, 0, Math.PI, 0, 0, 1, 1, .5);
  if (!o.noSword) {
    P(sword, Gc(.032, .036, .2, 8), leather, 0, -.84, 0);
    for (let k = 0; k < 3; k++) P(sword, Gt(.036, .008), dark, 0, -.77 - k * .06, 0, Math.PI / 2, 0, 0);
    P(sword, Gs(.045, 8, 6), gold, 0, -.72, 0);
    P(sword, Gb(.34, .05, .08), gold, 0, -.955, 0);
    for (const s of [-1, 1]) P(sword, Gk(.03, .1, 5), gold, s * .2, -.94, 0, 0, 0, s * -1.2);
    P(sword, Gb(.075, 1.12, .022), bladeMat, 0, -1.54, 0);
    P(sword, Gb(.018, .86, .026), m(0x8a96a2, { metalness: .8, roughness: .3 }), 0, -1.43, 0);
    P(sword, Gk(.0375, .16, 4), bladeMat, 0, -2.18, 0, Math.PI, 0, 0, 1, 1, .3);
  } else { backMount.visible = false; }
  const base = grp(sword, 0, -.98, 0), tip = grp(sword, 0, -2.16, 0);
  g.traverse(x => { if (x.isMesh) x.castShadow = true; });
  return { g, body, chest, head, armR, armL, legs, knees, tails, ptail, bladeMat, base, tip, sword, backMount, walk: 0, sheathed: false };
}
function addHair(head, style, hair) {
  P(head, Gs(.255, 14, 10), hair, 0, 0, -.07, 0, 0, 0, 1, 1, .85);
  P(head, Ghs(.258), hair, 0, .05, -.015, -.25, 0, 0, 1.03, 1, 1.06);
  const bangs = (n, len, sweep) => { for (let i = 0; i < n; i++) { const x = -.15 + i * (.3 / (n - 1)); P(head, Gk(.055, len, 4), hair, x - .02, .1, .225, Math.PI - .4, 0, sweep + x * .8); } };
  const up = new THREE.Vector3(0, 1, 0);
  const spike = (d, r, h, off = .2) => { const v = new THREE.Vector3(...d).normalize(); const s = P(head, Gk(r, h, 5), hair, v.x * off, v.y * off + .04, v.z * off); s.quaternion.setFromUnitVectors(up, v); };
  let ptail = null;
  if (style === 1) {
    for (const d of [[0, 1, -.45], [.55, .75, -.5], [-.55, .75, -.5], [.3, .5, -.9], [-.3, .5, -.9], [0, .15, -1], [.85, .3, -.5], [-.85, .3, -.5], [.95, -.05, -.2], [-.95, -.05, -.2], [.35, .95, .15], [-.35, .95, .15]]) spike(d, .11, .5, .17);
    for (const s of [-1, 1]) P(head, Gk(.07, .3, 5), hair, s * .2, .02, .17, Math.PI - .2, 0, s * .4);
    bangs(4, .15, .15);
  } else if (style === 2) {
    P(head, Gb(.46, .62, .1), hair, 0, -.3, -.18, .14, 0, 0);
    for (const s of [-1, 1]) P(head, Gb(.08, .4, .09), hair, s * .22, -.17, .06, 0, 0, s * .05);
    bangs(5, .13, .25);
  } else if (style === 3) {
    bangs(5, .12, -.2);
    P(head, Gt(.05, .02), m2(hair), 0, .1, -.27, .3, 0, 0);
    ptail = grp(head, 0, .1, -.29); let t = ptail;
    for (let i = 0; i < 4; i++) { const n = grp(t, 0, i ? -.12 : 0, i ? -.03 : 0); P(n, Gs(.09 - i * .012, 8, 6), hair, 0, -.06, 0, 0, 0, 0, 1, 1.5, 1); t = n; }
  } else {
    for (const d of [[.3, .4, -.85], [-.3, .4, -.85], [0, .2, -1], [.6, .2, -.7], [-.6, .2, -.7]]) spike(d, .07, .26, .2);
    bangs(5, .13, .35);
  }
  return ptail;
}
function m2(mat) { return mat; }
function setSheath(A, on) {
  if (!A || A.sheathed === on || !A.backMount.visible) return;
  A.sheathed = on;
  if (on) { A.backMount.add(A.sword); A.sword.position.set(0, 1.18, 0); }
  else { A.armR.pitch.add(A.sword); A.sword.position.set(0, 0, 0); }
  A.sword.rotation.set(0, 0, 0);
}
// sword animation keyframes: [t, shoulderYaw, shoulderPitch]
const ANIM = {
  slashR: { k: [[0, -.4, -1.1], [.28, -1.7, -1.6], [.62, 1.4, -1.5], [1, .5, -1]] },
  slashL: { k: [[0, .6, -1.1], [.28, 1.5, -1.7], [.62, -1.5, -1.5], [1, -.5, -1]] },
  overhead: { k: [[0, -.3, -1], [.35, -.1, -3.0], [.6, 0, -.45], [1, -.2, -.7]] },
  slant: { k: [[0, -.3, -1], [.3, -1.2, -2.7], [.62, 1.1, -.6], [1, .4, -.9]] },
  rising: { k: [[0, -.2, -.6], [.2, .3, -.25], [.48, -.2, -2.8], [.62, 1.0, -1.5], [.85, -1.3, -1.6], [1, -.4, -1]] },
  spin: { k: [[0, -1.5, -1.55], [1, -1.5, -1.55]], spin: 2 },
  thrust: { k: [[0, -.1, -1.1], [.3, -.25, -1.35], [.5, 0, -1.57], [1, 0, -1.45]] },
  flurry: { k: [[0, -1.5, -1.5], [.12, 1.4, -1.5], [.26, -1.4, -1.6], [.4, 0, -3.0], [.54, 0, -.5], [.68, 1.3, -1.5], [.84, -1.4, -1.5], [1, 0, -1.57]] },
};
function samplePose(name, t) {
  const k = ANIM[name].k; if (t <= k[0][0]) return k[0];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0]), e = u * u * (3 - 2 * u); return [t, lerp(a[1], b[1], e), lerp(a[2], b[2], e)]; }
  return k[k.length - 1];
}
function animAvatar(A, dt, o) { // o: {speed, anim, t, airborne, roll, sheathed}
  const sp = Math.min(o.speed, 14);
  A.walk += dt * sp * 1.15;
  const amp = Math.min(1, sp / 7) * .72, w = Math.sin(A.walk), c = Math.cos(A.walk);
  A.legs[0].rotation.x = w * amp; A.legs[1].rotation.x = -w * amp;
  A.knees[0].rotation.x = Math.max(0, -c) * amp * 1.3; A.knees[1].rotation.x = Math.max(0, c) * amp * 1.3;
  if (o.airborne) { A.legs[0].rotation.x = -.6; A.legs[1].rotation.x = .25; A.knees[0].rotation.x = .9; A.knees[1].rotation.x = .4; }
  A.body.position.y = .98 + Math.abs(c) * .05 * amp + (sp < .5 ? Math.sin(NOW * 2.2) * .006 : 0);
  let sy, spi, spin = 0;
  if (o.anim && ANIM[o.anim]) { const p = samplePose(o.anim, clamp(o.t, 0, 1)); sy = p[1]; spi = p[2]; if (ANIM[o.anim].spin) spin = ANIM[o.anim].spin * TAU * smooth(0, 1, o.t); }
  else if (o.sheathed) { sy = 0; spi = w * amp * .8 - .06; }
  else { sy = -.35; spi = -.85 + w * amp * .15; }
  const k = o.anim ? 1 : Math.min(1, dt * 10);
  A.armR.yaw.rotation.y = lerp(A.armR.yaw.rotation.y, sy, k);
  A.armR.pitch.rotation.x = lerp(A.armR.pitch.rotation.x, spi, k);
  A.armL.pitch.rotation.x = lerp(A.armL.pitch.rotation.x, -w * amp * .8 - .06, Math.min(1, dt * 10));
  A.body.rotation.y = o.anim ? sy * .3 : 0;
  A.body.rotation.x = o.roll ? o.roll * TAU : Math.min(sp / 12, 1) * .12;
  const flare = (sp / 12) * .42 + (o.airborne ? .3 : 0);
  A.tails.forEach((t, i) => { t.rotation.x = lerp(t.rotation.x, flare + Math.sin(A.walk * 2 + i) * .05 * amp, Math.min(1, dt * 7)); });
  if (A.ptail) A.ptail.rotation.x = lerp(A.ptail.rotation.x, (sp / 12) * .9 + .1 + Math.sin(NOW * 3) * .05 + (o.airborne ? .5 : 0), Math.min(1, dt * 6));
  return spin;
}

/* ================= monsters ================= */
function collectMats(g) { const s = new Set(); g.traverse(o => { if (o.isMesh && o.material.emissive) s.add(o.material); }); const a = [...s]; a.forEach(mt => { mt.userData.e0 = mt.emissive.clone(); mt.userData.ei0 = mt.emissiveIntensity; }); return a; }

function buildBoar(tint) {
  const m = mats(tint), g = new THREE.Group();
  const fur = m(0x6b4a32), dark = m(0x34231a), belly = m(0x9a7656), tusk = m(0xf2ead8, { roughness: .4 }), eye = glowMat(m, 0xff3b2f), hoof = m(0x1e1e1e), snout = m(0xc98d7a);
  const body = grp(g, 0, 1.0, 0);
  P(body, Gs(1, 14, 10), fur, 0, 0, 0, 0, 0, 0, .85, .8, 1.3);
  P(body, Gs(1, 12, 8), belly, 0, -.28, .1, 0, 0, 0, .68, .5, 1.05);
  P(body, Gs(1, 12, 8), dark, 0, .42, .35, 0, 0, 0, .62, .48, .75);
  for (let i = 0; i < 12; i++) P(body, Gk(.08, .5 - Math.abs(i - 4) * .025, 4), dark, (i % 2 - .5) * .08, .8 - Math.abs(i - 3) * .035, 1.0 - i * .19, -.55, 0, 0);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P(body, Gk(.06, .3, 4), dark, s * .55, .25, .6 - i * .35, -.4, 0, s * -.9);
  const head = grp(body, 0, .05, 1.2);
  P(head, Gs(1, 12, 9), fur, 0, 0, .1, 0, 0, 0, .55, .52, .62);
  P(head, Gc(.27, .36, .62, 10), fur, 0, -.12, .55, Math.PI / 2, 0, 0);
  P(head, Gc(.29, .29, .06, 12), snout, 0, -.12, .87, Math.PI / 2, 0, 0);
  for (const s of [-1, 1]) {
    P(head, Gs(.05, 6, 4), dark, s * .1, -.1, .9);
    P(head, Gk(.075, .55, 6), tusk, s * .28, -.08, .68, -.75, 0, s * .55);
    P(head, Gk(.05, .25, 5), tusk, s * .2, -.2, .78, -.4, 0, s * .3);
    P(head, Gs(.075, 8, 6), eye, s * .26, .16, .42);
    P(head, Gs(.09, 6, 5), dark, s * .27, .22, .4, 0, 0, 0, 1.4, .5, 1);
    P(head, Gk(.14, .38, 4), dark, s * .33, .4, .02, -.3, 0, s * -.55);
  }
  const legs = [];
  for (const [x, z] of [[-.45, .75], [.45, .75], [-.45, -.75], [.45, -.75]]) { const L = grp(g, x, .92, z); P(L, Gs(.2, 8, 6), fur, 0, 0, 0); P(L, Gc(.14, .1, .7, 8), fur, 0, -.38, 0); P(L, Gc(.12, .13, .16, 8), hoof, 0, -.82, 0); legs.push(L); }
  const tail = grp(body, 0, .25, -1.28); P(tail, Gc(.04, .02, .5, 4), dark, 0, -.2, -.1, -.6, 0, 0); P(tail, Gs(.08, 5, 4), dark, 0, -.44, -.25);
  return { g, body, head, legs, tail, h: 2.2, r: 1.2, gait: 'quad', m };
}
function buildWolf(tint) {
  const m = mats(tint), g = new THREE.Group();
  const fur = m(0x4a4f5c), dark = m(0x262833), light = m(0x9aa0aa), eye = glowMat(m, 0xffd24a, 2.8), fang = m(0xf4efe2), nose = m(0x0e0e0e);
  const body = grp(g, 0, 1.05, 0);
  P(body, Gs(1, 12, 9), fur, 0, 0, -.15, 0, 0, 0, .48, .5, 1.05);
  P(body, Gs(1, 12, 9), fur, 0, .08, .55, 0, 0, 0, .58, .64, .6);
  P(body, Gs(1, 10, 8), light, 0, -.18, .68, 0, 0, 0, .42, .44, .42);
  for (let i = 0; i < 9; i++) P(body, Gk(.09, .42, 4), dark, 0, .52 - i * .02, .7 - i * .22, -1.0, 0, 0);
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) P(body, Gk(.07, .32, 4), light, s * .45, -.05 + (i % 2) * .08, .8 - i * .11, .2, 0, s * -1.2);
  const head = grp(body, 0, .45, 1.05);
  P(head, Gs(1, 10, 8), fur, 0, 0, 0, 0, 0, 0, .38, .36, .44);
  P(head, Gb(.3, .22, .55), fur, 0, -.08, .42);
  P(head, Gb(.26, .09, .5), light, 0, -.22, .4);
  P(head, Gs(.07, 6, 4), nose, 0, 0, .7);
  for (const s of [-1, 1]) {
    P(head, Gk(.12, .36, 4), dark, s * .2, .36, -.05, -.2, 0, s * -.25);
    P(head, Gs(.055, 8, 6), eye, s * .16, .1, .3);
    P(head, Gk(.03, .14, 4), fang, s * .09, -.26, .6, Math.PI, 0, 0);
    P(head, Gk(.03, .1, 4), fang, s * .07, -.17, .62);
    for (let i = 0; i < 3; i++) P(head, Gk(.06, .28, 4), light, s * .3, -.1 + i * .1, -.15, 0, 0, s * -1.3);
  }
  const legs = [];
  for (const [x, z] of [[-.27, .55], [.27, .55], [-.28, -.65], [.28, -.65]]) { const L = grp(g, x, .86, z); P(L, Gc(.12, .08, .5, 7), fur, 0, -.22, 0); P(L, Gc(.07, .06, .38, 7), dark, 0, -.62, 0); P(L, Gs(.09, 6, 4), dark, 0, -.82, .04, 0, 0, 0, 1, .6, 1.3); legs.push(L); }
  const tail = grp(body, 0, .15, -1.1); let t = tail;
  for (let i = 0; i < 4; i++) { const n = grp(t, 0, 0, -.22); P(n, Gk(.12 - i * .02, .32, 5), i % 2 ? dark : fur, 0, 0, -.05, -Math.PI / 2, 0, 0); n.rotation.x = .25; t = n; }
  return { g, body, head, legs, tail, h: 2.1, r: 1.0, gait: 'quad', m };
}
function pitcherGeo() { return cg('pitcher', () => new THREE.LatheGeometry([[0, 0], [.42, .08], [.66, .42], [.64, 1.0], [.5, 1.38], [.62, 1.55], [.74, 1.6]].map(p => new THREE.Vector2(p[0], p[1])), 14)); }
function buildPlant(tint) {
  const m = mats(tint), g = new THREE.Group();
  const stem = m(0x3f7a2a), leaf = m(0x4f9a34), vein = m(0x9ad06a), pitch = m(0x7aa83a, { side: THREE.DoubleSide }), lip = m(0xb03a4a), mouth = m(0x3a0a12), tooth = m(0xf2eedc), bulb = glowMat(m, 0xffe36a, 2.2), root = m(0x5a3a22);
  const legs = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, L = grp(g, Math.sin(a) * .35, .12, Math.cos(a) * .35); L.rotation.y = a; P(L, Gk(.12, 1.1, 5), root, 0, 0, .45, Math.PI / 2, 0, 0); legs.push(L); }
  const body = grp(g, 0, 0, 0);
  P(body, Gc(.16, .24, 1.4, 8), stem, 0, .7, 0);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + .4, L = grp(body, 0, .3 + i * .09, 0); L.rotation.y = a; P(L, Gs(1, 10, 6), leaf, 0, 0, .7, -.25, 0, 0, .35, .06, .8); P(L, Gb(.04, .02, 1.1), vein, 0, .05, .65, -.25, 0, 0); }
  const head = grp(body, 0, 1.4, 0);
  P(head, pitcherGeo(), pitch, 0, 0, 0);
  P(head, Gt(.66, .07), lip, 0, 1.57, 0, Math.PI / 2, 0, 0);
  P(head, Gc(.55, .55, .04, 12), mouth, 0, 1.42, 0);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P(head, Gk(.06, .24, 4), tooth, Math.sin(a) * .6, 1.62, Math.cos(a) * .6, -Math.cos(a) * .7, 0, Math.sin(a) * .7); }
  for (let i = 0; i < 6; i++) P(head, Gs(.1, 6, 4), bulb, Math.sin(i * 1.3) * .62, .4 + i * .17, Math.cos(i * 1.3) * .62);
  const lid = grp(head, 0, 1.6, -.6); P(lid, Gs(1, 10, 5), leaf, 0, .1, .5, 0, 0, 0, .6, .08, .6); lid.rotation.x = -.5;
  const vines = [];
  for (const s of [-1, 1]) { const v = grp(body, s * .15, 1.0, 0); let t = v; for (let i = 0; i < 5; i++) { const n = grp(t); n.position.set(s * .3, 0, 0); P(n, Gc(.06 - i * .008, .06 - i * .008, .34, 5), stem, 0, 0, 0, 0, 0, Math.PI / 2); if (i > 1) P(n, Gk(.04, .16, 4), tooth, 0, .08, 0); n.rotation.z = s * -.25; t = n; } vines.push(v); }
  return { g, body, head, legs, vines, lid, h: 3.4, r: 1.0, gait: 'plant', m };
}
function buildHornet(tint) {
  const m = mats(tint), g = new THREE.Group();
  const blk = m(0x1c1a14), yel = m(0xf2b81e), eye = glowMat(m, 0xff4030, 1.4), sting = m(0xe8e0c0);
  const wingM = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: .45, side: THREE.DoubleSide, roughness: .2, depthWrite: false });
  const body = grp(g, 0, 2.1, 0);
  P(body, Gs(.42, 12, 10), blk, 0, 0, 0, 0, 0, 0, 1, .95, 1.1);
  P(body, Gs(.36, 12, 10), yel, 0, .05, 0, 0, 0, 0, 1.02, .7, 1.06);
  const abd = grp(body, 0, -.05, -.4); abd.rotation.x = .55;
  for (let i = 0; i < 5; i++) P(abd, Gc(.36 - i * .05, .33 - i * .06, .22, 12), i % 2 ? blk : yel, 0, 0, -.12 - i * .2, Math.PI / 2, 0, 0);
  P(abd, Gk(.07, .45, 6), sting, 0, 0, -1.25, -Math.PI / 2, 0, 0);
  const head = grp(body, 0, .08, .48);
  P(head, Gs(.3, 12, 10), blk, 0, 0, 0);
  for (const s of [-1, 1]) {
    P(head, Gs(.17, 10, 8), eye, s * .18, .06, .12, 0, 0, 0, .8, 1.2, .9);
    P(head, Gk(.04, .25, 4), yel, s * .08, -.2, .26, 2.4, 0, s * .3);
    const an = grp(head, s * .1, .22, .15); P(an, Gc(.015, .015, .5, 4), blk, 0, .25, 0); an.rotation.set(.6, 0, s * -.4);
  }
  const wings = [];
  for (const s of [-1, 1]) for (const k of [0, 1]) { const w = grp(body, s * .18, .32, .1 - k * .25); const wm2 = P(w, cg('wing', () => { const gg = new THREE.PlaneGeometry(1.4, .45); gg.translate(.7, 0, 0); return gg; }), wingM, 0, 0, 0, Math.PI / 2, 0, 0); wm2.castShadow = false; w.scale.x = s; w.rotation.y = s * (k ? -.25 : .15); wings.push(w); }
  const legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const L = grp(body, s * .22, -.3, .15 - i * .18); P(L, Gc(.025, .02, .6, 4), blk, 0, -.3, 0); L.rotation.z = s * .3; legs.push(L); }
  return { g, body, head, legs, wings, abd, h: 3.0, r: .9, gait: 'hover', m };
}
function humanoid(o) {
  const g = new THREE.Group(), t = o.thick || 1;
  const body = grp(g, 0, o.hip, 0), legs = [];
  for (const s of [-1, 1]) { const L = grp(g, s * .18 * t, o.hip, 0); P(L, Gc(.12 * t, .1 * t, .5, 8), o.legM, 0, -.25, 0); P(L, Gs(.1 * t, 6, 5), o.legM, 0, -.52, 0); P(L, Gc(.1 * t, .08 * t, .45, 8), o.legM, 0, -.75, 0); P(L, Gb(.2 * t, .1, .32 * t), o.footM, 0, -o.hip + .05, .07); legs.push(L); }
  const arms = [];
  for (const s of [-1, 1]) { const yaw = grp(body, s * o.sh, .78, 0), pitch = grp(yaw); P(pitch, Gs(.11 * t, 6, 5), o.torsoM, 0, 0, 0); P(pitch, Gc(.09 * t, .08 * t, .42, 8), o.armM, 0, -.22, 0); P(pitch, Gc(.08 * t, .07 * t, .4, 8), o.armM, 0, -.6, 0); P(pitch, Gs(.085 * t, 6, 5), o.skinM, 0, -.83, 0); yaw.rotation.z = s * .12; arms.push({ yaw, pitch }); }
  const head = grp(body, 0, 1.15, 0);
  return { g, body, head, legs, armR: arms[0], armL: arms[1] };
}
function buildGoblin(tint) {
  const m = mats(tint);
  const skin = m(0x6f9a3a), leather = m(0x5a3c22), metal = m(0x8a8f96, { metalness: .55, roughness: .4 }), cloth = m(0x7a2a24), eye = glowMat(m, 0xffc83a, 2.4), wood = m(0x6b4a2a), dark = m(0x221f18), tooth = m(0xeee6cc);
  const H = humanoid({ hip: .82, sh: .38, torsoM: leather, armM: skin, legM: skin, footM: dark, skinM: skin, thick: .95 });
  P(H.body, Gc(.32, .26, .66, 8), leather, 0, .42, 0);
  P(H.body, Gs(.3, 8, 6), skin, 0, .2, .06, 0, 0, 0, 1, .8, .9);
  P(H.body, Gb(.56, .09, .38), dark, 0, .06, 0); P(H.body, Gb(.1, .1, .04), metal, 0, .06, .2);
  P(H.body, Gb(.32, .36, .05), cloth, 0, -.15, .17, .1, 0, 0); P(H.body, Gb(.32, .36, .05), cloth, 0, -.15, -.17, -.1, 0, 0);
  P(H.body, Gs(.2, 8, 5), metal, -.42, .84, 0, 0, 0, 0, 1.1, .7, 1); P(H.body, Gk(.05, .2, 4), metal, -.46, 1.0, 0);
  P(H.body, Gb(.06, .7, .42), leather, .05, .5, 0, 0, 0, .7);
  for (let i = 0; i < 3; i++) P(H.body, Gs(.05, 5, 4), tooth, .18 - i * .06, .62, .26);
  P(H.head, Gs(.27, 12, 10), skin, 0, 0, 0, 0, 0, 0, 1, .95, 1.05);
  for (const s of [-1, 1]) { P(H.head, Gk(.1, .5, 4), skin, s * .34, .06, -.02, 0, 0, -s * Math.PI / 2 * .8); P(H.head, Gs(.05, 6, 4), eye, s * .1, .05, .23); P(H.head, Gk(.025, .09, 4), tooth, s * .07, -.12, .24); }
  P(H.head, Gk(.06, .2, 4), skin, 0, -.02, .3, Math.PI / 2, 0, 0);
  P(H.head, Ghs(.3), metal, 0, .06, 0); P(H.head, Gk(.05, .28, 4), metal, 0, .42, 0); P(H.head, Gb(.62, .05, .05), metal, 0, .1, .18);
  const sp = grp(H.armR.pitch, 0, -.83, 0); P(sp, Gc(.035, .035, 2.3, 6), wood, 0, 0, .35, Math.PI / 2, 0, 0); P(sp, Gk(.08, .34, 4), metal, 0, 0, 1.62, Math.PI / 2, 0, 0); P(sp, Gb(.1, .04, .04), cloth, 0, 0, 1.38);
  P(H.armL.pitch, Gc(.32, .32, .06, 12), wood, .12, -.55, 0, 0, 0, Math.PI / 2); P(H.armL.pitch, Gs(.09, 6, 4), metal, .16, -.55, 0); P(H.armL.pitch, Gt(.32, .025), metal, .15, -.55, 0, 0, Math.PI / 2, 0);
  return Object.assign(H, { h: 2.1, r: .7, gait: 'biped', rest: .2, m });
}
function buildSkeleton(tint) {
  const m = mats(tint);
  const bone = m(0xe6dfc8), dark = m(0x141414), glow = glowMat(m, 0x5fd8ff, 3), rust = m(0x8a6a4a, { metalness: .45, roughness: .5 }), cloth = m(0x3a3550, { side: THREE.DoubleSide }), iron = m(0x5a5e66, { metalness: .5 });
  const H = humanoid({ hip: 1.0, sh: .42, torsoM: bone, armM: bone, legM: bone, footM: bone, skinM: bone, thick: .6 });
  P(H.body, Gc(.05, .05, .85, 6), bone, 0, .42, -.05);
  for (let i = 0; i < 4; i++) P(H.body, Gt(.25 - i * .025, .035, TAU * .8), bone, 0, .42 + i * .12, 0, Math.PI / 2, 0, Math.PI * .6);
  P(H.body, Gb(.42, .12, .2), bone, 0, -.02, 0);
  P(H.body, Gb(.66, .08, .18), iron, 0, .86, 0);
  const cape = P(H.body, Gb(.62, 1.0, .02), cloth, 0, .32, -.24, .12, 0, 0);
  P(H.head, Gs(.24, 10, 8), bone, 0, .02, 0, 0, 0, 0, .95, 1, 1.05);
  P(H.head, Gb(.22, .08, .2), bone, 0, -.17, .06);
  for (const s of [-1, 1]) { P(H.head, Gs(.07, 6, 4), dark, s * .09, .03, .17); P(H.head, Gs(.032, 6, 4), glow, s * .09, .03, .23); }
  P(H.head, Gb(.02, .06, .02), dark, 0, -.06, .24);
  const sw = grp(H.armR.pitch); P(sw, Gb(.09, 1.05, .025), rust, 0, -1.42, .02); P(sw, Gb(.28, .05, .08), iron, 0, -.88, 0); P(sw, Gc(.03, .03, .2, 5), dark, 0, -.76, 0);
  P(H.armL.pitch, Gb(.06, .6, .5), iron, .12, -.55, 0);
  return Object.assign(H, { h: 2.3, r: .6, gait: 'biped', rest: .4, cape, m });
}
function buildGolem(tint) {
  const m = mats(tint);
  const rock = m(0x7d7f78), rock2 = m(0x5f625c), moss = m(0x4f7d32), core = glowMat(m, 0x5fffc8, 3), crys = m(0x9fe8ff, { emissive: 0x3a90d0, emissiveIntensity: 1.2, metalness: .2, roughness: .3 });
  const H = humanoid({ hip: 1.15, sh: .95, torsoM: rock, armM: rock2, legM: rock2, footM: rock, skinM: rock, thick: 1.9 });
  P(H.body, Gd(.78), rock, 0, .6, 0, 0, 0, 0, 1.25, 1, .95);
  P(H.body, Gd(.48), rock2, 0, -.02, 0);
  P(H.body, Gs(.32, 6, 4), moss, -.35, 1.05, -.25, 0, 0, 0, 1.5, .35, 1.2); P(H.body, Gs(.28, 6, 4), moss, .4, .95, .1, 0, 0, 0, 1.2, .35, 1.3); P(H.body, Gs(.25, 6, 4), moss, 0, .3, -.6, 0, 0, 0, 1.4, .4, .5);
  P(H.body, Go(.22), core, 0, .62, .68); P(H.body, Gt(.3, .05), rock2, 0, .62, .62);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P(H.body, Gk(.1, .5 - i * .1, 5), crys, s * (.8 + i * .08), 1.2, -.1 + i * .18, 0, 0, -s * .3);
  H.head.position.y = 1.45;
  P(H.head, Gi(.34), rock, 0, 0, .05); P(H.head, Gb(.5, .08, .1), rock2, 0, .12, .28);
  for (const s of [-1, 1]) P(H.head, Gb(.1, .05, .05), core, s * .13, .03, .32);
  for (const a of [H.armR, H.armL]) { P(a.pitch, Gd(.42), rock, 0, -.95, 0); P(a.pitch, Gd(.3), rock2, 0, -.1, 0); P(a.pitch, Gs(.2, 6, 4), moss, 0, -.4, -.15, 0, 0, 0, 1.2, .4, 1); }
  return Object.assign(H, { h: 3.4, r: 1.3, gait: 'biped', rest: .1, m });
}
function buildLizard(tint) {
  const m = mats(tint);
  const sc = m(0x3f7a4a), belly = m(0xc8c08a), dark = m(0x24402a), eye = glowMat(m, 0xffe14a, 2.2), metal = m(0xb0b6bc, { metalness: .6, roughness: .35 }), leather = m(0x6a4a2a), gold = m(0xc8a040, { metalness: .6, roughness: .35 });
  const H = humanoid({ hip: 1.05, sh: .44, torsoM: sc, armM: sc, legM: sc, footM: dark, skinM: sc, thick: 1.05 });
  P(H.body, Gc(.37, .3, .78, 8), sc, 0, .42, 0); P(H.body, Gb(.34, .6, .12), belly, 0, .42, .26);
  P(H.body, Gb(.08, .85, .44), leather, 0, .45, 0, 0, 0, .6); P(H.body, Gb(.6, .1, .42), leather, 0, .04, 0); P(H.body, Gs(.08, 5, 4), gold, 0, .04, .22);
  for (let i = 0; i < 5; i++) P(H.body, Gk(.06, .3, 4), dark, 0, .85 - i * .17, -.3, -1.1, 0, 0);
  P(H.body, Gs(.22, 8, 5), metal, -.46, .84, 0, 0, 0, 0, 1.1, .7, 1.1);
  P(H.head, Gs(.22, 8, 6), sc, 0, 0, 0); P(H.head, Gb(.22, .16, .42), sc, 0, -.04, .28); P(H.head, Gb(.2, .06, .38), belly, 0, -.13, .26);
  for (const s of [-1, 1]) { P(H.head, Gs(.05, 6, 4), eye, s * .14, .08, .12); P(H.head, Gk(.03, .08, 4), belly, s * .07, -.1, .42, Math.PI, 0, 0); }
  for (let i = 0; i < 4; i++) P(H.head, Gk(.06, .34, 4), dark, 0, .2 - i * .04, -.06 - i * .11, -.9, 0, 0);
  const tail = grp(H.body, 0, -.05, -.28); let t = tail;
  for (let i = 0; i < 5; i++) { const n = grp(t, 0, 0, -.3); P(n, Gk(.17 - i * .03, .4, 6), i % 2 ? dark : sc, 0, 0, -.08, -Math.PI / 2, 0, 0); n.rotation.x = .18; t = n; }
  const sw = grp(H.armR.pitch, 0, -.83, 0); P(sw, Gc(.03, .03, .22, 5), leather, 0, .04, 0); P(sw, Gb(.26, .05, .08), gold, 0, -.08, 0); P(sw, Gb(.12, .6, .025), metal, 0, -.42, 0); P(sw, Gb(.13, .5, .025), metal, .04, -.92, 0, 0, 0, .18); P(sw, Gk(.065, .22, 4), metal, .08, -1.25, 0, Math.PI, 0, .3);
  P(H.armL.pitch, Gc(.34, .34, .07, 10), leather, .12, -.55, 0, 0, 0, Math.PI / 2); P(H.armL.pitch, Gt(.34, .03), gold, .16, -.55, 0, 0, Math.PI / 2, 0);
  return Object.assign(H, { h: 2.5, r: .7, gait: 'biped', rest: .3, tail, m });
}

/* ================= boss armor & trophies ================= */
function crown(par, m, y) { const cm = m(0xffcc44, { metalness: .8, roughness: .25, emissive: 0x664400, emissiveIntensity: .6 }); const cr = grp(par, 0, y, 0); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; P(cr, Gk(.06, .26, 4), cm, Math.sin(a) * .2, .1, Math.cos(a) * .2); } P(cr, Gt(.2, .04), cm, 0, 0, 0, Math.PI / 2, 0, 0); return cr; }
function adornBoss(kind, p) {
  const m = p.m, metal = m(0x4e525a, { metalness: .75, roughness: .32 }), gold = m(0xd8b45a, { metalness: .75, roughness: .3 });
  if (kind === 'boar') {
    const glow = glowMat(m, 0xff3a1a, 3.2);
    P(p.head, Gb(.62, .14, .6), metal, 0, .37, .12); P(p.head, Gb(.42, .1, .08), metal, 0, .3, .44);
    for (const s of [-1, 1]) { P(p.head, Gk(.09, .65, 6), gold, s * .3, .55, .05, -.55, 0, s * -.65); P(p.head, Gs(.1, 8, 6), glow, s * .26, .16, .44); P(p.head, Gt(.09, .025), gold, s * .28, -.06, .64, Math.PI / 2 - .75, 0, s * .55); }
    for (let i = 0; i < 4; i++) { P(p.body, Gb(1.0, .1, .42), metal, 0, .78 - Math.abs(i - 1.5) * .04, .75 - i * .45, 0, 0, 0); P(p.body, Gk(.09, .45, 5), gold, 0, .98, .75 - i * .45); }
    for (const s of [-1, 1]) P(p.body, Gb(.08, .55, 1.6), metal, s * .78, .1, 0, 0, 0, s * .25);
  } else if (kind === 'golem') {
    const crys = m(0xbff0ff, { emissive: 0x4fc8ff, emissiveIntensity: 2.6, roughness: .2 }), rune = glowMat(m, 0x5fffc8, 3.4);
    for (let i = 0; i < 5; i++) { const a = (i - 2) * .35; P(p.head, Gk(.09, .7 - Math.abs(i - 2) * .12, 5), crys, Math.sin(a) * .25, .4, -.05, 0, 0, -a); }
    for (const [x, y, rz] of [[-.3, .7, .3], [.3, .7, -.3], [0, .3, 0], [-.45, .45, .9], [.45, .45, -.9]]) P(p.body, Gb(.05, .45, .02), rune, x, y, .74, 0, 0, rz);
    const orb = grp(p.body, 0, .6, 0); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; P(orb, Gd(.18 + (i % 3) * .05), i % 2 ? crys : m(0x6d6f68), Math.cos(a) * 1.5, Math.sin(a * 2) * .25, Math.sin(a) * 1.5); }
    p.orbit = orb;
  } else if (kind === 'lizard') {
    crown(p.head, m, .26);
    P(p.body, Gb(.85, 1.3, .03), m(0x8a1a1a, { side: THREE.DoubleSide }), 0, .22, -.38, .2, 0, 0);
    P(p.armR.pitch, Gb(.04, .95, .03), glowMat(m, 0xff7a2a, 3.4), .02, -1.25, .03, 0, 0, .1);
    for (const s of [-1, 1]) { P(p.body, Gs(.24, 8, 6), metal, s * .5, .86, 0, 0, 0, 0, 1.2, .7, 1.1); P(p.body, Gk(.06, .38, 5), gold, s * .62, 1.0, 0, 0, 0, s * -.7); }
  } else if (kind === 'wolf') {
    const crys = m(0xd8f4ff, { emissive: 0x6fc8ff, emissiveIntensity: 2.4, roughness: .15 });
    for (let i = 0; i < 8; i++) P(p.body, Gk(.12, .8 - Math.abs(i - 2) * .08, 5), crys, 0, .55, .7 - i * .24, -.55, 0, 0);
    for (const s of [-1, 1]) { P(p.head, Gk(.07, .6, 5), crys, s * .16, .4, -.08, -.6, 0, s * -.3); P(p.head, Gs(.07, 8, 6), glowMat(m, 0x9fe8ff, 3.5), s * .16, .1, .31); }
    for (let i = 0; i < 6; i++) P(p.body, Gk(.1, .5, 4), crys, (i % 2 ? 1 : -1) * .35, .35, .9 - i * .08, .3, 0, (i % 2 ? -1 : 1) * 1.1);
  } else if (kind === 'plant') {
    const thorn = m(0x3a2a1a), bulb = glowMat(m, 0xff6aff, 3);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P(p.head, Gk(.07, .45, 4), thorn, Math.sin(a) * .78, 1.72, Math.cos(a) * .78, Math.cos(a) * .9, 0, -Math.sin(a) * .9); }
    p.extra = [];
    for (const s of [-1, 1]) {
      const v = grp(p.body, s * .9, 1.2, -.1); P(v, Gc(.07, .1, 1.2, 6), m(0x3f7a2a), -s * .4, -.4, 0, 0, 0, s * .8);
      const hd = grp(v, 0, .2, 0); P(hd, pitcherGeo(), m(0x8a5ab0, { side: THREE.DoubleSide }), 0, 0, 0, 0, 0, 0, .45, .45, .45); P(hd, Gc(.25, .25, .03, 10), m(0x3a0a12), 0, .64, 0);
      for (let i = 0; i < 3; i++) P(hd, Gs(.06, 6, 4), bulb, Math.sin(i * 2) * .28, .25 + i * .1, Math.cos(i * 2) * .28);
      p.extra.push(hd);
    }
  } else if (kind === 'skeleton') {
    const red = glowMat(m, 0xff3a2a, 3.4);
    P(p.head, Ghs(.27), metal, 0, .04, 0);
    for (const s of [-1, 1]) { const h = grp(p.head, s * .2, .15, 0); P(h, Gk(.07, .42, 6), m(0xe8dcc0), s * .12, .16, 0, 0, 0, s * -1.0); P(h, Gk(.045, .3, 6), m(0xe8dcc0), s * .3, .4, 0, 0, 0, s * -.2); }
    P(p.armR.pitch, Gb(.2, 1.9, .05), metal, 0, -1.9, .03); P(p.armR.pitch, Gb(.05, 1.6, .06), red, 0, -1.85, .03); P(p.armR.pitch, Gb(.5, .08, .12), gold, 0, -.95, 0);
    P(p.body, Gb(.9, 1.4, .02), m(0x7a1010, { side: THREE.DoubleSide }), 0, .16, -.3, .16, 0, 0);
    P(p.body, Go(.13), red, 0, .55, 0);
    const orb = grp(p.body, 0, .7, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; P(orb, Gs(.07, 8, 6), glowMat(m, 0x7fd8ff, 3.6), Math.cos(a) * .8, Math.sin(a * 2) * .2, Math.sin(a) * .8); }
    p.orbit = orb;
  } else crown(p.head, m, .4);
}

/* ================= monster table ================= */
const MOBS = {
  boar: { name: 'Bristleback Boar', noun: 'Boar', speed: 6.5, aggro: 13, range: 2.6, hpm: 1, atkm: 1, mat: 'Boar Hide', matP: 12, build: buildBoar, c: [0x6b4a32, 0x9a7656] },
  wolf: { name: 'Dusk Wolf', noun: 'Wolf', speed: 8, aggro: 16, range: 2.4, hpm: .85, atkm: 1.1, mat: 'Wolf Fang', matP: 16, build: buildWolf, c: [0x4a4f5c, 0x9aa0aa] },
  plant: { name: 'Snapvine Pitcher', noun: 'Pitcher', speed: 2.2, aggro: 10, range: 3.4, hpm: 1.2, atkm: 1, mat: 'Nectar Sac', matP: 14, build: buildPlant, c: [0x4f9a34, 0xb03a4a] },
  hornet: { name: 'Needle Hornet', noun: 'Hornet', speed: 7, aggro: 14, range: 2.5, hpm: .7, atkm: 1.15, mat: 'Hornet Stinger', matP: 18, build: buildHornet, c: [0xf2b81e, 0x1c1a14] },
  goblin: { name: 'Goblin Skirmisher', noun: 'Goblin', speed: 5.5, aggro: 15, range: 3.0, hpm: 1, atkm: 1.05, mat: 'Crude Iron', matP: 20, build: buildGoblin, c: [0x6f9a3a, 0x8a8f96] },
  skeleton: { name: 'Restless Bones', noun: 'Bonewalker', speed: 4.8, aggro: 14, range: 2.9, hpm: 1.1, atkm: 1.1, mat: 'Bone Shard', matP: 22, build: buildSkeleton, c: [0xe6dfc8, 0x5fd8ff] },
  golem: { name: 'Moss Golem', noun: 'Golem', speed: 3.6, aggro: 12, range: 3.6, hpm: 1.8, atkm: 1.25, mat: 'Golem Core', matP: 30, build: buildGolem, c: [0x7d7f78, 0x5fffc8] },
  lizard: { name: 'Scale Warrior', noun: 'Lizardman', speed: 5.8, aggro: 15, range: 2.9, hpm: 1.1, atkm: 1.1, mat: 'Lizard Scale', matP: 24, build: buildLizard, c: [0x3f7a4a, 0xc8c08a] },
};
