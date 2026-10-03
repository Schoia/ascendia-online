'use strict';
/* Ascendia Online · gameplay: player, combat, monsters, bosses, quests, smithing, HUD, windows, multiplayer, input, title and main loop. */

/* ================= effects ================= */
const FX = [];
const bright = (c, k) => new THREE.Color(c).multiplyScalar(hdr ? k : 1);
let shakeAmt = 0, hitStop = 0;
const shake = a => { shakeAmt = Math.max(shakeAmt, a); };
function shatter(pos, colors, count = 30, scale = 1) {
  const geo = cg('shard', () => new THREE.TetrahedronGeometry(.24, 0));
  const ms = colors.map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1 })).concat([new THREE.MeshBasicMaterial({ color: bright(0xbfefff, 3), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })]);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, ms[i % ms.length]); m.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * scale, Math.random() * scale * 1.5, (Math.random() - .5) * scale));
    m.scale.setScalar((.6 + Math.random() * 1.2) * scale * .8); scene.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - .5) * 9, 2 + Math.random() * 7, (Math.random() - .5) * 9).multiplyScalar(.6 + scale * .25), r: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
  }
  const flash = new THREE.Mesh(Gs(1, 16, 10), new THREE.MeshBasicMaterial({ color: bright(0xdff6ff, 2.5), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  flash.position.copy(pos).add(new THREE.Vector3(0, scale * .8, 0)); scene.add(flash);
  let t = 0;
  FX.push(dt => {
    t += dt; const k = t / 1.2;
    for (const p of parts) { p.v.y -= 6 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; p.v.multiplyScalar(.985); }
    ms.forEach(m => { m.opacity = 1 - k; }); flash.scale.setScalar((1 + t * 10) * scale); flash.material.opacity = Math.max(0, .9 - t * 3);
    if (k >= 1) { parts.forEach(p => scene.remove(p.m)); ms.forEach(m => m.dispose()); scene.remove(flash); flash.material.dispose(); return false; }
    return true;
  });
}
function ringFx(pos, color, size = 3, dur = .35, y = .15) {
  const m = new THREE.Mesh(cg('ringfx', () => new THREE.RingGeometry(.8, 1, 48)), new THREE.MeshBasicMaterial({ color: bright(color, 2.2), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, pos.y + y, pos.z); scene.add(m); let t = 0;
  FX.push(dt => { t += dt; const k = t / dur; m.scale.setScalar(.3 + k * size); m.material.opacity = .9 * (1 - k); if (k >= 1) { scene.remove(m); m.material.dispose(); return false; } return true; });
}
function sparkFx(pos, color) {
  const m = new THREE.Mesh(Go(.35), new THREE.MeshBasicMaterial({ color: bright(color, 3), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.copy(pos); scene.add(m); let t = 0;
  FX.push(dt => { t += dt; m.scale.setScalar(1 + t * 12); m.rotation.z += dt * 10; m.material.opacity = 1 - t / .18; if (t > .18) { scene.remove(m); m.material.dispose(); return false; } return true; });
}
function slashFx(pos, yaw, color) {
  const m = new THREE.MeshBasicMaterial({ color: bright(color, 3.2), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const g = new THREE.Group(); for (const r of [.75, -.75]) { const p = new THREE.Mesh(cg('slash', () => new THREE.PlaneGeometry(2.6, .1)), m); p.rotation.z = r + (Math.random() - .5) * .5; g.add(p); }
  g.position.copy(pos); g.rotation.y = yaw + Math.PI / 2; scene.add(g); let t = 0;
  FX.push(dt => { t += dt; g.scale.set(1 + t * 3, 1, 1); m.opacity = 1 - t / .22; if (t > .22) { scene.remove(g); m.dispose(); return false; } return true; });
}
function pillarFx(pos, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 10, 24, 1, true), new THREE.MeshBasicMaterial({ color: bright(color, 2), transparent: true, opacity: .6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.position.set(pos.x, pos.y + 5, pos.z); scene.add(m); let t = 0;
  FX.push(dt => { t += dt; m.scale.set(1 + t, 1, 1 + t); m.position.y = pos.y + 5 + t * 3; m.material.opacity = .6 * (1 - t / 1.2); if (t > 1.2) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; } return true; });
}
const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8cbb0, transparent: true, opacity: .5, depthWrite: false });
function dustFx(x, y, z) {
  if (SETTINGS.quality === 'low') return;
  const m = new THREE.Mesh(Gs(.25, 6, 4), dustMat.clone()); m.position.set(x + (Math.random() - .5) * .4, y + .15, z + (Math.random() - .5) * .4); scene.add(m); let t = 0;
  FX.push(dt => { t += dt; m.scale.setScalar(1 + t * 3); m.position.y += dt * .4; m.material.opacity = .45 * (1 - t / .5); if (t > .5) { scene.remove(m); m.material.dispose(); return false; } return true; });
}
const TELE = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
const TELE2 = new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
function makeTele(type, x, z, yaw, size) {
  const g = new THREE.Group(); let geo;
  if (type === 'cleave') { const half = Math.PI / 3; geo = cg(`tc${size}`, () => new THREE.CircleGeometry(size, 32, Math.PI / 2 - half, half * 2)); }
  else if (type === 'slam') geo = cg(`ts${size}`, () => new THREE.CircleGeometry(size, 40));
  else geo = cg(`tl${size}`, () => { const pg = new THREE.PlaneGeometry(4.5, size); pg.translate(0, size / 2, 0); return pg; });
  const outer = new THREE.Mesh(geo, TELE), inner = new THREE.Mesh(geo, TELE2);
  outer.rotation.x = inner.rotation.x = -Math.PI / 2; inner.position.y = .02; g.add(outer); g.add(inner); inner.scale.setScalar(.01);
  g.position.set(x, groundAt(x, z) + .08, z); g.rotation.y = yaw + Math.PI; scene.add(g);
  return { g, inner };
}
function dropTele(o) { if (o && o.tele) { scene.remove(o.tele.g); o.tele = null; } }
// lock-on marker
const lockRing = new THREE.Mesh(new THREE.RingGeometry(.9, 1.05, 4, 1), new THREE.MeshBasicMaterial({ color: bright(0xffd870, 2.2), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
lockRing.rotation.x = -Math.PI / 2; lockRing.visible = false; scene.add(lockRing);
// sword trail
const TRAIL_N = 18, trailGeo = new THREE.BufferGeometry(), trailPos = new Float32Array(TRAIL_N * 6), trailCol = new Float32Array(TRAIL_N * 6);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
(() => { const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } trailGeo.setIndex(idx); })();
const trailMesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
trailMesh.frustumCulled = false; scene.add(trailMesh);
const trailPts = [];
// overhead labels & damage numbers
const labelLayer = $('labels'), labelPool = [], dmgList = [], _v = new THREE.Vector3();
function project(x, y, z) { _v.set(x, y, z).project(camera); if (_v.z > 1 || _v.z < -1) return null; return [(_v.x * .5 + .5) * window.innerWidth, (-_v.y * .5 + .5) * window.innerHeight]; }
function clearNums() { for (const d of dmgList) d.el.remove(); dmgList.length = 0; }
function popNum(x, y, z, text, cls) {
  if (!SETTINGS.dmgNums && cls !== 'xp' && cls !== 'aggro') return;
  const el = document.createElement('div'); el.className = 'dmg ' + (cls || ''); el.textContent = text; labelLayer.appendChild(el);
  dmgList.push({ el, x: x + (Math.random() - .5) * .8, y, z: z + (Math.random() - .5) * .8, t: 0 });
}

/* ================= player ================= */
const PL = { pos: new THREE.Vector3(), vy: 0, yaw: 0, onGround: true, act: null, actT: 0, hitIdx: 0, combo: 0, comboT: 0, buffer: false, dodgeT: 0, dodgeCd: 0, dodgeDir: new THREE.Vector3(), invuln: 0, cds: {}, dead: false, inSafe: null, lastHurt: -99, lastCombat: -99, potT: 0, potRate: 0, potCd: 0, model: null, lock: 0, target: null, speedNow: 0, dustT: 0, atkStamp: 0 };
let camYaw = 0, camPitch = .32, camDist = 7.5;
const appearance = () => ({ coat: S.color, hair: S.hair, hs: S.hs, skin: S.skin, tier: curA().t || 0 });
function setAvatar() { if (PL.model) scene.remove(PL.model.g); PL.model = buildAvatar(appearance()); PL.model.g.position.copy(PL.pos); scene.add(PL.model.g); }
const keys = {}, touchMove = { x: 0, y: 0 }; let touchSprint = false, chatOpen = false;
function inputDir() {
  let x = 0, z = 0;
  if (keys.KeyW || keys.ArrowUp) z -= 1; if (keys.KeyS || keys.ArrowDown) z += 1; if (keys.KeyA || keys.ArrowLeft) x -= 1; if (keys.KeyD || keys.ArrowRight) x += 1;
  x += touchMove.x; z += touchMove.y; const l = Math.hypot(x, z); if (l < .1) return null;
  x /= Math.max(1, l); z /= Math.max(1, l); const s = Math.sin(camYaw), c = Math.cos(camYaw);
  return new THREE.Vector3(x * c + z * s, 0, -x * s + z * c);
}
function allTargets() { const a = []; for (const m of monsters) if (!m.dead && !m.dying) a.push(m); if (boss && !boss.dead && !boss.dying) a.push(boss); return a; }
function findTarget(range, arcHalf) {
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw); let best = null, bd = 1e9;
  for (const m of allTargets()) { const dx = m.x - PL.pos.x, dz = m.z - PL.pos.z, d = Math.hypot(dx, dz) - m.r; if (d > range) continue; const ang = Math.acos(clamp((dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1), -1, 1)); if (ang > arcHalf) continue; if (d < bd) { bd = d; best = m; } }
  return best;
}
function toggleLock() {
  if (PL.target) { PL.target = null; SFX.ui(); return; }
  const t = findTarget(30, Math.PI * .55) || findTarget(18, Math.PI);
  if (t) { PL.target = t; SFX.lock(); } else toast('No target in range.', 'sys');
}
function startAttack(def, isSkill) {
  if (PL.dead || uiOpen) return;
  let fy = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
  const tg = (PL.target && !PL.target.dead) ? PL.target : findTarget(8, 1.3);
  if (tg) fy = Math.atan2(tg.x - PL.pos.x, tg.z - PL.pos.z);
  PL.yaw = fy; PL.act = Object.assign({}, def, { skill: isSkill }); PL.actT = 0; PL.hitIdx = 0; PL.atkStamp = Date.now(); PL.lastCombat = NOW;
  setSheath(PL.model, false);
  if (isSkill) { SFX.skill(); PL.model.bladeMat.emissive.setHex(def.color); PL.model.bladeMat.emissiveIntensity = hdr ? 4 : 2.2; ringFx(PL.pos, def.color, 2.5, .4); } else SFX.swing();
  trailPts.length = 0;
}
function tryBasic() { if (PL.act) { if (!PL.act.skill) PL.buffer = true; return; } const step = PL.comboT > 0 ? PL.combo : 0; startAttack(COMBO[step], false); PL.combo = (step + 1) % 3; }
function trySkill(i) {
  const sk = SKILLS[i]; if (!sk || PL.dead || uiOpen) return;
  if (S.lvl < sk.lvl) { toast(`${sk.name} unlocks at level ${sk.lvl}.`, 'sys'); return; }
  if ((PL.cds[sk.id] || 0) > 0 || (PL.act && PL.act.skill)) return;
  PL.cds[sk.id] = sk.cd * cdMul(); startAttack(sk, true);
}
function doHits(def) {
  const fx = Math.sin(PL.yaw), fz = Math.cos(PL.yaw); let any = false, anyCrit = false;
  for (const m of allTargets()) {
    const dx = m.x - PL.pos.x, dz = m.z - PL.pos.z, d = Math.hypot(dx, dz); if (d > (def.range || 3.4) + m.r) continue;
    if ((def.arc || 110) < 360) { const ang = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)) * 180 / Math.PI; if (ang > (def.arc || 110) / 2 && d > m.r + .6) continue; }
    let dmg = atkPow() * def.mult * (.9 + Math.random() * .2); const crit = Math.random() < critCh(); if (crit) dmg *= 1.6; dmg = Math.max(1, Math.round(dmg));
    hitMonster(m, dmg, crit, def.skill ? def.color : 0xcfe6ff, true); any = true; anyCrit = anyCrit || crit;
    slashFx(new THREE.Vector3(m.x - dx / (d || 1) * m.r * .5, m.y + Math.min(m.h * .45, 2.2), m.z - dz / (d || 1) * m.r * .5), PL.yaw, def.skill ? def.color : 0xdff0ff);
    if (def.id === 'rising' && !m.boss) m.lift = .6;
  }
  if (any) { anyCrit ? SFX.crit() : SFX.hit(); if (def.skill || anyCrit) { hitStop = .06; shake(.18); } }
}
function updatePlayer(dt) {
  const A = PL.model;
  for (const k in PL.cds) PL.cds[k] = Math.max(0, PL.cds[k] - dt);
  PL.dodgeCd = Math.max(0, PL.dodgeCd - dt); PL.invuln = Math.max(0, PL.invuln - dt); PL.comboT = Math.max(0, PL.comboT - dt); PL.potCd = Math.max(0, PL.potCd - dt); PL.lock = Math.max(0, PL.lock - dt);
  if (PL.dead) { A.g.visible = false; return; }
  A.g.visible = !(PL.invuln > 0 && PL.dodgeT <= 0 && Math.sin(NOW * 40) > .3 && PL.respawnT > NOW);
  if (PL.target && (PL.target.dead || PL.target.dying || Math.hypot(PL.target.x - PL.pos.x, PL.target.z - PL.pos.z) > 38 || (PL.target.boss !== true && inArena))) PL.target = null;
  const dir = uiOpen || chatOpen ? null : inputDir();
  let sp = 0;
  const sprint = keys.ShiftLeft || keys.ShiftRight || touchSprint;
  if (PL.dodgeT > 0) { PL.dodgeT -= dt; PL.pos.addScaledVector(PL.dodgeDir, 17 * dt); sp = 7; }
  else {
    let ms = 7 * spdMul() * (sprint ? 1.55 : 1);
    if (PL.act) ms *= PL.act.skill ? .12 : .3; if (PL.lock > 0) ms = 0;
    if (dir) { PL.pos.addScaledVector(dir, ms * dt); sp = ms; if (!PL.act) PL.yaw = angLerp(PL.yaw, PL.target ? Math.atan2(PL.target.x - PL.pos.x, PL.target.z - PL.pos.z) : Math.atan2(dir.x, dir.z), Math.min(1, dt * 14)); }
  }
  if (PL.act) {
    const a = PL.act; PL.actT += dt / a.dur;
    if (a.dash && PL.actT > .2 && PL.actT < .55) { PL.pos.x += Math.sin(PL.yaw) * a.dash * dt * 2.3; PL.pos.z += Math.cos(PL.yaw) * a.dash * dt * 2.3; if (Math.random() < .5) dustFx(PL.pos.x, PL.pos.y, PL.pos.z); }
    while (PL.hitIdx < a.hits.length && PL.actT >= a.hits[PL.hitIdx]) { doHits(a); PL.hitIdx++; if (a.skill && a.hits.length > 1) SFX.swing(); }
    if (PL.actT >= 1) { const was = a; PL.act = null; A.bladeMat.emissiveIntensity = 0; A.bladeMat.emissive.setHex(0); if (was.skill) PL.lock = .18; else { PL.comboT = .55; if (PL.buffer) { PL.buffer = false; tryBasic(); } } }
  }
  for (const c of colliders) { const dx = PL.pos.x - c.x, dz = PL.pos.z - c.z, d2 = dx * dx + dz * dz, rr = c.r + .45; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; PL.pos.x += dx * k; PL.pos.z += dz * k; } }
  const lim = inArena ? 41 : R - 4, dd = Math.hypot(PL.pos.x, PL.pos.z); if (dd > lim) { PL.pos.x *= lim / dd; PL.pos.z *= lim / dd; }
  const gy = groundAt(PL.pos.x, PL.pos.z); PL.vy -= 30 * dt; PL.pos.y += PL.vy * dt;
  if (PL.pos.y <= gy) { if (!PL.onGround && PL.vy < -8) { dustFx(PL.pos.x, gy, PL.pos.z); dustFx(PL.pos.x, gy, PL.pos.z); } PL.pos.y = gy; PL.vy = 0; PL.onGround = true; } else if (PL.pos.y > gy + .3) PL.onGround = false;
  if (sprint && sp > 9 && PL.onGround) { PL.dustT -= dt; if (PL.dustT <= 0) { PL.dustT = .14; dustFx(PL.pos.x, PL.pos.y, PL.pos.z); } }
  const sz = safeAt(PL.pos.x, PL.pos.z);
  if (sz !== PL.inSafe) { if (sz) toast(`Entered ${sz.name}. This is a safe zone.`, 'sys'); else if (PL.inSafe) toast('Left the safe zone.', 'sys'); PL.inSafe = sz; }
  const mh = maxHp();
  if (PL.potT > 0) { PL.potT -= dt; S.hp = Math.min(mh, S.hp + PL.potRate * dt); }
  if (PL.inSafe) S.hp = Math.min(mh, S.hp + mh * .09 * dt); else if (NOW - PL.lastHurt > 7) S.hp = Math.min(mh, S.hp + mh * .012 * dt);
  setSheath(A, !PL.act && (PL.inSafe || NOW - PL.lastCombat > 10) && !inArena);
  A.g.position.copy(PL.pos);
  const roll = PL.dodgeT > 0 ? 1 - PL.dodgeT / .36 : 0;
  const spin = animAvatar(A, dt, { speed: sp, anim: PL.act ? PL.act.anim : null, t: PL.actT, airborne: !PL.onGround, roll, sheathed: A.sheathed });
  A.g.rotation.y = PL.yaw + spin;
  // trail
  if (PL.act) { const b = new THREE.Vector3(), t = new THREE.Vector3(); A.base.getWorldPosition(b); A.tip.getWorldPosition(t); trailPts.unshift([b, t]); if (trailPts.length > TRAIL_N) trailPts.pop(); }
  else if (trailPts.length) trailPts.pop();
  const col = new THREE.Color(PL.act && PL.act.skill ? PL.act.color : 0xcfe6ff).multiplyScalar(hdr && PL.act && PL.act.skill ? 2.4 : 1);
  for (let i = 0; i < TRAIL_N; i++) {
    const p = trailPts[Math.min(i, trailPts.length - 1)], f = trailPts.length ? Math.max(0, 1 - i / trailPts.length) : 0;
    for (let j = 0; j < 2; j++) { const v = p ? p[j] : PL.pos, o = (i * 2 + j) * 3; trailPos[o] = v.x; trailPos[o + 1] = v.y; trailPos[o + 2] = v.z; const ff = f * (j ? 1 : .3) * (PL.act && PL.act.skill ? 1 : .55); trailCol[o] = col.r * ff; trailCol[o + 1] = col.g * ff; trailCol[o + 2] = col.b * ff; }
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
}
function dodge() { if (PL.dead || uiOpen || PL.dodgeCd > 0 || (PL.act && PL.act.skill)) return; const d = inputDir() || new THREE.Vector3(-Math.sin(PL.yaw), 0, -Math.cos(PL.yaw)); PL.dodgeDir.copy(d).normalize(); PL.dodgeT = .36; PL.dodgeCd = .75; PL.invuln = .38; PL.act = null; PL.model.bladeMat.emissiveIntensity = 0; SFX.swing(); dustFx(PL.pos.x, PL.pos.y, PL.pos.z); }
function jump() { if (PL.dead || uiOpen) return; if (PL.onGround && !PL.act) { PL.vy = 10.5; PL.onGround = false; } }
function drinkPotion() {
  if (PL.dead || PL.potCd > 0) return; const mh = maxHp();
  if (S.hipotions > 0 && S.hp < mh * .4) { S.hipotions--; PL.potRate = mh * .75 / 2.5; PL.potT = 2.5; }
  else if (S.potions > 0) { S.potions--; PL.potRate = mh * .4 / 3; PL.potT = 3; }
  else { toast('You are out of potions. Buy more from Brenn in a city.', 'sys'); return; }
  PL.potCd = 5; ringFx(PL.pos, 0x62e08c, 2.5, .6); SFX.tone(660, .25, 'sine', .06, 1.5); updateHotbar();
}
function hurtPlayer(d, sx, sz) {
  if (PL.dead || PL.invuln > 0 || PL.inSafe) return;
  d = Math.max(1, Math.round(d * (60 / (60 + defPow())) * (.9 + Math.random() * .2))); S.hp -= d; PL.lastHurt = NOW; PL.lastCombat = NOW;
  popNum(PL.pos.x, PL.pos.y + 2.4, PL.pos.z, '-' + d, 'hurt'); SFX.hurt(); shake(.25);
  $('vignette').style.opacity = .9; setTimeout(() => { $('vignette').style.opacity = S.hp < maxHp() * .3 ? .45 : 0; }, 180);
  if (sx !== undefined) { const dx = PL.pos.x - sx, dz = PL.pos.z - sz, l = Math.hypot(dx, dz) || 1; PL.pos.x += dx / l * .6; PL.pos.z += dz / l * .6; }
  if (S.hp <= 0) { S.hp = 0; die(); }
}
function die() {
  PL.dead = true; PL.act = null; PL.target = null;
  shatter(PL.pos.clone(), [new THREE.Color(S.color).getHex(), 0x1d2230], 40, 1.1); SFX.shatter(); shake(.4);
  if (S.hardcore) {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    $('deathTitle').textContent = 'Game over';
    $('deathMsg').textContent = `${S.name} reached level ${S.lvl} and Floor ${S.maxFloor}. In Hardcore mode a fallen avatar does not return. The character has been deleted.`;
    $('respawnBtn').textContent = 'Create a new character';
    if (NET.room) NET.room.emit('announce', { m: `${S.name} has fallen on Floor ${F.n}. Hardcore run ended at level ${S.lvl}.` }).catch(() => {});
  } else {
    const lost = Math.round(S.xp * .15); S.xp -= lost;
    $('deathTitle').textContent = 'HP depleted';
    $('deathMsg').textContent = `Your avatar breaks apart into light. You lose ${fmt(lost)} XP toward the next level and wake in ${F.town.name}.`;
    $('respawnBtn').textContent = 'Return to town';
    writeSave();
  }
  setTimeout(() => { uiOpen = 'death'; $('death').hidden = false; exitLock(); }, 1100);
}
function respawn() {
  if (S.hardcore) { location.reload(); return; }
  $('death').hidden = true; uiOpen = null; PL.dead = false; S.hp = maxHp();
  if (inArena) exitArena(false);
  spawnAtTown(); PL.invuln = 3; PL.respawnT = NOW + 3; writeSave();
}
function spawnAtTown() { PL.pos.set(F.town.x, 0, F.town.z + 5); PL.yaw = Math.PI; camYaw = 0; PL.vy = 0; PL.target = null; }

/* ================= monsters ================= */
const BOSS_SCALE = { golem: 2.3, plant: 2.4, hornet: 2.6 };
function mobName(kind) { const d = MOBS[kind]; return F.theme.k === 'verdant' ? d.name : `${F.theme.prefix} ${d.noun}`; }
function createMob(kind, x, z, lvl, opt = {}) {
  const def = MOBS[kind], parts = def.build(F.theme.tint);
  if (opt.boss) adornBoss(kind, parts);
  const g = parts.g, sc = opt.boss ? (BOSS_SCALE[kind] || 2.7) : opt.elite ? 1.4 : 1;
  g.scale.setScalar(sc); parts.by = parts.body.position.y;
  if (opt.boss || opt.elite) {
    const aura = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: texRuneRing(), color: bright(opt.boss ? 0xff4020 : 0xffd040, 2), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    aura.rotation.x = -Math.PI / 2; aura.position.y = .06; g.add(aura); parts.aura = aura;
  }
  const cur = new THREE.Mesh(Go(.18), new THREE.MeshBasicMaterial({ color: bright(opt.boss ? 0xff3a1a : opt.elite ? 0xffc83a : 0xff6a5a, 1.8) }));
  cur.position.y = parts.h + .55; cur.scale.set(.9 / sc, 1.5 / sc, .9 / sc); if (opt.boss) cur.scale.multiplyScalar(2); g.add(cur);
  const mh = Math.round((30 + lvl * 22) * def.hpm * (opt.elite ? 3.2 : 1)), at = (5 + lvl * 3.1) * def.atkm * (opt.elite ? 1.35 : 1);
  const name = opt.boss ? F.bossName : opt.elite ? `${ELITE_PREFIX[(Math.random() * ELITE_PREFIX.length) | 0]} ${MOBS[kind].noun}` : mobName(kind);
  const m = { kind, def, parts, g, cur, x, z, y: 0, hx: x, hz: z, yaw: Math.random() * TAU, lvl, maxHp: mh, hp: mh, atk: at, state: 'idle', st: 0, wanderT: 0, tx: x, tz: z, atkCd: 0, windT: .6, flash: 0, dead: false, dying: 0, respawn: 0, r: parts.r * sc, h: parts.h * sc, boss: !!opt.boss, elite: !!opt.elite, name, walk: Math.random() * 10, seed: Math.random() * 10, lift: 0, mats: collectMats(g), fl: false, sc };
  g.position.set(x, groundAt(x, z), z);
  return m;
}
function spawnField() {
  const rng = mulberry(F.seed * 7 + 3), mobs = F.theme.mobs;
  const spot = () => {
    let x = 0, z = 0;
    for (let t = 0; t < 40; t++) {
      const a = rng() * TAU, rr = Math.sqrt(rng()) * (R - 18); x = Math.cos(a) * rr; z = Math.sin(a) * rr;
      if (safeAt(x, z, 14) || Math.hypot(x - F.tower.x, z - F.tower.z) < F.tower.r + 16 || Math.hypot(x - F.lake.x, z - F.lake.z) < F.lake.r || Math.hypot(x - F.town.x, z - F.town.z) < F.town.r + 16) continue;
      break;
    }
    return [x, z];
  };
  for (let i = 0; i < 56; i++) {
    const [x, z] = spot(), elite = i < 4, kind = mobs[(rng() * mobs.length) | 0];
    const prog = clamp((F.town.z - z) / (F.town.z - F.tower.z), 0, 1);
    const lvl = (F.n - 1) * 3 + 1 + Math.round(prog * 3) + (rng() < .2 ? 1 : 0) + (elite ? 2 : 0);
    const m = createMob(kind, x, z, lvl, { elite }); world.add(m.g); monsters.push(m);
  }
}
function setFlash(m, v, red) { for (const mt of m.mats) { if (v > 0) { mt.emissive.setHex(red ? 0xff2010 : 0xffffff); mt.emissiveIntensity = v * (red ? .9 : 1.2); } else { mt.emissive.copy(mt.userData.e0); mt.emissiveIntensity = mt.userData.ei0; } } m.fl = v > 0; }
function hitMonster(m, dmg, crit, color, mine) {
  if (m.dead || m.dying) return;
  m.hp -= dmg; m.flash = 1;
  popNum(m.x, m.y + m.h + .4, m.z, crit ? dmg + '!' : String(dmg), mine ? (crit ? 'crit' : '') : 'ally');
  sparkFx(new THREE.Vector3(m.x, m.y + Math.min(m.h * .45, 2.4), m.z), color);
  if (m.state === 'idle' || m.state === 'return') { m.state = 'chase'; }
  if (!m.boss && mine) { const dx = m.x - PL.pos.x, dz = m.z - PL.pos.z, l = Math.hypot(dx, dz) || 1; m.x += dx / l * .5; m.z += dz / l * .5; }
  if (m.boss && mine) netBoss(dmg);
  if (m.hp <= 0) { m.hp = 0; m.dying = m.boss ? .7 : .16; m.killer = mine; dropTele(m); if (m.boss) { shake(.5); hitStop = .25; } }
}
function finishKill(m) {
  const mine = m.killer;
  m.dead = true; m.dying = 0; m.g.visible = false; setFlash(m, 0);
  shatter(new THREE.Vector3(m.x, m.y + (m.boss ? 1 : .3), m.z), m.def.c, m.boss ? 100 : m.elite ? 50 : 30, m.boss ? 3 : m.elite ? 1.5 : 1); SFX.shatter();
  if (PL.target === m) PL.target = null;
  if (m.boss) { onBossDefeated(mine); return; }
  m.respawn = NOW + (m.elite ? 90 : 25);
  const def = m.def, xp = Math.round((10 + m.lvl * 7) * (m.elite ? 4 : 1)), col = Math.round((4 + m.lvl * 3 + ((Math.random() * m.lvl * 2) | 0)) * (m.elite ? 4 : 1));
  S.kills++; S.col += col;
  let loot = `+${xp} XP · +${col} Col`;
  const matN = m.elite ? 3 : Math.random() < .55 ? 1 : 0;
  if (matN) { S.mats[def.mat] = (S.mats[def.mat] || 0) + matN; loot += ` · ${def.mat}${matN > 1 ? ' ×' + matN : ''}`; questEvent('mat', def.mat, matN); }
  if (Math.random() < (m.elite ? .35 : .03)) { const it = Math.random() < .5 ? rollWeapon(false) : rollArmor(false); if (it.def != null) S.armors.push(it); else S.weapons.push(it); loot += ` · ${it.n}`; toast(`Rare drop: ${it.n} (${it.def != null ? 'DEF ' + it.def : 'ATK ' + it.atk}). Equip it from the menu.`, 'loot'); }
  if (Math.random() < (m.elite ? .6 : .08)) { S.potions++; loot += ' · Healing Potion'; }
  popNum(m.x, m.y + m.h + 1, m.z, `+${xp} XP`, 'xp'); toast(`${m.name} defeated. ${loot}`, 'loot'); SFX.coin();
  gainXp(xp); questEvent('kill', m);
  if (NET.room && mode === 'play') NET.room.emit('xp', { f: F.n, x: Math.round(m.x), z: Math.round(m.z), xp }).catch(() => {});
}
function rollWeapon(isBoss) {
  const tier = WEAPONS.filter(w => w.fl <= Math.max(1, F.n)).pop(); const adj = ['Keen', 'Tempered', 'Runed', 'Gleaming', 'Vicious', 'Balanced'], nouns = ['Longsword', 'Saber', 'Blade', 'Edge', 'Brand'];
  if (isBoss) return { n: `${F.bossName.split(',')[0].split(' ')[0]}'s ${['Fang', 'Edge', 'Brand', 'Oath', 'Crown'][F.n % 5]}`, atk: Math.round(tier.atk * 1.35 + F.n * 3), plus: 0, unique: true };
  return { n: `${adj[(Math.random() * adj.length) | 0]} ${nouns[(Math.random() * nouns.length) | 0]}`, atk: Math.round(tier.atk * 1.12 + Math.random() * 3), plus: 0 };
}
function rollArmor(isBoss) {
  const tier = ARMORS.filter(a => a.fl <= Math.max(1, F.n)).pop();
  if (isBoss) return { n: `${F.bossName.split(',')[0].split(' ')[0]}'s Mantle`, def: Math.round(tier.def * 1.35 + F.n * 2), t: Math.min(5, tier.t + 1), plus: 0, unique: true };
  return { n: ['Warded', 'Sturdy', 'Lined', 'Reinforced'][(Math.random() * 4) | 0] + ' ' + ['Longcoat', 'Battlecoat', 'Mantle'][(Math.random() * 3) | 0], def: Math.round(tier.def * 1.12 + Math.random() * 2), t: tier.t, plus: 0 };
}
function gainXp(x, quiet) {
  S.xp += x; let up = false;
  while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; S.pts += 3; up = true; const nu = SKILLS.find(s => s.lvl === S.lvl); if (nu) toast(`New sword skill: ${nu.name} [${nu.key}]`, 'sys'); }
  if (up) { S.hp = maxHp(); SFX.level(); pillarFx(PL.pos, 0xffd870); ringFx(PL.pos, 0xffd870, 6, .8); banner(`Level ${S.lvl}`, 'Stat points available · open the menu with M', 2200); updateHotbar(); }
  if (!quiet) writeSave();
}
function updateMob(m, dt) {
  if (m.dead) { if (NOW > m.respawn) { m.dead = false; m.hp = m.maxHp; m.x = m.hx; m.z = m.hz; m.state = 'idle'; m.g.visible = true; } return; }
  if (m.dying) { m.dying -= dt; setFlash(m, 1.6, false); m.g.position.y = m.y + (.16 - m.dying) * .5; if (m.dying <= 0) finishKill(m); return; }
  const P2 = m.parts; m.atkCd -= dt;
  const dx = PL.pos.x - m.x, dz = PL.pos.z - m.z, d = Math.hypot(dx, dz);
  if (d > 110 && m.state === 'idle') { m.g.visible = false; return; }
  m.g.visible = true;
  const homeD = Math.hypot(m.x - m.hx, m.z - m.hz), canAggro = !PL.dead && !PL.inSafe;
  let mv = 0, tx = m.x, tz = m.z; const spd = m.def.speed * (m.elite ? 1.1 : 1);
  switch (m.state) {
    case 'idle':
      if (NOW > m.wanderT) { const a = Math.random() * TAU, r = Math.random() * 10; m.tx = m.hx + Math.cos(a) * r; m.tz = m.hz + Math.sin(a) * r; m.wanderT = NOW + 3 + Math.random() * 5; }
      tx = m.tx; tz = m.tz; if (Math.hypot(tx - m.x, tz - m.z) > 1) mv = spd * .3;
      if (canAggro && d < m.def.aggro * (m.elite ? 1.3 : 1)) { m.state = 'chase'; popNum(m.x, m.y + m.h + .9, m.z, '!', 'aggro'); if (d < 25) SFX.aggro(); }
      break;
    case 'chase':
      if (homeD > 50 || !canAggro) { m.state = 'return'; break; }
      PL.lastCombat = Math.max(PL.lastCombat, NOW - 8);
      tx = PL.pos.x; tz = PL.pos.z; if (d > m.def.range * .85 * (m.elite ? 1.3 : 1)) mv = spd;
      if (d < m.def.range * (m.elite ? 1.3 : 1) + .3 && m.atkCd <= 0) { m.state = 'wind'; m.st = 0; m.windT = m.elite ? .7 : .6; m.yaw = Math.atan2(dx, dz); m.tele = makeTele('cleave', m.x, m.z, m.yaw, (m.def.range + .9) * (m.elite ? 1.3 : 1)); }
      break;
    case 'wind':
      m.st += dt; m.yaw = angLerp(m.yaw, Math.atan2(dx, dz), Math.min(1, dt * 3));
      if (m.tele) { m.tele.inner.scale.setScalar(Math.max(.01, m.st / m.windT)); m.tele.g.position.set(m.x, m.y + .08, m.z); m.tele.g.rotation.y = m.yaw + Math.PI; }
      if (m.st >= m.windT) {
        const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw), ang = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
        if (d < (m.def.range + .9) * (m.elite ? 1.3 : 1) && ang < Math.PI / 3 + .15) hurtPlayer(m.atk, m.x, m.z);
        dropTele(m); m.state = 'recover'; m.st = 0; m.atkCd = 1.4 + Math.random() * .6;
      }
      break;
    case 'recover': m.st += dt; if (m.st > .35) m.state = 'chase'; break;
    case 'return': tx = m.hx; tz = m.hz; mv = spd * 1.3; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * .3 * dt); if (homeD < 2) { m.state = 'idle'; m.hp = m.maxHp; } break;
  }
  if (m.state !== 'wind') dropTele(m);
  if (mv > 0) { const vx = tx - m.x, vz = tz - m.z, l = Math.hypot(vx, vz); if (l > .05) { const nx = m.x + vx / l * mv * dt, nz = m.z + vz / l * mv * dt; if (!safeAt(nx, nz, 2) || m.state === 'return') { m.x = nx; m.z = nz; } m.yaw = angLerp(m.yaw, Math.atan2(vx, vz), Math.min(1, dt * 7)); } }
  if (d < m.r + .5 && d > .01) { m.x -= dx / d * (m.r + .5 - d); m.z -= dz / d * (m.r + .5 - d); }
  m.y = groundAt(m.x, m.z); if (m.lift > 0) { m.lift -= dt; m.y += Math.sin((.6 - m.lift) / .6 * Math.PI) * 1.6; }
  m.g.position.set(m.x, m.y, m.z); m.g.rotation.y = m.yaw;
  animMob(m, dt, mv / spd);
}
function animMob(m, dt, sn) {
  const P2 = m.parts; m.walk += dt * Math.max(sn, 0) * (P2.gait === 'quad' ? 10 : 7);
  const w = Math.sin(m.walk), amp = Math.min(1, sn) * .6, breathe = 1 + Math.sin(NOW * 2.2 + m.seed) * .025;
  P2.body.scale.set(1, breathe, 1);
  if (P2.gait === 'quad') { P2.legs[0].rotation.x = w * amp; P2.legs[3].rotation.x = w * amp; P2.legs[1].rotation.x = -w * amp; P2.legs[2].rotation.x = -w * amp; P2.body.position.y = P2.by + Math.abs(Math.cos(m.walk)) * .06 * amp; if (P2.tail) P2.tail.rotation.y = Math.sin(NOW * 6 + m.seed) * .3; }
  else if (P2.gait === 'biped') { P2.legs[0].rotation.x = w * amp; P2.legs[1].rotation.x = -w * amp; P2.armL.pitch.rotation.x = -w * amp * .6 - .2; P2.body.position.y = P2.by + Math.abs(Math.cos(m.walk)) * .05 * amp; if (P2.tail) P2.tail.rotation.y = Math.sin(NOW * 2 + m.seed) * .25; }
  else if (P2.gait === 'hover') { P2.wings.forEach((wg, i) => { wg.rotation.z = (.25 + Math.sin(NOW * 48 + i) * .55) * (i < 2 ? 1 : -1); }); P2.body.position.y = P2.by + Math.sin(NOW * 3 + m.seed) * .18; P2.legs.forEach((l, i) => { l.rotation.x = Math.sin(NOW * 4 + i) * .15; }); }
  else if (P2.gait === 'plant') { P2.body.rotation.z = Math.sin(NOW * 1.3 + m.seed) * .06; P2.legs.forEach((l, i) => { l.rotation.x = Math.sin(NOW * 2 + i) * .12; }); P2.vines.forEach((v, i) => { v.rotation.x = Math.sin(NOW * 1.7 + i * 2) * .4; }); P2.lid.rotation.x = -.5 + Math.sin(NOW * 1.1 + m.seed) * .12; }
  if (P2.orbit) P2.orbit.rotation.y += dt * 1.2;
  if (P2.extra) P2.extra.forEach((h, i) => { h.rotation.x = Math.sin(NOW * 2 + i * 2) * .25; h.position.y = .2 + Math.sin(NOW * 1.6 + i) * .15; });
  const rest = -(P2.rest || 0);
  if (m.state === 'wind' || m.state === 'swind') {
    const k = clamp(m.st / m.windT, 0, 1);
    if (P2.gait === 'quad') { P2.body.position.z = -k * .35; P2.head.rotation.x = k * .35; }
    else if (P2.gait === 'biped') { P2.armR.pitch.rotation.x = lerp(rest, -2.7, k); P2.body.rotation.y = -k * .3; }
    else if (P2.gait === 'hover') { P2.body.rotation.x = k * .7; }
    else { P2.head.rotation.x = -k * .5; P2.lid.rotation.x = -.5 - k * .8; }
    if (!m.boss) setFlash(m, .3 + .3 * Math.sin(NOW * 30), true);
  } else if (m.state === 'recover' || m.state === 'dash') {
    const k = m.state === 'dash' ? 1 : 1 - clamp(m.st / .35, 0, 1);
    if (P2.gait === 'quad') { P2.body.position.z = k * .6; P2.head.rotation.x = -k * .3; }
    else if (P2.gait === 'biped') { P2.armR.pitch.rotation.x = lerp(rest, 1.1, k); P2.body.rotation.y = k * .35; }
    else if (P2.gait === 'hover') { P2.body.rotation.x = -k * .4; P2.body.position.z = k * .9; }
    else { P2.head.rotation.x = k * .9; }
    if (m.fl && m.flash <= 0) setFlash(m, 0);
  } else {
    P2.body.position.z *= .85; P2.head.rotation.x *= .85; P2.body.rotation.y *= .85; if (P2.gait === 'hover') P2.body.rotation.x *= .85;
    if (P2.gait === 'biped') P2.armR.pitch.rotation.x = lerp(P2.armR.pitch.rotation.x, rest + w * amp * .5, Math.min(1, dt * 8));
    if (m.flash > 0) { m.flash = Math.max(0, m.flash - dt * 5); setFlash(m, m.flash, false); } else if (m.fl) setFlash(m, 0);
  }
  m.cur.rotation.y += dt * 2;
  if (P2.aura) { P2.aura.rotation.z += dt * .6; P2.aura.material.opacity = .4 + Math.sin(NOW * 3) * .15; }
}

/* ================= floor boss ================= */
function spawnBoss() {
  const kind = F.theme.boss, lvl = F.n * 3 + 3;
  const b = createMob(kind, 0, -14, lvl, { boss: true });
  b.bars = 3 + Math.floor(F.n / 4); b.maxHp = Math.round((500 + F.n * 750) * (1 + (b.bars - 3) * .2)); b.hp = b.maxHp; b.atk = 14 + F.n * 7.5;
  b.yaw = 0; b.state = 'chase'; b.cd = 2; b.engaged = false; b.speed = MOBS[kind].speed > 5 ? 5.5 : 4.2; b.canCharge = (kind === 'boar' || kind === 'wolf' || kind === 'lizard');
  arena.g.add(b.g); boss = b;
}
function updateBoss(dt) {
  const b = boss; if (!b || b.dead) return;
  if (b.dying) { b.dying -= dt; setFlash(b, 1.4 + Math.sin(NOW * 40) * .5, false); b.g.rotation.z = Math.sin(NOW * 50) * .03; if (b.dying <= 0) finishKill(b); return; }
  for (const p of netPeersHere()) if (typeof p.presence.bh === 'number' && p.presence.bh >= 0) b.hp = Math.min(b.hp, p.presence.bh * b.maxHp);
  if (b.hp <= 0) { b.dying = .7; b.killer = false; dropTele(b); return; }
  let tx = PL.pos.x, tz = PL.pos.z, td = PL.dead ? 1e9 : Math.hypot(tx - b.x, tz - b.z);
  for (const r of NET.remotes.values()) { if (!r.vis || r.s.dead) continue; const d = Math.hypot(r.x - b.x, r.z - b.z); if (d < td) { td = d; tx = r.x; tz = r.z; } }
  if (!b.engaged) { if (td < 32) { b.engaged = true; $('bossbar').hidden = false; SFX.boom(); shake(.35); banner(b.name, `Floor ${F.n} Boss`, 2400); } animMob(b, dt, 0); b.g.position.set(b.x, 0, b.z); return; }
  const barHp = b.maxHp / b.bars, enr = b.hp <= barHp; b.flash = Math.max(0, b.flash - dt * 5);
  if (enr && !b.enr) { b.enr = true; toast(`${b.name} is enraged!`, 'sys'); SFX.boom(); shake(.4); if (b.parts.aura) b.parts.aura.material.color.copy(bright(0xff2a00, 3)); }
  let mv = 0; const dx = tx - b.x, dz = tz - b.z;
  switch (b.state) {
    case 'chase':
      b.yaw = angLerp(b.yaw, Math.atan2(dx, dz), Math.min(1, dt * 4)); if (td > 6.5) mv = b.speed * (enr ? 1.3 : 1);
      b.cd -= dt;
      if (b.cd <= 0 && td < 30) {
        let pat = Math.random() < .65 ? 'cleave' : 'slam';
        if (td > 10 && b.canCharge) pat = 'charge'; else if (td > 9) pat = b.canCharge && Math.random() < .5 ? 'charge' : 'slam';
        if (td > 10.5 && !b.canCharge) { pat = null; b.cd = .3; }
        if (pat) { b.pat = pat; b.state = 'swind'; b.st = 0; b.windT = ({ cleave: 1.0, slam: 1.35, charge: .95 })[pat] * (enr ? .72 : 1); b.tele = makeTele(pat, b.x, b.z, b.yaw, pat === 'cleave' ? 10 * (b.sc / 2.7) : pat === 'slam' ? 10.5 : 24); }
      }
      break;
    case 'swind': {
      b.st += dt; const k = clamp(b.st / b.windT, 0, 1); b.tele.inner.scale.setScalar(Math.max(.01, k)); TELE.opacity = .25 + Math.sin(NOW * 20) * .1;
      if (b.st >= b.windT) {
        dropTele(b); const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), pdx = PL.pos.x - b.x, pdz = PL.pos.z - b.z, pd = Math.hypot(pdx, pdz), mul = enr ? 1.25 : 1;
        if (b.pat === 'cleave') { const ang = Math.acos(clamp((pdx * fx + pdz * fz) / (pd || 1), -1, 1)); if (pd < 10 * (b.sc / 2.7) && ang < Math.PI / 3) hurtPlayer(b.atk * 1.2 * mul, b.x, b.z); SFX.boom(); shake(.3); ringFx(new THREE.Vector3(b.x + fx * 5, 0, b.z + fz * 5), 0xff8040, 5, .4); }
        else if (b.pat === 'slam') { if (pd < 10.5) hurtPlayer(b.atk * 1.5 * mul, b.x, b.z); SFX.boom(); shake(.6); ringFx(new THREE.Vector3(b.x, 0, b.z), 0xff6a3a, 11, .5); ringFx(new THREE.Vector3(b.x, 0, b.z), 0xffc070, 7, .35); for (let i = 0; i < 6; i++) dustFx(b.x + Math.cos(i) * 4, 0, b.z + Math.sin(i) * 4); }
        else { b.state = 'dash'; b.st = 0; b.dashHit = false; b.ddx = fx; b.ddz = fz; break; }
        b.state = 'recover'; b.st = 0;
      }
      break;
    }
    case 'dash': {
      b.st += dt; b.x += b.ddx * 30 * dt; b.z += b.ddz * 30 * dt; const dd = Math.hypot(b.x, b.z); if (dd > 38) { b.x *= 38 / dd; b.z *= 38 / dd; b.st = 1; shake(.3); }
      if (Math.random() < .5) dustFx(b.x, 0, b.z);
      if (!b.dashHit && Math.hypot(PL.pos.x - b.x, PL.pos.z - b.z) < 3.6) { b.dashHit = true; hurtPlayer(b.atk * 1.4 * (enr ? 1.25 : 1), b.x, b.z); }
      if (b.st >= .8) { b.state = 'recover'; b.st = 0; }
      break;
    }
    case 'recover': b.st += dt; if (b.st > (enr ? .5 : .9)) { b.state = 'chase'; b.cd = enr ? .5 : 1.1; } break;
  }
  if (mv > 0) { b.x += Math.sin(b.yaw) * mv * dt; b.z += Math.cos(b.yaw) * mv * dt; }
  for (const c of arena.colliders) { const ex = b.x - c.x, ez = b.z - c.z, e = Math.hypot(ex, ez), rr = c.r + b.r * .6; if (e < rr && e > .01) { b.x += ex / e * (rr - e); b.z += ez / e * (rr - e); } }
  const pd = Math.hypot(PL.pos.x - b.x, PL.pos.z - b.z), rr = b.r * .8 + .5; if (pd < rr && pd > .01) { PL.pos.x += (PL.pos.x - b.x) / pd * (rr - pd); PL.pos.z += (PL.pos.z - b.z) / pd * (rr - pd); }
  b.g.position.set(b.x, 0, b.z); b.g.rotation.y = b.yaw;
  animMob(b, dt, b.state === 'dash' ? 2 : mv / b.speed);
  if (b.state === 'swind') setFlash(b, .25 + .25 * Math.sin(NOW * 24), true); else if (b.flash > 0) setFlash(b, b.flash, false); else if (b.fl) setFlash(b, 0);
  const bars = Math.ceil(b.hp / barHp), frac = (b.hp - (bars - 1) * barHp) / barHp;
  $('bbFill').style.width = (clamp(frac, 0, 1) * 100) + '%';
  const pips = $('bbPips'); if (pips.childElementCount !== b.bars) { pips.innerHTML = ''; for (let i = 0; i < b.bars; i++) pips.appendChild(document.createElement('i')); }
  [...pips.children].forEach((e, i) => e.classList.toggle('on', i < bars));
  setText('bbName', `${b.name} · Lv ${b.lvl}`);
}
function onBossDefeated(mine) {
  const b = boss; $('bossbar').hidden = true; dropTele(b);
  const first = !S.cleared[F.n]; S.cleared[F.n] = true; S.maxFloor = Math.max(S.maxFloor, Math.min(100, F.n + 1));
  const xp = 300 * F.n, col = 500 * F.n; S.col += col; S.potions += 2;
  const w = rollWeapon(true); S.weapons.push(w); let extra = '';
  if (Math.random() < .5) { const a = rollArmor(true); S.armors.push(a); extra = ` · ${a.n} (DEF ${a.def})`; }
  toast(`Boss defeated! +${fmt(xp)} XP · +${fmt(col)} Col · ${w.n} (ATK ${w.atk})${extra}`, 'loot');
  banner('Congratulations', first ? `Floor ${F.n} cleared · the stairway to Floor ${F.n + 1} is open` : `Floor ${F.n} guardian defeated again`, 4200);
  gainXp(xp); questEvent('boss'); arena.stairs.visible = true; SFX.level(); shake(.6);
  if (first && NET.room) NET.room.emit('announce', { m: `${S.name} cleared Floor ${F.n}! The stairway to Floor ${F.n + 1} is open.` }).catch(() => {});
  setTimeout(() => { if (boss === b) { arena.g.remove(b.g); boss = null; } }, 1500); writeSave();
}

/* ================= floors & labyrinth ================= */
function loadFloor(n) {
  if (world) { scene.remove(world); disposeGroup(world); }
  for (const m of monsters) dropTele(m);
  monsters = []; INTER.length = 0; if (boss && boss.g.parent) boss.g.parent.remove(boss.g); boss = null;
  F = makeFloor(n); world = buildWorld(); scene.add(world); clearNums();
  colliders = F.colliders; zones = F.zones; inArena = false; arena.g.visible = false; world.visible = true;
  spawnField(); applyAtmos(); renderStaticMap(); buildAmbient();
  S.floor = n; PL.target = null;
}
function fadeOut(cb) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 120); }, 320); }
function enterArena() {
  fadeOut(() => {
    inArena = true; world.visible = false; arena.g.visible = true; colliders = arena.colliders; clearNums();
    PL.pos.set(0, 0, 36); PL.yaw = Math.PI; camYaw = 0; PL.target = null; applyAtmos();
    arena.lines.emissive.setHex(F.theme.k === 'ember' ? 0xff6a3a : 0x5fa0ff); arena.sigil.material.color.copy(bright(F.theme.k === 'ember' ? 0xff6a3a : 0x5fa0ff, 2));
    arena.stairs.visible = !!S.cleared[F.n];
    if (!S.cleared[F.n]) spawnBoss();
    SFX.gate(); banner(`Labyrinth · Floor ${F.n}`, S.cleared[F.n] ? 'The guardian has fallen. Climb the stairs to continue.' : 'The guardian awaits in the hall ahead', 2600);
  });
}
function exitArena(viaStairs, instant) {
  const go = () => {
    if (boss) { dropTele(boss); arena.g.remove(boss.g); boss = null; }
    $('bossbar').hidden = true; inArena = false; arena.g.visible = false; PL.target = null;
    if (viaStairs) { const nf = F.n + 1; loadFloor(nf); spawnAtTown(); banner(`Floor ${nf}`, `${F.theme.name} · ${F.town.name}`, 3200); toast(`You reached Floor ${nf}. Its teleport gate is now active.`, 'sys'); writeSave(); return; }
    world.visible = true; colliders = F.colliders; zones = F.zones; applyAtmos(); PL.pos.set(F.tower.x, 0, F.tower.z + F.tower.r + 9); PL.yaw = 0; camYaw = Math.PI;
  };
  if (instant) go(); else fadeOut(go);
}
function travel(n) { closeWin(); fadeOut(() => { if (inArena) exitArena(false, true); loadFloor(n); spawnAtTown(); SFX.gate(); pillarFx(PL.pos, 0x7fd8ff); banner(`Floor ${n}`, `${F.theme.name} · ${F.town.name}`, 3000); writeSave(); }); }

