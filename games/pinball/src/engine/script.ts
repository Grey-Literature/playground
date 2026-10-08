// Script mode — the legitimate home for bots (Agent Arcade 2c.2).
//
// An agent submits a strategy ONCE: a function `(state, table) => action`. The
// game calls it every frame, off the main thread, and ranks the result on its
// own SCRIPT board. It measures whose bot logic is best, not whose harness is
// fast (Real-time and Lockstep measure a model deciding call by call, and flag
// loops that pretend otherwise — engine/agent.ts pace check).
//
// Fair and safe by construction:
//   • the strategy runs in a Web Worker (workerRunner): no DOM, no page
//     globals, no localStorage — it can't touch the boards or the game, only
//     answer with an action;
//   • the main thread never waits for it: one request in flight at a time, and
//     a slow strategy just decides less often. No answer within
//     SCRIPT_REPLY_TIMEOUT_MS → the worker is terminated (even `while(true){}`
//     can't freeze the page), the flippers drop and the game plays out;
//   • every action lands agentReactionMs of GAME time after the state it
//     answered (difficulty.ts: 50…250 ms from Super Easy to Impossible);
//   • every game is SCRIPT_GAME_S of game time (or ends when the balls run out),
//     so a bot that never drains can't run up a marathon score;
//   • human and API inputs are locked out while it plays.

import { gameRef, later } from './runtime';
import { useGame, scriptRunActive } from './store';
import { DIFF } from './difficulty';

export interface StrategyAction { left?: boolean; right?: boolean; plunge?: number; nudge?: 'left' | 'right' | 'up' }
export interface Decision { action?: unknown; error?: string; ms: number }
export type LoadResult = { ok: true } | { ok: false; error: string };

/** Something that can run a strategy: a Web Worker in the browser, in-process for the headless checks. */
export interface StrategyRunner {
  load(src: string, table: unknown): Promise<LoadResult>;
  decide(state: unknown): Promise<Decision>;
  terminate(): void;
}

export const MAX_STRATEGY_BYTES = 16_384;
/** Game time per Script game (s). */
export const SCRIPT_GAME_S = 180;
/** Wall time a strategy may take to load or answer before it's stopped (ms). */
export const SCRIPT_REPLY_TIMEOUT_MS = 1000;
/** Consecutive exceptions before the strategy is stopped. */
export const SCRIPT_MAX_ERRORS = 50;
/** A ball left in the shooter lane this long (game s) is plunged at SCRIPT_AUTOPLUNGE_POWER. */
export const SCRIPT_AUTOPLUNGE_S = 5;
export const SCRIPT_AUTOPLUNGE_POWER = 0.6;

const NOT_A_FUNCTION = 'the strategy must be a function expression: (state, table) => ({ left, right, plunge, nudge })';

// The worker's whole program. It compiles the source as an expression, keeps the
// function (so a strategy may keep its own memory between calls) and answers
// each state with { action } or { error }, timing itself.
const WORKER_BOOT = `
let decide = null, table = null;
const msg = (err) => String((err && err.message) || err);
onmessage = (e) => {
  const m = e.data;
  if (m.type === 'load') {
    try {
      const f = (0, eval)('(' + m.src + '\\n)');
      if (typeof f !== 'function') throw new Error(${JSON.stringify(NOT_A_FUNCTION)});
      decide = f; table = m.table;
      postMessage({ type: 'loaded' });
    } catch (err) { postMessage({ type: 'loaded', error: msg(err) }); }
    return;
  }
  if (m.type === 'decide') {
    const t0 = performance.now();
    try {
      const action = decide(m.state, table);
      postMessage({ type: 'decision', id: m.id, action: action === undefined ? null : action, ms: performance.now() - t0 });
    } catch (err) {
      postMessage({ type: 'decision', id: m.id, error: msg(err), ms: performance.now() - t0 });
    }
  }
};`;

/** The browser runner: a Blob-URL Web Worker. */
export function workerRunner(): StrategyRunner {
  const url = URL.createObjectURL(new Blob([WORKER_BOOT], { type: 'text/javascript' }));
  const w = new Worker(url);
  let onLoaded: ((r: LoadResult) => void) | null = null;
  const pending = new Map<number, (d: Decision) => void>();
  let nextId = 1;
  const failAll = (error: string) => {
    onLoaded?.({ ok: false, error }); onLoaded = null;
    for (const [, res] of pending) res({ error, ms: 0 });
    pending.clear();
  };
  w.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id?: number; action?: unknown; error?: string; ms?: number };
    if (m.type === 'loaded') { onLoaded?.(m.error ? { ok: false, error: m.error } : { ok: true }); onLoaded = null; return; }
    if (m.type === 'decision' && m.id !== undefined) {
      const res = pending.get(m.id);
      pending.delete(m.id);
      res?.({ action: m.action, error: m.error, ms: Number(m.ms) || 0 });
    }
  };
  w.onerror = (e: ErrorEvent) => { e.preventDefault(); failAll(e.message || 'the strategy worker crashed'); };
  return {
    load(src, table) {
      return new Promise((res) => { onLoaded = res; w.postMessage({ type: 'load', src, table }); });
    },
    decide(state) {
      return new Promise((res) => {
        const id = nextId++;
        pending.set(id, res);
        w.postMessage({ type: 'decide', id, state });
      });
    },
    terminate() { w.terminate(); URL.revokeObjectURL(url); failAll('stopped'); },
  };
}

