import { useEffect, useRef, useState, type ReactNode } from "react";
import { sfxEnterKey, sfxKeyTap } from "../game/audio";

export const TYPE_MS = 24; // per character: ~40 a second, slow enough to watch it type

interface Props {
  lines: string[];
  // pause before each line starts, ms (missing entries use `gap`)
  delays?: number[];
  gap?: number;
  // a heavier clack as each line lands, like hitting enter on a terminal
  enter?: boolean;
  // jump straight to everything typed
  skip?: boolean;
  onDone?: () => void;
  render: (shown: string, i: number, typing: boolean) => ReactNode;
}

// Types lines out one after another, a key tap per letter: the same feel as
// in-game dialogue, for the intro and the endings. Remount (change `key`) to
// start over.
export default function TypedLines({
  lines,
  delays,
  gap = 350,
  enter = false,
  skip = false,
  onDone,
  render,
}: Props) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [waiting, setWaiting] = useState(true); // in the pause before `line`
  const doneRef = useRef(false);
  // props read through a ref, so a caller passing a fresh array each render
  // doesn't restart the line being typed
  const props = useRef({ lines, delays, gap, enter, onDone });
  props.current = { lines, delays, gap, enter, onDone };

  useEffect(() => {
    const p = props.current;
    if (skip || line >= p.lines.length) return;
    if (waiting) {
      const t = setTimeout(() => setWaiting(false), p.delays?.[line] ?? (line === 0 ? 0 : p.gap));
      return () => clearTimeout(t);
    }
    const text = p.lines[line];
    let n = 0;
    const iv = setInterval(() => {
      if (n >= text.length) {
        clearInterval(iv);
        if (p.enter && text) sfxEnterKey();
        setLine((l) => l + 1);
        setChars(0);
        setWaiting(true);
        return;
      }
      if (text[n] !== " ") sfxKeyTap();
      n++;
      setChars(n);
    }, TYPE_MS);
    return () => clearInterval(iv);
  }, [line, waiting, skip]);

  useEffect(() => {
    if (doneRef.current || !(skip || line >= props.current.lines.length)) return;
    doneRef.current = true;
    props.current.onDone?.();
  }, [skip, line]);

  return (
    <>
      {lines.map((text, i) => {
        if (skip || i < line) return render(text, i, false);
        if (i === line && !waiting) return render(text.slice(0, chars), i, true);
        return null;
      })}
    </>
  );
}