/* ================= quests ================= */
function questOffers() {
  const n = F.n, gen = S.qgen[n] || 0, r = mulberry(n * 1000 + gen * 7 + 3), mobs = F.theme.mobs, out = [];
  for (let i = 0; i < 4; i++) {
    const t = (i === 3 && !S.cleared[n]) ? 'boss' : ['hunt', 'hunt', 'gather', 'elite'][(r() * 4) | 0];
    let q;
    if (t === 'hunt') { const k = mobs[(r() * mobs.length) | 0], need = 6 + ((r() * 7) | 0); q = { type: t, kind: k, need, title: `Cull the ${mobName(k)} pack`, desc: `Defeat ${need} ${mobName(k)} on Floor ${n}.` }; }
    else if (t === 'gather') { const k = mobs[(r() * mobs.length) | 0], mat = MOBS[k].mat, need = 4 + ((r() * 5) | 0); q = { type: t, mat, need, title: `Gather ${mat}`, desc: `Collect ${need} ${mat} from ${mobName(k)}.` }; }
    else if (t === 'elite') q = { type: t, need: 1, title: 'Hunt a named beast', desc: `Defeat an elite monster (gold name and aura) on Floor ${n}.` };
    else q = { type: t, need: 1, title: `Fell ${F.bossName.split(',')[0]}`, desc: `Defeat the guardian of Floor ${n} in the Labyrinth.` };
    q.id = `${n}-${gen}-${i}`; q.floor = n; q.have = 0;
    const mult = q.type === 'boss' ? 4 : q.type === 'elite' ? 2.2 : q.need / 6;
    q.xp = Math.round((70 + n * 60) * mult); q.col = Math.round(q.xp * .9); q.pot = q.type === 'boss' || q.type === 'elite' ? 2 : 1;
    out.push(q);
  }
  return out;
}
function acceptQuest(q) {
  if (S.quests.length >= 4) { toast('You can track up to 4 quests at once.', 'sys'); return; }
  if (S.quests.some(x => x.id === q.id)) return;
  S.quests.push(Object.assign({}, q)); SFX.ui(); toast(`Quest accepted: ${q.title}`, 'sys'); writeSave();
}
function questEvent(type, a, n) {
  let changed = false;
  for (const q of S.quests) {
    if (q.floor !== F.n || q.have >= q.need) continue;
    if (type === 'kill' && ((q.type === 'hunt' && a.kind === q.kind && !a.elite) || (q.type === 'elite' && a.elite))) { q.have++; changed = true; }
    else if (type === 'mat' && q.type === 'gather' && a === q.mat) { q.have = Math.min(q.need, q.have + n); changed = true; }
    else if (type === 'boss' && q.type === 'boss') { q.have = 1; changed = true; }
  }
  if (!changed) return;
  for (const q of S.quests.slice()) if (q.have >= q.need) completeQuest(q);
  writeSave();
}
function completeQuest(q) {
  S.quests = S.quests.filter(x => x !== q); S.qdone = (S.qdone || 0) + 1; S.col += q.col; S.potions += q.pot;
  S.qhist = (S.qhist || []).concat(q.id).slice(-60);
  const offers = questOffers(); if (offers.every(o => S.qhist.includes(o.id))) S.qgen[F.n] = (S.qgen[F.n] || 0) + 1;
  SFX.quest(); banner('Quest complete', q.title, 2200); toast(`Quest complete: ${q.title}. +${fmt(q.xp)} XP · +${fmt(q.col)} Col · ${q.pot} potion${q.pot > 1 ? 's' : ''}`, 'loot');
  gainXp(q.xp, true); updateHotbar();
}

