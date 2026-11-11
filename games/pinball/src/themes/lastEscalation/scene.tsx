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
import { setHum } from './sound';
import { useGame } from '../../engine/store';
import { useEscalation, silent, MINPIN_FRIEND_AT, PINS, type Shot } from './rules';
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

/** Server-room raised floor: vented tiles, cable runs and stray ticket paper (a canvas texture). */
function makeFloorTexture(): THREE.CanvasTexture {
  const W = 512, H = 894;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = '#080b0e';
  g.fillRect(0, 0, W, H);
  // raised-floor tiles, a few of them vented
  const T = 64;
  for (let y = 0; y < H; y += T) {
    for (let x = 0; x < W; x += T) {
      const v = 13 + Math.floor(r() * 6);
      g.fillStyle = `rgb(${v - 3},${v + 1},${v + 5})`;
      g.fillRect(x + 1, y + 1, T - 2, T - 2);
      if (r() < 0.18) {
        g.fillStyle = 'rgba(0,0,0,0.55)';
        for (let vy = y + 10; vy < y + T - 8; vy += 7) for (let vx = x + 10; vx < x + T - 8; vx += 7) g.fillRect(vx, vy, 3, 3);
      }
    }
  }
  // cable runs: dark bundles with a few coloured strands
  const cable = (w: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    const x0 = r() * W, y0 = r() < 0.5 ? -20 : H + 20;
    g.moveTo(x0, y0);
    g.bezierCurveTo(r() * W, r() * H, r() * W, r() * H, r() * W, r() < 0.5 ? -20 : H + 20);
    g.stroke();
  };
  for (let i = 0; i < 6; i++) cable(7 + r() * 5, '#05070a');
  for (const col of ['rgba(57,255,142,0.10)', 'rgba(255,59,59,0.10)', 'rgba(111,185,255,0.10)', 'rgba(57,255,142,0.07)']) cable(3, col);
  // stray tickets
  for (let i = 0; i < 7; i++) {
    g.save();
    g.translate(r() * W, r() * H);
    g.rotate((r() - 0.5) * 1.2);
    g.fillStyle = 'rgba(214,224,228,0.06)';
    g.fillRect(-18, -24, 36, 48);
    g.fillStyle = 'rgba(214,224,228,0.06)';
    for (let l = 0; l < 6; l++) g.fillRect(-13, -17 + l * 7, 18 + r() * 8, 2);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Floor() {
  const tex = useMemo(() => makeFloorTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
      <planeGeometry args={[47, 82]} />
      <meshStandardMaterial map={tex} roughness={0.75} metalness={0.15} />
    </mesh>
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

// ---------------- floor inserts: the floor shows you where to shoot ----------------
// Chevron arrows in front of each goal, an act ladder (I–IV) and the lanyard's
// 11 HTTP-code lamps. Each arrow escalates toward its target: the back
// chevron is green, the middle orange, the front red. They read the story
// store every frame:
//   chasing  — a goal to shoot: an Act I entity still to escalate, the shot
//              the printer predicted (it also gets the amber ring), the Act II
//              printer while a corrupted ticket is live, the lit Core
//   steady   — the Act II printer between tickets
//   faint    — nothing to do there right now
// The chase steps at 1.4 Hz per chevron (well under 3 flashes a second), and
// during THE SILENCE everything holds a steady, dim glow: no movement at all.

type ArrowId = 'printer' | 'minpin' | 'server' | 'lane' | 'core';
const ARROWS: { id: ArrowId; x: number; y: number; angle: number }[] = [
  { id: 'printer', x: 7, y: -2, angle: Math.PI / 4 },      // up-right, into the printer saucer
  { id: 'minpin', x: 1, y: -5, angle: Math.PI / 2 },       // up the middle, at the Min Pin's loop
  { id: 'server', x: -10.5, y: 13.2, angle: Math.PI },     // left, at the Undead Server's blades
  { id: 'lane', x: -18.6, y: -5, angle: Math.PI / 2 },     // up the left lane: the queue, then the cable run
  { id: 'core', x: 0, y: 20.6, angle: Math.PI / 2 },       // up between the racks, at the Core
];
const ORANGE = '#ff7a1a';
/** Back to front: green, orange, red. */
const CHEVRON_COLORS = [GREEN, ORANGE, RED];
const ACT_LAMPS = [-4.5, -1.5, 1.5, 4.5].map((x, i) => ({ x, y: -9.5, label: ['I', 'II', 'III', 'IV'][i] }));
const LANYARD_LAMPS = PINS.map((p, i) => {
  const a = (130 - (80 * i) / (PINS.length - 1)) * (Math.PI / 180);
  return { pin: p, x: Math.cos(a) * 9, y: -27 + Math.sin(a) * 9 };
});

function chevronGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.5, 0);
  s.lineTo(-0.3, 0.8);
  s.lineTo(-0.7, 0.8);
  s.lineTo(0.1, 0);
  s.lineTo(-0.7, -0.8);
  s.lineTo(-0.3, -0.8);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

/** A round lamp lens with a label printed on it (white on grey, so the material colour tints it). */
function lampTexture(label: string) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6b6b6b';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${label.length > 2 ? 54 : 70}px "VT323", "Share Tech Mono", monospace`;
  g.fillText(label, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const tint = (m: THREE.MeshBasicMaterial | null | undefined, hex: string, k: number) => {
  if (m) m.color.set(hex).multiplyScalar(k);
};

function FloorInserts() {
  const chev = useMemo(() => chevronGeometry(), []);
  const actTex = useMemo(() => ACT_LAMPS.map((l) => lampTexture(l.label)), []);
  const pinTex = useMemo(() => LANYARD_LAMPS.map((l) => lampTexture(String(l.pin))), []);
  const arrowMats = useRef<(THREE.MeshBasicMaterial | null)[][]>(ARROWS.map(() => []));
  const actMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const pinMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = useEscalation.getState();
    const quiet = silent();
    const pred = s.prediction && gameRef.time <= s.predictionUntil ? s.prediction : null;
    const minpinOn = ACTIVE.kinematics.some((k) => k.id === 'minpin');
    const act1 = s.act === 1;

    const want = (id: ArrowId): { color: string; chase: boolean } | null => {
      switch (id) {
        case 'printer':
          if (s.act === 2) return { color: RED, chase: !!s.corrupted };
          return act1 && !s.escalated.printer ? { color: GREEN, chase: true } : null;
        case 'minpin':
          if (pred === 'minpin') return { color: AMBER, chase: true };
          return act1 && minpinOn && !s.escalated.minpin ? { color: GREEN, chase: true } : null;
        case 'server':
          if (pred === 'server') return { color: AMBER, chase: true };
          return act1 && !s.escalated.server ? { color: GREEN, chase: true } : null;
        case 'lane':
          if (pred === 'queue' || pred === 'cableRun') return { color: AMBER, chase: true };
          return act1 && !s.escalated.queue ? { color: GREEN, chase: true } : null;
        case 'core':
          return s.coreLit || s.act === 4 ? { color: RED, chase: true } : null;
      }
    };

    const step = Math.floor((t * 1.4) % 3); // which chevron is lit (back to front)
    ARROWS.forEach((a, ai) => {
      const w = want(a.id);
      arrowMats.current[ai].forEach((m, ci) => {
        const c = CHEVRON_COLORS[ci];
        if (!w) tint(m, c, 0.22);
        else if (quiet || !w.chase) tint(m, c, quiet ? 0.35 : 0.8);
        else tint(m, c, ci === step ? 1.6 : 0.35);
      });
    });

    ACT_LAMPS.forEach((_, i) => {
      const n = i + 1;
      const color = n === 4 ? RED : GREEN;
      if (n < s.act) tint(actMats.current[i], GREEN, 0.7);
      else if (n === s.act) tint(actMats.current[i], color, quiet ? 0.6 : 0.9 + Math.sin(t * 2.2) * 0.45);
      else tint(actMats.current[i], '#46564d', 1.0);
    });

    LANYARD_LAMPS.forEach((l, i) => {
      if (s.pins[l.pin]) tint(pinMats.current[i], s.lanyardPaid ? AMBER : GREEN, 1.0);
      else tint(pinMats.current[i], '#46564d', 1.0);
    });
  });

  return (
    <group>
      {ARROWS.map((a, ai) => (
        <group key={a.id} position={[PX(a.x), 0.07, PZ(a.y)]} rotation={[0, a.angle, 0]}>
          {[-1.1, 0, 1.1].map((ox, ci) => (
            <mesh key={ox} geometry={chev} position={[ox, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <meshBasicMaterial ref={(el) => { arrowMats.current[ai][ci] = el; }} color="#1c3326" transparent opacity={0.9} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
      {ACT_LAMPS.map((l, i) => (
        <mesh key={l.label} position={[PX(l.x), 0.07, PZ(l.y)]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.05, 28]} />
          <meshBasicMaterial ref={(el) => { actMats.current[i] = el; }} map={actTex[i]} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {LANYARD_LAMPS.map((l, i) => (
        <mesh key={l.pin} position={[PX(l.x), 0.07, PZ(l.y)]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.6, 20]} />
          <meshBasicMaterial ref={(el) => { pinMats.current[i] = el; }} map={pinTex[i]} transparent toneMapped={false} depthWrite={false} />
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

/** THE PRINTER THAT KNOWS (saucer) and its lit prediction insert. The paper feeds out when it prints. */
function Printer() {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const led = useRef<THREE.MeshStandardMaterial>(null!);
  const paper = useRef<THREE.Mesh>(null!);
  const insert = useRef<THREE.Mesh>(null!);
  const insertMat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = useEscalation.getState();
    const corrupt = !!s.corrupted;
    const fl = flashOf('printer');
    if (mat.current) {
      mat.current.emissive.set(corrupt ? RED : GREEN);
      mat.current.emissiveIntensity = (corrupt ? 0.35 + Math.sin(t * 4) * 0.15 : 0.06) + fl * 1.2;
    }
    if (led.current) {
      led.current.emissive.set(corrupt ? RED : GREEN);
      led.current.emissiveIntensity = corrupt ? 2.4 : 1.4;
    }
    // paper slides out while the flash is up, then settles back into the tray
    if (paper.current) paper.current.position.x = -1.2 - fl * 1.6;
    const lit = s.prediction && gameRef.time <= s.predictionUntil ? SHOT_AT[s.prediction] : null;
    if (insert.current) {
      insert.current.visible = !!lit;
      if (lit) insert.current.position.set(PX(lit.x), 0.1, PZ(lit.y));
    }
    if (insertMat.current) insertMat.current.opacity = 0.45 + Math.sin(t * 5) * 0.25;
  });
  return (
    <>
      <group position={[PX(PRINTER_AT.x), 0, PZ(PRINTER_AT.y)]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.1, 32]} />
          <meshBasicMaterial color="#9ca3af" />
        </mesh>
        <group position={[3.3, 0, 0]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[2.4, 2.6, 3.6]} />
            <meshStandardMaterial ref={mat} color="#cfd4da" emissive={GREEN} emissiveIntensity={0.06} roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.66, 0.2]}>
            <boxGeometry args={[2.0, 0.12, 2.6]} />
            <meshStandardMaterial color="#6b7280" roughness={0.6} />
          </mesh>
          <mesh position={[-1.21, 1.45, 0]}>
            <boxGeometry args={[0.04, 0.25, 2.8]} />
            <meshStandardMaterial color="#030712" />
          </mesh>
          <mesh ref={paper} position={[-1.2, 1.45, 0]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[1.6, 0.04, 2.3]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          <mesh position={[-0.6, 2.4, 1.81]}>
            <boxGeometry args={[0.7, 0.35, 0.04]} />
            <meshStandardMaterial ref={led} color="#000" emissive={GREEN} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <mesh ref={insert} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[2.2, 2.9, 32]} />
        <meshBasicMaterial ref={insertMat} color={AMBER} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </>
  );
}

/** THE CORE: a monolith of blade servers. T3 blue at rest; red once it's lit (and through Act IV). */
function Core() {
  const leds = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const beacon = useRef<THREE.MeshStandardMaterial>(null!);
  const BLADES = 9;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = useEscalation.getState();
    const hot = s.coreLit || s.act === 4;
    const fl = flashOf('core');
    leds.current.forEach((m, i) => {
      if (!m) return;
      m.emissive.set(hot ? RED : BLUE);
      // a slow wave up the blades (one cycle every ~2.5 s), never a strobe
      const wave = 0.5 + 0.5 * Math.sin(t * 2.5 - i * 0.7);
      m.emissiveIntensity = (hot ? 1.2 + wave * 1.4 : 0.35 + wave * 0.5) + fl * 3;
    });
    if (beacon.current) beacon.current.emissiveIntensity = hot ? 1.6 + Math.sin(t * 3) * 0.6 + fl * 3 : 0.1;
  });
  return (
    <group position={[PX(CORE_AT.x), 0, PZ(CORE_AT.y)]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.2, 32]} />
        <meshBasicMaterial color="#9ca3af" />
      </mesh>
      <group position={[0, 0, -3.5]}>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <boxGeometry args={[4.6, 0.5, 2.2]} />
          <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 3.2, 0]} castShadow>
          <boxGeometry args={[3.8, 5.4, 1.6]} />
          <meshStandardMaterial color="#05070b" metalness={0.75} roughness={0.3} />
        </mesh>
        {Array.from({ length: BLADES }, (_, i) => (
          <group key={i} position={[0, 1.0 + i * 0.52, 0.81]}>
            <mesh>
              <boxGeometry args={[3.4, 0.38, 0.04]} />
              <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[1.2, 0, 0.03]}>
              <boxGeometry args={[0.7, 0.1, 0.02]} />
              <meshStandardMaterial ref={(el) => { leds.current[i] = el; }} color="#000" emissive={BLUE} emissiveIntensity={0.5} toneMapped={false} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 6.2, 0]}>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshStandardMaterial ref={beacon} color="#3b0a0a" emissive={RED} emissiveIntensity={0.1} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** THE MIN PIN (orbiter): a small black-and-tan dog. Eyes red → amber → green; it wags once it's friend-shaped. */
function MinPin() {
  useTier();
  const k = ACTIVE.kinematics.find((x) => x.id === 'minpin');
  const ref = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    if (!k) return;
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (ref.current && pose.kind === 'orbiter') {
      ref.current.position.set(PX(pose.x), k.r, PZ(pose.y));
      ref.current.rotation.y = Math.atan2(pose.vx, pose.vy);
    }
    const hits = useEscalation.getState().minpinHits;
    const friend = hits >= MINPIN_FRIEND_AT;
    if (tail.current) tail.current.rotation.z = friend ? Math.sin(state.clock.elapsedTime * 7) * 0.5 : 0;
    if (eyes.current) {
      eyes.current.emissive.set(friend ? GREEN : hits >= 1 ? AMBER : RED);
      eyes.current.emissiveIntensity = 2 + flashOf('minpin') * 4;
    }
  });
  if (!k) return null;
  const BLACK = '#17110d';
  const TAN = '#a3562a';
  return (
    <group>
      <mesh position={[PX(k.cx), 0.05, PZ(k.cy)]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[(k.orbit ?? 0) - 0.1, (k.orbit ?? 0) + 0.1, 64]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.5} />
      </mesh>
      <group ref={ref}>
        <mesh scale={[0.6, 0.55, 1.05]} castShadow>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color={BLACK} roughness={0.55} />
        </mesh>
        {[[-0.32, 0.55], [0.32, 0.55], [-0.32, -0.55], [0.32, -0.55]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, -0.75, z]}>
            <cylinderGeometry args={[0.11, 0.09, 0.9, 8]} />
            <meshStandardMaterial color={TAN} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.55, 1.0]} castShadow>
          <sphereGeometry args={[0.46, 16, 12]} />
          <meshStandardMaterial color={BLACK} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.42, 1.45]} scale={[0.6, 0.55, 1]}>
          <sphereGeometry args={[0.3, 12, 10]} />
          <meshStandardMaterial color={TAN} roughness={0.6} />
        </mesh>
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 1.05, 0.9]} rotation={[0, 0, x < 0 ? 0.25 : -0.25]}>
            <coneGeometry args={[0.15, 0.55, 8]} />
            <meshStandardMaterial color={BLACK} roughness={0.55} />
          </mesh>
        ))}
        <mesh position={[0, 0.66, 1.4]}>
          <boxGeometry args={[0.5, 0.09, 0.05]} />
          <meshStandardMaterial ref={eyes} color="#000" emissive={RED} emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <group ref={tail} position={[0, 0.3, -1.0]}>
          <mesh position={[0, 0.3, -0.1]} rotation={[-0.5, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.65, 6]} />
            <meshStandardMaterial color={BLACK} roughness={0.55} />
          </mesh>
        </group>
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
    g.current.scale.setScalar(1.45 * (1 + fl * 0.12));
  });
  if (!p) return null;
  return (
    <group position={[PX(p.x), 0, PZ(p.y)]}>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[p.r, 0.22, 10, 28]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      <group ref={g} rotation={[0, -0.5, 0]} scale={1.45}>
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
    <group position={[PX(k.x), 0, PZ(k.y)]} scale={1.4}>
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

      <Cabinet sideArt={sideArt} look={CABINET}>
        <RailCamera />
      </Cabinet>

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

/** The server-room hum: on while a ball is in play, faded out for THE SILENCE. */
function Hum() {
  useFrame(() => {
    const g = useGame.getState();
    const on = g.phase === 'playing' && !g.paused;
    if (on && silent()) setHum(0, 1.2);
    else setHum(on ? 0.05 : 0, 0.4);
  });
  useEffect(() => () => setHum(0, 0.2), []);
  return null;
}

/**
 * E.S.C.A.L.A.T.E.'s camera on the right cabinet rail. In Act I it sweeps the
 * table; from Act II it follows the ball, its LED red.
 */
function RailCamera() {
  const head = useRef<THREE.Group>(null!);
  const led = useRef<THREE.MeshStandardMaterial>(null!);
  const AT = { x: 25.2, y: 5.3, z: -12 };
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const act = useEscalation.getState().act;
    let yaw = -Math.PI / 2 - 0.5 + Math.sin(t * 0.45) * 0.55; // the Act I sweep across the table
    if (act >= 2) {
      const ball = gameRef.balls.find((b) => b.active);
      if (ball) yaw = Math.atan2(PX(ball.x) - AT.x, PZ(ball.y) - AT.z);
    }
    if (head.current) {
      let d = yaw - head.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      head.current.rotation.y += d * Math.min(1, dt * 4);
    }
    if (led.current) {
      led.current.emissive.set(act >= 2 ? RED : GREEN);
      led.current.emissiveIntensity = act >= 2 ? 3 : 0.6 + (Math.sin(t * 2) > 0 ? 0.6 : 0);
    }
  });
  return (
    <group position={[AT.x, AT.y, AT.z]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1.0, 10]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={head} position={[0, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group rotation={[0.35, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 0.9, 1.9]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.36, 0.4, 0.3, 18]} />
            <meshStandardMaterial color="#030712" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0.32, 0.3, 0.96]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial ref={led} color="#000" emissive={GREEN} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function Playfield() {
  const act = useEscalation((s) => s.act);
  return (
    <>
      <Hum />
      <Floor />
      <FloorInserts />
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
      <RideWires color="#b91c1c" glow={RED} />
      <Flippers
        left={{ body: '#e5e7eb', glow: '#14532d', inlay: GREEN }}
        right={{ body: '#e5e7eb', glow: '#14532d', inlay: GREEN }}
      />
      <Balls color="#f8fafc" light="#bbf7d0" beacon={GREEN} />
      <Plunger tip={RED} knob="#111827" ring={GREEN} />
    </>
  );
}

