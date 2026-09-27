// Dead Star Disco — table geometry. Pure data (no React) so the headless
// harness can import it. Layout inherited from the Neon Nova prototype.
//
// x: -22 (left wall) .. +17 (plunger divider). Plunger lane: x in [17,22].
// y: -41 (drain) .. +36 (top of arch).
//
// CLEARANCE RULE — ball r=1.55, walls inflated by WALL_PAD 0.35, so a ball only
// passes a gap whose centre-to-centre width exceeds:
//     wall <-> wall   : 2*(1.55+0.35) = 3.80
//     wall <-> post   : (1.55+0.35) + (1.55+r)
//     post <-> post   : (1.55+ra) + (1.55+rb)
// Any gap smaller than that must be fully sealed, otherwise the ball wedges.
// `npm test` (stuck.check) verifies this empirically after layout edits.

import type { TableDef, WallSeg, CircleBody, PathPt, Sensor } from '../../engine/types';
import { arcWalls, polyWalls, falloff, smooth01 } from '../../engine/table';
import type { DiffOverrides } from '../../engine/difficulty';

// Raised rear deck: two ball channels climb onto a three-lane upper level.
export const UPPER_DECK_HEIGHT = 5.1;
export const DECK_Y0 = 25.5;
export const DECK_HALF_X = 9.8;
export const RAMP_Y0 = 18.5;
export const RAMP_Y1 = 26.0;

export function rampCenters(t: number) {
  const left = -14.4 + t * 5.0;
  return [left, -left];
}

export function heightAt(x: number, y: number) {
  let h = 0;

  // Raised rear deck. It only slopes down at the FRONT edge — giving it a back
  // edge as well created a ledge where the up-slope exactly cancelled gravity and
  // balls parked there forever.
  if (y > DECK_Y0 - 2.5) {
    const fx = falloff(Math.abs(x), DECK_HALF_X - 1.2, DECK_HALF_X + 1.7);
    const fy = y >= DECK_Y0 ? 1 : falloff(DECK_Y0 - y, 0.2, 2.2);
    h = Math.max(h, UPPER_DECK_HEIGHT * fx * fy);
  }

  // two climbing ramps
  const t = (y - RAMP_Y0) / (RAMP_Y1 - RAMP_Y0);
  if (t > 0 && t < 1.2) {
    const tc = Math.min(1, t);
    const climb = smooth01(tc) * (UPPER_DECK_HEIGHT - 0.35);
    const [leftCenter, rightCenter] = rampCenters(tc);
    const f = Math.max(
      falloff(Math.abs(x - leftCenter), 1.5, 1.62),
      falloff(Math.abs(x - rightCenter), 1.5, 1.62),
    );
    h = Math.max(h, climb * f);
  }

  return h;
}

// Outer arch spans the whole cabinet so the plunger lane feeds under it.
const arch = arcWalls(0, 14, 22, 0, Math.PI, 24);

// Return guides funnel the ball from the outer walls down onto the flipper tips.
// They stop 3.0 from each pivot — just clear of the flipper's own collision radius
// (BALL_RADIUS + FLIPPER_R = 2.9) so the ball can never be crushed between them.
export const RETURN_GUIDE_LEFT: [number, number][] = [[-22, -22], [-18, -26], [-14.5, -28.2], [-11.6, -28.9]];
export const RETURN_GUIDE_RIGHT: [number, number][] = [[17, -22], [14.2, -25.6], [13.0, -28.2], [11.6, -28.9]];

// Slingshots sit flush against the side walls, so there is no narrow outlane
// channel behind them for the ball to jam into.
export const SLING_LEFT: [number, number][] = [[-22, -9], [-22, -19], [-17.3, -14]];
export const SLING_RIGHT: [number, number][] = [[17, -9], [17, -19], [12.3, -14]];