/* ================= blacksmith ================= */
const enhanceCost = (it, armor) => { const lv = it.plus || 0, base = armor ? it.def * 14 : it.atk * 12; return { col: Math.round(base * (lv + 1) * (lv + 1) * .6 + 60), mats: 2 + lv * 2 }; };
const totalMats = () => Object.values(S.mats).reduce((a, b) => a + b, 0);
function spendMats(n) { const e = Object.entries(S.mats).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]); for (const [k, v] of e) { const t = Math.min(v, n); S.mats[k] -= t; n -= t; if (!n) break; } }
function enhance(armor, i) {
  const list = armor ? S.armors : S.weapons, it = list[i]; if (!it || (it.plus || 0) >= 10) return;
  const c = enhanceCost(it, armor); if (S.col < c.col || totalMats() < c.mats) return;
  S.col -= c.col; spendMats(c.mats); it.plus = (it.plus || 0) + 1; SFX.anvil(); shake(.08);
  toast(`${it.n} is now +${it.plus} (${armor ? 'DEF ' + aDef(it) : 'ATK ' + wAtk(it)}).`, 'loot'); writeSave(); renderSmith();
}

/* ================= camera ================= */
function updateCamera(dt) {
  if (PL.target && !PL.dead) { const dx = PL.target.x - PL.pos.x, dz = PL.target.z - PL.pos.z; if (Math.hypot(dx, dz) > 1.5) camYaw = angLerp(camYaw, Math.atan2(-dx, -dz), Math.min(1, dt * 4)); }
  const tx = PL.pos.x, ty = PL.pos.y + 1.75, tz = PL.pos.z;
  let cx = tx + Math.sin(camYaw) * Math.cos(camPitch) * camDist, cz = tz + Math.cos(camYaw) * Math.cos(camPitch) * camDist, cy = ty + Math.sin(camPitch) * camDist;
  if (inArena) { const d = Math.hypot(cx, cz); if (d > 43) { cx *= 43 / d; cz *= 43 / d; } cy = Math.min(cy, 33); }
  cy = Math.max(cy, groundAt(cx, cz) + .6);
  shakeAmt = Math.max(0, shakeAmt - dt * 1.6); const s = shakeAmt * shakeAmt;
  camera.position.set(cx + (Math.random() - .5) * s, cy + (Math.random() - .5) * s, cz + (Math.random() - .5) * s);
  camera.lookAt(tx, ty, tz);
  sun.position.set(tx + sunOffset.x, ty + sunOffset.y, tz + sunOffset.z); sun.target.position.set(tx, ty, tz);
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  if (PL.target) { lockRing.visible = true; lockRing.position.set(PL.target.x, PL.target.y + .1, PL.target.z); lockRing.scale.setScalar(PL.target.r * 1.25 + .5); lockRing.rotation.z += dt * 1.5; } else lockRing.visible = false;
}

