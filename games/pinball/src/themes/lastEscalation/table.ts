// The Last Escalation — TICKET #666. Table geometry (pure data, harness-importable).
//
// Built on Dead Star Disco's lower chassis (arch, walls, shooter lane, slings,
// return guides, flippers), like Salamander, so the flippers play the same.
// Everything above them is IT Shop of Horrors' Act IV, as toys:
//
//   D·N·S top lanes on the arch (skill shot, multiplier) — `lane0..2`
//   SERVER-RACK pop bumpers (three, mid-upper field) — `rack0..2`
//   THE CORE — top-centre capture under the lanes; lit in Act III
//   THE UNDEAD SERVER — a three-blade drop bank on the left (DSD's door spot)
//     that resurrects after every clear
//   THE TICKET QUEUE — spinner in the left lane, under the cable run
//   THE CABLE RUN — a momentum wire ramp from the left lane, over the top,
//     dropping down the right side to the right inlane
//   THE PRINTER THAT KNOWS — a saucer on the right
//   THE MIN PIN — an orbiter patrolling mid-field (easy+, see below)
//
// Obstacles tick up one set per tier, each in its own patch of open floor:
//   supereasy+  THE RUBBER DUCK — a big friendly post, upper right
//   easy+       THE MIN PIN — patrols mid-field (faster each tier)
//               THE PAGER — a spring kicker, upper left
//   medium+     THE FIREWALL — a post in the left-centre field
//               THE LEGACY SYSTEM — a slow flapper, lower right
//   hard+       THE ROLLBACK — DSD's spinning bar over the flippers
//               THE ZOMBIE PROCESS — an orbiter, left mid-field
//   impossible  AUTO-REMEDIATION — DSD's spring frickies above the flippers,
//               THE CHANGE ADVISORY BOARD convenes between the racks,
//               and THE TECH DEBT — a fast flapper, lower left
//
// Clearance rule as in Dead Star Disco; `npm test` soaks every tier.

import type { TableDef, CircleBody, Sensor, RideDef, CaptureDef, KinematicDef, PathPt } from '../../engine/types';
import type { DiffOverrides } from '../../engine/difficulty';
import { table as disco, sensors as discoSensors, RAMP_PATH } from '../deadStarDisco/table';

// ---------------- chassis (from Dead Star Disco) ----------------
const CHASSIS_WALLS = new Set(['outerL', 'outerR', 'divider', 'laneBottom']);
const chassis = disco.walls.filter((w) =>
  CHASSIS_WALLS.has(w.id) || w.id.startsWith('arc') || w.id.startsWith('guide') || w.kind === 'sling');

export const CORE_AT = { x: 0, y: 25 };
export const PRINTER_AT = { x: 10, y: 1 };
export const MINPIN_ORBIT = { cx: 1, cy: 3, orbit: 3.5 };

// ---------------- bodies ----------------
const circles: CircleBody[] = [
  // SERVER RACKS — every gap between them passes a ball (≥ 4.1)
  { x: -7, y: 17.5, r: 2.4, kind: 'bumper', id: 'rack0' },
  { x: 7, y: 17.5, r: 2.4, kind: 'bumper', id: 'rack1' },
  { x: 0, y: 12, r: 2.4, kind: 'bumper', id: 'rack2' },
  // D·N·S lane separators (as Salamander)
  { x: -3.4, y: 31, r: 0.55, kind: 'post', id: 'lanePost0', rest: 0.7 },
  { x: 3.4, y: 31, r: 0.55, kind: 'post', id: 'lanePost1', rest: 0.7 },
  // THE UNDEAD SERVER — blades at Dead Star Disco's door spot (2.2 apart: sealed while up)
  { x: -15.2, y: 12.2, r: 1.05, kind: 'drop', id: 'srv0' },
  { x: -15.2, y: 14.4, r: 1.05, kind: 'drop', id: 'srv1' },
  { x: -15.2, y: 16.6, r: 1.05, kind: 'drop', id: 'srv2' },
  // THE FIREWALL (medium+) — Salamander's spire spot
  { x: -5.5, y: -5, r: 0.6, kind: 'post', id: 'firewall', rest: 0.85, minTier: 'medium' },
  // THE CHANGE ADVISORY BOARD (impossible) — between the racks
  { x: 0, y: 17.6, r: 0.62, kind: 'post', id: 'cab', rest: 0.95, minTier: 'impossible' },
  // THE RUBBER DUCK (every tier) — the open upper right; 4.6 from the divider, 8.4 from rack1
  { x: 12.4, y: 11, r: 1.0, kind: 'post', id: 'duck', rest: 0.8, minTier: 'supereasy' },
  // THE PAGER (easy+) — a spring kicker in the open upper left, clear of rack0, the arch and the blades
  { x: -12, y: 23, r: 0.8, kind: 'kicker', id: 'pager', rest: 1.0, minTier: 'easy' },
  // AUTO-REMEDIATION (impossible) — Dead Star Disco's frickies
  { x: -7.2, y: -22.6, r: 0.8, kind: 'kicker', id: 'fk0', rest: 1.0, minTier: 'impossible' },
  { x: 7.2, y: -22.6, r: 0.8, kind: 'kicker', id: 'fk1', rest: 1.0, minTier: 'impossible' },
];

