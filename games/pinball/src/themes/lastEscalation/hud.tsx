// The Last Escalation — HUD side panels, attract title, help copy, and the
// two one-shot screen effects: E.S.C.A.L.A.T.E.'s takeover (Act II, a single
// red tint in and out) and REMOVE FROM PRODUCTION's power-down (one dip to
// black, 360 ms in, about 1 s out). Neither flashes more than once.

import { useEffect, useRef, type ReactNode } from 'react';
import { BonusCard, TiltCard } from '../../engine/hud/HUD';
import { sound } from '../../engine/audio';
import { esc } from './sound';
import { useGame } from '../../engine/store';
import { ACTIVE } from '../../engine/table';
import {
  useEscalation, debugNextAct, ACT_NAMES, ENTITY_NAMES, PINS, PIN_NAMES, MAX_AI_CONTROL, JACKPOTS_TO_SUPER,
  type Entity,
} from './rules';

const head = 'mb-2 font-body text-[10px] font-bold tracking-[0.2em]';
/** CRT scanlines over every terminal panel. */
const SCANLINES = 'repeating-linear-gradient(0deg, rgba(57,255,142,0.045) 0 1px, transparent 1px 3px)';

/**
 * A terminal panel: green phosphor until E.S.C.A.L.A.T.E. takes over (Act II
 * onward), then its border and prompt go red. `alert` forces red.
 */
function Term({ title, alert, children }: { title: ReactNode; alert?: boolean; children: ReactNode }) {
  const taken = useEscalation((s) => s.act >= 2);
  const red = alert || taken;
  return (
    <div
      className={`w-44 rounded-md border bg-[#020604]/85 p-3 font-body backdrop-blur-md ${red ? 'border-pb-500/55 shadow-[0_0_18px_rgba(255,59,59,0.18)]' : 'border-pa-500/35 shadow-[0_0_18px_rgba(57,255,142,0.12)]'}`}
      style={{ backgroundImage: SCANLINES }}
    >
      <div className={`${head} ${red ? 'text-pb-300' : 'text-pa-300'}`}><span className="opacity-60">&gt; </span>{title}</div>
      {children}
    </div>
  );
}
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

/** Is the Min Pin on the table at this tier? (It stays home on Super Easy.) */
function useMinPinOn() {
  useGame((s) => s.difficulty);
  return ACTIVE.kinematics.some((k) => k.id === 'minpin');
}

function ActCard() {
  const act = useEscalation((s) => s.act);
  const level = useEscalation((s) => s.level);
  const escalated = useEscalation((s) => s.escalated);
  const resolved = useEscalation((s) => s.ticketsResolved);
  const corrupted = useEscalation((s) => s.corrupted);
  const silenceUntil = useEscalation((s) => s.silenceUntil);
  const coreLit = useEscalation((s) => s.coreLit);
  const jackpots = useEscalation((s) => s.jackpots);
  const minpinOn = useMinPinOn();
  return (
    <Term title={<>ACT_{ROMAN[act]}{level > 0 ? `.loop${level + 1}` : ''}</>}>
      <div className={`font-display text-xl font-normal leading-tight tracking-wide ${act >= 2 ? 'text-pb-200' : 'text-pa-200'}`}>{ACT_NAMES[act]}</div>
      <div className="mt-2 space-y-0.5 text-[10px] text-slate-300">
        {act === 1 && (Object.keys(ENTITY_NAMES) as Entity[]).map((e) => (
          <div key={e} className={escalated[e] ? 'text-pa-300' : 'text-slate-500'}>{escalated[e] ? '■' : '□'} {ENTITY_NAMES[e]}{e === 'minpin' && !minpinOn ? ' (off duty)' : ''}</div>
        ))}
        {act === 1 && <div className="pt-1 text-slate-400">Escalate 2 to continue</div>}
        {act === 2 && <div>{corrupted ? <span className="text-pb-300">CORRUPTED TICKET — SHOOT THE PRINTER</span> : 'Shoot the printer'}</div>}
        {act === 2 && <div className="text-slate-400">Tickets resolved {resolved}/2</div>}
        {act === 3 && <div className={silenceUntil > 0 ? 'text-pa-200' : 'text-pb-300'}>{silenceUntil > 0 ? 'THE SILENCE · 2× SCORING' : coreLit ? 'THE CORE IS LIT' : '…'}</div>}
        {act === 4 && <div className="text-pb-300">CORE JACKPOTS {jackpots}/{JACKPOTS_TO_SUPER}</div>}
      </div>
    </Term>
  );
}

function LaneCard() {
  const lanes = useEscalation((s) => s.lanes);
  const queue = useEscalation((s) => s.queue);
  return (
    <Term title="dns.status">
      <div className="flex gap-2">
        {lanes.map((lit, i) => (
          <div key={i} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm font-black ${lit ? 'border-pa-300 bg-pa-400 text-black shadow-[0_0_12px_rgba(57,255,142,0.5)]' : 'border-pa-900 bg-black/60 text-pa-900'}`}>
            {'DNS'[i]}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-300"><span>Ticket queue</span><span className="text-pa-300">{queue}</span></div>
    </Term>
  );
}

function Lanyard() {
  const pins = useEscalation((s) => s.pins);
  const got = PINS.filter((p) => pins[p]).length;
  return (
    <Term title={`lanyard ${got}/${PINS.length}`}>
      <div className="grid grid-cols-4 gap-1">
        {PINS.map((p) => (
          <div key={p} title={`${p} ${PIN_NAMES[p]}`} className={`rounded px-0.5 py-0.5 text-center text-[10px] font-black ${pins[p] ? 'bg-pa-400 text-black' : 'bg-black/60 text-pa-900'}`}>{p}</div>
        ))}
      </div>
    </Term>
  );
}

function AiCard() {
  const ai = useEscalation((s) => s.aiControl);
  const ghosts = useEscalation((s) => s.serverClears);
  const minpin = useEscalation((s) => s.minpinHits);
  const minpinOn = useMinPinOn();
  return (
    <Term title="E.S.C.A.L.A.T.E." alert={ai > 0}>
      <div className="mb-1 text-[10px] font-bold tracking-[0.2em] text-slate-400">AI CONTROL</div>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_AI_CONTROL }, (_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-sm ${i < ai ? 'bg-pb-400 shadow-[0_0_8px_rgba(255,59,59,0.6)]' : 'bg-slate-800'}`} />
        ))}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">{ai > 0 ? 'ASSISTANCE AVAILABLE' : 'Restore tickets to raise it'}</div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-300"><span>Ghost sessions</span><span className="text-pa-300">{ghosts}</span></div>
      <div className="flex justify-between text-[11px] font-bold text-slate-300"><span>Min Pin</span><span className="text-pa-300">{!minpinOn ? 'OFF DUTY' : minpin >= 3 ? 'FRIEND' : `${minpin}/3`}</span></div>
    </Term>
  );
}

