// The Last Escalation — GRAYBOX scene (Phase 4 · B1). Plain markers for every
// toy so the flow can be playtested; the real art (office floor, racks,
// printer, Min Pin, the Core, E.S.C.A.L.A.T.E.'s camera) is B2.
// Surroundings reuse Dead Star Disco's cabinet for now.

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  Walls, Slings, Bumpers, Posts, Kickers, Flippers, Balls, Plunger, RideWires, useTier,
} from '../../engine/scene/parts';
import { PX, PZ } from '../../engine/scene/track';
import { ACTIVE, TABLE, kinematicPose } from '../../engine/table';
import { gameRef, flashOf, spinnerOf } from '../../engine/runtime';
import { Surroundings as DiscoSurroundings } from '../deadStarDisco/scene';
import { SLING_LEFT, SLING_RIGHT } from '../deadStarDisco/table';
import { useEscalation, silent, MINPIN_FRIEND_AT, type Shot } from './rules';
import { CORE_AT, PRINTER_AT, MINPIN_ORBIT } from './table';

const GREEN = '#39ff8e';
const RED = '#ff3b3b';
const AMBER = '#ffb020';
const BLUE = '#6fb9ff';
const SLINGS = [{ group: 'L', pts: SLING_LEFT }, { group: 'R', pts: SLING_RIGHT }];

/** Where each predictable shot is, for the printer's lit insert. */
const SHOT_AT: Record<Shot, { x: number; y: number }> = {
  cableRun: { x: -18.2, y: 7.2 },
  queue: { x: -18.6, y: 0 },
  server: { x: -12.6, y: 14.4 },
  minpin: { x: MINPIN_ORBIT.cx, y: MINPIN_ORBIT.cy },
};

function Floor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[47, 82]} />
        <meshStandardMaterial color="#05080a" roughness={0.7} metalness={0.15} />
      </mesh>
      <gridHelper args={[80, 40, '#0f3d26', '#0a1f16']} position={[0, 0.03, 1]} />
    </>
  );
}

