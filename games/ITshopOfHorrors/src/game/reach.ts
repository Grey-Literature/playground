import { MAP_W, MAP_H, SAFE_POINTS, isSolid } from "./mapData";
import { PICKUPS } from "./pickups";

// The never-trap rule (CLAUDE.md §4b): before the building moves, prove the
// move can't cut you off from anything. Used at runtime for every shift, and
// by scripts/check-shifts.ts to prove it for every shift from every tile.

export interface Edit {
  x: number;
  y: number;
  ch: string;
}

type Grid = string[][];

// everything you can interact with lives on one of these tiles
const INTERACTIVE = new Set(["T", "P", "U", "D", "C", "K", "W", "=", "S", "N", "X"]);

// floor spots that matter: every glint pickup and every respawn point
const FLOOR_POINTS = [
  ...PICKUPS.filter((p) => p.reveal === "glint").map((p) => ({ x: p.x, y: p.y })),
  ...SAFE_POINTS,
];

const walkable = (g: Grid, x: number, y: number, doorOpen: boolean) =>
  x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !isSolid(g[y][x], doorOpen);

export function withEdits(g: Grid, edits: Edit[]): Grid {
  const out = g.map((row) => [...row]);
  for (const e of edits) out[e.y][e.x] = e.ch;
  return out;
}

// every tile you can walk to from (sx, sy), 4-way
export function flood(g: Grid, sx: number, sy: number, doorOpen: boolean): Uint8Array {
  const seen = new Uint8Array(MAP_W * MAP_H);
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  if (!walkable(g, x0, y0, doorOpen)) return seen;
  const queue = [y0 * MAP_W + x0];
  seen[queue[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i] % MAP_W;
    const y = (queue[i] - x) / MAP_W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = ny * MAP_W + nx;
      if (walkable(g, nx, ny, doorOpen) && !seen[k]) {
        seen[k] = 1;
        queue.push(k);
      }
    }
  }
  return seen;
}

const at = (seen: Uint8Array, x: number, y: number) =>
  x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && seen[y * MAP_W + x] === 1;

// you can use a thing if you can stand on it or right beside it (4-way, so
// it's within search range, not just a diagonal you can't actually reach from)
export function approachable(seen: Uint8Array, x: number, y: number): boolean {
  return at(seen, x, y) || at(seen, x + 1, y) || at(seen, x - 1, y) || at(seen, x, y + 1) || at(seen, x, y - 1);
}

// After the edits, everything you could get to before you can still get to,
// and anything the edits put into the room (a moved desk) is within reach.
export function keepsEverythingReachable(
  g: Grid,
  edits: Edit[],
  from: { x: number; y: number },
  doorOpen: boolean,
): boolean {
  const after = withEdits(g, edits);
  if (!walkable(after, Math.floor(from.x), Math.floor(from.y), doorOpen)) return false;
  const before = flood(g, from.x, from.y, doorOpen);
  const now = flood(after, from.x, from.y, doorOpen);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!INTERACTIVE.has(after[y][x]) || approachable(now, x, y)) continue;
      // unreachable now: only fine if it was there, and unreachable, before
      // (the server room's racks while the door is shut)
      if (g[y][x] !== after[y][x] || approachable(before, x, y)) return false;
    }
  }
  return FLOOR_POINTS.every(
    (p) => !at(before, Math.floor(p.x), Math.floor(p.y)) || at(now, Math.floor(p.x), Math.floor(p.y)),
  );
}
