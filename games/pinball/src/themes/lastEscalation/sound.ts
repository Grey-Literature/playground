// The Last Escalation — theme sounds, synthesized on the engine's WebAudio
// helpers (no assets). Three parts:
//   - `voice`: this table's own versions of the engine's table sounds
//     (flippers, bumpers, slings, lanes, jackpots…), so nothing on it beeps
//     like Dead Star Disco. Wired in through ThemeDef.voice.
//   - the server-room hum: pairs of sines 3.3 Hz apart (55/58.3 and
//     110/113.3 Hz) so it beats slowly, with harmonics laptop speakers can
//     play. THE SILENCE fades it out.
//   - `esc`: one-shots for this table's own toys and story beats.
//
// Every call is a no-op until the engine's audio context exists (and in the
// headless checks, where it never does). Muting is the engine's master gain.

import { sound, type Voice } from '../../engine/audio';

const last: Record<string, number> = {};
function throttled(key: string, ms: number) {
  const now = performance.now();
  if (last[key] && now - last[key] < ms) return true;
  last[key] = now;
  return false;
}

// ---------------- the hum ----------------
let hum: { gain: GainNode; level: number } | null = null;

function ensureHum() {
  const ctx = sound.ctx;
  const master = sound.master;
  if (!ctx || !master) return null;
  if (hum) return hum;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  // [frequency, relative level]: each pair beats at 3.3 Hz; 110 Hz and up carry it on laptop speakers
  for (const [f, g] of [[55, 0.6], [58.3, 0.5], [110, 1], [113.3, 0.8], [220, 0.3], [330, 0.12]] as const) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.value = g;
    o.connect(og);
    og.connect(gain);
    o.start();
  }
  hum = { gain, level: 0 };
  return hum;
}

/**
 * Set the hum level (0 = off). Called every frame by the scene; it only
 * touches the audio graph when the level changes. `fade` is the time
 * constant in seconds (the Silence fades out slowly).
 */
export function setHum(level: number, fade = 0.3) {
  const h = level > 0 ? ensureHum() : hum;
  if (!h || !sound.ctx || Math.abs(h.level - level) < 0.001) return;
  h.level = level;
  h.gain.gain.setTargetAtTime(level, sound.ctx.currentTime, fade);
}

// ---------------- creature voices ----------------
/**
 * One vocal syllable: an oscillator sliding from `f0` to `f1`, shaped by a
 * band-pass "mouth" at `formant` Hz (that's what makes a quack nasal and a
 * bark gruff), with a fast attack and a short tail. `tremolo` (Hz) adds a
 * growl's flutter. Plays on the engine's master gain, so mute applies.
 */
function syllable(o: {
  f0: number; f1: number; dur: number; gain: number; formant: number; q?: number;
  type?: OscillatorType; delay?: number; tremolo?: number;
}) {
  const ctx = sound.ctx;
  const master = sound.master;
  if (!ctx || !master || !sound.enabled) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sawtooth';
  osc.frequency.setValueAtTime(o.f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t0 + o.dur);
  const mouth = ctx.createBiquadFilter();
  mouth.type = 'bandpass';
  mouth.frequency.value = o.formant;
  mouth.Q.value = o.q ?? 3;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.012);
  env.gain.setValueAtTime(o.gain, t0 + o.dur * 0.55);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(mouth);
  mouth.connect(env);
  let lfo: OscillatorNode | null = null;
  if (o.tremolo) {
    const trem = ctx.createGain();
    trem.gain.value = 0.55;
    lfo = ctx.createOscillator();
    lfo.frequency.value = o.tremolo;
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth);
    depth.connect(trem.gain);
    env.connect(trem);
    trem.connect(master);
    lfo.start(t0);
    lfo.stop(t0 + o.dur + 0.05);
  } else {
    env.connect(master);
  }
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

// ---------------- the table's voice (replaces the engine's defaults) ----------------
const t = (f: number, d: number, type: OscillatorType, g: number, slide?: number, delay = 0) => sound.tone(f, d, type, g, slide, delay);
const n = (d: number, f: number, g: number, type: BiquadFilterType = 'lowpass', delay = 0) => sound.noise(d, f, g, type, delay);

