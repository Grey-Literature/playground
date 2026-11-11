// The Last Escalation — TICKET #666. The hall's third table (Phase 4), pulled
// from MISFIRE ARCADE's IT Shop of Horrors: its Act IV entities are the toys,
// and completing them walks Ticket #666 through four acts to a finale.

import type { ThemeDef } from '../../engine/theme';
import { table, diffOverrides } from './table';
import { rules } from './rules';
import { Playfield, Surroundings } from './scene';
import { StatusPanels, Title, help } from './hud';
import { voice, roll } from './sound';

export const lastEscalation: ThemeDef = {
  id: 'lastEscalation',
  copy: {
    name: 'The Last Escalation',
    tagline: 'Every problem has a solution. Not every solution should be implemented.',
    dmdTitle: 'TICKET #666',
    attractHint: 'HOLD SPACE • SKILL SHOT A D·N·S LANE',
    attractFooter: 'Escalate the Printer, the Min Pin, the Undead Server, the Ticket Queue • restore corrupted tickets • survive the Silence • shoot the Core',
    obstacleSets: ['the Rubber Duck', 'the Min Pin + the Pager', 'the Firewall + the Legacy System', 'the Rollback + a Zombie Process', 'Auto-Remediation + the Change Advisory Board + the Tech Debt'],
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
  voice,
  roll,
  // black terminal key, green phosphor text and border, a red status bar along the bottom
  ctaClass: 'border-2 border-pa-400 bg-black text-pa-300 shadow-[inset_0_-4px_0_var(--color-pb-500),0_0_22px_color-mix(in_srgb,var(--color-pa-500)_35%,transparent)] hover:border-pb-400 hover:text-pb-300 hover:shadow-[inset_0_-4px_0_var(--color-pa-400),0_0_30px_color-mix(in_srgb,var(--color-pb-500)_45%,transparent)]',
};
