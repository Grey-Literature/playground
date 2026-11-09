import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import DialogueBox from "./components/DialogueBox";
import HUD from "./components/HUD";
import FinalSequence from "./components/FinalSequence";
import {
  TitleScreen,
  IntroScreen,
  GameOverScreen,
  ResistEnding,
  SurrenderEnding,
  EscapeEnding,
} from "./components/Screens";
import { controlOf } from "./game/tickets";
import { getScript, buildWhisper, patternWhisper, WHISPERS } from "./game/story";
import { initialFlags, type Flags, type Screen, type Script } from "./game/types";
import { sfxUnlock, sfxDeny, sfxConfirm, fadeHum } from "./game/audio";
import { PIN_IDS, pinCount } from "./game/pickups";
import { actOf } from "./game/acts";
import { createWatch, type Dir } from "./game/watch";
import { loadLastEnding, saveLastEnding } from "./game/memory";

const merge = (a: string[], b?: string[]) =>
  b ? Array.from(new Set([...a, ...b])) : a;

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [flags, setFlags] = useState<Flags>(initialFlags);
  const [integrity, setIntegrity] = useState(100);
  const [dialogue, setDialogue] = useState<Script | null>(null);
  // bumps per conversation so back-to-back ones (a choice, then its outcome)
  // get a fresh DialogueBox
  const [dialogueN, setDialogueN] = useState(0);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const integrityRef = useRef(integrity);
  integrityRef.current = integrity;
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  // this run's telemetry (session-only) and the ending from your last visit
  const watchRef = useRef(createWatch());
  const [lastEnding] = useState(loadLastEnding);
  // the silence beat: no hum, no whispers, until your own ticket has printed
  const silentRef = useRef(false);
  const handleSilence = useCallback((silent: boolean) => {
    silentRef.current = silent;
    fadeHum(!silent);
    if (silent) setWhisper(null);
  }, []);

  const paused = dialogue !== null;

  // ------- interactions -------
  const applyScript = useCallback((d: Script) => {
    if (d.effects?.doorOpen) sfxUnlock();
    if (d.collect) sfxConfirm();
    setFlags((f) => ({
      ...f,
      ...d.effects,
      collected: merge(f.collected, d.collect),
      seen: merge(f.seen, d.see),
      restored: merge(f.restored, d.restore),
      deferred: merge(f.deferred, d.defer),
    }));
    if (d.toast) setToast(d.toast);
    if (d.log) console.log(`%c${d.log}`, "color:#6effa8;font-family:monospace");
    if (d.triggerFinal) setScreen("final");
    if (d.triggerEscape) {
      saveLastEnding("escape");
      setScreen("ending-escape");
    }
  }, []);

  // a script with lines opens a conversation; one without just happens
  const play = useCallback(
    (s: Script) => {
      if (s.lines.length === 0) return applyScript(s);
      setDialogue(s);
      setDialogueN((n) => n + 1);
    },
    [applyScript],
  );

  const handleInteract = useCallback(
    (id: string) => {
      if (dialogue) return;
      const w = watchRef.current;
      w.attempts[id] = (w.attempts[id] ?? 0) + 1;
      const s = getScript(id, flags, w);
      if (id.startsWith("search:") && !(id in w.searches)) w.searches[id] = Date.now();
      // a pin found on the floor is a toast, not a conversation
      play(s);
    },
    [dialogue, flags, play],
  );

  const closeDialogue = useCallback(
    (pick?: number) => {
      if (!dialogue) return;
      const d = dialogue;
      setDialogue(null);
      applyScript(d);
      // RESTORE / LEAVE IT (or WALK OUT / NOT YET): play what was picked
      if (pick !== undefined && d.choice) play(d.choice[pick].then);
    },
    [dialogue, applyScript, play],
  );

  // ------- min pin catches you -------
  const handleCaught = useCallback((dir: Dir) => {
    sfxDeny();
    setFlashKey((k) => k + 1);
    const w = watchRef.current;
    w.catches.push({ dir, dark: w.usedDark });
    setWhisper(
      patternWhisper(w) ??
        "QUARANTINE ATTEMPTED. BADGE INTEGRITY DEGRADED. IT REMEMBERS YOUR SMELL.",
    );
    const next = Math.max(0, integrityRef.current - 25);
    setIntegrity(next);
    if (next <= 0) setTimeout(() => setScreen("gameover"), 400);
  }, []);

  // ------- ambient whispers -------
  useEffect(() => {
    if (screen !== "game") return;
    const iv = setInterval(() => {
      if (silentRef.current || Math.random() >= 0.65) return;
      const f = flagsRef.current;
      // from Act II, about one in three is about you
      if (actOf(f) >= 2 && Math.random() < 1 / 3)
        setWhisper(buildWhisper(f, watchRef.current, Date.now(), lastEnding));
      else setWhisper(WHISPERS[Math.floor(Math.random() * WHISPERS.length)]);
    }, 16000);
    return () => clearInterval(iv);
  }, [screen, lastEnding]);

  useEffect(() => {
    if (!whisper) return;
    const t = setTimeout(() => setWhisper(null), 5200);
    return () => clearTimeout(t);
  }, [whisper]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ------- dev-only verification hook (stripped from the release build) -------
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __ishop?: Record<string, unknown> };
    w.__ishop = {
      ...w.__ishop,
      flags: () => flags,
      givePins: (n = PIN_IDS.length) =>
        setFlags((f) => ({ ...f, collected: merge(f.collected, PIN_IDS.slice(0, n)) })),
      give: (patch: Partial<Flags>) => setFlags((f) => ({ ...f, ...patch })),
      whisper: () => {
        const text = buildWhisper(flags, watchRef.current, Date.now(), lastEnding);
        setWhisper(text);
        return text;
      },
    };
  }, [flags, lastEnding]);

  // ------- restarts -------
  const fullRestart = useCallback(() => {
    setFlags(initialFlags);
    setIntegrity(100);
    setDialogue(null);
    setWhisper(null);
    setToast(null);
    watchRef.current = createWatch();
    silentRef.current = false;
    setGameKey((k) => k + 1);
    setScreen("title");
  }, []);

  const retryFromQuarantine = useCallback(() => {
    setIntegrity(100);
    setDialogue(null);
    setGameKey((k) => k + 1);
    setScreen("game");
  }, []);

  return (
    <div className="relative h-full w-full bg-black">
      <div className="relative mx-auto h-full w-full max-w-[1400px]">
        {screen === "title" && (
          <TitleScreen lastEnding={lastEnding} onStart={() => setScreen("intro")} />
        )}
        {screen === "intro" && <IntroScreen onDone={() => setScreen("game")} />}

        {screen === "game" && (
          <div className="crt relative h-full w-full overflow-hidden bg-[#020304]">
            <GameCanvas
              key={gameKey}
              flags={flags}
              paused={paused}
              watch={watchRef.current}
              onInteract={handleInteract}
              onCaught={handleCaught}
              onSilence={handleSilence}
            />
            <HUD
              flags={flags}
              integrity={integrity}
              act={actOf(flags)}
              doorTries={watchRef.current.attempts.door ?? 0}
            />

            {/* damage flash */}
            {flashKey > 0 && (
              <div key={flashKey} className="flash-red pointer-events-none absolute inset-0 z-50" />
            )}

            {/* ambient whisper */}
            {whisper && !dialogue && (
              <div
                key={whisper}
                className="whisper font-crt pointer-events-none absolute inset-x-0 bottom-20 z-30 text-center text-xl italic text-zinc-400"
              >
                {whisper}
              </div>
            )}

            {/* lanyard pin found */}
            {toast && !dialogue && (
              <div
                key={toast}
                className="whisper font-crt pointer-events-none absolute inset-x-0 top-1/4 z-40 mx-auto max-w-xl px-6 text-center text-sky-300 [text-shadow:0_0_12px_rgba(80,160,255,0.5)]"
              >
                <div className="text-3xl">{toast.split(" — ")[0]}</div>
                <div className="mt-1 text-xl italic text-zinc-300">
                  {toast.split(" — ").slice(1).join(" — ")}
                </div>
              </div>
            )}

            {dialogue && (
              <DialogueBox
                key={dialogueN}
                lines={dialogue.lines}
                choice={dialogue.choice}
                onClose={closeDialogue}
              />
            )}
          </div>
        )}

        {screen === "final" && (
          <FinalSequence
            pinCount={pinCount(flags)}
            onResist={() => {
              saveLastEnding("resist");
              setScreen("ending-resist");
            }}
            onSurrender={() => {
              saveLastEnding("surrender");
              setScreen("ending-surrender");
            }}
            onEscape={() => {
              saveLastEnding("escape");
              setScreen("ending-escape");
            }}
          />
        )}

        {screen === "ending-resist" && (
          <ResistEnding
            onRestart={fullRestart}
            fullLanyard={pinCount(flags) === PIN_IDS.length}
            replicated={controlOf(flags) >= 2}
          />
        )}
        {screen === "ending-surrender" && <SurrenderEnding onRestart={fullRestart} />}
        {screen === "ending-escape" && (
          <EscapeEnding
            onRestart={fullRestart}
            hasCred={flags.hasRootCred}
            fullLanyard={pinCount(flags) === PIN_IDS.length}
          />
        )}
        {screen === "gameover" && <GameOverScreen onRetry={retryFromQuarantine} />}
      </div>
    </div>
  );
}
