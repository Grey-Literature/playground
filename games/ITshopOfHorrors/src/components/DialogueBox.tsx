import { useEffect, useRef, useState } from "react";
import type { DialogueLine } from "../game/types";
import { sfxEnterKey, sfxKeyTap } from "../game/audio";
import { TYPE_MS } from "./Typed";

interface Props {
  lines: DialogueLine[];
  // optional two-way choice on the last line (RESTORE / LEAVE IT)
  choice?: { label: string; hint: string }[];
  onClose: (pick?: number) => void;
}

export default function DialogueBox({ lines, choice, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  // nothing pre-selected: mashing E through a conversation must never make
  // the choice for you
  const [sel, setSel] = useState(-1);
  const doneRef = useRef(false);
  // typed count lives in a ref so the click sound fires once per key, outside
  // React's state updater, and a skip can jump it to the end
  const typedRef = useRef(0);

  const line = lines[idx];
  const fullyTyped = chars >= line.text.length;
  const choosing = !!choice && idx === lines.length - 1 && fullyTyped;

  const choose = (pick: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    sfxEnterKey();
    onClose(pick);
  };

  // typewriter
  useEffect(() => {
    const text = lines[idx].text;
    typedRef.current = 0;
    setChars(0);
    const iv = setInterval(() => {
      if (typedRef.current >= text.length) {
        clearInterval(iv);
        return;
      }
      if (text[typedRef.current] !== " ") sfxKeyTap();
      typedRef.current++;
      setChars(typedRef.current);
    }, TYPE_MS);
    return () => clearInterval(iv);
  }, [idx, lines]);

  useEffect(() => {
    const advance = () => {
      if (doneRef.current) return;
      if (chars < lines[idx].text.length) {
        typedRef.current = lines[idx].text.length;
        setChars(lines[idx].text.length);
        return;
      }
      if (idx < lines.length - 1) {
        sfxEnterKey();
        setIdx(idx + 1);
      } else if (choice) {
        if (sel >= 0) choose(sel);
      } else {
        sfxEnterKey();
        doneRef.current = true;
        onClose();
      }
    };
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter" || k === " ") {
        e.preventDefault();
        advance();
      }
      if (!choosing) return;
      if (k === "1" || k === "2") choose(Number(k) - 1);
      if (["a", "w", "arrowleft", "arrowup"].includes(k)) setSel(0);
      if (["d", "s", "arrowright", "arrowdown"].includes(k)) setSel(1);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", advance);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", advance);
    };
  }, [idx, chars, lines, onClose, choice, choosing, sel]);

  const isNarration = line.speaker === "";

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-sm border border-emerald-900/70 bg-black/90 px-5 py-4 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        {!isNarration && (
          <div
            className="font-term mb-1 text-sm tracking-[0.2em]"
            style={{ color: line.color }}
          >
            ▸ {line.speaker}
          </div>
        )}
        <p
          className={`font-crt min-h-[3.5rem] text-xl leading-snug sm:text-2xl ${
            isNarration ? "italic text-zinc-300" : "text-zinc-100"
          }`}
        >
          {line.text.slice(0, chars)}
          {!fullyTyped && <span className="text-emerald-400">▌</span>}
        </p>
        {choosing && choice && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {choice.map((c, i) => (
              <button
                key={c.label}
                // mousedown, and stop it reaching the window's advance handler
                onMouseDown={(e) => {
                  e.stopPropagation();
                  choose(i);
                }}
                onMouseEnter={() => setSel(i)}
                className={`font-crt border px-4 py-2 text-left text-xl transition ${
                  sel === i
                    ? i === 0
                      ? "border-red-500 bg-red-950/50 text-red-200"
                      : "border-zinc-400 bg-zinc-900/60 text-zinc-100"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                [{i + 1}] {c.label}
                <span className="font-term mt-0.5 block text-xs tracking-widest text-zinc-400">
                  {c.hint}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="font-term mt-2 flex items-center justify-between text-xs tracking-widest text-zinc-400">
          <span>
            {idx + 1} / {lines.length}
          </span>
          <span className={fullyTyped ? "blink-caret text-emerald-500" : ""}>
            {choosing
              ? sel < 0
                ? "[1] / [2] — OR [A/D] TO PICK"
                : "[A/D] CHANGE · [E] CONFIRM"
              : `[E] ${idx < lines.length - 1 ? "CONTINUE" : "CLOSE"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
