// Salamander — THE FIRE TRIAL. Table geometry (pure data, harness-importable).
//
// Recreated at engine scale from the fire-salamander prototype — not ported.
// The lower chassis (arch, walls, shooter lane, slings, return guides,
// flippers) is Dead Star Disco's, so the flippers play identically; everything
// above is Salamander's own:
//
//   EMBER NEST (layer 'nest', h 5.5) — a wide raised deck over the middle of
//     the table. Zig-zag front rails slope into two WATERFALL gaps; DROP holes
//     in the front corners; a row of three FIRE BELLS; the ASH PENDULUM
//     (medium+) over the tent.
//   Field (runs under the nest — the beacon shows a ball down there):
//     H-O-T top lanes on the arch, in view above the nest (skill shot); two
//     ember pop bumpers; THE MAW mid-field with CINDER MOONS circling it
//     (hard+); EMBER HOLD saucers left/right; a spinner on the left orbit; the
//     EMBER SPIRE (easy+); INFERNO VENTS over the flippers (impossible).
//     The field under the nest is kept clear, so a ball down there can't meet
//     hidden trouble.
//   Rides (momentum-carrying): ramps L/R → nest · SERPENT TUNNEL (hidden, snakes to the left inlane)
//     · SKYSHOT (full-power plunge → nest) · internal VOLCANO (saucer → nest)
//     and MAW SPIT (maw → nest), started by the rules.
//
// Clearance rule as in Dead Star Disco; `npm test` soaks the field AND the nest.

import type { TableDef, WallSeg, CircleBody, Sensor, LayerDef, RideDef, CaptureDef, KinematicDef, PathPt } from '../../engine/types';
import type { DiffOverrides } from '../../engine/difficulty';
import { table as disco, sensors as discoSensors } from '../deadStarDisco/table';

export const NEST = 'nest';
export const NEST_H = 5.5;

// ---------------- the Ember Nest ----------------
// A wide deck over the middle of the table. Its back edge stops short of the
// top lanes so H-O-T stays in view. Flow on the deck runs back → front: rides
// land at the back corners heading inward, cross the FIRE BELL row, and leave
// through a front WATERFALL gap or a DROP hole in a front corner — never
// straight from a landing into a hole.
// Front edge: slope → gap → tent → gap → slope, so gravity always carries a
// ball to a waterfall. Sides and back are railed.
export const NEST_BACK = 27.5;
export const NEST_FRONT = 12.5;
export const NEST_OUTLINE: [number, number][] = [
  [-16.5, 15], [-9.5, NEST_FRONT], [-5, NEST_FRONT], [0, 15], [5, NEST_FRONT], [9.5, NEST_FRONT], [15.5, 15],
  [15.5, 24], [12, NEST_BACK], [-13, NEST_BACK], [-16.5, 24],
];

export const nest: LayerDef = {
  id: NEST,
  height: NEST_H,
  outline: NEST_OUTLINE,
  holes: [
    { id: 'dropL', x: -12.5, y: 17.5, r: 1.9 },
    { id: 'dropR', x: 11.5, y: 17.5, r: 1.9 },
  ],
};

const rail = (id: string, ax: number, ay: number, bx: number, by: number, kind: WallSeg['kind'] = 'wall'): WallSeg =>
  ({ ax, ay, bx, by, rest: 0.4, kind, id, layer: NEST });

const nestRails: WallSeg[] = [
  rail('nestFrontL', -16.5, 15, -9.5, NEST_FRONT, 'guide'),
  rail('nestTentL', -5, NEST_FRONT, 0, 15, 'guide'),
  rail('nestTentR', 0, 15, 5, NEST_FRONT, 'guide'),
  rail('nestFrontR', 9.5, NEST_FRONT, 15.5, 15, 'guide'),
  rail('nestSideR', 15.5, 15, 15.5, 24),
  rail('nestCornerR', 15.5, 24, 12, NEST_BACK),
  rail('nestBack', 12, NEST_BACK, -13, NEST_BACK),
  rail('nestCornerL', -13, NEST_BACK, -16.5, 24),
  rail('nestSideL', -16.5, 24, -16.5, 15),
];

// ---------------- chassis (from Dead Star Disco) ----------------
const CHASSIS_WALLS = new Set(['outerL', 'outerR', 'divider', 'laneBottom']);
const chassis = disco.walls.filter((w) =>
  CHASSIS_WALLS.has(w.id) || w.id.startsWith('arc') || w.id.startsWith('guide') || w.kind === 'sling');

// ---------------- field + nest bodies ----------------
export const MAW_AT = { x: 0, y: 3 };