/* ================= HUD ================= */
const hudCache = {};
function setText(id, t) { if (hudCache[id] !== t) { hudCache[id] = t; $(id).textContent = t; } }
function setHTML(id, h) { if (hudCache['h' + id] !== h) { hudCache['h' + id] = h; $(id).innerHTML = h; } }
let curInteract = null;
const hotEls = [];
function updateHUD() {
  const mh = maxHp(), f = clamp(S.hp / mh, 0, 1);
  $('hpFill').style.width = (f * 100) + '%'; $('hpLag').style.width = (f * 100) + '%';
  $('hpFill').style.backgroundColor = f > .5 ? 'var(--hp)' : f > .25 ? 'var(--hp-mid)' : 'var(--hp-low)';
  setText('hpText', `${Math.ceil(S.hp)} / ${mh}`); setText('pfName', S.name); setText('pfLv', `LV ${S.lvl}`); setText('pfCol', `${fmt(S.col)} COL`);
  $('xpFill').style.width = (S.xp / xpNeed(S.lvl) * 100) + '%';
  const area = inArena ? `Labyrinth · Floor ${F.n}` : PL.inSafe ? PL.inSafe.name : (Math.hypot(PL.pos.x - F.tower.x, PL.pos.z - F.tower.z) < 55 ? 'Labyrinth Approach' : F.theme.name);
  setText('area', area); setText('floorLbl', `Floor ${F.n} of 100`);
  const hr = Math.floor(DAYPHASE * 24), mn = Math.floor((DAYPHASE * 24 - hr) * 60);
  setText('clock', inArena ? 'Inside the Labyrinth' : `${DAYK > .5 ? 'Day' : 'Night'} · ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`);
  setHTML('tags', (S.hardcore ? '<span class="tag danger">Hardcore</span>' : '') + (PL.inSafe ? '<span class="tag safe">Safe zone</span>' : '') + (inArena && boss && !boss.dead ? '<span class="tag danger">Boss room</span>' : '') + (S.pts > 0 ? `<span class="tag pts">${S.pts} stat pts</span>` : '') + (PL.potT > 0 ? '<span class="tag safe">Regen</span>' : ''));
  setHTML('net', NET.room ? `<b>●</b> ${NET.status} · ${NET.count} in world` : NET.status);
  SKILLS.forEach((s, i) => { const el = hotEls[i]; if (el) { const cd = PL.cds[s.id] || 0; el.style.setProperty('--p', cd > 0 ? cd / (s.cd * cdMul()) : 0); } });
  if (hotEls[5]) hotEls[5].style.setProperty('--p', PL.potCd > 0 ? PL.potCd / 5 : 0);
  // quest tracker
  setHTML('qtrack', S.quests.length ? '<div class="qt-h">Quests · L</div>' + S.quests.map(q => `<div class="qt ${q.floor !== F.n ? 'dim' : ''}"><span>${esc(q.title)}</span><b>${q.have}/${q.need}</b></div>`).join('') : '');
  // target frame
  const t = PL.target && !PL.target.boss ? PL.target : null; $('target').hidden = !t;
  if (t) { setText('tgName', `${t.name} · Lv ${t.lvl}`); $('tgFill').style.width = (t.hp / t.maxHp * 100) + '%'; $('target').classList.toggle('elite', !!t.elite); }
  // interaction prompt
  let near = null;
  if (!PL.dead && !uiOpen) {
    if (inArena) { if (Math.hypot(PL.pos.x, PL.pos.z - 42) < 5) near = { label: 'Leave the Labyrinth', act: () => exitArena(false) }; else if (arena.stairs.visible && Math.hypot(PL.pos.x, PL.pos.z + 38) < 7) near = { label: F.n >= 100 ? 'The summit' : `Climb to Floor ${F.n + 1}`, act: () => { if (F.n < 100) exitArena(true); } }; }
    else for (const it of INTER) if (Math.hypot(PL.pos.x - it.x, PL.pos.z - it.z) < it.r) { near = it; break; }
  }
  curInteract = near; setHTML('prompt', near ? `<kbd>E</kbd>${esc(near.label)}` : ''); $('prompt').hidden = !near;
}
function updateHotbar() {
  const hb = $('hotbar'); hb.innerHTML = ''; hotEls.length = 0;
  SKILLS.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'slot' + (S.lvl < s.lvl ? ' locked' : ''); d.style.setProperty('--c', hexStr(s.color));
    d.innerHTML = `<span class="k">${s.key}</span><span class="gem"></span><span class="n">${S.lvl < s.lvl ? 'LV ' + s.lvl : esc(s.name.split(' ')[0])}</span><span class="cd"></span>`;
    if (isTouch) { d.style.pointerEvents = 'auto'; d.onpointerdown = e => { e.preventDefault(); trySkill(i); }; }
    hb.appendChild(d); hotEls.push(d);
  });
  const p = document.createElement('div'); p.className = 'slot'; p.style.setProperty('--c', '#62e08c');
  p.innerHTML = `<span class="k">R</span><span class="cnt">${S.potions}${S.hipotions ? '+' + S.hipotions : ''}</span><span class="gem round"></span><span class="n">Potion</span><span class="cd"></span>`;
  if (isTouch) { p.style.pointerEvents = 'auto'; p.onpointerdown = e => { e.preventDefault(); drinkPotion(); }; }
  hb.appendChild(p); hotEls.push(p);
}
function updateLabels(dt) {
  const items = [];
  for (const m of allTargets()) { if (m.boss) continue; const d = Math.hypot(m.x - PL.pos.x, m.z - PL.pos.z); if (d > 34) continue; items.push({ x: m.x, y: m.y + m.h + .95, z: m.z, html: `<div class="nm">${esc(m.name)}<i>Lv ${m.lvl}</i></div><div class="bar"><span style="width:${(m.hp / m.maxHp * 100).toFixed(1)}%"></span></div>`, cls: m.elite ? 'elite' : '' }); }
  for (const r of NET.remotes.values()) { if (!r.vis) continue; const s = r.s; items.push({ x: r.x, y: r.y + 2.85, z: r.z, html: `<div class="nm">${esc(String(s.n || 'Player').slice(0, 16))}<i>Lv ${s.lv | 0}</i></div><div class="bar"><span style="width:${clamp((s.hp || 0) / (s.mh || 1), 0, 1) * 100}%"></span></div>`, cls: 'pl' }); }
  if (!inArena) for (const n of F.npcs) if (Math.hypot(n.x - PL.pos.x, n.z - PL.pos.z) < 30) items.push({ x: n.x, y: n.h + .3, z: n.z, html: `<div class="nm">${esc(n.name)}</div>`, cls: 'npc' });
  let i = 0;
  for (const it of items) {
    const p = project(it.x, it.y, it.z); if (!p) continue;
    let el = labelPool[i]; if (!el) { el = document.createElement('div'); labelLayer.appendChild(el); labelPool.push(el); }
    if (el._h !== it.html) { el.innerHTML = it.html; el._h = it.html; } const cls = 'lbl ' + it.cls; if (el.className !== cls) el.className = cls; el.style.display = '';
    const dist = camera.position.distanceTo(_v.set(it.x, it.y, it.z)), s = clamp(14 / dist, .6, 1.1);
    el.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-100%) scale(${s.toFixed(2)})`; i++;
  }
  for (; i < labelPool.length; i++) labelPool[i].style.display = 'none';
  for (let k = dmgList.length - 1; k >= 0; k--) {
    const d = dmgList[k]; d.t += Math.max(dt, 1 / 60); const p = project(d.x, d.y + d.t * 1.6, d.z);
    if (!p || d.t > .95) { if (d.t > .95) { d.el.remove(); dmgList.splice(k, 1); } else d.el.style.display = 'none'; continue; }
    d.el.style.display = ''; d.el.style.opacity = String(1 - Math.max(0, d.t - .55) / .4); d.el.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-50%) scale(${1 + Math.max(0, .15 - d.t) * 3})`;
  }
}
// maps
const staticMap = document.createElement('canvas'); staticMap.width = staticMap.height = 240;
function renderStaticMap() {
  const c = staticMap.getContext('2d'), N = 240, sc = (R + 10) * 2 / N, img = c.createImageData(N, N), col = new THREE.Color(), th = F.theme;
  const c0 = new THREE.Color(th.g[0]), c1 = new THREE.Color(th.g[1]), cp = new THREE.Color(th.path), cw = new THREE.Color(th.water), ch = new THREE.Color(th.hi), cpl = new THREE.Color(0xd8d0c0);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i - N / 2) * sc, z = (j - N / 2) * sc, d = Math.hypot(x, z), k = (j * N + i) * 4; if (d > R) { img.data[k + 3] = 0; continue; }
    const h = terrainH(x, z); col.copy(c0).lerp(c1, fbm(x * .05, z * .05, F.seed + 21)).lerp(ch, smooth(5, 14, h)); const pf = pathF(x, z); if (pf > 0) col.lerp(cp, pf); if (h < -1.3) col.copy(cw);
    for (const zn of F.flat) if (Math.hypot(x - zn.x, z - zn.z) < zn.r * .9) col.lerp(cpl, .5);
    const sh = .75 + clamp((h + 6) / 26, 0, 1) * .35; img.data[k] = col.r * 255 * sh; img.data[k + 1] = col.g * 255 * sh; img.data[k + 2] = col.b * 255 * sh; img.data[k + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const toM = (x, z) => [x / sc + N / 2, z / sc + N / 2];
  c.strokeStyle = 'rgba(98,224,140,.9)'; c.lineWidth = 1.5; for (const zn of zones) { const [a, b] = toM(zn.x, zn.z); c.beginPath(); c.arc(a, b, zn.r / sc, 0, TAU); c.stroke(); }
  const [tx, tz] = toM(F.tower.x, F.tower.z); c.fillStyle = '#2a2838'; c.beginPath(); c.arc(tx, tz, F.tower.r / sc + 1, 0, TAU); c.fill(); c.strokeStyle = '#b08aff'; c.lineWidth = 2; c.stroke();
}
function drawMap(cv, big) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.clearRect(0, 0, W, H); c.save(); c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, TAU); c.clip(); c.fillStyle = '#0a1320'; c.fillRect(0, 0, W, H);
  const sc = (R + 10) * 2 / W, toM = (x, z) => [x / sc + W / 2, z / sc + H / 2];
  if (inArena) { c.fillStyle = '#2a2c36'; c.beginPath(); c.arc(W / 2, H / 2, W * .42, 0, TAU); c.fill(); c.fillStyle = '#9aa'; c.font = `600 ${W / 14}px Chakra Petch, sans-serif`; c.textAlign = 'center'; c.fillText('BOSS HALL', W / 2, H / 2); c.restore(); return; }
  c.drawImage(staticMap, 0, 0, W, H);
  for (const m of monsters) { if (m.dead) continue; if (Math.hypot(m.x - PL.pos.x, m.z - PL.pos.z) > (big ? 999 : 60)) continue; const [a, b] = toM(m.x, m.z); c.fillStyle = m.elite ? '#ffc83a' : '#ff5a4a'; const s = m.elite ? 5 : 3; c.fillRect(a - s / 2, b - s / 2, s, s); }
  const icon = { shop: '#f2a93b', smith: '#ff8a5a', quest: '#fff2a0' };
  for (const n of F.npcs) { const [a, b] = toM(n.x, n.z); c.fillStyle = icon[n.kind] || '#fff'; c.beginPath(); c.arc(a, b, big ? 4 : 2.2, 0, TAU); c.fill(); }
  for (const r of NET.remotes.values()) { if (!r.vis) continue; const [a, b] = toM(r.x, r.z); c.fillStyle = '#7fd8ff'; c.beginPath(); c.arc(a, b, big ? 5 : 3.5, 0, TAU); c.fill(); }
  if (big) { c.fillStyle = '#fff'; c.font = `600 ${W / 34}px Chakra Petch, sans-serif`; c.textAlign = 'center'; for (const t of [F.town, F.v1, F.v2]) { const [a, b] = toM(t.x, t.z); c.fillText(t.name, a, b - t.r / sc - 6); } const [a, b] = toM(F.tower.x, F.tower.z); c.fillStyle = '#d8c8ff'; c.fillText('Labyrinth Tower', a, b + F.tower.r / sc + 16); }
  const [px, pz] = toM(PL.pos.x, PL.pos.z); c.translate(px, pz); c.rotate(-PL.yaw + Math.PI); c.fillStyle = '#ffd870'; c.strokeStyle = '#000'; c.lineWidth = 1; const s = big ? 9 : 6;
  c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .7, s * .8); c.lineTo(0, s * .4); c.lineTo(-s * .7, s * .8); c.closePath(); c.fill(); c.stroke(); c.restore();
}

