// Engine mechanics added for Salamander, each proven on a purpose-built table
// (Dead Star Disco's chassis + one of each new thing, nothing else):
//   swing bar   angle stays within base ± amp; contact velocity follows dθ/dt
//   orbiter     stays on its circle; a resting ball in its path gets swatted
//   blast pad   fires once per visit, then respects its cooldown
//   redirect    ejectIntoRide: a capture's eject starts the requested ride,
//               which lands on its exitLayer
//   internal    an internal ride is never auto-entered
//   launch gate minLaunchPower: only the just-plunged ball at ≥ that power
// Then every real table's internal rides are force-started and must deliver.

import { TABLES, TABLE, DIFF_ORDER, gameRef, useTable, resetField, mkBall, step, reseed, FIELD, type TableEntry } from './harness';
import { kinematicPose } from '../src/engine/table';
import { ejectIntoRide } from '../src/engine/runtime';
import type { TableDef } from '../src/engine/types';
import { table as disco } from '../src/themes/deadStarDisco/table';
import { nest } from '../src/themes/layerLab/table';

let bad = 0;
const expect = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) bad++;
};

const lab: TableDef = {
  ...disco,
  id: 'mechanicsLab',
  heightAt: () => 0,
  circles: [],
  sensors: [{ id: 'pad', kind: 'vent', x: 0, y: -5, r: 1.6, blast: { speed: 150, angle: Math.PI / 2, spread: 0, cooldown: 1.0 } }],
  captures: [{ id: 'cup', x: -8, y: 0, r: 2.2, hold: 0.5, maxSpeed: 150, cooldown: 2, eject: { angle: Math.PI / 2, spread: 0, speed: 100, speedJitter: 0 } }],
  rides: [
    {
      id: 'toNest', internal: true, entry: { x: -8, y: 0, r: 2 }, dur: 1,
      path: [{ x: -8, y: 0, h: 0.3 }, { x: -6, y: 10, h: 4 }, { x: -5, y: 20, h: 6 }],
      exit: { vx: 10, vy: 0 }, gate: {}, exitLayer: nest.id,
    },
    {
      id: 'sky', entry: { x: 19.5, y: 20, r: 2 }, dur: 1,
      path: [{ x: 19.5, y: 20, h: 0.3 }, { x: 12, y: 28, h: 5 }, { x: 5, y: 20, h: 6 }],
      exit: { vx: -10, vy: 0 }, gate: { minLaunchPower: 0.85 }, exitLayer: nest.id,
    },
  ],
  kinematics: [
    { id: 'swing', kind: 'bar', motion: 'swing', cx: 10, cy: 0, half: 3, r: 0.5, amp: 0.6, base: 0.2, speed: { default: 2.4 }, rest: 0.6, swat: 0.5 },
    { id: 'moon', kind: 'orbiter', cx: -2, cy: 12, r: 1.1, orbit: 5, phase: 0, speed: { default: 1.8 }, rest: 0.7, swat: 0.6 },
  ],
  layers: [nest],
  walls: [...disco.walls],
};
const entry: TableEntry = { id: 'mechanicsLab', table: lab };

console.log('[mechanics lab]');
useTable(entry, 'medium');

// swing bar: bounded angle + velocity = derivative
{
  const k = lab.kinematics[0];
  let minA = Infinity, maxA = -Infinity, derivErr = 0;
  let prev = kinematicPose(k, 0);
  for (let i = 1; i <= 2000; i++) {
    const phi = i * 0.01;
    const p = kinematicPose(k, phi);
    if (p.kind !== 'bar' || prev.kind !== 'bar') break;
    minA = Math.min(minA, p.angle); maxA = Math.max(maxA, p.angle);
    // dθ/dt = dθ/dφ · ω  →  finite difference over dφ, times ω
    const fd = ((p.angle - prev.angle) / 0.01) * 2.4;
    derivErr = Math.max(derivErr, Math.abs(fd - (p.angVel + prev.angVel) / 2));
    prev = p;
  }
  expect('swing bar stays within base ± amp', minA >= 0.2 - 0.6 - 1e-9 && maxA <= 0.2 + 0.6 + 1e-9, `${minA.toFixed(2)}..${maxA.toFixed(2)}`);
  expect('swing surface velocity follows dθ/dt', derivErr < 0.05, `max err ${derivErr.toFixed(3)}`);
}

