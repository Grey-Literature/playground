// The engine/theme contract. A theme describes its table entirely as data here;
// engine/physics.ts reads it through the live TABLE object and never hardcodes
// playfield coordinates of its own.
//
// Units: ball radius 1.55. x runs left → right, +y runs up the table (away
// from the player), drain is at -y.

export type DiffId = 'supereasy' | 'easy' | 'medium' | 'hard' | 'impossible';

export interface Pt { x: number; y: number }
export interface PathPt { x: number; y: number; h: number }

/** Anything that only exists from a given difficulty tier upward. */
interface Gated { minTier?: DiffId }

export interface WallSeg extends Gated {
  ax: number; ay: number; bx: number; by: number;
  rest?: number;
  kind?: 'wall' | 'sling' | 'guide';
  id: string;
  /** Slings only: groups the two kicking faces into one event id (e.g. 'L'). */
  group?: string;
  kick?: number;
}

export interface CircleBody extends Gated {
  x: number; y: number; r: number;
  /**
   * bumper — active kick (DIFF.bumperKick)
   * post   — passive rubber
   * kicker — spring post, kicks with DIFF.kickerKick
   * target — standup, passive bounce + event
   * drop   — drop target, collides until knocked down
   */
  kind: 'bumper' | 'post' | 'kicker' | 'target' | 'drop';
  id: string;
  rest?: number;
}

/** Plain rollover switch. Emits { type: 'sensor', kind, id } on entry. */
export interface Sensor extends Gated {
  x: number; y: number; r: number;
  kind: string;
  id: string;
  /** Ignore balls slower than this (e.g. orbit shots). */
  minSpeed?: number;
}

/**
 * A capture-path (wire ramp, subway, tube). The ball is taken off the physics
 * field at `entry`, rides `path`, and is ejected with `exit` velocity. No
 * collision in transit, so a ride can never create a wedge gap.
 */
export interface RideDef extends Gated {
  id: string;
  entry: { x: number; y: number; r: number };
  path: PathPt[];
  dur: number;
  exit: { vx: number; vy: number };
  gate: { minSpeed?: number; maxSpeed?: number; minVy?: number };
  /** Hide the ball while riding (opaque pipes) — the scene draws a trail instead. */
  hideBall?: boolean;
}

/** Saucer / scoop: holds the ball, then kicks it out. */
export interface CaptureDef extends Gated {
  id: string;
  x: number; y: number; r: number;
  hold: number;
  maxSpeed: number;
  cooldown: number;
  eject: { angle: number; spread: number; speed: number; speedJitter: number };
}

/** Moving obstacle driven by the simulation clock. */
export interface KinematicDef extends Gated {
  id: string;
  kind: 'bar';
  cx: number; cy: number;
  half: number;   // half-length of the bar
  r: number;      // bar thickness radius
  /** Angular speed (rad/s) per tier; `default` covers unlisted tiers. */
  speed: Partial<Record<DiffId, number>> & { default: number };
  rest: number;
  swat: number;   // fraction of the bar's surface velocity handed to the ball
}

export interface FlipperSide { pivot: Pt; rest: number; active: number }

export interface FlipperDef {
  left: FlipperSide;
  right: FlipperSide;
  len: number;
  r: number;
  upSpeed: number;
  downSpeed: number;
}

export interface PlungerDef {
  x: number;
  restY: number;
  /** x of the shooter-lane divider; the lane is everything to its right. */
  dividerX: number;
  /** Balls above this y are out of the lane even if x > dividerX. */
  laneTopY: number;
  /** Charging only holds a ball that is below this y. */
  holdBelowY: number;
  /** Rounded cap on top of the divider. */
  cap: { x: number; y: number; r: number };
  /** One-way gate: blocks field → lane crossings for y in [yMin, yMax]. */
  gate: { yMin: number; yMax: number };
  launchBase: number;
  launchRange: number;
  autoLaunch: number;
  skillZone: [number, number];
}

export interface TableDef {
  id: string;
  drainY: number;
  /** Hard safety box — a ball outside it is bounced back in. */
  bounds: { minX: number; maxX: number; maxY: number };
  walls: WallSeg[];
  circles: CircleBody[];
  sensors: Sensor[];
  rides: RideDef[];
  captures: CaptureDef[];
  kinematics: KinematicDef[];
  flippers: FlipperDef;
  plunger: PlungerDef;
  /** Playfield surface height; its gradient becomes a slope force. */
  heightAt: (x: number, y: number) => number;
  /**
   * Where a slow ball is legitimately at rest (cradled above the flippers):
   * y < maxY and |x| < halfX. `watchHalfX` is the wider box the stuck-ball
   * watchdog ignores.
   */
  restZone: { maxY: number; halfX: number; watchHalfX: number };
  camera: { clampX: number; minY: number; maxY: number };
  /** Flash decay rates per flash-key prefix (before ':'). Default 2.5/s. */
  flashDecay?: Record<string, number>;
}

export interface BallState {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  /** Position before the last fixed step — the renderer interpolates. */
  px: number; py: number;
  active: boolean;
  inLane: boolean;
  captured: number;
  captureId?: string;
  captureCooldown: number;
  inside: Set<string>;
  spin: number;
  h?: number;
  stuck?: number;
  autoLaunch?: number;
  ride?: { id: string; t: number };
}

export interface FlipperState {
  angle: number;
  prevAngle: number;
  angVel: number;
  pressed: boolean;
}

export type PhysEvent =
  | { type: 'bumper'; id: string; x: number; y: number }
  | { type: 'sling'; id: string; x: number; y: number; speed: number }
  | { type: 'post'; id: string; x: number; y: number }
  | { type: 'target'; id: string; x: number; y: number }
  | { type: 'drop'; id: string; x: number; y: number }
  | { type: 'sensor'; kind: string; id: string; x: number; y: number }
  | { type: 'capture'; id: string; x: number; y: number }
  | { type: 'captureEject'; id: string; x: number; y: number }
  | { type: 'rideEnter'; id: string; x: number; y: number; speed: number }
  | { type: 'rideExit'; id: string; x: number; y: number }
  | { type: 'drain'; id: number; x: number; y: number }
  | { type: 'autoLaunch'; x: number; y: number };
