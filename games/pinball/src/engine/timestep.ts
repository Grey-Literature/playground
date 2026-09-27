// Fixed-timestep driver. The prototype stepped physics with the render delta
// (min(rawDt, 1/30) / 3 substeps), so the ball's feel changed with monitor
// refresh rate, and at 30 fps a max-speed ball moved further per substep than
// its own radius (tunnelling). Physics now always advances in STEP-sized ticks;
// leftover time carries to the next frame and becomes the render `alpha`.

import { STEP, MAX_CATCHUP_STEPS } from './constants';
import type { PhysEvent } from './types';
import { stepPhysics } from './physics';
import { gameRef } from './runtime';

export class FixedStepper {
  private acc = 0;

  /** Advance by one render frame; returns every event produced this frame. */
  advance(frameDt: number): PhysEvent[] {
    const events: PhysEvent[] = [];
    // A backgrounded tab can hand us seconds at once — don't try to replay them.
    this.acc += Math.min(Math.max(frameDt, 0), 0.25);
    let n = 0;
    while (this.acc >= STEP && n < MAX_CATCHUP_STEPS) {
      const ev = stepPhysics(STEP);
      for (const e of ev) events.push(e);
      this.acc -= STEP;
      n++;
    }
    // Hit the catch-up cap (slow device): drop the backlog rather than spiral.
    if (n === MAX_CATCHUP_STEPS && this.acc > STEP) this.acc = 0;
    gameRef.alpha = this.acc / STEP;
    return events;
  }

  reset() { this.acc = 0; gameRef.alpha = 0; }
}
