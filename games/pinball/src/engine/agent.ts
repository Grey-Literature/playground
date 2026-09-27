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

/** True while a lockstep agent game is in play: the render loop must not advance it. */
export function isLockstepHeld(): boolean {
  const s = useGame.getState();
  return s.phase === 'playing' && !!s.run.agent && s.run.mode === 'lockstep';
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
     lockstep: the game only advances when you call step(ms) — think as long as you like.
     Scores are ranked separately per mode on the AGENT BOARD.
3. flipperSeance.start({ theme?: 'deadStarDisco' | 'salamander', tier?: 'supereasy'|'easy'|'medium'|'hard'|'impossible' })
4. Play:
     plunge(power 0..1)          launch the ball waiting in the shooter lane (0.32–0.48 = skill shot zone;
                                 ≥0.85 on Salamander = Skyshot; below 0.05 counts as a tap = standard 0.6)
     flip('left'|'right', ms)    press a flipper for ms (min 80), then release
     hold('left'|'right', down)  press / release a flipper and keep it there (cradling)
     nudge('left'|'right'|'up')  bump the table — too many in 2.5 s TILTs
     step(ms)                    lockstep only: advance up to ${MAX_STEP_MS} ms; returns getState()
5. Read:
     getState()   score, ball, phase, every live ball's x/y/vx/vy, flipper angles … (a copy)
     getTable()   flipper pivots / angles, drain line, deck outlines, bumpers
     events()     physics/rule events since your last call (bumper, lane, ramp, drain …)

A game played here files only to the AGENT BOARD under your declared name.
Everything is in table units (ball radius 1.55); +y is up the table.
Tip: a ball is about to drain when it is falling (vy < 0) near a flipper tip —
flip just as it reaches the bat. A worked example lives in the repo:
games/pinball/scripts/reference-bot.js (paste it into the console of a ?agent page).`;

function api() {
  return {
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

    start(opts: { theme?: string; tier?: DiffId } = {}): Result<{ state: ReturnType<typeof state> }> {
      const err = declared(); if (err) return no(err);
      const st = useGame.getState();
      if (st.phase === 'playing') return no('a game is already in play');
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
      return { ok: true, state: state() };
    },

    step(ms = 100): Result<{ state: ReturnType<typeof state> }> {
      const err = declared(); if (err) return no(err);
      if (!isLockstepHeld()) return no('step() is for lockstep games (setMode("lockstep") before start())');
      const n = Math.max(1, Math.min(Math.round(MAX_STEP_MS / 1000 / STEP), Math.round((Number(ms) || 0) / 1000 / STEP)));
      for (let i = 0; i < n; i++) {
        if (useGame.getState().paused) useGame.getState().setPaused(false);
        simulateStep();
        if (!isLockstepHeld()) break; // game over
      }
      return { ok: true, state: state() };
    },

    flip(side: 'left' | 'right', ms = 100): Result {
      const err = declared(); if (err) return no(err);
      if (side !== 'left' && side !== 'right') return no("side must be 'left' or 'right'");
      const st = useGame.getState();
      if (st.phase !== 'playing') return no('no game in play');
      st.setFlipper(side, true);
      const hold = Math.max(80, Math.min(5000, Number(ms) || 0)) / 1000;
      const pressedAt = gameRef.flipPressedAt[side];
      // released on GAME time, so a lockstep flip lasts exactly `ms` of simulation
      later(hold, () => { if (gameRef.flipPressedAt[side] === pressedAt) useGame.getState().setFlipper(side, false); });
      return { ok: true };
    },

    hold(side: 'left' | 'right', down = true): Result {
      const err = declared(); if (err) return no(err);
      if (side !== 'left' && side !== 'right') return no("side must be 'left' or 'right'");
      if (useGame.getState().phase !== 'playing') return no('no game in play');
      useGame.getState().setFlipper(side, !!down);
      return { ok: true };
    },

    plunge(power = 0.6): Result<{ power: number }> {
      const err = declared(); if (err) return no(err);
      const st = useGame.getState();
      if (!(st.phase === 'playing' && st.ballPhase === 'plunger')) return no('no ball waiting in the shooter lane (getState().plungerReady)');
      const p = Math.max(0, Math.min(1, Number(power) || 0));
      st.chargePlunger();
      gameRef.plungerPower = p;
      st.releasePlunger();
      return { ok: true, power: gameRef.lastLaunchPower };
    },

    nudge(dir: 'left' | 'right' | 'up'): Result {
      const err = declared(); if (err) return no(err);
      if (!['left', 'right', 'up'].includes(dir)) return no("dir must be 'left', 'right' or 'up'");
      if (useGame.getState().phase !== 'playing') return no('no game in play');
      useGame.getState().nudge(dir);
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
}

export type AgentApi = ReturnType<typeof api>;

let installed: AgentApi | null = null;

/** Build the API (and start buffering events). The page installs it on window for ?agent. */
export function createAgentApi(): AgentApi {
  if (!installed) {
    simListeners.add(record);
    installed = api();
  }
  return installed;
}
