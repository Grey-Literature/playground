// Salamander — scoring rules and table state (THE FIRE TRIAL).
//
//   FIRE BELLS (on the nest): each hit lights its bell and chains a bell combo
//     (400 × combo, capped ×4). All three lit → INFERNO +5,000; the bells go
//     dark and relight after 2.4 s.
//   Two INFERNOs light THE MAW. Shoot the lit Maw → INFERNO MULTIBALL.
//   An unlit Maw pays 1,250 and spits the ball up to the nest 45% of the time.
//   EMBER HOLD saucers pay 750; 15% of ejects become a VOLCANO launch to the nest.
//   Ramps 1,000 · Serpent Tunnel 1,500 (+500 on release) · Skyshot 2,500 ·
//   every arrival on the nest +500 · drop hole 750 · waterfall 400.
//   Top lanes 200 each, all three 2,000 + multiplier (skill-shot window as DSD).

import { create } from 'zustand';
import type { PhysEvent } from '../../engine/types';
import type { ThemeRules } from '../../engine/theme';
import { useGame } from '../../engine/store';
import { gameRef, flash, addShake, spinnerOf, ejectIntoRide } from '../../engine/runtime';
import { TABLE } from '../../engine/table';
import { sound } from '../../engine/audio';
import { fire } from './sound';

export const BELL_RELIGHT = 2.4; // seconds the bells stay dark after an INFERNO
export const INFERNOS_TO_LIGHT_MAW = 2;
export const MAW_SPIT_CHANCE = 0.45;
export const VOLCANO_CHANCE = 0.15;

export interface SalamanderState {
  bells: boolean[];
  /** True while the bells are dark after an INFERNO. */
  relighting: boolean;
  /** INFERNOs toward lighting the Maw (0..INFERNOS_TO_LIGHT_MAW). */
  heat: number;
  /** INFERNOs this game. */
  infernos: number;
  mawLit: boolean;
  lanes: boolean[];
  bellCombo: number;
  landings: number;
  drops: number;
}

const fresh = (): SalamanderState => ({
  bells: [false, false, false],
  relighting: false,
  heat: 0,
  infernos: 0,
  mawLit: false,
  lanes: [false, false, false],
  bellCombo: 0,
  landings: 0,
  drops: 0,
});

export const useSalamander = create<SalamanderState>()(() => fresh());

const core = () => useGame.getState();
const get = () => useSalamander.getState();
const set = (p: Partial<SalamanderState>) => useSalamander.setState(p);

let lastBellAt = -99;
let relightTimer: ReturnType<typeof setTimeout> | null = null;

function clearRelight() {
  if (relightTimer) clearTimeout(relightTimer);
  relightTimer = null;
}

function onBell(id: string) {
  const idx = Number(id.slice(4));
  flash(`bumper:${id}`);
  addShake(0.1);
  const g = core();
  const now = gameRef.time;
  const combo = now - lastBellAt < 1.6 ? Math.min(4, get().bellCombo + 1) : 1;
  lastBellAt = now;
  set({ bellCombo: combo });
  fire.bell(idx, combo);
  g.addScore(400 * combo, combo > 1 ? `BELL x${combo}` : undefined);
  const s = get();
  if (s.relighting || s.bells[idx]) return;
  const bells = [...s.bells]; bells[idx] = true;
  set({ bells });
  if (!bells.every(Boolean)) {
    g.setMessage(`FIRE BELL ${bells.filter(Boolean).length}/3 — RING ALL THREE`);
    return;
  }
  // INFERNO
  const heat = Math.min(INFERNOS_TO_LIGHT_MAW, s.heat + 1);
  const mawLit = s.mawLit || heat >= INFERNOS_TO_LIGHT_MAW;
  set({ relighting: true, heat, mawLit, infernos: s.infernos + 1 });
  g.addScore(5000, 'INFERNO');
  g.setBigMessage('INFERNO!');
  g.setMessage(mawLit ? 'THE MAW IS LIT — FEED IT FOR MULTIBALL' : `INFERNO ${heat}/${INFERNOS_TO_LIGHT_MAW} — ONE MORE LIGHTS THE MAW`);
  fire.inferno();
  flash('inferno');
  addShake(0.45);
  clearRelight();
  relightTimer = setTimeout(() => {
    relightTimer = null;
    set({ bells: [false, false, false], relighting: false });
  }, BELL_RELIGHT * 1000);
}

