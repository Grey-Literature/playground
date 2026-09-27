import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MAX_SPEED, PLAYFIELD_TILT } from '../constants';
import { TABLE } from '../table';
import { gameRef, spawnBallAt } from '../runtime';
import { useGame } from '../store';
import { activeTheme } from '../theme';
import { sound } from '../audio';
import { FixedStepper } from '../timestep';

// Drives the simulation: frame-rate independent fixed steps, then hands every
// physics event to the active theme's rules. Mounted first so it runs before
// any visual useFrame reads gameRef.
export function PhysicsLoop() {
  const rollRef = useRef(0);
  const stepper = useMemo(() => new FixedStepper(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.25);
    const st = useGame.getState();
    if (st.paused) { stepper.reset(); sound.setRoll(0); return; }
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

    const events = stepper.advance(dt);

    if (st.phase === 'playing') {
      for (const e of events) {
        if (e.type === 'drain') st.onDrain();
        else if (e.type === 'autoLaunch') st.onAutoLaunch();
        else theme.rules.onEvent(e);
      }
    } else if (theme.rules.onAttractEvent) {
      for (const e of events) theme.rules.onAttractEvent(e);
    }

    // rolling sound
    let maxSp = 0;
    for (const b of gameRef.balls) {
      if (!b.active || b.captured > 0 || b.ride) continue;
      maxSp = Math.max(maxSp, Math.hypot(b.vx, b.vy));
    }

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
    rollRef.current += ((maxSp / MAX_SPEED) - rollRef.current) * Math.min(1, dt * 6);
    sound.setRoll(st.phase === 'playing' ? rollRef.current : rollRef.current * 0.4);
  });
  return null;
}

// Keep the flippers inside this fraction of the lower half-screen (NDC y). The
// strip below is reserved for the message pill, so the bats are never hidden.
const FLIPPER_NDC_LIMIT = 0.8;

/** World-space (y, z) of the lowest point of either flipper, after the playfield tilt. */
function flipperAnchor() {
  const F = TABLE.flippers;
  const low = Math.min(
    F.left.pivot.y, F.left.pivot.y + Math.sin(F.left.rest) * F.len,
    F.right.pivot.y, F.right.pivot.y + Math.sin(F.right.rest) * F.len,
  ) - F.r;
  // physics (x, y) -> local (x, h, -y), then the playfield group's rotation about x
  const ly = 0.4, lz = -low;
  const c = Math.cos(PLAYFIELD_TILT), s = Math.sin(PLAYFIELD_TILT);
  return { y: ly * c - lz * s, z: ly * s + lz * c };
}

/**
 * Slide the look target toward the player just enough that the flippers stay
 * on screen. Works in the vertical plane: pitch below horizontal to the anchor
 * minus pitch to the look point must fit inside the (margin-trimmed) half-FOV.
 */
function keepFlippersInFrame(pos: THREE.Vector3, look: THREE.Vector3, fovDeg: number) {
  const a = flipperAnchor();
  const limit = Math.atan(FLIPPER_NDC_LIMIT * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  const pitchTo = (y: number, z: number) => Math.atan2(pos.y - y, pos.z - z);
  const anchorPitch = pitchTo(a.y, a.z);
  if (anchorPitch - pitchTo(look.y, look.z) <= limit) return;
  const want = anchorPitch - limit;
  look.z = pos.z - (pos.y - look.y) / Math.tan(want);
}

export function CameraRig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 75, 50));
  const look = useRef(new THREE.Vector3(0, 0, -3));
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const st = useGame.getState();
    const mode = st.cameraMode;
    const t = state.clock.elapsedTime;
    const C = TABLE.camera;
    // follow target = average active ball
    let bx = 0, by = -6, n = 0;
    for (const b of gameRef.balls) {
      if (!b.active) continue;
      bx += b.x; by += b.y; n++;
    }
    if (n > 0) { bx /= n; by /= n; }
    bx = THREE.MathUtils.clamp(bx, -C.clampX, C.clampX);
    by = THREE.MathUtils.clamp(by, C.minY, C.maxY);

    if (mode === 'broadcast') {
      targetPos.set(0, 76, 52);
      targetLook.set(0, 0, -3);
    } else if (mode === 'top') {
      targetPos.set(0, 108, 10);
      targetLook.set(0, 0, 0);
    } else if (mode === 'cinematic') {
      const a = t * 0.18;
      targetPos.set(Math.sin(a) * 30, 60 + Math.sin(t * 0.4) * 7, 46 + Math.cos(a) * 9);
      targetLook.set(bx * 0.3, 0, -4 - by * 0.1);
    } else {
      targetPos.set(bx * 0.22, 75 - (by + 6) * 0.14, 50);
      targetLook.set(bx * 0.34, 0, -3.5 - by * 0.2);
    }
    // on a real machine you always see the flippers — they win over the top arch
    if (mode !== 'cinematic') {
      keepFlippersInFrame(targetPos, targetLook, (camera as THREE.PerspectiveCamera).fov);
    }
    const k = 1 - Math.exp(-3.2 * Math.min(dt, 0.05));
    pos.current.lerp(targetPos, k);
    look.current.lerp(targetLook, k);
    // shake
    let sx = 0, sy = 0, sz = 0;
    const trauma = st.shakeEnabled ? gameRef.shake : gameRef.shake * 0.25;
    if (trauma > 0.001) {
      const s = trauma * trauma * 3.2;
      sx = (Math.random() - 0.5) * 2 * s;
      sy = (Math.random() - 0.5) * 2 * s * 0.6;
      sz = (Math.random() - 0.5) * 2 * s;
    }
    camera.position.set(pos.current.x + sx, pos.current.y + sy, pos.current.z + sz);
    camera.lookAt(look.current.x + sx * 0.5, look.current.y, look.current.z + sz * 0.3);
  });
  return null;
}
