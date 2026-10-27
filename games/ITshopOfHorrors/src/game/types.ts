export type Screen =
  | "title"
  | "intro"
  | "game"
  | "final"
  | "ending-resist"
  | "ending-surrender"
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
