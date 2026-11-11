// The Last Escalation — scene (Phase 4 · B1, graybox plus the first playtest's
// art: the three bumper toys, the obstacle ladder and the cabinet). The rest of
// the real art (office floor, printer, Min Pin, the Core, E.S.C.A.L.A.T.E.'s
// camera) is B2.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Cabinet, type CabinetLook } from '../../engine/scene/cabinet';
import {
  Walls, Slings, Posts, Kickers, Flippers, Balls, Plunger, RideWires, useTier,
} from '../../engine/scene/parts';
import { PX, PZ } from '../../engine/scene/track';
import { ACTIVE, TABLE, kinematicPose } from '../../engine/table';
import { gameRef, flashOf, spinnerOf } from '../../engine/runtime';
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

// ---------------- the three middle bumpers: a printer, a teapot, an undead host ----------------
// Physics is still a round bumper (r 2.4); each shape fits inside that circle,
// and a lit rubber ring on the floor shows the real edge.

type ToyRefs = { mats: THREE.MeshStandardMaterial[]; pop: THREE.Group | null; light: THREE.PointLight | null };
type ToyProps = { accent: string; refs: ToyRefs };

/** Collect a material so a hit can flash it. */
const keep = (refs: ToyRefs) => (el: THREE.MeshStandardMaterial | null) => {
  if (el && !refs.mats.includes(el)) refs.mats.push(el);
};

function PrinterToy({ accent, refs }: ToyProps) {
  const m = keep(refs);
  return (
    <group rotation={[0, 0.25, 0]}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[3.6, 1.7, 2.6]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.55} />
      </mesh>
      {/* paper feed tray, tilted up at the back, with a sheet in it */}
      <mesh position={[0, 2.35, -1.05]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[2.8, 0.12, 1.5]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.55, -1.1]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[2.3, 0.04, 1.7]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      {/* output slot and the ticket coming out of it */}
      <mesh position={[0, 1.35, 1.31]}>
        <boxGeometry args={[2.6, 0.22, 0.04]} />
        <meshStandardMaterial color="#030712" />
      </mesh>
      <mesh position={[0, 1.2, 1.75]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[2.1, 0.04, 0.95]} />
        <meshStandardMaterial ref={m} color="#f8fafc" emissive={accent} emissiveIntensity={0.15} roughness={0.9} />
      </mesh>
      {/* status panel */}
      <mesh position={[1.25, 2.02, 0.9]}>
        <boxGeometry args={[0.8, 0.06, 0.5]} />
        <meshStandardMaterial ref={m} color="#030712" emissive={accent} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function TeapotToy({ accent, refs }: ToyProps) {
  const geo = useMemo(() => {
    const g = new TeapotGeometry(1, 8);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const s = 4.3 / (b.max.x - b.min.x); // spout tip to handle fits inside the bumper
    g.scale(s, s, s);
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new THREE.Vector3());
    g.translate(-c.x, -g.boundingBox!.min.y, -c.z);
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0.3, 0]} rotation={[0, -0.5, 0]} castShadow>
      <meshStandardMaterial ref={keep(refs)} color="#f1f5f9" emissive={accent} emissiveIntensity={0.25} roughness={0.2} metalness={0.05} />
    </mesh>
  );
}

