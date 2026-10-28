import type { Flags } from "./types";
import { actOf } from "./acts";
import type { Edit } from "./reach";

// The building moves (CLAUDE.md §4b, mechanic 4). Each shift only happens
// where you aren't looking: during a single blackout dip, or entirely off
// camera. And only if reach.ts proves it can't cut you off from anything;
// otherwise it waits. scripts/check-shifts.ts proves that for every shift,
// from every tile, in every order a run can apply them.

export interface Shift {
  id: string;
  // "offscreen" is supported by the engine; every current shift uses a blackout
  guard: "blackout" | "offscreen";
  after?: string; // only once this shift has happened
  ready: (f: Flags, p: { x: number; y: number }) => boolean;
  edits: Edit[];
}

const inRect = (p: { x: number; y: number }, x1: number, y1: number, x2: number, y2: number) =>
  p.x >= x1 && p.x < x2 + 1 && p.y >= y1 && p.y < y2 + 1;

const wall = (x: number, y: number): Edit => ({ x, y, ch: "#" });
const floor = (x: number, y: number): Edit => ({ x, y, ch: "." });
const desk = (x: number, y: number): Edit => ({ x, y, ch: "=" });

export const SHIFTS: Shift[] = [
  {
    // Act II: you step out of the office and the doorway seals behind you.
    // A gap opens in the office's east wall instead, through to the print room.
    id: "office-seal",
    guard: "blackout",
    ready: (f, p) => actOf(f) >= 2 && inRect(p, 2, 10, 13, 12) && Math.hypot(p.x - 6.5, p.y - 13.5) > 2.2,
    edits: [wall(5, 13), wall(6, 13), wall(7, 13), floor(13, 18), floor(14, 18), floor(15, 18)],
  },
  {
    // Act II: you're in the office and the far desk cluster moves a tile
    id: "office-desks",
    guard: "blackout",
    ready: (f, p) => actOf(f) >= 2 && inRect(p, 2, 14, 12, 28),
    edits: [floor(9, 21), floor(10, 21), desk(9, 22), desk(10, 22)],
  },
  {
    // Act III, door still shut: the den's hallway door is gone, and the way
    // to the den now runs through the print room
    id: "hall-bend",
    guard: "blackout",
    ready: (f, p) => actOf(f) === 3 && inRect(p, 28, 14, 41, 28),
    edits: [wall(33, 13), wall(34, 13), floor(25, 17), floor(26, 17), floor(27, 17)],
  },
  {
    // the door opens: one dip, and the hallway is straight again, as if it
    // never bent (off-camera would almost never happen: the print-room
    // passage is in view from nearly everywhere)
    id: "hall-unbend",
    guard: "blackout",
    after: "hall-bend",
    ready: (f) => f.doorOpen,
    edits: [floor(33, 13), floor(34, 13), wall(25, 17), wall(26, 17), wall(27, 17)],
  },
];

export const SHIFT_BY_ID: Record<string, Shift> = Object.fromEntries(SHIFTS.map((s) => [s.id, s]));
