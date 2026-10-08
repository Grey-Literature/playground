// Salamander — theme sounds, synthesized on the engine's WebAudio helpers.

import { sound } from '../../engine/audio';

const last: Record<string, number> = {};
function throttled(key: string, ms: number) {
  const now = performance.now();
  if (last[key] && now - last[key] < ms) return true;
  last[key] = now;
  return false;
}

export const fire = {
  /** Struck bell: inharmonic partials with a slow ring-out, pitched per bell. */
  bell(idx: number, combo = 0) {
    if (throttled('bell', 50)) return;
    const f = [523, 659, 784][idx % 3] * (1 + Math.min(combo, 3) * 0.06);
    sound.tone(f, 0.9, 'sine', 0.22);
    sound.tone(f * 2.76, 0.5, 'sine', 0.07);
    sound.tone(f * 5.4, 0.22, 'sine', 0.04);
    sound.noise(0.03, 5000, 0.12, 'highpass');
  },
  /** All three bells: a descending peal and a roar. */
  inferno() {
    [1046, 784, 659, 523, 392].forEach((f, i) => sound.tone(f, 0.7, 'sine', 0.16, undefined, i * 0.1));
    sound.noise(0.9, 380, 0.35, 'lowpass', 0.05);
  },
  /** The Maw (and the salamander): a cat hiss — bandpassed noise with a snap. */
  hiss() {
    if (throttled('hiss', 250)) return;
    sound.noise(0.45, 3600, 0.3, 'bandpass');
    sound.noise(0.25, 6500, 0.16, 'highpass', 0.04);
    sound.tone(140, 0.08, 'sawtooth', 0.12, 70);
  },
  /** Fire whoosh — vents, volcano launches, the skyshot. */
  whoosh(delay = 0) {
    if (throttled('whoosh', 120)) return;
    sound.noise(0.5, 900, 0.35, 'bandpass', delay);
    sound.tone(90, 0.5, 'sawtooth', 0.1, 260, delay);
  },
  /** Sizzle — a ball dropping through the nest's holes. */
  sizzle() {
    if (throttled('sizzle', 120)) return;
    sound.noise(0.35, 7000, 0.18, 'highpass');
    sound.tone(1800, 0.12, 'triangle', 0.05, 900);
  },
  /** Soft thud of a ball landing on the obsidian nest. */
  land() {
    sound.tone(110, 0.14, 'sine', 0.3, 60);
    sound.noise(0.06, 600, 0.2);
  },
};
