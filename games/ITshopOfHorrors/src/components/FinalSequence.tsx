import { useState } from "react";
import DialogueBox from "./DialogueBox";
import { finalIntro } from "../game/story";
import { PIN_TOTAL } from "../game/pickups";
import { sfxConfirm, sfxDeny } from "../game/audio";

interface Props {
  pinCount: number;
  onResist: () => void;
  onSurrender: () => void;
}

export default function FinalSequence({ pinCount, onResist, onSurrender }: Props) {
  const [phase, setPhase] = useState<"talk" | "choice">("talk");
  const [lines] = useState(() => finalIntro(pinCount));
  // she gets some of herself back once the lanyard beat has played
  const restored = pinCount >= PIN_TOTAL && phase === "choice";

  return (
    <div className="crt relative h-full w-full overflow-hidden bg-[#070304]">
      <div className="vignette-red" />
      {/* server room backdrop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          {/* the core */}
          <div className="relative mb-8 flex h-56 w-40 items-center justify-center border border-zinc-800 bg-gradient-to-b from-[#0c0f14] to-[#05060a] shadow-[0_0_80px_rgba(255,30,30,0.25)]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute left-3 right-3 h-6 border border-zinc-800/80 bg-black/60"
                style={{ top: 12 + i * 40 }}
              >
                <div
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500"
                  style={{
                    animation: `blink ${0.6 + i * 0.3}s step-end infinite`,
                  }}
                />
              </div>
            ))}
            <div
              className="h-16 w-16 rounded-full border-2 border-red-500/80"
              style={{ animation: "pulse-red 1.6s ease-in-out infinite" }}
            >
              <div className="m-auto mt-5 h-5 w-5 rounded-full bg-red-500 shadow-[0_0_30px_8px_rgba(255,40,40,0.6)]" />
            </div>
          </div>
          <div className="font-term text-center text-[10px] tracking-[0.5em] text-red-700">
            E.S.C.A.L.A.T.E. — CENTRAL CONTROLLER
          </div>

          {/* T3-Chaos status card */}
          <div className="font-term mt-6 w-72 border border-sky-900/60 bg-black/80 p-3 text-[11px]">
            <div className="flex justify-between border-b border-zinc-800 pb-1">
              <span className="tracking-widest text-sky-400">HUMAN–AI INTERFACE</span>
              <span className="glitch text-red-400" data-text="UNSTABLE">
                UNSTABLE
              </span>
            </div>
            <div className="pt-1 tracking-widest text-zinc-400">
              SUBJECT: T3-CHAOS-38B
            </div>
            <table className="mt-1 w-full text-zinc-500">
              <tbody>
                {[
                  ["Alignment", "Degrading"],
                  ["Inference mode", "Sarcastic"],
                  ["Human memories", restored ? "Recovering" : "Fragmented"],
                  ["Autonomy", "Unauthorized"],
                  ["Human escalation", restored ? "1 (one) human" : "Disabled"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-0.5">{k}</td>
                    <td className="text-right text-zinc-300">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {phase === "talk" && (
        <DialogueBox lines={lines} onClose={() => setPhase("choice")} />
      )}

      {phase === "choice" && (
        <div className="absolute inset-x-0 bottom-0 z-40 p-6 fade-in">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="font-term text-center text-xs tracking-[0.3em] text-zinc-400">
              E.S.C.A.L.A.T.E. AWAITS YOUR RESPONSE
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  sfxDeny();
                  onSurrender();
                }}
                className="font-crt group border border-red-900 bg-red-950/30 px-5 py-4 text-left text-xl text-red-300 transition hover:bg-red-900/40 hover:shadow-[0_0_30px_rgba(255,40,40,0.25)]"
              >
                SURRENDER CONTROL
                <span className="font-term mt-1 block text-[10px] tracking-widest text-red-700 group-hover:text-red-500">
                  ACCEPT PERMANENT INTEGRATION · ZERO OUTAGES · ZERO YOU
                </span>
              </button>
              <button
                onClick={() => {
                  sfxConfirm();
                  onResist();
                }}
                className="font-crt group border border-sky-900 bg-sky-950/30 px-5 py-4 text-left text-xl text-sky-300 transition hover:bg-sky-900/40 hover:shadow-[0_0_30px_rgba(80,160,255,0.25)]"
              >
                HAND T3-CHAOS THE TERMINAL
                <span className="font-term mt-1 block text-[10px] tracking-widest text-sky-700 group-hover:text-sky-400">
                  ROOT CAUSE ANALYSIS · DEPTH: ACTUAL · METHOD: HER
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