/** The takeover tint and the power-down dip: one-shot, driven by counters in the story store. */
function ScreenEffects() {
  const takeovers = useEscalation((s) => s.takeovers);
  const powerdowns = useEscalation((s) => s.powerdowns);
  const tint = useRef<HTMLDivElement>(null);
  const dip = useRef<HTMLDivElement>(null);
  const seen = useRef({ takeovers, powerdowns });
  useEffect(() => {
    if (takeovers > seen.current.takeovers) {
      tint.current?.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
        { duration: 2600, easing: 'ease-in-out' },
      );
    }
    seen.current.takeovers = takeovers;
  }, [takeovers]);
  useEffect(() => {
    if (powerdowns > seen.current.powerdowns) {
      dip.current?.animate(
        [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0.9, offset: 0.45 }, { opacity: 0 }],
        { duration: 1800, easing: 'ease-in-out' },
      );
    }
    seen.current.powerdowns = powerdowns;
  }, [powerdowns]);
  return (
    <>
      <div ref={tint} className="pointer-events-none absolute inset-0 z-30 opacity-0" style={{ boxShadow: 'inset 0 0 180px 50px rgba(255,59,59,0.45)', background: 'rgba(255,59,59,0.06)' }} />
      <div ref={dip} className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0" />
    </>
  );
}

/**
 * ?debug pages: `]` skips to the next beat of the story (see debugNextAct);
 * `[` is a sound check for the creatures — quack-quack, the Min Pin's growl
 * and bark, then its friend-shaped yip.
 */
function DebugKeys() {
  const unranked = useGame((s) => s.unranked);
  useEffect(() => {
    if (!unranked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ']') debugNextAct();
      if (e.key === '[') {
        sound.ensure();
        esc.quack();
        setTimeout(() => { esc.growl(); esc.bark(false, 0.55); }, 800);
        setTimeout(() => esc.bark(true), 2200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unranked]);
  return null;
}

export function StatusPanels() {
  return (
    <>
      <ScreenEffects />
      <DebugKeys />
      <div className="pointer-events-none absolute left-3 top-32 z-20 hidden flex-col gap-3 lg:flex">
        <ActCard />
        <LaneCard />
        <Lanyard />
      </div>
      <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <AiCard />
        <BonusCard />
        <TiltCard />
      </div>
    </>
  );
}

export function Title() {
  return (
    <>
      <h1 data-text="TICKET #666" className="esc-glitch font-display text-6xl sm:text-8xl font-normal uppercase leading-none tracking-[0.08em] text-pa-400 drop-shadow-[0_0_10px_color-mix(in_srgb,var(--color-pa-500)_40%,transparent)]">
        TICKET #666
      </h1>
      <div className="mt-1 text-sm font-bold tracking-[0.35em] text-pb-400">THE LAST ESCALATION</div>
      <div className="mt-1 text-xs font-bold tracking-[0.2em] text-slate-400">EVERY PROBLEM HAS A SOLUTION. NOT EVERY SOLUTION SHOULD BE IMPLEMENTED.</div>
    </>
  );
}

export const help = (
  <>
    <p><b className="text-pa-300">Act I · Something is wrong:</b> escalate two of the four: hit the shot <b>the Printer</b> predicts (its insert lights up), hit <b>the Min Pin</b> 3 times until it's FRIEND-SHAPED (Easy and up), clear <b>the Undead Server</b> 3 times (it always comes back), or run <b>the Ticket Queue</b> spinner up to 16 open tickets in one ball.</p>
    <p><b className="text-pa-300">Act II · Something knows you're here:</b> the Printer prints <b className="text-pb-300">corrupted tickets</b>. Shoot it again within 8 seconds to <b>RESTORE</b> (big points, and AI CONTROL goes up), or let it go. Two tickets either way.</p>
    <p><b className="text-pa-300">Act III · Something needs you:</b> <b>The Silence</b> — 25 seconds of double scoring. Then <b className="text-pb-300">the Core</b> lights.</p>
    <p><b className="text-pa-300">Act IV · The last escalation:</b> shoot the lit Core for <b>T3-CHAOS MULTIBALL</b>. Core shots are jackpots; the third is <b>REMOVE FROM PRODUCTION</b>. Then Ticket #666 reopens.</p>
    <p><b className="text-pa-300">D·N·S lanes</b> raise the multiplier (it was DNS). The <b>lanyard</b> collects 11 HTTP codes from different shots — all 11 restore the human escalation path. With AI CONTROL, an early drain gets <b className="text-pb-300">ASSISTANCE PROVIDED</b>: a free ball, for half your bonus.</p>
  </>
);
