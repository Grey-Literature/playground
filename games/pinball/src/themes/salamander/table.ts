// Salamander — THE FIRE TRIAL. Table geometry (pure data, harness-importable).
//
// Recreated at engine scale from the fire-salamander prototype — not ported.
// The lower chassis (arch, walls, shooter lane, slings, return guides,
// flippers) is Dead Star Disco's, so the flippers play identically; everything
// above is Salamander's own:
//
//   EMBER NEST (layer 'nest', h 5.5) — a raised deck over the back of the table.
//     Zig-zag front rails slope into two WATERFALL gaps; two DROP holes; three
//     FIRE BELLS on top; the ASH PENDULUM (medium+) flaps at its front.
//   Field (runs under the nest — the beacon shows a ball down there):
//     top lanes on the arch (skill shot), two ember pop bumpers, THE MAW at the
//     centre, EMBER HOLD saucers left/right, a spinner, the EMBER SPIRE (easy+),
//     CINDER MOONS orbiting (hard+), INFERNO VENTS over the flippers (impossible).
//   Rides: ramps L/R → nest · SERPENT TUNNEL (hidden, snakes to the left inlane)
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
// Front edge: slope → gap → tent → gap → slope, so gravity always carries a ball
// to a waterfall. Sides and back are railed.
export const NEST_OUTLINE: [number, number][] = [
  [-16, 21.5], [-10, 18.5], [-5.5, 18.5], [0, 21], [5.5, 18.5], [10, 18.5], [15, 21.5],
  [15, 27], [10.5, 31.5], [-10.5, 31.5], [-16, 27],
];

export const nest: LayerDef = {
  id: NEST,
  height: NEST_H,
  outline: NEST_OUTLINE,
  holes: [
    { id: 'dropL', x: -11.5, y: 25, r: 1.9 },
    { id: 'dropR', x: 11.5, y: 25, r: 1.9 },
  ],
};

const rail = (id: string, ax: number, ay: number, bx: number, by: number, kind: WallSeg['kind'] = 'wall'): WallSeg =>
  ({ ax, ay, bx, by, rest: 0.4, kind, id, layer: NEST });

const nestRails: WallSeg[] = [
  rail('nestFrontL', -16, 21.5, -10, 18.5, 'guide'),
  rail('nestTentL', -5.5, 18.5, 0, 21, 'guide'),
  rail('nestTentR', 0, 21, 5.5, 18.5, 'guide'),
  rail('nestFrontR', 10, 18.5, 15, 21.5, 'guide'),
  rail('nestSideR', 15, 21.5, 15, 27),
  rail('nestCornerR', 15, 27, 10.5, 31.5),
  rail('nestBack', 10.5, 31.5, -10.5, 31.5),
  rail('nestCornerL', -10.5, 31.5, -16, 27),
  rail('nestSideL', -16, 27, -16, 21.5),
];

// ---------------- chassis (from Dead Star Disco) ----------------
const CHASSIS_WALLS = new Set(['outerL', 'outerR', 'divider', 'laneBottom']);
const chassis = disco.walls.filter((w) =>
  CHASSIS_WALLS.has(w.id) || w.id.startsWith('arc') || w.id.startsWith('guide') || w.kind === 'sling');

