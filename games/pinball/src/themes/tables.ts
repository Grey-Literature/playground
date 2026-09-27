// Pure-data view of every theme's table (no React/three) for the headless
// physics harness in scripts/*.check.ts. Keep in sync with themes/index.ts.

import type { TableDef } from '../engine/types';
import type { DiffOverrides } from '../engine/difficulty';
import * as deadStarDisco from './deadStarDisco/table';

export interface TableEntry { id: string; table: TableDef; diffOverrides?: DiffOverrides }

export const TABLES: TableEntry[] = [
  { id: 'deadStarDisco', table: deadStarDisco.table, diffOverrides: deadStarDisco.diffOverrides },
];
