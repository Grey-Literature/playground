// The Last Escalation — theme sounds, synthesized on the engine's WebAudio
// helpers (no assets). The server-room hum is a pair of low sines 3.3 Hz
// apart (55 and 58.3 Hz) so it beats slowly, plus quiet harmonics that small
// speakers can actually play. THE SILENCE fades it out.
//
// Every call is a no-op until the engine's audio context exists (and in the
// headless checks, where it never does). Muting is the engine's master gain.

import { sound } from '../../engine/audio';

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
  // [frequency, relative level]: the 55/58.3 pair beats; the harmonics carry it on laptop speakers
  for (const [f, g] of [[55, 1], [58.3, 0.8], [110, 0.35], [165, 0.12], [220, 0.06]] as const) {
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

// ---------------- one-shots ----------------
export const esc = {
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
  /** The Min Pin: two sharp barks (a happy yip once it's friend-shaped). */
  bark(friend = false) {
    if (throttled('bark', 180)) return;
    if (friend) {
      sound.tone(700, 0.08, 'sawtooth', 0.12, 1100);
      sound.tone(800, 0.08, 'sawtooth', 0.12, 1300, 0.11);
      return;
    }
    sound.tone(620, 0.09, 'sawtooth', 0.14, 300);
    sound.noise(0.06, 1400, 0.1, 'bandpass');
    sound.tone(560, 0.09, 'sawtooth', 0.12, 260, 0.13);
  },
  /** The Min Pin before it trusts you: a low growl. */
  growl() {
    if (throttled('growl', 600)) return;
    sound.tone(95, 0.55, 'sawtooth', 0.09, 80);
    sound.noise(0.55, 300, 0.12, 'lowpass');
  },
  /** The rubber duck. */
  quack() {
    if (throttled('quack', 150)) return;
    sound.tone(330, 0.12, 'square', 0.1, 230);
    sound.noise(0.1, 1100, 0.07, 'bandpass');
    sound.tone(310, 0.1, 'square', 0.08, 220, 0.14);
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
