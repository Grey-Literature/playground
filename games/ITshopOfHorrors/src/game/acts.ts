import type { Flags } from "./types";

// The horror pass's four acts (CLAUDE.md §4b), read straight off the flags so
// there's no second state machine to keep in sync.
//   I   something is wrong           start → token found
//   II  something knows you're here  token → keycard
//   III something needs you          keycard → door open
//   IV  the last escalation          door open → the core
export type Act = 1 | 2 | 3 | 4;

export function actOf(f: Flags): Act {
  if (f.doorOpen) return 4;
  if (f.hasKeycard) return 3;
  if (f.gotToken) return 2;
  return 1;
}