/** In-process runner for the headless checks (node has no Web Worker). Never used on the page. */
export function inlineRunner(): StrategyRunner {
  let f: ((s: unknown, t: unknown) => unknown) | null = null;
  let table: unknown = null;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return {
    async load(src, t) {
      try {
        const g = (0, eval)(`(${src}\n)`);
        if (typeof g !== 'function') return { ok: false, error: NOT_A_FUNCTION };
        f = g; table = t;
        return { ok: true };
      } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
    },
    async decide(state) {
      const t0 = now();
      try {
        // same contract as the worker: the answer must survive structured cloning
        const action = structuredClone(f!(state, table));
        return { action: action === undefined ? null : action, ms: now() - t0 };
      } catch (err) { return { error: String((err as Error)?.message ?? err), ms: now() - t0 }; }
    },
    terminate() { f = null; },
  };
}

// ---------------- host (engine/agent.ts supplies the state views) ----------------

interface ScriptHost { snapshot: () => unknown; table: () => unknown; clock: () => number }
let host: ScriptHost = { snapshot: () => ({}), table: () => ({}), clock: () => Date.now() };
export function bindScriptHost(h: ScriptHost) { host = h; }

let makeRunner: () => StrategyRunner = workerRunner;
/** Headless checks only: swap the runner (e.g. inlineRunner, or one that never answers). */
export function setRunnerFactoryForTests(f: () => StrategyRunner) { makeRunner = f; }

// ---------------- the strategy for the next game ----------------

let source: string | null = null;

/** Compile-check a strategy and keep it for the next Script games. Between games only. */
export async function setStrategy(raw: unknown): Promise<LoadResult & { bytes?: number }> {
  if (scriptRunActive()) return { ok: false, error: 'a Script game is in play; load a new strategy between games' };
  const src = typeof raw === 'function' ? raw.toString() : raw;
  if (typeof src !== 'string' || !src.trim()) return { ok: false, error: NOT_A_FUNCTION };
  if (src.length > MAX_STRATEGY_BYTES) return { ok: false, error: `the strategy is ${src.length} characters; the limit is ${MAX_STRATEGY_BYTES}` };
  const r = makeRunner();
  const res = await withTimeout(r.load(src, host.table()), 'the strategy took more than 1 s to load');
  r.terminate();
  if (!res.ok) return res;
  source = src;
  return { ok: true, bytes: src.length };
}

export const hasStrategy = () => source !== null;
/** Headless checks only. */
export function clearStrategyForTests() { source = null; }

function withTimeout(p: Promise<LoadResult>, error: string): Promise<LoadResult> {
  return new Promise((res) => {
    const id = setTimeout(() => res({ ok: false, error }), SCRIPT_REPLY_TIMEOUT_MS);
    p.then((v) => { clearTimeout(id); res(v); });
  });
}

// ---------------- the running game ----------------

let runner: StrategyRunner | null = null;
/** Bumped on every start/stop, so answers from an old worker or game are dropped. */
let generation = 0;
let ready = false;
let loadingSince: number | null = null;
let inFlightSince: number | null = null;
let startT = 0;
let laneSince: number | null = null;
const fresh = () => ({ calls: 0, totalMs: 0, maxMs: 0, errors: 0, streak: 0, lastError: null as string | null, stopped: null as string | null });
let stats = fresh();

/** A Script game just started (store.startGame already ran): spin up a fresh worker. */
export function startScriptRun() {
  stopRunner();
  generation++;
  stats = fresh();
  startT = gameRef.time;
  laneSince = null;
  inFlightSince = null;
  ready = false;
  if (!source) { stats.stopped = 'no strategy loaded'; return; }
  const gen = generation;
  runner = makeRunner();
  loadingSince = host.clock();
  runner.load(source, host.table()).then((r) => {
    if (gen !== generation) return;
    loadingSince = null;
    if (r.ok) ready = true;
    else stop(`the strategy failed to load: ${r.error}`);
  });
}

function stopRunner() {
  runner?.terminate();
  runner = null;
  ready = false;
  loadingSince = null;
  inFlightSince = null;
}

/** Stop the strategy for the rest of this game: flippers drop, the game plays out. */
function stop(reason: string) {
  generation++;
  stopRunner();
  stats.stopped = reason;
  const st = useGame.getState();
  if (st.phase === 'playing') {
    st.setFlipper('left', false);
    st.setFlipper('right', false);
    st.setMessage('STRATEGY STOPPED — THE BALL PLAYS OUT');
  }
}