// ---------------- field + nest bodies ----------------
const circles: CircleBody[] = [
  // FIRE BELLS — nest-layer bumpers. Spacing is load-bearing: bell↔bell gaps
  // are 3.76 (a ball passes), the middle bell sits 2.5 off the back rail (sealed —
  // nothing gets behind it). An earlier tighter triangle left a pocket where a
  // ball ping-ponged between two bells forever.
  { x: -7.5, y: 25, r: 2.0, kind: 'bumper', id: 'bell0', layer: NEST },
  { x: 0, y: 27, r: 2.0, kind: 'bumper', id: 'bell1', layer: NEST },
  { x: 7.5, y: 25, r: 2.0, kind: 'bumper', id: 'bell2', layer: NEST },
  // ember pop bumpers on the field
  { x: -10, y: 13, r: 2.4, kind: 'bumper', id: 'ember0' },
  { x: 10, y: 13, r: 2.4, kind: 'bumper', id: 'ember1' },
  // lane separators on the arch (under the nest's back edge)
  { x: -3.4, y: 29.6, r: 0.55, kind: 'post', id: 'lanePost0', rest: 0.7 },
  { x: 3.4, y: 29.6, r: 0.55, kind: 'post', id: 'lanePost1', rest: 0.7 },
  // EMBER SPIRE (easy+)
  { x: 5.5, y: 1.5, r: 0.6, kind: 'post', id: 'spire', rest: 0.85, minTier: 'easy' },
];

export const sensors: Sensor[] = [
  // top lanes ride the arch, exactly as on Dead Star Disco (skill shot)
  ...discoSensors.filter((s) => s.kind === 'lane' || s.kind === 'inlane'),
  { x: -7.5, y: 8, r: 2.0, kind: 'spinner', id: 'spinner' },
  // INFERNO VENTS (impossible): blast pads over the flippers
  { x: -6.5, y: -20, r: 1.4, kind: 'vent', id: 'ventL', minTier: 'impossible', blast: { speed: 140, angle: Math.PI / 2, spread: 0.6, cooldown: 1.15 } },
  { x: 6.5, y: -20, r: 1.4, kind: 'vent', id: 'ventR', minTier: 'impossible', blast: { speed: 140, angle: Math.PI / 2, spread: 0.6, cooldown: 1.15 } },
];

export const captures: CaptureDef[] = [
  // THE MAW — eject up-table; the rules sometimes turn it into a spit to the nest
  { id: 'maw', x: 0, y: 5, r: 2.4, hold: 1.1, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2, spread: 1.2, speed: 110, speedJitter: 25 } },
  // EMBER HOLD saucers — kick back toward the middle
  { id: 'holdL', x: -13, y: 1, r: 2.1, hold: 0.9, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2 - 0.5, spread: 0.4, speed: 115, speedJitter: 20 } },
  { id: 'holdR', x: 12.5, y: -1, r: 2.1, hold: 0.9, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2 + 0.5, spread: 0.4, speed: 115, speedJitter: 20 } },
];

// ---------------- rides ----------------
export const RAMP_L: PathPt[] = [
  { x: -17, y: 6, h: 0.3 }, { x: -18.5, y: 12, h: 2.0 }, { x: -18.5, y: 17.5, h: 4.0 },
  { x: -16, y: 21.5, h: 5.6 }, { x: -12, y: 23, h: 5.8 },
];
export const RAMP_R: PathPt[] = [
  { x: 12.5, y: 6, h: 0.3 }, { x: 14, y: 12, h: 2.2 }, { x: 14.5, y: 17, h: 4.2 },
  { x: 13.2, y: 21.5, h: 5.6 }, { x: 12, y: 23, h: 5.8 },
];
// The serpent snakes over the field and lets go on the left inlane.
export const SERPENT: PathPt[] = [
  { x: 7.5, y: -6, h: 0.3 }, { x: 9, y: 1, h: 2.5 }, { x: 5, y: 9, h: 4 }, { x: -1, y: 10.5, h: 4.5 },
  { x: -6, y: 14, h: 4.5 }, { x: -11, y: 9, h: 4 }, { x: -15, y: 0, h: 3.5 }, { x: -17, y: -10, h: 3 },
  { x: -16, y: -19, h: 2 }, { x: -14.5, y: -23.5, h: 0.5 },
];
export const SKYSHOT: PathPt[] = [
  { x: 19.5, y: 20, h: 0.3 }, { x: 19, y: 27, h: 2.5 }, { x: 16.5, y: 32, h: 5 },
  { x: 12, y: 32.6, h: 6.5 }, { x: 10.5, y: 28.5, h: 5.8 },
];
export const VOLCANO_L: PathPt[] = [
  { x: -13, y: 1, h: 0.3 }, { x: -15, y: 8, h: 3.5 }, { x: -15, y: 15, h: 6.5 }, { x: -12, y: 23, h: 5.8 },
];
export const VOLCANO_R: PathPt[] = [
  { x: 12.5, y: -1, h: 0.3 }, { x: 14.5, y: 7, h: 3.5 }, { x: 14.5, y: 15, h: 6.5 }, { x: 12, y: 23, h: 5.8 },
];
export const MAW_SPIT: PathPt[] = [
  { x: 0, y: 5, h: 0.3 }, { x: -3, y: 12, h: 5 }, { x: -7, y: 20, h: 8 }, { x: -10.5, y: 28.5, h: 5.8 },
];