export const voice: Voice = {
  /** Flippers: a relay clack, no tone. */
  flipperUp() { if (throttled('fup', 40)) return; n(0.04, 2200, 0.2, 'highpass'); t(95, 0.05, 'square', 0.06, 60); },
  flipperDown() { if (throttled('fdn', 60)) return; n(0.035, 900, 0.09); },
  /** Generic bumper (the racks use esc.rack for their own voices). */
  bumper(combo = 0) { esc.rack('rack2', combo); },
  /** Slingshots: a rack-mount latch. */
  sling() { if (throttled('sling', 60)) return; n(0.06, 1100, 0.28); t(130, 0.07, 'square', 0.09, 65); },
  /** Posts: a key tap. */
  post() { if (throttled('post', 70)) return; n(0.025, 3600, 0.12, 'highpass'); t(520, 0.03, 'triangle', 0.06); },
  /** The server blades: a metal blade sliding home. */
  target() { if (throttled('tgt', 60)) return; t(540, 0.07, 'triangle', 0.1, 420); t(810, 0.06, 'triangle', 0.06, 640, 0.02); n(0.05, 2000, 0.14, 'bandpass'); },
  /** D·N·S lanes: a network ping. */
  lane() { t(1480, 0.3, 'sine', 0.14); t(1480, 0.18, 'sine', 0.05, undefined, 0.16); },
  inlane() { n(0.03, 3000, 0.1, 'highpass'); t(740, 0.05, 'sine', 0.06); },
  /** The ticket queue: a hard drive seeking. */
  spinner() { if (throttled('spin', 90)) return; n(0.04, 2600, 0.12, 'bandpass'); t(260, 0.04, 'square', 0.03, 180); },
  orbit() { t(300, 0.2, 'sawtooth', 0.06, 900); },
  /** Saucers (printer, Core): paper drawn in. */
  scoop() { n(0.22, 700, 0.18, 'bandpass'); t(200, 0.2, 'sine', 0.18, 95); },
  /** Saucer kick-out: the feed motor. */
  eject() { n(0.1, 900, 0.22, 'bandpass'); t(150, 0.12, 'square', 0.1, 320); },
  /** Plunger release: a fan spinning up. */
  launch(power = 0.6) { n(0.25, 500 + power * 900, 0.22, 'bandpass'); t(70, 0.3, 'sawtooth', 0.12, 160 + power * 260); },
  /** Drain: a power supply giving out. */
  drain() { t(330, 0.5, 'sine', 0.16, 55); n(0.3, 300, 0.12, 'lowpass', 0.1); },
  nudge() { n(0.1, 260, 0.35); },
  /** Tilt: the error buzzer. */
  tilt() { for (let i = 0; i < 3; i++) t(98, 0.2, 'square', 0.14, undefined, i * 0.26); },
  warn() { t(196, 0.14, 'square', 0.1); },
  /** Jackpot: a terminal success chime (no hiss tail). */
  jackpot() { [392, 494, 587, 784, 988].forEach((f, i) => t(f, 0.22, 'triangle', 0.13, undefined, i * 0.075)); t(1568, 0.5, 'sine', 0.05, undefined, 0.4); },
  skillshot() { [784, 988, 1175, 1568].forEach((f, i) => t(f, 0.16, 'sine', 0.14, undefined, i * 0.07)); },
  /** Multiball: a two-tone incident alarm, three times. */
  multiball() { for (let i = 0; i < 6; i++) t(i % 2 ? 880 : 660, 0.14, 'triangle', 0.12, undefined, i * 0.15); },
  /** Game start: a server's POST beep and a boot chord. */
  start() { t(1000, 0.08, 'square', 0.06); [262, 330, 392].forEach((f) => t(f, 0.7, 'sine', 0.09, undefined, 0.2)); },
  /** Game over: everything spins down. */
  gameOver() { [523, 392, 311, 262].forEach((f, i) => t(f, 0.3, 'sine', 0.13, undefined, i * 0.18)); t(300, 1.2, 'sine', 0.08, 40, 0.7); },
  extraBall() { [880, 1175, 1568].forEach((f, i) => t(f, 0.16, 'sine', 0.14, undefined, i * 0.08)); },
  /** Bonus count: keyboard ticks. */
  bonusTick() { n(0.02, 4200, 0.08, 'highpass'); },
  plungerTick(p = 0) { if (throttled('ptick', 90)) return; t(110 + p * 220, 0.06, 'sine', 0.07); },
  /** The cable run: a cable zipping through a tray. */
  ramp() { t(240, 0.32, 'sawtooth', 0.07, 900); n(0.3, 2600, 0.12, 'bandpass'); },
  tunnel() { t(90, 0.35, 'sine', 0.2, 40); },
};

/** How this table's rolling-ball noise sounds: quieter and lower than the default hiss. */
export const roll = { max: 0.05, freq: 380 };

