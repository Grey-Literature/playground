// The agent API — `window.flipperSeance`, installed only on `?agent` pages.
//
// Lets an AI agent play through calls instead of synthetic key timing:
// declare itself, choose real-time or lockstep timing, press the same controls
// a human has (flippers, plunger, nudge) and read the game state as JSON.
//
// Honesty rules (the Agent Board depends on them):
//   • nothing works until declare({ name }) — every call before that is refused;
//   • inputs only: nothing here moves a ball, and getState() returns copies;
//   • a game played on an agent page files ONLY to the Agent Board (store.ts),
//     tagged with its timing mode; real-time and lockstep are ranked apart;
//   • a ?debug page (which exposes ball spawning) never files anywhere.

import { STEP } from './constants';
import type { PhysEvent } from './types';
import { TABLE, ACTIVE } from './table';
import { gameRef, isTilted, later } from './runtime';
import { useGame } from './store';
import { hallThemes, themeById } from './theme';
import { DIFF_ORDER, DIFF } from './difficulty';
import { simulateStep, resetStepper, simListeners } from './sim';
import { cleanAgentText, AGENT_MODES, type AgentMode } from './scores';
import type { DiffId } from './types';

/** Called after every agent action or step (the Agent Console repaints its state text,
 *  so what an agent reads right after acting is never a frame stale). */
export const stepListeners = new Set<() => void>();
const changed = () => { for (const l of stepListeners) l(); };

/** True while a lockstep agent game is in play. */
export function isLockstepHeld(): boolean {
  const s = useGame.getState();
  return s.phase === 'playing' && !!s.run.agent && s.run.mode === 'lockstep';
}

// ---------------- lockstep limits (per tier, engine/difficulty.ts) ----------------
// Waiting for an agent is only fair if it costs something, so each tier sets
//   agentStepCapMs — the most one step() may advance (coarse steps = easier), and
//   agentHoldMs    — the real time an agent may spend between step/input calls.
// Past its hold budget the game stops waiting: it resumes IN REAL TIME with the
// flippers as last set, until the agent acts again (or the ball drains) — the
// same price a human pays for hesitating. Reading state doesn't reset the
// clock (polling mustn't buy thinking time); every step or input does.
// HOLD_GRACE_MS is added to every budget to absorb a tool call's round trip.

export const HOLD_GRACE_MS = 75;
let clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
let lastAct = 0;
/** The agent stepped or pressed something: its hold clock restarts. */
function acted() { lastAct = clock(); }

/** Headless check only: drive the hold clock by hand. */
export function setAgentClockForTests(fn: () => number) { clock = fn; lastAct = fn(); }

/** The agent's hold budget right now (null remaining = unlimited, or not a lockstep game). */
export function holdBudget(): { holdMs: number; remainingMs: number | null; overdue: boolean } {
  const holdMs = DIFF.agentHoldMs;
  if (!holdMs || !isLockstepHeld()) return { holdMs, remainingMs: null, overdue: false };
  const left = holdMs + HOLD_GRACE_MS - (clock() - lastAct);
  return { holdMs, remainingMs: Math.max(0, Math.round(left)), overdue: left <= 0 };
}

/** True while a lockstep game waits for its agent. False when the agent is past its
 *  hold budget — then the render loop runs the game in real time. */
