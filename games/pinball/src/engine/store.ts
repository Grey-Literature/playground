// Core React-facing game store: ball lifecycle, scoring plumbing, tilt,
// multiball, bonus, plunger, pause, camera, theme + tier selection. Anything a
// specific table cares about (banks, lanes, jackpots…) lives in that theme's
// own rules/state module and talks to this store through its actions.

import { create } from 'zustand';
import { sound } from './audio';
import { DIFF, DIFFS, DIFF_ORDER, diffFor, applyDifficultyCfg, setDiffOverrides, type DiffId } from './difficulty';
import { TABLE, setTable, refreshActive } from './table';
import {
  gameRef, resetMutable, spawnBallInLane, spawnBallAt, isTilted, flash, addShake, later,
} from './runtime';
import { scores, agentBoard, cleanInitials, padInitials, today, type ScoreEntry, type AgentEntry, type AgentMode } from './scores';
import { activeTheme, setActiveTheme, themeById, hallThemes, type ThemeDef } from './theme';

// ---------- persistence (per theme × per tier) ----------
const NS = 'flipper-seance';
const ls = {
  get(k: string): string | null {
    try { return localStorage.getItem(`${NS}:${k}`); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(`${NS}:${k}`, v); } catch { /* private mode etc. */ }
  },
};
// Bests live on the Spirit Board (scores.ts): top 10 per theme × tier.
const topScore = (board: ScoreEntry[]) => board[0]?.score ?? 0;
/** Where `score` would land on `board` (1-based); equal older scores stay ahead. */
const rankFor = (board: ScoreEntry[], score: number) => {
  const i = board.findIndex((e) => score > e.score);
  return (i < 0 ? board.length : i) + 1;
};
/** Measured harness latency of the current lockstep agent run (engine/agent.ts registers it). */
let runLatency: () => number | null = () => null;
export function setRunLatencyProvider(fn: () => number | null) { runLatency = fn; }

const agentBoardsFor = (theme: string, tier: DiffId) => ({
  realtime: agentBoard.list(theme, 'realtime', tier),
  lockstep: agentBoard.list(theme, 'lockstep', tier),
});
const loadTier = (theme: string): DiffId => {
  const t = ls.get(`${theme}:diff`) as DiffId | null;
  return t && DIFFS[t] ? t : 'medium';
};

/** Swap the physics runtime to a theme + tier. Pure — safe for the headless harness too. */
export function activateRuntime(def: ThemeDef, tier: DiffId) {
  setActiveTheme(def);
  setDiffOverrides(def.diffOverrides);
  applyDifficultyCfg(tier);
  setTable(def.table);
  resetMutable();
}

export type Phase = 'attract' | 'playing' | 'gameover';
export type BallPhase = 'plunger' | 'active' | 'bonus';
export type CameraMode = 'auto' | 'broadcast' | 'top' | 'cinematic';

export interface ScorePopup { id: number; text: string; sub?: string; t: number }

export interface GameStore {
  themeId: string;
  phase: Phase;
  ballPhase: BallPhase;
  score: number;
  highScore: number;
  ball: number;
  totalBalls: number;
  multiplier: number;
  bonus: number;
  message: string;
  messageT: number;
  bigMessage: string;
  bigMessageT: number;
  multiball: boolean;
  multiballT: number;
  tiltWarnings: number;
  tilted: boolean;
  plungerPower: number;
  plungerCharging: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  muted: boolean;
  cameraMode: CameraMode;
  shakeEnabled: boolean;
  popups: ScorePopup[];
  nextPopupId: number;
  bonusCounting: boolean;
  bonusDisplay: number;
  extraBallsAwarded: number[];
  showHelp: boolean;
  paused: boolean;
  ballsInPlay: number;
  stuckHint: boolean;
  difficulty: DiffId;
  /** Spirit Board for the current theme × tier. */
  board: ScoreEntry[];
  /** Open while a qualifying game-over score waits for initials. */
  initialsEntry: { rank: number; score: number } | null;
  /** Rank of the entry just filed (highlighted on the board), until the next game. */
  lastEntryRank: number | null;
  /** Agent Board for the current theme × tier, one list per timing mode. */
  agentBoards: Record<AgentMode, AgentEntry[]>;
  /** The agent declared on this page (engine/agent.ts), or null for a human. */
  agent: { name: string; model: string } | null;
  /** Timing mode for the agent's next game (locked while one is in play). */
  agentMode: AgentMode;
  /** ?debug page: ball spawning is exposed, so nothing it scores is ever filed. */
  unranked: boolean;
  /** ?agent page: show the Agent Console (hud/AgentConsole.tsx). */
  agentPage: boolean;
  /** Who is playing the current / last game — captured at start, decides the board. */
  run: { agent: { name: string; model: string } | null; mode: AgentMode; unranked: boolean };
  /** Where the last agent game landed on the Agent Board. */
  lastAgentRank: { mode: AgentMode; rank: number } | null;

