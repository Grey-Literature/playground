// Wire ramps, every table: the rails a theme draws for 'wire' rides
// (RideDef.art, see isWireRide) must
//   1. stay out of the shooter lane — no rail point right of the plunger
//      divider (the launch lane is where the ball flies, not scenery), unless the
//      ride itself starts in the lane;
//   2. not cross another wire ramp — no two wire rides' rails within 0.8 u of
//      each other in top view at a similar height (|Δh| < 1.5).
// Rails are the ride path offset ±WIRE_RAIL_OFFSET, as RideWires draws them.

import { TABLES, TABLE, useTable, pad } from './harness';
import { samplePath, isWireRide, WIRE_RAIL_OFFSET } from '../src/engine/table';
import type { PathPt } from '../src/engine/types';

let bad = 0;
const fail = (msg: string) => { bad++; console.log(`  <-- ${msg}`); };

/** Same offsetting as engine/scene/track.ts trackCurve, sampled densely. */
function rail(path: PathPt[], offset: number, n = 120): PathPt[] {
  const shifted = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (-dy / len) * offset, y: p.y + (dx / len) * offset, h: p.h };
  });
  return Array.from({ length: n + 1 }, (_, i) => samplePath(shifted, i / n));
}

for (const entry of TABLES) {
  useTable(entry, 'impossible'); // every tier-gated ride present
  const P = TABLE.plunger;
  const wires = TABLE.rides.filter(isWireRide);
  console.log(`\n[${entry.id}] wire ramps: ${wires.map((r) => r.id).join(', ') || '(none)'}`);
  const rails = new Map<string, PathPt[]>();
  for (const r of wires) {
    const pts = [...rail(r.path, -WIRE_RAIL_OFFSET), ...rail(r.path, WIRE_RAIL_OFFSET)];
    rails.set(r.id, pts);
    const startsInLane = r.entry.x > P.dividerX;
    const maxX = Math.max(...pts.map((p) => p.x));
    const intoLane = !startsInLane && maxX > P.dividerX - 0.4;
    console.log(`  ${r.id.padEnd(10)} rightmost rail x ${pad(maxX.toFixed(2), 6)} (divider ${P.dividerX})${startsInLane ? ' — starts in the lane' : ''}`);
    if (intoLane) fail(`wire '${r.id}' crosses into the shooter lane (rail x ${maxX.toFixed(2)})`);
  }
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const A = rails.get(wires[i].id)!, B = rails.get(wires[j].id)!;
      let min = Infinity;
      for (const a of A) for (const b of B) {
        if (Math.abs(a.h - b.h) >= 1.5) continue;
        min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
      }
      const pair = `${wires[i].id} ↔ ${wires[j].id}`;
      console.log(`  ${pair.padEnd(22)} closest rails ${Number.isFinite(min) ? min.toFixed(2) : '—'}`);
      if (min < 0.8) fail(`wires ${pair} cross (${min.toFixed(2)} apart)`);
    }
  }
}

process.exit(bad ? 1 : 0);