const circles: CircleBody[] = [
  // FIRE BELLS — a row across the nest. Bell↔bell and bell↔back-rail gaps are
  // all sealed (narrower than a ball), so nothing can get behind the row; an
  // earlier layout left a pocket where a ball ping-ponged between bells forever.
  { x: -7, y: 23, r: 2.0, kind: 'bumper', id: 'bell0', layer: NEST },
  { x: 0, y: 23, r: 2.0, kind: 'bumper', id: 'bell1', layer: NEST },
  { x: 7, y: 23, r: 2.0, kind: 'bumper', id: 'bell2', layer: NEST },
  // Bell stands: plug the two lens-shaped pockets between neighbouring bells
  // and the back rail (unreachable, but a ball in one would never get out).
  { x: -3.5, y: 25.8, r: 0.8, kind: 'post', id: 'nestStand0', rest: 0.6, layer: NEST },
  { x: 3.5, y: 25.8, r: 0.8, kind: 'post', id: 'nestStand1', rest: 0.6, layer: NEST },
  // ember pop bumpers on the field, out wide
  { x: -13.5, y: 8, r: 2.2, kind: 'bumper', id: 'ember0' },
  { x: 13.5, y: 8, r: 2.2, kind: 'bumper', id: 'ember1' },
  // lane separators — above the nest's back rail, in plain view
  { x: -3.4, y: 31, r: 0.55, kind: 'post', id: 'lanePost0', rest: 0.7 },
  { x: 3.4, y: 31, r: 0.55, kind: 'post', id: 'lanePost1', rest: 0.7 },
  // EMBER SPIRE (easy+)
  { x: -5.5, y: -5, r: 0.6, kind: 'post', id: 'spire', rest: 0.85, minTier: 'easy' },
];

export const sensors: Sensor[] = [
  // top lanes ride the arch, exactly as on Dead Star Disco (skill shot)
  ...discoSensors.filter((s) => s.kind === 'lane' || s.kind === 'inlane'),
  // spinner on the left orbit, in front of the left ramp
  { x: -18.5, y: -5, r: 2.0, kind: 'spinner', id: 'spinner' },
  // INFERNO VENTS (impossible): blast pads over the flippers
  { x: -6.5, y: -20, r: 1.4, kind: 'vent', id: 'ventL', minTier: 'impossible', blast: { speed: 140, angle: Math.PI / 2, spread: 0.6, cooldown: 1.15 } },
  { x: 6.5, y: -20, r: 1.4, kind: 'vent', id: 'ventR', minTier: 'impossible', blast: { speed: 140, angle: Math.PI / 2, spread: 0.6, cooldown: 1.15 } },
];

export const captures: CaptureDef[] = [
  // THE MAW — eject up-table; the rules sometimes turn it into a spit to the nest
  { id: 'maw', x: MAW_AT.x, y: MAW_AT.y, r: 2.4, hold: 1.1, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2, spread: 1.2, speed: 110, speedJitter: 25 } },
  // EMBER HOLD saucers — kick back toward the middle
  { id: 'holdL', x: -10.5, y: 1.5, r: 2.1, hold: 0.9, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2 - 0.5, spread: 0.4, speed: 115, speedJitter: 20 } },
  { id: 'holdR', x: 10, y: 1, r: 2.1, hold: 0.9, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2 + 0.5, spread: 0.4, speed: 115, speedJitter: 20 } },
];

// ---------------- rides ----------------
// Ramps, Skyshot, Volcano and Maw Spit all keep the ball's momentum (`carry`)
// and land at the nest's back corners heading inward, into the bell row.
const CARRY = { keep: 0.5, min: 38, max: 80 };

export const RAMP_L: PathPt[] = [
  { x: -18.5, y: 0, h: 0.3 }, { x: -19.5, y: 8, h: 2.5 }, { x: -19.5, y: 16, h: 5.2 },
  { x: -18.5, y: 22, h: 7.2 }, { x: -15.5, y: 25.3, h: 7.4 }, { x: -11.5, y: 24.6, h: 5.8 },
];
export const RAMP_R: PathPt[] = [
  { x: 14.5, y: -2, h: 0.3 }, { x: 15.8, y: 5, h: 2.6 }, { x: 16.2, y: 12, h: 5.6 },
  { x: 16.2, y: 18, h: 7.4 }, { x: 15, y: 26, h: 7.5 }, { x: 11.5, y: 24.8, h: 5.8 },
];
// The serpent snakes over the front field and lets go on the left inlane.
export const SERPENT: PathPt[] = [
  { x: 6, y: -7, h: 0.3 }, { x: 8.5, y: -2.5, h: 2.6 }, { x: 4, y: -1, h: 3.8 }, { x: -2, y: -3, h: 4 },
  { x: -8, y: -1, h: 4 }, { x: -13.5, y: -4, h: 3.8 }, { x: -17, y: -10, h: 3.2 },
  { x: -16.5, y: -18, h: 2.2 }, { x: -14.5, y: -23.5, h: 0.5 },
];
export const SKYSHOT: PathPt[] = [
  { x: 19.5, y: 20, h: 0.3 }, { x: 19, y: 27, h: 2.5 }, { x: 16.5, y: 31.5, h: 5.5 },
  { x: 16, y: 28.5, h: 7.6 }, { x: 11.5, y: 24.8, h: 5.8 },
];
export const VOLCANO_L: PathPt[] = [
  { x: -10.5, y: 1.5, h: 0.3 }, { x: -15, y: 8, h: 3.8 }, { x: -18, y: 16, h: 7 },
  { x: -16.5, y: 23.5, h: 7.6 }, { x: -11.5, y: 24.6, h: 5.8 },
];
export const VOLCANO_R: PathPt[] = [
  { x: 10, y: 1, h: 0.3 }, { x: 14.5, y: 8, h: 3.8 }, { x: 17, y: 16, h: 7 },
  { x: 15, y: 26, h: 7.6 }, { x: 11.5, y: 24.8, h: 5.8 },
];
export const MAW_SPIT: PathPt[] = [
  { x: MAW_AT.x, y: MAW_AT.y, h: 0.3 }, { x: -3, y: 10, h: 5.5 }, { x: -8, y: 18, h: 9 },
  { x: -14.5, y: 25, h: 7.6 }, { x: -11.5, y: 24.6, h: 5.8 },
];

