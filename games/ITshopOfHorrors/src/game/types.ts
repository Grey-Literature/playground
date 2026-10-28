export type Screen =
  | "title"
  | "intro"
  | "game"
  | "final"
  | "ending-resist"
  | "ending-surrender"
  | "ending-escape"
  | "gameover";

export interface Flags {
  readTicket: boolean;
  gotToken: boolean;
  minPinPacified: boolean;
  hasKeycard: boolean;
  hasRootCred: boolean;
  doorOpen: boolean;
  metServers: boolean;
  collected: string[]; // pickup ids (pickups.ts)
  seen: string[]; // interactions done at least once
  // corrupted tickets (tickets.ts). AI control is restored.length, derived
  // rather than stored so the two can't drift apart.
  restored: string[];
  deferred: string[];
}

export const initialFlags: Flags = {
  readTicket: false,
  gotToken: false,
  minPinPacified: false,
  hasKeycard: false,
  hasRootCred: false,
  doorOpen: false,
  metServers: false,
  collected: [],
  seen: [],
  restored: [],
  deferred: [],
};

export interface DialogueLine {
  speaker: string;
  color: string; // tailwind-ish hex for speaker label
  text: string;
}

export interface Script {
  lines: DialogueLine[];
  effects?: Partial<Flags>;
  triggerFinal?: boolean;
  collect?: string[];
  see?: string[];
  toast?: string; // shown after the dialogue (or alone, if there are no lines)
  log?: string; // console.log'd when applied
  restore?: string[]; // corrupted ticket ids restored (AI control +1 each)
  defer?: string[]; // ...or left alone
  triggerEscape?: boolean; // walked out the front exit
  // a two-way choice on the last line; the picked option's script plays next
  choice?: [ChoiceOption, ChoiceOption];
}

export interface ChoiceOption {
  label: string;
  hint: string;
  then: Script;
}

export type InteractableId =
  | "terminal"
  | "printer"
  | "minpin"
  | "undead"
  | "door"
  | "core"
  | "coffee"
  | "whiteboard";
