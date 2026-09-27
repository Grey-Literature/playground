// Live table runtime. `TABLE` is the active theme's TableDef (swapped in place,
// like DIFF), and `ACTIVE` is the tier-filtered view physics iterates over —
// rebuilt only when the table or tier changes, never per step.

import type {
  TableDef, WallSeg, CircleBody, Sensor, RideDef, CaptureDef, KinematicDef, PathPt, LayerDef,
} from './types';
import { FIELD } from './types';
import { DIFF, tierAllows } from './difficulty';

const EMPTY_TABLE: TableDef = {
  layers: [],
  id: 'none',
  drainY: -41,
  bounds: { minX: -24, maxX: 24, maxY: 40 },
  walls: [], circles: [], sensors: [], rides: [], captures: [], kinematics: [],
  flippers: {
    left: { pivot: { x: -9, y: -31.2 }, rest: -0.78, active: 0.6 },
    right: { pivot: { x: 9, y: -31.2 }, rest: Math.PI + 0.78, active: Math.PI - 0.6 },
    len: 7.8, r: 1.35, upSpeed: 30, downSpeed: 10,
  },
  plunger: {
    x: 19.5, restY: -35.8, dividerX: 17, laneTopY: 22, holdBelowY: -28,
    cap: { x: 17, y: 17, r: 0.45 }, gate: { yMin: 16.5, yMax: 36 },
    launchBase: 80, launchRange: 175, autoLaunch: 235, skillZone: [0.32, 0.48],
  },
  heightAt: () => 0,
  restZone: { maxY: -28.5, halfX: 11, watchHalfX: 12.5 },
  camera: { clampX: 14, minY: -34, maxY: 30 },
};

export const TABLE: TableDef = { ...EMPTY_TABLE };

export interface ActiveSet {
  walls: WallSeg[];
  bumpers: CircleBody[];
  posts: CircleBody[];
  kickers: CircleBody[];
  targets: CircleBody[];
  drops: CircleBody[];
  sensors: Sensor[];
  rides: RideDef[];
  captures: CaptureDef[];
  kinematics: KinematicDef[];
  /** Every collidable circle at this tier — used by the harness clearance map. */
  circles: CircleBody[];
}

const emptySet = (): ActiveSet => ({
  walls: [], bumpers: [], posts: [], kickers: [], targets: [], drops: [],
  sensors: [], rides: [], captures: [], kinematics: [], circles: [],
});

/**
 * Everything live at this tier on ALL layers (the scene renders this), plus
 * `byLayer[id]` — the same split per layer, which is what physics iterates.
 */
export const ACTIVE: ActiveSet & { byLayer: Record<string, ActiveSet> } = { ...emptySet(), byLayer: {} };

let version = 0;
/** Bumps whenever the active set changes — scene components key off it. */
export function activeVersion() { return version; }

export function refreshActive() {
  const ok = <T extends { minTier?: import('./types').DiffId }>(list: T[]) =>
    list.filter((b) => tierAllows(b.minTier, DIFF.id));
  const circles = ok(TABLE.circles);
  ACTIVE.walls = ok(TABLE.walls);
  ACTIVE.circles = circles;
  ACTIVE.bumpers = circles.filter((c) => c.kind === 'bumper');
  ACTIVE.posts = circles.filter((c) => c.kind === 'post');
  ACTIVE.kickers = circles.filter((c) => c.kind === 'kicker');
  ACTIVE.targets = circles.filter((c) => c.kind === 'target');
  ACTIVE.drops = circles.filter((c) => c.kind === 'drop');
  ACTIVE.sensors = ok(TABLE.sensors);
  ACTIVE.rides = ok(TABLE.rides);
  ACTIVE.captures = ok(TABLE.captures);
  ACTIVE.kinematics = ok(TABLE.kinematics);
  const ids = [FIELD, ...(TABLE.layers ?? []).map((l) => l.id)];
  const on = <T extends { layer?: string }>(list: T[], id: string) => list.filter((b) => (b.layer ?? FIELD) === id);
  ACTIVE.byLayer = {};
  for (const id of ids) {
    const set = emptySet();
    for (const k of Object.keys(set) as (keyof ActiveSet)[]) {
      (set[k] as { layer?: string }[]) = on(ACTIVE[k] as { layer?: string }[], id);
    }
    ACTIVE.byLayer[id] = set;
  }
  version++;
}

/** Physics view of one layer (unknown ids fall back to the field). */
export function layerSet(id: string | undefined) {
  return ACTIVE.byLayer[id ?? FIELD] ?? ACTIVE.byLayer[FIELD];
}

