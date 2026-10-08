// Salamander — scene: soot-and-ember playfield with the playground's own
// salamander mascot painted in, the obsidian Ember Nest, Fire Bells, the
// Serpent Tunnel, THE MAW, the tier obstacles and a blocky guardian curled on
// the nest. Generic engine parts do the table-driven work (walls, slings,
// flippers, balls, deck, wires); this file only draws the set-pieces.

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { WallSeg } from '../../engine/types';
import { ACTIVE, kinematicPose, layerHeight } from '../../engine/table';
import { gameRef, flashOf, spinnerOf } from '../../engine/runtime';
import { useGame } from '../../engine/store';
import { PX, PZ, makeTrackTube } from '../../engine/scene/track';
import {
  Walls, Slings, Bumpers, Posts, Flippers, Balls, Plunger, RideTrail, Decks, RideWires, useTier,
} from '../../engine/scene/parts';
import { Cabinet, type CabinetLook } from '../../engine/scene/cabinet';
import { SLING_LEFT, SLING_RIGHT } from '../deadStarDisco/table';
import {
  table, sensors as SENSORS, NEST, NEST_H, NEST_OUTLINE, nest as NEST_DEF,
  SERPENT, VOLCANO_L, VOLCANO_R, MAW_SPIT, RAMP_L, RAMP_R, SKYSHOT,
} from './table';
import { useSalamander } from './rules';
import mascotUrl from './salamander2.svg';

const EMBER = '#ff8b2a';
const FLAME = '#ffcf3f';
const TOXIC = '#39ff6a';
const SOOT = '#100e0c';

const LANES = SENSORS.filter((s) => s.kind === 'lane');
/** H-O-T inserts sit just below their lanes — in view above the nest's back rail. */
const LANE_INSERT_DY = 1.2;
const MAW = table.captures.find((c) => c.id === 'maw')!;
const HOLDS = table.captures.filter((c) => c.id.startsWith('hold'));
const BELLS = table.circles.filter((c) => c.kind === 'bumper' && c.id.startsWith('bell'));

/** Deterministic rng so the art repaints identically (fonts / mascot load later). */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

// ---------------- Playfield art ----------------
const W = 1024, H = 1792;
const X = (x: number) => ((x + 23.5) / 47) * W;
const Y = (y: number) => ((40 - y) / 82) * H;
const U = W / 47; // px per table unit

