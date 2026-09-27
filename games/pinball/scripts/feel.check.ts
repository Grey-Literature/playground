// Feel signature per theme × tier — the numbers behind "the ball has weight".
// Dead Star Disco is the reference envelope; later themes must sit inside it.
//
//   flipExit  ball speed right off a cradled left-flipper shot
//   apex      highest y that shot reaches (how far up the table a flip carries)
//   bumpExit  ball speed right after a pop-bumper kick
//   life      median seconds a launched ball survives with a naive auto-flipper
//   mid/off/out  drain mix: straight down the middle (between resting tips) /
//             rolled off a flipper (tip..pivot) / outlane (outside the pivots)
//   p95/max   95th-percentile speed as a fraction of the tier's speed cap
//   unwedge   un-wedge safety-net firings per ball-minute (should stay ~0)
//
// Plus a timestep-parity section: legacy render-delta stepping vs the fixed
// stepper at 30/60/144 Hz. Gates: fixed stepping must give identical results at
// every refresh rate, and no ball may tunnel through a post.

import {
  TABLES, DIFF_ORDER, DIFF, STEP, TABLE, ACTIVE, gameRef, useTable, resetField, mkBall, step,
  reseed, rnd, pad, stepPhysics, BALL_RADIUS, type BallState, type TableEntry,
} from './harness';
import { FixedStepper } from '../src/engine/timestep';

function flipperSetup(frac = 0.65) {
  const F = TABLE.flippers;
  const s = F.left;
  const t = frac * F.len;
  const bx = s.pivot.x + Math.cos(s.rest) * t;
  const by = s.pivot.y + Math.sin(s.rest) * t;
  // sit the ball on top of the bat (normal pointing up the table)
  const nx = -Math.sin(s.rest), ny = Math.cos(s.rest);
  const d = BALL_RADIUS + F.r + 0.02;
  return { x: bx + nx * d, y: by + ny * d };
}

