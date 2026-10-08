// Dead Star Disco — scoring rules and table state. Inherited from Neon Nova:
// N-O-V lanes → multiplier, L+R banks → multiball, C targets → scoop jackpot,
// drop doors → kickback + super ramp, wormhole mystery awards, shot combos.

import { create } from 'zustand';
import type { PhysEvent } from '../../engine/types';
import type { ThemeRules } from '../../engine/theme';
import { useGame } from '../../engine/store';
import { gameRef, flash, addShake, spinnerOf, later } from '../../engine/runtime';
import { TABLE } from '../../engine/table';
import { sound } from '../../engine/audio';

export interface DiscoState {
  lanes: boolean[];
  leftTargets: boolean[];
  rightTargets: boolean[];
  centerTargets: boolean[];
  jackpotLit: boolean;
  dropTargets: boolean[];
  kickbackLit: boolean;
  rampLit: boolean;
  combo: number;
  rampChain: number;
}

const fresh = (): DiscoState => ({
  lanes: [false, false, false],
  leftTargets: [false, false, false],
  rightTargets: [false, false, false],
  centerTargets: [false, false],
  jackpotLit: false,
  dropTargets: [false, false, false],
  kickbackLit: false,
  rampLit: false,
  combo: 0,
  rampChain: 0,
});

export const useDisco = create<DiscoState>()(() => fresh());

const core = () => useGame.getState();
const get = () => useDisco.getState();
const set = (p: Partial<DiscoState>) => useDisco.setState(p);

let lastShot = '';
let lastShotT = 0;
let lastRampAt = -99;

function noteCombo(shot: string) {
  const now = gameRef.time; // game time, so a pause (or an agent's lockstep) doesn't eat the window
  if (lastShot && lastShot !== shot && now - lastShotT < 7) {
    const combo = get().combo + 1;
    set({ combo });
    core().addScore(1800 * combo, `COMBO x${combo}`);
    if (combo >= 3) core().setBigMessage(`COMBO x${combo}`);
  } else {
    set({ combo: 1 });
  }
  lastShot = shot;
  lastShotT = now;
}

function onBumper(id: string) {
  flash(`bumper:${id}`);
  addShake(0.08);
  const combo = gameRef.bumperCombo;
  sound.bumper(combo);
  core().addScore(120 + Math.min(combo, 15) * 25);
  if (combo > 0 && combo % 8 === 0) core().popup(`COMBO x${combo}`, 'BUMPER FRENZY');
}

function onSling(side: string) {
  flash(`sling:${side}`);
  addShake(0.1);
  sound.sling();
  core().addScore(80);
}

function onTarget(id: string) {
  flash(`target:${id}`);
  sound.target();
  addShake(0.06);
  const g = core();
  const i = Number(id[1]);
  if (id[0] === 'L' || id[0] === 'R') {
    const key = id[0] === 'L' ? 'leftTargets' : 'rightTargets';
    const bank = get()[key];
    if (bank[i]) { g.addScore(250); return; }
    const next = [...bank]; next[i] = true;
    set({ [key]: next });
    const side = id[0] === 'L' ? 'LEFT' : 'RIGHT';
    g.addScore(600, next.every(Boolean) ? `${side} BANK COMPLETE!` : undefined);
    g.setMessage(`${side} TARGET DOWN`);
    // bank completion
    const { leftTargets: L, rightTargets: R } = get();
    if (L.every(Boolean) && R.every(Boolean)) {
      g.addScore(8000, 'BANKS COMPLETE');
      g.startMultiball();
      set({ leftTargets: [false, false, false], rightTargets: [false, false, false] });
    } else if (L.every(Boolean) || R.every(Boolean)) {
      g.addScore(2500);
      g.setMessage('BANK COMPLETE — FINISH BOTH FOR MULTIBALL');
    }
    return;
  }
  const center = get().centerTargets;
  if (center[i]) { g.addScore(250); return; }
  const next = [...center]; next[i] = true;
  set({ centerTargets: next });
  g.addScore(800, next.every(Boolean) ? 'CENTER COMPLETE!' : undefined);
  if (next.every(Boolean)) {
    set({ centerTargets: [false, false], jackpotLit: true });
    g.setBigMessage('JACKPOT LIT');
    g.setMessage('SHOOT THE SCOOP FOR JACKPOT');
    sound.jackpot();
    flash('jackpot');
  }
}

