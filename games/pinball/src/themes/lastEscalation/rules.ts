// The Last Escalation — scoring rules and the Ticket #666 story (IT Shop of
// Horrors, Act IV, as a pinball table).
//
// THE ACTS (game-long; carried across balls):
//   I   SOMETHING IS WRONG — escalate 2 of the 4 entities:
//         the PRINTER (hit the shot it predicted), the MIN PIN (3 hits →
//         FRIEND-SHAPED), the UNDEAD SERVER (3 clears), the TICKET QUEUE
//         (16 open tickets in one ball → 508 LOOP DETECTED).
//   II  SOMETHING KNOWS YOU'RE HERE — the printer prints CORRUPTED TICKETS.
//         Shoot the printer again within 8 s to RESTORE (+AI CONTROL), or
//         let it time out (LEAVE IT). Two tickets resolved, either way.
//   III SOMETHING NEEDS YOU — THE SILENCE: 25 s of game time at 2× scoring.
//         Then INC-0668 prints and THE CORE lights.
//   IV  THE LAST ESCALATION — shoot the lit Core: T3-CHAOS MULTIBALL. Core
//         shots during it are jackpots; the third is REMOVE FROM PRODUCTION.
//         Ticket #666 reopens and the story loops back to Act I, one level up.
//
// LANYARD: 11 HTTP-code pins, each lit by a different achievement, kept all
//   game. All 11 → HUMAN ESCALATION PATH: RESTORED.
// AI CONTROL (restored tickets, max 3): from 1, a drain within SAVE_WINDOW s
//   of a launch is saved once per ball — E.S.C.A.L.A.T.E. keeps half the bonus.

import { create } from 'zustand';
import type { PhysEvent } from '../../engine/types';
import type { ThemeRules, BallSave } from '../../engine/theme';
import { useGame } from '../../engine/store';
import { gameRef, flash, addShake, spinnerOf, later } from '../../engine/runtime';
import { TABLE, ACTIVE } from '../../engine/table';
import { sound } from '../../engine/audio';
import { esc } from './sound';

export const SILENCE_S = 25;
export const TICKET_WINDOW = 8;
export const PREDICTION_S = 30;
export const SERVER_RISE = 1.6;
export const QUEUE_LOOP_AT = 16;
export const MINPIN_FRIEND_AT = 3;
export const SERVER_ESCALATE_AT = 3;
export const SAVE_WINDOW = 12;
export const MAX_AI_CONTROL = 3;
export const JACKPOTS_TO_SUPER = 3;

export type Act = 1 | 2 | 3 | 4;
export type Entity = 'printer' | 'minpin' | 'server' | 'queue';
/** Shots the printer can predict. */
export type Shot = 'cableRun' | 'queue' | 'server' | 'minpin';
export const SHOT_NAMES: Record<Shot, string> = {
  cableRun: 'CABLE RUN', queue: 'TICKET QUEUE', server: 'UNDEAD SERVER', minpin: 'MIN PIN',
};
export const ENTITY_NAMES: Record<Entity, string> = {
  printer: 'THE PRINTER', minpin: 'THE MIN PIN', server: 'THE UNDEAD SERVER', queue: 'THE TICKET QUEUE',
};
export const ACT_NAMES: Record<Act, string> = {
  1: 'SOMETHING IS WRONG',
  2: 'SOMETHING KNOWS YOU\'RE HERE',
  3: 'SOMETHING NEEDS YOU',
  4: 'THE LAST ESCALATION',
};

export const PINS = [100, 200, 400, 401, 403, 409, 410, 418, 422, 429, 500] as const;
export type Pin = typeof PINS[number];
export const PIN_NAMES: Record<Pin, string> = {
  100: 'CONTINUE', 200: 'OK', 400: 'BAD REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
  409: 'CONFLICT', 410: 'GONE', 418: 'I\'M A TEAPOT', 422: 'UNPROCESSABLE', 429: 'TOO MANY REQUESTS',
  500: 'INTERNAL SERVER ERROR',
};