function LaneLamps() {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lanes = TABLE.sensors.filter((s) => s.kind === 'lane');
  useFrame(() => {
    const lit = useEscalation.getState().lanes;
    lanes.forEach((_, i) => {
      const m = mats.current[i];
      if (m) m.emissiveIntensity = (lit[i] ? 2.2 : 0.15) + flashOf(`lane:${i}`) * 3;
    });
  });
  return (
    <group>
      {lanes.map((l, i) => (
        <mesh key={l.id} position={[PX(l.x), 0.08, PZ(l.y - 3)]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.25, 28]} />
          <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color="#04140b" emissive={GREEN} emissiveIntensity={0.15} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** THE UNDEAD SERVER: three blades that drop and rise again. */
function ServerBlades() {
  useTier();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((_, dt) => {
    ACTIVE.drops.forEach((d, i) => {
      const m = refs.current[i];
      if (m) {
        const target = gameRef.dropDown[d.id] ? -1.2 : 1.1;
        m.position.y += (target - m.position.y) * Math.min(1, dt * 14);
      }
      const mat = mats.current[i];
      if (mat) mat.emissiveIntensity = 0.5 + flashOf(`drop:${d.id}`) * 4 + flashOf('server') * 2;
    });
  });
  return (
    <group>
      {ACTIVE.drops.map((d, i) => (
        <mesh key={d.id} ref={(el) => { refs.current[i] = el; }} position={[PX(d.x), 1.1, PZ(d.y)]} castShadow>
          <boxGeometry args={[1.2, 2.2, d.r * 2 - 0.1]} />
          <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color="#1f2937" emissive={BLUE} emissiveIntensity={0.5} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** THE TICKET QUEUE spinner. */
function Queue() {
  const sn = TABLE.sensors.find((s) => s.id === 'queue')!;
  const blade = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (blade.current) blade.current.rotation.x = spinnerOf('queue').angle;
    if (mat.current) mat.current.emissiveIntensity = 0.6 + flashOf('queue') * 5;
  });
  return (
    <group position={[PX(sn.x), 0, PZ(sn.y)]}>
      {[-2.2, 2.2].map((ox) => (
        <mesh key={ox} position={[ox, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 3.2, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <group ref={blade} position={[0, 2.6, 0]}>
        <mesh position={[0, -1.1, 0]} castShadow>
          <boxGeometry args={[4.0, 2.2, 0.16]} />
          <meshStandardMaterial ref={mat} color="#e5e7eb" emissive={GREEN} emissiveIntensity={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** THE PRINTER THAT KNOWS (saucer) and its lit prediction insert. */
function Printer() {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const insert = useRef<THREE.Mesh>(null!);
  const insertMat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((state) => {
    const s = useEscalation.getState();
    const corrupt = !!s.corrupted;
    if (mat.current) {
      mat.current.emissive.set(corrupt ? RED : GREEN);
      mat.current.emissiveIntensity = (corrupt ? 0.9 + Math.sin(state.clock.elapsedTime * 6) * 0.4 : 0.35) + flashOf('printer') * 4;
    }
    const lit = s.prediction && gameRef.time <= s.predictionUntil ? SHOT_AT[s.prediction] : null;
    if (insert.current) {
      insert.current.visible = !!lit;
      if (lit) insert.current.position.set(PX(lit.x), 0.1, PZ(lit.y));
    }
    if (insertMat.current) insertMat.current.opacity = 0.45 + Math.sin(state.clock.elapsedTime * 5) * 0.25;
  });
  return (
    <>
      <group position={[PX(PRINTER_AT.x), 0, PZ(PRINTER_AT.y)]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.1, 32]} />
          <meshBasicMaterial color="#9ca3af" />
        </mesh>
        <mesh position={[3.2, 1.4, 0]} castShadow>
          <boxGeometry args={[2.4, 2.8, 3.2]} />
          <meshStandardMaterial ref={mat} color="#d1d5db" emissive={GREEN} emissiveIntensity={0.35} roughness={0.5} />
        </mesh>
      </group>
      <mesh ref={insert} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[2.2, 2.9, 32]} />
        <meshBasicMaterial ref={insertMat} color={AMBER} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </>
  );
}

/** THE CORE: dark until Act III's silence ends, then a red beacon. */
function Core() {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const s = useEscalation.getState();
    if (!mat.current) return;
    const hot = s.coreLit || s.act === 4;
    mat.current.emissive.set(hot ? RED : '#1e293b');
    mat.current.emissiveIntensity = (hot ? 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.3 : 0.2) + flashOf('core') * 4;
  });
  return (
    <group position={[PX(CORE_AT.x), 0, PZ(CORE_AT.y)]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.2, 32]} />
        <meshBasicMaterial color="#9ca3af" />
      </mesh>
      <mesh position={[0, 2.5, -3.4]} castShadow>
        <boxGeometry args={[3.6, 5, 1.6]} />
        <meshStandardMaterial ref={mat} color="#0b1220" emissive="#1e293b" emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** THE MIN PIN (orbiter): eyes red → amber → green as it warms up. */
function MinPin() {
  const k = TABLE.kinematics.find((x) => x.id === 'minpin')!;
  const ref = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (ref.current && pose.kind === 'orbiter') {
      ref.current.position.set(PX(pose.x), k.r, PZ(pose.y));
      ref.current.rotation.y = Math.atan2(pose.vx, pose.vy);
    }
    const hits = useEscalation.getState().minpinHits;
    if (eyes.current) {
      eyes.current.emissive.set(hits >= MINPIN_FRIEND_AT ? GREEN : hits >= 1 ? AMBER : RED);
      eyes.current.emissiveIntensity = 2 + flashOf('minpin') * 4;
    }
  });
  return (
    <group>
      <mesh position={[PX(MINPIN_ORBIT.cx), 0.05, PZ(MINPIN_ORBIT.cy)]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[MINPIN_ORBIT.orbit - 0.1, MINPIN_ORBIT.orbit + 0.1, 64]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.5} />
      </mesh>
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[k.r, 20, 20]} />
          <meshStandardMaterial color="#3f2a1d" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0.8]}>
          <boxGeometry args={[1.2, 0.25, 0.2]} />
          <meshStandardMaterial ref={eyes} color="#000" emissive={RED} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** THE ROLLBACK (hard+): a spinning bar. */
function Rollback() {
  useTier();
  const k = ACTIVE.kinematics.find((x) => x.id === 'rollback');
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!k || !ref.current) return;
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (pose.kind === 'bar') ref.current.rotation.y = pose.angle;
  });
  if (!k) return null;
  return (
    <mesh ref={ref} position={[PX(k.cx), 0.9, PZ(k.cy)]} castShadow>
      <boxGeometry args={[(k.half ?? 0) * 2, 1, k.r * 2]} />
      <meshStandardMaterial color="#64748b" emissive={RED} emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

/** THE SILENCE: the floor grid dims (no flashing). */
function SilenceVeil() {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((_, dt) => {
    if (!mat.current) return;
    const target = silent() ? 0.55 : 0;
    mat.current.opacity += (target - mat.current.opacity) * Math.min(1, dt * 2);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 1]}>
      <planeGeometry args={[47, 82]} />
      <meshBasicMaterial ref={mat} color="#000000" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Playfield() {
  const act = useEscalation((s) => s.act);
  const rack = act >= 2 ? [RED, '#ff6b6b', RED] : [GREEN, '#7dffb3', GREEN];
  return (
    <>
      <Floor />
      <SilenceVeil />
      <Walls />
      <Slings tris={SLINGS} glow={GREEN} rubber="#14532d" />
      <Bumpers colors={rack} skirt="#1f2937" cap="#030712" />
      <Posts ring={(id) => (id === 'cab' ? AMBER : id === 'firewall' ? RED : '#94a3b8')} />
      <Kickers head={RED} />
      <LaneLamps />
      <ServerBlades />
      <Queue />
      <Printer />
      <Core />
      <MinPin />
      <Rollback />
      <RideWires color="#9ca3af" glow={GREEN} />
      <Flippers
        left={{ body: '#e5e7eb', glow: '#14532d', inlay: GREEN }}
        right={{ body: '#e5e7eb', glow: '#14532d', inlay: GREEN }}
      />
      <Balls color="#f8fafc" light="#bbf7d0" beacon={GREEN} />
      <Plunger tip={RED} knob="#111827" ring={GREEN} />
    </>
  );
}

export const Surroundings = DiscoSurroundings;
