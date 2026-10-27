// Minimal procedural horror audio via WebAudio. No assets required.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let humGain: GainNode | null = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Server-room hum: two detuned low oscillators
    humGain = ctx.createGain();
    humGain.gain.value = 0.05;
    humGain.connect(master);
    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.value = 55;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 160;
    o1.connect(f);
    f.connect(humGain);
    o1.start();
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 58.3;
    o2.connect(humGain);
    o2.start();
  } catch {
    ctx = null;
  }
}

function env(dur: number, peak = 0.3): GainNode | null {
  if (!ctx || !master) return null;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  g.connect(master);
  return g;
}

export function sfxBlip() {
  if (!ctx) return;
  const g = env(0.08, 0.12);
  if (!g) return;
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.value = 820;
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + 0.09);
}

export function sfxConfirm() {
  if (!ctx) return;
  const g = env(0.25, 0.14);
  if (!g) return;
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(440, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + 0.26);
}

export function sfxDeny() {
  if (!ctx) return;
  const g = env(0.4, 0.2);
  if (!g) return;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(220, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.35);
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + 0.42);
}

export function sfxScare() {
  if (!ctx || !master) return;
  const dur = 0.6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = env(dur, 0.4);
  if (!g) return;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(3000, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + dur);
  src.connect(f);
  f.connect(g);
  src.start();
}

export function sfxBark() {
  if (!ctx) return;
  const g = env(0.14, 0.25);
  if (!g) return;
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(300, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + 0.15);
}

export function sfxUnlock() {
  if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => {
    const g = env(0.3, 0.1);
    if (!g || !ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    o.connect(g);
    o.start(ctx.currentTime + i * 0.09);
    o.stop(ctx.currentTime + i * 0.09 + 0.3);
  });
}

export function sfxPowerDown() {
  if (!ctx) return;
  const g = env(2.4, 0.3);
  if (!g) return;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(110, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(16, ctx.currentTime + 2.2);
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + 2.4);
  // kill the hum
  if (humGain && ctx)
    humGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
}

export function restoreHum() {
  if (humGain && ctx) humGain.gain.setValueAtTime(0.05, ctx.currentTime);
}