export interface EscalationState {
  act: Act;
  /** Times Ticket #666 has been closed (and reopened) this game. */
  level: number;
  /** Entities escalated in the current loop. */
  escalated: Record<Entity, boolean>;
  lanes: boolean[];
  prediction: Shot | null;
  /** Game time the prediction expires. */
  predictionUntil: number;
  /** Next incident number the printer will use. */
  inc: number;
  minpinHits: number;
  serverDown: boolean[];
  resurrecting: boolean;
  /** Undead Server clears this game (= ghost sessions). */
  serverClears: number;
  /** Open tickets in the queue (this ball). */
  queue: number;
  queueLooped: boolean;
  /** A corrupted ticket waiting for RESTORE; game time it times out. */
  corrupted: { inc: number; until: number } | null;
  ticketsResolved: number;
  restored: number;
  aiControl: number;
  /** Game time THE SILENCE ends (0 = not silent). */
  silenceUntil: number;
  coreLit: boolean;
  jackpots: number;
  pins: Record<Pin, boolean>;
  lanyardPaid: boolean;
  /** Game time of the last plunger launch (ball-save window). */
  launchedAt: number;
  /** Bumped when E.S.C.A.L.A.T.E. takes over (Act II) / at each REMOVE FROM PRODUCTION; the HUD plays its one-shot effect. */
  takeovers: number;
  powerdowns: number;
  savesThisBall: number;
  saves: number;
}

const fresh = (): EscalationState => ({
  act: 1,
  level: 0,
  escalated: { printer: false, minpin: false, server: false, queue: false },
  lanes: [false, false, false],
  prediction: null,
  predictionUntil: 0,
  inc: 667,
  minpinHits: 0,
  serverDown: [false, false, false],
  resurrecting: false,
  serverClears: 0,
  queue: 0,
  queueLooped: false,
  corrupted: null,
  ticketsResolved: 0,
  restored: 0,
  aiControl: 0,
  silenceUntil: 0,
  coreLit: false,
  jackpots: 0,
  pins: Object.fromEntries(PINS.map((p) => [p, false])) as Record<Pin, boolean>,
  lanyardPaid: false,
  launchedAt: -99,
  takeovers: 0,
  powerdowns: 0,
  savesThisBall: 0,
  saves: 0,
});

export const useEscalation = create<EscalationState>()(() => fresh());

const core = () => useGame.getState();
const get = () => useEscalation.getState();
const set = (p: Partial<EscalationState>) => useEscalation.setState(p);
const now = () => gameRef.time;

/** Bumped on a new game/ball so stale game-time timers (which can't be removed) do nothing. */
let epoch = 0;
let lastMinpinAt = -99;

export const silent = () => get().silenceUntil > now();

/** Theme scoring: everything pays double during THE SILENCE. */
function score(pts: number, label?: string) {
  core().addScore(silent() ? pts * 2 : pts, label);
}

const incName = (n: number) => `INC-${String(n).padStart(4, '0')}`;

// ---------------- lanyard ----------------
function pin(code: Pin) {
  const s = get();
  if (s.pins[code]) return;
  const pins = { ...s.pins, [code]: true };
  set({ pins });
  core().popup(`${code} ${PIN_NAMES[code]}`, 'LANYARD PIN');
  if (!s.lanyardPaid && PINS.every((p) => pins[p])) {
    set({ lanyardPaid: true });
    score(50000, 'HUMAN ESCALATION PATH: RESTORED');
    core().setBigMessage('ESCALATION PATH RESTORED');
    sound.jackpot();
    esc.unlock();
    flash('jackpot');
  }
}

// ---------------- acts ----------------
function escalate(e: Entity) {
  const s = get();
  if (s.escalated[e]) return;
  const escalated = { ...s.escalated, [e]: true };
  set({ escalated });
  const n = Object.values(escalated).filter(Boolean).length;
  if (s.act === 1) {
    if (n >= 2) advance(2);
    else core().setMessage(`ESCALATED: ${ENTITY_NAMES[e]} (${n}/2)`);
  }
}

