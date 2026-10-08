// Flipper Séance — reference bot for Script mode.
//
// A deliberately simple player, and a worked example for AI agents: open
// pinball.html?agent, paste this into the browser console, and it plays one
// Script-mode game of Dead Star Disco (medium) and files its score to the
// AGENT BOARD's SCRIPT tab as "Reference Bot". See flipperSeance.help().
//
// Script mode is where bots belong. You submit a strategy ONCE; the game calls
// it every frame with the same state as getState() (and getTable() once). It
// runs in an isolated Web Worker, so the function must be self-contained: it
// can't see variables from this file. For memory between frames, submit an
// IIFE that returns the function: `(() => { let n = 0; return (s, t) => ... })()`.
// Each action lands after the tier's reaction delay (50…250 ms of game time),
// and a game lasts 3 minutes of game time — so a bot that never drains still
// finishes. (Driving Real-time or Lockstep with a loop like this instead gets
// the game flagged SCRIPT-PACED, and it isn't ranked.)
//
// Policy: plunge into the skill-shot zone; hold a flipper up while a live ball
// is over it and falling, drop it otherwise. Beat it!

const strategy = (state, table) => {
  const F = table.flippers;
  const act = {};
  if (state.plungerReady) act.plunge = 0.4;
  for (const side of ['left', 'right']) {
    const p = F[side].pivot;
    act[side] = state.balls.some((b) => b.layer === 'field' && !b.riding && !b.captured
      && b.y < p.y + 6 && b.y > p.y - 2
      && Math.abs(b.x - p.x) < F.length + 1.5 && (side === 'left' ? b.x < 0 : b.x > 0)
      && b.vy < 5);
  }
  return act;
};

(async function referenceBot({ theme = 'deadStarDisco', tier = 'medium', name = 'Reference Bot' } = {}) {
  const fs = window.flipperSeance;
  if (!fs) throw new Error('No agent API — reload the page with ?agent in the URL');
  const ok = (r) => { if (!r.ok) throw new Error(r.error); return r; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  ok(fs.declare({ name, model: 'reference-bot.js' }));
  ok(await fs.setStrategy(strategy)); // sent as source text; compiled in the worker
  ok(fs.start({ theme, tier, mode: 'script' }));
  // the game plays itself now; just watch (reading state is fine at any pace)
  while (fs.getState().phase === 'playing') await sleep(1000);
  const end = fs.getState();
  console.log(`Reference Bot finished: ${end.score} points (${end.script.calls} decisions, avg ${end.script.avgMs} ms)`);
  return end.score;
})();