function onLane(idx: number) {
  flash(`lane:${idx}`);
  sound.lane();
  const g = core();
  const s = get();
  if (s.lanes[idx]) { g.addScore(150); return; }
  const lanes = [...s.lanes]; lanes[idx] = true;
  // skill shot check
  if (gameRef.skillWindow > 0) {
    const p = gameRef.lastLaunchPower;
    const [lo, hi] = TABLE.plunger.skillZone;
    if (p >= lo && p <= hi) {
      g.addScore(15000, 'SKILL SHOT!');
      g.setBigMessage('SKILL SHOT +15K');
      sound.skillshot();
      gameRef.skillWindow = 0;
      set({ lanes });
      return;
    }
  }
  g.addScore(400);
  if (lanes.every(Boolean)) {
    const mult = g.bumpMultiplier();
    set({ lanes: [false, false, false] });
    g.addScore(2500, mult >= 5 ? 'MAX MULTIPLIER 5X!' : `MULTIPLIER ${mult}X`);
    g.setBigMessage(mult >= 5 ? 'MAX 5X!' : `${mult}X MULTIPLIER`);
    sound.jackpot();
  } else {
    set({ lanes });
    g.setMessage(`LANE ${idx + 1}/3 — LIGHT ALL FOR MULTIPLIER`);
  }
}

function onInlane(id: string) {
  sound.inlane();
  const g = core();
  g.addScore(200);
  const s = get();
  if (id === 'inlaneL' && s.kickbackLit) {
    const b = gameRef.balls.find((ball) => ball.active && ball.inside.has('inlaneL') && !ball.ride);
    if (b) {
      b.vy = 158;
      b.vx = 16;
      b.stuck = 0;
      set({ kickbackLit: false });
      flash('kickback');
      addShake(0.35);
      sound.eject();
      g.addScore(2500, 'KICKBACK!');
      g.setBigMessage('KICKBACK');
    }
  }
  // lane change: rotating lit lanes lets the player aim the multiplier
  set({ lanes: [s.lanes[2], s.lanes[0], s.lanes[1]] });
}

function onScoop() {
  flash('scoop');
  sound.scoop();
  const g = core();
  if (get().jackpotLit) {
    set({ jackpotLit: false, centerTargets: [false, false] });
    g.addScore(25000, 'JACKPOT!!!');
    g.setBigMessage('JACKPOT 25K!');
    sound.jackpot();
    flash('jackpot');
    addShake(0.5);
  } else if (g.multiball) {
    g.addScore(5000, 'MULTIBALL SCOOP');
    sound.jackpot();
  } else {
    g.addScore(2500, 'SCOOP!');
    g.setMessage('SCOOP — CENTER TARGETS LIGHT JACKPOT');
  }
}

function onSpinner() {
  gameRef.flashes.spinner = Math.min(1, (gameRef.flashes.spinner ?? 0) + 0.5);
  spinnerOf('spinner').vel += 14;
  sound.spinner();
  core().addScore(180);
}

function onOrbit() {
  flash('orbit');
  sound.orbit();
  core().addScore(1200, 'ORBIT SHOT');
  core().setMessage('ORBIT SHOT!');
  noteCombo('orbit');
}

function onDrop(id: string) {
  const idx = Number(id.slice(1));
  flash(`drop:${id}`);
  sound.target();
  addShake(0.1);
  const g = core();
  const dropTargets = [...get().dropTargets];
  dropTargets[idx] = true;
  set({ dropTargets });
  g.addScore(800);
  if (dropTargets.every(Boolean)) {
    g.addScore(7500, 'DOORS OPEN!');
    g.setBigMessage('DOORS OPEN');
    g.setMessage('KICKBACK LIT • RAMP 3X');
    sound.jackpot();
    set({ kickbackLit: true, rampLit: true });
    flash('jackpot');
    addShake(0.4);
    later(2.2, () => {
      gameRef.dropDown = {};
      set({ dropTargets: [false, false, false] });
    });
  } else {
    g.setMessage(`DOOR ${idx + 1}/3 DOWN`);
  }
  noteCombo('drop');
}