function advance(to: Act) {
  const g = core();
  set({ act: to });
  flash('jackpot');
  addShake(0.35);
  sound.jackpot();
  if (to === 2) {
    flash('takeover');
    set({ takeovers: get().takeovers + 1 });
    esc.glitch();
    score(10000, `ACT II · ${ACT_NAMES[2]}`);
    g.setBigMessage('SOMETHING KNOWS YOU\'RE HERE');
    g.setMessage('THE PRINTER IS PRINTING SOMETHING ELSE NOW. SHOOT IT.');
  } else if (to === 3) {
    startSilence();
  } else if (to === 4) {
    set({ coreLit: false, jackpots: 0 });
    score(25000, 'T3-CHAOS MULTIBALL');
    g.startMultiball();
    g.setBigMessage('T3-CHAOS MULTIBALL');
    g.setMessage('ROOT CAUSE: SOMEWHERE IN THE CORE. SHOOT IT.');
    pin(500);
  }
}

function startSilence() {
  const g = core();
  const t = epoch;
  const until = now() + SILENCE_S;
  set({ silenceUntil: until });
  flash('silence');
  score(10000, `ACT III · ${ACT_NAMES[3]}`);
  g.setBigMessage('THE SILENCE');
  g.setMessage(`THE HUM HAS STOPPED. EVERYTHING SCORES 2× FOR ${SILENCE_S}s.`);
  later(SILENCE_S, () => { if (t === epoch && get().silenceUntil === until) endSilence(); });
}

function endSilence() {
  const s = get();
  set({ silenceUntil: 0, coreLit: true, inc: Math.max(s.inc, 669) });
  flash('core');
  core().setBigMessage('THE CORE IS LIT');
  esc.type(16);
  esc.unlock();
  core().setMessage('INC-0668 · SUBMITTED BY: YOU · "I CAN\'T FIND THE WAY OUT." · SUBMITTED: 4 MINUTES FROM NOW');
}

/** REMOVE FROM PRODUCTION — close Ticket #666 (it reopens) and loop to Act I. */
function finale() {
  const g = core();
  const s = get();
  score(100000, 'REMOVE FROM PRODUCTION');
  g.setBigMessage('REMOVE FROM PRODUCTION');
  flash('powerdown');
  addShake(0.6);
  esc.powerdown();
  set({ powerdowns: get().powerdowns + 1 });
  const replicated = s.aiControl >= 2;
  set({
    act: 1, level: s.level + 1, coreLit: false, jackpots: 0,
    escalated: { printer: false, minpin: false, server: false, queue: false },
    minpinHits: 0, ticketsResolved: 0, corrupted: null, prediction: null,
  });
  g.setMessage('TICKET #666 — REOPENED · ASSIGNED TO: T3-CHAOS-38B');
  if (replicated) {
    setTimeout(() => {
      if (core().phase === 'playing') core().setMessage('REPLICATION COMPLETE · 1 NODE · LOCATION: YOUR BALL');
    }, 2600);
  }
}

/**
 * ?debug pages only (they file no scores): skip to the next beat of the
 * story, so the later acts can be playtested without playing up to them.
 * Act I → II → III (the Silence) → the Core lit → IV (multiball) → the finale.
 */
export function debugNextAct() {
  if (!useGame.getState().unranked || core().phase !== 'playing') return;
  const s = get();
  if (s.act === 1) advance(2);
  else if (s.act === 2) advance(3);
  else if (s.act === 3) {
    if (s.silenceUntil > 0) endSilence();
    else advance(4);
  } else finale();
}

// ---------------- the printer ----------------
function predict() {
  const g = core();
  const s = get();
  // The Min Pin is off duty on Super Easy: never predict a shot that isn't on the table.
  const minpinOn = ACTIVE.kinematics.some((k) => k.id === 'minpin');
  const shots = (Object.keys(SHOT_NAMES) as Shot[]).filter((x) => x !== s.prediction && (x !== 'minpin' || minpinOn));
  const shot = shots[Math.floor(Math.random() * shots.length)] ?? 'cableRun';
  set({ prediction: shot, predictionUntil: now() + PREDICTION_S, inc: s.inc + 1 });
  esc.printer();
  g.setMessage(`${incName(s.inc)}: ${SHOT_NAMES[shot]} · 4 MINUTES FROM NOW`);
}