const walls: WallSeg[] = [
  { ax: -22, ay: -22, bx: -22, by: 14, rest: 0.4, kind: 'wall', id: 'outerL' },
  { ax: 22, ay: -38, bx: 22, by: 14, rest: 0.4, kind: 'wall', id: 'outerR' },
  // Divider tops out at 17: any higher and its end cap plus the arch squeeze the
  // shooter-lane exit below one ball width, sealing the ball in the lane.
  { ax: 17, ay: -38, bx: 17, by: 17, rest: 0.35, kind: 'wall', id: 'divider' },
  { ax: 17, ay: -38, bx: 22, by: -38, rest: 0.3, kind: 'wall', id: 'laneBottom' },

  ...polyWalls(RETURN_GUIDE_LEFT, 'guideL', 'guide', 0.35),
  ...polyWalls(RETURN_GUIDE_RIGHT, 'guideR', 'guide', 0.35),

  // slingshot kicking faces
  { ax: -22, ay: -19, bx: -17.3, by: -14, rest: 0.55, kind: 'sling', id: 'slingL-b', group: 'L', kick: 92 },
  { ax: -17.3, ay: -14, bx: -22, by: -9, rest: 0.55, kind: 'sling', id: 'slingL-a', group: 'L', kick: 92 },
  { ax: 17, ay: -19, bx: 12.3, by: -14, rest: 0.55, kind: 'sling', id: 'slingR-b', group: 'R', kick: 92 },
  { ax: 12.3, ay: -14, bx: 17, by: -9, rest: 0.55, kind: 'sling', id: 'slingR-a', group: 'R', kick: 92 },

  ...arch,
];

const circles: CircleBody[] = [
  // pop bumpers
  { x: -6.6, y: 13.5, r: 2.9, kind: 'bumper', id: '0' },
  { x: 6.6, y: 13.5, r: 2.9, kind: 'bumper', id: '1' },
  { x: 0, y: 21.5, r: 2.9, kind: 'bumper', id: '2' },
  // Upper pop bumper pair (easy+). Flanks the orbit/center lanes; sealed clusters
  // with the main bumpers (surface gaps < one ball diameter, so no wedge pocket).
  { x: -10.8, y: 19.4, r: 2.6, kind: 'bumper', id: '3', minTier: 'easy' },
  { x: 10.8, y: 19.4, r: 2.6, kind: 'bumper', id: '4', minTier: 'easy' },

  // rubber posts
  { x: -7.5, y: 4.0, r: 0.62, kind: 'post', id: 'p0', rest: 0.8 },
  { x: 2.5, y: 4.0, r: 0.62, kind: 'post', id: 'p1', rest: 0.8 },
  // NOTE: there used to be posts at (±11, 24.5) — they sat directly under the
  // ramp's dive and were removed so the wire can descend cleanly.
  { x: -3.4, y: 29.6, r: 0.55, kind: 'post', id: 'lanePost0', rest: 0.7 },
  { x: 3.4, y: 29.6, r: 0.55, kind: 'post', id: 'lanePost1', rest: 0.7 },
  // Rubber posts that scatter top-of-field shots (medium+).
  { x: 0, y: 17.6, r: 0.62, kind: 'post', id: 'tp0', rest: 0.95, minTier: 'medium' },
  { x: -7.2, y: 17.5, r: 0.62, kind: 'post', id: 'tp1', rest: 0.95, minTier: 'medium' },
  { x: 7.2, y: 17.5, r: 0.62, kind: 'post', id: 'tp2', rest: 0.95, minTier: 'medium' },

  // Spring-loaded frickies above the flippers (impossible only) — they punch the
  // ball back into the pit. Positioned so a raised flipper still leaves >1 ball
  // width of clearance to each post.
  { x: -7.2, y: -22.6, r: 0.8, kind: 'kicker', id: 'fk0', rest: 1.0, minTier: 'impossible' },
  { x: 7.2, y: -22.6, r: 0.8, kind: 'kicker', id: 'fk1', rest: 1.0, minTier: 'impossible' },

  // standup targets — left bank 3.4 clear of the side wall
  { x: -14.0, y: -1.0, r: 1.15, kind: 'target', id: 'L0' },
  { x: -14.0, y: 2.7, r: 1.15, kind: 'target', id: 'L1' },
  { x: -14.0, y: 6.4, r: 1.15, kind: 'target', id: 'L2' },
  // right bank — 3.4 clear of the plunger divider
  { x: 9.0, y: -1.0, r: 1.15, kind: 'target', id: 'R0' },
  { x: 9.0, y: 2.7, r: 1.15, kind: 'target', id: 'R1' },
  { x: 9.0, y: 6.4, r: 1.15, kind: 'target', id: 'R2' },
  // centre standups — 7.4 apart so the ball can shoot the gap
  { x: -6.2, y: -4.5, r: 1.05, kind: 'target', id: 'C0' },
  { x: 1.2, y: -4.5, r: 1.05, kind: 'target', id: 'C1' },

  // Drop-target "doors". r=1.05, centres 2.2 apart so the ball cannot squeeze
  // between them while they're up. 6.8 from the left wall (need 4.50). Lowest
  // target is 5.9 from L2 (need 5.30). When dropped they have no collision.
  { x: -15.2, y: 12.2, r: 1.05, kind: 'drop', id: 'd0' },
  { x: -15.2, y: 14.4, r: 1.05, kind: 'drop', id: 'd1' },
  { x: -15.2, y: 16.6, r: 1.05, kind: 'drop', id: 'd2' },
];

