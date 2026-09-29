// Difficulty = feel. Velocity scaling, physics reactivity and score reward per
// tier. Every knob feeds engine/physics.ts directly. Obstacles are no longer
// listed here: each table body carries its own `minTier`.

import type { DiffId } from './types';
export type { DiffId };

export interface DifficultyCfg {
  id: DiffId;
  label: string;
  blurb: string;
  accent: string;
  launch: number;      // plunger + auto-launch velocity scale
  grav: number;        // gravity scale (super easy literally plays slower)
  rest: number;        // bounciness of everything (reactivity)
  bumperKick: number;
  slingKick: number;   // reference kick; a sling's own `kick` is scaled by slingKick/92
  kickerKick: number;
  flipperBoost: number;
  flipSpeed: number;   // flipper angular speed scale
  maxSpeed: number;
  nudge: number;       // nudge impulse
  mbTime: number;      // multiball duration (s)
  tiltLimit: number;   // nudges within window before TILT
  score: number;       // global score multiplier reward
  /** Lockstep agents: the most one step() may advance (ms) — coarser is easier. */
  agentStepCapMs: number;
  /** Lockstep agents: real time (ms) allowed between step/input calls before the
   *  game resumes in real time on its own; 0 = unlimited. See engine/agent.ts. */
  agentHoldMs: number;
  /** Script mode: game time (ms) between the state a strategy saw and its action landing. */
  agentReactionMs: number;
}

export const DIFFS: Record<DiffId, DifficultyCfg> = {
  supereasy: {
    id: 'supereasy', label: 'SUPER EASY', accent: '#34d399',
    blurb: 'Slower gravity, dead bumpers, starter obstacles only.',
    launch: 0.84, grav: 0.74, rest: 0.55, bumperKick: 84, slingKick: 70, kickerKick: 0,
    flipperBoost: 2.6, flipSpeed: 0.8, maxSpeed: 210, nudge: 26, mbTime: 35, tiltLimit: 6, score: 0.8,
    agentStepCapMs: 1000, agentHoldMs: 0, agentReactionMs: 50,
  },
  easy: {
    id: 'easy', label: 'EASY', accent: '#22d3ee',
    blurb: 'Slightly slower, less reactive, one extra obstacle set.',
    launch: 0.92, grav: 0.88, rest: 0.75, bumperKick: 96, slingKick: 82, kickerKick: 0,
    flipperBoost: 3.0, flipSpeed: 0.9, maxSpeed: 235, nudge: 34, mbTime: 30, tiltLimit: 5, score: 0.9,
    agentStepCapMs: 1000, agentHoldMs: 0, agentReactionMs: 100,
  },
  medium: {
    id: 'medium', label: 'MEDIUM', accent: '#a78bfa',
    blurb: 'Tournament baseline + two extra obstacle sets.',
    launch: 1.0, grav: 1.0, rest: 1.0, bumperKick: 108, slingKick: 92, kickerKick: 0,
    flipperBoost: 3.4, flipSpeed: 1.0, maxSpeed: 260, nudge: 42, mbTime: 25, tiltLimit: 4, score: 1,
    agentStepCapMs: 250, agentHoldMs: 1500, agentReactionMs: 150,
  },
  hard: {
    id: 'hard', label: 'HARD', accent: '#fb923c',
    blurb: 'Livelier everything, and something starts moving.',
    launch: 1.1, grav: 1.14, rest: 1.22, bumperKick: 124, slingKick: 108, kickerKick: 0,
    flipperBoost: 4.1, flipSpeed: 1.12, maxSpeed: 295, nudge: 50, mbTime: 22, tiltLimit: 4, score: 1.25,
    agentStepCapMs: 100, agentHoldMs: 700, agentReactionMs: 200,
  },
  impossible: {
    id: 'impossible', label: 'IMPOSSIBLE', accent: '#f43f5e',
    blurb: 'Everything faster, everything bouncier, everything angry.',
    launch: 1.24, grav: 1.3, rest: 1.45, bumperKick: 140, slingKick: 124, kickerKick: 62,
    flipperBoost: 4.8, flipSpeed: 1.25, maxSpeed: 330, nudge: 58, mbTime: 20, tiltLimit: 3, score: 1.5,
    agentStepCapMs: 50, agentHoldMs: 350, agentReactionMs: 250,
  },
};

export const DIFF_ORDER: DiffId[] = ['supereasy', 'easy', 'medium', 'hard', 'impossible'];

export type DiffOverrides = Partial<Record<DiffId, Partial<Omit<DifficultyCfg, 'id'>>>>;

// Live mutable config — physics/scene read this every step (no react round-trip).
export const DIFF: DifficultyCfg = { ...DIFFS.medium };

let overrides: DiffOverrides = {};

/** Resolved config for a tier, including the active theme's overrides. */
export function diffFor(id: DiffId): DifficultyCfg {
  return { ...DIFFS[id], ...(overrides[id] ?? {}), id };
}

export function setDiffOverrides(o: DiffOverrides | undefined) {
  overrides = o ?? {};
}

export function tierIndex(id: DiffId) {
  return DIFF_ORDER.indexOf(id);
}

/** True when a body gated at `minTier` exists at the current tier. */
export function tierAllows(minTier: DiffId | undefined, cur: DiffId = DIFF.id) {
  return !minTier || tierIndex(cur) >= tierIndex(minTier);
}

export function applyDifficultyCfg(id: DiffId) {
  Object.assign(DIFF, diffFor(id));
}
