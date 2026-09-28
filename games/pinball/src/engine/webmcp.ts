// WebMCP page tools — the agent API (engine/agent.ts) offered through
// `navigator.modelContext`, for agent browsers that can call page tools but
// can't reach page JavaScript globals (Codex's browser, for one).
//
// Feature-detected on every page: without navigator.modelContext nothing
// happens, so humans and ordinary browsers never see a difference. Both
// registration styles of the WebMCP proposal are supported: registerTool()
// per tool, or provideContext({ tools }). Every tool is a thin wrapper over
// the same calls as window.flipperSeance, so the same honesty rules apply
// (declare first, inputs only, Agent Board only).

import { createAgentApi } from './agent';
import type { DiffId } from './types';

interface ToolResult { content: { type: 'text'; text: string }[]; isError?: boolean }
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}
interface ModelContext {
  registerTool?: (tool: WebMcpTool) => unknown;
  provideContext?: (ctx: { tools: WebMcpTool[] }) => unknown;
}

const text = (v: unknown): ToolResult => {
  const failed = !!v && typeof v === 'object' && (v as { ok?: boolean }).ok === false;
  return { content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }], ...(failed ? { isError: true } : {}) };
};

/** The tool list (exported for the headless check). */
export function webMcpTools(): WebMcpTool[] {
  const fs = createAgentApi();
  return [
    {
      name: 'pinball_help',
      description: 'How to play Flipper Séance (a pinball game) as an AI agent: the rules for the Agent Board, the controls, and the coordinate system. Read this first.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => text(fs.help()),
    },
    {
      name: 'pinball_declare',
      description: 'Declare who is playing (required before anything else). Your games are ranked on the AGENT BOARD under this name, never on the human board.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Your display name, e.g. "GPT-6 sol" (1–24 characters)' },
          model: { type: 'string', description: 'Optional model id or harness note (up to 40 characters)' },
        },
        required: ['name'],
      },
      execute: async (a) => text(fs.declare({ name: a.name, model: a.model })),
    },
    {
      name: 'pinball_start',
      description: 'Start a new game. mode "lockstep" (recommended for tool calls) pauses for you whenever a ball is near the flippers (state.waitingForYou; up-table it runs by itself) — within limits that tighten with the tier: a step cap (1000/1000/250/100/50 ms from supereasy to impossible) and a real-time hold budget between calls (unlimited/unlimited/1500/700/350 ms, +75 ms grace, + your own measured harness latency, credited in full so every harness gets the same extra thinking time — shown on the board). Past the hold budget the game runs in real time until your next turn. "realtime" runs on its own clock. Scores are ranked per mode and tier.',
      inputSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['deadStarDisco', 'salamander'], description: 'Which table' },
          tier: { type: 'string', enum: ['supereasy', 'easy', 'medium', 'hard', 'impossible'] },
          mode: { type: 'string', enum: ['realtime', 'lockstep'] },
        },
      },
      execute: async (a) => text(fs.start({
        theme: a.theme as string | undefined,
        tier: a.tier as DiffId | undefined,
        mode: a.mode as 'realtime' | 'lockstep' | undefined,
      })),
    },
    {
      name: 'pinball_turn',
      description: 'Play one turn: optionally flip/hold flippers, plunge or nudge, then (in lockstep) advance the game stepMs milliseconds (capped per tier). Returns the new state (every ball\'s x/y/vx/vy, flipper angles, score, and limits.holdRemainingMs — your real-time budget before the game stops waiting) plus the events since your last turn.',
      inputSchema: {
        type: 'object',
        properties: {
          flip: { type: 'string', enum: ['left', 'right', 'both'], description: 'Tap flipper(s) for flipMs (min 80)' },
          flipMs: { type: 'number', minimum: 80, maximum: 5000 },
          hold: { type: 'object', properties: { left: { type: 'boolean' }, right: { type: 'boolean' } }, description: 'Press (true) or release (false) and keep — for cradling' },
          plunge: { type: 'number', minimum: 0, maximum: 1, description: 'Launch the waiting ball at this power (0.32–0.48 skill shot; ≥0.85 Skyshot on Salamander)' },
          nudge: { type: 'string', enum: ['left', 'right', 'up'], description: 'Bump the table (too many → TILT)' },
          stepMs: { type: 'number', minimum: 1, maximum: 1000, description: 'Lockstep only: how far to advance (default 100; capped by the tier — see state.limits.stepCapMs)' },
        },
      },
      execute: async (a) => text(fs.turn(a as Parameters<typeof fs.turn>[0])),
    },
    {
      name: 'pinball_state',
      description: 'Read the current game state without changing anything.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => text(fs.getState()),
    },
    {
      name: 'pinball_table',
      description: 'Read the table geometry: flipper pivots and angles, drain line, deck outlines, bumpers (table units; +y is up the table).',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => text(fs.getTable()),
    },
  ];
}

let done = false;

/** Register the tools if this browser offers WebMCP. Safe to call more than once. */
export function installWebMcp(nav: { modelContext?: ModelContext } | undefined = typeof navigator !== 'undefined' ? navigator as unknown as { modelContext?: ModelContext } : undefined): 'registerTool' | 'provideContext' | 'none' {
  const mc = nav?.modelContext;
  if (done || !mc) return 'none';
  try {
    const tools = webMcpTools();
    if (typeof mc.registerTool === 'function') {
      for (const t of tools) mc.registerTool(t);
      done = true;
      return 'registerTool';
    }
    if (typeof mc.provideContext === 'function') {
      mc.provideContext({ tools });
      done = true;
      return 'provideContext';
    }
  } catch { /* a WebMCP implementation we don't understand — the other routes still work */ }
  return 'none';
}

/** Headless check only: allow re-registration against a fresh mock. */
export function resetWebMcpForTests() { done = false; }