function onRamp() {
  flash('ramp');
  addShake(0.32);
  sound.ramp();
  const g = core();
  const lit = get().rampLit;
  // ramp chain: repeated ramps within 12s escalate by 30% each time
  const now = gameRef.time;
  const chain = now - lastRampAt < 12 ? get().rampChain + 1 : 1;
  lastRampAt = now;
  set({ rampChain: chain });
  const base = lit ? 9000 : 3500;
  g.addScore(Math.round(base * (1 + 0.3 * (chain - 1))), chain > 1 ? `RAMP x${chain}!` : lit ? 'SUPER RAMP!' : 'RAMP');
  if (lit) {
    set({ rampLit: false });
    g.setBigMessage('SUPER RAMP');
  } else if (chain > 1) {
    g.setBigMessage(`RAMP x${chain}`);
  } else {
    g.setMessage('RAMP SHOT — DROP THE DOORS FOR 3X');
  }
  noteCombo('ramp');
}

function onTunnel() {
  flash('tunnel');
  addShake(0.22);
  sound.tunnel();
  const g = core();
  g.addScore(2200, 'WORMHOLE');
  // mystery award
  const roll = Math.random();
  if (roll < 0.22) {
    set({ kickbackLit: true });
    g.popup('KICKBACK LIT', 'WORMHOLE');
    g.setMessage('WORMHOLE — KICKBACK LIT');
  } else if (roll < 0.4) {
    const m = g.bumpMultiplier();
    g.popup(`${m}X MULTIPLIER`, 'WORMHOLE');
    g.setBigMessage(`${m}X`);
  } else if (roll < 0.55) {
    g.addScore(8000, 'WORMHOLE JACKPOT');
    g.setBigMessage('+8K MYSTERY');
  } else if (roll < 0.7 && !get().jackpotLit) {
    set({ jackpotLit: true });
    g.popup('JACKPOT LIT', 'WORMHOLE');
    g.setMessage('WORMHOLE — JACKPOT LIT, SHOOT SCOOP');
  } else {
    g.addScore(1500);
    g.setMessage('WORMHOLE TRANSIT');
  }
  noteCombo('tunnel');
}

export const rules: ThemeRules = {
  reset() {
    set(fresh());
    lastShot = '';
    lastShotT = -99;
    lastRampAt = -99;
  },

  resetBall() {
    set(fresh());
  },

  onEvent(e: PhysEvent) {
    switch (e.type) {
      case 'bumper': onBumper(e.id); break;
      case 'sling': onSling(e.id); break;
      case 'post': sound.post(); core().addScore(30); break;
      case 'target': onTarget(e.id); break;
      case 'drop': onDrop(e.id); break;
      case 'sensor':
        if (e.kind === 'lane') onLane(Number(e.id.replace('lane', '')));
        else if (e.kind === 'inlane') onInlane(e.id);
        else if (e.kind === 'spinner') onSpinner();
        else if (e.kind === 'orbit') onOrbit();
        break;
      case 'capture': onScoop(); break;
      case 'captureEject': sound.eject(); break;
      case 'rideEnter': if (e.id === 'ramp') onRamp(); else onTunnel(); break;
      case 'rideExit': sound.eject(); break;
      default: break;
    }
  },

  onAttractEvent(e: PhysEvent) {
    if (e.type === 'bumper') flash(`bumper:${e.id}`);
    if (e.type === 'sling') flash(`sling:${e.id}`);
  },

  onLaunch(power: number) {
    const [lo, hi] = TABLE.plunger.skillZone;
    const g = core();
    if (power >= lo && power <= hi) g.setMessage('SKILL SHOT WINDOW — HIT A TOP LANE!');
    else if (power < lo) g.setMessage('WEAK LAUNCH...');
    else g.setMessage('FULL POWER!');
  },
};
