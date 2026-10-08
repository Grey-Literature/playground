// The cabinet around every table: side rails with art, neon trim, lockdown bar,
// front body, coin door, legs, backbox with backglass, DMD, speakers and a
// topper dome. Geometry is shared; each theme passes its colours (defaults =
// Dead Star Disco) and can add backbox extras as children.

import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store';
import { flashOf } from '../runtime';
import { DMD } from './dmd';

export interface CabinetLook {
  /** Wood/body colour of the cabinet, backbox and front. */
  body: string;
  /** Neon trim along the left / right rails (also the coin-door lamps). */
  trim: [string, string];
  /** Backglass panel colour and its faint emissive glow. */
  glass: { color: string; glow: string };
  /** Backglass neon bars: upper, lower, the two side ticks. */
  bars: [string, string, string];
  /** Topper dome colour (idle). During multiball it cycles hues. */
  topper: string;
  /** Idle topper hue 0..1 (defaults to the topper colour's own hue). */
  topperHue?: number;
  /** Backbox beacon: lens base colour + lit colour, and when it's lit. */
  beacon: { base: string; lit: string; isLit?: () => boolean };
}

export const DISCO_CABINET: CabinetLook = {
  body: '#141126',
  trim: ['#22d3ee', '#e879f9'],
  glass: { color: '#050816', glow: '#1e1b4b' },
  bars: ['#22d3ee', '#e879f9', '#fbbf24'],
  topper: '#22d3ee',
  topperHue: 0.52,
  beacon: { base: '#3f2d06', lit: '#fbbf24' },
};

export function Cabinet({ sideArt, look = DISCO_CABINET, children }: {
  sideArt: THREE.Texture; look?: CabinetLook; children?: ReactNode;
}) {
  const topperMat = useRef<THREE.MeshStandardMaterial>(null!);
  const topperLight = useRef<THREE.PointLight>(null!);
  const beaconMat = useRef<THREE.MeshStandardMaterial>(null!);
  const idleHue = useRef(look.topperHue ?? new THREE.Color(look.topper).getHSL({ h: 0, s: 0, l: 0 }).h);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mb = useGame.getState().multiball;
    const jp = flashOf('jackpot');
    if (topperMat.current) {
      topperMat.current.emissive.setHSL(mb ? (t * 2) % 1 : idleHue.current, 0.9, 0.55);
      topperMat.current.emissiveIntensity = (mb ? 3 : 1.6) + jp * 4;
    }
    if (topperLight.current) {
      topperLight.current.intensity = (mb ? 30 : 12) + jp * 60 + Math.sin(t * 6) * 4;
      if (mb) topperLight.current.color.setHSL((t * 2) % 1, 0.9, 0.6);
      else topperLight.current.color.set(look.topper);
    }
    if (beaconMat.current) {
      beaconMat.current.emissiveIntensity = look.beacon.isLit?.() ? 2.5 + Math.sin(t * 8) * 1.5 : 0.3;
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
            <meshStandardMaterial color="#000" emissive={s < 0 ? look.trim[0] : look.trim[1]} emissiveIntensity={2.4} toneMapped={false} />
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
        <meshStandardMaterial color={look.body} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* coin door */}
      <mesh position={[0, -8, 44.5]}>
        <boxGeometry args={[10, 12, 0.6]} />
        <meshStandardMaterial color="#0b0b12" roughness={0.4} metalness={0.7} />
      </mesh>
      {[[-2.2], [2.2]].map(([ox], i) => (
        <mesh key={i} position={[ox, -8, 44.9]}>
          <boxGeometry args={[2.6, 4, 0.3]} />
          <meshStandardMaterial color="#1f2937" emissive={i ? look.trim[1] : look.trim[0]} emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
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
        <meshStandardMaterial color={look.body} roughness={0.55} metalness={0.3} />
      </mesh>
      {/* backglass art frame */}
      <mesh position={[0, 24.5, -36.9]}>
        <planeGeometry args={[50, 13]} />
        <meshStandardMaterial color={look.glass.color} roughness={0.4} emissive={look.glass.glow} emissiveIntensity={0.5} />
      </mesh>
      {/* backglass neon title (emissive bars simulating art) */}
      <mesh position={[0, 25.5, -36.7]}>
        <boxGeometry args={[30, 0.7, 0.2]} />
        <meshStandardMaterial color="#000" emissive={look.bars[0]} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 22.8, -36.7]}>
        <boxGeometry args={[30, 0.7, 0.2]} />
        <meshStandardMaterial color="#000" emissive={look.bars[1]} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {[-20, 20].map((x) => (
        <mesh key={x} position={[x, 24.2, -36.7]}>
          <boxGeometry args={[0.7, 4, 0.2]} />
          <meshStandardMaterial color="#000" emissive={look.bars[2]} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      {/* beacon on the backbox */}
      <mesh position={[0, 32.6, -40]}>
        <cylinderGeometry args={[2.2, 2.6, 1.2, 20]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[0, 34, -40]}>
        <sphereGeometry args={[1.7, 20, 20]} />
        <meshStandardMaterial ref={beaconMat} color={look.beacon.base} emissive={look.beacon.lit} emissiveIntensity={0.3} roughness={0.3} />
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
        <meshStandardMaterial ref={topperMat} color="#0b1220" emissive={look.topper} emissiveIntensity={1.6} roughness={0.2} transparent opacity={0.95} />
      </mesh>
      <pointLight ref={topperLight} position={[0, 36, -38]} color={look.topper} intensity={12} distance={60} />
      {children}
    </group>
  );
}
