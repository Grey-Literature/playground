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
} from "./components/Screens";
import { getScript, WHISPERS } from "./game/story";
import { initialFlags, type Flags, type Screen, type Script } from "./game/types";
import { sfxUnlock, sfxDeny, sfxConfirm } from "./game/audio";
import { PIN_IDS, pinCount } from "./game/pickups";

const merge = (a: string[], b?: string[]) =>
  b ? Array.from(new Set([...a, ...b])) : a;

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [flags, setFlags] = useState<Flags>(initialFlags);
  const [integrity, setIntegrity] = useState(100);
  const [dialogue, setDialogue] = useState<Script | null>(null);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const integrityRef = useRef(integrity);
  integrityRef.current = integrity;

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
    }));
    if (d.toast) setToast(d.toast);
    if (d.log) console.log(`%c${d.log}`, "color:#6effa8;font-family:monospace");
    if (d.triggerFinal) setScreen("final");
  }, []);

  const handleInteract = useCallback(
    (id: string) => {
      if (dialogue) return;
      const s = getScript(id, flags);
      // a pin found on the floor is a toast, not a conversation
      if (s.lines.length === 0) applyScript(s);
      else setDialogue(s);
    },
    [dialogue, flags, applyScript],
  );

  const closeDialogue = useCallback(() => {
    if (!dialogue) return;
    const d = dialogue;
    setDialogue(null);
    applyScript(d);
  }, [dialogue, applyScript]);

  // ------- min pin catches you -------
  const handleCaught = useCallback(() => {
    sfxDeny();
    setFlashKey((k) => k + 1);
    setWhisper("QUARANTINE ATTEMPTED. BADGE INTEGRITY DEGRADED. IT REMEMBERS YOUR SMELL.");
    const next = Math.max(0, integrityRef.current - 25);
    setIntegrity(next);
    if (next <= 0) setTimeout(() => setScreen("gameover"), 400);
  }, []);

  // ------- ambient whispers -------
  useEffect(() => {
    if (screen !== "game") return;
    const iv = setInterval(() => {
      if (Math.random() < 0.65)
        setWhisper(WHISPERS[Math.floor(Math.random() * WHISPERS.length)]);
    }, 16000);
    return () => clearInterval(iv);
  }, [screen]);

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
    };
  }, [flags]);

  // ------- restarts -------
  const fullRestart = useCallback(() => {
    setFlags(initialFlags);
    setIntegrity(100);
    setDialogue(null);
    setWhisper(null);
    setToast(null);
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
        {screen === "title" && <TitleScreen onStart={() => setScreen("intro")} />}
        {screen === "intro" && <IntroScreen onDone={() => setScreen("game")} />}

        {screen === "game" && (
          <div className="crt relative h-full w-full overflow-hidden bg-[#020304]">
            <GameCanvas
              key={gameKey}
              flags={flags}
              paused={paused}
              onInteract={handleInteract}
              onCaught={handleCaught}
            />
            <HUD flags={flags} integrity={integrity} />

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

            {dialogue && <DialogueBox lines={dialogue.lines} onClose={closeDialogue} />}
          </div>
        )}

        {screen === "final" && (
          <FinalSequence
            pinCount={pinCount(flags)}
            onResist={() => setScreen("ending-resist")}
            onSurrender={() => setScreen("ending-surrender")}
          />
        )}

        {screen === "ending-resist" && (
          <ResistEnding onRestart={fullRestart} fullLanyard={pinCount(flags) === PIN_IDS.length} />
        )}
        {screen === "ending-surrender" && <SurrenderEnding onRestart={fullRestart} />}
        {screen === "gameover" && <GameOverScreen onRetry={retryFromQuarantine} />}
      </div>
    </div>
  );
}
