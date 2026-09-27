// Dead Star Disco — set-dressing and set-pieces. Generic parts (walls, bumpers,
// flippers, balls, plunger…) come from the engine; this file holds what makes
// the table *this* table: synthwave playfield art, the raised NOVA HIGHWAY deck,
// the wire ramp, the wormhole, the Wrecker, the cabinet and its lighting.

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { WallSeg } from '../../engine/types';
import { ACTIVE, samplePath, kinematicSpeed } from '../../engine/table';
import { gameRef, isTilted, flashOf, spinnerOf } from '../../engine/runtime';
import { useGame } from '../../engine/store';
import { PX, PZ, makeTrackTube, makeTrackRibbon, makeTrackSurface, type TrackPoint } from '../../engine/scene/track';
import {
  Walls, Slings, Bumpers, Posts, Kickers, Flippers, Balls, Plunger, RideTrail, useTier,
} from '../../engine/scene/parts';
import { DMD } from '../../engine/scene/dmd';
import {
  table, sensors as SENSORS, RAMP_PATH, TUNNEL_PATH, RETURN_GUIDE_LEFT, RETURN_GUIDE_RIGHT,
  SLING_LEFT, SLING_RIGHT, UPPER_DECK_HEIGHT, heightAt as boardHeightAt,
} from './table';
import { useDisco } from './rules';

const TARGETS = table.circles.filter((c) => c.kind === 'target');
const DROP_TARGETS = table.circles.filter((c) => c.kind === 'drop');
const SCOOP = table.captures[0];

