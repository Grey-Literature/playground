// Mutable real-time state shared by physics, scene and rules. Mutated in place
// every fixed step — no React re-render. React-facing state lives in store.ts.

import type { BallState, FlipperState } from './types';
import { TABLE } from './table';

export interface MutableGame {
  balls: BallState[];
  left: FlipperState;
  right: FlipperState;
  plungerPower: number;
  plungerCharging: boolean;
  nextBallId: number;
  time: number;
  shake: number; // trauma 0..1
  /** Light flashes keyed 'prefix:id' (or bare 'prefix'), 0..1, decayed by physics. */
  flashes: Record<string, number>;
  /** Drop targets currently knocked down, by id. */
  dropDown: Record<string, boolean>;
  /** Spinner angle/velocity by sensor id. */
  spinners: Record<string, { angle: number; vel: number }>;
  /** Kinematic obstacle phase by id (see kinematicPose). */
  kin: Record<string, number>;
  /** Blast pads: seconds until each pad (sensor id) is charged again. */
  padCool: Record<string, number>;
  /** Capture id → ride the next eject from that capture starts (see ejectIntoRide). */
  ejectRide: Record<string, string>;
  bumperCombo: number;
  bumperComboTimer: number;
  nudgeTimes: number[];
  tiltedUntil: number;
  tiltWarnings: number;
  pendingNudge: { x: number; y: number };
  launchCooldown: number;
  stuckTimer: number;
  searchCount: number;
  skillWindow: number; // seconds after launch where a skill shot counts
  lastLaunchPower: number;
  paused: boolean;
  /** Fraction of a fixed step left over after the last frame (render interpolation). */
  alpha: number;
  /** How many times the un-wedge safety net has fired (harness metric). */
  unwedgeCount: number;
  /** Game time each flipper was last pressed (minimum-pulse taps). */
  flipPressedAt: { left: number; right: number };
}

function freshFlipper(angle: number): FlipperState {
  return { angle, prevAngle: angle, angVel: 0, pressed: false };
}

export const gameRef: MutableGame = {
  balls: [],
  left: freshFlipper(TABLE.flippers.left.rest),
  right: freshFlipper(TABLE.flippers.right.rest),
  plungerPower: 0,
  plungerCharging: false,
  nextBallId: 1,
  time: 0,
  shake: 0,
  flashes: {},
  dropDown: {},
  spinners: {},
  kin: {},
  padCool: {},
  ejectRide: {},
  bumperCombo: 0,
  bumperComboTimer: 0,
  nudgeTimes: [],
  tiltedUntil: 0,
  tiltWarnings: 0,
  pendingNudge: { x: 0, y: 0 },
  launchCooldown: 0,
  stuckTimer: 0,
  searchCount: 0,
  skillWindow: 0,
  lastLaunchPower: 0,
  paused: false,
  alpha: 0,
  unwedgeCount: 0,
  flipPressedAt: { left: -99, right: -99 },
};

// ---------------- game-time scheduler ----------------
// Timers that change play (tilt recovery, bell relights, door resets) run on
// GAME time, not the wall clock: they pause with the game, and an agent in
// lockstep sees them fire at the same simulated moment a human would.
// Cosmetic timers (messages, popups, the bonus count-up) stay on setTimeout.
interface Timer { at: number; fn: () => void }
let timers: Timer[] = [];

/** Run `fn` after `seconds` of game time. */
export function later(seconds: number, fn: () => void) {
  timers.push({ at: gameRef.time + seconds, fn });
}

/** Fire every timer that is due (called by the simulation after each tick). */
export function runDue() {
  if (!timers.length) return;
  const due = timers.filter((t) => t.at <= gameRef.time + 1e-9);
  if (!due.length) return;
  timers = timers.filter((t) => t.at > gameRef.time + 1e-9);
  for (const t of due) t.fn();
}

/** Drop every pending game-time timer (new ball / new game). */
export function clearTimers() { timers = []; }

export function resetMutable() {
  gameRef.balls = [];
  gameRef.left = freshFlipper(TABLE.flippers.left.rest);
  gameRef.right = freshFlipper(TABLE.flippers.right.rest);
  gameRef.plungerPower = 0;
  gameRef.plungerCharging = false;
  gameRef.shake = 0;
  gameRef.flashes = {};
  gameRef.dropDown = {};
  gameRef.spinners = {};
  gameRef.kin = {};
  gameRef.padCool = {};
  gameRef.ejectRide = {};
  gameRef.bumperCombo = 0;
  gameRef.bumperComboTimer = 0;
  gameRef.nudgeTimes = [];
  gameRef.tiltedUntil = 0;
  gameRef.tiltWarnings = 0;
  gameRef.pendingNudge = { x: 0, y: 0 };
  gameRef.skillWindow = 0;
  gameRef.launchCooldown = 0;
  gameRef.stuckTimer = 0;
  gameRef.searchCount = 0;
  gameRef.flipPressedAt = { left: -99, right: -99 };
  clearTimers();
}

function makeBall(x: number, y: number, vx: number, vy: number, extra: Partial<BallState>): BallState {
  return {
    id: gameRef.nextBallId++,
    x, y, vx, vy, px: x, py: y,
    active: true,
    inLane: false,
    captured: 0,
    captureCooldown: 0,
    inside: new Set(),
    spin: 0,
    ...extra,
  };
}

export function spawnBallInLane(autoLaunchAfter?: number): BallState {
  const p = TABLE.plunger;
  const b = makeBall(p.x, p.restY, 0, 0, { inLane: true, autoLaunch: autoLaunchAfter });
  gameRef.balls.push(b);
  return b;
}

export function spawnBallAt(x: number, y: number, vx: number, vy: number, captureCooldown = 1): BallState {
  const b = makeBall(x, y, vx, vy, { captureCooldown });
  gameRef.balls.push(b);
  return b;
}

export function isTilted() {
  return gameRef.time < gameRef.tiltedUntil;
}

export function flash(key: string, v = 1) {
  gameRef.flashes[key] = Math.max(gameRef.flashes[key] ?? 0, v);
}

export function flashOf(key: string) {
  return gameRef.flashes[key] ?? 0;
}

export function addShake(v: number) {
  gameRef.shake = Math.min(1, gameRef.shake + v);
}

/**
 * Rules hook: make the ball currently held in `captureId` leave on `rideId`
 * (e.g. a saucer's VOLCANO launch) instead of the capture's normal kick.
 * Call it from the `capture` event; the ride's path should start at the capture.
 */
export function ejectIntoRide(captureId: string, rideId: string) {
  gameRef.ejectRide[captureId] = rideId;
}

export function spinnerOf(id: string) {
  return (gameRef.spinners[id] ??= { angle: 0, vel: 0 });
}
