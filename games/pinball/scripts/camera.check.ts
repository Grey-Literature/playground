// Camera framing, headless: for several screen shapes and ball situations the
// auto camera must keep both flippers and every ball inside the HUD-safe box.
// Also reports how much of the table's top arch is on screen (NDC y ≤ 1 = visible).

import * as THREE from 'three';
import { TABLES, useTable, pad } from './harness';
import {
  Framer, ELEV, SAFE, MIN_ZOOM, fullTablePoints, followPoints, flipperPoints, tableExtents, toWorld, type PhysPt,
} from '../src/engine/scene/framing';

const FOV = 38;
const SCREENS: [string, number, number][] = [
  ['1530x890', 1530, 890], ['1280x720', 1280, 720], ['1920x1080', 1920, 1080], ['phone 390x844', 390, 844],
];

let bad = 0;
for (const entry of TABLES) {
  useTable(entry, 'medium');
  const e = tableExtents();
  const P = entry.table.plunger;
  const SCENES: [string, PhysPt[]][] = [
    ['plunger', [{ x: P.x, y: P.restY, h: 0 }]],
    ['ball on flipper', [{ x: -6, y: -29, h: 0 }]],
    ['ball mid-table', [{ x: 2, y: 4, h: 0 }]],
    ['ball at top arch', [{ x: 0, y: e.topY - 2, h: 0 }]],
    ['ball on wire ramp', [{ x: -6, y: 31, h: 7.8 }]],
    ['multiball top+bottom', [{ x: 0, y: e.topY - 2, h: 0 }, { x: 5, y: -29, h: 0 }]],
  ];
  // layered tables: a ball riding each deck, at the deck's height
  for (const d of entry.table.layers ?? []) {
    const cx = d.outline.reduce((a, p) => a + p[0], 0) / d.outline.length;
    const top = Math.max(...d.outline.map((p) => p[1]));
    SCENES.push([`ball on deck '${d.id}'`, [{ x: cx, y: top - 3, h: d.height }]]);
  }
  console.log(`\n[${entry.id}] auto camera — dist = % of whole-table distance; top = NDC y of the arch top (≤1.00 visible)`);
  for (const [label, w, h] of SCREENS) {
    const framer = new Framer();
    const lens = { fov: FOV, aspect: w / h };
    const full = framer.fit(fullTablePoints(), { ...lens, elev: ELEV.player });
    const cam = new THREE.PerspectiveCamera(FOV, w / h, 1, 2000);
    const ndc = (p: PhysPt) => toWorld(p).project(cam);
    const row: string[] = [];
    for (const [name, balls] of SCENES) {
      const d = framer.fit(followPoints(balls), { ...lens, elev: ELEV.player, lookX: balls[0].x * 0.3, camXOffset: balls[0].x * 0.2, minDist: full * MIN_ZOOM });
      cam.position.copy(framer.pos); cam.lookAt(framer.look); cam.updateMatrixWorld();
      const must = [...flipperPoints(), ...balls];
      const miss = must.filter((p) => { const v = ndc(p); return v.y < SAFE.bottom - 1e-3 || v.y > SAFE.top + 1e-3 || Math.abs(v.x) > SAFE.side + 1e-3; });
      const top = ndc({ x: 0, y: e.topY, h: 3 }).y;
      if (miss.length) bad++;
      row.push(`${name}: ${pad(Math.round(d / full * 100) + '%', 4)} top ${top.toFixed(2)}${miss.length ? ' <-- OFF SCREEN' : ''}`);
    }
    console.log(`  ${label}`);
    for (const r of row) console.log(`    ${r}`);
  }
}
if (bad) process.exitCode = 1;
