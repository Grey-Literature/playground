// Layer Lab — hidden fixture table (?theme=layerLab). Not in the hall picker.
// Exists to eyeball and playtest engine layers (on / under a deck) before a
// themed table uses them. Reuses Dead Star Disco's cabinet and generic parts.

import type { ThemeDef } from '../../engine/theme';
import {
  Walls, Slings, Bumpers, Posts, Kickers, Flippers, Balls, Plunger, Decks, RideWires,
} from '../../engine/scene/parts';
import { Surroundings } from '../deadStarDisco/scene';
import { SLING_LEFT, SLING_RIGHT } from '../deadStarDisco/table';
import { deadStarDisco } from '../deadStarDisco';
import { table } from './table';
import { rules } from './rules';

const SLINGS = [{ group: 'L', pts: SLING_LEFT }, { group: 'R', pts: SLING_RIGHT }];

function Playfield() {
  return (
    <>
      {/* flat test bed with a faint grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[47, 82]} />
        <meshStandardMaterial color="#0d1224" roughness={0.6} metalness={0.2} />
      </mesh>
      <gridHelper args={[80, 40, '#1e3a5f', '#16213a']} position={[0, 0.03, 1]} />
      <Walls />
      <Slings tris={SLINGS} />
      <Bumpers />
      <Posts />
      <Kickers />
      <Decks />
      <RideWires />
      <Flippers />
      <Balls />
      <Plunger />
    </>
  );
}

function Title() {
  return (
    <>
      <h1 className="font-display text-5xl sm:text-6xl font-black leading-none tracking-tight text-pa-300">LAYER LAB</h1>
      <div className="mt-1 text-sm font-bold tracking-[0.3em] text-slate-400">ENGINE TEST TABLE · ON / UNDER A DECK</div>
    </>
  );
}

export const layerLab: ThemeDef = {
  id: 'layerLab',
  hidden: true,
  copy: {
    name: 'Layer Lab',
    tagline: 'Test table: a deck over the bumpers. Ride on it, roll under it.',
    dmdTitle: 'LAYER LAB',
    attractHint: 'SHOOT THE RIGHT-SIDE LIFT TO REACH THE NEST',
    attractFooter: 'Lift → nest • drop holes & waterfall → field • the beacon shows a ball rolling under the nest',
    obstacleSets: ['Extra Bumpers', 'Top Posts', 'the Wrecker', 'Frickies'],
  },
  table,
  rules,
  palette: deadStarDisco.palette,
  Playfield,
  Surroundings,
  Title,
  help: (
    <>
      <p><b className="text-pa-300">Lift:</b> a left-flipper shot into the right-side wire lifts the ball onto the NEST (the translucent deck).</p>
      <p><b className="text-pb-300">Nest:</b> the ball rolls on the deck until it drops through a hole or off the front waterfall. Balls below it keep playing the bumpers — a pulsing beacon on the deck marks a ball underneath.</p>
    </>
  ),
};