function HostToy({ accent, refs }: ToyProps) {
  const ghost = useRef<THREE.Group>(null!);
  const leds = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ghost.current) {
      ghost.current.position.y = 4.5 + Math.sin(t * 1.4) * 0.3;
      ghost.current.rotation.y = Math.sin(t * 0.7) * 0.4;
    }
    // drive lights blink slowly (well under 3 flashes a second)
    leds.current.forEach((l, i) => { if (l) l.emissiveIntensity = Math.sin(t * (1.1 + i * 0.6) + i) > 0.2 ? 2 : 0.2; });
  });
  const m = keep(refs);
  return (
    <group>
      {/* a tower server with a tombstone top */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[2.4, 3.2, 2.4]} />
        <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 2.4, 24, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* rack-unit slots and drive lights */}
      {[0.7, 1.3, 1.9, 2.5].map((y, i) => (
        <group key={y}>
          <mesh position={[0, y, 1.21]}>
            <boxGeometry args={[1.9, 0.08, 0.02]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh position={[0.75, y + 0.22, 1.22]}>
            <boxGeometry args={[0.18, 0.12, 0.02]} />
            <meshStandardMaterial ref={(el) => { leds.current[i] = el; }} color="#000" emissive={i % 2 ? AMBER : accent} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* its eyes */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 3.35, 1.18]}>
          <boxGeometry args={[0.42, 0.16, 0.06]} />
          <meshStandardMaterial ref={m} color="#000" emissive={accent} emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      ))}
      {/* the ghost session rising out of it */}
      <group ref={ghost} position={[0, 4.5, 0]}>
        <mesh>
          <sphereGeometry args={[0.75, 18, 14]} />
          <meshStandardMaterial ref={m} color="#e2fbe9" emissive={accent} emissiveIntensity={0.6} transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.85, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.72, 1.1, 18, 1, true]} />
          <meshStandardMaterial color="#e2fbe9" emissive={accent} emissiveIntensity={0.4} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

const RACK_TOYS: Record<string, typeof PrinterToy> = { rack0: PrinterToy, rack1: TeapotToy, rack2: HostToy };

function RackToys({ accent }: { accent: string }) {
  useTier();
  const list = ACTIVE.bumpers;
  const refs = useRef<Record<string, ToyRefs>>({});
  const ring = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  for (const b of list) refs.current[b.id] ??= { mats: [], pop: null, light: null };
  useFrame(() => {
    list.forEach((b, i) => {
      const r = refs.current[b.id];
      const fl = flashOf(`bumper:${b.id}`);
      r.mats.forEach((mat) => {
        mat.userData.base ??= mat.emissiveIntensity;
        mat.emissiveIntensity = mat.userData.base + fl * 4;
      });
      if (r.pop) { const s = 1 + fl * 0.1; r.pop.scale.set(s, 1 + fl * 0.06, s); }
      if (r.light) r.light.intensity = 4 + fl * 90;
      if (ring.current[i]) ring.current[i]!.emissiveIntensity = 0.9 + fl * 5;
    });
  });
  return (
    <group>
      {list.map((b, i) => {
        const Toy = RACK_TOYS[b.id] ?? HostToy;
        const r = refs.current[b.id];
        return (
          <group key={b.id} position={[PX(b.x), 0, PZ(b.y)]}>
            <mesh position={[0, 0.1, 0]} receiveShadow>
              <cylinderGeometry args={[b.r + 0.5, b.r + 0.7, 0.2, 32]} />
              <meshStandardMaterial color="#020617" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[b.r - 0.1, 0.22, 10, 40]} />
              <meshStandardMaterial ref={(el) => { ring.current[i] = el; }} color="#0b1a12" emissive={accent} emissiveIntensity={0.9} roughness={0.4} />
            </mesh>
            <group ref={(el) => { r.pop = el; }}>
              <Toy accent={accent} refs={r} />
            </group>
            <pointLight ref={(el) => { r.light = el; }} position={[0, 5, 0]} color={accent} intensity={4} distance={24} decay={1.8} />
          </group>
        );
      })}
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

// ---------------- the obstacle ladder (one new set per tier) ----------------

/** THE RUBBER DUCK (every tier): a big friendly post. It wobbles when hit. */
function Duck() {
  useTier();
  const p = ACTIVE.posts.find((x) => x.id === 'duck');
  const g = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!g.current) return;
    const fl = flashOf('duck');
    g.current.rotation.z = Math.sin(state.clock.elapsedTime * 18) * 0.18 * fl;
    g.current.scale.setScalar(1 + fl * 0.12);
  });
  if (!p) return null;
  return (
    <group position={[PX(p.x), 0, PZ(p.y)]}>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[p.r, 0.22, 10, 28]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      <group ref={g} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.95, 0]} scale={[0.95, 0.75, 1.2]} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.35, -1.05]} rotation={[-0.9, 0, 0]}>
          <coneGeometry args={[0.35, 0.7, 12]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.9, 0.55]} castShadow>
          <sphereGeometry args={[0.6, 18, 14]} />
          <meshStandardMaterial color="#facc15" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.8, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.24, 0.55, 12]} />
          <meshStandardMaterial color="#f97316" roughness={0.5} />
        </mesh>
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 2.05, 1.03]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** THE PAGER (easy+): a spring kicker with a pager clipped on top. It buzzes when hit. */
function Pager() {
  useTier();
  const k = ACTIVE.kickers.find((x) => x.id === 'pager');
  const g = useRef<THREE.Group>(null!);
  const lcd = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('pager');
    if (g.current) {
      g.current.position.x = Math.sin(t * 60) * 0.08 * fl;
      g.current.position.y = Math.sin(t * 2.2) * 0.1;
    }
    if (lcd.current) lcd.current.emissiveIntensity = 0.8 + fl * 4;
  });
  if (!k) return null;
  return (
    <group position={[PX(k.x), 0, PZ(k.y)]}>
      <group ref={g}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 2.2, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.15, 8, 18]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, 2.5, 0]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.7, 0.6, 1.0]} />
          <meshStandardMaterial color="#111827" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.72, 0.12]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[1.2, 0.04, 0.5]} />
          <meshStandardMaterial ref={lcd} color="#000" emissive={GREEN} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** A swinging flapper (THE LEGACY SYSTEM, THE TECH DEBT). */