/** Cradled left-flipper shot: exit speed and apex. `advance` abstracts the stepping scheme. */
function flipShot(advance: () => void, seconds = 3, frac = 0.65) {
  resetField();
  const p = flipperSetup(frac);
  const b = mkBall(p.x, p.y, 0, 0, 0);
  gameRef.balls.push(b);
  gameRef.left.pressed = true;
  let exit = 0, angle = 0, apex = -Infinity, t = 0;
  while (t < seconds && b.active) {
    const before = gameRef.time;
    advance();
    t += gameRef.time - before;
    // speed + heading once the swing has finished and the per-tier cap has been applied
    if (exit === 0 && t >= 0.1) { exit = Math.hypot(b.vx, b.vy); angle = Math.atan2(b.vy, b.vx) * 180 / Math.PI; }
    if (!b.ride && b.captured <= 0) apex = Math.max(apex, b.y);
  }
  gameRef.left.pressed = false;
  return { exit, angle, apex };
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

/** Shots from 13 cradle points along the bat (30%..90% of its length). */
function flipSpread(makeAdvance: () => () => void) {
  const exits: number[] = [], angles: number[] = [], apexes: number[] = [];
  for (let i = 0; i <= 12; i++) {
    reseed(9 + i);
    const r = flipShot(makeAdvance(), 3, 0.3 + i * 0.05);
    exits.push(r.exit); angles.push(r.angle); apexes.push(r.apex);
  }
  const minE = Math.min(...exits);
  return { exit: median(exits), minExit: minE, angle: median(angles), apex: median(apexes) };
}

function bumperExit() {
  const bumper = ACTIVE.bumpers[0];
  if (!bumper) return NaN;
  resetField();
  const b = mkBall(bumper.x, bumper.y - bumper.r - BALL_RADIUS - 4, 0, 60, 0);
  gameRef.balls.push(b);
  for (let s = 0; s < 240; s++) {
    const ev = step();
    if (ev.some((e) => e.type === 'bumper')) { step(2); return Math.hypot(b.vx, b.vy); }
  }
  return NaN;
}

/**
 * Naive auto-flipper: tap (0.12 s) when a ball is over a flipper and not
 * climbing, then rest 0.3 s. Tapping rather than holding means it never
 * cradles, so the soak measures drains instead of a ball parked on a bat.
 */
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

function playSoak(n = 120, cap = 45) {
  const lives: number[] = [];
  const speeds: number[] = [];
  let mid = 0, off = 0, out = 0, secs = 0;
  gameRef.unwedgeCount = 0;
  const F = TABLE.flippers;
  const midX = (F.left.pivot.x + F.right.pivot.x) / 2;
  const pivotHalf = Math.abs(F.right.pivot.x - F.left.pivot.x) / 2;
  const tipHalf = Math.abs(F.right.pivot.x + Math.cos(F.right.rest) * F.len - midX);
  const P = TABLE.plunger;
  for (let i = 0; i < n; i++) {
    resetField();
    const power = 0.25 + rnd() * 0.75;
    const b = mkBall(P.x, P.restY, 0, (P.launchBase + power * P.launchRange) * DIFF.launch, 0);
    b.inLane = true;
    gameRef.balls.push(b);
    let t = 0;
    let lastX = b.x;
    while (t < cap && b.active) {
      autoFlip(gameRef.balls);
      lastX = b.x;
      step();
      t += STEP;
      if (!b.ride && b.captured <= 0 && !b.inLane) speeds.push(Math.hypot(b.vx, b.vy));
    }
    lives.push(t);
    secs += t;
    if (!b.active) {
      const dx = Math.abs(lastX - midX);
      if (dx < tipHalf) mid++; else if (dx < pivotHalf) off++; else out++;
    }
  }
  lives.sort((a, b) => a - b);
  speeds.sort((a, b) => a - b);
  const drains = Math.max(1, mid + off + out);
  return {
    life: lives[Math.floor(lives.length / 2)],
    mix: `${Math.round(mid / drains * 100)}/${Math.round(off / drains * 100)}/${Math.round(out / drains * 100)}`,
    avg: speeds.reduce((a, v) => a + v, 0) / Math.max(1, speeds.length),
    p95: speeds[Math.floor(speeds.length * 0.95)] / DIFF.maxSpeed,
    unwedge: gameRef.unwedgeCount / (secs / 60),
  };
}

function signature(entry: TableEntry) {
  console.log(`\n[${entry.id}] feel signature (auto-flipper soak: 120 balls × ≤45 s per tier)`);
  console.log('  tier        flipExit(min)  apex  bumpExit   life  mid/off/out%   avg  p95/max  unwedge/min');
  for (const id of DIFF_ORDER) {
    useTable(entry, id);
    reseed(4242);
    const f = flipSpread(() => () => step());
    const bump = bumperExit();
    const s = playSoak();
    console.log(
      `  ${DIFF.label.padEnd(11)} ${pad(`${f.exit.toFixed(0)} (${f.minExit.toFixed(0)})`, 13)} ${pad(f.apex.toFixed(0), 5)} ${pad(bump.toFixed(0), 9)}` +
      ` ${pad(s.life.toFixed(1) + 's', 6)} ${pad(s.mix, 12)}` +
      ` ${pad(s.avg.toFixed(0), 6)} ${pad(s.p95.toFixed(2), 8)} ${pad(s.unwedge.toFixed(2), 12)}`,
    );
  }
}

// ---------- timestep parity ----------
function parity(entry: TableEntry) {
  useTable(entry, 'medium');
  let bad = 0;
  console.log(`\n[${entry.id}] timestep parity (medium flips, impossible-speed tunnelling)`);
  const rates = [30, 60, 120, 144];
  const legacy: string[] = [], fixed: string[] = [];
  const fixedExit: number[] = [];
  for (const hz of rates) {
    const l = flipSpread(() => () => { stepPhysics(1 / hz); });
    legacy.push(`${hz}Hz ${l.exit.toFixed(0)}@${l.angle.toFixed(0)}° (min ${l.minExit.toFixed(0)})`);
    const f = flipSpread(() => { const st = new FixedStepper(); return () => { st.advance(1 / hz); }; });
    fixed.push(`${hz}Hz ${f.exit.toFixed(0)}@${f.angle.toFixed(0)}° (min ${f.minExit.toFixed(0)})`);
    fixedExit.push(f.exit);
  }
  const spread = Math.max(...fixedExit) - Math.min(...fixedExit);
  console.log('  flip shots, median exit speed@heading (weakest) over 13 cradle points:');
  console.log(`    legacy render-delta : ${legacy.join('  ')}`);
  console.log(`    fixed 1/120 stepper : ${fixed.join('  ')}   spread=${spread.toFixed(1)}`);
  if (spread > 2) { bad++; console.log('  <-- FIXED STEP IS NOT FRAME-RATE INDEPENDENT'); }

  // max-speed shots at a rubber post from random offsets: did any pass straight through?
  const post = entry.table.circles.find((c) => c.kind === 'post' && !c.minTier);
  // tunnelling is worst at the top tier's speed cap
  useTable(entry, 'impossible');
  if (post) {
    const tunnels = (advance: () => void) => {
      let through = 0;
      reseed(3);
      for (let i = 0; i < 200; i++) {
        resetField();
        const off = (rnd() - 0.5) * 2 * (post.r + BALL_RADIUS) * 0.95;
        const b = mkBall(post.x + off, post.y - 12, 0, DIFF.maxSpeed, 0);
        gameRef.balls.push(b);
        for (let s = 0; s < 40 && b.active; s++) {
          advance();
          if (b.y > post.y + 6) break;
        }
        // a real contact deflects the ball; a tunnel leaves it heading straight up past the post
        if (b.y > post.y && Math.abs(b.vx) < 1e-6 && b.vy > DIFF.maxSpeed * 0.8) through++;
      }
      return through;
    };
    // posts only — hide everything else so the ball has a clean run at it
    // physics iterates the per-layer view, so swap the field layer's set
    const savedField = ACTIVE.byLayer.field;
    ACTIVE.byLayer.field = { walls: [], bumpers: [], posts: [post], kickers: [], targets: [], drops: [], sensors: [], rides: [], captures: [], kinematics: [], circles: [post] };
    const savedGrav = DIFF.grav;
    DIFF.grav = 0;
    const row: string[] = [];
    for (const hz of rates) {
      const legacyN = tunnels(() => { stepPhysics(1 / hz); });
      const stepper = new FixedStepper();
      const fixedN = tunnels(() => { stepper.advance(1 / hz); });
      if (fixedN) bad++;
      row.push(`${hz}Hz legacy ${legacyN} / fixed ${fixedN}`);
    }
    DIFF.grav = savedGrav;
    ACTIVE.byLayer.field = savedField;
    console.log(`  post tunnel-through at ${DIFF.maxSpeed} u/s (of 200 shots): ${row.join('   ')}`);
  }
  return bad;
}

let bad = 0;
// fixtures are engine test tables — Dead Star Disco et al. define the feel envelope
for (const entry of TABLES.filter((t) => !t.fixture)) {
  signature(entry);
  bad += parity(entry);
}
if (bad) process.exitCode = 1;
