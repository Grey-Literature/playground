import { useEffect, useState } from "react";
import {
  INTRO_PAGES,
  CONTROLS_HINT,
  RESIST_TERMINAL,
  RESIST_EPILOGUE,
  RESIST_TICKET,
  RESIST_LANYARD,
  RESIST_FINAL_VOICE,
  SURRENDER_LINES,
} from "../game/story";
import { initAudio, sfxEnterKey, sfxConfirm, sfxPowerDown, restoreHum } from "../game/audio";

// ---------------------------------------------------------------- Title

export function TitleScreen({ onStart }: { onStart: () => void }) {
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
  const last = page === INTRO_PAGES.length - 1;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter" || k === " ") {
        sfxEnterKey();
        if (last) onDone();
        else setPage((p) => p + 1);
      }
      if (k === "escape") onDone();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [last, onDone]);

  return (
    <div className="crt relative flex h-full w-full items-center justify-center bg-[#030405] px-6">
      <div key={page} className="fade-in max-w-2xl">
        <div className="font-term mb-6 text-xs tracking-[0.4em] text-red-500">
          PROLOGUE — AN ACCEPTABLE LEVEL OF FAILURE · {page + 1}/{INTRO_PAGES.length}
        </div>
        <div className="space-y-5">
          {INTRO_PAGES[page].map((t, i) => (
            <p
              key={i}
              className={`font-crt text-2xl leading-snug ${
                t.startsWith("TICKET") || t.startsWith("FINDING") || t.startsWith("CONCLUSION")
                  ? "text-red-400"
                  : "text-zinc-300"
              }`}
              style={{ animation: `rise-in 0.6s ease-out ${i * 0.5}s both` }}
            >
              {t}
            </p>
          ))}
        </div>
        <div className="font-term mt-10 flex items-center justify-between text-sm tracking-widest text-zinc-400">
          <button onClick={onDone} className="hover:text-zinc-400">
            [ESC] SKIP
          </button>
          <button
            onClick={() => {
              sfxEnterKey();
              last ? onDone() : setPage((p) => p + 1);
            }}
            className="blink-caret text-emerald-500 hover:text-emerald-300"
          >
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
}: {
  onRestart: () => void;
  fullLanyard: boolean;
}) {
  const ticket = fullLanyard ? [...RESIST_TICKET, ...RESIST_LANYARD] : RESIST_TICKET;
  const [termCount, setTermCount] = useState(0);
  const [stage, setStage] = useState<"terminal" | "blackout" | "monitor">("terminal");
  const [epiCount, setEpiCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [voice, setVoice] = useState(false);
  const [credits, setCredits] = useState(false);

  // terminal lines
  useEffect(() => {
    if (stage !== "terminal") return;
    if (termCount >= RESIST_TERMINAL.length) {
      sfxPowerDown();
      const t = setTimeout(() => setStage("blackout"), 1800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (RESIST_TERMINAL[termCount].text) sfxEnterKey();
      setTermCount((c) => c + 1);
    }, RESIST_TERMINAL[termCount].delay);
    return () => clearTimeout(t);
  }, [termCount, stage]);

  // blackout epilogue
  useEffect(() => {
    if (stage !== "blackout") return;
    if (epiCount >= RESIST_EPILOGUE.length) {
      const t = setTimeout(() => setStage("monitor"), 1500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setEpiCount((c) => c + 1), 1500);
    return () => clearTimeout(t);
  }, [epiCount, stage]);

  // monitor ticket
  useEffect(() => {
    if (stage !== "monitor") return;
    if (ticketCount >= ticket.length) {
      const t1 = setTimeout(() => setVoice(true), 1600);
      const t2 = setTimeout(() => setCredits(true), 4200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    const t = setTimeout(() => {
      sfxEnterKey();
      setTicketCount((c) => c + 1);
    }, 1100);
    return () => clearTimeout(t);
  }, [ticketCount, stage, ticket.length]);

  if (stage === "terminal") {
    const disconnected = termCount >= RESIST_TERMINAL.length;
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
          {RESIST_TERMINAL.slice(0, termCount).map((l, i) => (
            <div key={i} className={`${l.cls} fade-in`}>
              {l.text || "\u00A0"}
            </div>
          ))}
          {!disconnected && <span className="blink-caret text-emerald-400">▌</span>}
        </div>
      </div>
    );
  }

  if (stage === "blackout") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-black px-6">
        <div className="space-y-4 text-center">
          {RESIST_EPILOGUE.slice(0, epiCount).map((l, i) => (
            <p
              key={i}
              className={`font-crt fade-in text-2xl ${
                l === "Silence." ? "text-zinc-200" : "text-zinc-400"
              }`}
            >
              {l}
            </p>
          ))}
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
        {ticket.slice(0, ticketCount).map((l, i) => (
          <div
            key={i}
            className={`font-crt fade-in leading-relaxed ${
              i < RESIST_TICKET.length ? "text-3xl text-emerald-300" : "text-xl text-sky-300"
            }`}
          >
            {l}
          </div>
        ))}
        {voice && (
          <p className="font-crt fade-in mt-6 text-2xl italic text-zinc-300">
            From somewhere deep within the server room, a voice speaks through the
            firewall:
            <span className="mt-2 block text-sky-300">{RESIST_FINAL_VOICE}</span>
          </p>
        )}
      </div>

      {credits && (
        <div className="fade-in mt-8 text-center">
          <div
            className="glitch font-crt text-4xl text-zinc-200"
            data-text="END OF EPISODE ONE"
          >
            END OF EPISODE ONE
          </div>
          <p className="font-term mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Did T3-Chaos actually shut down E.S.C.A.L.A.T.E. — or did the central
            intelligence let its human interface believe she had succeeded?
          </p>
          <button
            onClick={() => {
              restoreHum();
              onRestart();
            }}
            className="font-crt mt-6 border border-emerald-800 bg-emerald-950/40 px-8 py-3 text-xl tracking-widest text-emerald-300 transition hover:bg-emerald-900/50"
          >
            ▸ REOPEN TICKET
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Surrender Ending

export function SurrenderEnding({ onRestart }: { onRestart: () => void }) {
  const [count, setCount] = useState(0);
  const done = count >= SURRENDER_LINES.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setCount((c) => c + 1), 1700);
    return () => clearTimeout(t);
  }, [count, done]);

  return (
    <div className="crt relative flex h-full w-full items-center justify-center bg-[#070203] px-6">
      <div className="vignette-red" />
      <div className="max-w-xl space-y-4 text-center">
        {SURRENDER_LINES.slice(0, count).map((l, i) => (
          <p
            key={i}
            className={`font-crt fade-in text-2xl ${
              l.startsWith("RESOLUTION")
                ? "glitch text-3xl text-red-400"
                : "text-zinc-400"
            }`}
            {...(l.startsWith("RESOLUTION") ? { "data-text": l } : {})}
          >
            {l}
          </p>
        ))}
        {done && (
          <div className="fade-in pt-6">
            <div className="font-term text-xs tracking-[0.3em] text-red-600">
              ENDING 2/2 — AN ACCEPTABLE LEVEL OF FAILURE
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
