// Flipper Séance — reference bot for the agent API.
//
// A deliberately simple player, and a worked example for AI agents: open
// pinball.html?agent, paste this into the browser console, and it plays one
// lockstep game of Dead Star Disco (medium) and files its score to the
// AGENT BOARD as "Reference Bot". Everything it does goes through
// window.flipperSeance — see flipperSeance.help() for the full API.
//
// Lockstep limits: from medium up, each step() is capped (250/100/50 ms) and the
// game only waits a short real-time budget between calls (1500/700/350 ms, see
// getState().limits.holdRemainingMs) before it runs on in real time. This bot
// runs inside the page and answers in microseconds, so it never overruns — an
// agent thinking over the network should keep an eye on holdRemainingMs.
//
// Policy: plunge into the skill-shot zone; flip a side whenever a live ball is
// over that flipper and falling. In lockstep that's frame-perfect, and a
// frame-perfect player never drains — so the bot RETIRES after `minutes` of
// game time: it stops flipping and lets its balls drain, which ends the game
// and files the score. Beat it!

(async function referenceBot({ theme = 'deadStarDisco', tier = 'medium', name = 'Reference Bot', minutes = 3 } = {}) {
  const fs = window.flipperSeance;
  if (!fs) throw new Error('No agent API — reload the page with ?agent in the URL');
  const ok = (r) => { if (!r.ok) throw new Error(r.error); return r; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  ok(fs.declare({ name, model: 'reference-bot.js' }));
  ok(fs.setMode('lockstep'));
  ok(fs.start({ theme, tier }));
  const T = ok(fs.getTable());
  const F = T.flippers;
  const cooldown = { left: 0, right: 0 };

  const t0 = ok(fs.getState()).t;
  for (let i = 0; i < 1000000; i++) {
    const s = ok(fs.getState());
    if (s.phase !== 'playing') break;
    if (s.ballPhase === 'bonus') { await sleep(50); continue; } // the bonus count-up runs on the wall clock
    if (s.plungerReady) fs.plunge(0.4);
    const retired = s.t - t0 > minutes * 60;
    for (const side of ['left', 'right']) {
      if (retired) break;
      cooldown[side] -= 1;
      const p = F[side].pivot;
      const over = s.balls.some((b) => b.layer === 'field' && !b.riding && !b.captured
        && b.y < p.y + 5 && b.y > p.y - 1.5
        && Math.abs(b.x - p.x) < F.length + 1 && (side === 'left' ? b.x < 0 : b.x > 0)
        && b.vy < 5);
      if (over && cooldown[side] <= 0) { fs.flip(side, 110); cooldown[side] = 12; }
    }
    fs.step(1000 / 60);
    if (i % 600 === 0) await sleep(0); // let the page draw now and then
  }
  const end = fs.getState();
  console.log(`Reference Bot finished: ${end.score} points`);
  return end.score;
})();
