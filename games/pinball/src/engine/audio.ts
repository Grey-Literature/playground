// Synthesized pinball sounds via WebAudio — no external assets needed.
class SoundManager {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  rollGain: GainNode | null = null;
  rollSrc: AudioBufferSourceNode | null = null;
  enabled = true;
  lastPlay: Record<string, number> = {};

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      // rolling loop: filtered noise
      const len = this.ctx.sampleRate * 1;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.rollSrc = this.ctx.createBufferSource();
      this.rollSrc.buffer = buf;
      this.rollSrc.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 900;
      filt.Q.value = 0.8;
      this.rollGain = this.ctx.createGain();
      this.rollGain.gain.value = 0;
      this.rollSrc.connect(filt);
      filt.connect(this.rollGain);
      this.rollGain.connect(this.master);
      this.rollSrc.start();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.02);
    }
  }

  setRoll(intensity: number) {
    if (!this.ctx || !this.rollGain) return;
    const g = Math.min(0.16, intensity * 0.16);
    this.rollGain.gain.setTargetAtTime(this.enabled ? g : 0, this.ctx.currentTime, 0.08);
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (this.lastPlay[key] && now - this.lastPlay[key] < ms) return true;
    this.lastPlay[key] = now;
    return false;
  }

  tone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.2, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur: number, freq: number, gain = 0.25, type: BiquadFilterType = 'lowpass', delay = 0) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  flipperUp() {
    if (this.throttle('fup', 40)) return;
    this.noise(0.05, 2800, 0.28, 'highpass');
    this.tone(220, 0.05, 'square', 0.08, 140);
  }
  flipperDown() {
    if (this.throttle('fdn', 60)) return;
    this.noise(0.04, 1400, 0.12, 'lowpass');
  }
  bumper(combo = 0) {
    if (this.throttle('bump', 45)) return;
    const base = 320 + Math.min(combo, 12) * 45;
    this.noise(0.08, 500, 0.5);
    this.tone(160, 0.09, 'sine', 0.5, 70);
    this.tone(base, 0.11, 'square', 0.14);
    this.tone(base * 1.5, 0.09, 'square', 0.08, undefined, 0.03);
  }
  sling() {
    if (this.throttle('sling', 60)) return;
    this.noise(0.07, 900, 0.4);
    this.tone(200, 0.08, 'sawtooth', 0.16, 90);
  }
  post() {
    if (this.throttle('post', 70)) return;
    this.tone(950, 0.05, 'triangle', 0.16, 620);
    this.noise(0.03, 3200, 0.1, 'highpass');
  }
  target() {
    if (this.throttle('tgt', 60)) return;
    this.tone(740, 0.08, 'square', 0.16);
    this.tone(1108, 0.1, 'square', 0.12, undefined, 0.05);
    this.noise(0.05, 2400, 0.2, 'bandpass');
  }
  lane() {
    this.tone(880, 0.09, 'sine', 0.22);
    this.tone(1320, 0.12, 'sine', 0.16, undefined, 0.06);
  }
  inlane() {
    this.tone(660, 0.08, 'triangle', 0.18);
  }
  spinner() {
    if (this.throttle('spin', 90)) return;
    this.tone(420, 0.06, 'sawtooth', 0.1, 900);
    this.noise(0.05, 4000, 0.12, 'highpass');
  }
  orbit() {
    this.tone(520, 0.12, 'sawtooth', 0.12, 1040);
    this.tone(1040, 0.16, 'sine', 0.14, undefined, 0.08);
  }
  scoop() {
    this.tone(300, 0.18, 'sine', 0.3, 120);
    this.noise(0.15, 600, 0.25);
  }
  eject() {
    this.noise(0.09, 1200, 0.35);
    this.tone(180, 0.12, 'square', 0.2, 520);
  }
  launch(power: number) {
    this.noise(0.18, 700 + power * 1800, 0.4);
    this.tone(120, 0.22, 'sawtooth', 0.22, 300 + power * 500);
  }
  drain() {
    this.tone(400, 0.3, 'sawtooth', 0.18, 80);
    this.tone(200, 0.4, 'square', 0.1, 60, 0.1);
    this.noise(0.25, 500, 0.2, 'lowpass', 0.05);
  }
  nudge() {
    this.noise(0.12, 300, 0.5);
  }
  tilt() {
    for (let i = 0; i < 4; i++) this.tone(180, 0.18, 'square', 0.22, undefined, i * 0.16);
  }
  warn() {
    this.tone(440, 0.1, 'square', 0.18);
  }
  jackpot() {
    const seq = [523, 659, 784, 1046, 784, 1046, 1318];
    seq.forEach((f, i) => this.tone(f, 0.16, 'square', 0.16, undefined, i * 0.09));
    this.noise(0.4, 6000, 0.08, 'highpass');
  }
  skillshot() {
    const seq = [880, 1108, 1318, 1760];
    seq.forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.2, undefined, i * 0.08));
  }
  multiball() {
    const seq = [392, 523, 659, 784, 1046];
    seq.forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.14, undefined, i * 0.11));
  }
  start() {
    const seq = [262, 392, 523, 784];
    seq.forEach((f, i) => this.tone(f, 0.15, 'square', 0.16, undefined, i * 0.1));
  }
  gameOver() {
    const seq = [523, 440, 349, 262, 196];
    seq.forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, undefined, i * 0.16));
  }
  extraBall() {
    const seq = [659, 784, 988, 1318, 1568];
    seq.forEach((f, i) => this.tone(f, 0.14, 'sine', 0.2, undefined, i * 0.08));
  }
  bonusTick() {
    this.tone(1200, 0.04, 'square', 0.08);
  }
  plungerTick(p: number) {
    if (this.throttle('ptick', 90)) return;
    this.tone(200 + p * 600, 0.05, 'sine', 0.1);
  }
  ramp() {
    this.tone(180, 0.28, 'sawtooth', 0.18, 720);
    this.tone(360, 0.32, 'square', 0.1, 1100, 0.08);
    this.noise(0.22, 1800, 0.22, 'bandpass');
  }
  tunnel() {
    this.tone(90, 0.35, 'sine', 0.28, 40);
    this.tone(240, 0.4, 'sawtooth', 0.12, 80, 0.05);
    this.noise(0.3, 400, 0.3, 'lowpass');
    this.tone(880, 0.12, 'triangle', 0.14, undefined, 0.28);
  }
}

export const sound = new SoundManager();