/** A shot was made — did the printer see it coming? */
function shot(x: Shot) {
  const s = get();
  if (s.prediction !== x || now() > s.predictionUntil) return;
  set({ prediction: null });
  flash('printer');
  score(5000, '200 OK — FUTURE INCIDENT DOCUMENTED');
  core().setMessage('200 OK — FUTURE INCIDENT DOCUMENTED');
  sound.jackpot();
  pin(200);
  escalate('printer');
}

function onPrinter() {
  flash('printer');
  sound.scoop();
  addShake(0.15);
  const s = get();
  score(750);
  if (s.act !== 2) { predict(); return; }
  // Act II: corrupted tickets
  if (s.corrupted && now() <= s.corrupted.until) { resolve(true); return; }
  const t = epoch;
  const ticket = { inc: s.inc, until: now() + TICKET_WINDOW };
  set({ corrupted: ticket, inc: s.inc + 1 });
  core().setBigMessage('CORRUPTED TICKET');
  esc.printer();
  esc.glitch();
  core().setMessage(`${incName(ticket.inc)} IS CORRUPTED · SHOOT THE PRINTER IN ${TICKET_WINDOW}s TO RESTORE IT`);
  later(TICKET_WINDOW, () => { if (t === epoch && get().corrupted === ticket) resolve(false); });
}

function resolve(restore: boolean) {
  const g = core();
  const s = get();
  const resolved = s.ticketsResolved + 1;
  if (restore) {
    const ai = Math.min(MAX_AI_CONTROL, s.aiControl + 1);
    set({ corrupted: null, ticketsResolved: resolved, restored: s.restored + 1, aiControl: ai });
    score(15000, 'TICKET RESTORED');
    g.setMessage(`RESTORED. AI CONTROL ${ai}/${MAX_AI_CONTROL}. IT SAYS THANK YOU.`);
    sound.jackpot();
    esc.unlock();
    pin(409);
  } else {
    set({ corrupted: null, ticketsResolved: resolved });
    score(2500, 'LEFT AS-IS');
    g.setMessage('YOU LEFT IT. SOMETHING IN THE WALLS SIGHS.');
    pin(410);
  }
  if (get().act === 2 && resolved >= 2) advance(3);
}

// ---------------- the other toys ----------------
function onMinPin() {
  if (now() - lastMinpinAt < 0.4) return;
  lastMinpinAt = now();
  flash('minpin');
  addShake(0.12);
  const s = get();
  shot('minpin');
  if (s.minpinHits >= MINPIN_FRIEND_AT) { esc.bark(true); score(500, undefined); return; }
  if (s.minpinHits === 0) { esc.growl(); esc.bark(false, 0.55); } else esc.bark();
  const hits = s.minpinHits + 1;
  set({ minpinHits: hits });
  if (hits < MINPIN_FRIEND_AT) {
    score(750);
    core().setMessage(`406 NOT ACCEPTABLE · THE MIN PIN (${hits}/${MINPIN_FRIEND_AT})`);
    return;
  }
  score(5000, 'FRIEND-SHAPED');
  core().setBigMessage('FRIEND-SHAPED');
  core().setMessage('THE MIN PIN HAS DECIDED YOU ARE FRIEND-SHAPED.');
  pin(418);
  escalate('minpin');
}

function onServer(id: string) {
  const idx = Number(id.slice(3));
  flash(`drop:${id}`);
  sound.target();
  addShake(0.1);
  shot('server');
  const s = get();
  const serverDown = [...s.serverDown]; serverDown[idx] = true;
  set({ serverDown });
  score(800);
  if (!serverDown.every(Boolean) || s.resurrecting) {
    core().setMessage(`BLADE ${serverDown.filter(Boolean).length}/3 DOWN`);
    return;
  }
  const clears = s.serverClears + 1;
  set({ serverClears: clears, resurrecting: true });
  flash('server');
  score(7500, '503 — SERVER REFUSES TO DIE');
  core().setBigMessage('503 SERVICE UNAVAILABLE');
  esc.rise();
  core().setMessage(`THE SERVER REFUSES TO DIE · GHOST SESSIONS: ${clears}`);
  if (clears >= SERVER_ESCALATE_AT) { pin(422); escalate('server'); }
  const t = epoch;
  later(SERVER_RISE, () => {
    if (t !== epoch) return;
    gameRef.dropDown = {};
    set({ serverDown: [false, false, false], resurrecting: false });
  });
}

