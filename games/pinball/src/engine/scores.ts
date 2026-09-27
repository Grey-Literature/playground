// The Spirit Board — per table × tier top-10 with arcade initials — and the
// Agent Board beside it: the same top-10, for AI agents that declared
// themselves through the agent API (engine/agent.ts), kept separately per
// timing mode (real-time and lockstep are never ranked against each other).
//
// Scores live behind the ScoreStore adapter. The only implementation is
// LocalScoreStore (this browser's localStorage), deliberately: the repo is
// public with no backend, and a family board on one computer is the point.
// An online board would be a second ScoreStore — nothing else would change.

import type { DiffId } from './types';

export interface ScoreEntry {
  /** 1–3 of A–Z / 0–9, padded to 3 (or the special '---' for migrated bests). */
  initials: string;
  score: number;
  /** YYYY-MM-DD, local time. */
  day: string;
}

export interface ScoreStore {
  list(theme: string, tier: DiffId): ScoreEntry[];
  qualifies(theme: string, tier: DiffId, score: number): boolean;
  /** Files the entry; returns its 1-based rank, or null if it didn't make the board. */
  submit(theme: string, tier: DiffId, entry: ScoreEntry): number | null;
  clear(theme: string, tier: DiffId): void;
  lastInitials(): string;
}

export const BOARD_SIZE = 10;
const NS = 'flipper-seance';

/** Uppercase, strip to A–Z/0–9, cap at 3. May return '' (caller decides the fallback). */
export function cleanInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

export function padInitials(s: string) {
  return s.padEnd(3, ' ').slice(0, 3);
}

export function today(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const INITIALS_OK = /^([A-Z0-9 ]{3}|---|\?\?\?)$/;

/** Accept only well-formed entries; anything else read from storage is dropped. */
export function sanitizeBoard(raw: unknown): ScoreEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ScoreEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const { initials, score, day } = e as Record<string, unknown>;
    if (typeof initials !== 'string' || !INITIALS_OK.test(initials)) continue;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) continue;
    out.push({ initials, score: Math.floor(score), day: typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '' });
  }
  // stable sort: equal scores keep their original (earlier-first) order
  return out.sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE);
}

interface KV { get(k: string): string | null; set(k: string, v: string): void }

/** localStorage when it works, an in-memory map when it doesn't (private mode, blocked storage). */
function makeKV(): KV {
  const mem = new Map<string, string>();
  return {
    get(k) {
      try { const v = localStorage.getItem(k); if (v !== null) return v; } catch { /* fall through */ }
      return mem.get(k) ?? null;
    },
    set(k, v) {
      mem.set(k, v);
      try { localStorage.setItem(k, v); } catch { /* memory copy still holds it this session */ }
    },
  };
}

export class LocalScoreStore implements ScoreStore {
  private kv = makeKV();

  private key(theme: string, tier: DiffId) { return `${NS}:${theme}:board:${tier}`; }

  list(theme: string, tier: DiffId): ScoreEntry[] {
    let board: ScoreEntry[] = [];
    const raw = this.kv.get(this.key(theme, tier));
    if (raw !== null) {
      try { board = sanitizeBoard(JSON.parse(raw)); } catch { board = []; }
    }
    if (!board.length) {
      // migrate the pre-board single best score (key left in place)
      const legacy = Number(this.kv.get(`${NS}:${theme}:best:${tier}`) || 0);
      if (Number.isFinite(legacy) && legacy > 0) {
        board = [{ initials: '---', score: Math.floor(legacy), day: '' }];
        this.save(theme, tier, board);
      }
    }
    return board;
  }

  private save(theme: string, tier: DiffId, board: ScoreEntry[]) {
    this.kv.set(this.key(theme, tier), JSON.stringify(board));
  }

  qualifies(theme: string, tier: DiffId, score: number) {
    if (!(score > 0)) return false;
    const board = this.list(theme, tier);
    return board.length < BOARD_SIZE || score > board[board.length - 1].score;
  }

  submit(theme: string, tier: DiffId, entry: ScoreEntry): number | null {
    if (!this.qualifies(theme, tier, entry.score)) return null;
    const board = this.list(theme, tier);
    // a new score ranks BELOW an equal older one (earlier achievement wins ties)
    let i = board.findIndex((e) => entry.score > e.score);
    if (i < 0) i = board.length;
    board.splice(i, 0, entry);
    this.save(theme, tier, board.slice(0, BOARD_SIZE));
    const clean = entry.initials.trim();
    if (INITIALS_OK.test(entry.initials) && /^[A-Z0-9]/.test(clean)) this.kv.set(`${NS}:initials`, clean);
    return i + 1;
  }

  clear(theme: string, tier: DiffId) {
    this.save(theme, tier, []);
    // don't let the legacy best resurrect a cleared board
    this.kv.set(`${NS}:${theme}:best:${tier}`, '0');
  }

  lastInitials() {
    return cleanInitials(this.kv.get(`${NS}:initials`) ?? '');
  }
}

export const scores: ScoreStore = new LocalScoreStore();

// ---------------- Agent Board ----------------

export type AgentMode = 'realtime' | 'lockstep';
export const AGENT_MODES: AgentMode[] = ['realtime', 'lockstep'];

export interface AgentEntry {
  /** Declared name, e.g. "Claude Sonnet 5" (1–24 chars). */
  name: string;
  /** Optional model id / harness note (0–40 chars). */
  model: string;
  score: number;
  day: string;
}

/** Keep names printable and short: letters, digits, space and . _ - ( ) / + # : */
export function cleanAgentText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^A-Za-z0-9 ._\-()/+#:]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function sanitizeAgentBoard(raw: unknown): AgentEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const { name, model, score, day } = e as Record<string, unknown>;
    const n = cleanAgentText(name, 24);
    if (!n || n !== name) continue;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) continue;
    out.push({
      name: n, model: cleanAgentText(model, 40), score: Math.floor(score),
      day: typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '',
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE);
}

export class LocalAgentBoard {
  private kv = makeKV();
  private key(theme: string, mode: AgentMode, tier: DiffId) { return `${NS}:${theme}:agents:${mode}:${tier}`; }

  list(theme: string, mode: AgentMode, tier: DiffId): AgentEntry[] {
    const raw = this.kv.get(this.key(theme, mode, tier));
    if (raw === null) return [];
    try { return sanitizeAgentBoard(JSON.parse(raw)); } catch { return []; }
  }

  /** Files the entry; returns its 1-based rank, or null if it didn't make the board. */
  submit(theme: string, mode: AgentMode, tier: DiffId, entry: AgentEntry): number | null {
    if (!(entry.score > 0)) return null;
    const board = this.list(theme, mode, tier);
    if (board.length >= BOARD_SIZE && entry.score <= board[board.length - 1].score) return null;
    let i = board.findIndex((e) => entry.score > e.score);
    if (i < 0) i = board.length;
    board.splice(i, 0, entry);
    this.kv.set(this.key(theme, mode, tier), JSON.stringify(board.slice(0, BOARD_SIZE)));
    return i + 1;
  }

  clear(theme: string, mode: AgentMode, tier: DiffId) {
    this.kv.set(this.key(theme, mode, tier), '[]');
  }
}

export const agentBoard = new LocalAgentBoard();
