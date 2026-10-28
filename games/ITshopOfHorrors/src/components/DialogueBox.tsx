import { useEffect, useRef, useState } from "react";
import type { DialogueLine } from "../game/types";
import { sfxEnterKey, sfxKeyTap } from "../game/audio";

const TYPE_MS = 24; // per character: ~40 a second, slow enough to watch it type

interface Props {
  lines: DialogueLine[];
  onClose: () => void;
}

export default function DialogueBox({ lines, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const doneRef = useRef(false);
  // typed count lives in a ref so the click sound fires once per key, outside
  // React's state updater, and a skip can jump it to the end
  const typedRef = useRef(0);

  const line = lines[idx];
  const fullyTyped = chars >= line.text.length;

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
      sfxEnterKey();
      if (idx < lines.length - 1) setIdx(idx + 1);
      else {
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
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", advance);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", advance);
    };
  }, [idx, chars, lines, onClose]);

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
        <div className="font-term mt-2 flex items-center justify-between text-xs tracking-widest text-zinc-400">
          <span>
            {idx + 1} / {lines.length}
          </span>
          <span className={fullyTyped ? "blink-caret text-emerald-500" : ""}>
            [E] {idx < lines.length - 1 ? "CONTINUE" : "CLOSE"}
          </span>
        </div>
      </div>
    </div>
  );
}
