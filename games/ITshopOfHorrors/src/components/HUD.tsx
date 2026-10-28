import { useEffect, useRef, useState } from "react";
import type { Flags } from "../game/types";
import type { Act } from "../game/acts";
import { PINS, PIN_IDS, PIN_TOTAL, pinCount } from "../game/pickups";
import { openTickets } from "../game/tickets";

interface Props {
  flags: Flags;
  integrity: number;
  act: Act;
  doorTries: number; // locked-door attempts this run
}

// Act I: your own ticket, in plain words.
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

// Act II on: the tracker is E.S.C.A.L.A.T.E.'s now. Still true. Still helpful.
// The last one is completely accurate, and that's the worst one.
function assisted(f: Flags): string {
  if (!f.minPinPacified)
    return "Present the whitelist token to unit MIN-PIN, east wing. Compliance makes this easier for both of us.";
  if (!f.hasKeycard)
    return "Retrieve the keycard from quarantine vault /den/rack. You are doing very well.";
  if (!f.hasRootCred && !f.seen.includes("undead-clue"))
    return "Consult the undead server, annex. It will tell you about a key. Listen to it.";
  if (!f.hasRootCred)
    return "Search the annex rack that never went red. Its light is green. Green means go.";
  if (!f.doorOpen)
    return "Open the server room. Bring her credential. I have been waiting for someone with your access.";
  return "Reach the core. She is expecting you. So am I.";
}

// Fourth try at the locked door: the tracker quietly answers the question.
function doorAnswer(f: Flags): string | null {
  const missing: string[] = [];
  if (!f.hasKeycard) missing.push("KEYCARD — /den/, the rack the Min Pin guards");
  if (!f.hasRootCred) missing.push("ROOT CREDENTIAL — annex, the rack that never went red");
  return missing.length ? `MISSING: ${missing.join(" · ")}. You're welcome.` : null;
}

export default function HUD({ flags, integrity, act, doorTries }: Props) {
  // entering Act II, the box glitches once and comes back in its colours
  const [glitch, setGlitch] = useState(false);
  const lastAct = useRef(act);
  useEffect(() => {
    if (lastAct.current < 2 && act >= 2) {
      setGlitch(true);
      const t = setTimeout(() => setGlitch(false), 1200);
      lastAct.current = act;
      return () => clearTimeout(t);
    }
    lastAct.current = act;
  }, [act]);
  const owned = act >= 2 && !glitch;
  const answer = !flags.doorOpen && doorTries >= 4 ? doorAnswer(flags) : null;
  const text = glitch
    ? "REASSIGNING TICKET OWNER ▒▒▒▒▒▒▒▒"
    : (answer ?? (owned ? assisted(flags) : objective(flags)));
  // some of its objectives point at its own corrupted tickets
  const extra = owned && !flags.doorOpen ? openTickets(flags)[0] : undefined;
  // what the restored tickets did to your badge
  const badge = [
    flags.restored.includes("dns") && "ID: RESOLVED BY ALL CAMERAS",
    flags.restored.includes("backup") && "STATUS: RETAINED",
    flags.restored.includes("trace") && "CONNECTION: ROGUE",
  ].filter(Boolean) as string[];

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
        <div
          className={`rounded-sm border px-3 py-2 ${glitch ? "hud-glitch" : ""} ${
            owned ? "border-red-600/80 bg-red-950/50" : "border-red-900/60 bg-black/80"
          }`}
        >
          <div className="font-term text-xs tracking-[0.25em] text-red-400">
            {owned ? "E.S.C.A.L.A.T.E. // ASSISTED OBJECTIVE" : "TICKET #666 — THE LAST ESCALATION"}
          </div>
          <div
            className={`font-crt mt-1 text-lg leading-tight ${owned ? "text-red-200" : "text-zinc-200"}`}
          >
            {text}
          </div>
          {extra && (
            <div className="font-term mt-2 border-t border-red-900/60 pt-1.5 text-xs tracking-wider text-red-300">
              ALSO ASSIGNED: {extra.code} · {extra.title} — {extra.where}
            </div>
          )}
        </div>
      </div>

      {/* integrity */}
      <div className="pointer-events-none absolute right-3 top-3 z-30 w-60">
        <div className="rounded-sm border border-emerald-900/60 bg-black/80 px-3 py-2">
          <div className="font-term flex justify-between text-xs tracking-[0.15em] text-zinc-400">
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
          {badge.map((b) => (
            <div key={b} className="font-term mt-1 text-[11px] tracking-[0.15em] text-red-400">
              {b}
            </div>
          ))}
          {/* inventory */}
          <div className="mt-2 flex flex-wrap gap-1">
            {items.map((it) => (
              <span
                key={it.label}
                className={`font-term border px-1.5 py-0.5 text-[11px] tracking-wider ${
                  it.have
                    ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-700 text-zinc-500 line-through"
                }`}
              >
                {it.label}
              </span>
            ))}
          </div>
          {/* her lanyard */}
          <div className="font-term mt-2 flex justify-between text-xs tracking-[0.15em] text-zinc-400">
            <span>LANYARD</span>
            <span className={pins === PIN_TOTAL ? "text-sky-300" : "text-zinc-400"}>
              {pins}/{PIN_TOTAL}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {PIN_IDS.map((id) => {
              const got = flags.collected.includes(id);
              return (
                <span
                  key={id}
                  className={`font-term border px-1 text-[11px] ${
                    got
                      ? "border-sky-700 bg-sky-950/60 text-sky-300"
                      : "border-zinc-800 text-zinc-600"
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
