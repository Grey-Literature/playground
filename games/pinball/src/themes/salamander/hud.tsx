// Salamander — HUD side panels, attract title and help copy.

import { Bell, Flame } from 'lucide-react';
import { BonusCard, TiltCard } from '../../engine/hud/HUD';
import { useSalamander, INFERNOS_TO_LIGHT_MAW } from './rules';

const card = 'rounded-xl border border-stone-700/60 bg-stone-950/75 p-3 backdrop-blur-md w-36';

export function StatusPanels() {
  const bells = useSalamander((s) => s.bells);
  const relighting = useSalamander((s) => s.relighting);
  const heat = useSalamander((s) => s.heat);
  const infernos = useSalamander((s) => s.infernos);
  const mawLit = useSalamander((s) => s.mawLit);
  const lanes = useSalamander((s) => s.lanes);
  const landings = useSalamander((s) => s.landings);
  const drops = useSalamander((s) => s.drops);
  return (
    <>
      {/* left panel */}
      <div className="pointer-events-none absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <div className={card}>
          <div className="mb-2 flex items-center gap-1 text-[10px] font-black tracking-[0.25em] text-pa-300">
            <Bell className="h-3 w-3" /> FIRE BELLS
          </div>
          <div className="flex gap-2">
            {bells.map((lit, i) => (
              <div key={i} className={`h-9 flex-1 rounded-t-full border ${relighting ? 'animate-pulse border-yellow-200 bg-yellow-300 shadow-[0_0_14px_rgba(253,224,71,0.9)]' : lit ? 'border-pa-300 bg-pa-400 shadow-[0_0_12px_color-mix(in_srgb,var(--color-pa-400)_85%,transparent)]' : 'border-stone-700 bg-stone-800/70'}`} />
            ))}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[10px] text-stone-400">Ring all 3 → INFERNO</span>
          </div>
          <div className="mt-1 text-[11px] font-black text-pa-300">INFERNOS {infernos}</div>
        </div>
        <div className={card}>
          <div className="mb-2 text-[10px] font-black tracking-[0.25em] text-pb-300">TOP LANES</div>
          <div className="flex gap-2">
            {lanes.map((lit, i) => (
              <div key={i} className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-sm font-black ${lit ? 'border-pb-300 bg-pb-400 text-stone-950 shadow-[0_0_12px_color-mix(in_srgb,var(--color-pb-400)_80%,transparent)]' : 'border-stone-700 bg-stone-800/60 text-stone-500'}`}>
                {['H', 'O', 'T'][i]}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-stone-400">All 3 → multiplier +1</div>
        </div>
        <div className={card}>
          <div className="mb-1 text-[10px] font-black tracking-[0.25em] text-pa-300">EMBER NEST</div>
          <div className="flex justify-between text-[11px] font-bold text-stone-300"><span>Landings</span><span className="text-pa-300">{landings}</span></div>
          <div className="flex justify-between text-[11px] font-bold text-stone-300"><span>Drops</span><span className="text-pa-300">{drops}</span></div>
          <div className="mt-1 text-[10px] text-stone-400">Ramps, Skyshot, Volcano &amp; Maw reach it</div>
        </div>
      </div>
      {/* right panel */}
      <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <div className={`rounded-xl border p-3 backdrop-blur-md w-36 ${mawLit ? 'border-pb-400/70 bg-pb-950/70 shadow-[0_0_24px_color-mix(in_srgb,var(--color-pb-400)_40%,transparent)]' : 'border-stone-700/60 bg-stone-950/75'}`}>
          <div className={`flex items-center gap-1 text-[10px] font-black tracking-[0.25em] ${mawLit ? 'text-pb-300' : 'text-stone-400'}`}>
            <Flame className="h-3 w-3" /> THE MAW
          </div>
          <div className={`font-display mt-1 text-xl font-black ${mawLit ? 'animate-pulse text-pb-300' : 'text-stone-600'}`}>
            {mawLit ? 'LIT' : '— — —'}
          </div>
          <div className="mt-1 flex gap-1.5">
            {Array.from({ length: INFERNOS_TO_LIGHT_MAW }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-sm ${mawLit || i < heat ? 'bg-pa-400 shadow-[0_0_8px_color-mix(in_srgb,var(--color-pa-400)_90%,transparent)]' : 'bg-stone-700'}`} />
            ))}
          </div>
          <div className="mt-1 text-[10px] text-stone-400">{mawLit ? 'FEED IT → MULTIBALL' : `${INFERNOS_TO_LIGHT_MAW} INFERNOs light it`}</div>
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
      <h1 className="font-display text-5xl sm:text-7xl font-black uppercase leading-none tracking-tight">
        <span className="bg-gradient-to-b from-yellow-200 via-pa-400 to-red-700 bg-clip-text text-transparent drop-shadow-[0_0_30px_color-mix(in_srgb,var(--color-pa-500)_55%,transparent)]">SALAMANDER</span>
      </h1>
      <div className="mt-1 text-sm font-bold tracking-[0.35em] text-pb-300">THE FIRE TRIAL</div>
      <div className="mt-1 text-xs font-bold tracking-[0.3em] text-stone-400">CHASE THE HEAT. RULE THE NEST.</div>
    </>
  );
}

export const help = (
  <>
    <p><b className="text-pa-300">Ember Nest:</b> a raised deck over the back of the table. Either ramp, the <b>Skyshot</b> (a full-power plunge), a <b>Volcano</b> launch from an Ember Hold, or a spit from <b>The Maw</b> puts you on top. Two drop holes and two waterfalls bring you back down. A glowing marker shows a ball rolling underneath.</p>
    <p><b className="text-pa-300">Fire Bells:</b> ring all three on the nest for an <b>INFERNO</b> (+5,000). Quick hits chain up to 4X. Two INFERNOs light <b className="text-pb-300">The Maw</b>.</p>
    <p><b className="text-pb-300">The Maw:</b> the mouth in the middle of the field. Feed it while it's lit for <b>INFERNO MULTIBALL</b>. Unlit, it sometimes spits the ball up to the nest.</p>
    <p><b className="text-pa-300">Serpent Tunnel:</b> the mouth on the right swallows a slow ball and lets it go at the left inlane. <b>Top lanes</b> H-O-T raise the multiplier; rolling through an inlane rotates the lit ones.</p>
  </>
);