export const sensors: Sensor[] = [
  // Top lanes ride the arch itself (ball centre path is the r≈20.1 circle about
  // (0,14)) — placed any further inboard and launched balls fly clean over them,
  // which silently killed the skill shot. Radii are generous so a fast ball can't
  // tunnel between substeps.
  { x: -7.5, y: 32.9, r: 2.8, kind: 'lane', id: 'lane0' },
  { x: 0, y: 34.2, r: 2.8, kind: 'lane', id: 'lane1' },
  { x: 7.5, y: 32.9, r: 2.8, kind: 'lane', id: 'lane2' },
  { x: -2.5, y: 6.2, r: 2.2, kind: 'spinner', id: 'spinner' },
  { x: -19.5, y: 18, r: 2.4, kind: 'orbit', id: 'orbitL', minSpeed: 60 },
  { x: -14.0, y: -27.0, r: 1.8, kind: 'inlane', id: 'inlaneL' },
  { x: 12.2, y: -26.8, r: 1.8, kind: 'inlane', id: 'inlaneR' },
];

// Left-orbit wire ramp. Rises along the left wall, sails over the raised deck
// (staying above the deck's own side rails at ~6.3), then dives down the right
// side and feeds the right flipper. Every point was checked for >= one-rail
// clearance from bumpers, posts, drop doors and the upper deck rails.
export const RAMP_PATH: PathPt[] = [
  { x: -18.2, y: 7.2, h: 0.3 },
  { x: -19.0, y: 12.8, h: 2.0 },
  { x: -19.2, y: 18.8, h: 3.8 },
  { x: -16.2, y: 24.8, h: 6.2 },
  { x: -11.5, y: 29.6, h: 7.7 },
  { x: -6.0, y: 31.2, h: 7.8 },
  { x: -0.5, y: 31.2, h: 7.8 },
  { x: 5.0, y: 31.2, h: 7.6 },
  { x: 7.0, y: 26.5, h: 7.9 },
  { x: 9.2, y: 24.6, h: 8.3 },
  { x: 12.5, y: 23.5, h: 8.6 },
  { x: 14.8, y: 19.0, h: 5.4 },
  { x: 14.6, y: 9.6, h: 0.4 },
];

// Wormhole conduit — climbs the right flank, crosses between the bumper clusters
// (each transit keeps the 1.05-radius tube >= ~0.25 clear of every boosted bumper),
// then bends down the west corridor and spits the ball up toward the drop doors.
export const TUNNEL_PATH: PathPt[] = [
  { x: 6.2, y: -8.0, h: 0.3 },
  { x: 5.4, y: -2.0, h: 1.6 },
  { x: 5.8, y: 3.5, h: 2.5 },
  { x: 5.5, y: 8.5, h: 3.4 },
  { x: 3.2, y: 9.8, h: 3.9 },
  { x: 1.9, y: 15.0, h: 4.5 },
  { x: 2.0, y: 17.3, h: 4.9 },
  { x: -2.8, y: 17.15, h: 4.85 },
  { x: -5.0, y: 17.9, h: 4.75 },
  { x: -9.2, y: 17.9, h: 4.55 },
  { x: -10.8, y: 17.3, h: 4.4 },
  { x: -11.0, y: 12.0, h: 3.2 },
  { x: -11.2, y: 7.5, h: 2.0 },
  { x: -11.9, y: 5.0, h: 0.3 },
];

