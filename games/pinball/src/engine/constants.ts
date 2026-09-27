// Engine-wide physical constants. These define the ball's weight and are shared
// by every theme — a theme tunes feel through difficulty overrides, never here.

export const BALL_RADIUS = 1.55;
export const WALL_PAD = 0.35;
export const GRAVITY = -118;
export const MAX_SPEED = 260; // reference for audio/visual scaling (per-tier cap lives in DIFF)
export const AIR_DRAG = 0.06;
export const ROLL_FRICTION = 0.12;
export const SLOPE_G = 165;

// Fixed timestep. The live game and the headless harness both advance physics
// in exactly these steps, so test numbers describe the real game.
export const STEP = 1 / 120;
export const SUBSTEPS = 3;
export const MAX_CATCHUP_STEPS = 8;

// Playfield slope (~6.5°, far edge raised). The scene tilts the playfield group
// by this; the camera uses it to know where the flippers really are.
export const PLAYFIELD_TILT = 0.115;
