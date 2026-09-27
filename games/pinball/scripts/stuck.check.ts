// Ball-wedge soak. For every theme × tier: flood-fill reachable space, drop a
// random-velocity ball at every reachable grid point, and flag any ball that
// stays slow AND travels < 2.4 units over 2.5 s outside a legit rest spot.
// Then: every ride must eject, and no kinematic obstacle may pin a ball.
// Run after ANY geometry/physics/difficulty change. Must report stuck=0.

import {
  TABLES, DIFF_ORDER, DIFF, STEP, TABLE, ACTIVE, gameRef, useTable, setTier, resetField,
  mkBall, step, clearance, legitRest, reachability, gridBounds, reseed, rnd, pad, FIELD, layerIds,
} from './harness';
import { samplePath } from '../src/engine/table';

// On a deck the ball is expected to leave (hole / waterfall / ride) — 'fell'.
function soak(layer: string = FIELD) {
  const stuck: { x: number; y: number }[] = [];
  let drained = 0, trials = 0, rest = 0;
  const reach = reachability(layer);
  const { X0, X1, Y0, Y1 } = gridBounds();
  for (let gx = X0 + 2; gx <= X1 - 2; gx += 1.5) {
    for (let gy = Y0 + 6; gy <= Y1 - 4; gy += 1.5) {
      if (clearance(gx, gy, layer) < 0.05 || !reach(gx, gy)) continue;
      trials++;
      resetField();
      const speed = 30 + rnd() * 130 * DIFF.launch;
      const ang = rnd() * Math.PI * 2;
      const ball = mkBall(gx, gy, Math.cos(ang) * speed, Math.sin(ang) * speed, 3, layer);
      gameRef.balls.push(ball);
      const hist: [number, number][] = [];
      let slow = 0, result = 'run';
      for (let s = 0; s < 120 * 9; s++) {
        step();
        if (!ball.active) { result = 'drain'; break; }
        if (layer !== FIELD && (ball.layer ?? FIELD) !== layer) { result = 'drain'; break; } // fell off the deck
        if (ball.captured > 0 || ball.ride) { slow = 0; hist.length = 0; continue; }
        if (Math.hypot(ball.vx, ball.vy) < 11) slow += STEP; else slow = 0;
        hist.push([ball.x, ball.y]);
        if (hist.length > 300) hist.shift();
        if (slow > 2.5) {
          if (legitRest(ball.x, ball.y, ball.layer ?? FIELD)) { result = 'rest'; break; }
          let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
          for (const [hx, hy] of hist) {
            minx = Math.min(minx, hx); maxx = Math.max(maxx, hx);
            miny = Math.min(miny, hy); maxy = Math.max(maxy, hy);
          }
          if (Math.hypot(maxx - minx, maxy - miny) > 2.4) { slow = 0; continue; } // being moved around
          result = 'stuck';
          break;
        }
      }
      if (result === 'drain') drained++;
      else if (result === 'rest') rest++;
      else if (result === 'stuck') stuck.push({ x: ball.x, y: ball.y });
    }
  }
  return { stuck, drained, trials, rest };
}

