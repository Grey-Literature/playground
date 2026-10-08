// Salamander — THE FIRE TRIAL. The hall's second table, recreated natively on
// the engine from the fire-salamander prototype: a raised Ember Nest, Fire
// Bells, THE MAW, the Serpent Tunnel, and the playground's own mascot.

import type { ThemeDef } from '../../engine/theme';
import { table, diffOverrides } from './table';
import { rules } from './rules';
import { Playfield, Surroundings } from './scene';
import { StatusPanels, Title, help } from './hud';

export const salamander: ThemeDef = {
  id: 'salamander',
  copy: {
    name: 'Salamander',
    tagline: 'Chase the heat, rule the nest. Ring the Fire Bells, feed THE MAW.',
    dmdTitle: 'SALAMANDER',
    attractHint: 'HOLD SPACE • FULL HEAT = SKYSHOT TO THE NEST',
    attractFooter: 'Ramps & Skyshot → EMBER NEST • 3 Fire Bells = INFERNO • 2 INFERNOs light THE MAW → MULTIBALL • Serpent Tunnel ▲',
    obstacleSets: ['the Ember Spire', 'the Ash Pendulum', 'two Cinder Moons', 'Inferno Vents'],
  },
  table,
  diffOverrides,
  rules,
  palette: {
    a: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#ffb36b', 400: '#ff8b2a', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
    b: { 50: '#effff3', 100: '#d8ffe3', 200: '#b3ffc9', 300: '#78ffa0', 400: '#39ff6a', 500: '#10e64a', 600: '#06b83a', 700: '#0a8f32', 800: '#0e702c', 900: '#0e5c27', 950: '#013413' },
    bg: '#100e0c',
    fontDisplay: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    fontBody: "'DM Sans', system-ui, sans-serif",
    dmd: { on: '#ff8b2a', dim: '#6b3410', hot: '#ffcf3f', bg: '#0c0705' },
  },
  Playfield,
  Surroundings,
  Title,
  StatusPanels,
  help,
};
