// Engine ↔ theme rules contract, headless: drive the real zustand store with
// synthetic physics events and check scoring, modes and the ball lifecycle.
// Needs no DOM — audio stays silent because sound.ensure() is never called.

import { useGame } from '../src/engine/store';
import { registerTheme, type ThemeDef } from '../src/engine/theme';
import { gameRef } from '../src/engine/runtime';
import type { PhysEvent } from '../src/engine/types';
import { table, diffOverrides } from '../src/themes/deadStarDisco/table';
import { rules, useDisco } from '../src/themes/deadStarDisco/rules';

// in-memory localStorage so per-theme × per-tier bests are really exercised
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
};

// the scene/HUD parts of a ThemeDef are irrelevant headless
const none = () => null;
registerTheme({
  id: 'deadStarDisco', table, diffOverrides, rules,
  copy: { name: 'Dead Star Disco', tagline: '', dmdTitle: '', attractHint: '', attractFooter: '', obstacleSets: [] },
  palette: {} as ThemeDef['palette'], Playfield: none, Surroundings: none, Title: none, help: null,
});

let bad = 0;
const expect = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) bad++;
};
const g = () => useGame.getState();
const at = { x: 0, y: 0 };
const fire = (e: Record<string, unknown>) => rules.onEvent({ ...at, ...e } as PhysEvent);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log('[deadStarDisco] rules contract (medium):');
g().setTheme('deadStarDisco');
g().setDifficulty('medium');
g().startGame();
expect('startGame → playing, ball 1 in the plunger', g().phase === 'playing' && g().ballPhase === 'plunger' && gameRef.balls.length === 1);

gameRef.lastLaunchPower = 0.9; gameRef.skillWindow = 0;
for (const i of [0, 1, 2]) fire({ type: 'sensor', kind: 'lane', id: `lane${i}` });
expect('three top lanes → multiplier 2X', g().multiplier === 2, `x${g().multiplier}`);

const s0 = g().score;
gameRef.skillWindow = 5; gameRef.lastLaunchPower = 0.4;
fire({ type: 'sensor', kind: 'lane', id: 'lane1' });
expect('skill-zone launch + lane → 15K skill shot (x2)', g().score - s0 === 30000, `+${g().score - s0}`);

for (const id of ['L0', 'L1', 'L2', 'R0', 'R1', 'R2']) fire({ type: 'target', id });
expect('both banks → multiball + auto-launch ball queued', g().multiball && gameRef.balls.some((b) => b.autoLaunch !== undefined));

for (const id of ['d0', 'd1', 'd2']) fire({ type: 'drop', id });
expect('three doors → kickback + super ramp lit', useDisco.getState().kickbackLit && useDisco.getState().rampLit);

fire({ type: 'target', id: 'C0' }); fire({ type: 'target', id: 'C1' });
expect('centre targets → jackpot lit', useDisco.getState().jackpotLit);
const s1 = g().score;
fire({ type: 'capture', id: 'scoop' });
expect('scoop with jackpot lit → 25K x multiplier x multiball', g().score - s1 === 25000 * 2 * 2, `+${g().score - s1}`);

// ball lifecycle: drain every ball → bonus count-up → ball 2 with fresh theme state
for (const b of gameRef.balls) b.active = false;
g().onDrain();
expect('last ball drained → bonus phase', g().ballPhase === 'bonus' && g().bonusCounting);
for (let i = 0; i < 80 && g().ball === 1; i++) await sleep(100);
expect('bonus finishes → ball 2, multiplier + table state reset', g().ball === 2 && g().multiplier === 1 && !useDisco.getState().rampLit, `ball ${g().ball}`);

// bests are per theme × tier, persisted under flipper-seance:<theme>:best:<tier>
const best = g().highScore;
g().setDifficulty('hard');
expect('tier is locked during live play', g().difficulty === 'medium');
useGame.setState({ phase: 'gameover' });
const stored = Number(mem.get('flipper-seance:deadStarDisco:best:medium'));
expect('medium best persisted per theme × tier', best > 0 && stored === best, `${stored}`);
g().setDifficulty('hard');
expect('hard tier shows its own (empty) best', g().highScore === 0);
g().setDifficulty('medium');
expect('back to medium restores its best', g().highScore === best);
expect('tier choice persisted per theme', mem.get('flipper-seance:deadStarDisco:diff') === 'medium');

// tilt kills scoring
g().startGame();
for (let i = 0; i < 4; i++) g().nudge('up');
const s2 = g().score;
fire({ type: 'bumper', id: '0' });
expect('tilt → flippers dead, no score', g().tilted && g().score === s2);

process.exit(bad ? 1 : 0);