// orbiter: on its circle, and swats a parked ball in its path
{
  const k = lab.kinematics[1];
  let offCircle = 0;
  for (let i = 0; i < 1000; i++) {
    const p = kinematicPose(k, i * 0.013);
    if (p.kind === 'orbiter') offCircle = Math.max(offCircle, Math.abs(Math.hypot(p.x - k.cx, p.y - k.cy) - 5));
  }
  expect('orbiter stays on its circle', offCircle < 1e-9);
  resetField();
  // parked just ahead of the moon (phase 0 = (3,12), moving +y), gravity pulls it into the path
  const b = mkBall(3, 15, 0, 0, 3);
  gameRef.balls.push(b);
  let hit = false;
  for (let s = 0; s < 120 * 4 && !hit; s++) for (const e of step()) if (e.type === 'post' && e.id === 'moon') hit = true;
  expect('orbiter swats a ball sitting in its path', hit);
}

// blast pad: once per visit, cooldown respected
{
  resetField();
  const b = mkBall(0, -9, 0, 60, 3);
  gameRef.balls.push(b);
  let blasts = 0, vyAfter = 0;
  for (let s = 0; s < 30; s++) for (const e of step()) if (e.type === 'blast') { blasts++; vyAfter = b.vy; }
  expect('pad blasts the ball on entry', blasts === 1 && vyAfter > 140, `vy ${vyAfter.toFixed(0)}`);
  // second ball straight in while recharging: no blast
  const c = mkBall(0, -9, 0, 60, 3);
  gameRef.balls.push(c);
  let second = 0;
  for (let s = 0; s < 30; s++) for (const e of step()) if (e.type === 'blast') second++;
  expect('pad does not fire while recharging', second === 0, `cool ${gameRef.padCool.pad?.toFixed(2)}`);
  gameRef.balls = []; // earlier balls would fall back through the pad and spend the charge
  for (let s = 0; s < 130; s++) step();
  const d = mkBall(0, -9, 0, 60, 3);
  gameRef.balls = [d];
  let third = 0;
  for (let s = 0; s < 30; s++) for (const e of step()) if (e.type === 'blast') third++;
  expect('pad fires again once recharged', third === 1);
}

// capture → ride redirect → deck
{
  resetField();
  const b = mkBall(-8, -4, 0, 30, 0);
  gameRef.balls.push(b);
  let captured = false, ejectEvents = 0, rideEnter = '', layerTo = '';
  for (let s = 0; s < 120 * 4; s++) {
    for (const e of step()) {
      if (e.type === 'capture' && e.id === 'cup') { captured = true; ejectIntoRide('cup', 'toNest'); }
      if (e.type === 'captureEject') ejectEvents++;
      if (e.type === 'rideEnter') rideEnter = e.id;
      if (e.type === 'layer') layerTo = e.to;
    }
    if (layerTo) break;
  }
  expect('capture redirected into the requested ride', captured && ejectEvents === 1 && rideEnter === 'toNest');
  expect('redirect ride delivers onto its exitLayer', layerTo === nest.id && (b.layer ?? FIELD) === nest.id);
}

// internal ride never auto-entered: fire a ball straight through its entry mouth
{
  resetField();
  lab.captures = []; useTable(entry, 'medium'); // remove the cup so nothing else catches it
  const b = mkBall(-8, -3, 0, 90, 0);
  gameRef.balls.push(b);
  let entered = false;
  for (let s = 0; s < 120; s++) for (const e of step()) if (e.type === 'rideEnter') entered = true;
  expect('internal ride is never auto-entered', !entered);
}

// launch-power gate, every tier
for (const tier of DIFF_ORDER) {
  useTable(entry, tier);
  const P = TABLE.plunger;
  const trial = (power: number) => {
    resetField();
    gameRef.skillWindow = 5; gameRef.lastLaunchPower = power;
    const b = mkBall(P.x, P.restY, 0, (P.launchBase + power * P.launchRange) * 1.0, 0);
    b.inLane = true;
    gameRef.balls.push(b);
    for (let s = 0; s < 120 * 3; s++) for (const e of step()) if (e.type === 'rideEnter' && e.id === 'sky') return true;
    return false;
  };
  const low = trial(0.6), high = trial(1.0);
  expect(`${tier}: launch gate — p0.60 no Skyshot, p1.00 Skyshot`, !low && high);
}

// real tables: every internal ride, force-started, must finish and deliver
for (const t of TABLES) {
  useTable(t, 'medium');
  for (const ride of TABLE.rides.filter((r) => r.internal)) {
    resetField();
    reseed(5);
    const p0 = ride.path[0];
    const b = mkBall(p0.x, p0.y, 0, 0, 0);
    b.ride = { id: ride.id, t: 0 };
    gameRef.balls.push(b);
    let exited = false;
    for (let s = 0; s < 120 * 6 && !exited; s++) for (const e of step()) if (e.type === 'rideExit') exited = true;
    const layer = b.layer ?? FIELD;
    expect(`[${t.id}] internal ride '${ride.id}' finishes on '${ride.exitLayer ?? FIELD}'`, exited && layer === (ride.exitLayer ?? FIELD));
  }
}

process.exit(bad ? 1 : 0);
