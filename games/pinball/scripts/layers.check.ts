// Engine layers (decks) — every table with `layers`, every tier:
//   1. ride → deck      rides with exitLayer land ON the deck, inside it, clear, one event
//   2. landing zones    under each drop hole / along each rail-less (waterfall) edge,
//                       the field is clear, so a falling ball never lands in a toy
//   3. never stranded   random deck balls all leave (hole / waterfall) within 6 s,
//                       each fall emits exactly one layer event
//   4. under = under    a deck ball ignores field bodies and a field ball ignores deck
//                       rails (no push when overlapping the other layer's collider)
// Tables without layers are skipped.

import {
  TABLES, DIFF_ORDER, DIFF, TABLE, ACTIVE, gameRef, useTable, resetField, mkBall, step,
  clearance, onDeck, segDist, reseed, rnd, pad, FIELD, layerSet, type TableEntry,
} from './harness';
import type { LayerDef } from '../src/engine/types';

let bad = 0;
const fail = (msg: string) => { bad++; console.log(`  <-- ${msg}`); };

/** Points along the deck outline that have no rail on the deck's own layer. */
function openEdgePoints(deck: LayerDef) {
  const rails = layerSet(deck.id).walls;
  const pts: { x: number; y: number; nx: number; ny: number }[] = [];
  const o = deck.outline;
  // outward normal needs the winding: signed area > 0 = CCW
  let area = 0;
  for (let i = 0; i < o.length; i++) { const [x1, y1] = o[i], [x2, y2] = o[(i + 1) % o.length]; area += x1 * y2 - x2 * y1; }
  const ccw = area > 0;
  for (let i = 0; i < o.length; i++) {
    const [ax, ay] = o[i], [bx, by] = o[(i + 1) % o.length];
    const len = Math.hypot(bx - ax, by - ay);
    const tx = (bx - ax) / len, ty = (by - ay) / len;
    const nx = ccw ? ty : -ty, ny = ccw ? -tx : tx;
    for (let k = 1; k < Math.max(2, Math.round(len / 0.5)); k++) {
      const x = ax + tx * k * 0.5, y = ay + ty * k * 0.5;
      const railed = rails.some((w) => segDist(x, y, w.ax, w.ay, w.bx, w.by) < 0.5);
      if (!railed) pts.push({ x, y, nx, ny });
    }
  }
  return pts;
}

