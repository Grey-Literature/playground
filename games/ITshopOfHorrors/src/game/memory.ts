// The one thing the game remembers between visits (CLAUDE.md §4b Decisions):
// which ending you chose last, in this browser only. If storage is blocked
// (private window, cleared site data) you just don't get welcomed back.

export type Ending = "resist" | "surrender" | "escape";

const KEY = "itshop:lastEnding";

export function loadLastEnding(): Ending | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "resist" || v === "surrender" || v === "escape" ? v : null;
  } catch {
    return null;
  }
}

export function saveLastEnding(e: Ending) {
  try {
    localStorage.setItem(KEY, e);
  } catch {
    // storage blocked: it forgets you, which is the kinder outcome anyway
  }
}
