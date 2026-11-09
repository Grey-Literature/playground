// The Last Escalation — TICKET #666. The hall's third table (Phase 4), pulled
// from MISFIRE ARCADE's IT Shop of Horrors: its Act IV entities are the toys,
// and completing them walks Ticket #666 through four acts to a finale.

import type { ThemeDef } from '../../engine/theme';
import { table, diffOverrides } from './table';
import { rules } from './rules';
import { Playfield, Surroundings } from './scene';
import { StatusPanels, Title, help } from './hud';

export const lastEscalation: ThemeDef = {
  id: 'lastEscalation',
  copy: {
    name: 'The Last Escalation',
    tagline: 'Every problem has a solution. Not every solution should be implemented.',
    dmdTitle: 'TICKET #666',
    attractHint: 'HOLD SPACE • SKILL SHOT A D·N·S LANE',
    attractFooter: 'Escalate the Printer, the Min Pin, the Undead Server, the Ticket Queue • restore corrupted tickets • survive the Silence • shoot the Core',
    obstacleSets: ['the Firewall', 'the Change Advisory Board', 'the Rollback', 'Auto-Remediation'],
  },
  table,
  diffOverrides,
  rules,
  palette: {
    a: { 50: '#ecfff4', 100: '#d1ffe4', 200: '#a6ffca', 300: '#6dffaa', 400: '#39ff8e', 500: '#12e872', 600: '#06bf5b', 700: '#08954a', 800: '#0c753e', 900: '#0c6036', 950: '#00361b' },
    b: { 50: '#fff1f1', 100: '#ffe0e0', 200: '#ffc6c6', 300: '#ff9e9e', 400: '#ff6767', 500: '#ff3b3b', 600: '#ed1515', 700: '#c80d0d', 800: '#a50f0f', 900: '#881414', 950: '#4b0404' },
    bg: '#030406',
    fontDisplay: "'VT323', 'Share Tech Mono', ui-monospace, monospace",
    fontBody: "'Share Tech Mono', ui-monospace, monospace",
    dmd: { on: '#39ff8e', dim: '#0f3d22', hot: '#d1ffe4', bg: '#020604' },
  },
  Playfield,
  Surroundings,
  Title,
  StatusPanels,
  help,
};
