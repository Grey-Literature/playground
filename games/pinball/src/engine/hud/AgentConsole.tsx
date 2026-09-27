// The Agent Console — the no-script route onto the Agent Board.
//
// Shown only on ?agent pages. Some agent harnesses can press keys, click and
// read the page, but can't call page scripts freely: Claude in Chrome asks the
// user to approve every JavaScript call (hundreds per game), and Codex's
// browser can't see page globals at all. So everything window.flipperSeance
// does is also reachable here with plain UI:
//   • a form to declare (name + model), the Real-time / Lockstep choice, Start;
//   • keys during play (engine/agent.ts agentKey): . steps a lockstep game,
//     digits plunge, J/L/K flip-and-step, Z/M/A/W/D as usual;
//   • the live state as plain text in <pre id="agent-state">.

import { useEffect, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import { useGame } from '../store';
import { createAgentApi, stateText, stepListeners } from '../agent';
import type { AgentMode } from '../scores';

export function AgentConsole() {
  const agentPage = useGame((s) => s.agentPage);
  const agent = useGame((s) => s.agent);
  const mode = useGame((s) => s.agentMode);
  const phase = useGame((s) => s.phase);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const pre = useRef<HTMLPreElement>(null);

  // live state text: after every agent step, and ~10×/s otherwise (real time)
  useEffect(() => {
    if (!agentPage) return;
    const paint = () => { if (pre.current) pre.current.textContent = stateText(); };
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
  const start = () => {
    const r = fs.start();
    setError(r.ok ? '' : r.error);
  };
  const btn = 'pointer-events-auto rounded-md border px-2 py-1 text-[11px] font-black tracking-[0.1em]';

  return (
    <section
      id="agent-console"
      aria-label="Agent console for AI agents"
      className="pointer-events-auto absolute bottom-3 left-3 z-50 w-[24rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-emerald-400/40 bg-slate-950/90 p-3 text-left text-[11px] text-slate-200 shadow-[0_0_24px_rgba(52,211,153,0.2)] backdrop-blur-md"
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
                {(['realtime', 'lockstep'] as AgentMode[]).map((m) => (
                  <button key={m} id={`agent-mode-${m}`} aria-pressed={mode === m}
                    onClick={(e) => { blurAfter(e); pickMode(m); }}
                    className={`${btn} ${mode === m ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-slate-600 text-slate-400'}`}>
                    {m === 'realtime' ? 'Real-time' : 'Lockstep'}
                  </button>
                ))}
              </div>
              <p className="text-slate-500">Lockstep: the game only moves when you press <b>.</b> — take as long as you like between presses.</p>
              <button id="agent-start" onClick={(e) => { blurAfter(e); start(); }} className={`${btn} border-emerald-400 text-emerald-200 hover:bg-emerald-400/10`}>
                3. Start game (table + difficulty from the picker)
              </button>
            </>
          )}
          <div className="rounded border border-slate-700 bg-slate-900/70 p-1.5 text-[10px] leading-snug text-slate-400">
            <b className="text-slate-300">Keys:</b> <b>.</b> step 100 ms · <b>&gt;</b> step 500 ms (lockstep) · <b>1–9</b>/<b>0</b> plunge 0.1–1.0 ·{' '}
            <b>J</b>/<b>L</b>/<b>K</b> flip left/right/both + step · <b>Z</b>/<b>M</b> flippers (hold to cradle) · <b>A</b>/<b>W</b>/<b>D</b> nudge
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 font-bold text-red-300">{error}</p>}
      <pre id="agent-state" aria-live="off" className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-1.5 font-mono text-[10px] leading-tight text-emerald-100" ref={pre} />
    </section>
  );
}