function onEmber(id: string) {
  flash(`bumper:${id}`);
  addShake(0.08);
  const combo = gameRef.bumperCombo;
  sound.bumper(combo);
  core().addScore(120 + Math.min(combo, 15) * 25);
  if (combo > 0 && combo % 8 === 0) core().popup(`COMBO x${combo}`, 'EMBER STORM');
}

function onPost(id: string) {
  const g = core();
  if (id === 'spire') { flash('spire'); sound.post(); g.addScore(250); return; }
  if (id === 'moonA' || id === 'moonB') { flash(`moon:${id}`); sound.post(); addShake(0.12); g.addScore(300); return; }
  if (id === 'pendulum') { flash('pendulum'); sound.post(); addShake(0.12); g.addScore(300); return; }
  sound.post();
  g.addScore(30);
}

function onLane(idx: number) {
  flash(`lane:${idx}`);
  sound.lane();
  const g = core();
  const s = get();
  if (s.lanes[idx]) { g.addScore(150); return; }
  const lanes = [...s.lanes]; lanes[idx] = true;
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
  g.addScore(200);
  if (lanes.every(Boolean)) {
    const mult = g.bumpMultiplier();
    set({ lanes: [false, false, false] });
    g.addScore(2000, mult >= 5 ? 'MAX MULTIPLIER 5X!' : `MULTIPLIER ${mult}X`);
    g.setBigMessage(mult >= 5 ? 'MAX 5X!' : `${mult}X MULTIPLIER`);
    sound.jackpot();
  } else {
    set({ lanes });
    g.setMessage(`LANE ${idx + 1}/3 — LIGHT ALL FOR MULTIPLIER`);
  }
}

function onInlane() {
  sound.inlane();
  core().addScore(200);
  // lane change: rotating lit lanes lets the player aim the multiplier
  const l = get().lanes;
  set({ lanes: [l[2], l[0], l[1]] });
}

function onMaw() {
  flash('maw');
  fire.hiss();
  addShake(0.25);
  const g = core();
  if (get().mawLit) {
    set({ mawLit: false, heat: 0 });
    g.addScore(10000, 'INFERNO MULTIBALL');
    g.startMultiball();
    g.setBigMessage('INFERNO MULTIBALL');
    g.setMessage('INFERNO MULTIBALL — EVERYTHING BURNS 2X');
    flash('inferno');
    return;
  }
  g.addScore(1250, 'THE MAW');
  if (Math.random() < MAW_SPIT_CHANCE) {
    ejectIntoRide('maw', 'mawSpit');
    g.setMessage('THE MAW SPITS — UP TO THE NEST');
  } else {
    g.setMessage(get().heat > 0 ? 'THE MAW HUNGERS — ONE MORE INFERNO' : 'THE MAW — RING THE BELLS TO LIGHT IT');
  }
}

function onHold(id: string) {
  flash(`hold:${id}`);
  sound.scoop();
  const g = core();
  g.addScore(750);
  if (Math.random() < VOLCANO_CHANCE) {
    ejectIntoRide(id, id === 'holdL' ? 'volcanoL' : 'volcanoR');
    g.setBigMessage('VOLCANO!');
  } else {
    g.setMessage('EMBER HOLD');
  }
}

