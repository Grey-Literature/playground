// The agent API (engine/agent.ts) and the Agent Board, headless: drives the
// real store + simulation through window.flipperSeance's calls and checks the
// contract agents rely on — declare-first, lockstep timing, input-only calls,
// forgiving taps — and the honesty rules for filing scores.

import { useGame } from '../src/engine/store';
import { registerTheme, type ThemeDef } from '../src/engine/theme';
import { gameRef } from '../src/engine/runtime';
import { TABLE } from '../src/engine/table';
import { STEP } from '../src/engine/constants';
import { createAgentApi, isLockstepHeld, isLockstepFrozen, agentKey, stateText, setAgentClockForTests, HOLD_GRACE_MS } from '../src/engine/agent';
import { installWebMcp, resetWebMcpForTests, type WebMcpTool } from '../src/engine/webmcp';
import { agentBoard, scores, sanitizeAgentBoard } from '../src/engine/scores';
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
// the hold budget runs on the wall clock — drive it by hand so the checks are deterministic
let wall = 0;
setAgentClockForTests(() => wall);
/** Advance `ms` of game time in as many capped steps as it takes. */
const advance = (ms: number) => { const end = gameRef.time + ms / 1000 - 1e-9; while (gameRef.time < end && isLockstepHeld()) api.step(Math.min(1000, (end - gameRef.time) * 1000 + 1)); };

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
const s1 = api.step(200);
expect('step(200) advances exactly 200 ms of game time', s1.ok && Math.abs(gameRef.time - t0 - 0.2) < STEP / 2, `${(gameRef.time - t0).toFixed(4)} s`);
const big = gameRef.time;
api.step(60000);
expect('step() is capped at the tier\'s step cap (medium: 250 ms)', Math.abs(gameRef.time - big - 0.25) < STEP / 2, `${((gameRef.time - big) * 1000).toFixed(0)} ms`);

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
advance(4000);
expect('… still tilted after 4 s of game time', g().tilted);
advance(1200);
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

// ---------------- 2c.1: one-call turns, the keyboard route, WebMCP ----------------
console.log('[agent API] turn() and start({ mode })');
useGame.setState({ unranked: false });
const st2 = api.start({ mode: 'lockstep' });
expect('start({ mode: lockstep }) sets the mode in the same call', st2.ok && isLockstepHeld() && g().run.mode === 'lockstep');
let tt = gameRef.time;
const t1 = api.turn({ plunge: 0.45, stepMs: 200 });
expect('turn({ plunge, stepMs }) plunges and steps in one call', t1.ok && gameRef.lastLaunchPower === 0.45 && Math.abs(gameRef.time - tt - 0.2) < STEP / 2);
tt = gameRef.time;
const t2 = api.turn({ flip: 'both', flipMs: 150, stepMs: 100 });
expect('turn({ flip: both }) → both flippers up mid-stroke', t2.ok && gameRef.left.pressed && gameRef.right.pressed);
expect('turn() returns state + events together', t2.ok && Array.isArray(t2.events) && typeof t2.state.score === 'number');
const t3 = api.turn({ plunge: 0.5 });
expect('turn() reports a refused action as a note, not a failure', t3.ok && t3.notes.length === 1);

