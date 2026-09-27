// Dead Star Disco — the reference table (origin: the Neon Nova prototype).
// Synthwave grid over a collapsing star; its physics feel is the envelope every
// other Flipper Séance table is measured against.

import type { ThemeDef } from '../../engine/theme';
import { table, diffOverrides } from './table';
import { rules } from './rules';
import { Playfield, Surroundings } from './scene';
import { StatusPanels, Title, help } from './hud';

export const deadStarDisco: ThemeDef = {
  id: 'deadStarDisco',
  copy: {
    name: 'Dead Star Disco',
    tagline: 'Neon grid, collapsing sun, a wormhole that pays out weird.',
    dmdTitle: 'DEAD STAR DISCO',
    attractHint: 'HOLD SPACE • RELEASE IN GREEN FOR SKILL SHOT',
    attractFooter: 'Drop the DOORS to light kickback + 3X ramp • WORMHOLE for mystery awards • Chain shots for combos • L+R banks = MULTIBALL',
    obstacleSets: ['Extra Bumpers', 'Top Posts', 'the spinning WRECKER', 'kicking Frickies'],
  },
  table,
  diffOverrides,
  rules,
  palette: {
    a: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
    b: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
    bg: '#04050d',
    fontDisplay: "'Orbitron', 'Rajdhani', sans-serif",
    fontBody: "'Rajdhani', system-ui, sans-serif",
    dmd: { on: '#ffb000', dim: '#7a4a00', hot: '#ff7a00', bg: '#080302' },
  },
  Playfield,
  Surroundings,
  Title,
  StatusPanels,
  help,
};