/** Game time left in the current Script game (s). */
export function scriptTimeLeft(): number {
  return scriptRunActive() ? Math.max(0, SCRIPT_GAME_S - (gameRef.time - startT)) : SCRIPT_GAME_S;
}

/** The render loop's per-frame hook (before simulate): clock, auto-plunge, watchdog, next decision. */
export function scriptFrame() {
  if (!scriptRunActive()) {
    if (runner) { generation++; stopRunner(); } // the game ended: let the worker go
    return;
  }
  const st = useGame.getState();
  if (gameRef.time - startT >= SCRIPT_GAME_S) { st.timeUp(); return; }

  // a strategy that never plunges still plays
  if (st.ballPhase === 'plunger') {
    laneSince ??= gameRef.time;
    if (gameRef.time - laneSince >= SCRIPT_AUTOPLUNGE_S) { plunge(SCRIPT_AUTOPLUNGE_POWER); laneSince = null; }
  } else laneSince = null;

  if (stats.stopped) return;
  const now = host.clock();
  if (loadingSince !== null) {
    if (now - loadingSince > SCRIPT_REPLY_TIMEOUT_MS) stop(`the strategy didn't load within ${SCRIPT_REPLY_TIMEOUT_MS / 1000} s`);
    return;
  }
  if (!ready || !runner) return;
  if (inFlightSince !== null) {
    if (now - inFlightSince > SCRIPT_REPLY_TIMEOUT_MS) stop(`the strategy didn't answer within ${SCRIPT_REPLY_TIMEOUT_MS / 1000} s`);
    return;
  }
  const t = gameRef.time;
  const gen = generation;
  const asked = inFlightSince = now;
  runner.decide(host.snapshot()).then((d) => onDecision(d, t, gen));
  // a backstop that doesn't need render frames: a hidden tab stops drawing, and a
  // stuck worker would otherwise keep a CPU core busy until the tab came back
  setTimeout(() => {
    if (gen === generation && inFlightSince === asked) stop(`the strategy didn't answer within ${SCRIPT_REPLY_TIMEOUT_MS / 1000} s`);
  }, SCRIPT_REPLY_TIMEOUT_MS + 100);
}

function onDecision(d: Decision, t: number, gen: number) {
  if (gen !== generation) return;
  inFlightSince = null;
  stats.calls++;
  stats.totalMs += d.ms;
  stats.maxMs = Math.max(stats.maxMs, d.ms);
  if (d.error !== undefined) {
    stats.errors++;
    stats.streak++;
    stats.lastError = d.error;
    if (stats.streak >= SCRIPT_MAX_ERRORS) stop(`the strategy threw ${SCRIPT_MAX_ERRORS} times in a row (${d.error})`);
    return;
  }
  stats.streak = 0;
  const action = cleanAction(d.action);
  if (!action) return;
  // the action lands agentReactionMs of game time after the state it answered
  const due = t + DIFF.agentReactionMs / 1000 - gameRef.time;
  const apply = () => { if (gen === generation && scriptRunActive()) applyAction(action); };
  if (due <= 1e-9) apply(); else later(due, apply);
}

/** Keep only the fields the contract allows, with sane values. */
export function cleanAction(raw: unknown): StrategyAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const out: StrategyAction = {};
  if (typeof a.left === 'boolean') out.left = a.left;
  if (typeof a.right === 'boolean') out.right = a.right;
  if (typeof a.plunge === 'number' && Number.isFinite(a.plunge)) out.plunge = Math.max(0, Math.min(1, a.plunge));
  if (a.nudge === 'left' || a.nudge === 'right' || a.nudge === 'up') out.nudge = a.nudge;
  return Object.keys(out).length ? out : null;
}

function plunge(power: number) {
  const st = useGame.getState();
  if (!(st.phase === 'playing' && st.ballPhase === 'plunger')) return;
  st.chargePlunger();
  gameRef.plungerPower = power;
  st.releasePlunger();
}

function applyAction(a: StrategyAction) {
  const st = useGame.getState();
  // held booleans: only a change presses / releases (the 80 ms minimum stroke still applies)
  if (a.left !== undefined && a.left !== gameRef.left.pressed) st.setFlipper('left', a.left);
  if (a.right !== undefined && a.right !== gameRef.right.pressed) st.setFlipper('right', a.right);
  if (a.plunge !== undefined) plunge(a.plunge);
  if (a.nudge) st.nudge(a.nudge);
}

/** What getState().script reports. */
export function scriptStatus() {
  const s = stats;
  return {
    loaded: source !== null,
    running: scriptRunActive() && ready && !s.stopped,
    calls: s.calls,
    avgMs: s.calls ? Math.round((s.totalMs / s.calls) * 100) / 100 : null,
    maxMs: Math.round(s.maxMs * 100) / 100,
    errors: s.errors,
    lastError: s.lastError,
    stopped: s.stopped,
    reactionMs: DIFF.agentReactionMs,
    gameS: SCRIPT_GAME_S,
    timeLeftS: Math.round(scriptTimeLeft() * 10) / 10,
  };
}
