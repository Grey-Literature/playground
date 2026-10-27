import type { Flags } from "../game/types";
import { PINS, PIN_IDS, PIN_TOTAL, pinCount } from "../game/pickups";

interface Props {
  flags: Flags;
  integrity: number;
}

function objective(f: Flags): string {
  if (!f.readTicket) return "Read TICKET #666 — office terminal, west wing.";
  if (!f.gotToken && !f.seen.includes("printer-forecast"))
    return "Investigate the printer that prints by itself — repro room.";
  if (!f.gotToken)
    return "The printer threw your whitelist token into the dark of the repro room. Find it.";
  if (!f.minPinPacified)
    return "Present the whitelist token to the security daemon — east wing. Do not run.";
  if (!f.hasKeycard)
    return "The Min Pin buried something in the den. Follow it. Search where it sits.";
  if (!f.hasRootCred && !f.seen.includes("undead-clue"))
    return "Recover root credentials from the undead server — annex, south-east.";
  if (!f.hasRootCred) return "Search the annex rack that never goes red.";
  if (!f.doorOpen) return "Open the central server room — north hallway.";
  return "Reach the core. Close TICKET #666. Whatever it takes.";
}

export default function HUD({ flags, integrity }: Props) {
  const items: { label: string; have: boolean }[] = [
    { label: "WHITELIST TOKEN", have: flags.gotToken && !flags.minPinPacified },
    { label: "KEYCARD", have: flags.hasKeycard },
    { label: "ROOT CRED", have: flags.hasRootCred },
  ];
  // the cyan ink only shows up once you're carrying it
  if (flags.collected.includes("cyan") && !flags.collected.includes("debt-settled"))
    items.push({ label: "CYAN INK", have: true });
  const pins = pinCount(flags);

  return (
    <>
      {/* ticket / objective */}
      <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-sm">
        <div className="rounded-sm border border-red-900/60 bg-black/80 px-3 py-2">
          <div className="font-term text-[10px] tracking-[0.3em] text-red-500">
            TICKET #666 — THE LAST ESCALATION
          </div>
          <div className="font-crt mt-1 text-lg leading-tight text-zinc-200">
            {objective(flags)}
          </div>
        </div>
      </div>

      {/* integrity */}
      <div className="pointer-events-none absolute right-3 top-3 z-30 w-48">
        <div className="rounded-sm border border-emerald-900/60 bg-black/80 px-3 py-2">
          <div className="font-term flex justify-between text-[10px] tracking-[0.2em] text-zinc-500">
            <span>BADGE INTEGRITY</span>
            <span className={integrity <= 25 ? "text-red-400" : "text-emerald-400"}>
              {integrity}%
            </span>
          </div>
          <div className="mt-1 h-2 w-full border border-zinc-800 bg-zinc-950">
            <div
              className={`h-full transition-all duration-500 ${
                integrity > 50
                  ? "bg-emerald-500/80"
                  : integrity > 25
                    ? "bg-amber-500/80"
                    : "bg-red-500/90"
              }`}
              style={{ width: `${integrity}%` }}
            />
          </div>
          {/* inventory */}
          <div className="mt-2 flex flex-wrap gap-1">
            {items.map((it) => (
              <span
                key={it.label}
                className={`font-term border px-1.5 py-0.5 text-[9px] tracking-wider ${
                  it.have
                    ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-800 text-zinc-700 line-through"
                }`}
              >
                {it.label}
              </span>
            ))}
          </div>
          {/* her lanyard */}
          <div className="font-term mt-2 flex justify-between text-[10px] tracking-[0.2em] text-zinc-500">
            <span>LANYARD</span>
            <span className={pins === PIN_TOTAL ? "text-sky-300" : "text-zinc-500"}>
              {pins}/{PIN_TOTAL}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {PIN_IDS.map((id) => {
              const got = flags.collected.includes(id);
              return (
                <span
                  key={id}
                  className={`font-term border px-1 text-[9px] ${
                    got
                      ? "border-sky-700 bg-sky-950/60 text-sky-300"
                      : "border-zinc-900 text-zinc-800"
                  }`}
                >
                  {got ? PINS[id].code : "···"}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
