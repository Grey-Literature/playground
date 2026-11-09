// Headless proof for the never-trap rule (CLAUDE.md §4b): every shift in
// src/game/shifts.ts, applied in every order a run can apply them, from every
// tile the player could be standing on, with the server-room door shut and
// open, keeps everything reachable. Then, with every shift applied, every
// objective is still reachable from the spawn point.
//
// Run with `npm run check` (esbuild bundles this file, then node runs it).
// `npm run build` runs it first and stops if it fails.

import { MAP, MAP_W, MAP_H, SPAWN, isSolid } from "../src/game/mapData";
import { SHIFTS, type Shift } from "../src/game/shifts";
import { keepsEverythingReachable, withEdits, flood, approachable } from "../src/game/reach";
import { PICKUPS, KEYCARD_RACK, GREEN_RACK } from "../src/game/pickups";
import { TICKETS } from "../src/game/tickets";

const base = MAP.map((row) => [...row]);
let failures = 0;
let checks = 0;

function mapFor(applied: string[]): string[][] {
  let g = base;
  for (const id of applied) g = withEdits(g, SHIFTS.find((s) => s.id === id)!.edits);
  return g;
}

// every order a run could apply them in, honouring `after`
function orders(applied: string[], out: string[][]) {
  out.push(applied);
  for (const s of SHIFTS) {
    if (applied.includes(s.id)) continue;
    if (s.after && !applied.includes(s.after)) continue;
    orders([...applied, s.id], out);
  }
}
const states: string[][] = [];
orders([], states);

function tryShift(applied: string[], s: Shift, doorOpen: boolean) {
  const g = mapFor(applied);
  // anywhere the player could actually be standing (not, say, inside the
  // server room while its door is still shut)
  const standable = flood(g, SPAWN.x, SPAWN.y, doorOpen);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!standable[y * MAP_W + x]) continue;
      // the runtime never applies an edit that would wall in the player
      if (s.edits.some((e) => e.x === x && e.y === y && isSolid(e.ch, doorOpen))) continue;
      checks++;
      if (!keepsEverythingReachable(g, s.edits, { x: x + 0.5, y: y + 0.5 }, doorOpen)) {
        failures++;
        if (failures <= 10)
          console.error(`FAIL ${s.id} after [${applied.join(", ")}] door=${doorOpen ? "open" : "shut"} from ${x},${y}`);
      }
    }
  }
}

for (const applied of states)
  for (const s of SHIFTS) {
    if (applied.includes(s.id) || (s.after && !applied.includes(s.after))) continue;
    for (const doorOpen of [false, true]) tryShift(applied, s, doorOpen);
  }

// with all of it applied, can you still get to everything from the spawn?
const objectives: { name: string; x: number; y: number }[] = [
  ...["T", "P", "U", "D", "K", "W", "X"].flatMap((ch) =>
    base.flatMap((row, y) => row.flatMap((c, x) => (c === ch ? [{ name: ch, x, y }] : []))),
  ),
  { name: "keycard rack", ...KEYCARD_RACK },
  { name: "green rack", ...GREEN_RACK },
  ...TICKETS.map((t) => ({ name: t.code, x: t.x, y: t.y })),
  ...PICKUPS.filter((p) => p.reveal !== "repeat" && p.x !== undefined).map((p) => ({
    name: p.id,
    x: Math.floor(p.x),
    y: Math.floor(p.y),
  })),
];
for (const applied of states) {
  const g = mapFor(applied);
  for (const doorOpen of [false, true]) {
    const seen = flood(g, SPAWN.x, SPAWN.y, doorOpen);
    for (const o of objectives) {
      // the server room's insides are meant to wait for the door
      if (!doorOpen && o.y <= 8) continue;
      checks++;
      if (!approachable(seen, o.x, o.y)) {
        failures++;
        console.error(`UNREACHABLE ${o.name} at ${o.x},${o.y} after [${applied.join(", ")}] door=${doorOpen ? "open" : "shut"}`);
      }
    }
  }
}

// and the checker isn't vacuous: sealing the den's only door, with no way
// round, must be rejected
const trap = [{ x: 33, y: 13, ch: "#" }, { x: 34, y: 13, ch: "#" }];
if (keepsEverythingReachable(base, trap, { x: 20.5, y: 11.5 }, false)) {
  failures++;
  console.error("CHECKER BROKEN: sealing the den with no way round was allowed");
}

console.log(`check-shifts: ${states.length} shift orders, ${checks} checks, ${failures} failures`);
if (failures) process.exit(1);
