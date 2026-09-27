// Layer Lab — a fixture table that proves the engine's layers before any
// Salamander art exists. Dead Star Disco's chassis (arch, walls, slings,
// flippers, plunger, lanes, bumpers) on a flat field, plus one raised deck —
// the NEST — sitting OVER the pop-bumper cluster, so a ball can ride on top of
// it while another rolls underneath among the bumpers.
//
//   deck 'nest'  height 6, footprint x -10..10, y 9..25
//     side + back rails; the front rails slant down to a centre WATERFALL gap
//     (x -4..4 at y 9) so a deck ball can never park in a corner
//     two drop holes placed over clear field (checked by layers.check)
//   ride 'lift'  right-side mouth → wire over the right bank → onto the deck
//
// Pure data (no React) so the headless harness can import it.

import type { TableDef, WallSeg, LayerDef, PathPt } from '../../engine/types';
import { table as disco, sensors as discoSensors, RAMP_PATH } from '../deadStarDisco/table';

export const NEST = 'nest';

export const nest: LayerDef = {
  id: NEST,
  height: 6,
  outline: [[-10, 11.5], [-4, 9], [4, 9], [10, 11.5], [10, 25], [-10, 25]],
  holes: [
    // between the three main bumpers: clear field below
    { id: 'holeC', x: 0, y: 14.5, r: 1.9 },
    // back-right corner, clear of the upper-right bumper
    { id: 'holeR', x: 6.4, y: 23.2, r: 1.9 },
  ],
};

const nestRails: WallSeg[] = [
  { ax: -10, ay: 11.5, bx: -10, by: 25, rest: 0.4, kind: 'wall', id: 'nestL', layer: NEST },
  { ax: 10, ay: 11.5, bx: 10, by: 25, rest: 0.4, kind: 'wall', id: 'nestR', layer: NEST },
  { ax: -10, ay: 25, bx: 10, by: 25, rest: 0.4, kind: 'wall', id: 'nestBack', layer: NEST },
  // front rails slope down toward the waterfall so gravity always clears the corners
  { ax: -10, ay: 11.5, bx: -4, by: 9, rest: 0.35, kind: 'guide', id: 'nestFrontL', layer: NEST },
  { ax: 10, ay: 11.5, bx: 4, by: 9, rest: 0.35, kind: 'guide', id: 'nestFrontR', layer: NEST },
];

// Wire lift: mouth on the right field, climbs over the right bank and sets the
// ball down on the deck's right side heading left.
export const LIFT_PATH: PathPt[] = [
  { x: 12.8, y: -4.0, h: 0.3 },
  { x: 13.6, y: 2.0, h: 2.2 },
  { x: 13.4, y: 9.0, h: 4.6 },
  { x: 11.8, y: 15.5, h: 6.6 },
  { x: 8.6, y: 19.0, h: 6.8 },
  { x: 6.0, y: 18.6, h: 6.3 },
];

export const table: TableDef = {
  ...disco,
  id: 'layerLab',
  heightAt: () => 0, // flat field: the deck is a real layer, not a height bump
  walls: [...disco.walls, ...nestRails],
  // Dead Star Disco's field toys minus its standups/drops (keep the lab legible)
  circles: disco.circles.filter((c) => c.kind === 'bumper' || c.kind === 'post' || c.kind === 'kicker'),
  sensors: discoSensors.filter((s) => s.kind === 'lane' || s.kind === 'inlane' || s.kind === 'orbit'),
  rides: [
    { ...disco.rides.find((r) => r.id === 'ramp')!, path: RAMP_PATH },
    {
      id: 'lift',
      entry: { x: 12.8, y: -4.0, r: 1.9 },
      path: LIFT_PATH, dur: 1.4,
      exit: { vx: -22, vy: -6 },
      gate: { minSpeed: 45, minVy: 20 },
      exitLayer: NEST,
    },
  ],
  captures: [],
  layers: [nest],
};