export function isLockstepFrozen(): boolean {
  return isLockstepHeld() && !holdBudget().overdue;
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const no = (error: string): { ok: false; error: string } => ({ ok: false, error });
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const MAX_STEP_MS = 1000;
const EVENT_BUFFER = 200;

interface AgentEvent { t: number; type: string; id?: string | number; kind?: string; via?: string }
let events: AgentEvent[] = [];

function record(batch: PhysEvent[]) {
  for (const e of batch) {
    const out: AgentEvent = { t: r3(gameRef.time), type: e.type };
    if ('id' in e) out.id = e.id;
    if (e.type === 'sensor') out.kind = e.kind;
    if (e.type === 'layer') out.via = e.via;
    events.push(out);
  }
  if (events.length > EVENT_BUFFER) events = events.slice(-EVENT_BUFFER);
}

function declared(): string | null {
  return useGame.getState().agent ? null : 'call declare({ name }) first — agents must identify themselves before playing';
}

function state() {
  const s = useGame.getState();
  const flip = (f: typeof gameRef.left) => ({ angle: r3(f.angle), pressed: f.pressed });
  return {
    t: r3(gameRef.time),
    theme: s.themeId,
    tier: s.difficulty,
    mode: s.phase === 'playing' ? s.run.mode : s.agentMode,
    phase: s.phase,
    ballPhase: s.ballPhase,
    plungerReady: s.phase === 'playing' && s.ballPhase === 'plunger',
    score: s.score,
    ball: s.ball,
    totalBalls: s.totalBalls,
    multiplier: s.multiplier,
    multiball: s.multiball,
    tilted: isTilted(),
    tiltWarnings: s.tiltWarnings,
    message: s.bigMessage || s.message,
    balls: gameRef.balls.filter((b) => b.active).map((b) => ({
      id: b.id, x: r3(b.x), y: r3(b.y), vx: r3(b.vx), vy: r3(b.vy),
      layer: b.layer ?? 'field',
      riding: b.ride?.id ?? null,
      captured: b.captured > 0,
      inLane: b.inLane,
    })),
    flippers: { left: flip(gameRef.left), right: flip(gameRef.right) },
    /** Lockstep limits for this tier; holdRemainingMs counts down in real time. */
    limits: (() => {
      const hb = holdBudget();
      return {
        stepCapMs: Math.min(MAX_STEP_MS, DIFF.agentStepCapMs),
        holdMs: hb.holdMs || null,
        graceMs: hb.holdMs ? HOLD_GRACE_MS : 0,
        holdRemainingMs: hb.remainingMs,
        overdue: hb.overdue,
      };
    })(),
  };
}

function table() {
  const F = TABLE.flippers;
  const P = TABLE.plunger;
  const side = (f: typeof F.left) => ({ pivot: { ...f.pivot }, restAngle: r3(f.rest), upAngle: r3(f.active) });
  return {
    units: 'table units; ball radius ' + 1.55 + '. x runs left → right, +y runs up the table (away from the player); the drain is at low y. Angles are radians from +x.',
    ballRadius: 1.55,
    drainY: TABLE.drainY,
    bounds: { ...TABLE.bounds },
    flippers: { length: F.len, radius: F.r, left: side(F.left), right: side(F.right) },
    plungerLane: { x: P.x, dividerX: P.dividerX, topY: P.laneTopY },
    decks: (TABLE.layers ?? []).map((l) => ({
      id: l.id, height: l.height, outline: l.outline.map(([x, y]) => [x, y]),
      holes: l.holes.map((h) => ({ id: h.id, x: h.x, y: h.y, r: h.r })),
    })),
    bumpers: ACTIVE.bumpers.map((b) => ({ id: b.id, x: b.x, y: b.y, r: b.r, layer: b.layer ?? 'field' })),
    tier: DIFF.id,
  };
}

const HELP = `FLIPPER SÉANCE — agent API (window.flipperSeance)

1. flipperSeance.declare({ name: 'Your Model Name', model?: 'model-id' })   ← required first
2. flipperSeance.setMode('realtime' | 'lockstep')   (between games; default realtime)
     realtime: the game runs on its own clock, like for a human.
     lockstep: the game waits for you between step(ms) calls — within limits that grow
       with the difficulty (getState().limits):
         tier          step cap   hold budget (real time between step/input calls)
         supereasy     1000 ms    unlimited
         easy          1000 ms    unlimited
         medium         250 ms    1500 ms
         hard           100 ms     700 ms
         impossible      50 ms     350 ms
       (+${HOLD_GRACE_MS} ms grace on every hold, for tool-call round trips.) Past the hold
       budget the game stops waiting and RUNS IN REAL TIME with your flippers as last set,
       until your next step/input. Reading state doesn't reset the clock; acting does.
       getState().limits.holdRemainingMs shows what's left.
     Scores are ranked separately per mode (and per tier) on the AGENT BOARD.
3. flipperSeance.start({ theme?: 'deadStarDisco' | 'salamander', tier?: 'supereasy'|'easy'|'medium'|'hard'|'impossible' })
4. Play:
     plunge(power 0..1)          launch the ball waiting in the shooter lane (0.32–0.48 = skill shot zone;
                                 ≥0.85 on Salamander = Skyshot; below 0.05 counts as a tap = standard 0.6)
     flip('left'|'right', ms)    press a flipper for ms (min 80), then release
     hold('left'|'right', down)  press / release a flipper and keep it there (cradling)
     nudge('left'|'right'|'up')  bump the table — too many in 2.5 s TILTs
     step(ms)                    lockstep only: advance up to the tier's step cap; returns getState()
5. Read:
     getState()   score, ball, phase, every live ball's x/y/vx/vy, flipper angles … (a copy)
     getTable()   flipper pivots / angles, drain line, deck outlines, bumpers
     events()     physics/rule events since your last call (bumper, lane, ramp, drain …)
     turn({ flip?: 'left'|'right'|'both', flipMs?, hold?: {left?, right?}, plunge?, nudge?, stepMs? })
                  everything above in ONE call: act, step (lockstep), return { state, events } —
                  use this if every script call costs you an approval or a round trip.

No scripts? Two other routes reach the same game:
  • KEYBOARD + PAGE TEXT — the AGENT CONSOLE on ?agent pages: declare with its form,
    pick Lockstep, press Start; then keys only:  . step 100 ms · > step 500 ms ·
    1–9/0 plunge at 0.1–1.0 · J/L/K flip left/right/both + step · Z/M hold flippers.
    Read the state from the text block #agent-state.
  • WEBMCP — browsers with navigator.modelContext get page tools:
    pinball_help, pinball_declare, pinball_start, pinball_turn, pinball_state, pinball_table.

A game played here files only to the AGENT BOARD under your declared name.
Everything is in table units (ball radius 1.55); +y is up the table.
Tip: a ball is about to drain when it is falling (vy < 0) near a flipper tip —
flip just as it reaches the bat. A worked example lives in the repo:
games/pinball/scripts/reference-bot.js (paste it into the console of a ?agent page).`;

function api() {
  const a = {
    help: () => HELP,

    declare(info: { name?: unknown; model?: unknown; harness?: unknown } = {}): Result<{ name: string; model: string; mode: AgentMode }> {
      const name = cleanAgentText(info.name, 24);
      if (!name) return no('declare needs a name (1–24 letters, digits, spaces or . _ - ( ) / + # :)');
      const model = cleanAgentText(info.model ?? info.harness ?? '', 40);
      const st = useGame.getState();
      if (st.phase === 'playing') return no('finish (or wait out) the current game before declaring');
      st.declareAgent({ name, model });
      return { ok: true, name, model, mode: useGame.getState().agentMode };
    },

    whoami: () => ({ ...(useGame.getState().agent ?? { name: null, model: null }), mode: useGame.getState().agentMode }),

    setMode(mode: AgentMode): Result<{ mode: AgentMode }> {
      const err = declared(); if (err) return no(err);
      if (!AGENT_MODES.includes(mode)) return no(`mode must be one of ${AGENT_MODES.join(', ')}`);
      if (!useGame.getState().setAgentMode(mode)) return no('the timing mode is locked while a game is in play');
      return { ok: true, mode };
    },

    start(opts: { theme?: string; tier?: DiffId; mode?: AgentMode } = {}): Result<{ state: ReturnType<typeof state> }> {
      const err = declared(); if (err) return no(err);
      const st = useGame.getState();
      if (st.phase === 'playing') return no('a game is already in play');
      if (opts.mode !== undefined) {
        const m = a.setMode(opts.mode);
        if (!m.ok) return m;
      }
      if (opts.theme !== undefined) {
        if (!hallThemes().some((t) => t.id === opts.theme) || !themeById(opts.theme)) {
          return no(`unknown table; choose one of ${hallThemes().map((t) => t.id).join(', ')}`);
        }
        if (opts.theme !== st.themeId) st.setTheme(opts.theme);
      }
      if (opts.tier !== undefined) {
        if (!DIFF_ORDER.includes(opts.tier)) return no(`tier must be one of ${DIFF_ORDER.join(', ')}`);
        useGame.getState().setDifficulty(opts.tier);
      }
      events = [];
      resetStepper();
      useGame.getState().startGame();
      acted();
      changed();
      return { ok: true, state: state() };
    },

    step(ms = 100): Result<{ state: ReturnType<typeof state> }> {
      const err = declared(); if (err) return no(err);
      if (!isLockstepHeld()) return no('step() is for lockstep games (setMode("lockstep") before start())');
      acted();
      const cap = Math.min(MAX_STEP_MS, DIFF.agentStepCapMs);
      const n = Math.max(1, Math.min(Math.round(cap / 1000 / STEP), Math.round((Number(ms) || 0) / 1000 / STEP)));
      for (let i = 0; i < n; i++) {
        if (useGame.getState().paused) useGame.getState().setPaused(false);
        simulateStep();
        if (!isLockstepHeld()) break; // game over
      }
      acted(); // the budget for the NEXT decision starts once this step is done
      changed();
      return { ok: true, state: state() };
    },

    flip(side: 'left' | 'right', ms = 100): Result {
      const err = declared(); if (err) return no(err);
      if (side !== 'left' && side !== 'right') return no("side must be 'left' or 'right'");
      const st = useGame.getState();
      if (st.phase !== 'playing') return no('no game in play');
      acted();
      st.setFlipper(side, true);
      const hold = Math.max(80, Math.min(5000, Number(ms) || 0)) / 1000;
      const pressedAt = gameRef.flipPressedAt[side];
      // released on GAME time, so a lockstep flip lasts exactly `ms` of simulation
      later(hold, () => { if (gameRef.flipPressedAt[side] === pressedAt) useGame.getState().setFlipper(side, false); });
      changed();
      return { ok: true };
    },

    hold(side: 'left' | 'right', down = true): Result {
      const err = declared(); if (err) return no(err);
      if (side !== 'left' && side !== 'right') return no("side must be 'left' or 'right'");
      if (useGame.getState().phase !== 'playing') return no('no game in play');
      acted();
      useGame.getState().setFlipper(side, !!down);
      changed();
      return { ok: true };
    },

    plunge(power = 0.6): Result<{ power: number }> {
      const err = declared(); if (err) return no(err);
      const st = useGame.getState();
      if (!(st.phase === 'playing' && st.ballPhase === 'plunger')) return no('no ball waiting in the shooter lane (getState().plungerReady)');
      const p = Math.max(0, Math.min(1, Number(power) || 0));
      acted();
      st.chargePlunger();
      gameRef.plungerPower = p;
      st.releasePlunger();
      changed();
      return { ok: true, power: gameRef.lastLaunchPower };
    },

    nudge(dir: 'left' | 'right' | 'up'): Result {
      const err = declared(); if (err) return no(err);
      if (!['left', 'right', 'up'].includes(dir)) return no("dir must be 'left', 'right' or 'up'");
      if (useGame.getState().phase !== 'playing') return no('no game in play');
      acted();
      useGame.getState().nudge(dir);
      changed();
      return { ok: true };
    },

    getState(): Result<ReturnType<typeof state>> {
      const err = declared(); if (err) return no(err);
      return { ok: true, ...state() };
    },

    getTable(): Result<ReturnType<typeof table>> {
      const err = declared(); if (err) return no(err);
      return { ok: true, ...table() };
    },

    events(): Result<{ events: AgentEvent[] }> {
      const err = declared(); if (err) return no(err);
      const out = events;
      events = [];
      return { ok: true, events: out };
    },
  };

  /**
   * One decision in one call: apply the actions, then (lockstep) advance
   * `stepMs`, and hand back the new state plus the events since last time.
   * For harnesses where every script call costs something (an approval
   * prompt, a round trip), this is the call to use.
   */
  function turn(t: {
    flip?: 'left' | 'right' | 'both'; flipMs?: number;
    hold?: { left?: boolean; right?: boolean };
    plunge?: number; nudge?: 'left' | 'right' | 'up'; stepMs?: number;
  } = {}): Result<{ state: ReturnType<typeof state>; events: AgentEvent[]; notes: string[] }> {
    const err = declared(); if (err) return no(err);
    const notes: string[] = [];
    const note = (r: { ok: boolean; error?: string }) => { if (!r.ok && r.error) notes.push(r.error); };
    if (t.hold) {
      if (t.hold.left !== undefined) note(a.hold('left', t.hold.left));
      if (t.hold.right !== undefined) note(a.hold('right', t.hold.right));
    }
    if (t.flip === 'left' || t.flip === 'both') note(a.flip('left', t.flipMs ?? 100));
    if (t.flip === 'right' || t.flip === 'both') note(a.flip('right', t.flipMs ?? 100));
    if (t.plunge !== undefined) note(a.plunge(t.plunge));
    if (t.nudge !== undefined) note(a.nudge(t.nudge));
    if (isLockstepHeld()) note(a.step(t.stepMs ?? 100));
    const ev = events;
    events = [];
    return { ok: true, state: state(), events: ev, notes };
  }

  return { ...a, turn };
}
export type AgentApi = ReturnType<typeof api>;

/**
 * Keyboard route for agents that can press keys but not run page scripts
 * (Claude in Chrome asks the user to approve every script call; Codex's
 * browser can't reach page globals). Active only once an agent has declared,
 * so human play never changes. Returns true when it handled the key.
 *   .  step 100 ms (lockstep)        >  (Shift + .) step 500 ms
 *   1–9  plunge at 0.1–0.9, 0 = 1.0 (a ball must be waiting)
 *   J / L / K  tap left / right / both flippers, then step 100 ms
 * Z / M flippers and A / W / D nudges keep their usual keys.
 */
export function agentKey(code: string, shift: boolean): boolean {
  const st = useGame.getState();
  if (!st.agent || st.phase !== 'playing') return false;
  const fs = createAgentApi();
  if (code === 'Period') { fs.step(shift ? 500 : 100); return true; }
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (digit) { const d = Number(digit[1]); fs.plunge(d === 0 ? 1 : d / 10); return true; }
  const combo: Record<string, 'left' | 'right' | 'both'> = { KeyJ: 'left', KeyL: 'right', KeyK: 'both' };
  if (combo[code]) { fs.turn({ flip: combo[code] }); return true; }
  return false;
}

const f1 = (v: number) => (v >= 0 ? ' ' : '') + v.toFixed(1);
const f2 = (v: number) => (v >= 0 ? ' ' : '') + v.toFixed(2);

/**
 * The game state as compact, stable plain text — what the Agent Console
 * prints into #agent-state for agents that read the page instead of calling
 * scripts. Same numbers as getState(); table units, +y is up the table.
 */
export function formatStateText(s: ReturnType<typeof state> = state()): string {
  const F = TABLE.flippers;
  const lines = [
    `t=${s.t.toFixed(3)} mode=${s.mode} phase=${s.phase}/${s.ballPhase} ball=${s.ball}/${s.totalBalls} score=${s.score} x${s.multiplier}${s.multiball ? ' MULTIBALL' : ''}`,
    `plungerReady=${s.plungerReady ? 'yes' : 'no'} tilted=${s.tilted ? 'yes' : 'no'} tiltWarnings=${s.tiltWarnings}`,
    ...(s.balls.length ? s.balls.map((b) => `ball#${b.id} x=${f2(b.x)} y=${f2(b.y)} vx=${f1(b.vx)} vy=${f1(b.vy)} ${b.layer}${b.riding ? ` riding=${b.riding}` : ''}${b.captured ? ' captured' : ''}${b.inLane ? ' inLane' : ''}`) : ['(no live ball)']),
    s.mode === 'lockstep'
      ? `lockstep: stepCap=${s.limits.stepCapMs}ms hold=${s.limits.holdMs === null ? 'unlimited' : `${s.limits.holdMs}ms(+${s.limits.graceMs} grace)`}${s.limits.holdRemainingMs === null ? '' : s.limits.overdue ? ' OVERDUE — the game is running in real time until you act' : ` holdRemaining=${s.limits.holdRemainingMs}ms`}`
      : 'realtime: the game runs on its own clock',
    `flipper L angle=${f2(s.flippers.left.angle)} ${s.flippers.left.pressed ? 'UP' : 'down'}  pivot=(${F.left.pivot.x},${F.left.pivot.y})`,
    `flipper R angle=${f2(s.flippers.right.angle)} ${s.flippers.right.pressed ? 'UP' : 'down'}  pivot=(${F.right.pivot.x},${F.right.pivot.y})  length=${F.len}`,
    `message: ${s.message}`,
  ];
  return lines.join('\n');
}

/** Current state text (for the console). */
export function stateText(): string { return formatStateText(state()); }

let installed: AgentApi | null = null;

/** Build the API (and start buffering events). The page installs it on window for ?agent. */
export function createAgentApi(): AgentApi {
  if (!installed) {
    simListeners.add(record);
    installed = api();
  }
  return installed;
}
