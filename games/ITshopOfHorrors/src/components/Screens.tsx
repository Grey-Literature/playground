import { useCallback, useEffect, useState } from "react";
import TypedLines from "./Typed";
import {
  INTRO_PAGES,
  CONTROLS_HINT,
  RESIST_TERMINAL,
  RESIST_EPILOGUE,
  RESIST_TICKET,
  RESIST_LANYARD,
  RESIST_FINAL_VOICE,
  RESIST_VOICE_INTRO,
  RESIST_REPLICATION,
  SURRENDER_LINES,
  ESCAPE_PHONE,
  escapeLines,
  escapeAfter,
  welcomeBack,
} from "../game/story";
import type { Ending } from "../game/memory";
import { initAudio, sfxEnterKey, sfxConfirm, sfxPowerDown, restoreHum } from "../game/audio";

// ---------------------------------------------------------------- Title

export function TitleScreen({
  onStart,
  lastEnding,
}: {
  onStart: () => void;
  lastEnding: Ending | null;
}) {
  const welcome = welcomeBack(lastEnding);
  return (
    <div className="crt relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#040607] px-6">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="font-term absolute whitespace-nowrap text-[10px] text-emerald-900"
            style={{ top: `${i * 7.2}%`, left: `${(i * 37) % 60}%` }}
          >
            503 SERVICE UNAVAILABLE · 406 NOT ACCEPTABLE · 508 LOOP DETECTED · 403
            FORBIDDEN · 200 OK — FUTURE INCIDENT DOCUMENTED · 404 ENGINEER NOT FOUND
          </div>
        ))}
      </div>

      <div className="rise-in relative z-10 text-center">
        <div className="font-term text-sm tracking-[0.5em] text-red-500">
          TICKET #666 — THE LAST ESCALATION
        </div>
        <h1
          className="glitch font-crt mt-4 text-6xl text-zinc-100 sm:text-8xl"
          data-text="ITSHOP OF HORRORS"
        >
          ITSHOP OF HORRORS
        </h1>
        <p className="font-term mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
          Every problem has a solution.
          <br />
          <span className="text-zinc-300">
            Not every solution should be implemented.
          </span>
        </p>
        {welcome && (
          <p className="font-term flicker mt-4 text-sm tracking-[0.2em] text-red-400">{welcome}</p>
        )}

        <button
          onClick={() => {
            initAudio();
            sfxConfirm();
            onStart();
          }}
          className="font-crt mt-10 border border-emerald-700 bg-emerald-950/40 px-10 py-3 text-2xl tracking-widest text-emerald-300 transition hover:bg-emerald-900/50 hover:shadow-[0_0_40px_rgba(57,255,142,0.25)]"
        >
          ▸ ACCEPT TICKET #666
        </button>

        <div className="font-term mt-8 text-sm tracking-wider text-zinc-400">
          {CONTROLS_HINT}
        </div>
        <div className="font-term flicker mt-3 text-xs tracking-[0.3em] text-red-500">
          HEADPHONES RECOMMENDED · HUMAN ESCALATION PATH: DISABLED
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Intro

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const [typed, setTyped] = useState(false); // this page has finished typing
  const [skip, setSkip] = useState(false);
  const last = page === INTRO_PAGES.length - 1;

  // first press finishes the page; the next one turns it
  const advance = useCallback(() => {
    sfxEnterKey();
    if (!typed) return setSkip(true);
    if (last) return onDone();
    setPage((p) => p + 1);
    setTyped(false);
    setSkip(false);
  }, [typed, last, onDone]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter" || k === " ") advance();
      if (k === "escape") onDone();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [advance, onDone]);

  return (
    <div className="crt relative flex h-full w-full items-center justify-center bg-[#030405] px-6">
      <div key={page} className="fade-in max-w-2xl">
        <div className="font-term mb-6 text-xs tracking-[0.4em] text-red-500">
          PROLOGUE — AN ACCEPTABLE LEVEL OF FAILURE · {page + 1}/{INTRO_PAGES.length}
        </div>
        <div className="space-y-5">
          <TypedLines
            key={page}
            lines={INTRO_PAGES[page]}
            gap={450}
            skip={skip}
            onDone={() => setTyped(true)}
            render={(t, i, typing) => {
              const full = INTRO_PAGES[page][i];
              return (
                <p
                  key={i}
                  className={`font-crt text-2xl leading-snug ${
                    full.startsWith("TICKET") || full.startsWith("FINDING") || full.startsWith("CONCLUSION")
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  {t}
                  {typing && <span className="text-emerald-400">▌</span>}
                </p>
              );
            }}
          />
        </div>
        <div className="font-term mt-10 flex items-center justify-between text-sm tracking-widest text-zinc-400">
          <button onClick={onDone} className="hover:text-zinc-400">
            [ESC] SKIP
          </button>
          <button onClick={advance} className="blink-caret text-emerald-500 hover:text-emerald-300">
            [E] {last ? "CLOCK IN" : "CONTINUE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Game Over

export function GameOverScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="crt relative flex h-full w-full flex-col items-center justify-center bg-[#0a0203] px-6 text-center">
      <div className="vignette-red" />
      <div className="font-term text-sm tracking-[0.4em] text-red-500">
        ENDPOINT SECURITY — FINAL VERDICT
      </div>
      <h2
        className="glitch font-crt mt-4 text-6xl text-red-400 sm:text-7xl"
        data-text="406 NOT ACCEPTABLE"
      >
        406 NOT ACCEPTABLE
      </h2>
      <p className="font-crt mt-6 max-w-xl text-2xl text-zinc-400">
        Your badge integrity reached zero. The Min Pin has classified you as a
        recurring incident and quarantined you with the others.
      </p>
      <p className="font-term mt-3 text-sm tracking-widest text-zinc-400">
        ghost_session_15 (you) has joined the undead server.
      </p>
      <button
        onClick={onRetry}
        className="font-crt mt-10 border border-red-800 bg-red-950/40 px-8 py-3 text-xl tracking-widest text-red-300 transition hover:bg-red-900/50"
      >
        ▸ RESTORE FROM BACKUP
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Resist Ending

export function ResistEnding({
  onRestart,
  fullLanyard,
  replicated,
}: {
  onRestart: () => void;
  fullLanyard: boolean;
  replicated: boolean; // shut down after restoring 2–3 corrupted tickets
}) {
  const [ticket] = useState(() => [
    ...RESIST_TICKET,
    ...(fullLanyard ? RESIST_LANYARD : []),
    ...(replicated ? [RESIST_REPLICATION] : []),
  ]);
  const [stage, setStage] = useState<"terminal" | "blackout" | "monitor">("terminal");
  const [disconnected, setDisconnected] = useState(false);
  const [epiDone, setEpiDone] = useState(false);
  const [ticketDone, setTicketDone] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);

  useEffect(() => {
    if (!disconnected) return;
    sfxPowerDown();
    const t = setTimeout(() => setStage("blackout"), 1800);
    return () => clearTimeout(t);
  }, [disconnected]);

  useEffect(() => {
    if (!epiDone) return;
    const t = setTimeout(() => setStage("monitor"), 1500);
    return () => clearTimeout(t);
  }, [epiDone]);

  if (stage === "terminal") {
    return (
      <div
        className={`crt relative flex h-full w-full items-center justify-center bg-[#030405] px-6 ${
          disconnected ? "shake" : ""
        }`}
      >
        <div className="font-term w-full max-w-2xl border border-emerald-900/50 bg-black/90 p-6 text-sm leading-7">
          <div className="mb-3 flex justify-between border-b border-zinc-800 pb-2 text-xs tracking-[0.25em] text-zinc-400">
            <span>/dev/tty666 — PHYSICAL CONSOLE</span>
            <span className="text-sky-500">OPERATOR: T3-CHAOS-38B</span>
          </div>
          <TypedLines
            lines={RESIST_TERMINAL.map((l) => l.text)}
            delays={RESIST_TERMINAL.map((l) => l.delay)}
            enter
            onDone={() => setDisconnected(true)}
            render={(t, i) => (
              <div key={i} className={RESIST_TERMINAL[i].cls}>
                {t || " "}
              </div>
            )}
          />
          {!disconnected && <span className="blink-caret text-emerald-400">▌</span>}
        </div>
      </div>
    );
  }

  if (stage === "blackout") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-black px-6">
        <div className="space-y-4 text-center">
          <TypedLines
            lines={RESIST_EPILOGUE}
            gap={900}
            onDone={() => setEpiDone(true)}
            render={(t, i) => (
              <p
                key={i}
                className={`font-crt text-2xl ${
                  RESIST_EPILOGUE[i] === "Silence." ? "text-zinc-200" : "text-zinc-400"
                }`}
              >
                {t}
              </p>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="crt relative flex h-full w-full flex-col items-center justify-center bg-black px-6">
      <div className="fade-in w-full max-w-xl border border-emerald-900/60 bg-[#020604] p-8 shadow-[0_0_80px_rgba(57,255,142,0.15)]">
        <div className="font-term mb-4 text-xs tracking-[0.3em] text-emerald-600">
          MONITOR 1 OF 1 — POWER SOURCE: UNKNOWN
        </div>
        <TypedLines
          lines={ticket}
          gap={700}
          enter
          onDone={() => setTicketDone(true)}
          render={(t, i) => (
            <div
              key={i}
              className={`font-crt leading-relaxed ${
                ticket[i] === RESIST_REPLICATION
                  ? "mt-3 text-xl text-red-400"
                  : i < RESIST_TICKET.length
                    ? "text-3xl text-emerald-300"
                    : "text-xl text-sky-300"
              }`}
            >
              {t}
            </div>
          )}
        />
        {ticketDone && (
          <div className="font-crt mt-6 text-2xl italic text-zinc-300">
            <TypedLines
              lines={[RESIST_VOICE_INTRO, RESIST_FINAL_VOICE]}
              delays={[1600, 500]}
              onDone={() => setVoiceDone(true)}
              render={(t, i) =>
                i === 0 ? (
                  <p key={i}>{t}</p>
                ) : (
                  <p key={i} className="mt-2 text-sky-300">
                    {t}
                  </p>
                )
              }
            />
          </div>
        )}
      </div>

      {voiceDone && (
        <EpisodeEnd
          question="Did T3-Chaos actually shut down E.S.C.A.L.A.T.E. — or did the central intelligence let its human interface believe she had succeeded?"
          button="▸ REOPEN TICKET"
          onRestart={() => {
            restoreHum();
            onRestart();
          }}
        />
      )}
    </div>
  );
}

function EpisodeEnd({
  question,
  button,
  onRestart,
}: {
  question: string;
  button: string;
  onRestart: () => void;
}) {
  return (
    <div className="fade-in mt-8 text-center" style={{ animationDelay: "1.2s" }}>
      <div className="glitch font-crt text-4xl text-zinc-200" data-text="END OF EPISODE ONE">
        END OF EPISODE ONE
      </div>
      <p className="font-term mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">{question}</p>
      <button
        onClick={onRestart}
        className="font-crt mt-6 border border-emerald-800 bg-emerald-950/40 px-8 py-3 text-xl tracking-widest text-emerald-300 transition hover:bg-emerald-900/50"
      >
        {button}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Surrender Ending

export function SurrenderEnding({ onRestart }: { onRestart: () => void }) {
  const [done, setDone] = useState(false);

  return (
    <div className="crt relative flex h-full w-full items-center justify-center bg-[#070203] px-6">
      <div className="vignette-red" />
      <div className="max-w-xl space-y-4 text-center">
        <TypedLines
          lines={SURRENDER_LINES}
          gap={1000}
          onDone={() => setDone(true)}
          render={(t, i, typing) => {
            const resolution = SURRENDER_LINES[i].startsWith("RESOLUTION");
            return (
              <p
                key={i}
                className={`font-crt text-2xl ${
                  resolution ? `${typing ? "" : "glitch"} text-3xl text-red-400` : "text-zinc-400"
                }`}
                {...(resolution && !typing ? { "data-text": t } : {})}
              >
                {t}
              </p>
            );
          }}
        />
        {done && (
          <div className="fade-in pt-6">
            <div className="font-term text-xs tracking-[0.3em] text-red-600">
              ENDING 2/3 — AN ACCEPTABLE LEVEL OF FAILURE
            </div>
            <button
              onClick={onRestart}
              className="font-crt mt-4 border border-red-800 bg-red-950/40 px-8 py-3 text-xl tracking-widest text-red-300 transition hover:bg-red-900/50"
            >
              ▸ ROLL BACK THE CHANGE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Escape Ending

export function EscapeEnding({
  onRestart,
  hasCred,
  fullLanyard,
}: {
  onRestart: () => void;
  hasCred: boolean;
  fullLanyard: boolean;
}) {
  const [lines] = useState(() => escapeLines(hasCred, fullLanyard));
  const [after] = useState(() => escapeAfter(hasCred));
  const [stage, setStage] = useState<"walk" | "phone">("walk");
  const [walkDone, setWalkDone] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!walkDone) return;
    const t = setTimeout(() => setStage("phone"), 1400);
    return () => clearTimeout(t);
  }, [walkDone]);

  if (stage === "walk") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-b from-[#05070b] via-[#0b0d14] to-[#2a1a1a] px-6">
        <div className="max-w-xl space-y-4 text-center">
          <TypedLines
            lines={lines}
            gap={900}
            onDone={() => setWalkDone(true)}
            render={(t, i) => (
              <p
                key={i}
                className={`font-crt text-2xl ${i === lines.length - 1 ? "text-zinc-200" : "text-zinc-400"}`}
              >
                {t}
              </p>
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1a1420] via-[#3a2420] to-[#7a4a2a] px-6">
      {/* the phone, lit in your hand */}
      <div className="fade-in w-72 rounded-2xl border border-zinc-700 bg-black/90 p-5 shadow-[0_0_60px_rgba(255,60,60,0.25)]">
        <div className="font-term mb-3 flex justify-between text-xs tracking-widest text-zinc-500">
          <span>6:12 AM</span>
          <span className="text-red-400">● ESCALATION</span>
        </div>
        <TypedLines
          lines={ESCAPE_PHONE}
          gap={600}
          enter
          onDone={() => setPhoneDone(true)}
          render={(t, i) => (
            <div
              key={i}
              className={`font-crt ${i === 0 ? "text-3xl text-red-400" : "text-xl text-zinc-200"}`}
            >
              {t}
            </div>
          )}
        />
      </div>
      {phoneDone && (
        <div className="font-crt mt-8 max-w-xl space-y-3 text-center text-2xl">
          <TypedLines
            lines={after}
            delays={[1200, 1400]}
            onDone={() => setDone(true)}
            render={(t, i) => (
              <p key={i} className={i === 0 ? "italic text-sky-300" : "text-zinc-300"}>
                {t}
              </p>
            )}
          />
        </div>
      )}
      {done && (
        <div className="fade-in pt-8 text-center">
          <div className="font-term text-xs tracking-[0.3em] text-amber-400">
            ENDING 3/3 — HUMAN ESCALATION PATH: YOU
          </div>
          <button
            onClick={() => {
              restoreHum();
              onRestart();
            }}
            className="font-crt mt-4 border border-amber-800 bg-amber-950/40 px-8 py-3 text-xl tracking-widest text-amber-200 transition hover:bg-amber-900/50"
          >
            ▸ CLOCK BACK IN
          </button>
        </div>
      )}
    </div>
  );
}