// ---------------- Playfield art ----------------
function makePlayfieldTexture(): THREE.CanvasTexture {
  const W = 1024, H = 1792;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  // bg
  const bg = g.createRadialGradient(W/2, H*0.35, 100, W/2, H/2, 1200);
  bg.addColorStop(0, '#0d1440');
  bg.addColorStop(0.45, '#0a0f33');
  bg.addColorStop(1, '#04060f');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 700; i++) {
    const x = Math.random()*W, y = Math.random()*H;
    const r = Math.random()*1.8+0.3;
    g.fillStyle = `rgba(${150+Math.random()*105|0},${170+Math.random()*85|0},255,${0.15+Math.random()*0.6})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // neon grid horizon
  g.save();
  g.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const y = H*0.12 + i*i*1.55;
    if (y > H) break;
    g.strokeStyle = i % 2 ? 'rgba(34,211,238,0.35)' : 'rgba(232,121,249,0.3)';
    g.lineWidth = i % 5 === 0 ? 3 : 1.5;
    g.beginPath(); g.moveTo(60, y); g.lineTo(W-60, y); g.stroke();
  }
  for (let i = 0; i <= 20; i++) {
    const x = 60 + (W-120)*i/20;
    g.strokeStyle = 'rgba(99,102,241,0.22)';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(W/2+(x-W/2)*0.2, H*0.12); g.lineTo(x, H); g.stroke();
  }
  g.restore();
  // outer orbit ring
  g.save();
  g.strokeStyle = 'rgba(34,211,238,0.85)';
  g.lineWidth = 10;
  g.shadowColor = '#22d3ee'; g.shadowBlur = 30;
  g.beginPath();
  g.arc(W/2, H*0.245, W*0.40, Math.PI, 0);
  g.stroke();
  g.strokeStyle = 'rgba(232,121,249,0.7)';
  g.lineWidth = 5;
  g.shadowColor = '#e879f9'; g.shadowBlur = 24;
  g.beginPath();
  g.arc(W/2, H*0.245, W*0.40 - 26, Math.PI, 0);
  g.stroke();
  g.restore();
  // center sun
  const sunY = H*0.42;
  const sun = g.createLinearGradient(0, sunY-130, 0, sunY+130);
  sun.addColorStop(0, '#fde047');
  sun.addColorStop(0.45, '#fb7185');
  sun.addColorStop(1, '#7c3aed');
  g.save();
  g.shadowColor = '#fb7185'; g.shadowBlur = 60;
  g.fillStyle = sun;
  g.beginPath(); g.arc(W/2, sunY, 130, 0, 7); g.fill();
  g.restore();
  // sun slats
  g.fillStyle = '#0a0f33';
  for (let i = 0; i < 6; i++) {
    const y = sunY + 10 + i*20;
    g.fillRect(W/2-135, y, 270, 6+i*1.6);
  }
  // title
  g.save();
  g.textAlign = 'center';
  g.shadowColor = '#22d3ee'; g.shadowBlur = 34;
  g.fillStyle = '#e0faff';
  g.font = '900 92px "Arial Black", Arial, sans-serif';
  g.fillText('DEAD STAR', W/2, sunY - 170);
  g.shadowColor = '#e879f9';
  g.fillStyle = '#ffe4fb';
  g.fillText('DISCO', W/2, sunY - 84);
  g.restore();
  g.save();
  g.textAlign = 'center';
  g.fillStyle = 'rgba(224,250,255,0.75)';
  g.font = '700 30px Arial';
  g.fillText('•  PINBALL  •', W/2, sunY + 190);
  g.restore();
  // lane labels
  g.save();
  g.textAlign = 'center';
  g.font = '900 34px Arial';
  const laneY = 150;
  const labels = ['D', 'S', 'D'];
  const cols = ['#22d3ee', '#e879f9', '#fbbf24'];
  labels.forEach((t, i) => {
    const x = W/2 + (i-1)*150;
    g.shadowColor = cols[i]; g.shadowBlur = 22;
    g.strokeStyle = cols[i]; g.lineWidth = 3;
    g.beginPath(); g.arc(x, laneY, 44, 0, 7); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillText(t, x, laneY+12);
  });
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = '700 22px Arial';
  g.shadowBlur = 0;
  g.fillText('LIGHT ALL 3 • MULTIPLIER', W/2, laneY + 78);
  g.restore();
  // bumper halos painted
  const bumperPos = [[W/2-150, H*0.30], [W/2+150, H*0.30], [W/2, H*0.245]];
  bumperPos.forEach(([x, y], i) => {
    const col = ['#22d3ee', '#e879f9', '#fbbf24'][i];
    g.save();
    g.strokeStyle = col; g.globalAlpha = 0.5;
    g.lineWidth = 4; g.shadowColor = col; g.shadowBlur = 20;
    g.beginPath(); g.arc(x, y, 86, 0, 7); g.stroke();
    g.restore();
  });
  // scoop label
  g.save();
  g.textAlign = 'center';
  g.fillStyle = '#fde047';
  g.shadowColor = '#fbbf24'; g.shadowBlur = 18;
  g.font = '900 30px Arial';
  g.fillText('JACKPOT', W*0.27, H*0.52);
  g.font = '700 22px Arial';
  g.fillStyle = 'rgba(253,224,71,0.7)';
  g.shadowBlur = 0;
  g.fillText('SCOOP', W*0.27, H*0.52 + 30);
  g.restore();
  // orbit label
  g.save();
  g.translate(72, H*0.32);
  g.rotate(-Math.PI/2);
  g.textAlign = 'center';
  g.fillStyle = 'rgba(34,211,238,0.8)';
  g.font = '900 28px Arial';
  g.fillText('O R B I T  •  1000', 0, 0);
  g.restore();
  // plunger lane art + skill zone
  const laneX = W*0.895;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(laneX - 52, H*0.30, 104, H*0.55);
  g.strokeStyle = 'rgba(148,163,184,0.5)';
  g.lineWidth = 3;
  g.strokeRect(laneX - 52, H*0.30, 104, H*0.55);
  // skill zone (lower-middle of lane = gentle launch)
  const sz1 = H*0.586, sz0 = H*0.674;
  const grad = g.createLinearGradient(0, sz1, 0, sz0);
  grad.addColorStop(0, '#22c55e');
  grad.addColorStop(1, '#15803d');
  g.fillStyle = grad;
  g.shadowColor = '#22c55e'; g.shadowBlur = 22;
  g.fillRect(laneX - 52, sz1, 104, sz0 - sz1);
  g.fillStyle = '#04140a';
  g.textAlign = 'center';
  g.font = '900 20px Arial';
  g.shadowBlur = 0;
  g.fillText('SKILL', laneX, (sz0+sz1)/2 + 2);
  g.fillText('SHOT', laneX, (sz0+sz1)/2 + 24);
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.font = '700 20px Arial';
  g.save();
  g.translate(laneX, H*0.88);
  g.rotate(0);
  g.fillText('PLUNGE', 0, 0);
  g.restore();
  g.restore();
  // bottom apron
  g.save();
  const apr = g.createLinearGradient(0, H*0.93, 0, H);
  apr.addColorStop(0, '#111a3a');
  apr.addColorStop(1, '#05070f');
  g.fillStyle = apr;
  g.fillRect(0, H*0.93, W, H*0.07);
  g.fillStyle = 'rgba(148,163,184,0.8)';
  g.textAlign = 'center';
  g.font = '700 24px Arial';
  g.fillText('DEAD STAR DISCO • BALL SAVE • 3 BALLS • TILT ENDS FUN', W/2, H*0.968);
  g.restore();
  // vignette edges
  const vg = g.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeSideArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(0.5, '#0b0d20');
  grad.addColorStop(1, '#17122e');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1024);
  g.save();
  g.translate(128, 512);
  g.rotate(-Math.PI/2);
  g.textAlign = 'center';
  g.shadowColor = '#22d3ee'; g.shadowBlur = 26;
  g.fillStyle = '#e0faff';
  g.font = '900 64px "Arial Black", Arial';
  g.fillText('DEAD STAR DISCO', 0, 0);
  g.restore();
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `hsla(${180+Math.random()*140},90%,60%,${0.12+Math.random()*0.25})`;
    g.fillRect(Math.random()*256, Math.random()*1024, 3, 20+Math.random()*80);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLevelBadgeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#071426';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#22d3ee';
  g.lineWidth = 7;
  g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#22d3ee';
  g.shadowBlur = 18;
  g.fillStyle = '#e0faff';
  g.font = '900 62px Arial';
  g.fillText('LEVEL 02  /  STAR HIGHWAY', c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


function PlayfieldBase({ art }: { art: THREE.CanvasTexture }) {
  return (
    <group>
      {/* top art plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1]} receiveShadow>
        <planeGeometry args={[47, 82]} />
        <meshStandardMaterial map={art} roughness={0.32} metalness={0.25} />
      </mesh>
      {/* base body */}
      <mesh position={[0, -1.2, 1]} receiveShadow>
        <boxGeometry args={[47.6, 2.4, 82.6]} />
        <meshStandardMaterial color="#0b0e1e" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* plunger lane separator cap (metal rail top), matching the divider wall */}
      <mesh position={[17, 1.5, PZ(-10.5)]} castShadow>
        <boxGeometry args={[0.7, 3, 55]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.95} />
      </mesh>
      {/* lane floor slightly raised? */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19.5, 0.04, PZ(-8)]}>
        <planeGeometry args={[4.6, 60]} />
        <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Targets() {
  const leftTargets = useDisco((s) => s.leftTargets);
  const rightTargets = useDisco((s) => s.rightTargets);
  const centerTargets = useDisco((s) => s.centerTargets);
  const mats = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tilted = isTilted();
    for (const tg of TARGETS) {
      const m = mats.current[String(tg.id)];
      if (!m) continue;
      const id = String(tg.id);
      let lit = false;
      if (id[0] === 'L') lit = leftTargets[Number(id[1])];
      else if (id[0] === 'R') lit = rightTargets[Number(id[1])];
      else lit = centerTargets[Number(id[1])];
      const fl = flashOf(`target:${id}`);
      const base = lit ? 2.6 : 0.5 + Math.sin(t * 2 + id.charCodeAt(0)) * 0.12;
      m.emissiveIntensity = (tilted ? 1.2 : base) + fl * 5;
      if (tilted) m.emissive.set('#ef4444');
      else if (id[0] === 'L') m.emissive.set('#22d3ee');
      else if (id[0] === 'R') m.emissive.set('#e879f9');
      else m.emissive.set('#fbbf24');
    }
  });
  return (
    <group>
      {TARGETS.map((tg) => {
        const id = String(tg.id);
        const faceLeft = id[0] === 'L'; // left bank faces right (toward center)
        const rotY = id[0] === 'C' ? 0 : faceLeft ? Math.PI / 2 : -Math.PI / 2;
        return (
          <group key={id} position={[PX(tg.x), 0, PZ(tg.y)]} rotation={[0, rotY, 0]}>
            <mesh position={[0, 1.35, 0]} castShadow>
              <boxGeometry args={[0.7, 2.5, 2.1]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} />
            </mesh>
            <mesh position={[0.42, 1.35, 0]}>
              <boxGeometry args={[0.12, 2.1, 1.7]} />
              <meshStandardMaterial
                ref={(el) => { mats.current[id] = el; }}
                color="#111827"
                emissive={id[0] === 'L' ? '#22d3ee' : id[0] === 'R' ? '#e879f9' : '#fbbf24'}
                emissiveIntensity={0.6}
                roughness={0.3}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function LaneInserts() {
  const lanes = useDisco((s) => s.lanes);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tilted = isTilted();
    SENSORS.filter((s) => s.kind === 'lane').forEach((_sn, i) => {
      void _sn;
      const m = mats.current[i];
      if (!m) return;
      const lit = lanes[i];
      const fl = flashOf(`lane:${i}`);
      if (tilted) {
        m.emissive.set('#ef4444');
        m.emissiveIntensity = 1.5 + Math.sin(t * 20) * 1.2;
      } else {
        m.emissive.set(lit ? '#22c55e' : '#1e293b');
        m.emissiveIntensity = (lit ? 2.4 + Math.sin(t * 4) * 0.3 : 0.35) + fl * 5;
      }
    });
  });
  return (
    <group>
      {SENSORS.filter((s) => s.kind === 'lane').map((sn, i) => (
        <group key={sn.id} position={[PX(sn.x), boardHeightAt(sn.x, sn.y), PZ(sn.y)]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[sn.r, sn.r, 0.18, 24]} />
            <meshStandardMaterial
              ref={(el) => { mats.current[i] = el; }}
              color="#020617"
              emissive="#22c55e"
              emissiveIntensity={0.4}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[sn.r - 0.25, sn.r + 0.15, 24]} />
            <meshStandardMaterial color="#e2e8f0" emissive="#ffffff" emissiveIntensity={0.25} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* orbit insert */}
      <OrbitInsert />
      {/* inlane inserts */}
      {SENSORS.filter((s) => s.kind === 'inlane').map((sn) => (
        <mesh key={sn.id} position={[PX(sn.x), 0.09, PZ(sn.y)]}>
          <cylinderGeometry args={[1.1, 1.1, 0.16, 20]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitInsert() {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('orbit');
    if (mat.current) mat.current.emissiveIntensity = 0.8 + Math.sin(t * 2.5) * 0.3 + fl * 6;
    if (light.current) light.current.intensity = 3 + fl * 50;
  });
  const sn = SENSORS.find((s) => s.id === 'orbitL')!;
  return (
    <group position={[PX(sn.x), 0, PZ(sn.y)]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.18, 24]} />
        <meshStandardMaterial ref={mat} color="#020617" emissive="#22d3ee" emissiveIntensity={1} />
      </mesh>
      <pointLight ref={light} position={[0, 3, 0]} color="#22d3ee" intensity={3} distance={20} />
    </group>
  );
}

function Scoop() {
  const jackpotLit = useDisco((s) => s.jackpotLit);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('scoop') + flashOf('jackpot') * 0.7;
    if (mat.current) {
      mat.current.emissive.set(jackpotLit ? '#fbbf24' : '#22d3ee');
      mat.current.emissiveIntensity = (jackpotLit ? 2.5 + Math.sin(t * 8) * 1.5 : 0.9 + Math.sin(t * 2) * 0.25) + fl * 5;
    }
    if (light.current) {
      light.current.color.set(jackpotLit ? '#fbbf24' : '#22d3ee');
      light.current.intensity = (jackpotLit ? 14 + Math.sin(t * 8) * 8 : 4) + fl * 60;
    }
  });
  const sn = SCOOP;
  return (
    <group position={[PX(sn.x), 0, PZ(sn.y)]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[sn.r, sn.r, 0.22, 28]} />
        <meshStandardMaterial color="#000000" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[sn.r - 0.15, sn.r + 0.45, 28]} />
        <meshStandardMaterial ref={mat} color="#111827" emissive="#22d3ee" emissiveIntensity={1} roughness={0.3} metalness={0.5} />
      </mesh>
      <pointLight ref={light} position={[0, 3.5, 0]} color="#22d3ee" intensity={4} distance={22} />
    </group>
  );
}

function Spinner() {
  const blade = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    if (blade.current) blade.current.rotation.y = spinnerOf('spinner').angle;
    if (mat.current) mat.current.emissiveIntensity = 0.8 + flashOf('spinner') * 5;
  });
  const sn = SENSORS.find((s) => s.kind === 'spinner')!;
  return (
    <group position={[PX(sn.x), 0, PZ(sn.y)]}>
      {/* posts */}
      {[[-2.4, 0], [2.4, 0]].map(([ox], i) => (
        <mesh key={i} position={[ox, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 3.2, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[5.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={blade} position={[0, 1.7, 0]}>
        <mesh castShadow>
          <boxGeometry args={[4.4, 2.4, 0.18]} />
          <meshStandardMaterial
            ref={mat}
            color="#f97316"
            emissive="#f97316"
            emissiveIntensity={0.8}
            roughness={0.35}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[4.4, 0.4, 0.02]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  );
}

// A raised rear deck and two climbing ramps make the upper playfield a visible,
// navigable part of the machine rather than painted artwork.
function RaisedUpperLevel() {
  const badge = useMemo(() => makeLevelBadgeTexture(), []);
  const leftRamp: TrackPoint[] = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const x = -14.4 + t * 5;
    const y = 18.5 + t * 7.5;
    return { x, y, h: boardHeightAt(x, y) };
  }), []);
  const rightRamp: TrackPoint[] = useMemo(
    () => leftRamp.map((p) => ({ ...p, x: -p.x })),
    [leftRamp],
  );
  const leftSurface = useMemo(() => makeTrackSurface(leftRamp, 1.8), [leftRamp]);
  const rightSurface = useMemo(() => makeTrackSurface(rightRamp, 1.8), [rightRamp]);
  const rampRails = useMemo(() => [leftRamp, rightRamp].flatMap((path, index) => {
    const raised = path.map((p) => ({ ...p, h: p.h + 0.55 }));
    return [
      { key: `${index}-outer`, geometry: makeTrackTube(raised, 0.2, -1.72) },
      { key: `${index}-inner`, geometry: makeTrackTube(raised, 0.2, 1.72) },
    ];
  }), [leftRamp, rightRamp]);

  return (
    <group>
      {/* four steel stanchions supporting the rear mini-playfield */}
      {[-8.7, 8.7].flatMap((x) => [26.2, 32.7].map((y) => (
        <group key={`deck-support-${x}-${y}`} position={[x, 0, PZ(y)]}>
          <mesh position={[0, UPPER_DECK_HEIGHT / 2, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.4, UPPER_DECK_HEIGHT, 16]} />
            <meshStandardMaterial color="#a8b6c8" metalness={0.9} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.72, 0.8, 0.3, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
          </mesh>
        </group>
      )))}

      {/* solid elevated deck, raised enough for the ball to visibly roll above the base */}
      <mesh position={[0, UPPER_DECK_HEIGHT - 0.32, PZ(29.45)]} castShadow receiveShadow>
        <boxGeometry args={[19.6, 0.64, 8.1]} />
        <meshStandardMaterial color="#10182c" roughness={0.32} metalness={0.55} emissive="#071b36" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, UPPER_DECK_HEIGHT + 0.015, PZ(29.45)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18.9, 7.35]} />
        <meshStandardMaterial color="#10172a" roughness={0.28} metalness={0.28} />
      </mesh>
      <mesh position={[0, UPPER_DECK_HEIGHT + 0.055, PZ(26.35)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.3, 1.05]} />
        <meshBasicMaterial map={badge} toneMapped={false} />
      </mesh>

      {/* three separated metal guide channels on the raised deck */}
      {[-9.45, 9.45].map((x) => (
        <mesh key={`upper-side-rail-${x}`} position={[x, UPPER_DECK_HEIGHT + 0.7, PZ(29.45)]}>
          <boxGeometry args={[0.42, 1.05, 8.05]} />
          <meshStandardMaterial color="#dbeafe" metalness={0.92} roughness={0.2} emissive="#1e3a5f" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {[-3.12, 3.12].map((x, i) => (
        <group key={`upper-channel-${i}`}>
          <mesh position={[x, UPPER_DECK_HEIGHT + 0.38, PZ(29.45)]}>
            <boxGeometry args={[0.22, 0.76, 7.25]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[x + 0.2, UPPER_DECK_HEIGHT + 0.79, PZ(29.45)]}>
            <boxGeometry args={[0.09, 0.08, 7.1]} />
            <meshStandardMaterial color="#ffffff" emissive={i === 0 ? '#22d3ee' : '#e879f9'} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* colored lane beds sit above the deck and align with the rollover sensors */}
      {[
        { x: -6.2, color: '#063d53', glow: '#22d3ee' },
        { x: 0, color: '#32133f', glow: '#e879f9' },
        { x: 6.2, color: '#3f300b', glow: '#fbbf24' },
      ].map((lane) => (
        <group key={`lane-bed-${lane.x}`} position={[lane.x, UPPER_DECK_HEIGHT + 0.08, PZ(29.45)]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5.65, 6.65]} />
            <meshStandardMaterial color={lane.color} emissive={lane.glow} emissiveIntensity={0.22} roughness={0.32} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[5.45, 0.08, 0.12]} />
            <meshStandardMaterial color="#ffffff" emissive={lane.glow} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* two open-top ramps lead from the lower playfield onto the raised deck */}
      {[leftSurface, rightSurface].map((geometry, i) => (
        <mesh key={`ramp-surface-${i}`} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color="#243650" roughness={0.3} metalness={0.72} emissive="#123c58" emissiveIntensity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {rampRails.map((rail) => (
        <mesh key={rail.key} geometry={rail.geometry} castShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.16} emissive="#164e63" emissiveIntensity={0.65} />
        </mesh>
      ))}

      {/* cross-braced ramp supports */}
      {[-1, 1].flatMap((side) => [
        { x: side * 12.2, y: 22.8 },
        { x: side * 10.5, y: 24.7 },
      ].map((p, i) => {
        const h = boardHeightAt(p.x, p.y);
        return (
        <mesh key={`ramp-post-${side}-${i}`} position={[p.x, h / 2, PZ(p.y)]} castShadow>
          <cylinderGeometry args={[0.14, 0.2, h, 12]} />
          <meshStandardMaterial color="#718096" metalness={0.9} roughness={0.25} />
        </mesh>
      );
      }))}
    </group>
  );
}

// Wireform rails tracing the real return-guide collision paths, so what the player
// sees is exactly what the ball rolls along.
function LowerChannels() {
  const rails = useMemo(() => {
    const paths: [number, number][][] = [RETURN_GUIDE_LEFT, RETURN_GUIDE_RIGHT];
    return paths.flatMap((path, i) => {
      const pts: TrackPoint[] = path.map(([x, y]) => ({ x, y, h: 1.25 }));
      return [
        { key: `${i}-top`, tube: makeTrackTube(pts, 0.17), tone: i === 0 },
        { key: `${i}-low`, tube: makeTrackTube(pts.map((p) => ({ ...p, h: 0.35 })), 0.13), tone: i === 0 },
      ];
    });
  }, []);

  return (
    <group>
      {rails.map((rail) => (
        <mesh key={`lower-channel-${rail.key}`} geometry={rail.tube} castShadow>
          <meshStandardMaterial
            color="#b9c7d9"
            metalness={0.94}
            roughness={0.2}
            emissive={rail.tone ? '#0e7490' : '#312e81'}
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

function DropDoors() {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame((_, dt) => {
    for (let i = 0; i < 3; i++) {
      const g = groups.current[i];
      const m = mats.current[i];
      if (!g) continue;
      const down = gameRef.dropDown[`d${i}`];
      const target = down ? Math.PI / 2 : 0;
      g.rotation.z += (target - g.rotation.z) * Math.min(1, dt * 14);
      if (m) {
        const fl = flashOf(`drop:d${i}`);
        m.emissiveIntensity = (down ? 0.15 : 1.4) + fl * 5;
      }
    }
  });
  return (
    <group>
      {DROP_TARGETS.map((t, i) => (
        <group key={t.id} position={[PX(t.x), 0.15, PZ(t.y)]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.5, 2.5, 2.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.45} metalness={0.4} />
          </mesh>
          <group ref={(el) => { groups.current[i] = el; }} position={[0.28, 0.15, 0]}>
            <mesh position={[0.08, 1.15, 0]} castShadow>
              <boxGeometry args={[0.22, 2.2, 1.85]} />
              <meshStandardMaterial
                ref={(el) => { mats.current[i] = el; }}
                color="#1e293b"
                emissive="#22d3ee"
                emissiveIntensity={1.4}
                roughness={0.28}
                metalness={0.35}
              />
            </mesh>
            <mesh position={[0.2, 1.15, 0]}>
              <boxGeometry args={[0.04, 1.6, 0.12]} />
              <meshStandardMaterial color="#ffffff" emissive="#e0faff" emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// Glowing dots trailing the ball while it rides a capture path — the "speed"

function NovaRamp() {
  // Wide-spaced side rails leave room for the ball to visibly travel the wire.
  const rail2 = useMemo(() => {
    const raised = RAMP_PATH.map((p) => ({ ...p, h: p.h + 0.45 }));
    return {
      a: makeTrackTube(raised, 0.14, -1.7),
      b: makeTrackTube(raised, 0.14, 1.7),
    };
  }, []);
  const cross = useMemo(() => {
    const raised = RAMP_PATH.map((p) => ({ ...p, h: p.h - 0.15 }));
    return makeTrackTube(raised, 0.34, 0);
  }, []);
  const bedRib = useMemo(() => makeTrackRibbon(RAMP_PATH, 1.35), []);
  const glow = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('ramp');
    const lit = useDisco.getState().rampLit;
    if (glow.current) glow.current.emissiveIntensity = (lit ? 2.2 + Math.sin(t * 8) * 0.8 : 0.7) + fl * 5;
  });
  const enter = RAMP_PATH[0];
  const supports = useMemo(() => [0.28, 0.52, 0.74, 0.9].map((t) => samplePath(RAMP_PATH, t)), []);
  return (
    <group>
      {/* translucent glowing bed — ball stays visible while riding */}
      <mesh geometry={bedRib} receiveShadow>
        <meshStandardMaterial
          ref={glow}
          color="#0b3a4a"
          roughness={0.25}
          metalness={0.55}
          emissive="#22d3ee"
          emissiveIntensity={0.7}
          side={THREE.DoubleSide}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* underside spine */}
      <mesh geometry={cross} castShadow>
        <meshStandardMaterial color="#164e63" metalness={0.9} roughness={0.2} emissive="#155e75" emissiveIntensity={0.8} />
      </mesh>
      {/* guard rails */}
      <mesh geometry={rail2.a} castShadow>
        <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.14} />
      </mesh>
      <mesh geometry={rail2.b} castShadow>
        <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.14} />
      </mesh>
      {/* support stanchions down to the playfield */}
      {supports.map((p, i) => (
        <mesh key={i} position={[PX(p.x), p.h / 2, PZ(p.y)]} castShadow>
          <cylinderGeometry args={[0.16, 0.24, p.h, 10]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.9} roughness={0.25} emissive="#0c4a6e" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* entrance hoop */}
      <mesh position={[PX(enter.x), 1.9, PZ(enter.y)]} rotation={[0, 0.25, Math.PI / 2]}>
        <torusGeometry args={[1.85, 0.18, 10, 26]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <pointLight position={[PX(enter.x), 3, PZ(enter.y)]} color="#22d3ee" intensity={9} distance={16} />
      <RideTrail rideId="ramp" path={RAMP_PATH} color="#67e8f9" r={1.15} />
    </group>
  );
}

function Wormhole() {
  const pipe = useMemo(() => makeTrackTube(TUNNEL_PATH.map((p) => ({ ...p, h: p.h + 0.9 })), 1.05, 0), []);
  const glow = useRef<THREE.MeshStandardMaterial>(null!);
  const hole = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashOf('tunnel');
    if (glow.current) glow.current.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.3 + fl * 5;
    if (hole.current) hole.current.emissiveIntensity = 1.2 + fl * 4;
  });
  const enter = TUNNEL_PATH[0];
  const exit = TUNNEL_PATH[TUNNEL_PATH.length - 1];
  return (
    <group>
      <mesh geometry={pipe} castShadow>
        <meshStandardMaterial
          ref={glow}
          color="#2e1065"
          roughness={0.22}
          metalness={0.7}
          emissive="#a21caf"
          emissiveIntensity={0.9}
          transparent
          opacity={0.72}
        />
      </mesh>
      {[enter, exit].map((p, i) => (
        <group key={i} position={[PX(p.x), 0.08, PZ(p.y)]}>
          <mesh>
            <cylinderGeometry args={[1.7, 1.7, 0.22, 24]} />
            <meshStandardMaterial ref={i === 0 ? hole : undefined} color="#020617" emissive="#e879f9" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.35, 1.9, 24]} />
            <meshStandardMaterial color="#111827" emissive={i === 0 ? '#e879f9' : '#22d3ee'} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* glowing energy orb riding inside the pipe (the ball itself is hidden) */}
      <RideTrail rideId="tunnel" path={TUNNEL_PATH} color="#f0abfc" r={0.85} />
      <pointLight position={[PX(enter.x), 3, PZ(enter.y)]} color="#e879f9" intensity={10} distance={14} />
    </group>
  );
}

// ---------------- Difficulty obstacles ----------------
function Wrecker() {
  useTier(); // remount when the tier toggles this obstacle
  const bar = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.MeshStandardMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const W = ACTIVE.kinematics.find((k) => k.id === 'wrecker');
  useFrame((state) => {
    if (!W) return;
    if (bar.current) bar.current.rotation.y = gameRef.kin[W.id] ?? 0;
    const t = state.clock.elapsedTime;
    const rpm = kinematicSpeed(W);
    if (glow.current) glow.current.emissiveIntensity = 1.4 + Math.sin(t * rpm * 4) * 0.8;
    if (light.current) light.current.intensity = 10 + Math.sin(t * rpm * 4) * 6;
  });
  if (!W) return null;
  const WRECKER = W;
  const len = (WRECKER.half ?? 0) * 2 + WRECKER.r * 2;
  return (
    <group position={[PX(WRECKER.cx), 0.7, PZ(WRECKER.cy)]}>
      <group ref={bar}>
        <mesh castShadow>
          <boxGeometry args={[len, 0.9, 0.9]} />
          <meshStandardMaterial
            ref={glow}
            color="#7f1d1d"
            metalness={0.85}
            roughness={0.28}
            emissive="#ef4444"
            emissiveIntensity={1.4}
          />
        </mesh>
        {/* hazard caps */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (len / 2 - 0.4), 0, 0]} castShadow>
            <sphereGeometry args={[WRECKER.r + 0.28, 14, 14]} />
            <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={1.6} metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* hub */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.9, 1.05, 1.6, 18]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 14]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 3.4, 0]} color="#ef4444" intensity={10} distance={26} />
    </group>
  );
}

// ---------------- Cabinet ----------------
function Cabinet({ sideArt }: { sideArt: THREE.CanvasTexture }) {
  const topperMat = useRef<THREE.MeshStandardMaterial>(null!);
  const topperLight = useRef<THREE.PointLight>(null!);
  const jackpotMat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const st = useGame.getState();
    const mb = st.multiball;
    const jp = flashOf('jackpot');
    if (topperMat.current) {
      const hue = mb ? (t * 2) % 1 : 0.55 + Math.sin(t * 1.5) * 0.08;
      topperMat.current.emissive.setHSL(mb ? hue : 0.52, 0.9, 0.55);
      topperMat.current.emissiveIntensity = (mb ? 3 : 1.6) + jp * 4;
    }
    if (topperLight.current) {
      topperLight.current.intensity = (mb ? 30 : 12) + jp * 60 + Math.sin(t * 6) * 4;
      if (mb) topperLight.current.color.setHSL((t * 2) % 1, 0.9, 0.6);
      else topperLight.current.color.set('#22d3ee');
    }
    if (jackpotMat.current) {
      jackpotMat.current.emissiveIntensity = useDisco.getState().jackpotLit ? 2.5 + Math.sin(t * 8) * 1.5 : 0.3;
    }
  });
  return (
    <group>
      {/* side rails */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 25.2, 2, 1]} castShadow receiveShadow>
            <boxGeometry args={[3, 6.5, 87]} />
            <meshStandardMaterial map={sideArt} roughness={0.5} metalness={0.3} />
          </mesh>
          {/* neon trim */}
          <mesh position={[s * 23.6, 4.4, 1]}>
            <boxGeometry args={[0.35, 0.35, 86]} />
            <meshStandardMaterial color="#000" emissive={s < 0 ? '#22d3ee' : '#e879f9'} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* lockdown bar */}
      <mesh position={[0, 2.2, 45.2]} castShadow>
        <boxGeometry args={[54, 1.6, 4.5]} />
        <meshStandardMaterial color="#9aa5b5" metalness={0.95} roughness={0.25} />
      </mesh>
      {/* front body */}
      <mesh position={[0, -11.5, 1]} rotation={[0.115, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[53.5, 18, 86]} />
        <meshStandardMaterial color="#141126" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* coin door */}
      <mesh position={[0, -8, 44.5]}>
        <boxGeometry args={[10, 12, 0.6]} />
        <meshStandardMaterial color="#0b0b12" roughness={0.4} metalness={0.7} />
      </mesh>
      {[[-2.2], [2.2]].map(([ox], i) => (
        <mesh key={i} position={[ox, -8, 44.9]}>
          <boxGeometry args={[2.6, 4, 0.3]} />
          <meshStandardMaterial color="#1f2937" emissive={i ? '#e879f9' : '#22d3ee'} emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* legs */}
      {[[-24, 38], [24, 38], [-24, -30], [24, -30]].map(([x, z], i) => (
        <group key={i} position={[x, -21, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.4, 1.1, 20, 14]} />
            <meshStandardMaterial color="#1f2937" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -10.2, 0]}>
            <cylinderGeometry args={[1.7, 1.9, 1, 14]} />
            <meshStandardMaterial color="#000" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* backbox */}
      <mesh position={[0, 14, -41.5]} castShadow>
        <boxGeometry args={[54, 34, 9]} />
        <meshStandardMaterial color="#141126" roughness={0.55} metalness={0.3} />
      </mesh>
      {/* backglass art frame */}
      <mesh position={[0, 24.5, -36.9]}>
        <planeGeometry args={[50, 13]} />
        <meshStandardMaterial color="#050816" roughness={0.4} emissive="#1e1b4b" emissiveIntensity={0.5} />
      </mesh>
      {/* backglass neon title (emissive bars simulating art) */}
      <mesh position={[0, 25.5, -36.7]}>
        <boxGeometry args={[30, 0.7, 0.2]} />
        <meshStandardMaterial color="#000" emissive="#22d3ee" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 22.8, -36.7]}>
        <boxGeometry args={[30, 0.7, 0.2]} />
        <meshStandardMaterial color="#000" emissive="#e879f9" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[-20, 24.2, -36.7]}>
        <boxGeometry args={[0.7, 4, 0.2]} />
        <meshStandardMaterial color="#000" emissive="#fbbf24" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[20, 24.2, -36.7]}>
        <boxGeometry args={[0.7, 4, 0.2]} />
        <meshStandardMaterial color="#000" emissive="#fbbf24" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* jackpot beacon on backbox */}
      <mesh position={[0, 32.6, -40]}>
        <cylinderGeometry args={[2.2, 2.6, 1.2, 20]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[0, 34, -40]}>
        <sphereGeometry args={[1.7, 20, 20]} />
        <meshStandardMaterial ref={jackpotMat} color="#3f2d06" emissive="#fbbf24" emissiveIntensity={0.3} roughness={0.3} />
      </mesh>
      {/* DMD housing */}
      <mesh position={[0, 16.5, -36.85]}>
        <boxGeometry args={[37, 13, 1.4]} />
        <meshStandardMaterial color="#000000" roughness={0.6} />
      </mesh>
      <DMD />
      {/* speakers */}
      {[[-22], [22]].map(([x], i) => (
        <group key={i} position={[x, 16.5, -36.9]}>
          <mesh>
            <circleGeometry args={[3.4, 24]} />
            <meshStandardMaterial color="#020617" roughness={0.8} />
          </mesh>
          {[2.4, 1.5, 0.6].map((r, j) => (
            <mesh key={j} position={[0, 0, 0.08]}>
              <ringGeometry args={[r - 0.18, r, 24]} />
              <meshStandardMaterial color="#334155" emissive="#475569" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* topper dome */}
      <mesh position={[0, 32.2, -41.5]}>
        <cylinderGeometry args={[3.4, 4, 1.6, 20]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 34.2, -41.5]}>
        <sphereGeometry args={[2.4, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={topperMat} color="#0b1220" emissive="#22d3ee" emissiveIntensity={1.6} roughness={0.2} transparent opacity={0.95} />
      </mesh>
      <pointLight ref={topperLight} position={[0, 36, -38]} color="#22d3ee" intensity={12} distance={60} />
    </group>
  );
}


// ---------------- Theme entry points ----------------
const SLING_TRIS = [
  { group: 'L', pts: SLING_LEFT },
  { group: 'R', pts: SLING_RIGHT },
];

const wallLook = (w: WallSeg) => ({
  h: w.id.startsWith('arc') || w.id.startsWith('outer') || w.id === 'divider' ? 3.2 : 2.4,
  color: w.id === 'divider' ? '#94a3b8' : w.kind === 'guide' ? '#38bdf8' : '#e2e8f0',
  metal: w.id === 'divider' || w.kind === 'wall' ? 0.9 : 0.4,
});

const postRing = (id: string) => (id.startsWith('lane') ? '#fbbf24' : '#f43f5e');

/** Everything on the tilted playfield. */
export function Playfield() {
  const art = useMemo(() => makePlayfieldTexture(), []);
  return (
    <>
      <PlayfieldBase art={art} />
      <Walls look={wallLook} />
      <LowerChannels />
      <Slings tris={SLING_TRIS} />
      <Bumpers />
      <Posts ring={postRing} />
      <Targets />
      <LaneInserts />
      <RaisedUpperLevel />
      <Scoop />
      <Spinner />
      <DropDoors />
      <NovaRamp />
      <Wormhole />
      <Wrecker />
      <Kickers />
      <Flippers />
      <Balls />
      <Plunger />
      {/* glass follows playfield tilt so the ball never clips through */}
      <mesh position={[0, 11.4, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[47, 82]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.05} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Cabinet, room lighting, environment and post-processing. */
export function Surroundings() {
  const sideArt = useMemo(() => makeSideArt(), []);
  return (
    <>
      <color attach="background" args={['#04050d']} />
      <fog attach="fog" args={['#04050d', 140, 300]} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[25, 90, 55]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-30, 60, -20]} intensity={0.35} color="#93c5fd" />
      <pointLight position={[0, 26, 30]} intensity={40} distance={110} color="#c4b5fd" decay={1.9} />
      <pointLight position={[0, 20, -34]} intensity={60} distance={90} color="#7c3aed" decay={1.9} />

      <Cabinet sideArt={sideArt} />

      {/* floor */}
      <mesh position={[0, -31.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#070912" roughness={0.35} metalness={0.55} />
      </mesh>
      <ContactShadows position={[0, -31, 5]} opacity={0.75} scale={120} blur={2.4} far={60} color="#000000" />
      {/* floor neon strips */}
      <mesh position={[0, -30.9, 52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, -30.9, -52]}>
        <boxGeometry args={[90, 0.25, 0.6]} />
        <meshStandardMaterial color="#000" emissive="#e879f9" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 20, 30]} scale={[60, 10, 1]} color="#cdd8ff" />
        <Lightformer intensity={2} position={[-30, 10, -10]} scale={[30, 6, 1]} color="#22d3ee" />
        <Lightformer intensity={2} position={[30, 10, -10]} scale={[30, 6, 1]} color="#e879f9" />
        <Lightformer intensity={1.2} position={[0, 30, -30]} scale={[50, 8, 1]} color="#fbbf24" />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.5} luminanceSmoothing={0.25} />
        <Vignette darkness={0.72} offset={0.22} />
      </EffectComposer>
    </>
  );
}