export const table: TableDef = {
  id: 'deadStarDisco',
  drainY: -41,
  bounds: { minX: -24, maxX: 24, maxY: 40 },
  walls,
  circles,
  sensors,
  rides: [
    {
      id: 'ramp',
      entry: { x: -18.2, y: 7.2, r: 2.15 },
      path: RAMP_PATH, dur: 1.6,
      exit: { vx: -6, vy: -95 },
      gate: { minSpeed: 72, minVy: 42 },
    },
    {
      // Sensor only — the ball is captured and rides a 3D path, so the tunnel
      // never introduces a collision gap. Ejects straight up the west corridor.
      id: 'tunnel',
      entry: { x: 6.2, y: -8.0, r: 1.85 },
      path: TUNNEL_PATH, dur: 1.7,
      exit: { vx: -6.5, vy: 78 },
      gate: { maxSpeed: 85 },
      hideBall: true,
    },
  ],
  captures: [
    {
      id: 'scoop', x: -11.5, y: -3.5, r: 2.3,
      hold: 1.25, maxSpeed: 150, cooldown: 2.5,
      eject: { angle: Math.PI / 2, spread: 0.9, speed: 130, speedJitter: 30 },
    },
  ],
  kinematics: [
    // The Wrecker: spinning bar that swats low balls (hard+).
    {
      id: 'wrecker', kind: 'bar', cx: 0, cy: -14.5, half: 5.2, r: 0.55,
      speed: { default: 2.1, impossible: 3.4 }, rest: 0.65, swat: 0.55, minTier: 'hard',
    },
  ],
  // Flipper spacing is load-bearing: at rest the two tips must be more than
  // 2*(BALL_RADIUS + FLIPPER_R) = 5.8 apart or the ball physically cannot drain
  // between them and the game can never end.
  flippers: {
    left: { pivot: { x: -9.0, y: -31.2 }, rest: -0.78, active: 0.60 },
    right: { pivot: { x: 9.0, y: -31.2 }, rest: Math.PI + 0.78, active: Math.PI - 0.60 },
    len: 7.8, r: 1.35, upSpeed: 30, downSpeed: 10,
  },
  plunger: {
    x: 19.5, restY: -35.8, dividerX: 17, laneTopY: 22, holdBelowY: -28,
    cap: { x: 17, y: 17, r: 0.45 }, gate: { yMin: 16.5, yMax: 36 },
    launchBase: 80, launchRange: 175, autoLaunch: 235, skillZone: [0.32, 0.48],
  },
  heightAt,
  restZone: { maxY: -28.5, halfX: 11, watchHalfX: 12.5 },
  camera: { clampX: 14, minY: -34, maxY: 30 },
  flashDecay: {
    bumper: 2.6, sling: 3, lane: 2.2, scoop: 1.8, spinner: 2.5, orbit: 1.6,
    drain: 1.5, jackpot: 1.2, ramp: 1.3, tunnel: 1.3, kickback: 1.8, drop: 2.4, target: 2.5,
  },
};

// The tier ladder's copy is table-specific (it names this table's obstacles).
export const diffOverrides: DiffOverrides = {
  supereasy: { blurb: 'Slower gravity, dead bumpers, starter obstacles only.' },
  easy: { blurb: 'Slightly slower, less reactive — plus the upper pop bumpers.' },
  medium: { blurb: 'Tournament baseline + two extra obstacle sets.' },
  hard: { blurb: 'Livelier everything — and the Wrecker is spinning.' },
  impossible: { blurb: 'Everything faster, everything bouncier, everything angry.' },
};
