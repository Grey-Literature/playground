// The game's simulation tick, independent of rendering. The render loop calls
// `simulate(frameDt)` every frame; an agent in lockstep mode calls
// `simulateStep()` itself, one fixed physics step at a time, while the render
// loop only draws. Both run exactly the same game logic.

import { STEP } from './constants';
import type { PhysEvent } from './types';
import { TABLE } from './table';
import { gameRef, spawnBallAt, runDue } from './runtime';
import { useGame } from './store';
import { activeTheme } from './theme';
import { sound } from './audio';
import { stepPhysics } from './physics';
import { FixedStepper } from './timestep';

const stepper = new FixedStepper();

/** Observers of every frame's physics events (the agent API's event buffer). */
export const simListeners = new Set<(events: PhysEvent[]) => void>();

/** Drop any partial step (after a pause, or when switching to lockstep). */
export function resetStepper() { stepper.reset(); }

/** One render frame of game time `dt` (seconds), stepped in fixed physics ticks. */
export function simulate(dt: number): PhysEvent[] {
  return frame(dt, () => stepper.advance(dt));
}

/** Exactly one fixed physics step (lockstep). */
export function simulateStep(): PhysEvent[] {
  return frame(STEP, () => { const ev = stepPhysics(STEP); gameRef.alpha = 0; return ev; });
}

function frame(dt: number, physics: () => PhysEvent[]): PhysEvent[] {
  const st = useGame.getState();
  const P = TABLE.plunger;
  const theme = activeTheme();

  if (st.phase === 'attract') {
    gameRef.left.pressed = Math.sin(gameRef.time * 5.1) > 0.1;
    gameRef.right.pressed = Math.sin(gameRef.time * 4.3 + 1.3) > 0.1;
    const act = gameRef.balls.filter(b => b.active);
    if (act.length === 0) {
      spawnBallAt((Math.random() - 0.5) * 16, 22, (Math.random() - 0.5) * 90, -30);
    }
    // keep demo ball from settling: gentle kick if slow at top
    for (const b of act) {
      if (Math.hypot(b.vx, b.vy) < 12 && b.y > -10) {
        b.vx += (Math.random() - 0.5) * 60;
        b.vy += 60;
      }
    }
  } else if (st.phase === 'playing') {
    if (gameRef.plungerCharging && st.ballPhase === 'plunger') {
      gameRef.plungerPower = Math.min(1, gameRef.plungerPower + dt * 0.8);
      sound.plungerTick(gameRef.plungerPower);
      useGame.setState({ plungerPower: gameRef.plungerPower });
    }
    // weak launch fell back into the lane? allow re-plunge instead of a stuck ball
    if (st.ballPhase === 'active' && !st.bonusCounting) {
      const laneBall = gameRef.balls.find(
        (b) => b.active && b.autoLaunch === undefined && b.captured <= 0 && !b.ride && b.inLane && b.y < P.holdBelowY + 1 && Math.hypot(b.vx, b.vy) < 22
      );
      if (laneBall) {
        useGame.setState({ ballPhase: 'plunger', message: 'WEAK LAUNCH — PLUNGE AGAIN', messageT: Date.now() });
      }
    }
    if (st.multiball) st.tickMultiball(dt);
  }

  const events = physics();

  if (st.phase === 'playing') {
    for (const e of events) {
      if (e.type === 'drain') st.onDrain();
      else if (e.type === 'autoLaunch') st.onAutoLaunch();
      else theme.rules.onEvent(e);
    }
  } else if (theme.rules.onAttractEvent) {
    for (const e of events) theme.rules.onAttractEvent(e);
  }

  // game-time timers (tilt recovery, bell relights, …) and delayed flipper releases
  runDue();

  // ---- stuck-ball watchdog: kick first, re-serve if the kick doesn't help ----
  if (st.phase === 'playing') {
    const live = useGame.getState();
    const actives = gameRef.balls.filter((b) => b.active);
    const busy = actives.some((b) => b.captured > 0 || !!b.ride || b.autoLaunch !== undefined);
    // A ball cradled on a flipper or parked in the shooter lane is legitimate —
    // only balls that stall out in the field count toward a ball search.
    const R = TABLE.restZone;
    const stalledInField = actives.some((b) => {
      if (Math.hypot(b.vx, b.vy) >= 9) return false;
      if (b.x > P.dividerX - 0.5) return false;
      if (b.y < R.maxY && Math.abs(b.x) < R.watchHalfX) return false;
      return true;
    });
    const settled =
      actives.length > 0 && !busy && live.ballPhase === 'active' && !live.bonusCounting && stalledInField;
    if (settled) {
      gameRef.stuckTimer += dt;
      if (gameRef.stuckTimer > 1.5 && !live.stuckHint) useGame.setState({ stuckHint: true });
      if (gameRef.stuckTimer > 3) {
        gameRef.stuckTimer = 0;
        gameRef.searchCount += 1;
        if (gameRef.searchCount >= 3) live.reserveBall();
        else live.ballSearch();
      }
    } else if (gameRef.stuckTimer !== 0 || gameRef.searchCount !== 0) {
      gameRef.stuckTimer = 0;
      gameRef.searchCount = 0;
      if (live.stuckHint) useGame.setState({ stuckHint: false });
    }
  }

  if (events.length) for (const l of simListeners) l(events);
  return events;
}
