// Camera framing solver (pure three.js math — no React, testable headless).
//
// Every frame the rig lists points that MUST be on screen (flippers always,
// every live ball, plus a look-ahead band above the highest ball), then finds
// the closest camera distance along a fixed viewing angle that fits them all
// inside the HUD-safe part of the screen. Two balls at opposite ends simply
// zoom the view out until both fit; a lone ball near the flippers lets the
// camera move in, but never closer than MIN_ZOOM of the whole-table shot.

import * as THREE from 'three';
import { PLAYFIELD_TILT, BALL_RADIUS } from '../constants';
import { TABLE } from '../table';

/** Screen-safe box in NDC: bottom strip = message pill, top strip = score/multiplier pills. */
export const SAFE = { top: 0.84, bottom: -0.8, side: 0.92 };
/** How much table to keep visible above the highest ball (physics units). */
export const LOOK_AHEAD = 26;
/** Never zoom in past this fraction of the whole-table distance. */
export const MIN_ZOOM = 0.93;

export interface PhysPt { x: number; y: number; h: number }

const cosT = Math.cos(PLAYFIELD_TILT), sinT = Math.sin(PLAYFIELD_TILT);

/** physics (x, y, height) -> world, through the tilted playfield group. */
export function toWorld(p: PhysPt, out = new THREE.Vector3()) {
  const ly = p.h, lz = -p.y;
  return out.set(p.x, ly * cosT - lz * sinT, ly * sinT + lz * cosT);
}

/** Table extents from its geometry: outer walls + the flippers' lowest point. */
export function tableExtents() {
  let minX = Infinity, maxX = -Infinity, topY = -Infinity;
  for (const w of TABLE.walls) {
    minX = Math.min(minX, w.ax, w.bx); maxX = Math.max(maxX, w.ax, w.bx);
    topY = Math.max(topY, w.ay, w.by);
  }
  const F = TABLE.flippers;
  const flipLow = Math.min(
    F.left.pivot.y, F.left.pivot.y + Math.sin(F.left.rest) * F.len,
    F.right.pivot.y, F.right.pivot.y + Math.sin(F.right.rest) * F.len,
  ) - F.r;
  return { minX, maxX, topY, flipLow };
}

/** Points that are always required: both flippers, tip to pivot. */
export function flipperPoints(): PhysPt[] {
  const F = TABLE.flippers;
  const pts: PhysPt[] = [];
  for (const s of [F.left, F.right]) {
    const tipX = s.pivot.x + Math.cos(s.rest) * F.len, tipY = s.pivot.y + Math.sin(s.rest) * F.len;
    pts.push({ x: s.pivot.x, y: s.pivot.y - F.r, h: 0.4 }, { x: tipX, y: tipY - F.r, h: 0.4 });
  }
  return pts;
}

/** The whole playfield: the four corners between the top arch and the flippers. */
export function fullTablePoints(): PhysPt[] {
  const e = tableExtents();
  return [
    { x: e.minX, y: e.topY, h: 3 }, { x: e.maxX, y: e.topY, h: 3 },
    { x: e.minX, y: e.flipLow, h: 0 }, { x: e.maxX, y: e.flipLow, h: 0 },
    ...flipperPoints(),
  ];
}

/** Required points while following balls. */
export function followPoints(balls: PhysPt[]): PhysPt[] {
  const e = tableExtents();
  const pts = flipperPoints();
  let top = -Infinity;
  for (const b of balls) {
    pts.push({ x: b.x, y: b.y + BALL_RADIUS * 1.5, h: b.h + BALL_RADIUS * 2 }, { x: b.x, y: b.y - BALL_RADIUS * 1.5, h: b.h });
    top = Math.max(top, b.y);
  }
  // look-ahead band across the table's width above the highest ball
  const ahead = Math.min(e.topY, (balls.length ? top : e.flipLow) + LOOK_AHEAD);
  const inset = (e.maxX - e.minX) * 0.15;
  pts.push({ x: e.minX + inset, y: ahead, h: 0 }, { x: e.maxX - inset, y: ahead, h: 0 });
  return pts;
}