const rides: RideDef[] = [
  { id: 'rampL', entry: { x: -18.5, y: 0, r: 2.0 }, path: RAMP_L, dur: 1.2, exit: { vx: 0, vy: 0 }, gate: { minSpeed: 70, minVy: 40 }, exitLayer: NEST, carry: CARRY },
  { id: 'rampR', entry: { x: 14.5, y: -2, r: 2.0 }, path: RAMP_R, dur: 1.2, exit: { vx: 0, vy: 0 }, gate: { minSpeed: 70, minVy: 40 }, exitLayer: NEST, carry: CARRY },
  { id: 'serpent', entry: { x: 6, y: -7, r: 1.9 }, path: SERPENT, dur: 2.0, exit: { vx: 8, vy: -30 }, gate: { maxSpeed: 95 }, hideBall: true },
  { id: 'skyshot', entry: { x: 19.5, y: 20, r: 2.0 }, path: SKYSHOT, dur: 1.1, exit: { vx: 0, vy: 0 }, gate: { minLaunchPower: 0.85 }, exitLayer: NEST, carry: CARRY },
  { id: 'volcanoL', internal: true, entry: { x: -10.5, y: 1.5, r: 0 }, path: VOLCANO_L, dur: 1.1, exit: { vx: 0, vy: 0 }, gate: {}, exitLayer: NEST, carry: CARRY },
  { id: 'volcanoR', internal: true, entry: { x: 10, y: 1, r: 0 }, path: VOLCANO_R, dur: 1.1, exit: { vx: 0, vy: 0 }, gate: {}, exitLayer: NEST, carry: CARRY },
  { id: 'mawSpit', internal: true, entry: { x: MAW_AT.x, y: MAW_AT.y, r: 0 }, path: MAW_SPIT, dur: 1.3, exit: { vx: 0, vy: 0 }, gate: {}, exitLayer: NEST, carry: CARRY },
];

const kinematics: KinematicDef[] = [
  // ASH PENDULUM (medium+) — flaps over the tent, batting balls from the bells toward the waterfalls
  {
    id: 'pendulum', kind: 'bar', motion: 'swing', layer: NEST, cx: 0, cy: 17.4, half: 2.0, r: 0.5,
    amp: 0.5, base: 0, speed: { default: 2.4, impossible: 3.0 }, rest: 0.65, swat: 0.5, minTier: 'medium',
  },
  // CINDER MOONS (hard+) — two cinders circling THE MAW
  { id: 'moonA', kind: 'orbiter', cx: MAW_AT.x, cy: MAW_AT.y, r: 1.1, orbit: 4.2, phase: 0, speed: { default: 1.6, impossible: 2.1 }, rest: 0.7, swat: 0.6, minTier: 'hard' },
  { id: 'moonB', kind: 'orbiter', cx: MAW_AT.x, cy: MAW_AT.y, r: 1.1, orbit: 4.2, phase: Math.PI, speed: { default: 1.6, impossible: 2.1 }, rest: 0.7, swat: 0.6, minTier: 'hard' },
];

export const table: TableDef = {
  ...disco,
  id: 'salamander',
  heightAt: () => 0, // flat field — the nest is a real layer
  walls: [...chassis, ...nestRails],
  circles,
  sensors,
  rides,
  captures,
  kinematics,
  layers: [nest],
  flashDecay: {
    bumper: 2.6, sling: 3, lane: 2.2, spinner: 2.5, drain: 1.5, jackpot: 1.2,
    maw: 1.4, hold: 1.8, ramp: 1.3, serpent: 1.1, vent: 1.8, nest: 1.2, inferno: 0.8,
  },
};

export const diffOverrides: DiffOverrides = {
  supereasy: { blurb: 'A gentle flame: slower gravity, the nest wide open.' },
  easy: { blurb: 'The EMBER SPIRE rises in the middle of the field.' },
  medium: { blurb: 'The ASH PENDULUM starts swinging on the nest.' },
  hard: { blurb: 'Two CINDER MOONS circle THE MAW.' },
  impossible: { blurb: 'INFERNO VENTS over the flippers. Everything burns.' },
};
