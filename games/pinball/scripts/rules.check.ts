// Engine ↔ theme rules contract, headless: drive the real zustand store with
// synthetic physics events and check scoring, modes and the ball lifecycle.
// Needs no DOM — audio stays silent because sound.ensure() is never called.

import { useGame } from '../src/engine/store';
import { registerTheme, type ThemeDef } from '../src/engine/theme';
import { gameRef, runDue } from '../src/engine/runtime';
import type { PhysEvent } from '../src/engine/types';
import { table, diffOverrides } from '../src/themes/deadStarDisco/table';
import { rules, useDisco } from '../src/themes/deadStarDisco/rules';
import { table as salTable, diffOverrides as salOverrides } from '../src/themes/salamander/table';
import { rules as salRules, useSalamander, BELL_RELIGHT } from '../src/themes/salamander/rules';

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

registerTheme({
  id: 'salamander', table: salTable, diffOverrides: salOverrides, rules: salRules,
  copy: { name: 'Salamander', tagline: '', dmdTitle: '', attractHint: '', attractFooter: '', obstacleSets: [] },
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

// game over → the Spirit Board (per theme × tier, flipper-seance:<theme>:board:<tier>)
g().setDifficulty('hard');
expect('tier is locked during live play', g().difficulty === 'medium');
useGame.setState({ totalBalls: g().ball }); // this is the last ball
for (const b of gameRef.balls) b.active = false;
g().onDrain();
for (let i = 0; i < 80 && g().phase !== 'gameover'; i++) await sleep(100);
const final = g().score;
expect('last ball → game over with the initials prompt open', g().phase === 'gameover' && g().initialsEntry?.rank === 1, `score ${final}`);
g().startGame();
expect('Enter-to-start is blocked while initials are open', g().phase === 'gameover');
g().submitInitials('ab!');
const saved = JSON.parse(mem.get('flipper-seance:deadStarDisco:board:medium') ?? '[]');
expect("initials 'ab!' filed as 'AB ' at rank 1", saved[0]?.initials === 'AB ' && saved[0]?.score === final && g().lastEntryRank === 1);
expect('highScore = top of the board', g().highScore === final && g().initialsEntry === null);
expect('last initials remembered', mem.get('flipper-seance:initials') === 'AB');
g().setDifficulty('hard');
expect('hard tier shows its own (empty) board', g().highScore === 0 && g().board.length === 0);
g().setDifficulty('medium');
expect('back to medium restores its board', g().highScore === final && g().board[0]?.initials === 'AB ');
expect('tier choice persisted per theme', mem.get('flipper-seance:deadStarDisco:diff') === 'medium');

// tilt kills scoring
g().startGame();
for (let i = 0; i < 4; i++) g().nudge('up');
const s2 = g().score;
fire({ type: 'bumper', id: '0' });
expect('tilt → flippers dead, no score', g().tilted && g().score === s2);

// ---------------- Salamander ----------------
console.log('\n[salamander] rules contract (medium):');
g().toAttract();
g().setTheme('salamander');
g().setDifficulty('medium');
g().startGame();
const sal = () => useSalamander.getState();
const sfire = (e: Record<string, unknown>) => salRules.onEvent({ ...at, ...e } as PhysEvent);
expect('salamander is the active table', g().phase === 'playing' && !g().tilted);

let t0 = g().score;
sfire({ type: 'bumper', id: 'bell0' });
expect('first bell → 400, lit', g().score - t0 === 400 && sal().bells[0], `+${g().score - t0}`);
gameRef.time += 0.5; sfire({ type: 'bumper', id: 'bell1' });
gameRef.time += 0.5; t0 = g().score; sfire({ type: 'bumper', id: 'bell2' });
expect('third bell (combo x3) → 1,200 + INFERNO 5,000', g().score - t0 === 1200 + 5000, `+${g().score - t0}`);
expect('INFERNO → bells relighting, heat 1, Maw not yet lit', sal().relighting && sal().heat === 1 && !sal().mawLit && sal().infernos === 1);
sfire({ type: 'bumper', id: 'bell0' });
expect('bells stay dark while relighting (no double INFERNO)', sal().infernos === 1 && sal().relighting);
gameRef.time += BELL_RELIGHT + 0.05; runDue(); // relights run on game time, not the wall clock
expect(`bells relight after ${BELL_RELIGHT}s`, !sal().relighting && !sal().bells.some(Boolean));
gameRef.time += 5;
for (const id of ['bell0', 'bell1', 'bell2']) sfire({ type: 'bumper', id });
expect('second INFERNO → THE MAW is lit', sal().mawLit && sal().heat === 2 && sal().infernos === 2);

const realRandom = Math.random;
t0 = g().score;
sfire({ type: 'capture', id: 'maw' });
expect('lit Maw → INFERNO MULTIBALL, Maw spent', g().multiball && !sal().mawLit && sal().heat === 0 && gameRef.balls.some((b) => b.autoLaunch !== undefined));
expect('lit Maw never spits (normal kick keeps the multiball in play)', gameRef.ejectRide.maw === undefined);
useGame.setState({ multiball: false });

Math.random = () => 0.2;
sfire({ type: 'capture', id: 'maw' });
expect('unlit Maw, roll < 45% → spit redirect requested', gameRef.ejectRide.maw === 'mawSpit');
delete gameRef.ejectRide.maw;
Math.random = () => 0.9;
sfire({ type: 'capture', id: 'maw' });
expect('unlit Maw, roll ≥ 45% → normal kick', gameRef.ejectRide.maw === undefined);
Math.random = () => 0.05;
sfire({ type: 'capture', id: 'holdL' }); sfire({ type: 'capture', id: 'holdR' });
expect('saucer, roll < 15% → VOLCANO redirect on the matching side', gameRef.ejectRide.holdL === 'volcanoL' && gameRef.ejectRide.holdR === 'volcanoR');
gameRef.ejectRide = {};
Math.random = () => 0.5;
sfire({ type: 'capture', id: 'holdL' });
expect('saucer, roll ≥ 15% → normal kick', gameRef.ejectRide.holdL === undefined);
Math.random = realRandom;

t0 = g().score;
sfire({ type: 'layer', id: 'rampL', from: 'field', to: 'nest', via: 'ride' });
expect('ride onto the nest → NEST LANDING 500', g().score - t0 === 500 && sal().landings === 1, `+${g().score - t0}`);
t0 = g().score;
sfire({ type: 'layer', id: 'dropR', from: 'nest', to: 'field', via: 'hole' });
expect('drop hole → 750, counted', g().score - t0 === 750 && sal().drops === 1, `+${g().score - t0}`);
t0 = g().score;
sfire({ type: 'layer', id: 'nest', from: 'nest', to: 'field', via: 'edge' });
expect('waterfall → 400', g().score - t0 === 400, `+${g().score - t0}`);
t0 = g().score;
sfire({ type: 'rideEnter', id: 'serpent', speed: 50 }); sfire({ type: 'rideExit', id: 'serpent' });
expect('serpent 1,500 + release 500', g().score - t0 === 2000, `+${g().score - t0}`);
t0 = g().score;
sfire({ type: 'rideEnter', id: 'skyshot', speed: 200 });
expect('skyshot 2,500', g().score - t0 === 2500, `+${g().score - t0}`);

// per-ball reset keeps the heat, clears lanes/bells
sfire({ type: 'sensor', kind: 'lane', id: 'lane0' });
for (const id of ['bell0']) sfire({ type: 'bumper', id });
useSalamander.setState({ heat: 1 });
salRules.resetBall();
expect('resetBall clears lanes + bells, keeps heat', !sal().lanes.some(Boolean) && !sal().bells.some(Boolean) && sal().heat === 1);

process.exit(bad ? 1 : 0);