function SwingBar({ id, body, glow, bands }: { id: string; body: string; glow: string; bands: string }) {
  useTier();
  const k = ACTIVE.kinematics.find((x) => x.id === id);
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (!k) return;
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (ref.current && pose.kind === 'bar') ref.current.rotation.y = pose.angle;
    if (mat.current) mat.current.emissiveIntensity = 0.25 + flashOf(id) * 4;
  });
  if (!k) return null;
  const len = (k.half ?? 0) * 2;
  return (
    <group position={[PX(k.cx), 0, PZ(k.cy)]}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 1.6, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={ref}>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[len, 1.2, k.r * 2]} />
          <meshStandardMaterial ref={mat} color={body} emissive={glow} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
        {[-0.3, 0.3].map((f) => (
          <mesh key={f} position={[f * len, 1.0, 0]}>
            <boxGeometry args={[0.35, 1.25, k.r * 2 + 0.05]} />
            <meshStandardMaterial color={bands} roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** THE ZOMBIE PROCESS (hard+): an orbiter that shambles arms-first. */
function Zombie() {
  useTier();
  const k = ACTIVE.kinematics.find((x) => x.id === 'zombie');
  const ref = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (!k) return;
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (ref.current && pose.kind === 'orbiter') {
      ref.current.position.set(PX(pose.x), k.r, PZ(pose.y));
      ref.current.rotation.y = Math.atan2(pose.vx, pose.vy);
    }
    if (eyes.current) eyes.current.emissiveIntensity = 2 + flashOf('zombie') * 4;
  });
  if (!k) return null;
  return (
    <group>
      <mesh position={[PX(k.cx), 0.05, PZ(k.cy)]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[(k.orbit ?? 0) - 0.1, (k.orbit ?? 0) + 0.1, 48]} />
        <meshBasicMaterial color="#3f6212" transparent opacity={0.45} />
      </mesh>
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[k.r, 18, 16]} />
          <meshStandardMaterial color="#5b7f4a" roughness={0.8} />
        </mesh>
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0.15, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.9, 8]} />
            <meshStandardMaterial color="#5b7f4a" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.4, 0.82]}>
          <boxGeometry args={[0.8, 0.14, 0.12]} />
          <meshStandardMaterial ref={eyes} color="#000" emissive={RED} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------- the cabinet ----------------

function makeSideArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#030406';
  g.fillRect(0, 0, 256, 1024);
  // faint scanlines and a few dead-pixel red bars
  for (let y = 0; y < 1024; y += 6) {
    g.fillStyle = 'rgba(57,255,142,0.045)';
    g.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(255,59,59,${0.15 + ((i * 37) % 10) / 40})`;
    g.fillRect((i * 53) % 236, (i * 211) % 1000, 6 + (i % 3) * 6, 3);
  }
  g.save();
  g.translate(128, 512);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.shadowColor = GREEN; g.shadowBlur = 22;
  g.fillStyle = '#d1ffe4';
  g.font = '92px "VT323", "Share Tech Mono", monospace';
  g.fillText('TICKET #666', 0, -6);
  g.shadowColor = RED; g.shadowBlur = 14;
  g.fillStyle = '#ff6767';
  g.font = '40px "VT323", "Share Tech Mono", monospace';
  g.fillText('THE LAST ESCALATION', 0, 52);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CABINET: CabinetLook = {
  body: '#0a0d10',
  trim: [GREEN, RED],
  glass: { color: '#020604', glow: '#0c3d22' },
  bars: [GREEN, RED, AMBER],
  topper: GREEN,
  beacon: { base: '#3b0a0a', lit: RED, isLit: () => { const s = useEscalation.getState(); return s.coreLit || s.act === 4; } },
};

/** Cabinet, room lighting, environment and post-processing. */
export function Surroundings() {
  const [sideArt, setSideArt] = useState(() => makeSideArt());
  useEffect(() => {
    // redraw once the terminal font has loaded (the first pass may use the fallback)
    let live = true;
    document.fonts?.load('92px "VT323"').then(() => { if (live) setSideArt(makeSideArt()); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <>
      <color attach="background" args={['#020304']} />
      <fog attach="fog" args={['#020304', 140, 300]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[25, 90, 55]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-30, 60, -20]} intensity={0.3} color="#a7f3d0" />
      <pointLight position={[0, 26, 30]} intensity={30} distance={110} color="#bbf7d0" decay={1.9} />
      <pointLight position={[0, 20, -34]} intensity={50} distance={90} color="#7f1d1d" decay={1.9} />

      <Cabinet sideArt={sideArt} look={CABINET} />

      <mesh position={[0, -31.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#050607" roughness={0.4} metalness={0.5} />
      </mesh>
      <ContactShadows position={[0, -31, 5]} opacity={0.75} scale={120} blur={2.4} far={60} color="#000000" />
      <mesh position={[0, -30.9, 52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive={GREEN} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, -30.9, -52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive={RED} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 20, 30]} scale={[60, 10, 1]} color="#e2fbe9" />
        <Lightformer intensity={2} position={[-30, 10, -10]} scale={[30, 6, 1]} color={GREEN} />
        <Lightformer intensity={1.6} position={[30, 10, -10]} scale={[30, 6, 1]} color={RED} />
        <Lightformer intensity={1.1} position={[0, 30, -30]} scale={[50, 8, 1]} color={AMBER} />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.5} luminanceSmoothing={0.25} />
        <Vignette darkness={0.75} offset={0.22} />
      </EffectComposer>
    </>
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
  return (
    <>
      <Floor />
      <SilenceVeil />
      <Walls />
      <Slings tris={SLINGS} glow={GREEN} rubber="#14532d" />
      <RackToys key={act >= 2 ? 'red' : 'green'} accent={act >= 2 ? RED : GREEN} />
      <Posts only={(id) => id !== 'duck'} ring={(id) => (id === 'cab' ? AMBER : id === 'firewall' ? RED : '#94a3b8')} />
      <Kickers only={(id) => id !== 'pager'} head={RED} />
      <Duck />
      <Pager />
      <SwingBar id="legacy" body="#d6cfb4" glow={AMBER} bands="#8a8370" />
      <SwingBar id="techdebt" body="#7c2d12" glow={RED} bands="#9ca3af" />
      <Zombie />
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

