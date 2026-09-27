// Shared headless-physics harness: boots a theme's table + tier without React,
// seeds Math.random, and provides the clearance map / rest-zone helpers every
// *.check.ts uses. Imports only pure engine modules and themes/tables.ts.

import { STEP, BALL_RADIUS, WALL_PAD } from '../src/engine/constants';
import { stepPhysics } from '../src/engine/physics';
import { gameRef, resetMutable } from '../src/engine/runtime';
import { TABLE, ACTIVE, setTable, refreshActive } from '../src/engine/table';
import { applyDifficultyCfg, setDiffOverrides, DIFF, DIFF_ORDER, type DiffId } from '../src/engine/difficulty';
import type { BallState } from '../src/engine/types';
import { TABLES, type TableEntry } from '../src/themes/tables';

export { STEP, BALL_RADIUS, stepPhysics, gameRef, TABLE, ACTIVE, DIFF, DIFF_ORDER, TABLES };
export type { DiffId, TableEntry, BallState };

// ---------- deterministic randomness (physics uses Math.random for ejects) ----------
let seed = 12345;
export function reseed(s: number) { seed = s >>> 0 || 1; }
export const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
Math.random = rnd;

// ---------- activation ----------
export function useTable(entry: TableEntry, tier: DiffId) {
  setDiffOverrides(entry.diffOverrides);
  applyDifficultyCfg(tier);
  setTable(entry.table);
  resetMutable();
}

export function setTier(tier: DiffId) {
  applyDifficultyCfg(tier);
  refreshActive();
}

export function resetField() {
  gameRef.balls = [];
  const F = TABLE.flippers;
  gameRef.left = { angle: F.left.rest, prevAngle: F.left.rest, angVel: 0, pressed: false };
  gameRef.right = { angle: F.right.rest, prevAngle: F.right.rest, angVel: 0, pressed: false };
  gameRef.plungerCharging = false;
  gameRef.tiltedUntil = 0;
  gameRef.paused = false;
  gameRef.dropDown = {};
  gameRef.kin = {};
  gameRef.unwedgeCount = 0;
}

export function mkBall(x: number, y: number, vx: number, vy: number, cooldown = 3): BallState {
  return {
    id: 1, x, y, vx, vy, px: x, py: y, active: true, inLane: false,
    captured: 0, captureCooldown: cooldown, inside: new Set(), spin: 0,
  };
}

export function step(n = 1) {
  const ev = [];
  for (let i = 0; i < n; i++) ev.push(...stepPhysics(STEP));
  return ev;
}

// ---------- geometry ----------
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2)) : 0;
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function flipperSegs() {
  const F = TABLE.flippers;
  return [F.left, F.right].map((s) => ({
    ax: s.pivot.x, ay: s.pivot.y,
    bx: s.pivot.x + Math.cos(s.rest) * F.len, by: s.pivot.y + Math.sin(s.rest) * F.len,
  }));
}

/** Free space around (x,y) for a ball centre at the ACTIVE tier (static colliders only). */
export function clearance(x: number, y: number) {
  let m = Infinity;
  for (const w of ACTIVE.walls) m = Math.min(m, segDist(x, y, w.ax, w.ay, w.bx, w.by) - (BALL_RADIUS + WALL_PAD));
  for (const c of ACTIVE.circles) m = Math.min(m, Math.hypot(x - c.x, y - c.y) - (c.r + BALL_RADIUS));
  const cap = TABLE.plunger.cap;
  m = Math.min(m, Math.hypot(x - cap.x, y - cap.y) - (cap.r + BALL_RADIUS));
  for (const f of flipperSegs()) m = Math.min(m, segDist(x, y, f.ax, f.ay, f.bx, f.by) - (BALL_RADIUS + TABLE.flippers.r));
  return m;
}

/** Slow ball in the shooter lane or cradled on a flipper — a legitimate rest. */
export function legitRest(x: number, y: number) {
  if (x > TABLE.plunger.dividerX - 0.5) return true;
  for (const f of flipperSegs()) {
    if (segDist(x, y, f.ax, f.ay, f.bx, f.by) < BALL_RADIUS + TABLE.flippers.r + 0.6) return true;
  }
  return false;
}

export function gridBounds() {
  const B = TABLE.bounds;
  return { X0: B.minX + 1, X1: B.maxX - 1, Y0: TABLE.drainY - 1, Y1: B.maxY - 2 };
}

/** Flood-fill reachable free space from the shooter lane. */
export function reachability(STEP_ = 0.7) {
  const { X0, X1, Y0, Y1 } = gridBounds();
  const NX = Math.round((X1 - X0) / STEP_) + 1;
  const NY = Math.round((Y1 - Y0) / STEP_) + 1;
  const free = new Uint8Array(NX * NY);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) free[i * NY + j] = clearance(X0 + i * STEP_, Y0 + j * STEP_) > 0 ? 1 : 0;
  const seen = new Uint8Array(NX * NY);
  const P = TABLE.plunger;
  const q = [Math.round((P.x - X0) / STEP_) * NY + Math.round((P.restY + 15 - Y0) / STEP_)];
  seen[q[0]] = 1;
  while (q.length) {
    const cur = q.pop()!;
    const ci = Math.floor(cur / NY), cj = cur % NY;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
      const idx = ni * NY + nj;
      if (seen[idx] || !free[idx]) continue;
      seen[idx] = 1;
      q.push(idx);
    }
  }
  return (x: number, y: number) => {
    const i = Math.round((x - X0) / STEP_), j = Math.round((y - Y0) / STEP_);
    return i >= 0 && j >= 0 && i < NX && j < NY && seen[i * NY + j] === 1;
  };
}

export const pad = (v: string | number, n: number) => String(v).padStart(n);
