import { useEffect, useState } from "react";

// T3-Chaos-38B standing beside the core, drawn to match the narration: half
// human, half machine, components flickering red and blue, a severed network
// cable hanging from her arm, a diagnostic display cycling HTTP codes.
// With the full lanyard handed back she's wearing it, and the eye settles blue.

const CODES = ["503", "418", "500", "409", "401", "429", "410", "403", "422", "200", "406", "100"];

function codeColor(code: string, restored: boolean): string {
  if (restored || code.startsWith("2") || code.startsWith("1")) return "#7dd3fc";
  return code.startsWith("5") ? "#ff4b4b" : "#ffb347";
}

const SKIN = "#c9a68a";
const METAL = "#39414d";
const PLATE = "#2a3340";
const SEAM = "#5b6573";
const JACKET = "#262b33";

export default function T3Figure({ restored }: { restored: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((n) => (n + 1) % CODES.length), 900);
    return () => clearInterval(iv);
  }, []);
  const code = CODES[i];

  return (
    <svg
      viewBox="0 0 100 200"
      className={`t3-rim h-52 w-26 ${restored ? "t3-restored" : ""}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="T3-Chaos-38B, half human and half machine, standing beside the core"
    >
      <ellipse cx="50" cy="194" rx="26" ry="4" fill="rgba(0,0,0,0.6)" />

      <g className="t3-bob">
        {/* legs: one human, one machine */}
        <rect x="38" y="128" width="10" height="60" fill="#222a33" />
        <rect x="36" y="186" width="13" height="6" fill="#111" />
        <rect x="52" y="128" width="10" height="60" fill={METAL} />
        <circle cx="57" cy="158" r="3" fill="#1b222c" stroke={SEAM} strokeWidth="1" />
        <rect x="51" y="186" width="14" height="6" fill={PLATE} />

        {/* torso: jacket on the left, plating on the right */}
        <rect x="34" y="72" width="16" height="58" fill={JACKET} />
        <rect x="50" y="72" width="16" height="58" fill={PLATE} />
        <line x1="50" y1="88" x2="66" y2="88" stroke={SEAM} strokeWidth="1" />
        <line x1="50" y1="116" x2="66" y2="116" stroke={SEAM} strokeWidth="1" />
        <rect className="t3-led" x="60" y="80" width="3" height="2" />
        <rect className="t3-led t3-led-b" x="60" y="92" width="3" height="2" />

        {/* her lanyard, if you brought every pin back */}
        {restored && (
          <g>
            <path d="M44 72 L50 90 L56 72" fill="none" stroke="#7dd3fc" strokeWidth="1.2" />
            <rect x="47" y="89" width="6" height="8" fill="#cfd4ce" />
          </g>
        )}

        {/* diagnostic display */}
        <rect x="39" y="100" width="24" height="12" fill="#05080c" stroke={SEAM} strokeWidth="1" />
        <text
          x="51"
          y="109.5"
          textAnchor="middle"
          fontSize="9"
          fontFamily="VT323, monospace"
          fill={codeColor(code, restored)}
        >
          {code}
        </text>

        {/* left arm, human */}
        <rect x="27" y="74" width="7" height="44" fill={JACKET} />
        <circle cx="30.5" cy="121" r="3.5" fill={SKIN} />

        {/* right arm, machine, ending in a torn-out port */}
        <rect x="66" y="74" width="7" height="40" fill={METAL} />
        <circle cx="69.5" cy="94" r="2.5" fill="#1b222c" />
        <rect x="66" y="112" width="7" height="4" fill="#111" />

        {/* the severed network cable, swaying */}
        <g className="t3-sway">
          <path
            d="M69.5 116 C 75 132, 66 146, 72 166"
            fill="none"
            stroke="#3a3f47"
            strokeWidth="2.5"
            shapeRendering="auto"
          />
          {/* frayed pairs where it was cut */}
          <line x1="72" y1="166" x2="70" y2="171" stroke="#f59e0b" strokeWidth="0.8" />
          <line x1="72" y1="166" x2="72" y2="172" stroke="#22c55e" strokeWidth="0.8" />
          <line x1="72" y1="166" x2="74" y2="171" stroke="#3b82f6" strokeWidth="0.8" />
          <line x1="72" y1="166" x2="75.5" y2="169.5" stroke="#a16207" strokeWidth="0.8" />
          <circle className="t3-spark" cx="72" cy="172" r="1.6" fill="#ffe9a3" />
        </g>

        {/* neck and head, split down the middle */}
        <rect x="46" y="64" width="4" height="9" fill={SKIN} />
        <rect x="50" y="64" width="4" height="9" fill={METAL} />
        <circle cx="50" cy="52" r="13" fill={SKIN} shapeRendering="auto" />
        <path d="M50 39 A13 13 0 0 1 50 65 Z" fill={METAL} shapeRendering="auto" />
        <line x1="50" y1="39" x2="50" y2="65" stroke={SEAM} strokeWidth="0.8" strokeDasharray="2 1.5" />
        <path
          d="M37 50 Q37 37 50 37 L50 42 Q42 42 41 52 L41 64 L36 62 Z"
          fill="#1a1410"
          shapeRendering="auto"
        />
        <polyline points="53,58 57,58 59,61" fill="none" stroke={SEAM} strokeWidth="0.8" />
        <circle cx="44" cy="52" r="1.4" fill="#1a1a1a" />
        <circle className="t3-eye" cx="56" cy="52" r="6" opacity="0.25" shapeRendering="auto" />
        <circle className="t3-eye" cx="56" cy="52" r="2.4" shapeRendering="auto" />
      </g>
    </svg>
  );
}