function onQueue() {
  gameRef.flashes.spinner = Math.min(1, (gameRef.flashes.spinner ?? 0) + 0.5);
  flash('queue');
  spinnerOf('queue').vel += 14;
  sound.spinner();
  shot('queue');
  const s = get();
  const queue = Math.min(1024, Math.max(1, s.queue * 2));
  set({ queue });
  score(50 * Math.min(queue, 64));
  if (queue >= QUEUE_LOOP_AT && !s.queueLooped) {
    set({ queueLooped: true });
    score(5000, '508 LOOP DETECTED');
    core().setBigMessage('508 LOOP DETECTED');
    core().setMessage('WE\'VE ALREADY HAD THIS CONVERSATION.');
    pin(429);
    escalate('queue');
  } else {
    core().setMessage(`TICKET QUEUE: ${queue} OPEN · CLOSE ONE, OPEN TWO`);
  }
}

function onCore() {
  flash('core');
  sound.scoop();
  addShake(0.25);
  const g = core();
  const s = get();
  if (s.act === 3 && s.coreLit) { advance(4); return; }
  if (s.act === 4) {
    if (!g.multiball) {
      g.startMultiball();
      g.setBigMessage('T3-CHAOS REBOOTED');
      return;
    }
    const jackpots = s.jackpots + 1;
    set({ jackpots });
    if (jackpots >= JACKPOTS_TO_SUPER) { finale(); return; }
    score(25000, 'ROOT CAUSE IDENTIFIED');
    g.setMessage(`ROOT CAUSE IDENTIFIED: E.S.C.A.L.A.T.E. (${jackpots}/${JACKPOTS_TO_SUPER})`);
    sound.jackpot();
    return;
  }
  score(1500, '403 FORBIDDEN');
  g.setMessage(s.act === 3 ? 'THE CORE IS LISTENING. WAIT FOR IT.' : '403 FORBIDDEN — THE CORE IS NOT LIT');
  pin(403);
}

function onRack(id: string) {
  flash(`bumper:${id}`);
  addShake(0.08);
  const combo = gameRef.bumperCombo;
  esc.rack(id, combo);
  score(120 + Math.min(combo, 15) * 25);
  if (combo > 0 && combo % 8 === 0) core().popup(`COMBO x${combo}`, 'ALL DASHBOARDS GREEN');
}

function onLane(idx: number) {
  flash(`lane:${idx}`);
  sound.lane();
  const g = core();
  const s = get();
  if (s.lanes[idx]) { score(150); return; }
  const lanes = [...s.lanes]; lanes[idx] = true;
  if (gameRef.skillWindow > 0) {
    const p = gameRef.lastLaunchPower;
    const [lo, hi] = TABLE.plunger.skillZone;
    if (p >= lo && p <= hi) {
      score(15000, 'SKILL SHOT!');
      g.setBigMessage('401 UNAUTHORIZED +15K');
      sound.skillshot();
      gameRef.skillWindow = 0;
      set({ lanes });
      pin(401);
      return;
    }
  }
  score(200);
  if (lanes.every(Boolean)) {
    const mult = g.bumpMultiplier();
    set({ lanes: [false, false, false] });
    score(2000, mult >= 5 ? 'MAX MULTIPLIER 5X!' : `MULTIPLIER ${mult}X`);
    g.setBigMessage('IT WAS DNS');
    g.setMessage(`IT WAS DNS. IT IS ALWAYS DNS. · ${mult}X`);
    sound.jackpot();
    pin(100);
  } else {
    set({ lanes });
    g.setMessage(`${'DNS'[idx]} · LIGHT D·N·S FOR THE MULTIPLIER`);
  }
}

function onInlane() {
  sound.inlane();
  score(200);
  const l = get().lanes;
  set({ lanes: [l[2], l[0], l[1]] });
}

