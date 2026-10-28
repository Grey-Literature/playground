import type { Flags } from "./types";
import { actOf } from "./acts";

// The corrupted escalation tickets (CLAUDE.md §4b, mechanic 3). From Act II,
// E.S.C.A.L.A.T.E. posts three optional tickets to the queue, each at a real
// piece of wall-mounted network gear ('N' in mapData). RESTORE gives you a
// piece of the story and the AI a little more control; LEAVE IT doesn't.

export type TicketId = "dns" | "backup" | "trace";

export interface Ticket {
  id: TicketId;
  code: string;
  title: string;
  where: string;
  device: string; // what the gear is, before it's a ticket
  x: number; // the wall tile it's mounted on
  y: number;
  face: [number, number]; // which way the room is, from the wall
}

export const TICKETS: Ticket[] = [
  { id: "dns", code: "TKT-0661", title: "DNS FAILURE", where: "hallway switch", device: "NETWORK SWITCH", x: 26, y: 9, face: [0, 1] },
  { id: "trace", code: "TKT-0663", title: "TRACE ROGUE CONNECTION", where: "den patch panel, east wall", device: "PATCH PANEL", x: 42, y: 17, face: [-1, 0] },
  { id: "backup", code: "TKT-0662", title: "RESTORE FROM BACKUP", where: "annex backup appliance, south wall", device: "BACKUP APPLIANCE", x: 36, y: 29, face: [0, -1] },
];

export const TICKET_BY_ID: Record<string, Ticket> = Object.fromEntries(TICKETS.map((t) => [t.id, t]));

export function ticketAt(x: number, y: number): Ticket | undefined {
  return TICKETS.find((t) => t.x === x && t.y === y);
}

export const handled = (f: Flags, id: string) => f.restored.includes(id) || f.deferred.includes(id);

// posted from Act II; open until you choose
export const isOpen = (f: Flags, id: string) => actOf(f) >= 2 && !handled(f, id);

export const openTickets = (f: Flags) => TICKETS.filter((t) => isOpen(f, t.id));

// how much of its work you did for it: 0–3
export const controlOf = (f: Flags) => f.restored.length;
