// Generic, table-driven scene parts. Each reads geometry from TABLE/ACTIVE and
// takes its look as props (defaults = Dead Star Disco), so a theme composes
// these inside its Playfield and only writes custom meshes for its set-pieces.

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BALL_RADIUS } from '../constants';
import { TABLE, ACTIVE, samplePath, rideById } from '../table';
import type { WallSeg, PathPt } from '../types';
import { gameRef, flashOf } from '../runtime';
import { useGame } from '../store';
import { DIFF } from '../difficulty';
import { PX, PZ, triangleGeo, makeFlipperGeometry } from './track';

/** Re-render when the tier (and so the active obstacle set) changes. */
export function useTier() {
  return useGame((s) => s.difficulty);
}

// ---------------- Walls ----------------
export interface WallLook { h: number; color: string; metal: number }

const defaultWallLook = (w: WallSeg): WallLook => (
  w.kind === 'guide'
    ? { h: 2.4, color: '#38bdf8', metal: 0.4 }
    : { h: 3.2, color: '#e2e8f0', metal: 0.9 }
);

export function Walls({ look = defaultWallLook, capColor = '#f8fafc' }: { look?: (w: WallSeg) => WallLook; capColor?: string }) {
  useTier();
  const items = ACTIVE.walls.filter((w) => w.kind !== 'sling').map((w) => {
    const dx = w.bx - w.ax, dy = w.by - w.ay;
    return {
      w, len: Math.hypot(dx, dy),
      mx: (w.ax + w.bx) / 2, my: (w.ay + w.by) / 2,
      rotY: Math.atan2(dy, dx), look: look(w),
    };
  });
  const cap = TABLE.plunger.cap;
  return (
    <group>
      {items.map(({ w, len, mx, my, rotY, look: l }) => (
        <mesh key={w.id} position={[PX(mx), l.h / 2, PZ(my)]} rotation={[0, rotY, 0]} castShadow receiveShadow>
          <boxGeometry args={[len + 0.7, l.h, 0.75]} />
          <meshStandardMaterial color={l.color} roughness={0.3} metalness={l.metal} />
        </mesh>
      ))}
      {/* divider top cap post */}
      <mesh position={[cap.x, 1.2, PZ(cap.y)]} castShadow>
        <cylinderGeometry args={[cap.r + 0.1, cap.r + 0.1, 2.6, 16]} />
        <meshStandardMaterial color={capColor} roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ---------------- Slingshots ----------------
/** Draws a sling triangle per `group`; flash key is `sling:<group>`. */
export function Slings({ tris, glow = '#ef4444', body = '#f1f5f9', rubber = '#dc2626' }: {
  tris: { group: string; pts: [number, number][] }[];
  glow?: string; body?: string; rubber?: string;
}) {
  const geos = useMemo(() => tris.map(({ pts: p }) => triangleGeo(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], 1.5)), [tris]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(() => {
    tris.forEach((t, i) => {
      const f = flashOf(`sling:${t.group}`);
      if (mats.current[i]) mats.current[i]!.emissiveIntensity = 0.5 + f * 5;
      if (lights.current[i]) lights.current[i]!.intensity = 2 + f * 40;
    });
  });
  return (
    <group>
      {tris.map((t, i) => {
        const p = t.pts;
        const edges = [{ a: p[1], b: p[2] }, { a: p[2], b: p[0] }];
        return (
          <group key={t.group}>
            <mesh geometry={geos[i]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} castShadow>
              <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color={body} roughness={0.35} metalness={0.1} emissive={glow} emissiveIntensity={0.5} />
            </mesh>
            {/* rubber edge trim along the kicking faces */}
            {edges.map((e, j) => {
              const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1];
              return (
                <mesh key={j} position={[(e.a[0] + e.b[0]) / 2, 1.35, -(e.a[1] + e.b[1]) / 2]} rotation={[0, Math.atan2(dy, dx), 0]}>
                  <boxGeometry args={[Math.hypot(dx, dy), 0.5, 0.5]} />
                  <meshStandardMaterial color={rubber} roughness={0.6} />
                </mesh>
              );
            })}
            <pointLight ref={(el) => { lights.current[i] = el; }} position={[p[2][0], 4, PZ(p[2][1])]} color={glow} intensity={2} distance={18} />
          </group>
        );
      })}
    </group>
  );
}

// ---------------- Pop bumpers ----------------
export function Bumpers({ colors = ['#22d3ee', '#e879f9', '#fbbf24', '#4ade80', '#f472b6'], skirt = '#f8fafc', cap = '#0f172a' }: {
  colors?: string[]; skirt?: string; cap?: string;
}) {
  useTier();
  const list = ACTIVE.bumpers;
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const caps = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    list.forEach((b, i) => {
      const fl = flashOf(`bumper:${b.id}`);
      const pulse = 0.5 + Math.sin(t * 3 + i * 2.1) * 0.15;
      if (mats.current[i]) mats.current[i]!.emissiveIntensity = pulse + fl * 6;
      if (caps.current[i]) caps.current[i]!.emissiveIntensity = 0.4 + fl * 4;
      if (lights.current[i]) lights.current[i]!.intensity = 4 + fl * 90;
      if (groups.current[i]) {
        const s = 1 + fl * 0.12;
        groups.current[i]!.scale.set(s, 1, s);
      }
    });
  });
  return (
    <group>
      {list.map((b, i) => {
        const col = colors[i % colors.length];
        return (
          <group key={b.id} position={[PX(b.x), 0, PZ(b.y)]}>
            <mesh position={[0, 0.12, 0]} receiveShadow>
              <cylinderGeometry args={[b.r + 0.7, b.r + 0.9, 0.24, 32]} />
              <meshStandardMaterial color="#020617" roughness={0.6} />
            </mesh>
            <group ref={(el) => { groups.current[i] = el; }}>
              <mesh position={[0, 0.75, 0]} castShadow>
                <cylinderGeometry args={[b.r + 0.15, b.r + 0.45, 1.3, 32]} />
                <meshStandardMaterial color={skirt} roughness={0.35} />
              </mesh>
              <mesh position={[0, 1.7, 0]} castShadow>
                <cylinderGeometry args={[b.r - 0.25, b.r + 0.1, 1.5, 32]} />
                <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color="#ffffff" roughness={0.25} emissive={col} emissiveIntensity={0.6} />
              </mesh>
              <mesh position={[0, 2.7, 0]} castShadow>
                <cylinderGeometry args={[b.r - 0.7, b.r - 0.25, 0.7, 32]} />
                <meshStandardMaterial ref={(el) => { caps.current[i] = el; }} color={cap} roughness={0.2} metalness={0.4} emissive={col} emissiveIntensity={0.4} />
              </mesh>
              <mesh position={[0, 3.15, 0]}>
                <sphereGeometry args={[0.7, 16, 16]} />
                <meshStandardMaterial color="#ffffff" emissive={col} emissiveIntensity={2.2} roughness={0.15} />
              </mesh>
            </group>
            <pointLight ref={(el) => { lights.current[i] = el; }} position={[0, 4.5, 0]} color={col} intensity={4} distance={26} decay={1.8} />
          </group>
        );
      })}
    </group>
  );
}