  setTheme: (id: string) => void;
  /** Agent API: register this page's agent (see engine/agent.ts). */
  declareAgent: (agent: { name: string; model: string }) => void;
  /** Agent API: real-time or lockstep, between games only. Returns false if locked. */
  setAgentMode: (mode: AgentMode) => boolean;
  clearAgentBoard: (mode: AgentMode) => void;
  cycleTheme: (dir: 1 | -1) => void;
  setDifficulty: (id: DiffId) => void;
  cycleDifficulty: (dir: 1 | -1) => void;
  ballSearch: () => void;
  reserveBall: () => void;
  startGame: () => void;
  toAttract: () => void;
  setFlipper: (side: 'left' | 'right', pressed: boolean) => void;
  chargePlunger: () => void;
  releasePlunger: () => void;
  nudge: (dir: 'left' | 'right' | 'up') => void;
  addScore: (pts: number, label?: string) => void;
  /** Raise the playfield multiplier (capped at 5). Returns the new value. */
  bumpMultiplier: () => number;
  popup: (text: string, sub?: string) => void;
  setMessage: (m: string) => void;
  setBigMessage: (m: string) => void;
  onDrain: () => void;
  onAutoLaunch: () => void;
  endBall: () => void;
  finishBonus: () => void;
  triggerTilt: () => void;
  startMultiball: () => void;
  tickMultiball: (dt: number) => void;
  toggleMute: () => void;
  cycleCamera: () => void;
  toggleShake: () => void;
  toggleHelp: () => void;
  setPaused: (p: boolean) => void;
  submitInitials: (text: string) => void;
  skipInitials: () => void;
  clearBoard: () => void;
}

/** Shortest flipper stroke, s (a tap is never shorter than this). */
export const MIN_FLIP_PULSE = 0.08;
/** A plunger released below this power was a tap … */
export const TAP_THRESHOLD = 0.05;
/** … and launches at this power instead. */
export const TAP_PLUNGE_POWER = 0.6;

let bonusInterval: ReturnType<typeof setInterval> | null = null;

const EXTRA_BALL_AT = [120000, 300000, 600000];