// ---------------- one-shots ----------------
export const esc = {
  /**
   * The three middle bumpers, each in its own voice over a common thump:
   * the printer a burst of dot-matrix, the teapot a china clink, the
   * undead host a drive seek and a short groan.
   */
  rack(id: string, combo = 0) {
    if (throttled(`rack:${id}`, 45)) return;
    const lift = 1 + Math.min(combo, 10) * 0.03;
    t(150, 0.1, 'sine', 0.32, 60);
    n(0.05, 500, 0.18);
    if (id === 'rack0') {
      for (let i = 0; i < 4; i++) t((i % 2 ? 1180 : 940) * lift, 0.022, 'square', 0.05, undefined, 0.02 + i * 0.035);
    } else if (id === 'rack1') {
      t(2093 * lift, 0.35, 'sine', 0.1);
      t(3140 * lift, 0.2, 'sine', 0.04);
    } else {
      n(0.03, 3000, 0.14, 'bandpass', 0.01);
      t(170 * lift, 0.22, 'triangle', 0.08, 120, 0.04);
    }
  },
  /** Terminal typing: a short run of key clicks. */
  type(keys = 8) {
    if (throttled('type', 300)) return;
    for (let i = 0; i < keys; i++) {
      const d = i * (0.045 + Math.random() * 0.035);
      sound.noise(0.018, 4200 + Math.random() * 1800, 0.07, 'highpass', d);
      sound.tone(1900 + Math.random() * 500, 0.012, 'square', 0.015, undefined, d);
    }
  },
  /** The printer: dot-matrix chatter and a paper feed. */
  printer() {
    if (throttled('printer', 400)) return;
    for (let i = 0; i < 14; i++) {
      sound.tone(i % 2 ? 1180 : 940, 0.025, 'square', 0.035, undefined, i * 0.04);
    }
    sound.noise(0.5, 900, 0.08, 'bandpass', 0.05);
    sound.tone(140, 0.25, 'sawtooth', 0.04, 110, 0.55);
  },
  /** The Min Pin: "ruff-ruff" (a happy two-note yip once it's friend-shaped). */
  bark(friend = false, delay = 0) {
    if (throttled('bark', 350)) return;
    if (friend) {
      syllable({ f0: 620, f1: 980, dur: 0.12, gain: 0.5, formant: 1400, q: 2, delay });
      syllable({ f0: 700, f1: 1150, dur: 0.14, gain: 0.5, formant: 1500, q: 2, delay: delay + 0.17 });
      return;
    }
    for (const d of [0, 0.24]) {
      syllable({ f0: 520, f1: 240, dur: 0.17, gain: 0.6, formant: 950, q: 2.2, delay: delay + d });
      sound.noise(0.07, 1300, 0.22, 'bandpass', delay + d);
    }
  },
  /** The Min Pin before it trusts you: a rolling growl, pitched where laptop speakers can play it. */
  growl() {
    if (throttled('growl', 900)) return;
    syllable({ f0: 175, f1: 150, dur: 0.6, gain: 0.55, formant: 520, q: 1.6, tremolo: 26 });
  },
  /** The rubber duck: "quack-quack", nasal and a little indignant. */
  quack() {
    if (throttled('quack', 400)) return;
    for (const d of [0, 0.26]) {
      syllable({ f0: 330, f1: 250, dur: 0.2, gain: 0.55, formant: 1150, q: 5, delay: d });
      syllable({ f0: 660, f1: 500, dur: 0.18, gain: 0.18, formant: 2300, q: 6, type: 'square', delay: d });
    }
  },
  /** The pager: beep-beep. */
  pager() {
    if (throttled('pager', 200)) return;
    sound.tone(2350, 0.07, 'square', 0.06);
    sound.tone(2350, 0.07, 'square', 0.06, undefined, 0.11);
  },
  /** The legacy system: a slow mechanical creak. */
  creak() {
    if (throttled('creak', 250)) return;
    sound.tone(210, 0.28, 'sawtooth', 0.07, 160);
    sound.noise(0.2, 500, 0.08, 'bandpass', 0.03);
  },
  /** The zombie process: a groan. */
  groan() {
    if (throttled('groan', 300)) return;
    sound.tone(130, 0.45, 'triangle', 0.13, 85);
    sound.tone(196, 0.4, 'sine', 0.05, 120);
  },
  /** The tech debt: a heavy clunk. */
  clunk() {
    if (throttled('clunk', 150)) return;
    sound.tone(80, 0.2, 'square', 0.14, 50);
    sound.noise(0.12, 700, 0.14);
  },
  /** The undead server spins back up: fans, then a rising drive whine. */
  rise() {
    sound.noise(1.0, 600, 0.1, 'bandpass');
    sound.tone(80, 1.0, 'sawtooth', 0.05, 260);
  },
  /** An unlock arpeggio (restored ticket, the Core lit, the lanyard). */
  unlock() {
    [523, 659, 784, 1046].forEach((f, i) => sound.tone(f, 0.22, 'triangle', 0.12, undefined, i * 0.08));
  },
  /** Act II: E.S.C.A.L.A.T.E. notices you. A few glitch blips and a low sweep. */
  glitch() {
    for (let i = 0; i < 6; i++) {
      sound.tone(300 + Math.random() * 1600, 0.03, 'square', 0.05, undefined, i * 0.06 + Math.random() * 0.03);
    }
    sound.tone(220, 0.9, 'sawtooth', 0.07, 55, 0.2);
  },
  /** REMOVE FROM PRODUCTION: everything spins down. */
  powerdown() {
    sound.tone(440, 1.6, 'sine', 0.18, 35);
    sound.tone(660, 1.2, 'triangle', 0.06, 40);
    sound.noise(1.4, 400, 0.14, 'lowpass', 0.05);
  },
};