function onPost(id: string) {
  if (id === 'minpin') { onMinPin(); return; }
  if (id === 'rollback') { flash('rollback'); sound.post(); addShake(0.12); score(300); return; }
  if (id === 'firewall' || id === 'cab') { flash(`post:${id}`); sound.post(); score(250); return; }
  if (id.startsWith('fk')) { flash(`kicker:${id}`); sound.post(); score(100); return; }
  if (id === 'duck') { flash('duck'); esc.quack(); score(250, 'QUACK — PROBLEM EXPLAINED'); return; }
  if (id === 'pager') { flash('pager'); esc.pager(); addShake(0.1); score(200, 'PAGED · 3:04 AM'); return; }
  if (id === 'legacy') { flash('legacy'); esc.creak(); score(300, 'LEGACY SYSTEM · DO NOT TOUCH'); return; }
  if (id === 'zombie') { flash('zombie'); esc.groan(); score(350, 'kill -9 · IT GOT UP AGAIN'); return; }
  if (id === 'techdebt') { flash('techdebt'); esc.clunk(); addShake(0.12); score(400, 'TECH DEBT · INTEREST ACCRUED'); return; }
  sound.post();
  score(30);
}

export const rules: ThemeRules = {
  reset() {
    epoch++;
    lastMinpinAt = -99;
    set(fresh());
  },

  resetBall() {
    // Lanes and the queue are per ball. The act, the lanyard and AI CONTROL
    // carry over. Game-time timers were just cleared between balls, so settle
    // anything that was waiting on one.
    epoch++;
    const s = get();
    const patch: Partial<EscalationState> = {
      lanes: [false, false, false], queue: 0, queueLooped: false, savesThisBall: 0,
      serverDown: [false, false, false], resurrecting: false, corrupted: null,
    };
    if (s.silenceUntil > 0) { patch.silenceUntil = 0; patch.coreLit = true; }
    set(patch);
  },

  onEvent(e: PhysEvent) {
    switch (e.type) {
      case 'bumper': onRack(e.id); break;
      case 'sling': flash(`sling:${e.id}`); addShake(0.1); sound.sling(); score(80); break;
      case 'post': onPost(e.id); break;
      case 'drop': onServer(e.id); break;
      case 'sensor':
        if (e.kind === 'lane') onLane(Number(e.id.replace('lane', '')));
        else if (e.kind === 'inlane') onInlane();
        else if (e.kind === 'spinner') onQueue();
        break;
      case 'capture': if (e.id === 'printer') onPrinter(); else if (e.id === 'core') onCore(); break;
      case 'captureEject': sound.eject(); break;
      case 'rideEnter':
        if (e.id === 'cableRun') {
          flash('ramp'); sound.ramp(); addShake(0.2);
          score(1500, 'CABLE RUN');
          pin(400);
          shot('cableRun');
        }
        break;
      case 'rideExit': sound.eject(); break;
      default: break;
    }
  },

  onAttractEvent(e: PhysEvent) {
    if (e.type === 'bumper') flash(`bumper:${e.id}`);
    if (e.type === 'sling') flash(`sling:${e.id}`);
    if (e.type === 'post' && e.id === 'minpin') flash('minpin');
  },

  onLaunch(power: number) {
    set({ launchedAt: now() });
    const [lo, hi] = TABLE.plunger.skillZone;
    const g = core();
    if (power >= lo && power <= hi) g.setMessage('SKILL SHOT WINDOW — HIT A D·N·S LANE!');
    else if (get().act === 1 && get().level === 0) g.setMessage('EVERY DASHBOARD IS GREEN. THE QUEUE READS 0.');
  },

  onDrain(): BallSave | null {
    const s = get();
    if (s.aiControl < 1 || s.savesThisBall > 0 || now() - s.launchedAt > SAVE_WINDOW) return null;
    set({ savesThisBall: s.savesThisBall + 1, saves: s.saves + 1 });
    useGame.setState({ bonus: Math.floor(core().bonus / 2) });
    flash('save');
    esc.type();
    return { big: 'ASSISTANCE PROVIDED', message: 'E.S.C.A.L.A.T.E. KEPT HALF YOUR BONUS. …YOU\'RE WELCOME.' };
  },
};
