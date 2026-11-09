// Everything findable in the shop. Text lives in story.ts (PICKUP_LINES);
// this file is placement + gating only.
//
// reveal:
//   'glint'  — on the floor; drawn only once your headlamp has found it
//   'search' — inside the desk/rack tile at (x, y); found with [E] SEARCH
//   'repeat' — on the story object `at`; offered instead of its usual script
//              once `requires` passes (usually: on the second visit)

import type { Flags } from "./types";

export type PickupKind = "pin" | "quest" | "egg";
export type Reveal = "glint" | "search" | "repeat";

export interface Pickup {
  id: string;
  kind: PickupKind;
  reveal: Reveal;
  x: number; // tile coords (glint: world position; search: the tile itself)
  y: number;
  at?: string; // repeat only: the story interactable it hides on
  requires?: (f: Flags) => boolean;
  effects?: Partial<Flags>;
}

export interface Pin {
  code: string;
  name: string;
  text: string;
}

// The bold codes from http-error-codes.md — her lanyard.
export const PINS: Record<string, Pin> = {
  "pin-100": { code: "100", name: "CONTINUE", text: "Waiting for you to finish explaining." },
  "pin-200": { code: "200", name: "OK", text: "You did it right. Here's your answer." },
  "pin-400": { code: "400", name: "BAD REQUEST", text: "That's not how any of this works." },
  "pin-401": { code: "401", name: "UNAUTHORIZED", text: "Who gave you admin rights?" },
  "pin-403": { code: "403", name: "FORBIDDEN", text: "You do not have permission to make this my problem." },
  "pin-409": { code: "409", name: "CONFLICT", text: "Sorry, my users hallucinated the process." },
  "pin-410": { code: "410", name: "GONE", text: "That server was decommissioned in 2021. Nobody told the server." },
  "pin-418": { code: "418", name: "I'M A TEAPOT", text: "I am not qualified to be this appliance." },
  "pin-422": { code: "422", name: "UNPROCESSABLE CONTENT", text: "I understand every word. The ticket remains a mystery." },
  "pin-429": { code: "429", name: "TOO MANY REQUESTS", text: "Context window exceeded. Stop talking." },
  "pin-500": { code: "500", name: "INTERNAL SERVER ERROR", text: "My last functioning neuron has crashed." },
};
export const PIN_IDS = Object.keys(PINS);
export const PIN_TOTAL = PIN_IDS.length;

const seen = (f: Flags, id: string) => f.seen.includes(id);
const has = (f: Flags, id: string) => f.collected.includes(id);

// Where the pacified Min Pin sits until you search the rack it buried her keycard in.
export const KEYCARD_RACK = { x: 39, y: 14 };
export const KEYCARD_SPOT = { x: 40.6, y: 15.5 };
// The annex rack whose LEDs never go red — root cred is inside.
export const GREEN_RACK = { x: 41, y: 26 };

export const PICKUPS: Pickup[] = [
  // ---------------------------------------------------------- quest items
  {
    id: "token",
    kind: "quest",
    reveal: "glint",
    x: 23.4,
    y: 19.5,
    requires: (f) => seen(f, "printer-forecast"),
    effects: { gotToken: true },
  },
  {
    id: "keycard",
    kind: "quest",
    reveal: "search",
    x: KEYCARD_RACK.x,
    y: KEYCARD_RACK.y,
    requires: (f) => f.minPinPacified,
    effects: { hasKeycard: true },
  },
  {
    id: "rootcred",
    kind: "quest",
    reveal: "search",
    x: GREEN_RACK.x,
    y: GREEN_RACK.y,
    requires: (f) => seen(f, "undead-clue"),
    effects: { hasRootCred: true },
  },

  // ---------------------------------------------------------- lanyard pins
  { id: "pin-500", kind: "pin", reveal: "glint", x: 7.5, y: 25.5 },
  { id: "pin-100", kind: "pin", reveal: "search", x: 6, y: 17 },
  { id: "pin-422", kind: "pin", reveal: "glint", x: 2.5, y: 11.6 },
  { id: "pin-429", kind: "pin", reveal: "glint", x: 41.5, y: 10.5 },
  { id: "pin-400", kind: "pin", reveal: "glint", x: 16.5, y: 20.4 },
  { id: "pin-410", kind: "pin", reveal: "glint", x: 37.5, y: 27.5 },
  {
    id: "pin-200",
    kind: "pin",
    reveal: "search",
    x: 16,
    y: 3,
    requires: (f) => f.doorOpen,
  },
  {
    id: "pin-418",
    kind: "pin",
    reveal: "repeat",
    at: "coffee",
    x: 0,
    y: 0,
    requires: (f) => seen(f, "coffee"),
  },
  {
    id: "pin-409",
    kind: "pin",
    reveal: "repeat",
    at: "whiteboard",
    x: 0,
    y: 0,
    requires: (f) => seen(f, "whiteboard"),
  },
  {
    id: "pin-401",
    kind: "pin",
    reveal: "repeat",
    at: "minpin",
    x: 0,
    y: 0,
    requires: (f) => f.minPinPacified && f.hasKeycard,
  },
  {
    id: "pin-403",
    kind: "pin",
    reveal: "repeat",
    at: "door",
    x: 0,
    y: 0,
    requires: (f) => f.doorOpen,
  },

  // ---------------------------------------------------------- the cyan debt
  {
    id: "cyan",
    kind: "egg",
    reveal: "glint",
    x: 40.5,
    y: 18.5,
    requires: (f) => f.minPinPacified,
  },
  {
    id: "debt-settled",
    kind: "egg",
    reveal: "repeat",
    at: "printer",
    x: 0,
    y: 0,
    requires: (f) => has(f, "cyan"),
  },
];

export const PICKUP_BY_ID: Record<string, Pickup> = Object.fromEntries(
  PICKUPS.map((p) => [p.id, p]),
);

export function available(p: Pickup, f: Flags): boolean {
  return !has(f, p.id) && (!p.requires || p.requires(f));
}

export function pinCount(f: Flags): number {
  return PIN_IDS.filter((id) => f.collected.includes(id)).length;
}
