import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MAX_SPEED } from '../constants';
import { Framer, ELEV, fullTablePoints, followPoints, MIN_ZOOM, type PhysPt } from './framing';
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

export function CameraRig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 75, 50));
  const look = useRef(new THREE.Vector3(0, 0, -3));
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const framer = useMemo(() => new Framer(), []);
  // whole-table distance only changes with table / lens — cache it
  const fullCache = useRef({ key: '', d: 0 });
  useFrame((state, dt) => {
    const st = useGame.getState();
    const mode = st.cameraMode;
    const t = state.clock.elapsedTime;
    const C = TABLE.camera;
    const cam = camera as THREE.PerspectiveCamera;
    const lens = { fov: cam.fov, aspect: cam.aspect };
    // live balls (a ball riding a wire ramp counts at its ride height)
    const balls: PhysPt[] = [];
    let bx = 0;
    for (const b of gameRef.balls) {
      if (!b.active) continue;
      balls.push({ x: b.x, y: b.y, h: b.h ?? 0 });
      bx += b.x;
    }
    if (balls.length) bx /= balls.length;
    bx = THREE.MathUtils.clamp(bx, -C.clampX, C.clampX);

    if (mode === 'cinematic') {
      const by = balls.length ? THREE.MathUtils.clamp(balls.reduce((a, b) => a + b.y, 0) / balls.length, C.minY, C.maxY) : -6;
      const a = t * 0.18;
      targetPos.set(Math.sin(a) * 30, 60 + Math.sin(t * 0.4) * 7, 46 + Math.cos(a) * 9);
      targetLook.set(bx * 0.3, 0, -4 - by * 0.1);
    } else if (mode === 'broadcast' || mode === 'top') {
      // the whole table, always
      framer.fit(fullTablePoints(), { ...lens, elev: mode === 'top' ? ELEV.top : ELEV.player });
      targetPos.copy(framer.pos);
      targetLook.copy(framer.look);
    } else {
      // auto: fit flippers + every ball + a look-ahead band; zoom in only as far as MIN_ZOOM
      const key = `${TABLE.id}:${lens.fov}:${lens.aspect.toFixed(3)}`;
      if (fullCache.current.key !== key) {
        fullCache.current = { key, d: framer.fit(fullTablePoints(), { ...lens, elev: ELEV.player }) };
      }
      const full = fullCache.current.d;
      framer.fit(followPoints(balls), {
        ...lens, elev: ELEV.player, lookX: bx * 0.3, camXOffset: bx * 0.2, minDist: full * MIN_ZOOM,
      });
      targetPos.copy(framer.pos);
      targetLook.copy(framer.look);
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