let bad = 0;
for (const entry of TABLES) {
  console.log(`\n[${entry.id}] tier soak — every difficulty, its obstacles active:`);
  useTable(entry, 'medium');
  const layers = layerIds();
  for (const id of DIFF_ORDER) for (const layer of layers) {
    useTable(entry, id);
    reseed(12345);
    const r = soak(layer);
    if (r.stuck.length) bad++;
    if (layer !== FIELD && r.trials === 0) { bad++; console.log(`  <-- deck '${layer}' has no reachable space`); }
    const clusters = new Map<string, number>();
    for (const s of r.stuck) {
      const k = `${Math.round(s.x / 2) * 2},${Math.round(s.y / 2) * 2}`;
      clusters.set(k, (clusters.get(k) ?? 0) + 1);
    }
    const worst = [...clusters.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `(${k})×${n}`).join('  ');
    const tag = layer === FIELD ? DIFF.label.padEnd(11) : `  ↳ ${layer}`.padEnd(11);
    const out = layer === FIELD ? 'drain' : ' fell';
    console.log(`  ${tag} trials=${pad(r.trials, 4)} ${out}=${pad(r.drained, 4)} flipperRest=${pad(r.rest, 3)} stuck=${pad(r.stuck.length, 2)}${r.stuck.length ? `  <-- STUCK ${worst}` : ''}`);
  }

  // every ride must always eject with real velocity
  useTable(entry, 'medium');
  console.log(`[${entry.id}] ride tests (medium):`);
  for (const ride of TABLE.rides) {
    resetField();
    const p0 = ride.path[0], p1 = ride.path[1];
    const dl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const dx = (p1.x - p0.x) / dl, dy = (p1.y - p0.y) / dl;
    const g = ride.gate;
    const speed = g.minSpeed !== undefined ? g.minSpeed + 58 : g.maxSpeed !== undefined ? g.maxSpeed / 2 : 60;
    const back = ride.entry.r + 0.6;
    const ball = mkBall(ride.entry.x - dx * back, ride.entry.y - dy * back, dx * speed, dy * speed, 0);
    gameRef.balls.push(ball);
    let rode = 0, ejected = false, ok = false;
    for (let s = 0; s < 120 * 8; s++) {
      step();
      if (ball.ride) rode++;
      else if (rode > 0) ejected = true;
      if (ejected) { ok = Math.hypot(ball.vx, ball.vy) > 1; break; }
      if (!ball.active) break;
    }
    let minClr = Infinity;
    for (let i = 0; i <= 400; i++) {
      const p = samplePath(ride.path, i / 400);
      minClr = Math.min(minClr, clearance(p.x, p.y));
    }
    if (!(ejected && ok)) bad++;
    console.log(`  ${ride.id.padEnd(8)} entered=${rode > 0} ejected=${ejected && ok} rideTime=${(rode / 120).toFixed(2)}s path-vs-toys clearance=${minClr.toFixed(2)} (paths may legally fly over scenery)`);
  }

  // kinematic obstacles must never pin a ball: soak near each at the top tier
  useTable(entry, 'impossible');
  for (const k of ACTIVE.kinematics) {
    reseed(777);
    let pin = 0;
    for (let n = 0; n < 500; n++) {
      resetField();
      const x = k.cx - 2 * k.half + rnd() * 4 * k.half, y = k.cy - 7.5 + rnd() * 12;
      if (clearance(x, y) < 0.05) continue;
      const ball = mkBall(x, y, (rnd() - 0.5) * 60, -20 - rnd() * 40);
      gameRef.balls.push(ball);
      const hist: [number, number][] = [];
      let slow = 0;
      for (let s = 0; s < 120 * 10; s++) {
        step();
        if (!ball.active) break;
        if (ball.captured > 0 || ball.ride) { slow = 0; hist.length = 0; continue; }
        if (Math.hypot(ball.vx, ball.vy) < 11) slow += STEP; else slow = 0;
        hist.push([ball.x, ball.y]);
        if (hist.length > 260) hist.shift();
        if (slow > 2.2) {
          if (legitRest(ball.x, ball.y, ball.layer ?? FIELD)) break;
          let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
          for (const [hx, hy] of hist) { minx = Math.min(minx, hx); maxx = Math.max(maxx, hx); miny = Math.min(miny, hy); maxy = Math.max(maxy, hy); }
          if (Math.hypot(maxx - minx, maxy - miny) < 2.4) { pin++; break; }
          slow = 0;
        }
      }
    }
    if (pin) bad++;
    console.log(`[${entry.id}] kinematic pin test '${k.id}' (impossible, 500 balls nearby): pinned=${pin}`);
  }
}
setTier('medium');
if (bad) process.exitCode = 1;
