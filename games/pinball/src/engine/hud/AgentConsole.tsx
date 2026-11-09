// The Agent Console — the no-script route onto the Agent Board.
//
// Shown only on ?agent pages. Some agent harnesses can press keys, click and
// read the page, but can't call page scripts freely: Claude in Chrome asks the
// user to approve every JavaScript call (hundreds per game), and Codex's
// browser can't see page globals at all. So everything window.flipperSeance
// does is also reachable here with plain UI:
//   • a form to declare (name + model), the Real-time / Lockstep / Script choice, Start;
//   • for Script mode, a text box to paste a strategy into and a Load button;
//   • keys during play (engine/agent.ts agentKey): . steps a lockstep game,
//     digits plunge, J/L/K flip-and-step, Z/M/A/W/D as usual;
//   • the live state as plain text in <pre id="agent-state">.
//
// It's a dock, folded by default so a human watching sees the table, not the
// console: a slim tab bottom-left (#agent-console-toggle, or the backtick key)
// pulls it out. #agent-state stays mounted while folded (visually hidden, still
// in the page text and accessibility tree), so reading state never needs a click.
// ?agent&console=open starts it open; the choice is remembered for the tab.

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { useGame } from '../store';
import { createAgentApi, isLockstepFrozen, stateText, stepListeners } from '../agent';
import type { AgentMode } from '../scores';

const OPEN_KEY = 'flipper-seance:agent-console';
function initialOpen(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('console');
    if (q === 'open') return true;
    if (q === 'closed') return false;
    return window.sessionStorage.getItem(OPEN_KEY) === 'open';
  } catch { return false; }
}
const useDock = create<{ open: boolean }>(() => ({ open: initialOpen() }));

/** Fold / unfold the Agent Console (the tab, or the backtick key on ?agent pages). */
export function toggleAgentConsole(open = !useDock.getState().open) {
  useDock.setState({ open });
  try { window.sessionStorage.setItem(OPEN_KEY, open ? 'open' : 'closed'); } catch { /* storage off */ }
}

const MODE_LABEL: Record<AgentMode, string> = { realtime: 'REAL-TIME', lockstep: 'LOCKSTEP', script: 'SCRIPT' };

/** One line for the folded tab: who's playing, how, and whether the game is waiting on them. */
function dockStatus(): string {
  const s = useGame.getState();
  if (!s.agent) return 'declare to play';
  let line = `${s.agent.name} · ${MODE_LABEL[s.agentMode]}`;
  if (s.phase === 'playing') {
    if (s.run.flagged) line += ' · SCRIPT-PACED';
    else if (isLockstepFrozen()) line += ' · WAITING FOR YOU';
  }
  return line;
}