function paintPlayfield(g: CanvasRenderingContext2D, mascot: HTMLImageElement | null) {
  const r = rng(7);
  g.save();
  g.clearRect(0, 0, W, H);
  g.fillStyle = SOOT;
  g.fillRect(0, 0, W, H);
  // ember glow pooled around the Maw and the flippers
  for (const [x, y, rad, a] of [[0, 5, 20, 0.34], [0, -30, 18, 0.22], [-13, 1, 7, 0.2], [12.5, -1, 7, 0.2]] as const) {
    const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), rad * U);
    gr.addColorStop(0, `rgba(255,110,30,${a})`);
    gr.addColorStop(1, 'rgba(255,110,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  // lava cracks
  g.lineCap = 'round';
  g.shadowColor = EMBER;
  for (let i = 0; i < 46; i++) {
    let x = r() * W, y = r() * H;
    let a = r() * Math.PI * 2;
    g.strokeStyle = `rgba(255,${90 + r() * 90 | 0},30,${0.18 + r() * 0.35})`;
    g.lineWidth = 1 + r() * 2.5;
    g.shadowBlur = 8;
    g.beginPath(); g.moveTo(x, y);
    const n = 6 + (r() * 10 | 0);
    for (let k = 0; k < n; k++) {
      a += (r() - 0.5) * 1.3;
      x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.shadowBlur = 0;
  // scattered salamander spots
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(252,199,50,${0.05 + r() * 0.1})`;
    const s = 6 + r() * 16;
    g.fillRect(r() * W, r() * H, s * (0.5 + r()), s);
  }
  // flame tongues licking up from the apron
  for (let i = 0; i < 16; i++) {
    const bx = X(-21 + i * 2.8 + r() * 1.5);
    const top = Y(-31 + r() * 7);
    const w = (1.2 + r() * 1.6) * U;
    const gr = g.createLinearGradient(0, Y(-42), 0, top);
    gr.addColorStop(0, 'rgba(255,207,63,0.55)');
    gr.addColorStop(0.45, 'rgba(255,110,30,0.35)');
    gr.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(bx - w, Y(-42));
    g.quadraticCurveTo(bx - w * 0.9, top + (Y(-42) - top) * 0.4, bx + (r() - 0.5) * w, top);
    g.quadraticCurveTo(bx + w * 0.9, top + (Y(-42) - top) * 0.4, bx + w, Y(-42));
    g.fill();
  }
  // the nest's shadow on the field below it
  g.fillStyle = 'rgba(0,0,0,0.42)';
  g.beginPath();
  NEST_OUTLINE.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.closePath(); g.fill();
  // the mascot, backlit by the fire
  const mx = 0, my = -9.5, mw = 20, mh = mw * (40.7 / 80.3);
  const halo = g.createRadialGradient(X(mx), Y(my), 0, X(mx), Y(my), 13 * U);
  halo.addColorStop(0, 'rgba(255,140,40,0.55)');
  halo.addColorStop(0.6, 'rgba(255,90,20,0.18)');
  halo.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  if (mascot) {
    g.shadowColor = EMBER; g.shadowBlur = 24;
    g.drawImage(mascot, X(mx - mw / 2), Y(my + mh / 2), mw * U, mh * U);
    g.shadowBlur = 0;
  }
  // lane inserts (H-O-T)
  LANES.forEach((l, i) => {
    g.fillStyle = 'rgba(20,12,8,0.9)';
    g.strokeStyle = FLAME; g.lineWidth = 4;
    g.beginPath(); g.arc(X(l.x), Y(l.y - LANE_INSERT_DY), 1.3 * U, 0, 7); g.fill(); g.stroke();
    g.fillStyle = FLAME;
    g.font = '800 34px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('HOT'[i], X(l.x), Y(l.y - LANE_INSERT_DY) + 2);
  });
  // labels
  const label = (text: string, x: number, y: number, size: number, color: string, rot = 0) => {
    g.save();
    g.translate(X(x), Y(y)); g.rotate(rot);
    g.font = `800 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(8,5,3,0.85)';
    g.strokeText(text, 0, 0);
    g.shadowColor = color; g.shadowBlur = 14;
    g.fillStyle = color;
    g.fillText(text, 0, 0);
    g.restore();
  };
  label('THE MAW', MAW.x, MAW.y - 3.8, 34, EMBER);
  label('EMBER HOLD', HOLDS[0].x, HOLDS[0].y - 3.4, 24, FLAME);
  label('EMBER HOLD', HOLDS[1].x, HOLDS[1].y - 3.4, 24, FLAME);
  label('SERPENT ▲', SERPENT[0].x, SERPENT[0].y - 3.2, 26, TOXIC);
  label('NEST ▲', RAMP_L[0].x, RAMP_L[0].y + 3, 26, EMBER, 0.05);
  label('NEST ▲', RAMP_R[0].x + 0.6, RAMP_R[0].y + 3.4, 26, EMBER, -0.05);
  label('EMBER NEST ABOVE', 0, 19.5, 26, 'rgba(255,139,42,0.55)');
  label('SKYSHOT ▲ FULL HEAT', 19.5, 10, 24, FLAME, -Math.PI / 2);
  // apron
  const apr = g.createLinearGradient(0, H * 0.93, 0, H);
  apr.addColorStop(0, '#1c1008');
  apr.addColorStop(1, '#070403');
  g.fillStyle = apr;
  g.fillRect(0, H * 0.93, W, H * 0.07);
  g.fillStyle = 'rgba(255,190,120,0.8)';
  g.textAlign = 'center';
  g.font = '700 26px "Barlow Condensed", "Arial Narrow", sans-serif';
  g.fillText('SALAMANDER • CHASE THE HEAT. RULE THE NEST. • TILT ENDS FUN', W / 2, H * 0.968);
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  g.restore();
}

function usePlayfieldTexture() {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, tex: t };
  }, []);
  useEffect(() => {
    const g = canvas.getContext('2d')!;
    let mascot: HTMLImageElement | null = null;
    let alive = true;
    const paint = () => { if (!alive) return; paintPlayfield(g, mascot); tex.needsUpdate = true; };
    paint();
    const img = new Image();
    img.onload = () => { mascot = img; paint(); };
    img.src = mascotUrl;
    document.fonts?.ready.then(paint).catch(() => {});
    return () => { alive = false; };
  }, [canvas, tex]);
  return tex;
}

function makeSideArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#2a1208');
  grad.addColorStop(0.5, '#120a06');
  grad.addColorStop(1, '#2a1208');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1024);
  const r = rng(3);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(252,199,50,${0.25 + r() * 0.4})`;
    g.fillRect(r() * 236, r() * 1004, 10 + r() * 14, 10 + r() * 20);
  }
  g.save();
  g.translate(128, 512);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.shadowColor = EMBER; g.shadowBlur = 26;
  g.fillStyle = '#fff1dc';
  g.font = '900 78px "Arial Black", Arial';
  g.fillText('SALAMANDER', 0, 26);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMoltenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#ffe08a');
  gr.addColorStop(0.5, '#ff9a3c');
  gr.addColorStop(1, '#ff5a1f');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  const r = rng(11);
  for (let i = 0; i < 38; i++) {
    g.fillStyle = `rgba(${40 + r() * 30 | 0},${14 + r() * 10 | 0},6,${0.6 + r() * 0.35})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 128, 6 + r() * 22, 4 + r() * 12, r() * 3, 0, 7);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function PlayfieldBase({ art }: { art: THREE.Texture }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1]} receiveShadow>
        <planeGeometry args={[47, 82]} />
        <meshStandardMaterial map={art} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, -1.2, 1]} receiveShadow>
        <boxGeometry args={[47.6, 2.4, 82.6]} />
        <meshStandardMaterial color="#140c08" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[17, 1.5, PZ(-10.5)]} castShadow>
        <boxGeometry args={[0.7, 3, 55]} />
        <meshStandardMaterial color="#57534e" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19.5, 0.04, PZ(-8)]}>
        <planeGeometry args={[4.6, 60]} />
        <meshStandardMaterial color="#0c0705" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