console.log('[agent keys] the no-script route');
tt = gameRef.time;
expect('"." steps 100 ms', agentKey('Period', false) && Math.abs(gameRef.time - tt - 0.1) < STEP / 2);
tt = gameRef.time;
expect('">" (Shift + .) steps 500 ms — capped to 250 on medium', agentKey('Period', true) && Math.abs(gameRef.time - tt - 0.25) < STEP / 2);
api.step(300);
tt = gameRef.time;
// a 100 ms tap inside a 100 ms step: the bat has swung and is on its way back down
const swung = (side: 'left' | 'right') => Math.abs(gameRef[side].angle - TABLE.flippers[side].rest) > 0.2;
expect('"J" taps left + steps', agentKey('KeyJ', false) && swung('left') && Math.abs(gameRef.time - tt - 0.1) < STEP / 2, `angle Δ ${(gameRef.left.angle - TABLE.flippers.left.rest).toFixed(2)}`);
api.step(300);
expect('"L" taps right + steps', agentKey('KeyL', false) && swung('right'), `angle Δ ${(gameRef.right.angle - TABLE.flippers.right.rest).toFixed(2)}`);
expect('"Z" is left to the normal keyboard (not an agent key)', agentKey('KeyZ', false) === false);
// get a ball back into the lane for the digit plunge
useGame.setState({ ballPhase: 'plunger' });
for (const b of gameRef.balls) b.active = false;
const lane = { ...TABLE.plunger };
gameRef.balls.push({ id: 999, x: lane.x, y: lane.restY, vx: 0, vy: 0, px: lane.x, py: lane.restY, active: true, inLane: true, captured: 0, captureCooldown: 0, inside: new Set(), spin: 0 });
expect('digit "7" plunges at 0.7', agentKey('Digit7', false) && gameRef.lastLaunchPower === 0.7);
const snapA = stateText(), snapB = stateText();
expect('state text is stable between steps', snapA === snapB);
expect('state text has the ball, flipper and plunger lines', /ball#\d+ x=/.test(snapA) && /flipper L angle=/.test(snapA) && /plungerReady=/.test(snapA), snapA.split('\n')[0]);
const who = g().agent;
useGame.setState({ agent: null });
expect('keys do nothing for an undeclared page (human play unchanged)', agentKey('Period', false) === false && agentKey('Digit5', false) === false);
useGame.setState({ agent: who });

console.log('[WebMCP] page tools');
const got: WebMcpTool[] = [];
expect('no navigator.modelContext → nothing registered', installWebMcp({}) === 'none');
expect('registerTool style', installWebMcp({ modelContext: { registerTool: (t: WebMcpTool) => void got.push(t) } }) === 'registerTool');
expect('six tools: help, declare, start, turn, state, table', got.map((t) => t.name).join(',') === 'pinball_help,pinball_declare,pinball_start,pinball_turn,pinball_state,pinball_table');
const tool = (n: string) => got.find((t) => t.name === n)!;
const parse = async (n: string, args: Record<string, unknown> = {}) => JSON.parse((await tool(n).execute(args)).content[0].text);
const stJson = await parse('pinball_state');
expect('pinball_state returns the JSON state', stJson.ok === true && typeof stJson.score === 'number' && Array.isArray(stJson.balls));
tt = gameRef.time;
const turnJson = await parse('pinball_turn', { flip: 'left', stepMs: 100 });
expect('pinball_turn acts + steps and returns state', turnJson.ok === true && Math.abs(gameRef.time - tt - 0.1) < STEP / 2 && typeof turnJson.state.t === 'number');
const bad2 = await tool('pinball_start').execute({ theme: 'nope' });
expect('a refused call comes back as isError with the reason', bad2.isError === true && /already in play|unknown table/.test(bad2.content[0].text));
expect('read-only tools are annotated', tool('pinball_state').annotations?.readOnlyHint === true && !tool('pinball_turn').annotations?.readOnlyHint);
resetWebMcpForTests();
let provided: WebMcpTool[] = [];
expect('provideContext style', installWebMcp({ modelContext: { provideContext: (c: { tools: WebMcpTool[] }) => { provided = c.tools; } } }) === 'provideContext' && provided.length === 6);

// ---------------- lockstep limits per tier ----------------
console.log('[lockstep limits] step cap + hold budget per tier');
const endNow = async () => { if (g().phase === 'playing') await endGame(1); };
await endNow();
for (const [tier, cap, hold] of [['easy', 1000, 0], ['medium', 250, 1500], ['hard', 100, 700], ['impossible', 50, 350]] as const) {
  api.start({ tier, mode: 'lockstep' });
  const t0 = gameRef.time;
  api.step(5000);
  const got = Math.round((gameRef.time - t0) * 1000);
  const lim = api.getState();
  const limits = lim.ok ? lim.limits : null;
  expect(`${tier}: step cap ${cap} ms (advanced ${got} ms)`, Math.abs(got - cap) <= 5 && limits?.stepCapMs === cap);
  // calibrate with instant calls: latency floor 0, so only the tier's hold is left
  for (let i = 0; i < 6; i++) api.step(10);
  if (!hold) {
    wall += 60000;
    expect(`${tier}: no hold budget — the game waits forever`, isLockstepFrozen() && limits?.holdMs === null);
  } else {
    wall += hold - 10;
    const mid = api.getState();
    expect(`${tier}: frozen inside the budget (${hold} + ${HOLD_GRACE_MS} grace)`, isLockstepFrozen() && mid.ok && mid.limits.holdRemainingMs === HOLD_GRACE_MS + 10);
    wall += HOLD_GRACE_MS + 20;
    const late = api.getState();
    expect(`${tier}: past the budget → overdue, the game runs in real time`, !isLockstepFrozen() && late.ok && late.limits.overdue && late.limits.holdRemainingMs === 0);
    wall += 5000; api.getState();
    expect(`${tier}: reading state does not reset the clock`, !isLockstepFrozen());
    api.step(10);
    expect(`${tier}: the next step() freezes it again`, isLockstepFrozen());
    wall += hold + HOLD_GRACE_MS + 1;
    api.flip('left', 80);
    expect(`${tier}: an input also resets the clock`, isLockstepFrozen());
  }
  await endGame(1);
}

// ---------------- latency allowance ----------------
console.log('[latency] measured harness latency added to the hold');
const lim = () => { const r = api.getState(); if (!r.ok) throw new Error(r.error); return r.limits; };
const paced = (gapMs: number, n: number) => { for (let i = 0; i < n; i++) { wall += gapMs; api.step(10); } };
api.start({ tier: 'medium', mode: 'lockstep' });
expect('calibrating: the full tier allowance (medium 10 s) until 5 gaps are in', lim().calibrating && lim().latencyAllowanceMs === 10000 && lim().effectiveHoldMs === 1500 + HOLD_GRACE_MS + 10000);
paced(5000, 6);
expect('acts 5 s apart → floor 5000, allowance 5000', lim().latencyFloorMs === 5000 && lim().latencyAllowanceMs === 5000 && !lim().calibrating, JSON.stringify(lim()));
wall += 1500 + HOLD_GRACE_MS + 5000 - 50;
expect('… frozen until hold + grace + 5000', isLockstepFrozen());
wall += 100;
expect('… then overdue', !isLockstepFrozen());
api.step(10);
paced(1000, 20); // a fast rhythm fills the window
paced(20000, 1);  // one long think
expect('one long think barely moves the floor (20th percentile)', lim().latencyFloorMs === 1000, `${lim().latencyFloorMs}`);
paced(70000, 1);
expect('a gap over 60 s is ignored (walked away)', lim().latencyFloorMs === 1000);
await endGame(1);
api.start({ tier: 'medium', mode: 'lockstep' });
paced(40, 1); paced(1200, 5);
expect('an early back-to-back call does not drag the floor down', lim().latencyFloorMs === 1200, `${lim().latencyFloorMs}`);
for (let i = 0; i < 10; i++) { paced(6000, 1); paced(20, 1); } // key pairs: think, then two keys at once
expect('a harness sending keys in pairs is judged by its round trip', lim().latencyFloorMs === 6000, `${lim().latencyFloorMs}`);
await endGame(1);
api.start({ tier: 'medium', mode: 'lockstep' });
paced(30, 10);
expect('a genuinely fast agent measures as fast', lim().latencyFloorMs === 30, `${lim().latencyFloorMs}`);
await endGame(1);
api.start({ tier: 'medium', mode: 'lockstep' });
paced(1000, 8);
await endGame(777777);
const filed = agentBoard.list('deadStarDisco', 'lockstep', 'medium').find((e) => e.score >= 777777);
expect('a lockstep entry is filed with its measured latency', filed?.latencyMs !== undefined && filed.latencyMs >= 1000 && filed.latencyMs <= 5000, JSON.stringify(filed));
for (const [tier, cap] of [['medium', 10000], ['hard', 4000], ['impossible', 1500]] as const) {
  api.start({ tier, mode: 'lockstep' });
  paced(30000, 6);
  expect(`${tier}: a 30 s harness gets the capped allowance (${cap} ms)`, lim().latencyFloorMs === 30000 && lim().latencyAllowanceMs === cap);
  await endGame(1);
}
const clean = sanitizeAgentBoard([
  { name: 'A', model: '', score: 5, day: '', latencyMs: 1234.6 },
  { name: 'B', model: '', score: 4, day: '', latencyMs: -3 },
  { name: 'C', model: '', score: 3, day: '', latencyMs: 'soon' },
]);
expect('sanitize keeps a real latency (rounded) and drops junk', clean[0].latencyMs === 1235 && clean[1].latencyMs === undefined && clean[2].latencyMs === undefined && clean.length === 3);

process.exit(bad ? 1 : 0);