// ---------------- Rubber posts ----------------
export function Posts({ ring = () => '#f43f5e' }: { ring?: (id: string) => string }) {
  useTier();
  return (
    <group>
      {ACTIVE.posts.map((p) => (
        <group key={p.id} position={[PX(p.x), TABLE.heightAt(p.x, p.y), PZ(p.y)]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 2.2, 12]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <torusGeometry args={[p.r, 0.32, 10, 20]} />
            <meshStandardMaterial color={ring(p.id)} roughness={0.55} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <sphereGeometry args={[0.34, 12, 12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------- Spring kickers ----------------
export function Kickers({ head = '#f43f5e', glow = '#be123c' }: { head?: string; glow?: string }) {
  useTier();
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    for (let i = 0; i < ACTIVE.kickers.length; i++) {
      const g = groups.current[i];
      if (g) g.position.y = Math.sin(performance.now() * 0.008 + i) * 0.12;
    }
  });
  return (
    <group>
      {ACTIVE.kickers.map((f, i) => (
        <group key={f.id} position={[PX(f.x), 0, PZ(f.y)]}>
          <group ref={(el) => { groups.current[i] = el; }}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 2.4, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.5, 0.14, 8, 18]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0, 2.35, 0]} castShadow>
              <sphereGeometry args={[0.75, 16, 16]} />
              <meshStandardMaterial color={head} emissive={glow} emissiveIntensity={0.8} roughness={0.5} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------- Flippers ----------------
export function Flippers({ left = { body: '#fb923c', glow: '#9a3412', inlay: '#fed7aa' }, right = { body: '#f43f5e', glow: '#9f1239', inlay: '#fda4af' } }: {
  left?: { body: string; glow: string; inlay: string };
  right?: { body: string; glow: string; inlay: string };
}) {
  const FL = TABLE.flippers;
  const leftG = useRef<THREE.Group>(null!);
  const rightG = useRef<THREE.Group>(null!);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const glows = useRef<(THREE.PointLight | null)[]>([]);
  const heat = useRef([0, 0]);
  const batGeometry = useMemo(() => makeFlipperGeometry(FL.len, FL.r * 0.78, 1.05), [FL.len, FL.r]);
  useFrame((_, dt) => {
    const a = gameRef.alpha;
    const L = gameRef.left, R = gameRef.right;
    if (leftG.current) leftG.current.rotation.y = L.prevAngle + (L.angle - L.prevAngle) * a;
    if (rightG.current) rightG.current.rotation.y = R.prevAngle + (R.angle - R.prevAngle) * a;
    // press feedback: bats flare while held and ease back on release
    [L, R].forEach((st, i) => {
      const target = st.pressed ? 1 : 0;
      heat.current[i] += (target - heat.current[i]) * Math.min(1, dt * (st.pressed ? 30 : 6));
      const h = heat.current[i];
      if (mats.current[i]) mats.current[i]!.emissiveIntensity = 1.4 + h * 1.2;
      if (glows.current[i]) glows.current[i]!.intensity = 7 + h * 16;
    });
  });
  const bat = (i: number, ref: React.Ref<THREE.Group>, pivot: { x: number; y: number }, look: { body: string; glow: string; inlay: string }) => (
    <group ref={ref} position={[PX(pivot.x), 0.35, PZ(pivot.y)]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[1.12, 1.3, 0.72, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.32, 20]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh geometry={batGeometry} position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color={look.body} roughness={0.27} metalness={0.16} emissive={look.glow} emissiveIntensity={1.4} />
      </mesh>
      {/* bright inlay stripe makes both paddles readable from the playfield camera */}
      <mesh position={[FL.len * 0.5, 1.48, 0]}>
        <boxGeometry args={[FL.len * 0.78, 0.1, 0.5]} />
        <meshStandardMaterial color="#fff7ed" emissive={look.inlay} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      {[-0.58, 0.58].map((z, k) => (
        <mesh key={k} position={[0, 0.51, z]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
          <meshStandardMaterial color="#f8fafc" metalness={1} roughness={0.16} />
        </mesh>
      ))}
      {/* a pool of light on the playfield under the bat, so its position reads at a glance */}
      <pointLight ref={(el) => { glows.current[i] = el; }} position={[FL.len * 0.5, 2.6, 0]} color={look.inlay} intensity={7} distance={12} decay={1.6} />
    </group>
  );
  return (
    <group>
      {bat(0, leftG, FL.left.pivot, left)}
      {bat(1, rightG, FL.right.pivot, right)}
    </group>
  );
}

// ---------------- Balls ----------------
export function Balls({ color = '#f8fafc', light = '#bfd9ff', metalness = 1, roughness = 0.06, map }: {
  color?: string; light?: string; metalness?: number; roughness?: number; map?: THREE.Texture;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null!);
  useFrame((_, dt) => {
    const act = gameRef.balls.filter((b) => b.active);
    const a = gameRef.alpha;
    for (let i = 0; i < 4; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const b = act[i];
      if (!b) { m.visible = false; continue; }
      const ride = b.ride ? rideById(b.ride.id) : undefined;
      // In an opaque pipe the ball disappears — the ride trail shows it.
      m.visible = !ride?.hideBall;
      // interpolate between the last two fixed steps for smooth motion at any refresh rate
      const x = b.px + (b.x - b.px) * a;
      const y = b.py + (b.y - b.py) * a;
      const sunk = b.captured > 0 ? 0.9 : 0;
      if (b.ride) {
        m.position.set(PX(x), (b.h ?? 0) + BALL_RADIUS + 0.12, PZ(y));
      } else {
        // ease the elevation so climbing a ramp reads as a roll, not a teleport
        const targetH = TABLE.heightAt(x, y);
        b.h = (b.h ?? targetH) + (targetH - (b.h ?? targetH)) * Math.min(1, dt * 11);
        m.position.set(PX(x), b.h + BALL_RADIUS + 0.12 - sunk, PZ(y));
      }
      // rolling rotation
      m.rotation.x += (-b.vy / BALL_RADIUS) * dt * 0.55;
      m.rotation.z += -(b.vx / BALL_RADIUS) * dt * 0.55;
      if (i === 0 && lightRef.current) {
        lightRef.current.position.set(PX(x), (b.h ?? 0) + 6, PZ(y));
        lightRef.current.intensity = 6 + Math.min(20, Math.hypot(b.vx, b.vy) * 0.08);
      }
    }
    if (act.length === 0 && lightRef.current) lightRef.current.intensity = 0;
  });
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => { meshes.current[i] = el; }} castShadow>
          <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={1.6} map={map ?? null} />
        </mesh>
      ))}
      <pointLight ref={lightRef} color={light} intensity={8} distance={30} decay={1.8} />
    </group>
  );
}

// ---------------- Plunger ----------------
export function Plunger({ tip = '#dc2626', knob = '#7c2d12', ring = '#fbbf24' }: { tip?: string; knob?: string; ring?: string }) {
  const P = TABLE.plunger;
  const rod = useRef<THREE.Group>(null!);
  const spring = useRef<THREE.Group>(null!);
  const powerMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const springTube = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const turns = 9, segs = 140, r = 0.75, len = 7;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * len));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.16, 8, false);
  }, []);
  // skill-zone lamps follow the table's skill window (10 lamps = 0.1 power each)
  const [szLo, szHi] = P.skillZone;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = gameRef.plungerPower;
    const charging = gameRef.plungerCharging;
    if (rod.current) rod.current.position.z = p * 4.2;
    if (spring.current) {
      spring.current.scale.z = 1 - p * 0.5;
      spring.current.position.z = p * 4.2 * 0.4;
    }
    for (let i = 0; i < 10; i++) {
      const m = powerMats.current[i];
      if (!m) continue;
      const lit = charging && p * 10 > i;
      const inSkill = (i + 0.5) / 10 >= szLo - 0.05 && (i + 0.5) / 10 <= szHi;
      if (!charging && gameRef.balls.some((b) => b.active && b.inLane && b.y < -20)) {
        m.emissiveIntensity = 0.25 + Math.sin(t * 3 + i * 0.5) * 0.15;
        m.emissive.set(inSkill ? '#22c55e' : '#334155');
      } else if (lit) {
        m.emissive.set(inSkill ? '#22c55e' : i > 7 ? '#ef4444' : '#fbbf24');
        m.emissiveIntensity = 2.5 + (inSkill ? Math.sin(t * 10) * 1 : 0);
      } else {
        m.emissive.set('#1e293b');
        m.emissiveIntensity = 0.4;
      }
    }
  });
  return (
    <group>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[P.dividerX - 0.9, 0.12, PZ(P.restY + 21.8 + i * 2.2)]}>
          <boxGeometry args={[1.1, 0.2, 1.5]} />
          <meshStandardMaterial ref={(el) => { powerMats.current[i] = el; }} color="#020617" emissive="#334155" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <group position={[P.x, 1.1, PZ(P.restY - 0.7)]}>
        <group ref={rod}>
          <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 20, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.1, 1.1, 1.1, 20]} />
            <meshStandardMaterial color={tip} roughness={0.5} />
          </mesh>
          <group ref={spring} position={[0, 0, 13]}>
            <mesh geometry={springTube}>
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
          <mesh position={[0, 0, 20.5]}>
            <sphereGeometry args={[1.5, 20, 20]} />
            <meshStandardMaterial color={knob} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 20.5]}>
            <torusGeometry args={[1.5, 0.25, 10, 24]} />
            <meshStandardMaterial color={ring} emissive={ring} emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------- Ride trail ----------------
// Glowing dots trailing the ball while it rides a capture path — the "speed"
// feel inside pipes and along wire ramps.
export function RideTrail({ rideId, path, color, r }: { rideId: string; path: PathPt[]; color: string; r: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const N = 6;
  useFrame(() => {
    const ball = gameRef.balls.find((b) => b.active && b.ride && b.ride.id === rideId);
    for (let i = 0; i < N; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const tt = ball?.ride ? ball.ride.t - i * 0.035 : -1;
      if (tt <= 0) { m.visible = false; continue; }
      m.visible = true;
      const p = samplePath(path, tt);
      m.position.set(PX(p.x), p.h + BALL_RADIUS + 0.12, PZ(p.y));
      m.scale.setScalar(Math.max(0.25, (1 - i / N) * r));
    }
  });
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.85 - i * 0.12} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Multiball progress 0..1 (for DMDs / toppers). */
export function multiballFrac() {
  const st = useGame.getState();
  return st.multiball ? st.multiballT / DIFF.mbTime : 0;
}