// ---------------- The Ember Nest ----------------
/** Glowing crack overlay on the obsidian deck (the slab itself is the engine's Decks). */
function NestCracks() {
  const { geo, mat } = useMemo(() => {
    const shape = new THREE.Shape(NEST_OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const hl of NEST_DEF.holes) {
      const p = new THREE.Path();
      p.absarc(hl.x, hl.y, hl.r + 0.35, 0, Math.PI * 2, true);
      shape.holes.push(p);
    }
    const geo = new THREE.ShapeGeometry(shape);
    // UVs across the nest's bounding box
    const xs = NEST_OUTLINE.map((p) => p[0]), ys = NEST_OUTLINE.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0, hgt = Math.max(...ys) - y0;
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - x0) / w;
      uv[i * 2 + 1] = (pos.getY(i) - y0) / hgt;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 256);
    const r = rng(21);
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      let x = r() * 512, y = r() * 256, a = r() * 7;
      g.strokeStyle = `rgba(255,${100 + r() * 100 | 0},30,${0.5 + r() * 0.5})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { a += (r() - 0.5) * 1.4; x += Math.cos(a) * 16; y += Math.sin(a) * 16; g.lineTo(x, y); }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    return { geo, mat };
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const heat = flashOf('inferno') + flashOf('nest') * 0.6;
    mat.opacity = 0.55 + Math.sin(t * 1.7) * 0.12 + heat * 0.45;
  });
  return <mesh geometry={geo} material={mat} position={[0, NEST_H + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} />;
}

/** Lathe bell on the nest: bronze body, glows when lit, blazes on INFERNO. */
function FireBells() {
  const geo = useMemo(() => {
    const prof = [
      [0, 3.4], [0.5, 3.35], [0.9, 3.1], [1.15, 2.6], [1.3, 1.8], [1.55, 1.0], [2.0, 0.45], [2.25, 0.2], [2.2, 0.0], [0, 0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(prof, 36);
  }, []);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = useSalamander.getState();
    const inferno = flashOf('inferno');
    BELLS.forEach((b, i) => {
      const fl = flashOf(`bumper:${b.id}`);
      const lit = s.relighting ? 0.7 + Math.sin(t * 14 + i) * 0.3 : s.bells[i] ? 1 : 0;
      const m = mats.current[i];
      if (m) m.emissiveIntensity = 0.15 + lit * 1.4 + fl * 3 + inferno * 2;
      const l = lights.current[i];
      if (l) l.intensity = 2 + lit * 14 + fl * 60 + inferno * 40;
      const g = bodies.current[i];
      if (g) g.rotation.z = Math.sin(t * 30) * fl * 0.18; // the bell rocks when struck
    });
  });
  return (
    <group>
      {BELLS.map((b, i) => (
        <group key={b.id} position={[PX(b.x), NEST_H, PZ(b.y)]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[b.r + 0.5, b.r + 0.6, 0.2, 28]} />
            <meshStandardMaterial color="#0c0705" roughness={0.6} />
          </mesh>
          <group ref={(el) => { bodies.current[i] = el; }}>
            <mesh geometry={geo} castShadow>
              <meshStandardMaterial
                ref={(el) => { mats.current[i] = el; }}
                color="#b45309" metalness={0.85} roughness={0.28} emissive={EMBER} emissiveIntensity={0.2} side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 3.55, 0]}>
              <torusGeometry args={[0.32, 0.12, 8, 16]} />
              <meshStandardMaterial color="#78350f" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
          <pointLight ref={(el) => { lights.current[i] = el; }} position={[0, 4.5, 0]} color={FLAME} intensity={2} distance={20} decay={1.8} />
        </group>
      ))}
    </group>
  );
}

/**
 * Blocky guardian (the mascot, in 3D) clinging to the top of the cabinet's left
 * side rail, head toward the player. Off the playfield on purpose: anything
 * tall on the nest's back would hide the H-O-T lanes from the camera.
 */
function Guardian({ at, yaw, scale }: { at: [number, number, number]; yaw: number; scale: number }) {
  const root = useRef<THREE.Group>(null!);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const flame = useRef<THREE.Mesh>(null!);
  const flameMat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) root.current.position.y = at[1] + Math.sin(t * 1.6) * 0.12;
    // blink every ~4 s
    const blink = (t % 4.2) < 0.12 ? 0.1 : 1;
    eyes.current.forEach((e) => e && e.scale.set(1, blink, 1));
    if (flame.current) {
      const f = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 7.3) * 0.1 + flashOf('inferno') * 0.8;
      flame.current.scale.set(1, f, 1);
    }
    if (flameMat.current) flameMat.current.emissiveIntensity = 2.2 + Math.sin(t * 11) * 0.5 + flashOf('inferno') * 3;
  });
  const segs = [0, 1, 2, 3, 4];
  const skin = <meshStandardMaterial color="#2b2724" roughness={0.6} metalness={0.15} emissive="#2a0e04" emissiveIntensity={0.6} />;
  const spot = <meshStandardMaterial color="#fcc732" emissive="#fcc732" emissiveIntensity={0.6} roughness={0.5} />;
  return (
    <group ref={root} position={at} rotation={[0, yaw, 0]} scale={scale}>
      {segs.map((i) => (
        <group key={i} position={[-3.2 + i * 1.5, 0, 0]}>
          <mesh castShadow><boxGeometry args={[1.35, 1.0, 1.5]} />{skin}</mesh>
          <mesh position={[0, 0.52, (i % 2 ? 0.2 : -0.25)]}><boxGeometry args={[0.45, 0.06, 0.55]} />{spot}</mesh>
        </group>
      ))}
      {/* head */}
      <group position={[4.4, 0.35, 0]}>
        <mesh castShadow><boxGeometry args={[2.2, 1.6, 2.0]} />{skin}</mesh>
        {[-0.5, 0.5].map((z, i) => (
          <mesh key={z} ref={(el) => { eyes.current[i] = el; }} position={[0.45, 0.82, z]}>
            <boxGeometry args={[0.55, 0.12, 0.55]} />
            <meshStandardMaterial color="#1a2e05" emissive={TOXIC} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* legs */}
      {[[-2, 1], [-2, -1], [2, 1], [2, -1]].map(([x, s], i) => (
        <mesh key={i} position={[x, -0.55, s * 0.95]} castShadow><boxGeometry args={[0.5, 0.8, 0.5]} />{skin}</mesh>
      ))}
      {/* tail hanging off the corner, tipped with flame */}
      <mesh position={[-4.3, -0.2, 0]} rotation={[0, 0, 0.35]} castShadow><boxGeometry args={[1.2, 0.7, 0.8]} />{skin}</mesh>
      <mesh position={[-5.2, -0.6, 0]} rotation={[0, 0, 0.7]} castShadow><boxGeometry args={[0.9, 0.5, 0.6]} />{skin}</mesh>
      <mesh ref={flame} position={[-5.7, 0.2, 0]}>
        <coneGeometry args={[0.45, 1.6, 10]} />
        <meshStandardMaterial ref={flameMat} color="#ff5a1f" emissive={FLAME} emissiveIntensity={2.2} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[-5.7, 1.4, 0]} color={EMBER} intensity={10} distance={14} decay={1.8} />
      <pointLight position={[4.8, 2.6, 0]} color={TOXIC} intensity={5} distance={8} decay={1.8} />
    </group>
  );
}

// ---------------- Field set-pieces ----------------
function Maw() {
  const throat = useRef<THREE.MeshStandardMaterial>(null!);
  const teeth = useRef<THREE.MeshStandardMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const lit = useSalamander.getState().mawLit;
    const fl = flashOf('maw');
    if (throat.current) {
      throat.current.emissive.set(lit ? TOXIC : '#ff3b0f');
      throat.current.emissiveIntensity = (lit ? 1.4 + Math.sin(t * 6) * 0.6 : 0.6 + Math.sin(t * 2) * 0.15) + fl * 3;
    }
    if (teeth.current) teeth.current.emissiveIntensity = (lit ? 1.6 : 0.5) + fl * 3;
    if (light.current) {
      light.current.color.set(lit ? TOXIC : EMBER);
      light.current.intensity = (lit ? 22 : 8) + fl * 50;
    }
  });
  const n = 12;
  return (
    <group position={[PX(MAW.x), 0, PZ(MAW.y)]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[MAW.r + 0.2, MAW.r + 0.2, 0.12, 32]} />
        <meshStandardMaterial ref={throat} color="#050201" emissive="#ff3b0f" emissiveIntensity={0.6} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[MAW.r + 0.2, MAW.r + 0.9, 32]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} metalness={0.6} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const R = MAW.r + 0.5;
        return (
          <mesh key={i} position={[Math.cos(a) * R, 0.75, Math.sin(a) * R]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}>
            <coneGeometry args={[0.28, 1.1, 6]} />
            <meshStandardMaterial ref={i === 0 ? teeth : undefined} color="#fff7ed" emissive={FLAME} emissiveIntensity={0.5} roughness={0.35} />
          </mesh>
        );
      })}
      <pointLight ref={light} position={[0, 3, 0]} color={EMBER} intensity={8} distance={18} decay={1.8} />
    </group>
  );
}

function Holds() {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    HOLDS.forEach((h, i) => {
      const m = mats.current[i];
      if (m) m.emissiveIntensity = 0.9 + Math.sin(t * 3 + i) * 0.25 + flashOf(`hold:${h.id}`) * 4 + flashOf('volcano') * 2;
    });
  });
  return (
    <group>
      {HOLDS.map((h, i) => (
        <group key={h.id} position={[PX(h.x), 0, PZ(h.y)]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[h.r, h.r, 0.1, 28]} />
            <meshStandardMaterial color="#0a0503" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[h.r + 0.2, 0.28, 10, 32]} />
            <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color="#7c2d12" emissive={EMBER} emissiveIntensity={1} metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Banded black-and-gold tube with a blocky head at the mouth; the ball is hidden inside. */
function Serpent() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#18130f';
    g.fillRect(0, 0, 256, 64);
    const r = rng(5);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = '#fcc732';
      g.fillRect(r() * 240, r() * 50, 8 + r() * 12, 8 + r() * 10);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 1);
    return t;
  }, []);
  const tube = useMemo(() => makeTrackTube(SERPENT.map((p) => ({ ...p, h: p.h + 0.9 })), 0.78, 0), []);
  const body = useRef<THREE.MeshStandardMaterial>(null!);
  const eyeMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('serpent');
    if (body.current) body.current.emissiveIntensity = 0.08 + fl * 1.2;
    eyeMats.current.forEach((m) => m && (m.emissiveIntensity = 2 + Math.sin(t * 5) * 0.6 + fl * 3));
  });
  const mouth = SERPENT[0];
  const tail = SERPENT[SERPENT.length - 1];
  return (
    <group>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial ref={body} map={tex} color="#ffffff" roughness={0.45} metalness={0.2} emissive={EMBER} emissiveIntensity={0.08} />
      </mesh>
      {/* head over the mouth, jaw open toward the flippers */}
      <group position={[PX(mouth.x), 0, PZ(mouth.y)]}>
        <mesh position={[0, 2.3, -0.4]} castShadow>
          <boxGeometry args={[3.2, 1.4, 2.6]} />
          <meshStandardMaterial color="#212121" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.1, 24]} />
          <meshStandardMaterial color="#111" emissive={TOXIC} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        {[-0.8, 0.8].map((x, i) => (
          <mesh key={x} position={[x, 3.05, 0.4]}>
            <boxGeometry args={[0.6, 0.14, 0.6]} />
            <meshStandardMaterial ref={(el) => { eyeMats.current[i] = el; }} color="#1a2e05" emissive={TOXIC} emissiveIntensity={2} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* release at the left inlane */}
      <mesh position={[PX(tail.x), 0.2, PZ(tail.y)]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.8, 24]} />
        <meshStandardMaterial color="#111" emissive={TOXIC} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <RideTrail rideId="serpent" path={SERPENT} color={TOXIC} r={0.9} />
    </group>
  );
}

/** Flame arcs for the fire rides (SKYSHOT, VOLCANO, MAW SPIT): no rails, just fire. */
function FireArcs() {
  return (
    <group>
      <RideTrail rideId="skyshot" path={SKYSHOT} color={FLAME} r={1.2} />
      <RideTrail rideId="volcanoL" path={VOLCANO_L} color={FLAME} r={1.2} />
      <RideTrail rideId="volcanoR" path={VOLCANO_R} color={FLAME} r={1.2} />
      <RideTrail rideId="mawSpit" path={MAW_SPIT} color={TOXIC} r={1.2} />
    </group>
  );
}

function LaneLamps() {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame(() => {
    const lanes = useSalamander.getState().lanes;
    LANES.forEach((_, i) => {
      const m = mats.current[i];
      if (m) m.emissiveIntensity = (lanes[i] ? 2.2 : 0.15) + flashOf(`lane:${i}`) * 3;
    });
  });
  return (
    <group>
      {LANES.map((l, i) => (
        <mesh key={l.id} position={[PX(l.x), 0.08, PZ(l.y - LANE_INSERT_DY)]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.25, 28]} />
          <meshStandardMaterial ref={(el) => { mats.current[i] = el; }} color="#1a0f08" emissive={FLAME} emissiveIntensity={0.15} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Spinner() {
  const sn = SENSORS.find((s) => s.kind === 'spinner')!;
  const blade = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (blade.current) blade.current.rotation.x = spinnerOf('spinner').angle;
    if (mat.current) mat.current.emissiveIntensity = 0.7 + flashOf('spinner') * 5;
  });
  return (
    <group position={[PX(sn.x), 0, PZ(sn.y)]}>
      {[-2.4, 2.4].map((ox) => (
        <mesh key={ox} position={[ox, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 3.2, 12]} />
          <meshStandardMaterial color="#57534e" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <group ref={blade} position={[0, 2.6, 0]}>
        <mesh position={[0, -1.1, 0]} castShadow>
          <boxGeometry args={[4.4, 2.2, 0.16]} />
          <meshStandardMaterial ref={mat} color={EMBER} emissive={EMBER} emissiveIntensity={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------- Tier obstacles ----------------
function Spire() {
  useTier();
  const p = ACTIVE.posts.find((c) => c.id === 'spire');
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    if (mat.current) mat.current.emissiveIntensity = 1.4 + Math.sin(state.clock.elapsedTime * 4) * 0.4 + flashOf('spire') * 4;
  });
  if (!p) return null;
  return (
    <group position={[PX(p.x), 0, PZ(p.y)]}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.75, 3.2, 6]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <octahedronGeometry args={[0.45]} />
        <meshStandardMaterial ref={mat} color="#fff" emissive={EMBER} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Pendulum() {
  useTier();
  const k = ACTIVE.kinematics.find((kk) => kk.id === 'pendulum');
  const bar = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (!k) return;
    const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
    if (bar.current && pose.kind === 'bar') bar.current.rotation.y = pose.angle;
    if (glow.current) glow.current.emissiveIntensity = 0.8 + flashOf('pendulum') * 4;
  });
  if (!k) return null;
  const len = (k.half ?? 0) * 2 + k.r * 2;
  return (
    <group position={[PX(k.cx), layerHeight(NEST), PZ(k.cy)]}>
      <group ref={bar} position={[0, 0.7, 0]}>
        <mesh castShadow>
          <boxGeometry args={[len, 0.9, 1.0]} />
          <meshStandardMaterial ref={glow} color="#44403c" roughness={0.8} metalness={0.2} emissive="#ff5a1f" emissiveIntensity={0.8} />
        </mesh>
      </group>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 1.8, 12]} />
        <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Moons() {
  useTier();
  const moons = ACTIVE.kinematics.filter((k) => k.kind === 'orbiter');
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lava = useMemo(() => makeMoltenTexture(), []);
  useFrame((state, dt) => {
    moons.forEach((k, i) => {
      const pose = kinematicPose(k, gameRef.kin[k.id] ?? 0);
      const g = refs.current[i];
      if (g && pose.kind === 'orbiter') {
        g.position.set(PX(pose.x), k.r + 0.25, PZ(pose.y));
        g.rotation.y += dt * 1.5;
      }
      const m = mats.current[i];
      if (m) m.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.15 + flashOf(`moon:${k.id}`) * 3;
    });
  });
  if (!moons.length) return null;
  const c = moons[0];
  return (
    <group>
      <mesh position={[PX(c.cx), 0.06, PZ(c.cy)]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[(c.orbit ?? 0) - 0.12, (c.orbit ?? 0) + 0.12, 64]} />
        <meshBasicMaterial color={EMBER} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      {moons.map((k, i) => (
        <group key={k.id} ref={(el) => { refs.current[i] = el; }}>
          <mesh castShadow>
            <sphereGeometry args={[k.r, 24, 24]} />
            <meshStandardMaterial
              ref={(el) => { mats.current[i] = el; }}
              map={lava} emissiveMap={lava} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Vents() {
  useTier();
  const vents = ACTIVE.sensors.filter((s) => s.blast);
  const rings = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const jets = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    vents.forEach((v, i) => {
      const cool = gameRef.padCool[v.id] ?? 0;
      const charge = 1 - Math.min(1, cool / (v.blast!.cooldown || 1));
      const fl = flashOf(`vent:${v.id}`);
      const m = rings.current[i];
      if (m) m.emissiveIntensity = 0.2 + charge * (1.4 + Math.sin(t * 8 + i) * 0.4) + fl * 3;
      const j = jets.current[i];
      if (j) { j.visible = fl > 0.05; j.scale.set(1, 0.2 + fl * 1.4, 1); j.position.y = 0.2 + fl * 2.4; }
    });
  });
  return (
    <group>
      {vents.map((v, i) => (
        <group key={v.id} position={[PX(v.x), 0, PZ(v.y)]}>
          <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[v.r, 0.14, 8, 32]} />
            <meshStandardMaterial ref={(el) => { rings.current[i] = el; }} color="#7c2d12" emissive="#ff3b0f" emissiveIntensity={1.2} metalness={0.3} roughness={0.4} />
          </mesh>
          {[-0.6, 0, 0.6].map((z) => (
            <mesh key={z} position={[0, 0.12, z]}>
              <boxGeometry args={[v.r * 1.7, 0.1, 0.18]} />
              <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
          <mesh ref={(el) => { jets.current[i] = el; }} visible={false}>
            <coneGeometry args={[v.r * 0.9, 5, 14, 1, true]} />
            <meshBasicMaterial color={FLAME} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------- Atmosphere ----------------
function Embers({ count = 140 }) {
  const { geo, speeds } = useMemo(() => {
    const r = rng(99);
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 44;
      pos[i * 3 + 1] = r() * 16;
      pos[i * 3 + 2] = PZ(-40 + r() * 78);
      speeds[i] = 1.5 + r() * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo, speeds };
  }, [count]);
  useFrame((state, dt) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    const boost = 1 + flashOf('inferno') * 2;
    for (let i = 0; i < count; i++) {
      let y = p.getY(i) + speeds[i] * dt * boost;
      let x = p.getX(i) + Math.sin(t * 1.3 + i) * dt * 0.6;
      if (y > 16) { y = 0.2; x = (Math.random() - 0.5) * 44; }
      p.setXY(i, x, y);
    }
    p.needsUpdate = true;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffb35c" size={0.35} sizeAttenuation transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function FlickerLights() {
  const a = useRef<THREE.PointLight>(null!);
  const b = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const heat = flashOf('inferno') * 60 + (useGame.getState().multiball ? 12 : 0);
    if (a.current) a.current.intensity = 26 + Math.sin(t * 13) * 5 + Math.sin(t * 29) * 3 + heat;
    if (b.current) b.current.intensity = 22 + Math.sin(t * 11 + 1) * 5 + Math.sin(t * 23) * 3 + heat;
  });
  return (
    <>
      <pointLight ref={a} position={[-10, 14, PZ(-6)]} color="#ff7a2a" intensity={26} distance={60} decay={1.8} />
      <pointLight ref={b} position={[10, 14, PZ(12)]} color="#ff9a3c" intensity={22} distance={60} decay={1.8} />
    </>
  );
}

// ---------------- Theme entry points ----------------
const SLING_TRIS = [
  { group: 'L', pts: SLING_LEFT },
  { group: 'R', pts: SLING_RIGHT },
];

const wallLook = (w: WallSeg) => {
  if (w.layer === NEST) return { h: 1.4, color: w.kind === 'guide' ? EMBER : '#9a3412', metal: 0.6 };
  return {
    h: w.id.startsWith('arc') || w.id.startsWith('outer') || w.id === 'divider' ? 3.2 : 2.4,
    color: w.id === 'divider' ? '#78716c' : w.kind === 'guide' ? EMBER : '#a8a29e',
    metal: w.id === 'divider' || w.kind === 'wall' ? 0.9 : 0.4,
  };
};

const postRing = (id: string) => (id === 'spire' ? TOXIC : FLAME);
const isEmber = (id: string) => !id.startsWith('bell');

/** Everything on the tilted playfield. */
export function Playfield() {
  const art = usePlayfieldTexture();
  const molten = useMemo(() => makeMoltenTexture(), []);
  return (
    <>
      <PlayfieldBase art={art} />
      <Walls look={wallLook} capColor="#a8a29e" />
      <Slings tris={SLING_TRIS} glow="#ff5a1f" body="#292524" rubber={EMBER} />
      <Bumpers only={isEmber} colors={[EMBER, FLAME]} skirt="#292524" cap="#431407" />
      <Posts ring={postRing} />
      <Spire />
      <Spinner />
      <LaneLamps />
      <Maw />
      <Holds />
      <Serpent />
      <Moons />
      <Vents />
      <Decks color="#1c1410" edge={EMBER} hole={FLAME} opacity={0.62} thickness={0.6} />
      <NestCracks />
      <FireBells />
      <Pendulum />
      <RideWires color="#a8a29e" glow={EMBER} />
      <FireArcs />
      <Flippers
        left={{ body: EMBER, glow: '#9a3412', inlay: '#fed7aa' }}
        right={{ body: FLAME, glow: '#a16207', inlay: '#fef3c7' }}
      />
      <Balls color="#ffffff" light="#ff9a3c" metalness={0.25} roughness={0.4} map={molten} emissive={{ color: '#ffffff', intensity: 0.85 }} beacon={TOXIC} />
      <Plunger tip={EMBER} knob="#1c1917" ring={TOXIC} />
      <Embers />
      <mesh position={[0, 11.4, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[47, 82]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.05} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
      </mesh>
    </>
  );
}

const CABINET: CabinetLook = {
  body: '#1c1410',
  trim: [EMBER, TOXIC],
  glass: { color: '#0c0806', glow: '#431407' },
  bars: [EMBER, TOXIC, FLAME],
  topper: EMBER,
  beacon: { base: '#052e16', lit: TOXIC, isLit: () => useSalamander.getState().mawLit },
};

/** Cabinet, room lighting, environment and post-processing. */
export function Surroundings() {
  const sideArt = useMemo(() => makeSideArt(), []);
  return (
    <>
      <color attach="background" args={['#0b0705']} />
      <fog attach="fog" args={['#0b0705', 140, 300]} />

      <ambientLight intensity={0.42} color="#ffe4cc" />
      <directionalLight
        position={[25, 90, 55]}
        intensity={1.3}
        color="#fff1e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-30, 60, -20]} intensity={0.3} color="#fdba74" />
      <FlickerLights />
      <pointLight position={[0, 20, -34]} intensity={50} distance={90} color="#c2410c" decay={1.9} />

      <Cabinet sideArt={sideArt} look={CABINET}>
        {/* on the left rail's top (y 5.25): legs straddle it, head toward the player */}
        <Guardian at={[-25.2, 6.45, -20]} yaw={-Math.PI / 2} scale={1.25} />
      </Cabinet>

      <mesh position={[0, -31.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0d0806" roughness={0.4} metalness={0.5} />
      </mesh>
      <ContactShadows position={[0, -31, 5]} opacity={0.75} scale={120} blur={2.4} far={60} color="#000000" />
      <mesh position={[0, -30.9, 52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive={EMBER} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, -30.9, -52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive={TOXIC} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>

      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 20, 30]} scale={[60, 10, 1]} color="#ffe2c4" />
        <Lightformer intensity={2} position={[-30, 10, -10]} scale={[30, 6, 1]} color={EMBER} />
        <Lightformer intensity={1.4} position={[30, 10, -10]} scale={[30, 6, 1]} color={TOXIC} />
        <Lightformer intensity={1.2} position={[0, 30, -30]} scale={[50, 8, 1]} color={FLAME} />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.55} luminanceSmoothing={0.25} />
        <Vignette darkness={0.75} offset={0.22} />
      </EffectComposer>
    </>
  );
}
