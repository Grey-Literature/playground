// Plunger sweep per theme × tier: apex height reached, or LANE if the ball
// rolls a top-lane sensor (kind 'lane'). Gate: releasing in the middle of the
// skill zone must reach a top lane at every tier, or the skill shot is dead.

import { TABLES, DIFF_ORDER, DIFF, TABLE, ACTIVE, gameRef, useTable, resetField, step, reseed } from './harness';
import { spawnBallAt } from '../src/engine/runtime';

let bad = 0;
for (const entry of TABLES) {
  useTable(entry, 'medium');
  const [lo, hi] = TABLE.plunger.skillZone;
  const mid = (lo + hi) / 2;
  const powers = [0.2, lo, mid, hi, 0.65, 1.0];
  console.log(`\n[${entry.id}] plunger sweep: apex y, or LANE (skill zone ${lo}–${hi})`);
  for (const id of DIFF_ORDER) {
    useTable(entry, id);
    const P = TABLE.plunger;
    const lanes = ACTIVE.sensors.filter((s) => s.kind === 'lane');
    const row: string[] = [];
    let midOk = false;
    for (const p of powers) {
      reseed(1);
      resetField();
      const b = spawnBallAt(P.x, P.restY, 0, (P.launchBase + p * P.launchRange) * DIFF.launch, 0);
      b.inLane = true;
      let apex = -99, laneHit = false;
      for (let s = 0; s < 120 * 8; s++) {
        step();
        if (!b.active) break;
        apex = Math.max(apex, b.y);
        if (lanes.some((sn) => Math.hypot(b.x - sn.x, b.y - sn.y) < sn.r)) { laneHit = true; break; }
      }
      if (p === mid) midOk = laneHit;
      row.push(`p${p.toFixed(2)}:${laneHit ? 'LANE' : apex.toFixed(0)}`);
    }
    if (!midOk) bad++;
    console.log(`  ${DIFF.label.padEnd(11)} ${row.join('  ')}${midOk ? '' : '  <-- SKILL SHOT UNREACHABLE'}`);
  }
  gameRef.balls = [];
}
if (bad) process.exitCode = 1;