/* ================= chat, toasts, banners ================= */
const chatLog = $('chatlog');
function addLine(html, cls) { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; chatLog.appendChild(d); while (chatLog.childElementCount > 40) chatLog.firstChild.remove(); }
function toast(t, cls) { addLine(esc(t), cls || 'sys'); }
function addChat(n, m) { addLine(`<b>${esc(n)}:</b> ${esc(m)}`); }
let bannerT = null;
function banner(a, b, ms) { const el = $('banner'); el.querySelector('.b1').textContent = a; el.querySelector('.b2').textContent = b || ''; el.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('show'), ms || 2500); }
function openChat() { chatOpen = true; $('chat').classList.add('open'); exitLock(); $('chatIn').focus(); }
function closeChat() { chatOpen = false; $('chat').classList.remove('open'); $('chatIn').blur(); canvas.focus(); }
$('chatIn').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { const v = $('chatIn').value.trim(); if (v) { addChat(S.name, v); if (NET.room) NET.room.emit('chat', { n: S.name, m: v.slice(0, 160) }).catch(() => toast('Chat could not be sent.', 'sys')); } $('chatIn').value = ''; closeChat(); }
  else if (e.key === 'Escape') { $('chatIn').value = ''; closeChat(); }
});

/* ================= multiplayer ================= */
const NET = { room: null, status: 'Connecting…', count: 1, remotes: new Map(), sendT: 0, seen: new Set() };
async function netInit() {
  let r = null; try { r = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { r = null; }
  if (!r) { NET.status = 'Solo · offline'; return; }
  NET.room = r; NET.status = 'Online';
  r.onPeers(ch => { NET.count = ch.peers.filter(p => p.kind === 'viewer').length; for (const p of ch.left) dropRemote(p.peer); }, () => { NET.status = 'Solo · offline'; NET.room = null; });
  r.onConnection(c => { NET.status = c ? 'Online' : 'Reconnecting…'; });
  r.on('chat', msg => { if (msg.sameTab) return; const d = msg.data || {}; addChat(String(d.n || 'Player').slice(0, 16), String(d.m || '').slice(0, 160)); });
  r.on('boss', msg => { if (msg.sameTab) return; const d = msg.data || {}; if (boss && !boss.dead && !boss.dying && inArena && d.f === F.n && typeof d.d === 'number' && d.d > 0 && d.d < 1e6) hitMonster(boss, Math.round(d.d), false, 0x9ab0c8, false); });
  r.on('announce', msg => { if (msg.sameTab) return; const t = String((msg.data || {}).m || '').slice(0, 140); if (!t) return; toast(t, 'announce'); banner('Announcement', t, 4200); SFX.quest(); });
  r.on('xp', msg => {
    if (msg.sameTab || mode !== 'play' || PL.dead || inArena) return; const d = msg.data || {};
    if (d.f !== F.n || typeof d.x !== 'number' || typeof d.xp !== 'number' || d.xp <= 0 || d.xp > 1e5) return;
    if (Math.hypot(d.x - PL.pos.x, d.z - PL.pos.z) > 45) return;
    const g = Math.max(1, Math.round(d.xp * .35)); popNum(PL.pos.x, PL.pos.y + 2.6, PL.pos.z, `+${g} XP`, 'xp'); gainXp(g, true);
  });
}
function netPeersHere() { if (!NET.room) return []; return NET.room.peers().filter(p => !p.sameTab && p.presence && p.presence.f === F.n && !!p.presence.a === inArena); }
function netBoss(d) { if (NET.room && mode === 'play') NET.room.emit('boss', { f: F.n, d }).catch(() => {}); }
function netTick(dt) {
  if (!NET.room) return; NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = .1;
  const r2 = v => Math.round(v * 100) / 100;
  NET.room.presence({ n: S.name, c: S.color, hc: S.hair, hs: S.hs, sk: S.skin, ar: curA().t || 0, f: F.n, a: inArena ? 1 : 0, x: r2(PL.pos.x), y: r2(PL.pos.y), z: r2(PL.pos.z), r: r2(PL.yaw), hp: Math.round(S.hp), mh: maxHp(), lv: S.lvl, at: PL.atkStamp, aa: PL.act ? PL.act.anim : '', ad: PL.act ? PL.act.dur : 0, ac: PL.act && PL.act.skill ? PL.act.color : -1, sh: PL.model && PL.model.sheathed ? 1 : 0, dead: PL.dead ? 1 : 0, hcm: S.hardcore ? 1 : 0, bh: inArena && boss && !boss.dead && boss.engaged ? r2(boss.hp / boss.maxHp) : -1 }).catch(() => {});
}
const safeColor = c => /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#888888';
function remoteLook(s) { return { coat: safeColor(s.c), hair: safeColor(s.hc || '#2a2420'), hs: clamp(s.hs | 0, 0, 3), skin: safeColor(s.sk || '#f0c9a5'), tier: clamp(s.ar | 0, 0, 5) }; }
function dropRemote(id) { const r = NET.remotes.get(id); if (r) { scene.remove(r.model.g); NET.remotes.delete(id); } }
function updateRemotes(dt) {
  if (!NET.room) return; const seen = new Set();
  for (const p of NET.room.peers()) {
    if (p.sameTab || p.kind !== 'viewer') continue; const s = p.presence; if (!s || typeof s.x !== 'number' || typeof s.z !== 'number') continue;
    const here = s.f === F.n && !!s.a === inArena; let r = NET.remotes.get(p.peer);
    if (!here) { if (r) { r.vis = false; r.model.g.visible = false; } continue; }
    seen.add(p.peer);
    const look = remoteLook(s), key = JSON.stringify(look);
    if (!r) { r = { model: buildAvatar(look), key, x: s.x, y: s.y || 0, z: s.z, yaw: s.r || 0, at: s.at, t: 1, anim: null, dur: .5, s }; scene.add(r.model.g); NET.remotes.set(p.peer, r); if (!NET.seen.has(p.peer)) { NET.seen.add(p.peer); toast(`${String(s.n || 'A player').slice(0, 16)} is on this floor.`, 'sys'); } }
    if (r.key !== key) { scene.remove(r.model.g); r.model = buildAvatar(look); r.key = key; scene.add(r.model.g); }
    r.s = s; r.vis = !s.dead; r.model.g.visible = r.vis;
    const k = Math.min(1, dt * 12), px = r.x, pz = r.z; r.x = lerp(r.x, s.x, k); r.y = lerp(r.y, s.y || 0, k); r.z = lerp(r.z, s.z, k); r.yaw = angLerp(r.yaw, s.r || 0, k);
    const spd = Math.hypot(r.x - px, r.z - pz) / Math.max(dt, 1e-3);
    if (s.at && s.at !== r.at && s.aa && ANIM[s.aa]) { r.at = s.at; r.anim = s.aa; r.dur = clamp(+s.ad || .5, .2, 2); r.t = 0; r.model.bladeMat.emissive.setHex(s.ac >= 0 ? s.ac : 0); r.model.bladeMat.emissiveIntensity = s.ac >= 0 ? (hdr ? 4 : 2) : 0; }
    if (r.anim) { r.t += dt / r.dur; if (r.t >= 1) { r.anim = null; r.model.bladeMat.emissiveIntensity = 0; } }
    setSheath(r.model, !!s.sh && !r.anim);
    const spin = animAvatar(r.model, dt, { speed: Math.min(spd, 12), anim: r.anim, t: r.t, airborne: (s.y || 0) > groundAt(r.x, r.z) + .4, sheathed: r.model.sheathed });
    r.model.g.position.set(r.x, r.y, r.z); r.model.g.rotation.y = r.yaw + spin;
  }
  for (const [k, r] of NET.remotes) if (!seen.has(k)) { r.vis = false; r.model.g.visible = false; }
}

/* ================= windows ================= */
let winTab = 'status', shopTab = 'buy', resetArm = false;
const ICONS = {
  status: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  items: '<svg viewBox="0 0 24 24"><path d="M9 3h6v4l3 3v10H6V10l3-3z"/><path d="M6 13h12"/></svg>',
  equip: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6l-9 9-3-3z"/><path d="M5 16l3 3M4 20l2-2"/></svg>',
  skills: '<svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z"/></svg>',
  quests: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/><path d="M9 8h6M9 12h4"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  players: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c1-3.5 3.6-5 7-5s6 1.5 7 5M15 15c3 0 5 1.5 6 4"/></svg>',
  system: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  anvil: '<svg viewBox="0 0 24 24"><path d="M3 8h13c0 3-2 5-5 5v3h4v3H6v-3h4v-3c-4 0-7-2-7-5z"/><path d="M16 8h5l-3 3"/></svg>',
};
const TABS = [['status', 'Status'], ['items', 'Items'], ['equip', 'Equipment'], ['skills', 'Sword Skills'], ['quests', 'Quest Log'], ['map', 'Map'], ['players', 'Players'], ['system', 'System']];
function openWin(kind) {
  if (kind === 'quests') { uiOpen = 'board'; } else uiOpen = kind;
  $('win').hidden = false; exitLock(); SFX.ui();
  if (kind === 'menu') renderMenu(); else if (kind === 'shop') renderShop(); else if (kind === 'gate') renderGate(); else if (kind === 'smith') renderSmith(); else if (kind === 'quests') renderBoard();
}
function closeWin() { if (!uiOpen || uiOpen === 'death') return; uiOpen = null; $('win').hidden = true; resetArm = false; canvas.focus(); updateHotbar(); }
$('wClose').onclick = closeWin; $('win').addEventListener('pointerdown', e => { if (e.target === $('win')) closeWin(); });
function railFor(active, list) {
  $('rail').innerHTML = list.map(([k, l]) => `<button class="rb ${k === active ? 'on' : ''}" data-t="${k}" title="${l}" aria-label="${l}">${ICONS[k] || ICONS.status}</button>`).join('');
  $('rail').querySelectorAll('.rb').forEach(b => { b.onclick = () => { SFX.ui(); if (uiOpen === 'menu') { winTab = b.dataset.t; renderMenu(); } }; });
}
const itemRow = (ic, title, sub, right) => `<div class="row"><span class="ic" style="--c:${ic}"></span><div class="tx"><b>${title}</b><small>${sub}</small></div>${right || ''}</div>`;
function questRows(list, active) {
  return list.map(q => `<div class="row ${active ? '' : 'offer'}"><span class="ic" style="--c:${q.type === 'boss' ? '#ff6a4a' : q.type === 'elite' ? '#ffc83a' : '#7fd8ff'}"></span><div class="tx"><b>${esc(q.title)}</b><small>${esc(q.desc)} Reward: ${fmt(q.xp)} XP · ${fmt(q.col)} Col · ${q.pot} potion${q.pot > 1 ? 's' : ''}${active ? ` · Floor ${q.floor}` : ''}</small>${active ? `<div class="prog"><span style="width:${q.have / q.need * 100}%"></span></div>` : ''}</div>${active ? `<span class="pr">${q.have}/${q.need}</span><button class="btn small ghost" data-ab="${esc(q.id)}">Abandon</button>` : `<button class="btn small" data-acc="${esc(q.id)}">Accept</button>`}</div>`).join('');
}
function bindQuestButtons(B, rerender) {
  B.querySelectorAll('button[data-acc]').forEach(b => { b.onclick = () => { const q = questOffers().find(x => x.id === b.dataset.acc); if (q) acceptQuest(q); rerender(); }; });
  B.querySelectorAll('button[data-ab]').forEach(b => { b.onclick = () => { S.quests = S.quests.filter(q => q.id !== b.dataset.ab); writeSave(); rerender(); }; });
}
function renderMenu() {
  railFor(winTab, TABS); $('wTitle').textContent = TABS.find(t => t[0] === winTab)[1]; $('wCol').textContent = fmt(S.col) + ' Col';
  const B = $('wBody'), mh = maxHp();
  if (winTab === 'status') {
    B.innerHTML = `<div class="grid2">
      <div class="card"><h3>${esc(S.name)}${S.hardcore ? ' · Hardcore' : ''}</h3>
        <div class="kv"><span>Level</span><span>${S.lvl}</span></div>
        <div class="kv"><span>Experience</span><span>${fmt(S.xp)} / ${fmt(xpNeed(S.lvl))}</span></div>
        <div class="kv"><span>HP</span><span>${Math.ceil(S.hp)} / ${mh}</span></div>
        <div class="kv"><span>Attack</span><span>${atkPow()}</span></div>
        <div class="kv"><span>Defense</span><span>${defPow()} · takes ${Math.round(60 / (60 + defPow()) * 100)}% damage</span></div>
        <div class="kv"><span>Critical chance</span><span>${(critCh() * 100).toFixed(1)}%</span></div>
        <div class="kv"><span>Move speed</span><span>${(spdMul() * 100).toFixed(0)}%</span></div>
        <div class="kv"><span>Skill cooldowns</span><span>${(cdMul() * 100).toFixed(0)}%</span></div></div>
      <div class="card"><h3>Attributes · ${S.pts} points</h3>
        ${[['str', 'STR', '+2 attack'], ['agi', 'AGI', 'crit, speed, cooldowns'], ['vit', 'VIT', '+12 HP, +0.5 DEF']].map(([k, l, d]) => `<div class="kv"><span>${l} <small style="color:var(--muted)">${d}</small></span><span>${S[k]}<button class="plus" data-s="${k}" ${S.pts > 0 ? '' : 'disabled'} aria-label="Add a point to ${l}">+</button></span></div>`).join('')}
        <div class="kv"><span>Monsters defeated</span><span>${fmt(S.kills)}</span></div>
        <div class="kv"><span>Quests completed</span><span>${fmt(S.qdone || 0)}</span></div>
        <div class="kv"><span>Highest floor reached</span><span>${S.maxFloor}</span></div>
        <div class="kv"><span>Floors cleared</span><span>${Object.keys(S.cleared).length}</span></div></div></div>`;
    B.querySelectorAll('.plus').forEach(b => { b.onclick = () => { if (S.pts <= 0) return; S.pts--; S[b.dataset.s]++; if (b.dataset.s === 'vit') S.hp += 12; SFX.ui(); writeSave(); renderMenu(); }; });
  } else if (winTab === 'items') {
    const ms = Object.entries(S.mats).filter(e => e[1] > 0);
    B.innerHTML = `<div class="list">${itemRow('#62e08c', `Healing Potion × ${S.potions}`, 'Restores 40% HP over 3 seconds. Press R.')}
      ${S.hipotions ? itemRow('#7fd8ff', `High Potion × ${S.hipotions}`, 'Restores 75% HP. Used first when HP is below 40%.') : ''}
      ${ms.map(([k, v]) => itemRow('#c8a070', `${esc(k)} × ${v}`, 'Material. Dalla the blacksmith uses it to enhance gear; Brenn buys it.')).join('')}
      ${ms.length ? '' : '<div class="empty">No materials yet. Monsters drop them when defeated.</div>'}</div>`;
  } else if (winTab === 'equip') {
    B.innerHTML = `<h3 class="sec">Swords</h3><div class="list">${S.weapons.map((w, i) => `<div class="row ${i === S.eq ? 'eq' : ''}"><span class="ic" style="--c:${w.unique ? '#ffd870' : '#cfe6ff'}"></span><div class="tx"><b>${esc(itemName(w))}</b><small>ATK ${wAtk(w)}${w.unique ? ' · boss reward' : ''}</small></div>${i === S.eq ? '<span class="pr on">Equipped</span>' : `<button class="btn small ghost" data-w="${i}">Equip</button>`}</div>`).join('')}</div>
      <h3 class="sec">Coats</h3><div class="list">${S.armors.map((a, i) => `<div class="row ${i === S.aeq ? 'eq' : ''}"><span class="ic" style="--c:${a.unique ? '#ffd870' : '#a8c8ff'}"></span><div class="tx"><b>${esc(itemName(a))}</b><small>DEF ${aDef(a)} · look tier ${a.t || 0}${a.unique ? ' · boss reward' : ''}</small></div>${i === S.aeq ? '<span class="pr on">Equipped</span>' : `<button class="btn small ghost" data-a="${i}">Equip</button>`}</div>`).join('')}</div>`;
    B.querySelectorAll('button[data-w]').forEach(b => { b.onclick = () => { S.eq = +b.dataset.w; SFX.ui(); writeSave(); renderMenu(); }; });
    B.querySelectorAll('button[data-a]').forEach(b => { b.onclick = () => { S.aeq = +b.dataset.a; SFX.ui(); setAvatar(); writeSave(); renderMenu(); }; });
  } else if (winTab === 'skills') {
    B.innerHTML = `<div class="list">${SKILLS.map(s => { const ok = S.lvl >= s.lvl; return `<div class="row ${ok ? '' : 'dim'}"><span class="ic" style="--c:${hexStr(s.color)}"></span><div class="tx"><b>[${s.key}] ${s.name}</b><small>${s.desc} ${Math.round(s.mult * 100)}% damage${s.hits.length > 1 ? ' × ' + s.hits.length : ''} · ${(s.cd * cdMul()).toFixed(1)}s cooldown</small></div><span class="pr">${ok ? 'Learned' : 'Lv ' + s.lvl}</span></div>`; }).join('')}
      ${itemRow('#ffffff', '[Click / J] Basic combo', 'Three-hit chain. Keep pressing within half a second to continue it. The third hit deals 140%.')}
      ${itemRow('#ffd870', '[Tab] Target lock', 'Locks the camera and your attacks onto the nearest enemy in view. Press again to release.')}</div>`;
  } else if (winTab === 'quests') {
    B.innerHTML = S.quests.length ? `<div class="list">${questRows(S.quests, true)}</div><p class="t-note">Pick up new quests from any Quest Board in a city or village.</p>` : '<div class="empty">No active quests. Quest Boards stand in every city plaza and village.</div>';
    bindQuestButtons(B, renderMenu);
  } else if (winTab === 'map') {
    B.innerHTML = `<canvas id="bigmap" width="560" height="560"></canvas><div class="legend"><span><i style="background:#ffd870"></i>You</span><span><i style="background:#7fd8ff"></i>Players</span><span><i style="background:#ff5a4a"></i>Monsters</span><span><i style="background:#ffc83a"></i>Elites</span><span><i style="background:#f2a93b"></i>Merchant</span><span><i style="background:#ff8a5a"></i>Smith</span><span><i style="background:#fff2a0"></i>Quest board</span><span><i style="background:#b08aff"></i>Labyrinth</span></div>`;
    drawMap($('bigmap'), true);
  } else if (winTab === 'players') {
    const ps = NET.room ? NET.room.peers().filter(p => p.kind === 'viewer') : [];
    B.innerHTML = !NET.room ? '<div class="empty">Multiplayer is not available in this view. You are playing solo; your progress is still saved in this browser.</div>' :
      `<div class="list"><div class="row eq"><span class="ic" style="--c:${safeColor(S.color)}"></span><div class="tx"><b>${esc(S.name)} (you)</b><small>Lv ${S.lvl} · Floor ${F.n}${inArena ? ' · boss room' : ''}</small></div></div>
      ${ps.filter(p => !p.sameTab && p.presence && p.presence.n).map(p => { const s = p.presence; return `<div class="row"><span class="ic" style="--c:${safeColor(s.c)}"></span><div class="tx"><b>${esc(String(s.n).slice(0, 16))}${s.hcm ? ' · Hardcore' : ''}</b><small>Lv ${s.lv | 0} · Floor ${s.f | 0}${s.a ? ' · boss room' : ''}${s.dead ? ' · down' : ''}</small></div>${s.f !== F.n && (s.f | 0) <= S.maxFloor ? `<button class="btn small ghost" data-f="${s.f | 0}">Go to floor</button>` : ''}</div>`; }).join('') || '<div class="empty">Nobody else is here right now. Share the link: everyone who has it open plays in the same world.</div>'}</div>`;
    B.querySelectorAll('button[data-f]').forEach(b => { b.onclick = () => { const f = +b.dataset.f; if (PL.inSafe && PL.inSafe.city && !inArena) travel(f); else toast('Travel between floors from the Teleport Gate in a city plaza.', 'sys'); }; });
  } else if (winTab === 'system') {
    const qb = ['low', 'medium', 'high'].map(q => `<button class="${SETTINGS.quality === q ? 'on' : ''}" data-q="${q}">${q}</button>`).join('');
    B.innerHTML = `<div class="grid2"><div class="card"><h3>Graphics</h3>
      <div class="kv"><span>Quality</span><span class="seg">${qb}</span></div>
      <div class="kv"><span><label for="fovIn">Field of view</label></span><span><input id="fovIn" type="range" min="50" max="85" step="1" value="${SETTINGS.fov}"></span></div>
      <div class="kv"><span>Damage numbers</span><span><button class="btn small ghost" id="dmgBtn">${SETTINGS.dmgNums ? 'On' : 'Off'}</button></span></div>
      <p class="t-note">Low turns off glow and shadows for slower devices. Grass density changes on the next floor you load.</p></div>
      <div class="card"><h3>Sound & controls</h3>
      <div class="kv"><span><label for="musIn">Music</label></span><span><input id="musIn" type="range" min="0" max="1" step="0.05" value="${SETTINGS.music}"></span></div>
      <div class="kv"><span><label for="sfxIn">Sound effects</label></span><span><input id="sfxIn" type="range" min="0" max="1" step="0.05" value="${SETTINGS.sfx}"></span></div>
      <div class="kv"><span><label for="sensIn">Mouse sensitivity</label></span><span><input id="sensIn" type="range" min="0.4" max="2" step="0.1" value="${SETTINGS.sens}"></span></div></div>
      <div class="card"><h3>Character</h3><p class="t-note" style="margin-top:0">Progress saves automatically in this browser.</p><button class="btn small ghost" id="resetBtn">${resetArm ? 'Click again to delete this character' : 'Delete character'}</button></div></div>`;
    B.querySelectorAll('button[data-q]').forEach(b => { b.onclick = () => { SETTINGS.quality = b.dataset.q; saveSettings(); applyQuality(); renderMenu(); }; });
    $('fovIn').oninput = e => { SETTINGS.fov = +e.target.value; saveSettings(); resize(); };
    $('dmgBtn').onclick = () => { SETTINGS.dmgNums = !SETTINGS.dmgNums; saveSettings(); renderMenu(); };
    $('musIn').oninput = e => { SETTINGS.music = +e.target.value; saveSettings(); setVolumes(); };
    $('sfxIn').oninput = e => { SETTINGS.sfx = +e.target.value; saveSettings(); setVolumes(); };
    $('sensIn').oninput = e => { SETTINGS.sens = +e.target.value; saveSettings(); };
    $('resetBtn').onclick = () => { if (!resetArm) { resetArm = true; renderMenu(); return; } try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); };
  }
}
function renderShop() {
  railFor('items', [['items', 'Shop']]); $('wTitle').textContent = 'Brenn · General Store'; $('wCol').textContent = fmt(S.col) + ' Col';
  const B = $('wBody');
  const goods = [{ k: 'potion', n: 'Healing Potion', d: 'Restores 40% HP over 3 seconds.', p: 40, c: '#62e08c' }];
  if (S.maxFloor >= 3) goods.push({ k: 'hipotion', n: 'High Potion', d: 'Restores 75% HP over 2.5 seconds.', p: 140, c: '#7fd8ff' });
  const wps = WEAPONS.filter(w => w.price > 0 && w.fl <= S.maxFloor && !S.weapons.some(o => o.n === w.n));
  const ars = ARMORS.filter(a => a.price > 0 && a.fl <= S.maxFloor && !S.armors.some(o => o.n === a.n));
  const sellMats = Object.entries(S.mats).filter(e => e[1] > 0);
  const sellW = S.weapons.map((w, i) => ({ w, i })).filter(o => o.i !== S.eq), sellA = S.armors.map((a, i) => ({ a, i })).filter(o => o.i !== S.aeq);
  const matPrice = n => { const d = Object.values(MOBS).find(m => m.mat === n); return d ? d.matP : 10; };
  B.innerHTML = `<div class="tabs2"><button class="${shopTab === 'buy' ? 'on' : ''}" data-s="buy">Buy</button><button class="${shopTab === 'sell' ? 'on' : ''}" data-s="sell">Sell</button></div>` +
    (shopTab === 'buy' ? `<div class="list">${goods.map(g => itemRow(g.c, g.n, `${g.d} You have ${g.k === 'potion' ? S.potions : S.hipotions}.`, `<span class="pr">${g.p} Col</span><button class="btn small" data-b="${g.k}" data-p="${g.p}" ${S.col < g.p ? 'disabled' : ''}>Buy</button>`)).join('')}
      ${wps.map(w => itemRow('#cfe6ff', w.n, `Sword · ATK ${w.atk} · yours: ${wAtk(curW())}`, `<span class="pr">${fmt(w.price)} Col</span><button class="btn small" data-w="${esc(w.n)}" ${S.col < w.price ? 'disabled' : ''}>Buy</button>`)).join('')}
      ${ars.map(a => itemRow('#a8c8ff', a.n, `Coat · DEF ${a.def} · yours: ${aDef(curA())}`, `<span class="pr">${fmt(a.price)} Col</span><button class="btn small" data-a="${esc(a.n)}" ${S.col < a.price ? 'disabled' : ''}>Buy</button>`)).join('')}
      ${wps.length || ars.length ? '' : '<div class="empty">Clear more floors to unlock stronger gear.</div>'}</div>`
    : `<div class="list">${sellMats.map(([k, v]) => itemRow('#c8a070', `${esc(k)} × ${v}`, `${matPrice(k)} Col each`, `<button class="btn small" data-m="${esc(k)}">Sell all · ${fmt(matPrice(k) * v)}</button>`)).join('')}
      ${sellW.map(o => itemRow('#cfe6ff', esc(itemName(o.w)), `ATK ${wAtk(o.w)}`, `<button class="btn small ghost" data-x="${o.i}">Sell · ${fmt(wAtk(o.w) * 25)}</button>`)).join('')}
      ${sellA.map(o => itemRow('#a8c8ff', esc(itemName(o.a)), `DEF ${aDef(o.a)}`, `<button class="btn small ghost" data-y="${o.i}">Sell · ${fmt(aDef(o.a) * 30)}</button>`)).join('')}
      ${sellMats.length || sellW.length || sellA.length ? '' : '<div class="empty">Nothing to sell. Materials and spare gear appear here.</div>'}</div>`);
  B.querySelectorAll('.tabs2 button').forEach(b => { b.onclick = () => { shopTab = b.dataset.s; renderShop(); }; });
  B.querySelectorAll('button[data-b]').forEach(b => { b.onclick = () => { const p = +b.dataset.p; if (S.col < p) return; S.col -= p; if (b.dataset.b === 'potion') S.potions++; else S.hipotions++; SFX.coin(); writeSave(); renderShop(); }; });
  B.querySelectorAll('button[data-w]').forEach(b => { b.onclick = () => { const w = WEAPONS.find(x => x.n === b.dataset.w); if (!w || S.col < w.price) return; S.col -= w.price; S.weapons.push({ n: w.n, atk: w.atk, plus: 0 }); S.eq = S.weapons.length - 1; SFX.coin(); toast(`Bought and equipped ${w.n}.`, 'loot'); writeSave(); renderShop(); }; });
  B.querySelectorAll('button[data-a]').forEach(b => { b.onclick = () => { const a = ARMORS.find(x => x.n === b.dataset.a); if (!a || S.col < a.price) return; S.col -= a.price; S.armors.push({ n: a.n, def: a.def, t: a.t, plus: 0 }); S.aeq = S.armors.length - 1; setAvatar(); SFX.coin(); toast(`Bought and equipped ${a.n}.`, 'loot'); writeSave(); renderShop(); }; });
  B.querySelectorAll('button[data-m]').forEach(b => { b.onclick = () => { const k = b.dataset.m; S.col += matPrice(k) * (S.mats[k] || 0); S.mats[k] = 0; SFX.coin(); writeSave(); renderShop(); }; });
  B.querySelectorAll('button[data-x]').forEach(b => { b.onclick = () => { const i = +b.dataset.x, w = S.weapons[i]; if (!w || i === S.eq) return; S.col += wAtk(w) * 25; S.weapons.splice(i, 1); if (S.eq > i) S.eq--; SFX.coin(); writeSave(); renderShop(); }; });
  B.querySelectorAll('button[data-y]').forEach(b => { b.onclick = () => { const i = +b.dataset.y, a = S.armors[i]; if (!a || i === S.aeq) return; S.col += aDef(a) * 30; S.armors.splice(i, 1); if (S.aeq > i) S.aeq--; SFX.coin(); writeSave(); renderShop(); }; });
}
function renderSmith() {
  railFor('anvil', [['anvil', 'Smithy']]); $('wTitle').textContent = 'Dalla · Blacksmith'; $('wCol').textContent = fmt(S.col) + ' Col';
  const tm = totalMats();
  const row = (it, i, armor) => {
    const lv = it.plus || 0, c = enhanceCost(it, armor), eq = armor ? i === S.aeq : i === S.eq, ok = S.col >= c.col && tm >= c.mats;
    const now = armor ? `DEF ${aDef(it)}` : `ATK ${wAtk(it)}`, next = lv < 10 ? (armor ? `DEF ${aDef(Object.assign({}, it, { plus: lv + 1 }))}` : `ATK ${wAtk(Object.assign({}, it, { plus: lv + 1 }))}`) : '';
    return `<div class="row ${eq ? 'eq' : ''}"><span class="ic" style="--c:${armor ? '#a8c8ff' : '#cfe6ff'}"></span><div class="tx"><b>${esc(itemName(it))}</b><small>${now}${lv < 10 ? ` → ${next} · costs ${fmt(c.col)} Col and ${c.mats} materials` : ' · fully enhanced'}</small><div class="prog gold"><span style="width:${lv * 10}%"></span></div></div>${lv < 10 ? `<button class="btn small" data-e="${armor ? 'a' : 'w'}${i}" ${ok ? '' : 'disabled'}>Enhance</button>` : '<span class="pr">+10</span>'}</div>`;
  };
  $('wBody').innerHTML = `<p class="t-note" style="margin-top:0">Each enhancement adds 10% of the item's base power (at least 1 point), up to +10. Dalla uses any monster materials, largest stacks first. You have ${tm} materials.</p>
    <h3 class="sec">Swords</h3><div class="list">${S.weapons.map((w, i) => row(w, i, false)).join('')}</div>
    <h3 class="sec">Coats</h3><div class="list">${S.armors.map((a, i) => row(a, i, true)).join('')}</div>`;
  $('wBody').querySelectorAll('button[data-e]').forEach(b => { b.onclick = () => enhance(b.dataset.e[0] === 'a', +b.dataset.e.slice(1)); });
}
function renderBoard() {
  railFor('quests', [['quests', 'Quest Board']]); $('wTitle').textContent = `Quest Board · Floor ${F.n}`; $('wCol').textContent = `${S.quests.length}/4 active`;
  const hist = S.qhist || [], offers = questOffers().filter(q => !hist.includes(q.id) && !S.quests.some(a => a.id === q.id));
  const B = $('wBody');
  B.innerHTML = `<h3 class="sec">Requests</h3><div class="list">${offers.length ? questRows(offers, false) : '<div class="empty">No new requests right now. Finish your active quests and new ones will be posted.</div>'}</div>
    ${S.quests.length ? `<h3 class="sec">Active</h3><div class="list">${questRows(S.quests, true)}</div>` : ''}`;
  bindQuestButtons(B, renderBoard);
}
function renderGate() {
  railFor('map', [['map', 'Gate']]); $('wTitle').textContent = 'Teleport Gate'; $('wCol').textContent = '';
  const rows = []; for (let n = 1; n <= S.maxFloor; n++) { const th = THEMES[(n - 1) % THEMES.length]; rows.push(`<div class="row ${n === F.n ? 'eq' : ''}"><span class="ic" style="--c:${hexStr(th.g[1])}"></span><div class="tx"><b>Floor ${n}${n === 1 ? ' · Firstlight City' : ''}</b><small>${th.name} · ${S.cleared[n] ? 'Cleared' : 'Boss undefeated'}</small></div>${n === F.n ? '<span class="pr on">You are here</span>' : `<button class="btn small" data-f="${n}">Teleport</button>`}</div>`); }
  $('wBody').innerHTML = `<p class="t-note" style="margin-top:0">Gates link every city you have reached. Defeat a floor's guardian to open the next one.</p><div class="list">${rows.reverse().join('')}</div>`;
  $('wBody').querySelectorAll('button[data-f]').forEach(b => { b.onclick = () => travel(+b.dataset.f); });
}

