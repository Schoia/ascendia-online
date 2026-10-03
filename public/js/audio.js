'use strict';
/* Ascendia Online · sound effects and a generated soundtrack (Web Audio, no files). */
const AU = { ctx: null, sfx: null, mus: null, rev: null, noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = c;
    AU.sfx = c.createGain(); AU.sfx.gain.value = SETTINGS.sfx; AU.sfx.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.connect(c.destination);
    AU.mus = c.createGain(); AU.mus.gain.value = SETTINGS.music; AU.mus.connect(comp);
    const len = (c.sampleRate * 2.8) | 0, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    AU.rev = c.createConvolver(); AU.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = .5; AU.rev.connect(rg); rg.connect(AU.mus);
    const nl = c.sampleRate | 0; AU.noise = c.createBuffer(1, nl, c.sampleRate); const nd = AU.noise.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
  } catch (e) { AU.ctx = null; }
}
function setVolumes() { if (!AU.ctx) return; AU.sfx.gain.value = SETTINGS.sfx; AU.mus.gain.setTargetAtTime(SETTINGS.music, AU.ctx.currentTime, .2); }

const SFX = {
  tone(f, d, type, v, slide, delay = 0) {
    const c = AU.ctx; if (!c || SETTINGS.sfx <= 0) return; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(v || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(AU.sfx); o.start(t); o.stop(t + d + .02);
  },
  noise(d, v, f, type = 'bandpass', delay = 0, q = 1) {
    const c = AU.ctx; if (!c || SETTINGS.sfx <= 0) return; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f || 1200; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(fl).connect(g).connect(AU.sfx); s.start(t, Math.random() * .5); s.stop(t + d + .02);
  },
  swing() { this.noise(.17, .22, 2400, 'bandpass', 0, .7); },
  hit() { this.tone(170, .12, 'square', .06, .5); this.noise(.08, .25, 800); },
  crit() { this.hit(); this.tone(880, .18, 'triangle', .07, 1.8); },
  skill() { this.tone(440, .32, 'triangle', .08, 2.2); this.tone(660, .25, 'sine', .05, 2, .04); },
  shatter() { for (let i = 0; i < 7; i++) this.tone(1100 + Math.random() * 1900, .3, 'triangle', .04, .55, i * .025); this.noise(.3, .1, 5000, 'highpass'); },
  level() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .45, 'triangle', .08, 1, i * .09)); },
  quest() { [784, 988, 1175].forEach((f, i) => this.tone(f, .35, 'sine', .07, 1, i * .07)); },
  hurt() { this.tone(150, .22, 'sawtooth', .08, .55); this.noise(.1, .15, 400); },
  ui() { this.tone(880, .05, 'sine', .035); },
  lock() { this.tone(1320, .06, 'square', .025); this.tone(1760, .08, 'square', .02, 1, .05); },
  aggro() { this.tone(520, .12, 'square', .03, 1.4); },
  gate() { this.tone(260, .9, 'sine', .1, 3); this.noise(.8, .08, 3000, 'bandpass', 0, .5); },
  coin() { this.tone(1320, .08, 'square', .03); this.tone(1760, .1, 'square', .03, 1, .06); },
  anvil() { this.tone(1900, .5, 'triangle', .08, .98); this.tone(2650, .4, 'sine', .05); this.noise(.06, .3, 3000); },
  boom() { this.tone(70, .6, 'sawtooth', .14, .4); this.noise(.45, .3, 260, 'lowpass'); },
};