const rides: RideDef[] = [
  { id: 'rampL', entry: { x: -17, y: 6, r: 2.0 }, path: RAMP_L, dur: 1.2, exit: { vx: 22, vy: 10 }, gate: { minSpeed: 70, minVy: 40 }, exitLayer: NEST },
  { id: 'rampR', entry: { x: 12.5, y: 6, r: 2.0 }, path: RAMP_R, dur: 1.2, exit: { vx: -22, vy: 10 }, gate: { minSpeed: 70, minVy: 40 }, exitLayer: NEST },
  { id: 'serpent', entry: { x: 7.5, y: -6, r: 1.9 }, path: SERPENT, dur: 2.2, exit: { vx: 8, vy: -30 }, gate: { maxSpeed: 95 }, hideBall: true },
  { id: 'skyshot', entry: { x: 19.5, y: 20, r: 2.0 }, path: SKYSHOT, dur: 1.1, exit: { vx: -15, vy: -5 }, gate: { minLaunchPower: 0.85 }, exitLayer: NEST },
  { id: 'volcanoL', internal: true, entry: { x: -13, y: 1, r: 0 }, path: VOLCANO_L, dur: 1.1, exit: { vx: 18, vy: 8 }, gate: {}, exitLayer: NEST },
  { id: 'volcanoR', internal: true, entry: { x: 12.5, y: -1, r: 0 }, path: VOLCANO_R, dur: 1.1, exit: { vx: -18, vy: 8 }, gate: {}, exitLayer: NEST },
  { id: 'mawSpit', internal: true, entry: { x: 0, y: 5, r: 0 }, path: MAW_SPIT, dur: 1.3, exit: { vx: 8, vy: -4 }, gate: {}, exitLayer: NEST },
];

const kinematics: KinematicDef[] = [
  // ASH PENDULUM (medium+) — flaps at the nest's front, batting balls toward the waterfalls
  {
    id: 'pendulum', kind: 'bar', motion: 'swing', layer: NEST, cx: 0, cy: 22.8, half: 2.2, r: 0.5,
    amp: 0.55, base: 0, speed: { default: 2.4, impossible: 3.0 }, rest: 0.65, swat: 0.5, minTier: 'medium',
  },
  // CINDER MOONS (hard+) — two orbiting cinders in front of the nest
  { id: 'moonA', kind: 'orbiter', cx: 0, cy: 16, r: 1.1, orbit: 4.5, phase: 0, speed: { default: 1.6, impossible: 2.1 }, rest: 0.7, swat: 0.6, minTier: 'hard' },
  { id: 'moonB', kind: 'orbiter', cx: 0, cy: 16, r: 1.1, orbit: 4.5, phase: Math.PI, speed: { default: 1.6, impossible: 2.1 }, rest: 0.7, swat: 0.6, minTier: 'hard' },
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
  hard: { blurb: 'Two CINDER MOONS orbit in front of the nest.' },
  impossible: { blurb: 'INFERNO VENTS over the flippers. Everything burns.' },
};