export const sensors: Sensor[] = [
  // D·N·S lanes ride the arch, exactly as on Dead Star Disco (skill shot), plus the inlanes
  ...discoSensors.filter((s) => s.kind === 'lane' || s.kind === 'inlane'),
  // THE TICKET QUEUE — left lane, below the cable run's entry
  { x: -18.6, y: 0, r: 2.0, kind: 'spinner', id: 'queue' },
];

export const captures: CaptureDef[] = [
  // THE PRINTER THAT KNOWS — kicks back toward the middle (Salamander's right saucer spot)
  { id: 'printer', x: PRINTER_AT.x, y: PRINTER_AT.y, r: 2.1, hold: 1.2, maxSpeed: 140, cooldown: 2.5, eject: { angle: Math.PI / 2 + 0.5, spread: 0.4, speed: 115, speedJitter: 20 } },
  // THE CORE — spits the ball back up into the D·N·S lanes
  { id: 'core', x: CORE_AT.x, y: CORE_AT.y, r: 2.2, hold: 1.0, maxSpeed: 150, cooldown: 2.5, eject: { angle: Math.PI / 2, spread: 1.2, speed: 100, speedJitter: 20 } },
];

// THE CABLE RUN — Dead Star Disco's wire path, flown with momentum. Its rails
// stay out of the shooter lane (wires.check), and it lets go heading down the
// right side to the right inlane.
export const CABLE_RUN: PathPt[] = RAMP_PATH;

const rides: RideDef[] = [
  {
    id: 'cableRun', art: 'wire',
    entry: { x: -18.2, y: 7.2, r: 2.15 },
    path: CABLE_RUN, dur: 1.6,
    exit: { vx: -6, vy: -95 },
    gate: { minSpeed: 72, minVy: 42 },
    carry: { keep: 0.5, min: 38, max: 80 },
  },
];

const kinematics: KinematicDef[] = [
  // THE MIN PIN (easy+) — patrols a small circle in the middle of the field, faster each tier
  { id: 'minpin', kind: 'orbiter', cx: MINPIN_ORBIT.cx, cy: MINPIN_ORBIT.cy, r: 1.2, orbit: MINPIN_ORBIT.orbit, phase: 0, speed: { default: 1.3, easy: 1.0, hard: 1.7, impossible: 2.1 }, rest: 0.7, swat: 0.6, minTier: 'easy' },
  // THE LEGACY SYSTEM (medium+) — a slow flapper in the open lower right, clear of the printer and the sling
  { id: 'legacy', kind: 'bar', motion: 'swing', cx: 9.5, cy: -5.5, half: 2.5, r: 0.55, amp: 0.5, base: 0, speed: { default: 1.2, hard: 1.5, impossible: 1.8 }, rest: 0.6, swat: 0.45, minTier: 'medium' },
  // THE ZOMBIE PROCESS (hard+) — circles the open left mid-field; it never quite dies
  { id: 'zombie', kind: 'orbiter', cx: -11.5, cy: 4.5, r: 1.0, orbit: 2.3, phase: Math.PI, speed: { default: 1.4, impossible: 1.8 }, rest: 0.7, swat: 0.6, minTier: 'hard' },
  // THE TECH DEBT (impossible) — a fast flapper in the open lower left, 3.85 clear of the Firewall
  { id: 'techdebt', kind: 'bar', motion: 'swing', cx: -13, cy: -4.5, half: 2.5, r: 0.55, amp: 0.6, base: 0, speed: { default: 2.2 }, rest: 0.65, swat: 0.55, minTier: 'impossible' },
  // THE ROLLBACK (hard+) — Dead Star Disco's Wrecker
  { id: 'rollback', kind: 'bar', cx: 0, cy: -14.5, half: 5.2, r: 0.55, speed: { default: 2.1, impossible: 3.4 }, rest: 0.65, swat: 0.55, minTier: 'hard' },
];

export const table: TableDef = {
  ...disco,
  id: 'lastEscalation',
  heightAt: () => 0, // flat floor: the raised floor is a later stretch goal
  walls: chassis,
  circles,
  sensors,
  rides,
  captures,
  kinematics,
  layers: undefined,
  flashDecay: {
    bumper: 2.6, sling: 3, lane: 2.2, spinner: 2.5, drain: 1.5, jackpot: 1.2,
    printer: 1.6, core: 1.2, server: 2.4, minpin: 2.0, ramp: 1.3, post: 2.5, kicker: 2.5,
    silence: 0.5, powerdown: 0.6, takeover: 0.8, save: 1.2,
    duck: 2.4, pager: 2.4, legacy: 2.4, zombie: 2.4, techdebt: 2.4,
  },
};

export const diffOverrides: DiffOverrides = {
  supereasy: { blurb: 'Read-only access: just THE RUBBER DUCK. The Min Pin stays home.' },
  easy: { blurb: '+ THE MIN PIN starts its patrol, and THE PAGER goes off.' },
  medium: { blurb: '+ THE FIREWALL goes up, and THE LEGACY SYSTEM creaks into motion.' },
  hard: { blurb: '+ THE ROLLBACK spins over the flippers, and a ZOMBIE PROCESS wanders.' },
  impossible: { blurb: '+ AUTO-REMEDIATION, THE CHANGE ADVISORY BOARD and THE TECH DEBT. Everything is a ticket.' },
};