function onRideEnter(id: string) {
  const g = core();
  switch (id) {
    case 'rampL': case 'rampR':
      flash(`ramp:${id}`); sound.ramp(); addShake(0.2);
      g.addScore(1000, 'RAMP');
      break;
    case 'serpent':
      flash('serpent'); sound.tunnel(); fire.hiss(); addShake(0.2);
      g.addScore(1500, 'SERPENT TUNNEL');
      g.setMessage('INTO THE SERPENT…');
      break;
    case 'skyshot':
      flash('skyshot'); fire.whoosh(); addShake(0.3);
      g.addScore(2500, 'SKYSHOT');
      g.setBigMessage('SKYSHOT!');
      gameRef.skillWindow = 0;
      break;
    case 'volcanoL': case 'volcanoR':
      flash('volcano'); fire.whoosh(); addShake(0.35);
      g.addScore(1500, 'VOLCANO LAUNCH');
      break;
    case 'mawSpit':
      flash('maw'); fire.whoosh(0.05); addShake(0.3);
      g.addScore(1500, 'THE MAW SPITS');
      break;
    default: break;
  }
}

function onLayer(e: Extract<PhysEvent, { type: 'layer' }>) {
  const g = core();
  if (e.to !== 'field') {
    flash('nest');
    fire.land();
    set({ landings: get().landings + 1 });
    g.addScore(500, 'NEST LANDING');
    g.setMessage('ON THE EMBER NEST — RING THE FIRE BELLS');
  } else if (e.via === 'hole') {
    flash(`drop:${e.id}`);
    fire.sizzle();
    set({ drops: get().drops + 1 });
    g.addScore(750, 'DROP HOLE');
    g.setMessage('THROUGH THE NEST — UNDER THE FIRE');
  } else {
    flash('waterfall');
    sound.orbit();
    g.addScore(400);
    g.setMessage('WATERFALL');
  }
}

export const rules: ThemeRules = {
  reset() {
    clearRelight();
    set(fresh());
    lastBellAt = -99;
  },

  resetBall() {
    // lit lanes and bell progress are per ball; heat, the lit Maw and counts carry over
    clearRelight();
    set({ bells: [false, false, false], relighting: false, lanes: [false, false, false], bellCombo: 0 });
  },

  onEvent(e: PhysEvent) {
    switch (e.type) {
      case 'bumper': if (e.id.startsWith('bell')) onBell(e.id); else onEmber(e.id); break;
      case 'sling': flash(`sling:${e.id}`); addShake(0.1); sound.sling(); core().addScore(80); break;
      case 'post': onPost(e.id); break;
      case 'sensor':
        if (e.kind === 'lane') onLane(Number(e.id.replace('lane', '')));
        else if (e.kind === 'inlane') onInlane();
        else if (e.kind === 'spinner') {
          gameRef.flashes.spinner = Math.min(1, (gameRef.flashes.spinner ?? 0) + 0.5);
          spinnerOf('spinner').vel += 14;
          sound.spinner();
          core().addScore(180);
        }
        break;
      case 'blast': flash(`vent:${e.id}`); fire.whoosh(); addShake(0.25); core().addScore(250); break;
      case 'capture': if (e.id === 'maw') onMaw(); else onHold(e.id); break;
      case 'captureEject': sound.eject(); break;
      case 'rideEnter': onRideEnter(e.id); break;
      case 'rideExit':
        if (e.id === 'serpent') { flash('serpent'); fire.hiss(); core().addScore(500, 'SERPENT RELEASE'); }
        else sound.eject();
        break;
      case 'layer': onLayer(e); break;
      default: break;
    }
  },

  onAttractEvent(e: PhysEvent) {
    if (e.type === 'bumper') flash(`bumper:${e.id}`);
    if (e.type === 'sling') flash(`sling:${e.id}`);
    if (e.type === 'blast') flash(`vent:${e.id}`);
  },

  onLaunch(power: number) {
    const [lo, hi] = TABLE.plunger.skillZone;
    const g = core();
    if (power >= 0.85) g.setMessage('FULL HEAT — SKYSHOT!');
    else if (power >= lo && power <= hi) g.setMessage('SKILL SHOT WINDOW — HIT A TOP LANE!');
    else if (power < lo) g.setMessage('A FLICKER...');
    else g.setMessage('HOT LAUNCH');
  },
};