function checkTable(entry: TableEntry) {
  useTable(entry, 'medium');
  const decks = TABLE.layers ?? [];
  if (!decks.length) { console.log(`\n[${entry.id}] no layers — skipped`); return; }
  console.log(`\n[${entry.id}] layers: ${decks.map((d) => `${d.id} (h ${d.height}, ${d.holes.length} holes)`).join(', ')}`);

  for (const tier of DIFF_ORDER) {
    useTable(entry, tier);
    const row: string[] = [];

    // 1. ride → deck
    for (const ride of TABLE.rides.filter((r) => r.exitLayer && !r.internal)) {
      resetField();
      if (ride.gate.minLaunchPower !== undefined) { gameRef.skillWindow = 5; gameRef.lastLaunchPower = 1; }
      const p0 = ride.path[0], p1 = ride.path[1];
      const dl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      const dx = (p1.x - p0.x) / dl, dy = (p1.y - p0.y) / dl;
      const g = ride.gate;
      const speed = g.minSpeed !== undefined ? g.minSpeed + 58 : g.maxSpeed !== undefined ? g.maxSpeed / 2 : 60;
      const back = ride.entry.r + 0.6;
      const b = mkBall(ride.entry.x - dx * back, ride.entry.y - dy * back, dx * speed, dy * speed, 0);
      gameRef.balls.push(b);
      let events = 0, landed = false;
      for (let s = 0; s < 120 * 6 && b.active; s++) {
        for (const e of step()) if (e.type === 'layer' && e.via === 'ride') events++;
        if (!b.ride && events) { landed = true; break; }
      }
      const layer = b.layer ?? FIELD;
      const ok = landed && layer === ride.exitLayer && onDeck(b.x, b.y, layer) && clearance(b.x, b.y, layer) > 0 && events === 1;
      if (!ok) fail(`ride '${ride.id}' did not land cleanly on '${ride.exitLayer}' (layer=${layer} events=${events})`);
      row.push(`${ride.id}→${ride.exitLayer}:${ok ? 'ok' : 'FAIL'}`);
    }

    for (const deck of decks) {
      // 2. landing zones on the field
      let minHole = Infinity;
      for (const h of deck.holes) minHole = Math.min(minHole, clearance(h.x, h.y, FIELD));
      const edges = openEdgePoints(deck);
      let minEdge = Infinity;
      for (const e of edges) minEdge = Math.min(minEdge, clearance(e.x + e.nx * 0.8, e.y + e.ny * 0.8, FIELD));
      if (deck.holes.length && minHole <= 0) fail(`a drop hole on '${deck.id}' lands inside a field toy (clearance ${minHole.toFixed(2)})`);
      if (edges.length && minEdge <= 0) fail(`a waterfall on '${deck.id}' lands inside a field toy (clearance ${minEdge.toFixed(2)})`);
      if (!edges.length && !deck.holes.length) fail(`deck '${deck.id}' has no way down`);

      // 3. never stranded
      reseed(99);
      let left = 0, tried = 0, extraEvents = 0;
      const via: Record<string, number> = { hole: 0, edge: 0 };
      const xs = deck.outline.map((p) => p[0]), ys = deck.outline.map((p) => p[1]);
      while (tried < 500) {
        const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs));
        const y = Math.min(...ys) + rnd() * (Math.max(...ys) - Math.min(...ys));
        if (!onDeck(x, y, deck.id) || clearance(x, y, deck.id) < 0.05) continue;
        tried++;
        resetField();
        const sp = rnd() * 60, a = rnd() * Math.PI * 2;
        const b = mkBall(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 3, deck.id);
        gameRef.balls.push(b);
        let events = 0;
        for (let s = 0; s < 120 * 6; s++) {
          for (const e of step()) if (e.type === 'layer') { events++; via[e.via] = (via[e.via] ?? 0) + 1; }
          if ((b.layer ?? FIELD) !== deck.id) break;
        }
        if ((b.layer ?? FIELD) !== deck.id) left++;
        if (events !== 1) extraEvents++;
      }
      if (left < tried) fail(`${tried - left}/${tried} balls stranded on '${deck.id}'`);
      if (extraEvents) fail(`${extraEvents} deck exits emitted ≠ 1 layer event`);

      // 4. under means under: no cross-layer pushes (gravity off, ball parked on the other layer's collider)
      const savedGrav = DIFF.grav;
      DIFF.grav = 0;
      let crossPush = 0, probes = 0;
      const probe = (x: number, y: number, layer: string) => {
        resetField();
        const b = mkBall(x, y, 0, 0, 3, layer);
        gameRef.balls.push(b);
        step();
        probes++;
        if (Math.hypot(b.x - x, b.y - y) > 1e-6 && (b.layer ?? FIELD) === layer) crossPush++;
      };
      for (const w of layerSet(deck.id).walls) {
        const mx = (w.ax + w.bx) / 2, my = (w.ay + w.by) / 2;
        if (clearance(mx, my, FIELD) > 0.05) probe(mx, my, FIELD); // field ball sitting right on a deck rail
      }
      for (const c of layerSet(FIELD).circles) {
        if (onDeck(c.x, c.y, deck.id) && clearance(c.x, c.y, deck.id) > 0.05) probe(c.x, c.y, deck.id); // deck ball above a field bumper
      }
      // positive control: the same probe on the SAME layer must be pushed, or the gate is vacuous
      const rail = layerSet(deck.id).walls[0];
      const cx = (rail.ax + rail.bx) / 2, cy = (rail.ay + rail.by) / 2;
      resetField();
      const ctl = mkBall(cx, cy, 0, 0, 3, deck.id);
      gameRef.balls.push(ctl);
      step();
      const controlPushed = Math.hypot(ctl.x - cx, ctl.y - cy) > 0.01;
      DIFF.grav = savedGrav;
      if (!controlPushed) fail(`control: a deck ball on its own rail was not pushed — probe is broken`);
      if (crossPush) fail(`${crossPush}/${probes} cross-layer collisions on '${deck.id}'`);

      row.push(`${deck.id}: holes clr ${minHole.toFixed(2)} waterfall clr ${edges.length ? minEdge.toFixed(2) : '—'} (${edges.length} pts) left ${left}/${tried} [hole ${via.hole} / edge ${via.edge}] cross-layer ${crossPush}/${probes} (control ${controlPushed ? 'pushed' : 'NOT pushed'})`);
    }
    console.log(`  ${DIFF.label.padEnd(11)} ${row.join('  ')}`);
  }
  // structural: per-layer sets partition the live bodies
  useTable(entry, 'impossible');
  const all = [...ACTIVE.walls, ...ACTIVE.circles].length;
  const split = Object.values(ACTIVE.byLayer).reduce((n, s) => n + s.walls.length + s.circles.length, 0);
  if (all !== split) fail(`per-layer sets don't partition the live bodies (${split} vs ${all})`);
  console.log(`  per-layer partition: ${pad(split, 3)} bodies across ${Object.keys(ACTIVE.byLayer).join(' + ')}`);
}

for (const entry of TABLES) checkTable(entry);
if (bad) process.exitCode = 1;