export const useGame = create<GameStore>()((set, get) => ({
  themeId: '',
  phase: 'attract',
  ballPhase: 'plunger',
  score: 0,
  highScore: 0,
  ball: 1,
  totalBalls: 3,
  multiplier: 1,
  bonus: 0,
  message: 'PRESS ENTER TO START',
  messageT: 0,
  bigMessage: '',
  bigMessageT: 0,
  multiball: false,
  multiballT: 0,
  tiltWarnings: 0,
  tilted: false,
  plungerPower: 0,
  plungerCharging: false,
  leftPressed: false,
  rightPressed: false,
  muted: false,
  cameraMode: 'auto',
  shakeEnabled: true,
  popups: [],
  nextPopupId: 1,
  bonusCounting: false,
  bonusDisplay: 0,
  extraBallsAwarded: [],
  showHelp: false,
  paused: false,
  ballsInPlay: 0,
  stuckHint: false,
  difficulty: 'medium',
  board: [],
  initialsEntry: null,
  lastEntryRank: null,
  agentBoards: { realtime: [], lockstep: [] },
  agent: null,
  agentMode: 'realtime',
  unranked: false,
  agentPage: false,
  run: { agent: null, mode: 'realtime', unranked: false },
  lastAgentRank: null,

  declareAgent: (agent) => set({ agent }),

  setAgentMode: (mode) => {
    if (get().phase === 'playing') return false;
    set({ agentMode: mode });
    return true;
  },

  clearAgentBoard: (mode) => {
    const { themeId, difficulty } = get();
    agentBoard.clear(themeId, mode, difficulty);
    set({ agentBoards: agentBoardsFor(themeId, difficulty), lastAgentRank: null });
  },

  // Summon a table. Only between games — a live game keeps its table.
  setTheme: (id) => {
    const def = themeById(id);
    if (!def) return;
    if (get().phase === 'playing') return;
    const tier = loadTier(def.id);
    activateRuntime(def, tier);
    def.rules.reset();
    if (!def.hidden) ls.set('theme', def.id);
    spawnBallAt(0, 10, 30, 0);
    set({
      themeId: def.id,
      difficulty: tier,
      ...(() => { const board = scores.list(def.id, tier); return { board, highScore: topScore(board) }; })(),
      agentBoards: agentBoardsFor(def.id, tier),
      lastAgentRank: null,
      initialsEntry: null,
      lastEntryRank: null,
      phase: 'attract',
      bigMessage: '',
      score: 0,
      message: `${def.copy.name.toUpperCase()} — PRESS ENTER TO START`,
      messageT: Date.now(),
    });
  },

  cycleTheme: (dir) => {
    const ids = hallThemes().map((t) => t.id);
    if (!ids.length) return;
    const i = ids.indexOf(get().themeId); // a hidden table cycles back into the hall
    if (ids.length < 2 && i >= 0) return;
    get().setTheme(ids[(i + dir + ids.length) % ids.length]);
  },

  setDifficulty: (id) => {
    // tiers change between games only — a mid-game switch would file the score under the wrong best
    if (get().phase === 'playing') return;
    applyDifficultyCfg(id);
    refreshActive();
    const theme = get().themeId;
    ls.set(`${theme}:diff`, id);
    const cfg = diffFor(id);
    set({
      difficulty: id,
      ...(() => { const board = scores.list(theme, id); return { board, highScore: topScore(board) }; })(),
      agentBoards: agentBoardsFor(theme, id),
      lastAgentRank: null,
      lastEntryRank: null,
      message: `MODE ${cfg.label} — ${cfg.blurb}`,
      messageT: Date.now(),
    });
  },

  cycleDifficulty: (dir) => {
    const i = DIFF_ORDER.indexOf(get().difficulty);
    get().setDifficulty(DIFF_ORDER[(i + dir + DIFF_ORDER.length) % DIFF_ORDER.length]);
  },

  // Frees a ball that has come to rest somewhere it cannot escape from.
  ballSearch: () => {
    if (get().phase !== 'playing') return;
    let kicked = false;
    for (const b of gameRef.balls) {
      if (!b.active || b.captured > 0 || b.ride || b.autoLaunch !== undefined) continue;
      b.vx += (Math.random() - 0.5) * 95;
      b.vy += 72;
      kicked = true;
    }
    if (!kicked) return;
    addShake(0.45);
    sound.nudge();
    get().setMessage('BALL SEARCH — KICKING BALL FREE');
  },

  // Re-serves a fresh ball to the plunger without costing the player a ball.
  reserveBall: () => {
    if (get().phase !== 'playing') return;
    for (const b of gameRef.balls) b.active = false;
    gameRef.balls = [];
    gameRef.stuckTimer = 0;
    gameRef.searchCount = 0;
    gameRef.plungerCharging = false;
    gameRef.plungerPower = 0;
    spawnBallInLane();
    sound.eject();
    set({
      ballPhase: 'plunger',
      plungerCharging: false,
      plungerPower: 0,
      ballsInPlay: 1,
      multiball: false,
      multiballT: 0,
      stuckHint: false,
      message: 'BALL RE-SERVED — NO BALL LOST',
      messageT: Date.now(),
      bigMessage: 'BALL RESET',
      bigMessageT: Date.now(),
    });
    setTimeout(() => {
      if (get().bigMessage === 'BALL RESET') set({ bigMessage: '' });
    }, 1500);
  },

  startGame: () => {
    // initials first — the Enter that confirms them must not also start a game
    if (get().initialsEntry) return;
    sound.ensure();
    sound.start();
    // a restart mid-bonus must not let the old count-up finish into the new game
    if (bonusInterval) { clearInterval(bonusInterval); bonusInterval = null; }
    resetMutable();
    activeTheme().rules.reset();
    spawnBallInLane();
    set({
      phase: 'playing', ballPhase: 'plunger', score: 0, ball: 1, totalBalls: 3,
      multiplier: 1, bonus: 0,
      multiball: false, multiballT: 0, tiltWarnings: 0, tilted: false,
      plungerPower: 0, plungerCharging: false, popups: [], bonusCounting: false,
      bonusDisplay: 0, extraBallsAwarded: [], ballsInPlay: 1, stuckHint: false,
      paused: false, lastEntryRank: null, lastAgentRank: null,
      run: { agent: get().agent, mode: get().agentMode, unranked: get().unranked },
      message: `${DIFF.label} MODE — BALL 1 — HOLD SPACE TO PLUNGE`, messageT: Date.now(),
      bigMessage: 'BALL 1', bigMessageT: Date.now(),
    });
    gameRef.paused = false;
  },

  toAttract: () => {
    resetMutable();
    spawnBallAt(0, 10, 30, 0);
    set({ phase: 'attract', bigMessage: '', message: `MODE ${DIFF.label} — PRESS ENTER TO START` });
  },

  setFlipper: (side, pressed) => {
    // A tap is a full stroke: a release within MIN_FLIP_PULSE of the press is
    // held back until the pulse has run (instant key taps — and agents driving
    // the keyboard — otherwise release before a single physics step).
    if (pressed) {
      gameRef.flipPressedAt[side] = gameRef.time;
    } else {
      const pressedAt = gameRef.flipPressedAt[side];
      const held = gameRef.time - pressedAt;
      if (held < MIN_FLIP_PULSE) {
        later(MIN_FLIP_PULSE - held, () => {
          // only if nobody pressed it again in the meantime
          if (gameRef.flipPressedAt[side] === pressedAt) get().setFlipper(side, false);
        });
        return;
      }
    }
    if (side === 'left') {
      gameRef.left.pressed = pressed;
      set({ leftPressed: pressed });
    } else {
      gameRef.right.pressed = pressed;
      set({ rightPressed: pressed });
    }
    if (!get().muted) {
      if (pressed) sound.flipperUp();
      else sound.flipperDown();
    }
  },

  chargePlunger: () => {
    const s = get();
    if (s.phase !== 'playing' || s.ballPhase !== 'plunger' || s.paused) return;
    gameRef.plungerCharging = true;
    gameRef.plungerPower = 0;
    set({ plungerCharging: true, plungerPower: 0 });
  },

  releasePlunger: () => {
    const s = get();
    if (s.phase !== 'playing' || s.ballPhase !== 'plunger') return;
    // a tap (no real hold) is a standard auto-plunge, not a dead-weak dribble
    const tapped = gameRef.plungerPower < TAP_THRESHOLD;
    const power = tapped ? TAP_PLUNGE_POWER : gameRef.plungerPower;
    const ball = gameRef.balls.find(b => b.active && b.inLane && b.autoLaunch === undefined);
    if (!ball) return;
    const P = TABLE.plunger;
    ball.vy = (P.launchBase + power * P.launchRange) * DIFF.launch;
    ball.vx = (Math.random() - 0.5) * 4;
    ball.inLane = true; // still in lane until it exits top
    gameRef.lastLaunchPower = power;
    gameRef.skillWindow = 5;
    gameRef.plungerCharging = false;
    gameRef.plungerPower = 0;
    sound.launch(power);
    addShake(0.12 + power * 0.15);
    set({ plungerCharging: false, plungerPower: 0, ballPhase: 'active', ballsInPlay: gameRef.balls.filter(b => b.active).length });
    activeTheme().rules.onLaunch?.(power);
    if (tapped) get().setMessage('AUTO PLUNGE — HOLD SPACE FOR POWER');
  },

  nudge: (dir) => {
    const s = get();
    if (s.phase !== 'playing' || s.paused) return;
    if (isTilted()) return;
    sound.ensure();
    const now = gameRef.time;
    gameRef.nudgeTimes = gameRef.nudgeTimes.filter(t => now - t < 2.5);
    gameRef.nudgeTimes.push(now);
    const force = DIFF.nudge;
    if (dir === 'left') { gameRef.pendingNudge.x -= force; gameRef.pendingNudge.y += 8; }
    if (dir === 'right') { gameRef.pendingNudge.x += force; gameRef.pendingNudge.y += 8; }
    if (dir === 'up') { gameRef.pendingNudge.y += force * 0.9; }
    addShake(0.35);
    sound.nudge();
    const limit = DIFF.tiltLimit;
    const len = gameRef.nudgeTimes.length;
    if (len >= limit) {
      get().triggerTilt();
    } else if (len === limit - 1) {
      set({ tiltWarnings: 2 });
      get().setMessage('TILT WARNING — EASY!');
      sound.warn();
      gameRef.tiltWarnings = 2;
    } else if (len === limit - 2) {
      set({ tiltWarnings: 1 });
      gameRef.tiltWarnings = 1;
    }
  },

  addScore: (pts, label) => {
    const s = get();
    if (s.phase !== 'playing') return;
    if (isTilted()) return;
    const mult = s.multiball ? s.multiplier * 2 : s.multiplier;
    const gain = Math.round(pts * mult * DIFF.score);
    const score = s.score + gain;
    const patch: Partial<GameStore> = { score, bonus: s.bonus + Math.round(pts * 0.1 * DIFF.score) };
    // live "NEW BEST!" (human games only; filed on the board at game over)
    if (score > s.highScore && !s.run.agent && !s.run.unranked) patch.highScore = score;
    EXTRA_BALL_AT.map((t) => Math.round(t * DIFF.score)).forEach((th, i) => {
      if (score >= th && !s.extraBallsAwarded.includes(i)) {
        patch.extraBallsAwarded = [...(patch.extraBallsAwarded ?? s.extraBallsAwarded), i];
        patch.totalBalls = (patch.totalBalls ?? s.totalBalls) + 1;
        setTimeout(() => {
          get().popup('EXTRA BALL!', 'SHOOT AGAIN');
          get().setBigMessage('EXTRA BALL');
          sound.extraBall();
        }, 300);
      }
    });
    set(patch);
    if (label && gain >= 1000) get().popup(`+${gain.toLocaleString()}`, label);
  },

  bumpMultiplier: () => {
    const m = Math.min(5, get().multiplier + 1);
    set({ multiplier: m });
    return m;
  },

  popup: (text, sub) => {
    const id = get().nextPopupId;
    set({ nextPopupId: id + 1, popups: [...get().popups.slice(-4), { id, text, sub, t: Date.now() }] });
    setTimeout(() => {
      set({ popups: get().popups.filter(p => p.id !== id) });
    }, 2200);
  },

  setMessage: (m) => set({ message: m, messageT: Date.now() }),
  setBigMessage: (m) => {
    set({ bigMessage: m, bigMessageT: Date.now() });
    setTimeout(() => {
      if (get().bigMessage === m) set({ bigMessage: '' });
    }, 1800);
  },

  onDrain: () => {
    flash('drain');
    const remaining = gameRef.balls.filter(b => b.active);
    set({ ballsInPlay: remaining.length });
    sound.drain();
    if (remaining.length > 0) {
      get().setMessage('BALL DRAINED — MULTIBALL CONTINUES!');
      return;
    }
    addShake(0.4);
    if (get().ballPhase === 'bonus') return;
    set({ ballPhase: 'bonus', bonusCounting: true, multiball: false, multiballT: 0 });
    get().endBall();
  },

  onAutoLaunch: () => {
    sound.launch(1);
    addShake(0.25);
    set({ ballsInPlay: gameRef.balls.filter(b => b.active).length, ballPhase: 'active' });
  },

  endBall: () => {
    const s = get();
    const bonus = Math.round(s.bonus * s.multiplier);
    set({ bonusDisplay: 0 });
    if (bonusInterval) clearInterval(bonusInterval);
    if (bonus <= 0) {
      setTimeout(() => get().finishBonus(), 700);
      return;
    }
    let shown = 0;
    const step = Math.max(100, Math.round(bonus / 24));
    bonusInterval = setInterval(() => {
      shown += step;
      if (shown >= bonus) {
        shown = bonus;
        if (bonusInterval) clearInterval(bonusInterval);
        setTimeout(() => get().finishBonus(), 650);
      } else {
        sound.bonusTick();
      }
      set({ bonusDisplay: shown });
    }, 55);
  },

  finishBonus: () => {
    const s = get();
    if (s.phase !== 'playing' || !s.bonusCounting) return;
    const bonus = Math.round(s.bonus * s.multiplier);
    const score = s.score + bonus;
    const highScore = Math.max(s.highScore, score);
    if (s.ball >= s.totalBalls) {
      sound.gameOver();
      const board = scores.list(s.themeId, s.difficulty);
      const { run } = s;
      if (run.unranked || run.agent) {
        // never the human Spirit Board: a ?debug game files nowhere, an agent's
        // game files straight to the Agent Board under its declared name
        let lastAgentRank: GameStore['lastAgentRank'] = null;
        if (run.agent && !run.unranked) {
          const latencyMs = run.mode === 'lockstep' ? runLatency() : null;
          const rank = agentBoard.submit(s.themeId, run.mode, s.difficulty, {
            ...run.agent, score, day: today(), ...(latencyMs !== null ? { latencyMs } : {}),
          });
          if (rank) lastAgentRank = { mode: run.mode, rank };
        }
        set({
          phase: 'gameover', score, bonusCounting: false, board, initialsEntry: null,
          agentBoards: agentBoardsFor(s.themeId, s.difficulty), lastAgentRank,
          bigMessage: 'GAME OVER', bigMessageT: Date.now(),
          message: run.unranked ? 'DEBUG GAME — NOT RANKED'
            : lastAgentRank ? `AGENT BOARD #${lastAgentRank.rank} (${run.mode.toUpperCase()})` : 'AGENT GAME OVER',
        });
        resetMutable();
        spawnBallAt(0, 12, 40, 10);
        return;
      }
      const qualifies = scores.qualifies(s.themeId, s.difficulty, score);
      set({
        phase: 'gameover', score, highScore, bonusCounting: false, board,
        initialsEntry: qualifies ? { rank: rankFor(board, score), score } : null,
        bigMessage: 'GAME OVER', bigMessageT: Date.now(),
        message: qualifies ? 'A NEW SPIRIT — ENTER YOUR INITIALS' : 'PRESS ENTER TO PLAY AGAIN',
      });
      resetMutable();
      spawnBallAt(0, 12, 40, 10);
    } else {
      const nb = s.ball + 1;
      resetMutable();
      activeTheme().rules.resetBall();
      spawnBallInLane();
      sound.start();
      set({
        ball: nb, score, highScore, bonus: 0, multiplier: 1, multiball: false,
        ballPhase: 'plunger', bonusCounting: false, bonusDisplay: 0, tiltWarnings: 0, tilted: false,
        ballsInPlay: 1,
        bigMessage: `BALL ${nb}`, bigMessageT: Date.now(),
        message: `BALL ${nb} — HOLD SPACE TO PLUNGE`,
      });
    }
  },

  triggerTilt: () => {
    gameRef.tiltedUntil = gameRef.time + 5;
    gameRef.tiltWarnings = 0;
    gameRef.left.pressed = false;
    gameRef.right.pressed = false;
    sound.tilt();
    gameRef.shake = 1;
    set({
      tilted: true, tiltWarnings: 0, leftPressed: false, rightPressed: false,
      bigMessage: 'TILT!', bigMessageT: Date.now(), message: 'TILT — FLIPPERS DEAD FOR 5s',
    });
    later(5, () => {
      set({ tilted: false, message: 'RECOVERED — EASY ON THE NUDGE' });
    });
  },

  startMultiball: () => {
    const s = get();
    if (s.multiball) {
      get().addScore(5000, 'MULTIBALL EXTENDED');
      set({ multiballT: DIFF.mbTime });
      return;
    }
    set({ multiball: true, multiballT: DIFF.mbTime });
    get().setBigMessage('MULTIBALL!');
    get().setMessage('MULTIBALL — ALL SCORES 2X!');
    sound.multiball();
    addShake(0.6);
    flash('jackpot');
    spawnBallInLane(0.9); // second ball auto-launches from the lane
    set({ ballsInPlay: gameRef.balls.filter(x => x.active).length });
  },

  tickMultiball: (dt) => {
    const s = get();
    if (!s.multiball) return;
    const t = s.multiballT - dt;
    if (t <= 0) set({ multiball: false, multiballT: 0, message: 'MULTIBALL OVER' });
    else set({ multiballT: t });
  },

  toggleMute: () => {
    const m = !get().muted;
    sound.setEnabled(!m);
    set({ muted: m });
  },
  cycleCamera: () => {
    const order: CameraMode[] = ['auto', 'broadcast', 'top', 'cinematic'];
    const cur = get().cameraMode;
    set({ cameraMode: order[(order.indexOf(cur) + 1) % order.length] });
  },
  toggleShake: () => set({ shakeEnabled: !get().shakeEnabled }),
  toggleHelp: () => set({ showHelp: !get().showHelp }),
  setPaused: (p) => {
    gameRef.paused = p;
    set({ paused: p });
  },

  submitInitials: (text) => {
    const s = get();
    if (!s.initialsEntry) return;
    const initials = padInitials(cleanInitials(text) || scores.lastInitials() || '???');
    const rank = scores.submit(s.themeId, s.difficulty, { initials, score: s.initialsEntry.score, day: today() });
    const board = scores.list(s.themeId, s.difficulty);
    set({ initialsEntry: null, lastEntryRank: rank, board, highScore: topScore(board), message: 'PRESS ENTER TO PLAY AGAIN' });
  },

  skipInitials: () => get().submitInitials(''),

  clearBoard: () => {
    const s = get();
    if (s.phase === 'playing') return;
    scores.clear(s.themeId, s.difficulty);
    set({ board: [], highScore: 0, lastEntryRank: null });
  },
}));

/** Pick the starting theme: ?theme= deep link, else last played, else the first registered. */
export function bootTheme() {
  let wanted: string | null = null;
  try { wanted = new URLSearchParams(window.location.search).get('theme'); } catch { /* no window */ }
  // a hidden fixture table is only ever entered by explicit link, never remembered
  const remembered = themeById(ls.get('theme'));
  const def = themeById(wanted) ?? (remembered && !remembered.hidden ? remembered : undefined) ?? hallThemes()[0];
  useGame.getState().setTheme(def.id);
}