export function layerById(id: string | undefined): LayerDef | undefined {
  return id && id !== FIELD ? TABLE.layers?.find((l) => l.id === id) : undefined;
}

/** Render height of a layer's surface (field = 0). */
export function layerHeight(id: string | undefined) {
  return layerById(id)?.height ?? 0;
}

/** Even-odd point-in-polygon. */
export function insidePolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The deck a field point lies UNDER, if any. */
export function deckAbove(x: number, y: number): LayerDef | undefined {
  return TABLE.layers?.find((l) => insidePolygon(x, y, l.outline));
}

export function setTable(def: TableDef) {
  // reset first so optional fields (layers, flashDecay…) never leak between themes
  for (const k of Object.keys(TABLE)) delete (TABLE as unknown as Record<string, unknown>)[k];
  Object.assign(TABLE, EMPTY_TABLE, def);
  refreshActive();
}

export function rideById(id: string) {
  return TABLE.rides.find((r) => r.id === id);
}

export function captureById(id: string) {
  return TABLE.captures.find((c) => c.id === id);
}

export function kinematicSpeed(k: KinematicDef) {
  return k.speed[DIFF.id] ?? k.speed.default;
}

export interface BarPose { kind: 'bar'; ax: number; ay: number; bx: number; by: number; angle: number; angVel: number }
export interface OrbiterPose { kind: 'orbiter'; x: number; y: number; vx: number; vy: number }

/**
 * Where a kinematic obstacle is right now. `phi` is its accumulated phase
 * (gameRef.kin[id] = ∫ speed dt), so pose is a pure function of it.
 */
export function kinematicPose(k: KinematicDef, phi: number): BarPose | OrbiterPose {
  const w = kinematicSpeed(k);
  if (k.kind === 'orbiter') {
    const R = k.orbit ?? 0, a = (k.phase ?? 0) + phi;
    return { kind: 'orbiter', x: k.cx + Math.cos(a) * R, y: k.cy + Math.sin(a) * R, vx: -Math.sin(a) * R * w, vy: Math.cos(a) * R * w };
  }
  let angle = phi, angVel = w;
  if (k.motion === 'swing') {
    const amp = k.amp ?? 0.5;
    angle = (k.base ?? 0) + amp * Math.sin(phi);
    angVel = amp * w * Math.cos(phi);
  }
  const half = k.half ?? 0, dx = Math.cos(angle) * half, dy = Math.sin(angle) * half;
  return { kind: 'bar', ax: k.cx - dx, ay: k.cy - dy, bx: k.cx + dx, by: k.cy + dy, angle, angVel };
}

// ---------- geometry helpers for theme authors ----------

/** Catmull-Rom through the path points; t in [0, 1]. */
export function samplePath(pts: PathPt[], t: number): PathPt {
  const n = pts.length - 1;
  const u = Math.max(0, Math.min(0.9999, t)) * n;
  const i = Math.floor(u);
  const f = u - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[Math.min(n, i + 1)];
  const p3 = pts[Math.min(n, i + 2)];
  const f2 = f * f, f3 = f2 * f;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), h: cr(p0.h, p1.h, p2.h, p3.h) };
}

export function arcWalls(cx: number, cy: number, radius: number, a0: number, a1: number, n: number, prefix = 'arc', rest = 0.42): WallSeg[] {
  const segs: WallSeg[] = [];
  let px = cx + radius * Math.cos(a0);
  let py = cy + radius * Math.sin(a0);
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    segs.push({ ax: px, ay: py, bx: x, by: y, rest, kind: 'wall', id: `${prefix}${i}` });
    px = x; py = y;
  }
  return segs;
}

export function polyWalls(points: [number, number][], prefix: string, kind: WallSeg['kind'], rest: number): WallSeg[] {
  return points.slice(1).map((p, i) => ({
    ax: points[i][0], ay: points[i][1], bx: p[0], by: p[1],
    rest, kind, id: `${prefix}${i}`,
  }));
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth01 = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** 1 inside `inner`, easing to 0 at `outer` — keeps a ball from snapping between levels. */
export function falloff(d: number, inner: number, outer: number) {
  if (d <= inner) return 1;
  if (d >= outer) return 0;
  return smooth01(1 - (d - inner) / (outer - inner));
}

/** How many gated obstacle sets (distinct minTier values) are live at `tier`. */
export function obstacleCount(tier: import('./types').DiffId) {
  const tiers = new Set<string>();
  const all = [...TABLE.walls, ...TABLE.circles, ...TABLE.sensors, ...TABLE.rides, ...TABLE.captures, ...TABLE.kinematics];
  for (const b of all) if (b.minTier && tierAllows(b.minTier, tier)) tiers.add(b.minTier);
  return tiers.size;
}
