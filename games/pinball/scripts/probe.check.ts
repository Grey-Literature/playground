// THROWAWAY PROBE (not committed): where does a soak ball spend its life, per table × tier?
import { TABLES, DIFF_ORDER, DIFF, STEP, TABLE, gameRef, useTable, resetField, mkBall, step, reseed, rnd, type BallState } from './harness';

const flipTimer = { left: 0, right: 0 };
function autoFlip(balls: BallState[]) {
  const F = TABLE.flippers;
  for (const side of ['left', 'right'] as const) {
    const s = F[side];
    const st = side === 'left' ? gameRef.left : gameRef.right;
    flipTimer[side] -= STEP;
    if (flipTimer[side] > 0.3) { st.pressed = true; continue; }
    st.pressed = false;
    if (flipTimer[side] > 0) continue;
    const hit = balls.some((b) => b.active && !b.ride && b.captured <= 0
      && b.y < s.pivot.y + 6 && b.y > s.pivot.y - 2
      && Math.abs(b.x - s.pivot.x) < F.len + 1
      && (side === 'left' ? b.x < 0 : b.x > 0)
      && b.vy < 10);
    if (hit) { flipTimer[side] = 0.42; st.pressed = true; }
  }
}


import { ACTIVE } from './harness';
type Variant = { name: string; tier: import('../src/engine/types').DiffId; apply?: () => void };
function soak(entryId: string, v: Variant, seed = 4242, n = 120) {
  const entry = TABLES.find((x) => x.id === entryId)!;
  useTable(entry, v.tier);
  v.apply?.();
  reseed(seed);
  const P = TABLE.plunger;
  let survive = 0, low = 0, total = 0, blasts = 0;
  const lives: number[] = [];
  for (let i = 0; i < n; i++) {
    resetField();
    const power = 0.25 + rnd() * 0.75;
    const b = mkBall(P.x, P.restY, 0, (P.launchBase + power * P.launchRange) * DIFF.launch, 0);
    b.inLane = true;
    gameRef.balls.push(b);
    let t = 0;
    while (t < 45 && b.active) {
      autoFlip(gameRef.balls);
      const ev = step();
      for (const e of ev) if (e.type === 'sensor' && (e as { kind?: string }).kind === 'vent') blasts++;
      t += STEP; total++;
      if (!b.ride && !b.layer && b.y < TABLE.flippers.left.pivot.y + 12) low++;
    }
    if (t >= 45) survive++;
    lives.push(t);
  }
  lives.sort((a, b) => a - b);
  const mean = lives.reduce((a, x) => a + x, 0) / n;
  console.log(`  ${entryId.padEnd(15)} ${v.tier.padEnd(10)} ${v.name.padEnd(34)} seed ${seed} survive ${(survive / n * 100).toFixed(0).padStart(3)}%  mean ${mean.toFixed(1).padStart(5)}s  median ${lives[Math.floor(n / 2)].toFixed(1).padStart(5)}s  low-zone ${Math.round(low / total * 100)}%  blasts ${blasts}`);
}
const dropKin = (...ids: string[]) => () => {
  ACTIVE.kinematics = ACTIVE.kinematics.filter((k) => !ids.includes(k.id));
  for (const L of Object.values(ACTIVE.byLayer)) L.kinematics = L.kinematics.filter((k) => !ids.includes(k.id));
};
const dropSensors = (...ids: string[]) => () => {
  ACTIVE.sensors = ACTIVE.sensors.filter((k) => !ids.includes(k.id));
  for (const L of Object.values(ACTIVE.byLayer)) L.sensors = L.sensors.filter((k) => !ids.includes(k.id));
};
const ventBlast = (fn: (side: number) => { speed: number; angle: number; spread: number; cooldown: number }) => () => {
  for (const sn of ACTIVE.sensors) if (sn.blast) sn.blast = fn(sn.x < 0 ? -1 : 1);
};
const saved = TABLE; // (vents are mutated in place; restore by re-running useTable is not enough, so we save the originals)
const sal = TABLES.find((x) => x.id === 'salamander')!;
useTable(sal, 'impossible');
const origBlast = ACTIVE.sensors.filter((s) => s.blast).map((s) => ({ s, b: { ...s.blast! } }));
const restore = () => origBlast.forEach(({ s, b }) => { s.blast = { ...b }; });
void saved;

