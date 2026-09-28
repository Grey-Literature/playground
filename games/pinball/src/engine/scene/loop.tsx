import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MAX_SPEED } from '../constants';
import { Framer, ELEV, fullTablePoints, followPoints, MIN_ZOOM, type PhysPt } from './framing';
import { TABLE } from '../table';
import { gameRef } from '../runtime';
import { useGame } from '../store';
import { sound } from '../audio';
import { simulate, resetStepper } from '../sim';
import { isLockstepFrozen, isLockstepHeld, runLockstepFrame } from '../agent';

// Drives the simulation: frame-rate independent fixed steps, then hands every
// physics event to the active theme's rules. Mounted first so it runs before
// any visual useFrame reads gameRef.
/**
 * Drives the simulation from the render clock (see engine/sim.ts), then sets the
 * rolling sound. Mounted first so it runs before any visual useFrame reads
 * gameRef. In agent lockstep mode the agent advances the game and this only
 * draws — unless the agent overruns its hold budget (engine/agent.ts), when the
 * game resumes here in real time until the agent acts again.
 */
export function PhysicsLoop() {
  const rollRef = useRef(0);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.25);
    const st = useGame.getState();
    if (st.paused || isLockstepFrozen()) { resetStepper(); sound.setRoll(0); return; }
    if (isLockstepHeld()) runLockstepFrame(dt); // stops on the step a ball reaches the flippers
    else simulate(dt);

    // rolling sound
    let maxSp = 0;
    for (const b of gameRef.balls) {
      if (!b.active || b.captured > 0 || b.ride) continue;
      maxSp = Math.max(maxSp, Math.hypot(b.vx, b.vy));
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