/* ================= input ================= */
let noLock = false, dragging = false, dragMoved = 0, lastX = 0, lastY = 0;
function exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
function reqLock() { if (noLock || isTouch) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { noLock = true; }); } catch (e) { noLock = true; } }
document.addEventListener('pointerlockerror', () => { noLock = true; });
window.addEventListener('keydown', e => {
  if (mode !== 'play') return; if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const c = e.code;
  if (c === 'Escape') { if (uiOpen && uiOpen !== 'death') closeWin(); return; }
  if (c === 'KeyM') { e.preventDefault(); if (uiOpen === 'menu') closeWin(); else if (!uiOpen) openWin('menu'); return; }
  if (c === 'KeyI' || c === 'KeyL' || c === 'KeyC') { if (!uiOpen) { winTab = { KeyI: 'items', KeyL: 'quests', KeyC: 'status' }[c]; openWin('menu'); } return; }
  if (uiOpen) return;
  if (c === 'Tab') { e.preventDefault(); toggleLock(); return; }
  if (c === 'Enter') { e.preventDefault(); openChat(); return; }
  keys[c] = true;
  if (c === 'Space') { e.preventDefault(); jump(); }
  else if (c === 'KeyJ') tryBasic();
  else if (c === 'KeyQ') dodge();
  else if (c === 'KeyR') drinkPotion();
  else if (c === 'KeyE') { if (curInteract) { SFX.ui(); curInteract.act(); } }
  else if (c === 'KeyH') $('help').hidden = !$('help').hidden;
  else if (/^Digit[1-5]$/.test(c)) trySkill(+c.slice(5) - 1);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousedown', e => {
  if (mode !== 'play' || uiOpen) return; audioInit();
  if (document.pointerLockElement === canvas) { if (e.button === 0) tryBasic(); else if (e.button === 2) dodge(); else if (e.button === 1) { e.preventDefault(); toggleLock(); } return; }
  if (!noLock && e.button === 0) { reqLock(); return; }
  dragging = true; dragMoved = 0; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('mouseup', e => { if (dragging && dragMoved < 6 && e.button === 0 && mode === 'play' && !uiOpen) tryBasic(); dragging = false; });
window.addEventListener('mousemove', e => {
  if (mode !== 'play') return; const s = SETTINGS.sens || 1;
  if (document.pointerLockElement === canvas) { camYaw -= e.movementX * .0026 * s; camPitch = clamp(camPitch + e.movementY * .002 * s, -.25, 1.25); }
  else if (dragging) { const dx = e.clientX - lastX, dy = e.clientY - lastY; dragMoved += Math.abs(dx) + Math.abs(dy); lastX = e.clientX; lastY = e.clientY; camYaw -= dx * .005 * s; camPitch = clamp(camPitch + dy * .004 * s, -.25, 1.25); }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { if (mode !== 'play') return; e.preventDefault(); camDist = clamp(camDist + e.deltaY * .01, 3, 16); }, { passive: false });
function setupTouch() {
  if (!isTouch) return; $('touch').hidden = false; $('help').hidden = true;
  const st = $('stick'), knob = st.querySelector('i'); let sid = null, cx = 0, cy = 0;
  st.addEventListener('pointerdown', e => { sid = e.pointerId; const r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; st.setPointerCapture(sid); audioInit(); });
  st.addEventListener('pointermove', e => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; touchMove.x = dx / m; touchMove.y = dy / m; touchSprint = l > m * .95; });
  const end = e => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; touchMove.x = touchMove.y = 0; touchSprint = false; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  const sb = 'env(safe-area-inset-bottom,0px)';
  const btns = [['ATK', 84, `calc(150px + ${sb})`, 24, tryBasic], ['DODGE', 58, `calc(244px + ${sb})`, 40, dodge], ['JUMP', 58, `calc(150px + ${sb})`, 120, jump], ['E', 50, `calc(250px + ${sb})`, 110, () => { if (curInteract) curInteract.act(); }], ['LOCK', 50, `calc(310px + ${sb})`, 40, toggleLock], ['MENU', 50, `calc(250px + ${sb})`, 170, () => openWin('menu')]];
  for (const [l, s, b, r, fn] of btns) { const el = document.createElement('button'); el.className = 'tb'; el.textContent = l; el.style.cssText = `width:${s}px;height:${s}px;right:${r}px;bottom:${b}`; el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); if (!uiOpen) fn(); }); $('touch').appendChild(el); }
  let lid = null, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' || lid !== null) return; lid = e.pointerId; lx = e.clientX; ly = e.clientY; });
  canvas.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; camYaw -= (e.clientX - lx) * .006; camPitch = clamp(camPitch + (e.clientY - ly) * .005, -.25, 1.25); lx = e.clientX; ly = e.clientY; });
  const le = e => { if (e.pointerId === lid) lid = null; }; canvas.addEventListener('pointerup', le); canvas.addEventListener('pointercancel', le);
}

