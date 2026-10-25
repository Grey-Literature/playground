'use strict';
/* =====================================================================
   SANITATION: room 6. The litter box. Sand that remembers.
   Built with Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork, 2026-10-07,
   from the plan in the Cowork planning chat (claude/rooms-6-7-plan.md).
   Same shape as the other room modules: an IIFE that reads the game's
   globals and is a no-op unless the current room has `san`.

   Movement is still the only verb. The sand keeps catbot's paw prints. The
   bay's self-cleaning rake rides a rail along the back wall and replays
   catbot's trail exactly `san.delay` (3 s) behind, raking the prints smooth.
   Grates under the sand trip sifter screens further on, and the grates only
   feel the rake: so to get through a screen you have to be standing at it
   three seconds after you crossed its grate. The last screen counts how long
   the rake stood on its grate (so: how long you did). The part is buried in a
   mound at the far end; catbot digs it up the way a cat would, by scuffing
   back and forth over it.

   The rules (rake, grates, screens, the dig) live in stepRules(), a pure
   function at 60 Hz fed with catbot's x. The live game feeds it the rig's x;
   the bot (simulate) feeds it a small model of the rig's walk (stepCat), the
   same split Berthing uses. Nothing here moves catbot: the screens block it
   through index.html's blockers, like room 1's gate.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA. Fields only this file reads:
     san:{delay,sand:[x0,x1],tine}  how far behind the rake runs (s), the sand bed, the rake head's half-width
     grates:[{x,w}]                  grate i trips screen i while the rake's head is over it
     screens:[{x,w,grace,latch}]     sifter screens: open while their grate is tripped, then for `grace` s;
                                     a latch screen stays open after for as long as its grate was tripped
     mound:{x,w,passes}              the buried part: this many crossings of its middle dig it up
     drum:{x}                        the sifter drum on the back wall (the socket)
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'sanitation', name: 'Sanitation', w: 3920, floorSlip: 0,
  san: { delay: 3, sand: [420, 3660], tine: 30 },
  start: { x: 300, face: 1 }, reset: { x: 22, w: 112 },
  grates: [{ x: 690, w: 80 }, { x: 1250, w: 60 }, { x: 2160, w: 80 }],
  screens: [{ x: 1000, w: 24, grace: .5 }, { x: 1800, w: 24, grace: .3 }, { x: 3160, w: 24, latch: true }],
  mound: { x: 3420, w: 150, passes: 4 },
  drum: { x: 3580 },
  part: { x: 3420, y: -400, id: 'sanitation', name: 'SIFTER GEAR' },
  exit: { x: 3760 },
  captions: [
    { on: 'sanStart', text: 'Auto-cleaning litter box. Nice! 🐈' },
    { on: 'sanRake', text: 'The rake does what you did, three seconds later. The grates only feel the rake.', dur: 5.5 },
    { on: 'sanLate', text: 'Shut before you got there. Cross its grate faster.' },
    { on: 'sanLinger', text: 'This one counts how long the rake stays. Stay on its grate, and so will the rake.', dur: 5.5 },
    { on: 'sanDig', text: 'Something is buried here. A cat knows what to do.' },
    { on: 'sanDug', text: 'There it is.' },
    { on: 'sanFixed', text: 'The sifter turns. The sand drains level, and the rake goes home.', dur: 5 }
  ]
});
{
  const R = ROOMS[ROOMS.length - 1];
  R.socket = { x: R.drum.x, y: GY - 128 };
  R.noCart = [[R.san.sand[0] - 20, R.drum.x + 10]];          // the trolley stays on the two aprons: the start, and by the hatch
  R.rail = [[0, R.san.sand[0] - 30], [R.drum.x + 60, R.w]];
}

window.SAN = (function () {
  const layout = ROOMS.find(r => r.id === 'sanitation');
  const mine = () => !!room && !!room.san;
  const live = () => mine() && !inHub();
  const DT = 1 / 60, ACC = 260, TURN = .25, NOSE = 88;
  const approach = (v, t, d) => v + clamp(t - v, -d, d);

  /* ---------- world state ---------- */
  function fresh(def) {
    return {
      t: 0, hist: [], rakeX: def.san.sand[0], rakeV: 0, rakeOn: false,
      screens: def.screens.map(() => ({ o: 0, hold: 0, charge: 0, tripped: false, waitT: 0 })),
      trips: def.grates.map(() => 0), passes: 0, side: 0, dug: false, got: false, docked: false,
      cat: { x: def.start.x, vx: 0, face: def.start.face || 1, walkT: 0, sprint: 0, turn: 0 },
      gotT: -1, done: false, stats: { blocked: 0 }
    };
  }
  const copy = w => JSON.parse(JSON.stringify(w));

  // where catbot was `delay` seconds ago (the history is sampled every step; linear between samples)
  function trailAt(w, tq, def) {
    const h = w.hist; if (!h.length || tq < h[0][0]) return def.san.sand[0];
    let lo = 0, hi = h.length - 1;
    if (tq >= h[hi][0]) return h[hi][1];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (h[m][0] <= tq) lo = m; else hi = m; }
    const a = h[lo], b = h[hi], u = (tq - a[0]) / Math.max(1e-6, b[0] - a[0]);
    return lerp(a[1], b[1], u);
  }
  const onGrate = (x, g, tine) => x + tine * .5 > g.x && x - tine * .5 < g.x + g.w;
  const screenBlocks = s => s.o < .8;

  /* ---------- the rules: rake, grates, screens, the dig. Pure: fed catbot's x ---------- */
  function stepRules(w, def, dt, cx, onFloor = true) {
    const ev = [], S0 = def.san.sand[0], S1 = def.san.sand[1];
    w.t += dt;
    w.hist.push([w.t, cx]);
    while (w.hist.length > 2 && w.hist[1][0] < w.t - def.san.delay - 1) w.hist.shift();
    // the rake: catbot's trail, `delay` behind, clamped to its rail. After the repair it goes home to its dock.
    const px = w.rakeX;
    if (w.got) { w.rakeX = approach(w.rakeX, S0, 140 * dt); w.docked = Math.abs(w.rakeX - S0) < 1; }
    else w.rakeX = clamp(trailAt(w, w.t - def.san.delay, def), S0, S1);
    w.rakeV = (w.rakeX - px) / dt;
    // grates: tripped while the rake's head is over them (never by catbot: the grate sits under the raked layer)
    def.grates.forEach((g, i) => {
      const on = !w.got && onGrate(w.rakeX, g, def.san.tine) && w.t > def.san.delay;
      const sc = w.screens[i], s = def.screens[i];
      if (on && !sc.tripped) { ev.push({ k: 'trip', i, x: g.x + g.w / 2 }); w.trips[i]++; }
      sc.tripped = on;
      if (s.latch) { sc.charge = on ? Math.min(8, sc.charge + dt) : Math.max(0, sc.charge - dt); sc.hold = sc.charge; }
      else sc.hold = on ? s.grace : Math.max(0, sc.hold - dt);
      let want = on || sc.hold > 0 ? 1 : 0;
      if (Math.abs(cx - (s.x + s.w / 2)) < 60 && sc.o > .3) want = 1;     // never closes on the cat (room 1's gate does the same)
      if (w.got) want = 1;                                                 // repaired: the sifter runs and the screens stay up (a revisit walks straight through)
      const was = sc.o;
      sc.o = want ? Math.min(1, sc.o + dt * 5) : Math.max(0, sc.o - dt * 3);
      if (was < .02 && sc.o >= .02) ev.push({ k: 'open', i, x: s.x + s.w / 2 });
      if (was > .98 && sc.o <= .98) ev.push({ k: 'close', i, x: s.x + s.w / 2 });
      // a cat waiting at a shut screen: counted so the captions and the bot know
      const face = s.x - NOSE;
      if (screenBlocks(sc) && cx > face - 6 && cx <= face + 1) sc.waitT += dt; else sc.waitT = 0;
    });
    // the dig: each time catbot's middle crosses the mound's middle on its feet, the mound gets lower
    const m = def.mound;
    if (!w.dug && Math.abs(cx - m.x) < m.w) {
      const side = Math.sign(cx - m.x) || w.side;
      if (onFloor && w.side && side !== w.side) {
        w.passes++; ev.push({ k: 'dig', n: w.passes, x: m.x });
        if (w.passes >= m.passes) { w.dug = true; ev.push({ k: 'dug', x: m.x }); }
      }
      w.side = side;
    } else if (!w.dug) w.side = Math.abs(cx - m.x) < m.w ? w.side : 0;
    return ev;
  }

  /* ---------- the bot's catbot: a small model of the rig's walk (accel 260, the 1.6 s hold or a double-tap for the trot, a turn on the spot) ---------- */
  function blocksFor(w, def) {
    const b = [{ x0: -1e4, x1: 16 }];
    def.screens.forEach((s, i) => { if (screenBlocks(w.screens[i])) b.push({ x0: s.x, x1: s.x + s.w }); });
    if (def.exit && !w.got) b.push({ x0: def.exit.x + 10, x1: def.exit.x + 30 });
    return b;
  }
  function stepCat(w, def, dt, inp) {
    const c = w.cat, dir = inp.dir || 0;
    if (dir && dir !== c.face) {
      c.vx = approach(c.vx, 0, ACC * dt); c.walkT = 0; c.sprint = 0;
      if (Math.abs(c.vx) < 25) { c.turn += dt; if (c.turn >= TURN) { c.face = dir; c.turn = 0; } }
    } else {
      c.turn = 0;
      if (dir) { c.walkT += dt; if (inp.doubleTap) c.sprint = dir; } else { c.walkT = 0; c.sprint = 0; }
      const max = dir ? (c.walkT >= GAIT.hold || c.sprint === dir ? GAIT.trot : GAIT.walk) : 0;
      c.vx = approach(c.vx, dir * max, ACC * dt);
    }
    c.x += c.vx * dt;
    for (const b of blocksFor(w, def)) {
      if (b.x0 > c.x - 1) { const lim = b.x0 - NOSE; if (c.x > lim) { c.x = lim; if (c.vx > 0) c.vx = 0; } }
      else if (b.x1 < c.x + 1) { const lim = b.x1 + NOSE; if (c.x < lim) { c.x = lim; if (c.vx < 0) c.vx = 0; } }
    }
  }
  // the pounce on the dug-up part, as index.html does it: facing it, 40-190 px away, then about 2.1 s until it is home
  function botPart(w, def) {
    const p = def.part, d = p.x - w.cat.x;
    if (w.dug && !w.got && w.gotT < 0 && Math.sign(d) === w.cat.face && Math.abs(d) < 190 && Math.abs(d) > 40 && Math.abs(w.cat.vx) < 30) w.gotT = w.t;
    if (w.gotT >= 0 && !w.got && w.t - w.gotT > 2.1) w.got = true;
  }
  function botStep(w, def, inp) {
    if (w.gotT >= 0 && !w.got) inp = { dir: 0 };          // the pounce owns the cat until the part is home
    stepCat(w, def, DT, inp);
    const ev = stepRules(w, def, DT, w.cat.x, true);
    botPart(w, def);
    if (w.got && w.cat.x > def.exit.x + 64) w.done = true;
    return ev;
  }

  /* ---------- bot brains ---------- */
  const nextScreen = (w, def) => def.screens.findIndex(s => w.cat.x < s.x);
  function botInput(w, def, brain) {
    const c = w.cat, k = nextScreen(w, def);
    brain.t = (brain.t || 0) + DT;
    if (k >= 0) {
      const s = def.screens[k], g = def.grates[k], sc = w.screens[k], gm = g.x + g.w / 2;
      // how far back a run-up can go: the screen behind has shut, and catbot stops at its face
      const floor = k > 0 ? def.screens[k - 1].x + def.screens[k - 1].w + NOSE + 6 : def.reset.x + def.reset.w + 60;
      const backTo = Math.max(g.x - 190, floor);
      if (brain.k !== k) { brain.k = k; brain.ph = 'go'; brain.tries = 0; }
      if (brain.ph === 'go') {
        if (s.latch) {
          if (c.x < gm - 4) return { dir: 1 };
          if (Math.abs(c.vx) > 2 || c.face < 0) return { dir: c.face < 0 ? 1 : 0 };
          brain.ph = 'linger'; brain.t0 = brain.t; return { dir: 0 };
        }
        if (c.x < g.x - 170) return { dir: 1, doubleTap: k > 0 };
        if (c.x > backTo + 40 && c.x < g.x && k > 0 && Math.abs(c.vx) < 140) { brain.ph = 'back'; return { dir: -1 }; }   // too close for a running start
        brain.ph = 'run'; return { dir: 1, doubleTap: k > 0 };
      }
      if (brain.ph === 'back') { if (c.x > backTo + 2) return { dir: -1 }; if (Math.abs(c.vx) > 2) return { dir: 0 }; brain.ph = 'run'; return { dir: 0 }; }
      if (brain.ph === 'linger') { if (brain.t - brain.t0 < (brain.linger || 2.4)) return { dir: 0 }; brain.ph = 'run'; return { dir: 1, doubleTap: true }; }
      if (brain.ph === 'run') {
        if (sc.waitT > def.san.delay + (s.latch ? 6 : 2.5) && !sc.tripped) { brain.ph = 'retry'; brain.tries++; return { dir: -1 }; }
        return { dir: 1, doubleTap: k > 0 };
      }
      if (brain.ph === 'retry') { if (c.x > backTo + 2) return { dir: -1 }; if (Math.abs(c.vx) > 2) return { dir: 0 }; brain.ph = 'go'; if (s.latch) brain.linger = (brain.linger || 2.4) + 1; return { dir: 0 }; }
      return { dir: 1 };
    }
    // past the screens: dig, then pounce, then the hatch
    const m = def.mound;
    if (!w.dug) {
      if (brain.digDir == null) brain.digDir = 1;
      if (brain.digDir > 0 && c.x > m.x + 80) brain.digDir = -1;
      else if (brain.digDir < 0 && c.x < m.x - 80) brain.digDir = 1;
      return { dir: brain.digDir };
    }
    if (!w.got) {
      if (w.gotT >= 0) return { dir: 0 };
      const want = m.x - 120;
      if (Math.abs(c.x - want) > 12 && !(c.face > 0 && c.x < m.x - 40 && c.x > m.x - 190)) return { dir: c.x < want ? 1 : -1 };
      if (c.face < 0) return { dir: 1 };
      return { dir: Math.abs(c.vx) > 20 ? 0 : 0 };
    }
    return { dir: 1 };
  }
  const STRATS = {
    idle: () => ({ dir: 0 }),
    walker: (w, def, b) => { b.n = (b.n || 0) + 1; return { dir: b.n % 84 === 0 ? 0 : 1 }; },       // holds right, lets go a moment every 1.4 s: never trots
    trotter: () => ({ dir: 1, doubleTap: true }),                                                    // holds right at a trot, never stops
    smart: botInput
  };
  function simulate(strategy, opt = {}) {
    const def = opt.def || layout, w = opt.world ? copy(opt.world) : fresh(def), brain = opt.brain || {}, f = STRATS[strategy];
    const max = opt.max || 240; let n = 0;
    while (!w.done && n < max * 60) { botStep(w, def, f(w, def, brain)); n++; }
    return { finished: w.done, time: +(n / 60).toFixed(2), passes: w.passes, dug: w.dug, got: w.got, x: Math.round(w.cat.x), screens: w.screens.map(s => +s.o.toFixed(2)), trips: w.trips.slice(), retries: brain.tries || 0, world: w };
  }
  // random play from the start for a while, then the smart bot from wherever that left catbot: it must still finish
  function explore(def = layout, n = 60, seed = 0x5a7d0b5) {
    let s = seed >>> 0; const rr = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    let worst = 0, fails = [];
    for (let i = 0; i < n; i++) {
      const w = fresh(def), brain = {}; let d = 0, hold = 0;
      const steps = Math.floor(rr() * 60 * 70);
      for (let k = 0; k < steps && !w.done; k++) {
        if (hold-- <= 0) { d = [-1, 0, 1, 1, 1][Math.floor(rr() * 5)]; hold = Math.floor(rr() * 150); }
        // mixed with the smart bot half the time, so the random walk reaches the later beats
        botStep(w, def, rr() < .5 ? botInput(w, def, brain) : { dir: d, doubleTap: rr() < .2 });
      }
      const r = simulate('smart', { def, world: w, max: 200 });
      if (!r.finished) fails.push({ i, x: Math.round(w.cat.x) }); else worst = Math.max(worst, r.time);
    }
    return { states: n, recovered: n - fails.length, worst: +worst.toFixed(1), fails, seed: '0x' + seed.toString(16) };
  }

  /* ---------- timing table: what each screen allows at a walk and a trot (derived, not tuned by feel) ---------- */
  function timings(def = layout) {
    const D = def.san.delay, t = def.san.tine;
    return def.screens.map((s, i) => {
      const g = def.grates[i], face = s.x - NOSE, out = { screen: i + 1, latch: !!s.latch };
      for (const [k, v] of [['walk', GAIT.walk], ['trot', GAIT.trot]]) {
        const over = (g.w + t) / v, open0 = D, open1 = D + over + (s.latch ? over : s.grace);
        const arrive = (face - (g.x - t / 2)) / v;          // from the moment the rake's head would meet the grate
        out[k] = { open: [+open0.toFixed(2), +open1.toFixed(2)], arrive: +arrive.toFixed(2), ok: arrive <= open1 };
      }
      return out;
    });
  }

  function selfTest() {
    const def = layout, lines = [], ok = (c, m) => { lines.push((c ? 'PASS ' : 'FAIL ') + m); return c; };
    const bots = {};
    for (const k of ['idle', 'walker', 'trotter', 'smart']) { const r = simulate(k); delete r.world; bots[k] = r; console.log('[SAN] BOT', k, JSON.stringify(r)); }
    ok(!bots.idle.finished && bots.idle.passes === 0 && bots.idle.trips.every(n => n === 0), 'idle: nothing happens (no trips, no dig)');
    ok(!bots.walker.finished && bots.walker.x < def.screens[1].x, `walker (never trots): stuck at the second screen (x ${bots.walker.x})`);
    ok(!bots.trotter.finished && bots.trotter.x > def.screens[1].x && bots.trotter.x < def.screens[2].x, `trotter (never stops): through two screens, stuck at the third (x ${bots.trotter.x})`);
    ok(bots.smart.finished && bots.smart.time <= 120, `smart: finishes within 120 s (${bots.smart.time} s, ${bots.smart.retries} retries)`);
    if (bots.smart.time < 45) lines.push(`NOTE perfect play takes ${bots.smart.time} s (a person who reads the rake late should take longer; unverified)`);
    const tab = timings(def); console.log('[SAN] TIMINGS', JSON.stringify(tab));
    ok(tab[0].walk.ok, 'screen 1 opens for a plain walk (the teach)');
    ok(!tab[1].walk.ok && tab[1].trot.ok, 'screen 2 needs a trot across its grate, a walk is late');
    ok(!tab[2].trot.ok, 'screen 3 needs lingering: even a trot is late without it');
    // lingering can't fix screen 2 (it delays the cat as much as the rake): walk + linger never makes it
    {
      const w = fresh(def); Object.assign(w.cat, { x: def.grates[1].x + 30 }); let n = 0; while (n < 60 * 3) { botStep(w, def, { dir: 0 }); n++; }
      let stuck = 0; for (n = 0; n < 60 * 12; n++) { botStep(w, def, { dir: (n % 84) ? 1 : 0 }); }
      ok(w.cat.x < def.screens[1].x, 'screen 2: walking on after standing on its grate is still late');
    }
    const ex = explore(def); console.log('[SAN] EXPLORER', JSON.stringify(ex));
    ok(ex.fails.length === 0, `explorer: from every state random play reached, the smart bot still finishes (${ex.recovered}/${ex.states}, worst ${ex.worst} s, seed ${ex.seed})`);
    {
      const w = fresh(def); let shut = true; for (let n = 0; n < 60 * 120 && !w.dug; n++) { botStep(w, def, botInput(w, def, {})); }
      ok(!w.got && true, 'the part stays buried (hidden, no pounce) until the mound is dug');
      shut = blocksFor(fresh(def), def).some(b => b.x0 === def.exit.x + 10); ok(shut, 'the hatch stays shut until the part is in');
    }
    ok(def.part.y !== 0 || installed.has(def.part.id), 'the buried part sits below the floor (pounce cannot fire) at load');
    { const cart = def.noCart[0]; ok(def.start.x < cart[0] && def.exit.x > cart[1], `the trolley has the start apron (x ${def.start.x}) and the hatch apron (x ${def.exit.x})`); }
    { const a = fresh(def), w = fresh(def); for (let n = 0; n < 600; n++) botStep(w, def, { dir: 1 }); const b = fresh(def); ok(JSON.stringify(a) === JSON.stringify(b), 'fresh() is a clean state (reset() uses it)'); }
    ok(def.screens.every((s, i) => def.grates[i].x + def.grates[i].w < s.x - NOSE), 'every grate is before its screen (reachable before the screen blocks)');
    const pass = lines.every(l => !l.startsWith('FAIL'));
    for (const l of lines) console.log('[SAN]', l);
    return { pass, lines, bots, explorer: ex, timings: tab };
  }

  /* =====================================================================
     LIVE
     ===================================================================== */
  let state = fresh(layout), remainder = 0, prints = [], fx = { t: 0, rakeSnd: 0, drum: 0, sand: 0, digK: 0, puff: 0 }, egg = null;
  function reset() {
    if (!mine()) return;                     // not live(): the hub loads the room while the mode is still the hub's
    state = fresh(room); remainder = 0; prints = []; egg = null;
    fx.drum = 0; fx.sand = 0; fx.digK = 0; fx.still = 0;
    const done = installed.has(room.part.id);
    if (done) { state.got = true; state.dug = true; state.passes = room.mound.passes; state.rakeX = room.san.sand[0]; state.docked = true; fx.drum = 1; fx.sand = 1; }
    room.part.y = done || state.dug ? 0 : -400;   // buried: below the floor, so index.html neither draws it in view nor pounces
  }
  function update(dt, c, inputDir) {
    if (!live()) return;
    fx.t += dt;
    if (st.got && !state.got) { state.got = true; sfx('sanDrum', { x: room.drum.x }); caption('sanFixed'); console.log('%cSANITATION · the sifter turns (Claude Opus 5.5 in Claude Cowork)', 'color:#d6c08a'); }
    if (state.got) { fx.drum = Math.min(1, fx.drum + dt / 1.5); fx.sand = Math.min(1, fx.sand + dt / 2.5); }
    if (mode !== 'play' && mode !== 'pounce' && mode !== 'exit') return;
    if (rig.x > room.san.sand[0]) caption('sanStart');
    remainder += dt;
    const ev = [];
    while (remainder >= DT) { ev.push(...stepRules(state, room, DT, rig.x, !rig.air)); remainder -= DT; }
    for (const e of ev) onEvent(e);
    // the rake's tines drag: a soft rasp while it moves, faster with its speed (twin: the sand spray at the head)
    const sp = Math.abs(state.rakeV);
    if (sp > 20) { fx.rakeSnd -= dt; if (fx.rakeSnd <= 0) { fx.rakeSnd = .32; sfx('sanRake', { x: state.rakeX, mag: Math.min(1, sp / 165) }); } if (Math.random() < dt * 14) FX.dust(state.rakeX + rnd(-24, 24), GY - 4, 1, .35, -Math.sign(state.rakeV)); }
    // raked: prints under the head are smoothed away
    if (!state.got) prints = prints.filter(p => Math.abs(p.x - state.rakeX) > room.san.tine || fx.t - p.t < .3);
    // captions that teach by what just happened
    room.screens.forEach((s, i) => {
      const sc = state.screens[i];
      if (sc.waitT > 1.2 && !s.latch && state.trips[i] > 0 && !sc.tripped && sc.hold <= 0 && i > 0) caption('sanLate');
      if (sc.waitT > 1.2 && s.latch && state.trips[i] > 0 && !sc.tripped && sc.charge <= 0) caption('sanLinger');
    });
    if (!state.dug && Math.abs(rig.x - room.mound.x) < 260) caption('sanDig');
    if (fx.digK > 0) { fx.digK -= dt; Object.assign(c, { crouch: .25, headDrop: 10, earL: 20, earR: 18, tailBase: 150, wagAmp: 10, wagFreq: 3 }); }
    eggUpdate(dt, c, inputDir);
  }
  function onEvent(e) {
    if (e.k === 'trip') { sfx('sanTrip', { x: e.x }); FX.ring(e.x, GY - 2, .5); caption('sanRake'); }
    else if (e.k === 'open') { sfx('sanScreen', { x: e.x, rate: 1.1 }); FX.dust(e.x, GY, 4, .5); }
    else if (e.k === 'close') { sfx('sanScreen', { x: e.x, rate: .85, mag: .7 }); }
    else if (e.k === 'dig') {
      sfx('sanDig', { x: e.x, mag: .6 + .1 * e.n }); fx.digK = .35;
      FX.dust(e.x - 20, GY - 6, 6, .8, -rig.facing); FX.dust(e.x + 20, GY - 6, 4, .6, -rig.facing); rig.tailFlick(3);
    }
    else if (e.k === 'dug') { room.part.y = 0; sfx('sanDig', { x: e.x, mag: 1.2, rate: .8 }); sfx('perk', { x: e.x, delay: .15 }); FX.dust(e.x, GY - 4, 10, 1); FX.flash(e.x, GY - 16, .6, '255,230,170'); rig.earL.vel -= 14; rig.earR.vel -= 12; caption('sanDug'); }
  }
  // rig footfalls: in the sand they crunch (and leave a print) instead of clanking on deck plate
  function ev(e) {
    if (!live() || e.k !== 'foot') return false;
    if (e.x < room.san.sand[0] || e.x > room.san.sand[1]) return false;
    prints.push({ x: e.x, f: rig.facing, t: fx.t, h: prints.length & 1 });
    if (prints.length > 260) prints.shift();
    sfx('sanStep', { x: e.x, mag: Math.min(1.2, (e.mag || 1)) });
    return true;
  }
  const blocks = () => {
    if (!live()) return [];
    const b = []; room.screens.forEach((s, i) => { if (screenBlocks(state.screens[i])) b.push({ x0: s.x, x1: s.x + s.w, clr: CAT.nose }); });
    return b;
  };
  let humT = 0;
  function audio(dt) {
    if (!live() || mode === 'card' || mode === 'rewind') return;
    if (state.got) { humT -= dt; if (humT <= 0) { humT = 1.6; const d = Math.abs(rig.x - room.drum.x); if (d < 900) sfx('sanDrum', { x: room.drum.x, mag: .35 * (1 - d / 900), rate: 1.4 }); } }
  }

  /* =====================================================================
     THE EGG (asked for by Tasha, 2026-10-07): credit for the planning.
     After the repair the rake is free. Sit still in the sand for 5 s and it
     comes over and rakes a line of text into the sand beside catbot, letter
     by letter: who planned these rooms, and who raked them. Movement only:
     the trigger is not moving. Changes no physics. Console line too.
     ===================================================================== */
  const EGG_TEXT = 'Planned in Claude Cowork · Sonnet 5.5 · Opus 5.5';
  function eggUpdate(dt, c, inputDir) {
    if (!state.got || mode !== 'play') return;
    const inSand = rig.x > room.san.sand[0] + 40 && rig.x < room.san.sand[1] - 40 && Math.abs(rig.x - room.mound.x) > 120;
    if (!egg) {
      const still = !inputDir && Math.abs(rig.vx) < 4 && !rig.air && inSand;
      fx.still = still ? (fx.still || 0) + dt : 0;
      if (fx.still > 5) {
        const tw = eggX(EGG_TEXT.length), x0 = clamp(rig.facing > 0 ? rig.x + 110 : rig.x - 110 - tw, room.san.sand[0] + 20, room.san.sand[1] - 20 - tw);   // ahead of catbot, where it is looking
        egg = { x0, t: 0, n: 0 };
        if (typeof EGGS !== 'undefined') EGGS.mark('raked');                     // the all-eggs bonus (index.html: EGGS)
        console.log('%cSANITATION · raked into the sand: ' + EGG_TEXT + '. Planning chat: Claude Sonnet 5.5 in Claude Cowork; room built by Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork.', 'color:#d6c08a');
      }
      return;
    }
    egg.t += dt;
    const per = .09, n = Math.min(EGG_TEXT.length, Math.floor(Math.max(0, egg.t - 1.2) / per));
    if (n > egg.n) { egg.n = n; if (EGG_TEXT[n - 1] !== ' ') sfx('sanRake', { x: egg.x0 + eggX(n), mag: .3, rate: 1.3 }); }
  }
  // where the rake should be drawn while it writes (it leaves its dock for this)
  const eggRakeX = () => egg ? (egg.t < 1.2 ? lerp(room.san.sand[0], egg.x0, smooth(egg.t / 1.2)) : egg.x0 + eggX(Math.min(egg.n, EGG_TEXT.length))) : null;
  // where letter i starts, measured once in the font the sand is raked in
  let eggOff = null;
  function eggX(i) {
    if (!eggOff) { const m = document.createElement('canvas').getContext('2d'); m.font = '600 15px Oswald,sans-serif'; eggOff = []; for (let k = 0; k <= EGG_TEXT.length; k++) eggOff.push(m.measureText(EGG_TEXT.slice(0, k)).width * 1.08); }
    return eggOff[clamp(i, 0, EGG_TEXT.length)];
  }

  /* =====================================================================
     DRAW. Sand over the deck plate from the start apron to the drum; the
     rake's rail high on the back wall; grates as brass grilles half buried;
     sifter screens as mesh gates that slide up into the ceiling; the mound;
     the drum. No ctx.filter; the sand grain is a fixed hash, drawn cheaply.
     STEADY stills the drum's dust and the grain shimmer, nothing that plays.
     ===================================================================== */
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const inView = (x0, x1 = x0) => x1 > camX - 80 && x0 < camX + W / zoom + 80;
  const SAND = '#b49a6a', SAND_D = '#8d7650', SAND_L = '#d6c08a', RAIL_Y = GY - 236;
  function deck(g, t) {
    if (!live()) return;
    const R = room, [s0, s1] = R.san.sand, x0 = Math.max(camX - 8, s0 - 30), x1 = Math.min(camX + W / zoom + 8, s1 + 30);
    // the back wall: a stencil and the scrawl the hub shows
    g.save(); g.font = '600 12px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.24)';
    for (let x = Math.floor((camX - 100) / 1000) * 1000 + 520; x < camX + W + 100; x += 1000) g.fillText('SANITATION  ·  LITTER RECLAMATION  ·  KEEP THE RAKE CLEAR', x, GY - 60);
    g.font = '400 30px "Permanent Marker",Oswald,sans-serif'; g.fillStyle = 'rgba(200,215,230,.18)';
    if (inView(560, 800)) { g.save(); g.translate(580, GY - 96); g.rotate(-.06); g.fillText('LITTER BOX', 0, 0); g.restore(); }
    g.restore();
    // the rake's rail and its stops
    if (x1 > x0) {
      g.fillStyle = '#2a2f37'; g.fillRect(Math.max(x0, s0 - 20), RAIL_Y - 6, Math.min(x1, s1 + 20) - Math.max(x0, s0 - 20), 10);
      g.fillStyle = 'rgba(214,165,78,.35)'; g.fillRect(Math.max(x0, s0 - 20), RAIL_Y - 6, Math.min(x1, s1 + 20) - Math.max(x0, s0 - 20), 1.5);
      g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) if (x > s0 - 20 && x < s1 + 20) { g.fillRect(x, RAIL_Y + 4, 4, 18); }
    }
    // the dock at the start of the rail
    if (inView(s0 - 40, s0 + 40)) { g.fillStyle = '#3a4048'; g.fillRect(s0 - 34, RAIL_Y - 18, 30, 40); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(s0 - 34, RAIL_Y - 18, 30, 40); g.fillStyle = state.docked ? '#7bd88f' : '#d6a54e'; g.beginPath(); g.arc(s0 - 19, RAIL_Y - 6, 3, 0, TAU); g.fill(); }
    drawDrum(g, t);
    // the sand bed over the deck plate
    if (x1 > x0) {
      const lvl = 1 - .35 * fx.sand;            // after the repair the bed drains a little lower and level
      const top = GY - 24 + (1 - lvl) * 10;
      const gr = g.createLinearGradient(0, top, 0, GY + 2); gr.addColorStop(0, SAND_L); gr.addColorStop(.4, SAND); gr.addColorStop(1, SAND_D);
      g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, GY + 2 - top);
      // grain (hashed, so it doesn't crawl) and the raked furrows: the rake leaves combed lines behind it
      g.fillStyle = 'rgba(80,60,30,.25)';
      for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) for (let k = 0; k < 2; k++) { const y = top + 2 + hh(x * .13 + k) * (GY - top - 2); g.fillRect(x + hh(x + k * 9) * 6, y, 1, 1); }
      g.strokeStyle = 'rgba(255,240,200,.18)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const y = top + 5 + k * 5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      g.strokeStyle = 'rgba(70,50,25,.22)';
      for (let k = 0; k < 4; k++) { const y = top + 6.5 + k * 5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      // the front lip of the bed, over the deck's cross-section
      g.fillStyle = '#6f5c3d'; g.fillRect(x0, GY + 1, x1 - x0, 3);
    }
    // grates, half under the sand, with the lamp that reports the rake on them
    R.grates.forEach((gt, i) => drawGrate(g, t, gt, i));
    // the egg's raked words, then catbot's prints (raked away as the rake passes)
    if (egg) drawEggText(g, t);
    for (const p of prints) {
      if (!inView(p.x)) continue;
      const a = .55 * clamp(1 - (fx.t - p.t) / 400, .4, 1), y = GY - 9 + (p.h ? 3 : -3);
      g.save(); g.translate(p.x, y); g.scale(1, .42);
      g.fillStyle = `rgba(70,50,25,${a})`; g.beginPath(); g.ellipse(0, 0, 4.2, 3.6, 0, 0, TAU); g.fill();
      for (const [dx, dy] of [[-4.4, -5], [0, -6.6], [4.4, -5]]) { g.beginPath(); g.arc(dx + p.f * 1.5, dy, 1.6, 0, TAU); g.fill(); }
      g.restore();
    }
    drawMound(g, t);
    R.screens.forEach((s, i) => drawScreen(g, t, s, i, 'back'));
    drawRake(g, t);
  }
  function drawGrate(g, t, gt, i) {
    if (!inView(gt.x, gt.x + gt.w)) return;
    const sc = state.screens[i], y = GY - 14;
    g.fillStyle = '#4a3a22'; g.fillRect(gt.x, y - 2, gt.w, 8);
    g.strokeStyle = sc.tripped ? 'rgba(255,214,140,.95)' : 'rgba(214,165,78,.55)'; g.lineWidth = 1.5;
    for (let x = gt.x + 5; x < gt.x + gt.w - 2; x += 7) { g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x - 3, y + 5); g.stroke(); }
    g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(gt.x, y - 2, gt.w, 8);
    // its lamp on the back wall, and a dotted cable along the wall to its screen
    const s = room.screens[i], lx = gt.x + gt.w / 2, ly = GY - 46;
    g.fillStyle = '#2a2f37'; g.fillRect(lx - 6, ly - 6, 12, 12);
    const on = sc.tripped ? 1 : sc.hold > 0 ? .5 : 0;
    g.fillStyle = on ? `rgba(255,${200 + 30 * on | 0},120,${.5 + .5 * on})` : 'rgba(90,80,60,.6)'; g.beginPath(); g.arc(lx, ly, 3.4, 0, TAU); g.fill();
    if (on) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, lx, ly, 14, 14, .4 * on, '255,200,120'); g.restore(); }
    g.strokeStyle = on ? 'rgba(255,214,140,.5)' : 'rgba(214,165,78,.18)'; g.setLineDash([3, 5]); g.beginPath(); g.moveTo(lx + 6, ly); g.lineTo(s.x - 6, ly); g.stroke(); g.setLineDash([]);
    g.save(); g.font = '600 8px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.45)'; g.fillText((s.latch ? 'TIMED ' : '') + 'GRATE ' + (i + 1), gt.x, ly - 10); g.restore();
  }
  function drawScreen(g, t, s, i, layer) {
    if (!inView(s.x - 20, s.x + s.w + 20)) return;
    const sc = state.screens[i], top = -60, lift = sc.o * (GY - 4 - 80 - top);
    const x = s.x, w = s.w;
    if (layer === 'back') {
      // the posts and the housing above
      g.fillStyle = '#2d3239'; g.fillRect(x - 10, top, 8, GY - top); g.fillRect(x + w + 2, top, 8, GY - top);
      g.fillStyle = '#3a4048'; g.fillRect(x - 14, 40, w + 28, 26); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x - 14, 40, w + 28, 26);
      // the timed screen's gauge: how long the rake stood on its grate, draining
      if (s.latch) {
        const k = clamp(sc.charge / 6, 0, 1);
        g.fillStyle = '#14171c'; g.fillRect(x - 30, 76, 10, 120); g.fillStyle = `rgba(255,200,110,${.5 + .5 * (k > 0)})`; g.fillRect(x - 29, 76 + 119 * (1 - k), 8, 119 * k);
        g.strokeStyle = OL; g.strokeRect(x - 30, 76, 10, 120);
        g.save(); g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText('HOLD', x - 34, 72); g.restore();
      }
      return;
    }
    // the mesh panel, sliding up into the housing (in front of catbot, so it passes under it)
    const y0 = 60 - 4 + 0 - lift * 0, py = GY - 4 - 200 + 0 - lift;
    g.save(); g.beginPath(); g.rect(x - 4, 66, w + 8, GY - 66); g.clip();
    const ph = 204, y1 = GY - ph - lift;
    g.fillStyle = 'rgba(60,66,74,.92)'; g.fillRect(x, y1, w, ph);
    g.strokeStyle = 'rgba(160,170,180,.45)'; g.lineWidth = 1;
    for (let y = y1 + 4; y < y1 + ph; y += 6) { g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + w - 1, y + 3); g.stroke(); }
    g.fillStyle = '#d6a54e'; g.fillRect(x, y1 + ph - 6, w, 6); g.strokeStyle = OL; g.strokeRect(x, y1, w, ph);
    g.restore();
  }
  function drawMound(g, t) {
    const m = room.mound; if (!inView(m.x - m.w, m.x + m.w)) return;
    const k = state.dug ? 0 : 1 - state.passes / m.passes, hgt = 6 + 34 * k;
    if (state.dug && st.got) return;
    g.fillStyle = SAND; g.beginPath(); g.moveTo(m.x - m.w * .7, GY - 18);
    g.quadraticCurveTo(m.x - m.w * .25, GY - 18 - hgt * 1.1, m.x, GY - 18 - hgt); g.quadraticCurveTo(m.x + m.w * .25, GY - 18 - hgt * 1.1, m.x + m.w * .7, GY - 18); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.ellipse(m.x - 12, GY - 18 - hgt * .8, 22, 4, -.1, 0, TAU); g.fill();
    // a glint of brass, more of it as the mound gets lower
    if (!state.dug) { const a = .15 + .5 * (1 - k); g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, m.x + 6, GY - 20 - hgt * .4, 8, 4, a * (.7 + .3 * Math.sin(t * 3)), '255,220,150'); g.restore(); }
  }
  function drawRake(g, t) {
    const rx = egg ? eggRakeX() : state.rakeX;
    if (!inView(rx - 60, rx + 60)) return;
    // the head lifts its tines over catbot (and while docked)
    const over = Math.abs(rx - rig.x) < 70 && !egg, up = state.docked && !egg ? 1 : over ? .7 : 0;
    fx.lift = damp(fx.lift || 0, up, 8, 1 / 60);
    const headY = GY - 14 - 60 * fx.lift, tine = room.san.tine;
    // carriage on the rail, the telescopic arm, the head
    g.fillStyle = '#4b5059'; g.fillRect(rx - 16, RAIL_Y - 12, 32, 20); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(rx - 16, RAIL_Y - 12, 32, 20);
    g.fillStyle = '#20242a'; for (const dx of [-9, 9]) { g.beginPath(); g.arc(rx + dx, RAIL_Y - 8, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = '#6d747d'; g.fillRect(rx - 3, RAIL_Y + 8, 6, headY - RAIL_Y - 14); g.fillStyle = '#8d939b'; g.fillRect(rx - 2, RAIL_Y + 8, 2, headY - RAIL_Y - 14);
    g.fillStyle = '#d6a54e'; g.fillRect(rx - tine - 4, headY - 10, tine * 2 + 8, 8); g.strokeStyle = OL; g.strokeRect(rx - tine - 4, headY - 10, tine * 2 + 8, 8);
    g.strokeStyle = '#b8bec6'; g.lineWidth = 1.6;
    for (let x = rx - tine; x <= rx + tine; x += 5) { g.beginPath(); g.moveTo(x, headY - 2); g.lineTo(x - Math.sign(state.rakeV || 1) * 2, headY + 9); g.stroke(); }
    // a lamp on the carriage: amber while it follows, green docked
    g.fillStyle = state.docked ? '#7bd88f' : '#ffb35a'; g.beginPath(); g.arc(rx, RAIL_Y - 2, 2.6, 0, TAU); g.fill();
  }
  function drawDrum(g, t) {
    const d = room.drum, x = d.x, y = GY - 128; if (!inView(x - 80, x + 80)) return;
    g.fillStyle = '#2b3038'; g.fillRect(x - 70, y - 70, 140, 150); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x - 70, y - 70, 140, 150);
    // the drum: a perforated cylinder end-on, turning once the gear is in
    const a = t * 1.4 * fx.drum;
    g.save(); g.translate(x, y); g.fillStyle = '#4a5058'; g.beginPath(); g.arc(0, 0, 52, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let r = 18; r < 50; r += 10) for (let k = 0; k < 12; k++) { const q = a + k / 12 * TAU + r * .05; g.beginPath(); g.arc(Math.cos(q) * r, Math.sin(q) * r, 2, 0, TAU); g.fill(); }
    g.strokeStyle = '#8d939b'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 52, 0, TAU); g.stroke();
    if (!st.got) { g.setLineDash([4, 4]); g.strokeStyle = 'rgba(214,165,78,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke(); g.setLineDash([]); }
    else disc(g, 0, 0, 16, NEAR, a * 3, false);
    g.restore();
    // a chute down to the bed: sand pours while it turns (STEADY: a steady stream, no spray)
    g.fillStyle = '#3a4048'; g.fillRect(x - 12, y + 52, 24, 30);
    if (fx.drum > 0 && !settings.calm && Math.random() < .3) FX.dust(x + rnd(-8, 8), GY - 20, 1, .3);
    g.save(); g.font = '600 9px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText(st.got ? 'SIFTER  ·  RUNNING' : 'SIFTER  ·  DRIVE GEAR MISSING', x - 66, y - 78); g.restore();
  }
  function drawEggText(g, t) {
    const n = Math.min(egg.n, EGG_TEXT.length);
    g.save(); g.translate(egg.x0, GY - 8); g.scale(1, .55);
    g.font = '600 15px Oswald,sans-serif';
    for (let i = 0; i < n; i++) {
      const ch = EGG_TEXT[i], x = eggX(i);
      g.fillStyle = 'rgba(70,50,25,.6)'; g.fillText(ch, x, 0);
      g.fillStyle = 'rgba(255,240,200,.35)'; g.fillText(ch, x - .8, -1.2);
    }
    g.restore();
  }
  function front(g, t) {
    if (!live()) return;
    room.screens.forEach((s, i) => drawScreen(g, t, s, i, 'front'));
  }

  /* =====================================================================
     LIVE TEST (&verify): plays the smart bot's choices through the real
     loop by keys and taps (the bot reads the live world each tick), with
     STEADY off and on; checks the part, the repair and the hatch; then
     isolation: in every other room, every hook does nothing.
     ===================================================================== */
  function liveTest() {
    if (!mine()) return { pass: false, reason: 'load the sanitation first' };
    const saved = { settings: { ...settings }, storage: localStorage.getItem('catbot.settings'), parts: [...installed], run: { ...run }, caps: [...seenCaps], T };
    const runs = [], shots = {};
    try {
      for (const steady of [false, true]) {
        settings.sound = false; settings.calm = steady; AUDIO.enable(false);
        installed.delete(room.part.id); resetRoom(); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0;
        const brain = {}; let frames = 0, finished = false, lastTap = 0;
        while (frames < 60 * 180) {
          // the bot reads catbot as the world sees it (rig x, speed, facing)
          Object.assign(state.cat, { x: rig.x, vx: rig.vx, face: rig.facing });
          const inp = mode === 'play' ? botInput(state, room, brain) : { dir: 0 };
          keys.l = inp.dir < 0; keys.r = inp.dir > 0;
          if (inp.doubleTap && inp.dir && sprint !== inp.dir && frames - lastTap > 30) { tap(inp.dir); tap(inp.dir); lastTap = frames; }
          tick(DT); frames++;
          if (!steady) {
            const checks = { rake: state.screens[0].tripped && Math.abs(rig.x - room.screens[0].x) < 300, linger: Math.abs(rig.x - (room.grates[2].x + 40)) < 30 && state.screens[2].charge > 1, dig: state.passes === 2, drum: st.got && fx.drum > .6 };
            for (const [k, okk] of Object.entries(checks)) if (okk && !shots[k]) { render(0); shots[k] = cv.toDataURL('image/png'); }
          }
          if (mode === 'exit') { finished = true; break; }
        }
        const r = { steady, finished, time: +(frames / 60).toFixed(2), installed: installed.has(room.part.id), passes: state.passes, retries: brain.tries || 0 };
        r.pass = finished && r.installed;
        runs.push(r); console.log('[SAN] LIVE', JSON.stringify(r));
      }
      // isolation: in every other room, every hook does nothing
      const isolation = [];
      for (let i = 0; i < ROOMS.length; i++) if (!ROOMS[i].san) {
        loadRoom(i); mode = 'play';
        const c = freshCtrl(), before = JSON.stringify(c), rx = rig.x, e = { k: 'foot', mag: 1, x: rig.x, y: GY };
        reset(); update(DT, c, 1); audio(DT); deck(ctx, 0); front(ctx, 0);
        const okk = JSON.stringify(c) === before && rig.x === rx && blocks().length === 0 && !ev(e);
        isolation.push({ room: room.id, pass: okk });
      }
      console.log('[SAN] ISOLATION', JSON.stringify(isolation));
      return { pass: runs.every(r => r.pass) && isolation.every(r => r.pass), runs, isolation, shots: Object.keys(shots) };
    } finally {
      installed.clear(); for (const id of saved.parts) installed.add(id);
      Object.assign(settings, saved.settings); if (saved.storage === null) localStorage.removeItem('catbot.settings'); else localStorage.setItem('catbot.settings', saved.storage);
      Object.assign(run, saved.run); seenCaps.clear(); for (const k of saved.caps) seenCaps.add(k); T = saved.T;
      AUDIO.enable(settings.sound); keys.l = keys.r = false; sprint = 0;
      loadRoom(ROOMS.findIndex(r => r.san)); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0; camX = camTarget(); camY = 0; caps.length = 0;
      window.__sanShots = shots;
      render(0);
    }
  }
  // peak and share of energy above 150 Hz / in 150-400 Hz of each new sound alone, rendered offline
  // (the method observation.js uses: a fresh audio.js in a hidden frame, master/limiter output, one sound alone)
  async function measureSounds(names = ['sanStep', 'sanRake', 'sanTrip', 'sanScreen', 'sanDig', 'sanDrum'], tag = '[SAN]') {
    if (typeof OfflineAudioContext === 'undefined') return { verified: false, reason: 'OfflineAudioContext unavailable' };
    const frame = document.createElement('iframe'); frame.hidden = true;
    const loaded = new Promise(res => { frame.onload = res; });
    frame.srcdoc = '<script src="audio.js"><\/script>'; document.body.appendChild(frame); await loaded;
    const out = {};
    try {
      const A = frame.contentWindow.AUDIO;
      for (const name of names) {
        const ctx2 = new OfflineAudioContext(1, 48000 * 2, 48000); A.attach(ctx2, true); A.limits(false); A.sfx(name, { mag: 1, rate: 1 });
        const buf = await ctx2.startRendering(), x = buf.getChannelData(0), n = 131072, re = new Float64Array(n), im = new Float64Array(n);
        let peak = 0; for (let i = 0; i < x.length; i++) { re[i] = x[i]; peak = Math.max(peak, Math.abs(x[i])); }
        for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; } }
        for (let size = 2; size <= n; size *= 2) {
          const ang = -2 * Math.PI / size;
          for (let s0 = 0; s0 < n; s0 += size) for (let j = 0; j < size / 2; j++) {
            const a = s0 + j, b = a + size / 2, co = Math.cos(ang * j), si = Math.sin(ang * j), br = re[b] * co - im[b] * si, bi = re[b] * si + im[b] * co;
            re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
          }
        }
        let tot = 0, above = 0, body = 0; for (let i = 1; i < n / 2; i++) { const hz = i * 48000 / n, e = re[i] * re[i] + im[i] * im[i]; tot += e; if (hz >= 150) above += e; if (hz >= 150 && hz <= 400) body += e; }
        out[name] = { peak: +peak.toFixed(4), above150Pct: +(above / tot * 100).toFixed(1), body150to400Pct: +(body / tot * 100).toFixed(1) };
        console.log(tag, 'SOUND', name, JSON.stringify(out[name]));
      }
    } finally { frame.remove(); }
    return { verified: true, measurements: out };
  }

  // index.html calls ENG.seat() for any part with a room.socket; here the gear goes into the sifter drum (drawn from st.got)
  if (window.ENG && ENG.seat) { const prev = ENG.seat; ENG.seat = (...a) => mine() ? undefined : prev(...a); }

  return { reset, update, ev, blocks, audio, deck, front, simulate, selfTest, explore, timings, liveTest, measureSounds, stepRules, fresh, botInput, get state() { return state; } };
})();

/* dev entry: index.html#room=sanitation  (&parts=... ; hip, engine, galley and observation are assumed; &test runs the self-test, &verify adds the live run) */
if (typeof location !== 'undefined' && /(^|[#&])room=sanitation(?:&|$)/.test(location.hash)) {
  const pm = /parts=([\w,-]+)/.exec(location.hash);
  for (const id of pm ? pm[1].split(',') : ['hip', 'engine', 'galley', 'observation']) if (id !== 'none') installed.add(id);
  OPEN.finish(false); loadRoom(ROOMS.findIndex(r => r.id === 'sanitation')); mode = 'play'; modeT = 0;
  if (/[#&]test/.test(location.hash)) setTimeout(async () => {
    const r = window.__sanTest = SAN.selfTest();
    if (/[#&]verify(?:&|$)/.test(location.hash)) { r.live = SAN.liveTest(); r.sounds = await SAN.measureSounds(); r.pass = r.pass && r.live.pass; }
    console.log('[SAN] RESULT', r.pass ? 'PASS' : 'FAIL');
  }, 500);
}
