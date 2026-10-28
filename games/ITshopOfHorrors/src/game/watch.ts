// Session-only telemetry for "it knows who you are" (CLAUDE.md §4b). App keeps
// one of these in a ref per run. Nothing in it is stored or sent anywhere: it
// only ever turns into lines of text on this screen.

export type Dir = "LEFT" | "RIGHT" | "UP" | "DOWN";

export interface Watch {
  start: number; // Date.now() when the shift began
  searches: Record<string, number>; // "search:x,y" → when you first checked it
  catches: { dir: Dir; dark: boolean }[];
  attempts: Record<string, number>; // interactable id → times tried
  keyEcho: string[]; // your last 12 game keys, for the undead server's jr_tech
  usedDark: boolean; // ever held the headlamp off
  saidISeeYou: boolean;
}

export function createWatch(): Watch {
  return {
    start: Date.now(),
    searches: {},
    catches: [],
    attempts: {},
    keyEcho: [],
    usedDark: false,
    saidISeeYou: false,
  };
}

const KEY_GLYPH: Record<string, string> = {
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  enter: "⏎",
  " ": "␣",
};

export function echoKey(w: Watch, key: string) {
  w.keyEcho.push(KEY_GLYPH[key] ?? key);
  if (w.keyEcho.length > 12) w.keyEcho.shift();
}

// local wall-clock time as h:mm, the way a timesheet would write it
export function clock(t: number): string {
  const d = new Date(t);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
}