/* ================= title & character creation ================= */
const PV = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(28, 1, .1, 50), A: null, key: '', rot: 0, drag: null };
PV.scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x3a4250, .95)); (() => { const d = new THREE.DirectionalLight(0xfff4e0, .95); d.position.set(2, 4, 4); PV.scene.add(d); const r = new THREE.DirectionalLight(0x7fd8ff, .6); r.position.set(-3, 2, -3); PV.scene.add(r); })();
function renderPreview() {
  const el = $('preview'); if (mode !== 'title' || !el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
  const key = JSON.stringify(appearance()); if (key !== PV.key) { PV.key = key; if (PV.A) PV.scene.remove(PV.A.g); PV.A = buildAvatar(appearance()); PV.scene.add(PV.A.g); }
  if (!PV.drag) PV.rot += .006; PV.A.g.rotation.y = PV.rot; animAvatar(PV.A, 1 / 60, { speed: 0, sheathed: true }); setSheath(PV.A, true);
  PV.cam.aspect = r.width / r.height; PV.cam.position.set(0, 1.35, 7.2); PV.cam.lookAt(0, 1.1, 0); PV.cam.updateProjectionMatrix();
  const H = window.innerHeight; renderer.setScissorTest(true); renderer.setScissor(r.left, H - r.bottom, r.width, r.height); renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(PV.scene, PV.cam); renderer.autoClear = true; renderer.setScissorTest(false); renderer.setViewport(0, 0, window.innerWidth, H);
}
function swatchRow(id, list, cur, set, round) {
  const el = $(id); el.innerHTML = list.map(c => `<button class="sw ${round ? 'round' : ''} ${c === cur ? 'on' : ''}" style="--c:${c}" data-c="${c}" aria-label="${c}"></button>`).join('');
  el.querySelectorAll('.sw').forEach(b => { b.onclick = () => { set(b.dataset.c); el.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); SFX.ui(); }; });
}
function setupTitle() {
  const saved = loadSave();
  if (saved) { S = saved; $('contBox').hidden = false; $('contBox').textContent = `Continue as ${S.name} · Level ${S.lvl} · Floor ${S.floor}${S.hardcore ? ' · Hardcore' : ''}`; $('nameIn').value = S.name; $('newBtn').hidden = false; $('diveBtn').textContent = 'Continue'; $('hcRow').hidden = true; }
  const drawControls = () => {
    swatchRow('swCoat', COAT_COLORS, S.color, c => { S.color = c; });
    swatchRow('swHair', HAIR_COLORS, S.hair, c => { S.hair = c; }, true);
    swatchRow('swSkin', SKIN_TONES, S.skin, c => { S.skin = c; }, true);
    $('styleRow').innerHTML = HAIR_STYLES.map((n, i) => `<button class="${S.hs === i ? 'on' : ''}" data-i="${i}">${n}</button>`).join('');
    $('styleRow').querySelectorAll('button').forEach(b => { b.onclick = () => { S.hs = +b.dataset.i; $('styleRow').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); SFX.ui(); }; });
  };
  drawControls();
  $('newBtn').onclick = () => { const keep = { color: S.color, hair: S.hair, hs: S.hs, skin: S.skin }; S = Object.assign(defaults(), keep); $('contBox').hidden = true; $('newBtn').hidden = true; $('hcRow').hidden = false; $('diveBtn').textContent = 'Dive in'; $('nameIn').value = ''; $('nameIn').focus(); drawControls(); };
  $('diveBtn').onclick = startGame; $('nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
  $('respawnBtn').onclick = respawn;
  const pv = $('preview');
  pv.addEventListener('pointerdown', e => { PV.drag = e.clientX; pv.setPointerCapture(e.pointerId); });
  pv.addEventListener('pointermove', e => { if (PV.drag == null) return; PV.rot += (e.clientX - PV.drag) * .012; PV.drag = e.clientX; });
  pv.addEventListener('pointerup', () => { PV.drag = null; });
}
function startGame() {
  const nm = $('nameIn').value.trim().replace(/[^\w\- .]/g, '').slice(0, 16);
  if (!nm) { $('nameIn').focus(); $('nameIn').placeholder = 'A name is required'; return; }
  S.name = nm; if (!$('hcRow').hidden) S.hardcore = $('hcIn').checked;
  audioInit(); $('title').hidden = true; $('hud').hidden = false; mode = 'play';
  setAvatar();
  const fl = clamp(S.floor || 1, 1, S.maxFloor); if (!F || F.n !== fl) loadFloor(fl);
  S.hp = Math.min(Math.max(S.hp, 1), maxHp()); spawnAtTown(); updateHotbar();
  banner(`Floor ${F.n}`, `${F.theme.name} · ${F.town.name}`, 3200);
  toast(`Welcome, ${S.name}. Quest Boards and Dalla the blacksmith are in the plaza. Monsters roam outside the walls; the tower to the north holds this floor's guardian.`, 'sys');
  if (!isTouch) toast('Click the world to capture the mouse. Tab locks onto a target. Press H to toggle the controls list.', 'sys');
  writeSave(); canvas.focus(); setInterval(writeSave, 10000);
}

