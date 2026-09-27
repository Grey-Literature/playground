// Pure-data view of every theme's table (no React/three) for the headless
// physics harness in scripts/*.check.ts. Keep in sync with themes/index.ts.

import type { TableDef } from '../engine/types';
import type { DiffOverrides } from '../engine/difficulty';
import * as deadStarDisco from './deadStarDisco/table';
import * as layerLab from './layerLab/table';

/** `fixture`: an engine test table — soaked and checked, but not part of the feel envelope. */
export interface TableEntry { id: string; table: TableDef; diffOverrides?: DiffOverrides; fixture?: boolean }

export const TABLES: TableEntry[] = [
  { id: 'deadStarDisco', table: deadStarDisco.table, diffOverrides: deadStarDisco.diffOverrides },
  { id: 'layerLab', table: layerLab.table, diffOverrides: deadStarDisco.diffOverrides, fixture: true },
];
