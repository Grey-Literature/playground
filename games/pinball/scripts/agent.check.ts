// The agent API (engine/agent.ts) and the Agent Board, headless: drives the
// real store + simulation through window.flipperSeance's calls and checks the
// contract agents rely on — declare-first, lockstep timing, input-only calls,
// forgiving taps — and the honesty rules for filing scores.

import { useGame } from '../src/engine/store';
import { registerTheme, type ThemeDef } from '../src/engine/theme';
import { gameRef } from '../src/engine/runtime';
import { STEP } from '../src/engine/constants';
import { createAgentApi, isLockstepHeld } from '../src/engine/agent';
import { agentBoard, scores } from '../src/engine/scores';
import { table as discoTable, diffOverrides as discoOverrides } from '../src/themes/deadStarDisco/table';
import { rules as discoRules } from '../src/themes/deadStarDisco/rules';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
};
const none = () => null;
registerTheme({
  id: 'deadStarDisco', table: discoTable, diffOverrides: discoOverrides, rules: discoRules,
  copy: { name: 'Dead Star Disco', tagline: '', dmdTitle: '', attractHint: '', attractFooter: '', obstacleSets: [] },
  palette: {} as ThemeDef['palette'], Playfield: none, Surroundings: none, Title: none, help: null,
});

let bad = 0;
const expect = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) bad++;
};
const g = () => useGame.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const api = createAgentApi();

/** End the current game from ball 1: last ball, drain, wait out the bonus count-up. */
async function endGame(score: number) {
  useGame.setState({ totalBalls: g().ball, score });
  for (const b of gameRef.balls) b.active = false;
  g().onDrain();
  for (let i = 0; i < 100 && g().phase === 'playing'; i++) await sleep(100);
}

console.log('[agent API] declare-first');
g().setTheme('deadStarDisco');
expect('getState before declare is refused', api.getState().ok === false);
expect('start before declare is refused', api.start().ok === false && g().phase !== 'playing');
expect('an empty / junk name is refused', api.declare({ name: '<<>>' }).ok === false);
const d = api.declare({ name: 'Test Agent <script>', model: 'harness-1' });
expect("declare sanitizes the name ('Test Agent script')", d.ok && 'name' in d && d.name === 'Test Agent script', JSON.stringify(d));

console.log('[agent API] lockstep game');
expect('setMode(lockstep) between games', api.setMode('lockstep').ok);
const st = api.start({ theme: 'deadStarDisco', tier: 'medium' });
expect('start() → playing, lockstep held', st.ok && g().phase === 'playing' && isLockstepHeld());
expect('mode is locked during play', api.setMode('realtime').ok === false);
const t0 = gameRef.time;
const s1 = api.step(500);
expect('step(500) advances exactly 500 ms of game time', s1.ok && Math.abs(gameRef.time - t0 - 0.5) < STEP / 2, `${(gameRef.time - t0).toFixed(4)} s`);
const big = gameRef.time;
api.step(60000);
expect('step() is capped at 1000 ms per call', Math.abs(gameRef.time - big - 1) < STEP / 2);

const p = api.plunge(0);
expect('a zero-power plunge is a tap → standard auto-plunge (0.6)', p.ok && 'power' in p && p.power === 0.6 && g().ballPhase === 'active');
expect('plunge with no ball waiting is refused', api.plunge(1).ok === false);

api.flip('left', 100);
expect('flip() presses the flipper', gameRef.left.pressed);
api.step(50);
expect('… still up after 50 ms', gameRef.left.pressed);
api.step(60);
expect('… released after its 100 ms (game time)', !gameRef.left.pressed);

g().setFlipper('right', true);
g().setFlipper('right', false); // an instant key tap
expect('an instant tap keeps the flipper up (minimum pulse)', gameRef.right.pressed);
api.step(100);
expect('… and releases after the 80 ms pulse', !gameRef.right.pressed);
g().setFlipper('right', true);
api.step(200);
g().setFlipper('right', false);
expect('a held flipper releases immediately', !gameRef.right.pressed);

const snap = api.getState();
if (snap.ok && snap.balls.length) snap.balls[0].x = 999;
const again = api.getState();
expect('getState() returns a copy (editing it moves nothing)', again.ok && again.balls.every((b) => b.x !== 999) && gameRef.balls.every((b) => b.x !== 999));

for (let i = 0; i < 6 && !g().tilted; i++) api.nudge('up');
expect('nudging too hard tilts', g().tilted);
api.step(1000); api.step(1000); api.step(1000); api.step(1000);
expect('… still tilted after 4 s of game time', g().tilted);
api.step(1000); api.step(200);
expect('… recovered after 5 s of GAME time (lockstep-fair timer)', !g().tilted);

console.log('[agent API] filing');
await endGame(12345);
const ls = agentBoard.list('deadStarDisco', 'lockstep', 'medium');
expect('agent game → Agent Board (lockstep), under its name', g().phase === 'gameover' && ls[0]?.name === 'Test Agent script' && ls[0]?.model === 'harness-1' && ls[0]?.score >= 12345, JSON.stringify(ls[0]));
expect('… ranked #1, no initials prompt', g().lastAgentRank?.rank === 1 && g().lastAgentRank?.mode === 'lockstep' && g().initialsEntry === null);
expect('… and the human Spirit Board is untouched', scores.list('deadStarDisco', 'medium').length === 0);
expect('real-time board is separate (still empty)', agentBoard.list('deadStarDisco', 'realtime', 'medium').length === 0);

expect('setMode(realtime) again between games', api.setMode('realtime').ok);
api.start();
expect('realtime game: not held by lockstep', !isLockstepHeld());
expect('step() is refused in real-time games', api.step(100).ok === false);
await endGame(500);
expect('real-time agent game → real-time Agent Board', agentBoard.list('deadStarDisco', 'realtime', 'medium')[0]?.score >= 500);

useGame.setState({ unranked: true }); // what a ?debug page sets
api.start();
await endGame(99999);
expect('a ?debug game files nowhere', agentBoard.list('deadStarDisco', 'realtime', 'medium').every((e) => e.score < 99999)
  && scores.list('deadStarDisco', 'medium').length === 0 && g().initialsEntry === null);

process.exit(bad ? 1 : 0);