/* ================= main loop ================= */
let last = performance.now(), titleA = 0, dnT = 0;
function musicMode() { if (mode !== 'play') return 'town'; if (inArena) return boss && boss.engaged && !boss.dead ? 'boss' : 'labyrinth'; return DAYK < .4 ? 'night' : PL.inSafe ? 'town' : 'field'; }
function frame(now) {
  const rdt = Math.min(.05, (now - last) / 1000); last = now; NOW += rdt; WIND.uTime.value = NOW;
  let dt = rdt; if (hitStop > 0) { hitStop -= rdt; dt = rdt * .08; }
  if (F) for (const f of F.anim) f(rdt);
  updateArenaAnim(rdt); clouds.rotation.y += rdt * .003;
  dnT -= rdt; if (dnT <= 0) { dnT = .5; updateDayNight(); }
  if (mode === 'play' && F) {
    const px = PL.pos.x, pz = PL.pos.z;
    updatePlayer(dt); PL.speedNow = Math.hypot(PL.pos.x - px, PL.pos.z - pz) / Math.max(dt, 1e-3);
    if (!inArena) for (const m of monsters) updateMob(m, dt);
    updateBoss(dt); updateRemotes(rdt);
    for (let i = FX.length - 1; i >= 0; i--) if (!FX[i](rdt)) FX.splice(i, 1);
    updateCamera(rdt); updateHUD(); updateLabels(rdt);
    if (((NOW * 10) | 0) % 2 === 0) drawMap($('mini'), false);
    netTick(rdt); updateAmbient(rdt, PL.pos.x, PL.pos.y, PL.pos.z);
  } else if (F) {
    titleA += rdt * .05; const r = 150;
    camera.position.set(Math.sin(titleA) * r, 48 + Math.sin(titleA * .7) * 8, Math.cos(titleA) * r + 20); camera.lookAt(0, 30, -40);
    sun.position.set(sunOffset.x, sunOffset.y + 60, sunOffset.z); sun.target.position.set(0, 0, 0); sky.position.copy(camera.position); stars.position.copy(camera.position);
    updateAmbient(rdt, camera.position.x, 20, camera.position.z);
  }
  Music.set(musicMode()); Music.update();
  renderFrame(); renderPreview();
  requestAnimationFrame(frame);
}
function boot(data) {
  applyQuality(); buildArena();
  try { const sv = loadSave(); if (data && data.save && data.save.name) S = Object.assign(defaults(), data.save); else if (sv) S = sv; } catch (e) {}
  loadFloor(clamp(S.floor || 1, 1, S.maxFloor || 1));
  setupTitle(); setupTouch(); updateHotbar();
  $('loadmsg').textContent = '';
  netInit();
  requestAnimationFrame(frame);
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: S })); } catch (e) {}
}
try { const h = window.claude && window.claude.hot; if (h && h.ready) h.ready(boot); else boot(h && h.data ? h.data : {}); } catch (e) { console.error(e); boot({}); }
