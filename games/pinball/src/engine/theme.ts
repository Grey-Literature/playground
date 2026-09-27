// Theme registry. The engine never imports a theme directly — themes register
// themselves (src/themes/index.ts) and the store activates one by id.

import type { ComponentType, ReactNode } from 'react';
import type { TableDef, PhysEvent } from './types';
import type { DiffOverrides } from './difficulty';

export interface ThemeRules {
  /** New game: clear all theme state. */
  reset(): void;
  /** Between balls: clear per-ball theme state (lit shots, banks...). */
  resetBall(): void;
  /** A physics event during live play. */
  onEvent(e: PhysEvent): void;
  /** A physics event during attract / game over — lights only, no score. */
  onAttractEvent?(e: PhysEvent): void;
  /** The player just released the plunger at `power` (0..1). */
  onLaunch?(power: number): void;
}

/** 50..950-style shade ramp used to repaint the HUD's two accent families. */
export type Shades = Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950', string>;

export interface ThemePalette {
  /** Primary accent family (Dead Star Disco: cyan). */
  a: Shades;
  /** Secondary accent family (Dead Star Disco: fuchsia). */
  b: Shades;
  bg: string;
  fontDisplay: string;
  fontBody: string;
  /** Dot-matrix display colours. */
  dmd: { on: string; dim: string; hot: string; bg: string };
}

export interface ThemeCopy {
  /** Display name, e.g. "Dead Star Disco". */
  name: string;
  /** One line for the hall picker card. */
  tagline: string;
  /** DMD attract title (short, ALL CAPS reads best). */
  dmdTitle: string;
  /** Pulsing hint under the attract start button. */
  attractHint: string;
  /** Small print at the bottom of the attract card. */
  attractFooter: string;
  /** Names of the gated obstacle sets, lowest tier first (for the help text). */
  obstacleSets: string[];
}

export interface ThemeDef {
  id: string;
  copy: ThemeCopy;
  table: TableDef;
  rules: ThemeRules;
  palette: ThemePalette;
  diffOverrides?: DiffOverrides;
  /** Theme set-dressing inside the tilted playfield group (art, inserts, set-pieces). */
  Playfield: ComponentType;
  /** Everything outside the playfield: cabinet, lights, environment, floor, post-fx. */
  Surroundings: ComponentType;
  /** Big attract-screen title. */
  Title: ComponentType;
  /** Side panels shown during play (large screens only). */
  StatusPanels?: ComponentType;
  /** Theme-specific paragraphs for the help modal. */
  help: ReactNode;
}

const registry = new Map<string, ThemeDef>();
const order: string[] = [];

export function registerTheme(def: ThemeDef) {
  if (!registry.has(def.id)) order.push(def.id);
  registry.set(def.id, def);
}

export function allThemes(): ThemeDef[] {
  return order.map((id) => registry.get(id)!);
}

export function themeById(id: string | null | undefined): ThemeDef | undefined {
  return id ? registry.get(id) : undefined;
}

let active: ThemeDef | null = null;

export function activeTheme(): ThemeDef {
  if (!active) throw new Error('No pinball theme activated');
  return active;
}

export function setActiveTheme(def: ThemeDef) {
  active = def;
}