/* ---------- generative soundtrack ---------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const MUSIC = {
  town:      { bpm: 84,  base: 60, vol: .9, prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], arp: [0, 1, 2, 3, 2, 1, 0, 2], rest: [5], bass: [0], drums: 0 },
  field:     { bpm: 100, base: 57, vol: .85, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], arp: [0, 2, 1, 2, 0, 2, 1, 3], rest: [3, 7], bass: [0, 4], drums: 1 },
  night:     { bpm: 66,  base: 62, vol: .75, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], arp: [0, 2, 1, 3], rest: [1, 2, 4, 5, 7], bass: [0], drums: 0 },
  labyrinth: { bpm: 72,  base: 52, vol: .8, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]], arp: [0, 2], rest: [1, 2, 3, 5, 6, 7], bass: [0], drums: 0 },
  boss:      { bpm: 148, base: 50, vol: 1, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], arp: [0, 1, 2, 3, 2, 1, 2, 3], rest: [], bass: [0, 2, 4, 6], drums: 2 },
};
const Music = {
  mode: null, want: 'town', step: 0, next: 0, chord: 0,
  set(m) { this.want = m; },
  update() {
    const c = AU.ctx; if (!c || c.state !== 'running' || SETTINGS.music <= 0) return;
    if (!this.mode || this.next < c.currentTime - .5) { this.mode = this.want; this.next = c.currentTime + .1; this.step = 0; this.chord = 0; }
    let guard = 0;
    while (this.next < c.currentTime + .3 && guard++ < 16) {
      const M = MUSIC[this.mode], sl = 60 / M.bpm / 2;
      this.play(M, this.step % 8, this.next, sl);
      this.next += sl; this.step++;
      if (this.step % 8 === 0) {
        this.chord = (this.chord + 1) % M.prog.length;
        if (this.want !== this.mode && (this.chord % 2 === 0 || this.want === 'boss')) { this.mode = this.want; this.chord = 0; }
      }
    }
  },
  play(M, s, t, sl) {
    const ch = M.prog[this.chord], b = M.base, v = M.vol;
    if (s === 0) this.pad(ch.map(n => mtof(b + n)), t, sl * 8, .022 * v);
    if (M.bass.includes(s)) this.bass(mtof(b + ch[0] - 12), t, sl * (M.drums === 2 ? 1.6 : 3), .09 * v);
    if (!M.rest.includes(s)) { const idx = M.arp[s % M.arp.length]; const n = ch[idx % ch.length] + (idx >= ch.length ? 12 : 0) + 12; this.pluck(mtof(b + n), t, (M.drums === 2 ? .035 : .045) * v); }
    if (M.drums === 1 && (s === 0 || s === 4)) this.drum(t, .05 * v, 90);
    if (M.drums === 2) { if (s % 4 === 0) this.drum(t, .14 * v, 120); if (s % 4 === 2) this.snare(t, .06 * v); this.hat(t, .018 * v); }
  },
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); },
  out(node) { node.connect(AU.mus); node.connect(AU.rev); },
  pluck(f, t, v) {
    const c = AU.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = c.createGain(); g2.gain.value = .3;
    o.connect(g); o2.connect(g2).connect(g); this.env(g, t, .006, v, 1.1); this.out(g); o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
  },
  pad(fs, t, d, v) {
    const c = AU.ctx, fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1000; fl.Q.value = .4;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .3); g.gain.linearRampToValueAtTime(v * .7, t + d * .85); g.gain.exponentialRampToValueAtTime(.0001, t + d + .8);
    fl.connect(g); this.out(g);
    for (const f of fs) for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + d + 1); }
  },
  bass(f, t, d, v) { const c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); this.env(g, t, .01, v, d); g.connect(AU.mus); o.start(t); o.stop(t + d + .1); },
  drum(t, v, f) { const c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(40, t + .18); o.connect(g); this.env(g, t, .003, v, .25); g.connect(AU.mus); o.start(t); o.stop(t + .3); },
  snare(t, v) { const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 1500; const g = c.createGain(); s.connect(fl).connect(g); this.env(g, t, .002, v, .16); this.out(g); s.start(t, Math.random() * .5); s.stop(t + .2); },
  hat(t, v) { const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noise; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 7500; const g = c.createGain(); s.connect(fl).connect(g); this.env(g, t, .001, v, .04); g.connect(AU.mus); s.start(t, Math.random() * .5); s.stop(t + .06); },
};