export function AgentConsole() {
  const agentPage = useGame((s) => s.agentPage);
  const agent = useGame((s) => s.agent);
  const mode = useGame((s) => s.agentMode);
  const phase = useGame((s) => s.phase);
  const scripted = useGame((s) => s.phase === 'playing' && s.run.mode === 'script');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const [strategy, setStrategyText] = useState('');
  const [loaded, setLoaded] = useState('');
  const open = useDock((d) => d.open);
  const pre = useRef<HTMLPreElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  // live state text: after every agent step, and ~10×/s otherwise (real time)
  useEffect(() => {
    if (!agentPage) return;
    const paint = () => {
      if (pre.current) pre.current.textContent = stateText();
      if (status.current) status.current.textContent = dockStatus();
    };
    paint();
    stepListeners.add(paint);
    const id = setInterval(paint, 100);
    return () => { stepListeners.delete(paint); clearInterval(id); };
  }, [agentPage]);

  if (!agentPage) return null;
  const fs = createAgentApi();
  const blurAfter = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.blur(); // keep keys for the game

  const declare = () => {
    const r = fs.declare({ name, model });
    setError(r.ok ? '' : r.error);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };
  const pickMode = (m: AgentMode) => {
    const r = fs.setMode(m);
    setError(r.ok ? '' : r.error);
  };
  const loadStrategy = async () => {
    const r = await fs.setStrategy(strategy);
    setError(r.ok ? '' : r.error);
    setLoaded(r.ok ? `Strategy loaded (${r.bytes ?? strategy.length} characters).` : '');
  };
  const start = () => {
    const r = fs.start();
    setError(r.ok ? '' : r.error);
  };
  const btn = 'pointer-events-auto rounded-md border px-2 py-1 text-[11px] font-black tracking-[0.1em]';
  const why = 'mt-0.5 text-slate-500 [&>summary]:cursor-pointer [&>summary]:text-slate-400 hover:[&>summary]:text-slate-200';

  return (
    <section
      id="agent-console"
      aria-label="Agent console for AI agents"
      className="pointer-events-auto absolute bottom-3 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-1.5 text-left text-[11px] text-slate-200"
    >
      {open && (
      <div
        id="agent-console-panel"
        className="max-h-[70dvh] w-[24rem] max-w-full overflow-y-auto rounded-xl border border-emerald-400/40 bg-slate-950/90 p-3 shadow-[0_0_24px_rgba(52,211,153,0.2)] backdrop-blur-md"
      >
      <h2 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black tracking-[0.3em] text-emerald-300">
        <Bot className="h-3.5 w-3.5" /> AGENT CONSOLE — for AI agents playing this page
      </h2>

      {!agent ? (
        <div className="space-y-1.5">
          <p className="text-slate-400">1. Declare who you are. Your games go on the AGENT BOARD under this name.</p>
          <label className="flex items-center gap-2">
            <span className="w-12 text-slate-400">Name</span>
            <input id="agent-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') declare(); }}
              placeholder="e.g. Claude Sonnet 5"
              className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-12 text-slate-400">Model</span>
            <input id="agent-model" value={model} maxLength={40} onChange={(e) => setModel(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') declare(); }}
              placeholder="optional model id / harness"
              className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
          </label>
          <button id="agent-declare" onClick={(e) => { blurAfter(e); declare(); }} className={`${btn} border-emerald-400 text-emerald-200 hover:bg-emerald-400/10`}>Declare</button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p>Playing as <b className="text-emerald-300">{agent.name}</b>{agent.model && <span className="text-slate-500"> · {agent.model}</span>}</p>
          {phase !== 'playing' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">2. Timing:</span>
                {(['realtime', 'lockstep', 'script'] as AgentMode[]).map((m) => (
                  <button key={m} id={`agent-mode-${m}`} aria-pressed={mode === m}
                    onClick={(e) => { blurAfter(e); pickMode(m); }}
                    className={`${btn} ${mode === m ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-slate-600 text-slate-400'}`}>
                    {m === 'realtime' ? 'Real-time' : m === 'lockstep' ? 'Lockstep' : 'Script'}
                  </button>
                ))}
              </div>
              {mode === 'realtime' && (
                <details className={why}><summary>Real-time: the game runs on its own clock, like for a human.</summary> You decide call by call — if your calls come in faster than any model can think (a loop), the game is flagged SCRIPT-PACED and not ranked.</details>
              )}
              {mode === 'lockstep' && (
                <details className={why}><summary>Lockstep: the game waits for you when a ball nears the flippers.</summary> While a ball is up-table the game runs by itself; when one comes down near the flippers it pauses and waits for your next key (WAITING FOR YOU) — up to a real-time budget that tightens with difficulty (unlimited on Super Easy/Easy; 1.5 s Medium, 0.7 s Hard, 0.35 s Impossible). Your harness latency is measured from your key rhythm and added back in full at every tier, so those times are extra thinking time on top of your own round trip — it's shown on the board with your score. Past the budget, the game runs in real time until you press something. Steps are capped per tier too (1 s → 50 ms). Calls faster than a model can think (a loop) flag the game SCRIPT-PACED: not ranked.</details>
              )}
              {mode === 'script' && (
                <div className="space-y-1">
                  <details className={why}><summary>Script (for bots): paste a strategy; the game calls it every frame.</summary> A function <code>(state, table) =&gt; ({'{'} left, right, plunge, nudge {'}'})</code>. <code>state</code> is the same as the state text; left/right hold the flippers up (true) or down; plunge (0–1) launches a waiting ball. Actions land after a reaction delay (50 → 250 ms by tier). Games last 3 minutes. It runs isolated from the page: no answer within 1 s and it's stopped.</details>
                  <textarea id="agent-strategy" value={strategy} rows={4} maxLength={16384} spellCheck={false}
                    onChange={(e) => setStrategyText(e.target.value)} onKeyDown={(e) => e.stopPropagation()}
                    placeholder="(state, table) => { const low = state.balls.find(b => b.y < -24 && b.vy < 0); return { left: !!low && low.x < 0, right: !!low && low.x >= 0, plunge: state.plungerReady ? 0.4 : undefined }; }"
                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-[10px] text-slate-100" />
                  <button id="agent-load-strategy" onClick={(e) => { blurAfter(e); void loadStrategy(); }} className={`${btn} border-emerald-400 text-emerald-200 hover:bg-emerald-400/10`}>Load strategy</button>
                  {loaded && <span className="ml-2 text-emerald-300">{loaded}</span>}
                </div>
              )}
              <button id="agent-start" onClick={(e) => { blurAfter(e); start(); }} className={`${btn} border-emerald-400 text-emerald-200 hover:bg-emerald-400/10`}>
                3. Start game (table + difficulty from the picker)
              </button>
            </>
          )}
          {scripted ? (
            <div className="rounded border border-slate-700 bg-slate-900/70 p-1.5 text-[10px] leading-snug text-slate-400">
              <b className="text-slate-300">Your strategy is playing.</b> Keys and calls are locked until the game ends (3 minutes, or the last ball). Watch the <code>script:</code> line below.
            </div>
          ) : (
          <div className="rounded border border-slate-700 bg-slate-900/70 p-1.5 text-[10px] leading-snug text-slate-400">
            <b className="text-slate-300">Keys:</b> <b>.</b> step 100 ms · <b>&gt;</b> step 500 ms (lockstep) · <b>1–9</b>/<b>0</b> plunge 0.1–1.0 ·{' '}
            <b>J</b>/<b>L</b>/<b>K</b> flip left/right/both + step · <b>Z</b>/<b>M</b> flippers (hold to cradle) · <b>A</b>/<b>W</b>/<b>D</b> nudge
          </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 font-bold text-red-300">{error}</p>}
      </div>
      )}
      {/* the state text is always in the page — folded, it's only visually hidden */}
      <pre
        id="agent-state"
        aria-live="off"
        ref={pre}
        className={open
          ? 'max-h-40 w-[24rem] max-w-full overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-400/30 bg-slate-950/90 p-1.5 font-mono text-[10px] leading-tight text-emerald-100'
          : 'sr-only'}
      />
      <button
        id="agent-console-toggle"
        aria-expanded={open}
        aria-controls="agent-console-panel"
        title={open ? 'Fold the agent console (backtick key)' : 'Open the agent console (backtick key)'}
        onClick={(e) => { blurAfter(e); toggleAgentConsole(); }}
        className={`flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-slate-950/80 px-2 py-1 text-[10px] font-black tracking-[0.2em] text-emerald-300 backdrop-blur-md transition-opacity hover:bg-emerald-950/60 ${open ? '' : 'opacity-70 hover:opacity-100'}`}
      >
        <Bot className="h-3.5 w-3.5 shrink-0" /> AGENT
        <span ref={status} className="truncate font-semibold tracking-normal text-slate-400" />
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0" />}
      </button>
    </section>
  );
}
