// The Last Escalation — HUD side panels, attract title and help copy.
// B1 graybox: plain, readable panels for playtesting the flow. B2 restyles
// them (CRT terminal look, glitch title, takeover tint).

import { BonusCard, TiltCard } from '../../engine/hud/HUD';
import { useGame } from '../../engine/store';
import { ACTIVE } from '../../engine/table';
import {
  useEscalation, ACT_NAMES, ENTITY_NAMES, PINS, PIN_NAMES, MAX_AI_CONTROL, JACKPOTS_TO_SUPER,
  type Entity,
} from './rules';

const card = 'rounded-xl border border-pa-900/70 bg-black/75 p-3 backdrop-blur-md w-40';
const head = 'mb-2 text-[10px] font-black tracking-[0.25em]';
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
    <div className={card}>
      <div className={`${head} text-pa-300`}>ACT {ROMAN[act]}{level > 0 ? ` · LOOP ${level + 1}` : ''}</div>
      <div className="font-display text-lg font-normal leading-tight tracking-wide text-pa-200">{ACT_NAMES[act]}</div>
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
    </div>
  );
}

function LaneCard() {
  const lanes = useEscalation((s) => s.lanes);
  const queue = useEscalation((s) => s.queue);
  return (
    <div className={card}>
      <div className={`${head} text-pa-300`}>D·N·S</div>
      <div className="flex gap-2">
        {lanes.map((lit, i) => (
          <div key={i} className={`flex h-8 flex-1 items-center justify-center rounded border text-sm font-black ${lit ? 'border-pa-300 bg-pa-400 text-black' : 'border-slate-700 bg-slate-900/60 text-slate-500'}`}>
            {'DNS'[i]}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-300"><span>Ticket queue</span><span className="text-pa-300">{queue}</span></div>
    </div>
  );
}

function Lanyard() {
  const pins = useEscalation((s) => s.pins);
  const got = PINS.filter((p) => pins[p]).length;
  return (
    <div className={card}>
      <div className={`${head} text-pa-300`}>LANYARD {got}/{PINS.length}</div>
      <div className="grid grid-cols-4 gap-1">
        {PINS.map((p) => (
          <div key={p} title={`${p} ${PIN_NAMES[p]}`} className={`rounded px-0.5 py-0.5 text-center text-[10px] font-black ${pins[p] ? 'bg-pa-400 text-black' : 'bg-slate-900 text-slate-600'}`}>{p}</div>
        ))}
      </div>
    </div>
  );
}

function AiCard() {
  const ai = useEscalation((s) => s.aiControl);
  const ghosts = useEscalation((s) => s.serverClears);
  const minpin = useEscalation((s) => s.minpinHits);
  const minpinOn = useMinPinOn();
  return (
    <div className={`rounded-xl border p-3 backdrop-blur-md w-40 ${ai > 0 ? 'border-pb-500/70 bg-pb-950/70' : 'border-pa-900/70 bg-black/75'}`}>
      <div className={`${head} ${ai > 0 ? 'text-pb-300' : 'text-slate-400'}`}>AI CONTROL</div>
      <div className="flex gap-1.5">
        {Array.from({ length: MAX_AI_CONTROL }, (_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-sm ${i < ai ? 'bg-pb-400' : 'bg-slate-700'}`} />
        ))}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">{ai > 0 ? 'ASSISTANCE AVAILABLE' : 'Restore tickets to raise it'}</div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-300"><span>Ghost sessions</span><span className="text-pa-300">{ghosts}</span></div>
      <div className="flex justify-between text-[11px] font-bold text-slate-300"><span>Min Pin</span><span className="text-pa-300">{!minpinOn ? 'OFF DUTY' : minpin >= 3 ? 'FRIEND' : `${minpin}/3`}</span></div>
    </div>
  );
}

export function StatusPanels() {
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
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
      <h1 className="font-display text-6xl sm:text-8xl font-normal uppercase leading-none tracking-[0.08em] text-pa-400 drop-shadow-[0_0_10px_color-mix(in_srgb,var(--color-pa-500)_40%,transparent)]">
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
