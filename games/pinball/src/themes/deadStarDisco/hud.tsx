// Dead Star Disco — HUD side panels, attract title and help copy.

import { Target, Sparkles } from 'lucide-react';
import { BonusCard, TiltCard } from '../../engine/hud/HUD';
import { useDisco } from './rules';

export function StatusPanels() {
  const lanes = useDisco((s) => s.lanes);
  const leftTargets = useDisco((s) => s.leftTargets);
  const rightTargets = useDisco((s) => s.rightTargets);
  const centerTargets = useDisco((s) => s.centerTargets);
  const jackpotLit = useDisco((s) => s.jackpotLit);
  const dropTargets = useDisco((s) => s.dropTargets);
  const kickbackLit = useDisco((s) => s.kickbackLit);
  const rampLit = useDisco((s) => s.rampLit);
  const combo = useDisco((s) => s.combo);
  const rampChain = useDisco((s) => s.rampChain);
  return (
    <>
      {/* left panel */}
      <div className="pointer-events-none absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 backdrop-blur-md w-36">
          <div className="mb-2 text-[10px] font-black tracking-[0.25em] text-emerald-400">TOP LANES</div>
          <div className="flex gap-2">
            {lanes.map((lit, i) => (
              <div key={i} className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-black ${lit ? 'border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'border-slate-700 bg-slate-800/60 text-slate-500'}`}>
                {['D', 'S', 'D'][i]}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">All 3 → multiplier +1</div>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 backdrop-blur-md w-36">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-black tracking-[0.25em] text-pa-300">
            <Target className="h-3 w-3" /> BANKS
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[10px] font-bold text-pa-400">L</span>
              {leftTargets.map((t, i) => (
                <span key={i} className={`h-3 flex-1 rounded-sm ${t ? 'bg-pa-300 shadow-[0_0_8px_color-mix(in_srgb,var(--color-pa-400)_90%,transparent)]' : 'bg-slate-700'}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[10px] font-bold text-pb-400">R</span>
              {rightTargets.map((t, i) => (
                <span key={i} className={`h-3 flex-1 rounded-sm ${t ? 'bg-pb-400 shadow-[0_0_8px_color-mix(in_srgb,var(--color-pb-400)_90%,transparent)]' : 'bg-slate-700'}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[10px] font-bold text-amber-400">C</span>
              {centerTargets.map((t, i) => (
                <span key={i} className={`h-3 flex-1 rounded-sm ${t ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">L+R → multiball • C → jackpot</div>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 backdrop-blur-md w-36">
          <div className="mb-2 text-[10px] font-black tracking-[0.25em] text-pa-300">DOORS</div>
          <div className="flex gap-1.5">
            {dropTargets.map((t, i) => (
              <span key={i} className={`h-7 flex-1 rounded ${t ? 'bg-slate-700/80' : 'bg-pa-400 shadow-[0_0_10px_color-mix(in_srgb,var(--color-pa-400)_80%,transparent)]'}`} />
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">Drop all 3 → kickback + ramp 3X</div>
        </div>
      </div>
      {/* right panel */}
      <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <div className={`rounded-xl border p-3 backdrop-blur-md w-36 ${jackpotLit ? 'border-amber-300/70 bg-amber-950/70 shadow-[0_0_24px_rgba(251,191,36,0.4)]' : 'border-slate-700/60 bg-slate-950/70'}`}>
          <div className={`flex items-center gap-1 text-[10px] font-black tracking-[0.25em] ${jackpotLit ? 'text-amber-300' : 'text-slate-400'}`}>
            <Sparkles className="h-3 w-3" /> JACKPOT
          </div>
          <div className={`font-display mt-1 text-xl font-black ${jackpotLit ? 'animate-pulse text-amber-300' : 'text-slate-600'}`}>
            {jackpotLit ? '25,000' : '— — —'}
          </div>
          <div className="text-[10px] text-slate-400">{jackpotLit ? 'SHOOT SCOOP!' : 'Light C targets'}</div>
        </div>
        <div className={`rounded-xl border p-3 backdrop-blur-md w-36 ${kickbackLit || rampLit ? 'border-pb-400/50 bg-pb-950/50' : 'border-slate-700/60 bg-slate-950/70'}`}>
          <div className="text-[10px] font-black tracking-[0.25em] text-pb-300">SHOTS</div>
          <div className={`mt-1 text-[11px] font-black ${rampLit ? 'animate-pulse text-pa-300' : 'text-slate-500'}`}>RAMP {rampLit ? '3X LIT' : '—'}{rampChain > 1 ? ` x${rampChain}` : ''}</div>
          <div className={`text-[11px] font-black ${kickbackLit ? 'animate-pulse text-amber-300' : 'text-slate-500'}`}>KICKBACK {kickbackLit ? 'READY' : '—'}</div>
          {combo >= 2 && <div className="mt-1 text-[11px] font-black text-yellow-300">COMBO x{combo}</div>}
        </div>
        <BonusCard />
        <TiltCard />
      </div>
    </>
  );
}


export function Title() {
  return (
    <>
      <h1 className="font-display text-5xl sm:text-7xl font-black leading-none tracking-tight">
        <span className="bg-gradient-to-b from-pa-200 via-pa-400 to-pb-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_color-mix(in_srgb,var(--color-pa-400)_50%,transparent)]">DEAD STAR</span>{' '}
        <span className="bg-gradient-to-b from-pb-200 via-pb-400 to-pb-700 bg-clip-text text-transparent drop-shadow-[0_0_30px_color-mix(in_srgb,var(--color-pb-400)_50%,transparent)]">DISCO</span>
      </h1>
      <div className="mt-1 text-sm font-bold tracking-[0.35em] text-slate-400">★ THE STAR IS DEAD. THE PARTY ISN'T. ★</div>
    </>
  );
}

export const help = (
  <>
    <p><b className="text-pa-300">Scoring:</b> pop bumpers build combos • <span className="text-emerald-400 font-bold">D-S-D lanes</span> raise multiplier to 5X • <span className="text-pa-300 font-bold">L</span>+<span className="text-pb-300 font-bold">R</span> banks start MULTIBALL (2X everything) • <span className="text-amber-300 font-bold">C</span> targets light the 25K JACKPOT scoop.</p>
    <p><b className="text-pa-300">Ramp:</b> left-flipper shot up the cyan hoop rides the wire ramp (3,500 — 9,000 when doors have lit it).</p>
    <p><b className="text-pb-300">Wormhole:</b> drop the ball in the magenta hole at mid-right for a pipe ride and a mystery award.</p>
    <p><b className="text-pa-300">Doors:</b> three drop targets on the left. Knock all three down to light <b>kickback</b> (saves a left-lane drain) and a 3X ramp.</p>
    <p><b className="text-yellow-300">Combos:</b> chain different shots within 7s (ramp → tunnel → scoop…) for rising combo bonuses.</p>
    <p><b className="text-pa-300">Upper level:</b> shots up either side climb onto the raised rear deck and its three lanes — a weak shot rolls back down.</p>
  </>
);