const addVents = (speed: number, cooldown = 1.6) => () => {
  const vents = TABLE.sensors.filter((x) => x.kind === 'vent');
  for (const v of vents) {
    const sd = v.x < 0 ? -1 : 1;
    const copy = { ...v, blast: { speed, angle: Math.PI / 2 - sd * (Math.PI / 2 - 0.35), spread: 0.4, cooldown } };
    ACTIVE.sensors = [...ACTIVE.sensors.filter((x) => x.id !== v.id), copy];
    if (ACTIVE.byLayer.field) ACTIVE.byLayer.field.sensors = [...ACTIVE.byLayer.field.sensors.filter((x) => x.id !== v.id), copy];
  }
};
const moveMoons = (cx: number, cy: number, orbit: number, speed?: number) => () => {
  const fix = (list: typeof ACTIVE.kinematics) => list.map((k) => (k.id.startsWith('moon') ? { ...k, cx, cy, orbit, speed: speed ? { default: speed } : k.speed } : k));
  ACTIVE.kinematics = fix(ACTIVE.kinematics);
  for (const L of Object.values(ACTIVE.byLayer)) L.kinematics = fix(L.kinematics);
};
const dropPost = (id: string) => () => {
  ACTIVE.posts = ACTIVE.posts.filter((k) => k.id !== id);
  ACTIVE.circles = ACTIVE.circles.filter((k) => k.id !== id);
  for (const L of Object.values(ACTIVE.byLayer)) { L.posts = L.posts.filter((k) => k.id !== id); L.circles = L.circles.filter((k) => k.id !== id); }
};
const addPost = (id: string) => () => {
  const c = TABLE.circles.find((x) => x.id === id)!;
  ACTIVE.posts = [...ACTIVE.posts, c]; ACTIVE.circles = [...ACTIVE.circles, c];
  if (ACTIVE.byLayer.field) { ACTIVE.byLayer.field.posts = [...ACTIVE.byLayer.field.posts, c]; ACTIVE.byLayer.field.circles = [...ACTIVE.byLayer.field.circles, c]; }
};
function drainCauses(entryId: string, tier: import('../src/engine/types').DiffId) {
  const entry = TABLES.find((x) => x.id === entryId)!;
  useTable(entry, tier);
  reseed(999);
  const P = TABLE.plunger;
  const causes: Record<string, number> = {};
  let drains = 0;
  const quick: number[] = [];
  for (let i = 0; i < 600; i++) {
    resetField();
    const power = 0.25 + rnd() * 0.75;
    const b = mkBall(P.x, P.restY, 0, (P.launchBase + power * P.launchRange) * DIFF.launch, 0);
    b.inLane = true;
    gameRef.balls.push(b);
    let t = 0;
    const recent: { k: string; t: number }[] = [];
    while (t < 45 && b.active) {
      autoFlip(gameRef.balls);
      const ev = step();
      for (const e of ev) {
        if (e.type === 'drain' || e.type === 'flipper') continue;
        const k = e.type === 'sensor' ? `sensor:${(e as { kind?: string }).kind}` : `${e.type}:${'id' in e ? e.id : ''}`;
        recent.push({ k, t });
      }
      t += STEP;
    }
    if (!b.active) {
      drains++;
      // the last event within 2.5 s before the drain
      const rev = [...recent].reverse().filter((r) => t - r.t < 4);
      const seq = rev.slice(0, 4).map((r) => `${r.k}@${(t - r.t).toFixed(1)}`).reverse();
      const k = seq.length ? seq.join(' > ').replace(/@[0-9.]+/g, '') : '(nothing for 4 s)';
      causes[k] = (causes[k] ?? 0) + 1;
      quick.push(t);
    }
  }
  const top = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `
      ${Math.round(v / drains * 100)}%  ${k}`).join('');
  console.log(`  ${entryId} ${tier.padEnd(10)} drains ${drains}/600 · last thing touched before the drain: ${top}`);
}
const salT = TABLES.find((x) => x.id === 'salamander')!;
useTable(salT, 'medium');
const spire = TABLE.circles.find((x) => x.id === 'spire')!;
const o = { x: spire.x, y: spire.y };
for (const [x, y] of [[-8, -6], [-4, -9.5], [-7.5, -1.5], [-2.5, -7], [5.5, -5]] as const) {
  spire.x = x; spire.y = y;
  for (const tier of ['easy', 'medium', 'hard', 'impossible'] as const) soak('salamander', { name: `spire @(${x},${y})`, tier }, 999, 600);
}
spire.x = o.x; spire.y = o.y;