export class Framer {
  private cam = new THREE.PerspectiveCamera(38, 16 / 9, 1, 2000);
  private v = new THREE.Vector3();
  private world: THREE.Vector3[] = [];
  readonly pos = new THREE.Vector3();
  readonly look = new THREE.Vector3();

  /**
   * Fit `points` at viewing elevation `elev` (radians above the table's far
   * direction). Writes the result into this.pos / this.look and returns the
   * camera distance used. `minDist` forces the camera at least that far back.
   */
  fit(points: PhysPt[], opts: { fov: number; aspect: number; elev: number; lookX?: number; camXOffset?: number; minDist?: number }) {
    const { cam } = this;
    cam.fov = opts.fov; cam.aspect = opts.aspect; cam.updateProjectionMatrix();
    while (this.world.length < points.length) this.world.push(new THREE.Vector3());
    for (let i = 0; i < points.length; i++) toWorld(points[i], this.world[i]);
    const n = points.length;
    const dir = new THREE.Vector3(0, Math.sin(opts.elev), Math.cos(opts.elev));
    const lookX = opts.lookX ?? 0, camX = opts.camXOffset ?? 0;
    const mid = (SAFE.top + SAFE.bottom) / 2;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(opts.fov) / 2);

    let yMin = Infinity, yMax = -Infinity;
    for (const p of points) { yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y); }

    const place = (d: number, ly: number) => {
      toWorld({ x: lookX, y: ly, h: 0 }, this.look);
      this.pos.copy(this.look).addScaledVector(dir, d);
      this.pos.x += camX;
      cam.position.copy(this.pos);
      cam.lookAt(this.look);
      cam.updateMatrixWorld();
      let lo = Infinity, hi = -Infinity, side = 0;
      for (let i = 0; i < n; i++) {
        this.v.copy(this.world[i]).project(cam);
        lo = Math.min(lo, this.v.y); hi = Math.max(hi, this.v.y); side = Math.max(side, Math.abs(this.v.x));
      }
      return { lo, hi, side };
    };
    // centre the points' vertical NDC span on the safe box's middle
    const centred = (d: number) => {
      let ly = (yMin + yMax) / 2;
      let ext = place(d, ly);
      for (let i = 0; i < 6; i++) {
        const off = (ext.lo + ext.hi) / 2 - mid;
        if (Math.abs(off) < 0.004) break;
        ly += off * d * halfTan / Math.sin(opts.elev);
        ext = place(d, ly);
      }
      return { ly, ext };
    };
    const ok = (d: number) => {
      const { ext } = centred(d);
      return ext.hi <= SAFE.top && ext.lo >= SAFE.bottom && ext.side <= SAFE.side;
    };
    let lo = 15, hi = 600;
    for (let i = 0; i < 22; i++) {
      const m = (lo + hi) / 2;
      if (ok(m)) hi = m; else lo = m;
    }
    const d = Math.max(hi, opts.minDist ?? 0);
    // Final placement: slide toward pinning the lowest required point (the
    // flippers) to the bottom of the safe box, so slack goes UP the table like
    // a real cabinet view — as far as every limit still holds.
    const valid = (e: { lo: number; hi: number; side: number }) =>
      e.hi <= SAFE.top + 1e-4 && e.lo >= SAFE.bottom - 1e-4 && e.side <= SAFE.side + 1e-4;
    const c = centred(d);
    let lyA = c.ly, ext = c.ext;
    for (let i = 0; i < 8; i++) {
      const off = ext.lo - SAFE.bottom;
      if (Math.abs(off) < 0.003) break;
      lyA += off * d * halfTan / Math.sin(opts.elev);
      ext = place(d, lyA);
    }
    if (!valid(ext)) {
      let a = 0, b = 1; // fraction of the way from centred to anchored
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2;
        if (valid(place(d, c.ly + (lyA - c.ly) * m))) a = m; else b = m;
      }
      place(d, c.ly + (lyA - c.ly) * a);
    }
    return d;
  }
}

/** Viewing elevations per camera mode (radians). */
export const ELEV = { player: THREE.MathUtils.degToRad(56), top: THREE.MathUtils.degToRad(84) };
