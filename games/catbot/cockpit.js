'use strict';
/* =====================================================================
   COCKPIT: room 8, the finale. Built with Claude Opus 5.5 (claude-opus-5-5)
   in Claude Cowork, 2026-10-07, from the plan agreed with Tasha in the
   Cowork planning chat.

   The story so far: the shuttle came down on a planet's surface; in the
   opening a ball of yarn rolled under a bench; Observation's telescope found
   it snagged on the hull just outside the cockpit glass. The yarn is the
   shuttle's main coil. Seven rooms are back on line, so the cockpit has
   emergency power, and catbot goes to fetch it.

   1. The encore: a corridor on emergency power. A deck belt that runs back
      at you (the Engine Bay), a search lamp on patrol that sees only what
      moves (Berthing), a cat wheel that spins the reactor up (Hydroponics).
      The reactor opens the bulkhead to the nose.
   2. The yarn: its loose end trails in through a crack in the windscreen.
      Walk up to it and catbot takes it in its mouth; walk AWAY to reel it in.
      It's heavy (the Galley's strain). Let go and the thread drags you back a
      little. Pull far enough and the ball pops free outside, bounces down the
      hull and comes in through the cat flap.
   3. The coil: pounce it (the shared pounce) and it flies into the main-coil
      socket in the console.
   4. Power-up: every repair lights on the console, one by one; the engines
      catch; outside, the shuttle lifts off the surface.
   5. Credits: the run (time, rewinds), who made what (the AI-use
      disclosure), every egg with its maker (found ones lit), and, if all of
      them were found, the bonus. Then back to the deck plan.

   Movement is the only verb throughout. The rules (lamp, wheel, door,
   thread, ball) live in stepRules(), a pure function at 60 Hz fed catbot's
   {x, vx, face, air} and the held direction; the live game feeds the rig,
   the bot (simulate) a small model of the rig's walk. Nothing here owns
   catbot's x: the belt and wheel move the floor (ctrl.belt), the pull caps
   the walk (ctrl.vx), the door blocks (CKP.blocks), the lamp's shove is the
   rig's own jump.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA. Fields only this file reads:
     ckp:{pull,pullV,drag}     how far the thread must be reeled (px), the reeling pace, the drag back when you stop
     belt:{x,w,v}              the encore belt (px/s, negative runs back at you)
     lamp:{x0,x1,half,speed,dwell}  the emergency search lamp's patrol
     wheel:{x,w}               the cat wheel that spins the reactor up
     door:{x,w}                the bulkhead to the nose (opens for good with the reactor)
     console:{x,w}             the flight console (the main-coil socket is in it)
     thread:{x}                where the loose end lies on the floor
     glass:{x}                 where the windscreen begins (the right wall of the nose)
     flap:{x}                  the cat flap in the nose's right wall
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'cockpit', name: 'Cockpit', w: 3060, floorSlip: 0,
  ckp: { pull: 240, pullV: 46, drag: 18 },
  start: { x: 250, face: 1 }, reset: { x: 22, w: 112 },
  belt: { x: 520, w: 300, v: -70 },
  lamp: { x0: 1080, x1: 1640, half: 95, speed: 110, dwell: 1 },
  wheel: { x: 1840, w: 150 },
  door: { x: 2140, w: 28 },
  console: { x: 2440, w: 240 },
  thread: { x: 2770 },
  glass: { x: 2850 },
  flap: { x: 2990 },
  part: { x: 2640, y: -400, id: 'yarn', name: 'MAIN COIL' },
  captions: [
    { on: 'ckStart', text: 'Emergency power. The cockpit is that way.' },
    { on: 'ckLamp', text: 'Shh... Don\'t let the 💡 see you.' },
    { on: 'ckSpot', text: 'It saw you move. Hold still when the light finds you.' },
    { on: 'ckWheel', text: 'Wind up the reactor.' },
    { on: 'ckReactor', text: 'The reactor catches. The bulkhead opens.' },
    { on: 'ckThread', text: 'Catbot sees a tail poking through the glass.' },
    { on: 'ckPull', text: 'Must... drag... this... tail... away...' },
    { on: 'ckPop', text: 'It pops free! Get ready to pounce!' },
    { on: 'ckTurn', text: 'My yarn! It\'s behind me!' },
    { on: 'ckPower', text: 'Main coil seated. Every system answers.', dur: 4 },
    { on: 'ckAgain', text: 'The console. Step up to it to fly again.' }
  ]
});
{
  const R = ROOMS[ROOMS.length - 1];
  R.socket = { x: R.console.x + R.console.w / 2, y: GY - 120 };
  R.noCart = [[R.belt.x - 40, R.w]];                 // the trolley keeps to the start apron: everything past it is the run to the nose
  R.rail = [[0, R.belt.x - 50]];
}

window.CKP = (function () {
  const layout = ROOMS.find(r => r.id === 'cockpit');
  const mine = () => !!room && !!room.ckp;
  const live = () => mine() && !inHub();
  const DT = 1 / 60, ACC = 260, TURN = .25, NOSE = 88, BODY = 45;
  const approach = (v, t, d) => v + clamp(t - v, -d, d);
  const SYSTEMS = [
    { id: 'hip', name: 'HIP' }, { id: 'engine', name: 'TURBINE' }, { id: 'berthing', name: 'BREAKER' }, { id: 'galley', name: 'MIXER' },
    { id: 'observation', name: 'ASTROLABE' }, { id: 'sanitation', name: 'SIFTER' }, { id: 'hydroponics', name: 'PUMP' }
  ];

  function fresh(def) {
    return {
      t: 0,
      lamp: { x: def.lamp.x0, dir: 1, dwell: 0, flare: 0 }, spotCd: 0, spots: 0,
      reactor: 0, released: false, done: false, door: 0, eng: false,
      hold: false, held: false, progress: 0, popped: false, ball: 'snag', ballT: 0, rest: false,
      cat: { x: def.start.x, vx: 0, face: def.start.face || 1, walkT: 0, sprint: 0, turn: 0, freeze: 0 },
      got: false, gotT: -1, fin: false, seen: false
    };
  }
  const copy = w => JSON.parse(JSON.stringify(w));
  const onBelt = (x, def) => x > def.belt.x && x < def.belt.x + def.belt.w;
  const inWheel = (x, def) => x > def.wheel.x + 18 && x < def.wheel.x + def.wheel.w - 18;
  const holdX = def => def.wheel.x + def.wheel.w / 2;

  /* ---------- the rules. Pure: fed catbot as {x, vx, face, air} and the held direction ---------- */
  function stepRules(w, def, dt, cat, dir) {
    const ev = [];
    w.t += dt;
    // the lamp patrols until the reactor catches, then parks at its far end
    const L = w.lamp, lp = def.lamp;
    if (!w.done) {
      if (L.dwell > 0) { L.dwell -= dt; if (L.dwell <= 0) L.dir *= -1; }
      else { L.x += L.dir * lp.speed * dt; if (L.x >= lp.x1 || L.x <= lp.x0) { L.x = clamp(L.x, lp.x0, lp.x1); L.dwell = lp.dwell; } }
    } else L.x = approach(L.x, lp.x1 + 60, 140 * dt);
    L.flare = Math.max(0, L.flare - dt);
    w.spotCd = Math.max(0, w.spotCd - dt);
    if (!w.done && !cat.air && Math.abs(cat.vx) > 25 && w.spotCd <= 0 && cat.x + BODY > L.x - lp.half + 12 && cat.x - BODY < L.x + lp.half - 12) {
      w.spotCd = 1.6; w.spots++; L.flare = .6; ev.push({ k: 'spot', x: cat.x, dir: Math.sign(cat.vx) });
    }
    // the wheel: running right inside it pumps the reactor toward the pace's share of a trot; it catches at a trot
    const inside = inWheel(cat.x, def);
    if (!inside && w.released) w.released = false;
    w.eng = !w.done && inside && !w.released && cat.face > 0 && !cat.air;
    const pace = w.eng ? Math.max(0, cat.vx) : 0, target = Math.min(1.2, pace / GAIT.trot);
    if (!w.done) {
      if (w.eng && pace > 20) {
        w.reactor = w.reactor < target ? Math.min(target, w.reactor + .5 * dt) : Math.max(target, w.reactor - .1 * dt);
        if (w.reactor >= .97 && target >= .97) { w.done = true; w.released = true; ev.push({ k: 'reactor', x: holdX(def) }); }
      } else w.reactor = Math.max(0, w.reactor - .1 * dt);
    }
    w.door = w.done ? Math.min(1, w.door + dt / 1.2) : 0;
    // the thread: the loose end is taken the moment catbot reaches it; walking away reels; stopping lets it drag you back
    const th = def.thread, cp = def.ckp;
    if (!w.popped) {
      if (!w.hold && cat.x >= th.x - 24 && !cat.air) { w.hold = true; ev.push({ k: 'grab', x: th.x }); }
      if (w.hold) {
        if (cat.vx < -5) w.progress += -cat.vx * dt;
        else if (!dir) w.progress = Math.max(0, w.progress - 12 * dt);
        if (w.progress >= cp.pull) { w.popped = true; w.hold = false; w.ball = 'fall'; w.ballT = 0; ev.push({ k: 'pop', x: def.glass.x + 60 }); }
      }
    }
    // the ball: down the outside of the glass, in through the cat flap, a roll across the floor to rest
    if (w.ball === 'fall') {
      const was = w.ballT; w.ballT += dt;
      if (was < .95 && w.ballT >= .95) ev.push({ k: 'flap', x: def.flap.x });
      if (w.ballT >= 2.7) { w.ball = 'rest'; w.rest = true; ev.push({ k: 'rest', x: def.part.x }); }
    }
    return ev;
  }
  // where the ball is drawn (world px, y up from GY) at a given point of its fall
  function ballPos(def, w) {
    const g = def.glass, fl = def.flap, P = def.part;
    if (w.ball === 'snag') return { x: g.x + 95, y: 236, out: true, a: 0 };
    if (w.ball === 'rest') return { x: P.x, y: 15, out: false, a: 0 };
    const t = w.ballT;
    if (t < .95) { const u = t / .95; return { x: lerp(g.x + 95, fl.x + 30, u), y: lerp(236, 30, u * u) + Math.abs(Math.sin(u * 7)) * 18 * (1 - u), out: true, a: u * 9 }; }
    if (t < 1.2) { const u = (t - .95) / .25; return { x: lerp(fl.x + 30, fl.x - 30, u), y: 15, out: false, a: 9 + u * 3 }; }
    const u = smooth((t - 1.2) / 1.5); return { x: lerp(fl.x - 30, P.x, u), y: 15 + Math.abs(Math.sin(u * 9)) * 10 * (1 - u), out: false, a: 12 + u * 10 };
  }

  /* ---------- the bot's catbot: the rig's walk, plus what this room does to it ---------- */
  function blocksFor(w, def) {
    const b = [{ x0: -1e4, x1: 16 }];
    if (w.door < .8) b.push({ x0: def.door.x, x1: def.door.x + def.door.w });
    b.push({ x0: def.glass.x + 40, x1: def.w + 100 });      // the nose's right wall
    return b;
  }
  function stepCat(w, def, dt, inp) {
    const c = w.cat;
    if (c.freeze > 0) { c.freeze -= dt; c.x += c.vx * dt; c.vx = approach(c.vx, 0, 600 * dt); return; }
    const dir = inp.dir || 0;
    if (dir && dir !== c.face) {
      c.vx = approach(c.vx, 0, ACC * dt); c.walkT = 0; c.sprint = 0;
      if (Math.abs(c.vx) < 25) { c.turn += dt; if (c.turn >= TURN) { c.face = dir; c.turn = 0; } }
    } else {
      c.turn = 0;
      if (dir) { c.walkT += dt; if (inp.doubleTap) c.sprint = dir; } else { c.walkT = 0; c.sprint = 0; }
      let max = dir ? (c.walkT >= GAIT.hold || c.sprint === dir ? GAIT.trot : GAIT.walk) : 0;
      if (w.hold && dir < 0) max = def.ckp.pullV;
      c.vx = approach(c.vx, dir * max, ACC * dt);
    }
    let floor = 0;
    if (onBelt(c.x, def)) floor = def.belt.v;
    if (w.eng) { c.x = approach(c.x, holdX(def), 400 * dt); floor = 0; }
    else if (w.hold && !dir) floor = def.ckp.drag;
    if (!w.eng) c.x += (c.vx + floor) * dt;
    if (w.hold) c.x = Math.min(c.x, def.thread.x);
    for (const b of blocksFor(w, def)) {
      if (b.x0 > c.x - 1) { const lim = b.x0 - NOSE; if (c.x > lim) { c.x = lim; if (c.vx > 0) c.vx = 0; } }
      else if (b.x1 < c.x + 1) { const lim = b.x1 + NOSE; if (c.x < lim) { c.x = lim; if (c.vx < 0) c.vx = 0; } }
    }
  }
  function botPart(w, def) {
    const d = def.part.x - w.cat.x;
    if (w.rest && !w.got && w.gotT < 0 && Math.sign(d) === w.cat.face && Math.abs(d) < 190 && Math.abs(d) > 40 && Math.abs(w.cat.vx) < 30) w.gotT = w.t;
    if (w.gotT >= 0 && !w.got && w.t - w.gotT > 2.1) { w.got = true; w.fin = true; }
  }
  function botStep(w, def, inp) {
    if (w.gotT >= 0 && !w.got) inp = { dir: 0 };
    stepCat(w, def, DT, inp);
    const ev = stepRules(w, def, DT, w.cat, inp.dir || 0);
    for (const e of ev) if (e.k === 'spot') { w.cat.freeze = .55; w.cat.vx = -e.dir * 240; w.cat.walkT = 0; w.cat.sprint = 0; }
    botPart(w, def);
    return ev;
  }
  // will the lamp's spot be on catbot within `ahead` s if catbot keeps its pace?
  function lampThreat(w, def, ahead) {
    const L = w.lamp, lp = def.lamp, c = w.cat;
    if (w.done) return false;
    let lx = L.x, dir = L.dir, dwell = L.dwell, cx = c.x;
    for (let t = 0; t <= ahead; t += .05) {
      if (cx + BODY > lx - lp.half + 4 && cx - BODY < lx + lp.half - 4) return true;
      if (dwell > 0) { dwell -= .05; if (dwell <= 0) dir *= -1; } else { lx += dir * lp.speed * .05; if (lx >= lp.x1 || lx <= lp.x0) { lx = clamp(lx, lp.x0, lp.x1); dwell = lp.dwell; } }
      cx += Math.max(c.vx, GAIT.walk * .8) * .05;
    }
    return false;
  }
  function botInput(w, def, brain) {
    const c = w.cat;
    if (c.freeze > 0) return { dir: 0 };
    if (!w.done) {
      // through the lamp's patrol: freeze while its light is on you or about to be, go when it isn't
      const L = w.lamp, lp = def.lamp, onSpot = c.x + BODY > L.x - lp.half && c.x - BODY < L.x + lp.half;
      if (c.x > lp.x0 - 260 && c.x < lp.x1 + 160 && (onSpot || lampThreat(w, def, .9))) return { dir: 0 };
      return { dir: 1, doubleTap: c.x > def.wheel.x - 150 };
    }
    if (!w.popped) {
      if (!w.hold) return { dir: 1 };
      return { dir: -1 };                                   // walk away with it
    }
    if (!w.rest) return { dir: 0 };
    if (w.gotT >= 0) return { dir: 0 };
    // turn round to face the ball, then hold still: the pounce does the rest
    const d = def.part.x - c.x;
    if (Math.abs(d) < 60) return { dir: Math.sign(-d) || -1 };
    if (Math.sign(d) !== c.face) return { dir: Math.sign(d) };
    if (Math.abs(d) > 180) return { dir: Math.sign(d) };
    return { dir: 0 };
  }
  const STRATS = {
    idle: () => ({ dir: 0 }),
    walker: (w, def, b) => { b.n = (b.n || 0) + 1; return { dir: b.n % 84 === 0 ? 0 : 1 }; },
    trotter: () => ({ dir: 1, doubleTap: true }),
    smart: botInput
  };
  function simulate(strategy, opt = {}) {
    const def = opt.def || layout, w = opt.world ? copy(opt.world) : fresh(def), brain = opt.brain || {}, f = STRATS[strategy];
    const max = opt.max || 240; let n = 0;
    while (!w.fin && n < max * 60) { botStep(w, def, f(w, def, brain)); n++; }
    return { finished: w.fin, time: +(n / 60).toFixed(2), spots: w.spots, reactor: w.done, popped: w.popped, x: Math.round(w.cat.x), world: w };
  }
  function explore(def = layout, n = 50, seed = 0x0c0c4b17) {
    let s = seed >>> 0; const rr = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    let worst = 0; const fails = [];
    for (let i = 0; i < n; i++) {
      const w = fresh(def), brain = {}; let d = 0, hold = 0;
      const steps = Math.floor(rr() * 60 * 70);
      for (let k = 0; k < steps && !w.fin; k++) {
        if (hold-- <= 0) { d = [-1, 0, 1, 1, 1][Math.floor(rr() * 5)]; hold = Math.floor(rr() * 150); }
        botStep(w, def, rr() < .5 ? botInput(w, def, brain) : { dir: d, doubleTap: rr() < .2 });
      }
      const r = simulate('smart', { def, world: w, max: 200 });
      if (!r.finished) fails.push({ i, x: Math.round(w.cat.x) }); else worst = Math.max(worst, r.time);
    }
    return { states: n, recovered: n - fails.length, worst: +worst.toFixed(1), fails, seed: '0x' + seed.toString(16) };
  }
  function selfTest() {
    const def = layout, lines = [], ok = (c, m) => { lines.push((c ? 'PASS ' : 'FAIL ') + m); return c; };
    const bots = {};
    for (const k of ['idle', 'walker', 'trotter', 'smart']) { const r = simulate(k); delete r.world; bots[k] = r; console.log('[CKP] BOT', k, JSON.stringify(r)); }
    ok(!bots.idle.finished && bots.idle.spots === 0, 'idle: nothing happens (a still cat is never seen)');
    ok(!bots.walker.finished && !bots.walker.reactor, `walker (never trots): the reactor never catches (x ${bots.walker.x})`);
    ok(!bots.trotter.finished && !bots.trotter.popped, `trotter (holds right): never pulls, so the yarn never comes (x ${bots.trotter.x}, ${bots.trotter.spots} spots)`);
    ok(bots.smart.finished && bots.smart.time <= 120, `smart: finishes within 120 s (${bots.smart.time} s, ${bots.smart.spots} spots)`);
    // a still cat anywhere under the lamp's patrol is never seen, over two full laps
    { let seen = 0; for (let x = def.lamp.x0 - 60; x <= def.lamp.x1 + 60; x += 40) { const w = fresh(def); for (let n = 0; n < 60 * 24; n++) seen += stepRules(w, def, DT, { x, vx: 0, face: 1, air: false }, 0).filter(e => e.k === 'spot').length; } ok(seen === 0, 'the lamp never sees a cat that holds still'); }
    // a walk in the wheel keeps it ticking over but never catches the reactor
    { const w = fresh(def); for (let n = 0; n < 60 * 20; n++) stepRules(w, def, DT, { x: holdX(def), vx: GAIT.walk, face: 1, air: false }, 1); ok(!w.done && w.reactor < .7, `a walk in the wheel never catches the reactor (level ${w.reactor.toFixed(2)})`); }
    // the yarn needs pulling: holding still at the thread loses progress, walking toward the glass doesn't add any
    { const w = fresh(def); w.done = true; w.door = 1; stepRules(w, def, DT, { x: def.thread.x, vx: 0, face: 1, air: false }, 0); for (let n = 0; n < 60 * 10; n++) stepRules(w, def, DT, { x: def.thread.x - 5, vx: 30, face: 1, air: false }, 1); ok(w.hold && !w.popped && w.progress === 0, 'the thread only reels when catbot walks away with it'); }
    ok(def.part.y !== 0, 'the coil sits off the floor (no pounce) until the ball is in');
    const ex = explore(def); console.log('[CKP] EXPLORER', JSON.stringify(ex));
    ok(ex.fails.length === 0, `explorer: from every state random play reached, the smart bot still finishes (${ex.recovered}/${ex.states}, worst ${ex.worst} s, seed ${ex.seed})`);
    { const a = JSON.stringify(fresh(def)); simulate('smart'); ok(a === JSON.stringify(fresh(def)), 'fresh() is a clean state (reset() uses it)'); }
    const pass = lines.every(l => !l.startsWith('FAIL'));
    for (const l of lines) console.log('[CKP]', l);
    return { pass, lines, bots, explorer: ex };
  }

  /* =====================================================================
     LIVE
     ===================================================================== */
  let state = fresh(layout), remainder = 0, fx = { t: 0, taut: 0, wheel: 0, lit: 0, red: 1 }, fin = null;
  function reset() {
    if (!mine()) return;
    state = fresh(room); remainder = 0; fin = null; fx.lit = 0; fx.red = 1;
    room.part.y = -400;
    if (installed.has('yarn')) { state.done = true; state.door = 1; state.popped = true; state.ball = 'rest'; state.rest = true; state.got = true; state.seen = true; fx.red = 0; fx.lit = 1; }
  }
  const catNow = () => ({ x: rig.x, vx: rig.vx, face: rig.facing, air: rig.air });
  function update(dt, c, inputDir) {
    if (!live()) return;
    fx.t += dt;
    if (mode === 'finale') { finale(dt, c, inputDir ?? dirInput()); return; }
    if (st.got && !state.got) state.got = true;
    // the finale plays once, the moment the coil is seated on this visit. On a later visit the coil is already in
    // (reset() marks it seen) and stepping up to the console plays the show again: the cockpit has no hatch of its own
    if (state.got && !state.seen && mode === 'play') { state.seen = true; startFinale(); return; }
    if (state.seen && mode === 'play' && !rig.air && Math.abs(rig.x - room.socket.x) < 70) { startFinale(); return; }
    if (state.seen && mode === 'play' && rig.x > room.door.x) caption('ckAgain');
    if (mode !== 'play' && mode !== 'pounce') return;
    caption('ckStart');
    const dir = latch ? 0 : (inputDir ?? dirInput());
    remainder += dt;
    const ev = [];
    while (remainder >= DT) { ev.push(...stepRules(state, room, DT, catNow(), dir)); remainder -= DT; }
    for (const e of ev) onEvent(e);
    if (mode !== 'play') return;
    fx.red = state.done ? Math.max(0, fx.red - dt / 1.5) : 1;
    // the room's hand on the walk: the belt, the wheel, the pull
    if (!rig.air && !rig.fl && onBelt(rig.x, room)) c.belt = room.belt.v;
    if (state.eng) {
      c.belt = -rig.vx - (rig.x - holdX(room)) * 6;
      fx.wheel -= dt * Math.max(0, rig.vx) / 60; if (fx.wheel <= 0) { fx.wheel = 1; sfx('hydWheel', { x: holdX(room), mag: .4 + .6 * Math.min(1.3, rig.vx / 165), rate: .9 + .3 * rig.vx / 165 }); }
    }
    if (state.hold) {
      if (dir < 0) {
        if (c.vx) c.vx = -room.ckp.pullV;
        const k = .7 + .3 * Math.sin(fx.t * 7);
        Object.assign(c, { crouch: .32, pitch: .1, headDrop: 10, headPitch: .2, earL: 34, earR: 30, mouth: -.6, lid: .35, tailBase: 170, tailStiff: 1.3, wagAmp: 1, strain: .6 * k });
        fx.taut -= dt; if (fx.taut <= 0) { fx.taut = .42; sfx('ckTaut', { x: rig.x, mag: .4 + .6 * state.progress / room.ckp.pull, rate: .9 + .3 * state.progress / room.ckp.pull }); }
      } else if (!dir) { c.belt = room.ckp.drag; Object.assign(c, { mouth: -.4, earL: 20, earR: 16 }); }
      caption('ckPull');
    }
    if (rig.x > room.lamp.x0 - 300 && !state.done) caption('ckLamp');
    if (rig.x > room.wheel.x - 160 && !state.done) caption('ckWheel');
    if (state.done && rig.x > room.door.x + 120 && !state.hold && !state.popped) caption('ckThread');
    if (state.rest && !st.got && Math.sign(room.part.x - rig.x) !== rig.facing) caption('ckTurn');
  }
  function onEvent(e) {
    if (e.k === 'spot') {
      const d = -(e.dir || rig.facing), P = 150, vx = (-.23 + Math.sqrt(.0529 + .004 * P)) / .002;
      rig.jump(300, d * vx); st.oops = 0; rig.earL.vel -= 16; rig.earR.vel -= 14; rig.tailFlick(5);
      sfx('beamLock', { x: state.lamp.x }); sfx('beamSpot', { x: e.x, delay: .12 }); shake = Math.max(shake, 2.5 * calmK()); caption('ckSpot');
    }
    else if (e.k === 'reactor') { sfx('ckReactor', { x: e.x }); sfx('gate', { x: room.door.x, delay: .6 }); FX.flash(e.x, GY - 120, 1, '160,230,255'); FX.sparks(e.x, GY - 40, 6, 1, .5); caption('ckReactor'); }
    else if (e.k === 'grab') { sfx('perk', { x: e.x }); rig.earL.vel -= 12; rig.earR.vel -= 12; }
    else if (e.k === 'pop') { sfx('ckPop', { x: e.x }); shake = Math.max(shake, 2 * calmK()); rig.jump(220, -40); rig.tailFlick(6); caption('ckPop'); }
    else if (e.k === 'flap') { sfx('ckFlap', { x: e.x }); }
    else if (e.k === 'rest') { room.part.y = 0; sfx('pin', { x: e.x }); }
  }
  const blocks = () => {
    if (!live()) return [];
    const b = [];
    if (state.door < .8) b.push({ x0: room.door.x, x1: room.door.x + room.door.w, clr: CAT.nose });
    b.push({ x0: room.glass.x + 40, x1: room.w + 100, clr: CAT.nose });
    return b;
  };
  // the camera: from the grab until the coil is in, hold the nose (glass, snag, cat flap) in view, as long as catbot fits in it too
  function look() {
    if (!live() || mode === 'finale' || !(state.hold || (state.popped && !st.got))) return null;
    return Math.min(room.w - W, rig.x - 70);
  }
  // the shared strain loop while catbot reels the yarn (index.html stops it otherwise)
  function strain() {
    if (!live() || !state.hold || mode !== 'play') return false;
    const pulling = rig.vx < -5;
    AUDIO.start('strain', { amt: pulling ? .7 : .35, slide: pulling ? .3 : 0, weight: .55 });
    return true;
  }
  let humT = 0;
  function audio(dt) {
    if (!live() || mode === 'card' || mode === 'rewind') return;
    humT -= dt; if (humT > 0) return; humT = 1.3;
    if (!state.done && Math.abs(rig.x - state.lamp.x) < 700) sfx('obsHum', { x: state.lamp.x, mag: .4, rate: .8 });
  }

  /* =====================================================================
     THE FINALE: power-up, liftoff, credits, then back to the deck plan.
     Its own mode ('finale'): index.html's control() has no branch for it, so
     catbot just stands there being pleased while this runs the show.
     ===================================================================== */
  function startFinale() {
    mode = 'finale'; modeT = 0;
    fin = { t: 0, time: run.t, rewinds: run.rewinds, lit: 0, phase: 'console', cred: 0, credH: 0, end: false, bonus: EGGS.all(), eggs: EGGS.summary(), skipT: 0 };
    fin.credH = CREDITS().reduce((a, l) => a + (STY[l.style] || STY.body)[2], 0) + H * .3;   // known up front, so the roll ends with or without a render (the live test doesn't draw every frame)
    console.log('%cCOCKPIT · main coil seated · the shuttle lifts off · Claude Opus 5.5 in Claude Cowork', 'color:#f07a8c');
  }
  // the end card's way out, by a step or a click (people click the prompt: it looks like a button)
  const ready = () => !!fin && fin.end && fin.t - fin.endT > (fin.bonus ? 4.5 : 1.2);
  const toDeck = () => fadeTo(() => { fin = null; HUB.enter('cockpit'); });
  const clickable = () => !!fin && live() && (ready() || (!fin.end && fin.t > T_CRED + 3));
  function click() {
    if (!clickable() || fadeDir !== 0) return false;
    if (fin.end) toDeck(); else { fin.end = true; fin.endT = fin.t; fin.skipT = .4; }
    return true;
  }
  const T_ICONS = .6, T_ICON = .55, T_RUMBLE = 4.9, T_EXT = 6.6, T_LIFT = 7.6, T_CRED = 14.5;
  function finale(dt, c, dir) {
    const f = fin; if (!f) return;
    const was = f.t; f.t += dt;
    Object.assign(c, { vx: 0, happy: f.t > 1 ? 1 : 0, mouth: .8, tailBase: 118, tailCurve: -4, tailTip: -12, wagAmp: 6, wagFreq: 2.2, keySpin: 4, lookX: .8, lookY: -.3 });
    // the console: each repair lights in turn
    SYSTEMS.forEach((s, i) => { const at = T_ICONS + i * T_ICON; if (was < at && f.t >= at) { sfx('ckIcon', { x: room.socket.x, rate: 1 + i * .07 }); FX.flash(room.console.x + 30 + i * 30, GY - 160, .4, '160,230,255'); } });
    if (was < T_RUMBLE && f.t >= T_RUMBLE) { sfx('ckRumble', { x: room.socket.x }); caption('ckPower'); }
    if (f.t > T_RUMBLE && f.t < T_EXT + .5) shake = Math.max(shake, (1 + 3 * seg(f.t, T_RUMBLE, T_EXT)) * calmK());
    if (was < T_LIFT && f.t >= T_LIFT) sfx('ckLiftoff', {});
    if (was < T_CRED && f.t >= T_CRED) sfx('ckCredits', {});
    // credits: they roll on their own; a step after the first few seconds skips to the end card
    if (f.t >= T_CRED && !f.end) {
      f.cred += dt * 34;
      if (f.credH && f.cred > f.credH + 40) { f.end = true; f.endT = f.t; }
      if (dir && f.t > T_CRED + 3) { f.end = true; f.endT = f.t; f.skipT = .4; }
    }
    if (f.end) {
      if (ready() && dir && f.skipT <= 0 && fadeDir === 0) toDeck();
      if (!dir) f.skipT = 0; else f.skipT = Math.max(0, f.skipT - dt);
    }
  }

  /* =====================================================================
     DRAW
     ===================================================================== */
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const inView = (x0, x1 = x0) => x1 > camX - 120 && x0 < camX + W / zoom + 120;
  function yarnBall(g, x, y, r, a) {
    const gr = g.createRadialGradient(x - r * .3, y - r * .35, 1, x, y, r); gr.addColorStop(0, '#f07a8c'); gr.addColorStop(1, '#8e2c40');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.clip(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = 'rgba(255,200,210,.55)'; g.lineWidth = 1; for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, 0, r * 1.05, Math.abs(i) * r * .27 + 1, i * .3, 0, TAU); g.stroke(); }
    g.restore(); g.strokeStyle = OL; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  }
  // the view out of the windscreen: the surface, a sky with stars, the antenna strut (world coords, clipped to the glass)
  function exteriorView(g, x0, x1, t) {
    const sky = g.createLinearGradient(0, -120, 0, GY); sky.addColorStop(0, '#05070e'); sky.addColorStop(.7, '#16233a'); sky.addColorStop(1, '#3b4a5c');
    g.fillStyle = sky; g.fillRect(x0, -140, x1 - x0, GY + 160);
    g.fillStyle = 'rgba(230,240,255,.8)'; for (let i = 0; i < 40; i++) { const sx = x0 + hh(i + 70) * (x1 - x0), sy = -120 + hh(i + 71) * 300; g.fillRect(sx, sy, 1.2, 1.2); }
    g.fillStyle = '#2a2d33'; g.beginPath(); g.moveTo(x0, GY - 20); for (let x = x0; x <= x1 + 20; x += 20) g.lineTo(x, GY - 40 - 26 * hh(x * .07) - 30 * Math.max(0, Math.sin(x * .011))); g.lineTo(x1 + 20, GY + 10); g.lineTo(x0, GY + 10); g.closePath(); g.fill();
    g.fillStyle = '#1b1d22'; g.fillRect(x0, GY - 22, x1 - x0, 40);
  }
  function deck(g, t) {
    if (!live()) return;
    const R = room;
    // past the bulkhead: the nose. A darker cabin wall, the windscreen, the console, the pilot's chair
    const nx0 = R.door.x + R.door.w;
    if (inView(nx0, R.w)) {
      g.fillStyle = '#161a20'; g.fillRect(nx0, -120, R.w - nx0, GY - 24 + 120);
      g.fillStyle = 'rgba(214,165,78,.08)'; for (let x = nx0 + 40; x < R.glass.x; x += 110) g.fillRect(x, -120, 3, GY - 24 + 120);
      // the windscreen: the right wall leans out; the view, then the frame, the crack, the snagged yarn outside
      const gx = R.glass.x;
      g.save(); g.beginPath(); g.moveTo(gx, GY - 30); g.lineTo(gx + 40, -100); g.lineTo(R.w + 40, -100); g.lineTo(R.w + 40, GY - 30); g.closePath(); g.clip();
      exteriorView(g, gx - 10, R.w + 60, t);
      // the antenna strut, and the ball on it until it pops
      g.strokeStyle = '#5d646d'; g.lineWidth = 4; g.beginPath(); g.moveTo(R.w + 30, GY - 300); g.lineTo(gx + 70, GY - 220); g.stroke();
      if (state.ball === 'snag' || (state.ball === 'fall' && ballPos(R, state).out)) { const b = ballPos(R, state); yarnBall(g, b.x, GY - b.y, 15, b.a); }
      g.restore();
      g.strokeStyle = '#5a6068'; g.lineWidth = 10; g.beginPath(); g.moveTo(gx, GY - 26); g.lineTo(gx + 40, -100); g.stroke();
      g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx + 5, GY - 26); g.lineTo(gx + 45, -100); g.stroke();
      // the crack the thread comes in through
      const cx = gx + 22, cy = GY - 150;
      g.strokeStyle = 'rgba(220,235,255,.55)'; g.lineWidth = 1;
      for (const [dx, dy] of [[26, -18], [18, 22], [-8, 30], [34, 6], [-6, -26]]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dx, cy + dy); g.lineTo(cx + dx * 1.4 + 6, cy + dy * 1.5 - 4); g.stroke(); }
      // the cat flap, low in the right wall
      const fx0 = R.flap.x, fy = GY - 54;
      g.fillStyle = '#2b3038'; g.fillRect(fx0 - 26, fy - 4, 52, 34); g.strokeStyle = OL; g.strokeRect(fx0 - 26, fy - 4, 52, 34);
      const sw = state.ball === 'fall' && state.ballT > .9 && state.ballT < 1.6 ? Math.sin((state.ballT - .9) * 14) * (1.6 - state.ballT) : 0;
      g.save(); g.translate(fx0, fy); g.rotate(sw * .6); g.fillStyle = 'rgba(120,140,160,.75)'; g.fillRect(-20, 0, 40, 26); g.strokeStyle = OL; g.strokeRect(-20, 0, 40, 26); g.restore();
      g.save(); g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText('CREW ACCESS', fx0 - 24, fy - 8); g.restore();
      drawConsole(g, t);
      // the pilot's chair, facing the glass
      const ch = R.console.x - 70;
      g.fillStyle = '#3a2f26'; g.fillRect(ch - 22, GY - 92, 14, 70); g.fillRect(ch - 22, GY - 40, 52, 12); g.fillStyle = '#4b5059'; g.fillRect(ch, GY - 28, 6, 22); g.fillRect(ch - 16, GY - 8, 38, 4);
    }
    // the corridor: the belt, the lamp's rail, the wheel and its reactor, the bulkhead
    drawBelt(g, t);
    drawWheel(g, t, 'back');
    drawLamp(g, t, 'back');
    drawDoor(g, t);
    // the thread: from the crack to its loose end on the floor, or to catbot's mouth
    if (!state.popped && inView(R.door.x, R.w)) {
      const cx = R.glass.x + 22, cy = GY - 150;
      g.strokeStyle = '#b8455a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, cy);
      if (state.hold) { /* in catbot's mouth: front() draws it, over the rig */ }
      else { g.quadraticCurveTo(cx - 20, GY - 30, R.thread.x, GY - 10); g.lineTo(R.thread.x - 14, GY - 9); g.stroke(); }
    }
  }
  function drawBelt(g, t) {
    const b = room.belt; if (!inView(b.x, b.x + b.w)) return;
    g.fillStyle = '#20242b'; g.fillRect(b.x, GY - 22, b.w, 20);
    g.strokeStyle = 'rgba(214,165,78,.5)'; g.lineWidth = 2;
    const off = ((t * b.v) % 40 + 40) % 40;
    g.save(); g.beginPath(); g.rect(b.x, GY - 22, b.w, 20); g.clip();
    for (let x = b.x - 40 + off; x < b.x + b.w + 40; x += 40) { g.beginPath(); g.moveTo(x + 8, GY - 18); g.lineTo(x, GY - 12); g.lineTo(x + 8, GY - 6); g.stroke(); }
    g.restore(); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(b.x, GY - 22, b.w, 20);
  }
  function drawLamp(g, t, layer) {
    const L = state.lamp, lp = room.lamp; if (!inView(lp.x0 - 200, lp.x1 + 200)) return;
    const ly = GY - 236;
    if (layer === 'back') { g.fillStyle = '#2a2f37'; g.fillRect(lp.x0 - 30, ly - 6, lp.x1 - lp.x0 + 120, 8); return; }
    const on = state.done ? Math.max(0, 1 - (L.x - lp.x1) / 60) * fx.red : 1;
    g.fillStyle = '#4b5059'; g.fillRect(L.x - 16, ly - 4, 32, 14); g.fillStyle = L.flare > 0 ? '#ff6a5a' : '#ffcf8a'; g.beginPath(); g.arc(L.x, ly + 12, 5, 0, TAU); g.fill();
    if (on <= .02) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const a = (L.flare > 0 ? .3 : .15) * on, cg = g.createLinearGradient(0, ly, 0, GY);
    cg.addColorStop(0, `rgba(255,${L.flare > 0 ? 120 : 214},${L.flare > 0 ? 100 : 160},${a * 1.4})`); cg.addColorStop(1, `rgba(255,${L.flare > 0 ? 120 : 214},${L.flare > 0 ? 100 : 160},${a})`);
    g.fillStyle = cg; g.beginPath(); g.moveTo(L.x - 6, ly + 12); g.lineTo(L.x - lp.half, GY - 4); g.lineTo(L.x + lp.half, GY - 4); g.lineTo(L.x + 6, ly + 12); g.closePath(); g.fill();
    softEllipse(g, L.x, GY - 6, lp.half, 9, .35 * on, L.flare > 0 ? '255,120,100' : '255,214,160');
    g.restore();
  }
  function drawWheel(g, t, layer) {
    const wh = room.wheel, cx = holdX(room), R = 82, cy = GY - R - 2; if (!inView(cx - 160, cx + R)) return;
    const a = (fx.wa = (fx.wa || 0) + (state.eng ? Math.max(0, rig.vx) : 0) / 60 / 80);
    if (layer === 'back') {
      // the reactor behind it: a glass column that fills with light as the wheel pumps
      const rx = wh.x - 70, k = state.done ? 1 : state.reactor;
      g.fillStyle = '#1b1f26'; g.fillRect(rx - 22, GY - 200, 44, 176); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(rx - 22, GY - 200, 44, 176);
      const h = 160 * clamp(k, 0, 1); g.fillStyle = `rgba(140,220,255,${.35 + .5 * k})`; g.fillRect(rx - 16, GY - 30 - h, 32, h);
      g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, rx, GY - 30 - h, 26, 10, .4 * k, '160,230,255'); g.restore();
      g.save(); g.font = '600 8px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.55)'; g.fillText(state.done ? 'REACTOR · ON' : 'REACTOR · SPIN UP', rx - 30, GY - 208); g.restore();
      g.strokeStyle = '#6d747d'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 4, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(141,147,155,.7)'; g.lineWidth = 1.5;
      for (let k2 = 0; k2 < 10; k2++) { const q = a + k2 / 10 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(q) * (R - 4), cy + Math.sin(q) * (R - 4)); g.stroke(); }
      g.fillStyle = '#8d939b'; g.beginPath(); g.arc(cx, cy, 7, 0, TAU); g.fill();
      return;
    }
    g.strokeStyle = '#a4abb4'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R + 2, 0, TAU); g.stroke();
    g.strokeStyle = OL; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R + 4.5, 0, TAU); g.stroke();
  }
  function drawDoor(g, t) {
    const d = room.door; if (!inView(d.x - 40, d.x + 60)) return;
    const lift = state.door * (GY - 30);
    g.fillStyle = '#2d3239'; g.fillRect(d.x - 12, -120, 10, GY + 96); g.fillRect(d.x + d.w + 2, -120, 10, GY + 96);
    g.save(); g.beginPath(); g.rect(d.x - 2, -120, d.w + 4, GY - 24 + 120); g.clip();
    g.fillStyle = '#4a5058'; g.fillRect(d.x, -120 - lift, d.w, GY - 24 + 120);
    g.fillStyle = 'rgba(214,165,78,.6)'; for (let y = -100 - lift; y < GY - 30 - lift; y += 26) g.fillRect(d.x + 4, y, d.w - 8, 3);
    g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(d.x, -120 - lift, d.w, GY - 24 + 120);
    g.restore();
    g.fillStyle = state.done ? '#7bd88f' : '#ff6a5a'; g.beginPath(); g.arc(d.x + d.w / 2, GY - 210, 4, 0, TAU); g.fill();
  }
  function drawConsole(g, t) {
    const C = room.console, x = C.x, w = C.w, f = fin;
    // the desk
    g.fillStyle = '#2b3038'; g.beginPath(); g.moveTo(x, GY - 24); g.lineTo(x + 10, GY - 96); g.lineTo(x + w - 10, GY - 96); g.lineTo(x + w, GY - 24); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
    // two screens
    for (const sx of [x + 18, x + w - 88]) {
      g.fillStyle = '#0b1320'; g.fillRect(sx, GY - 200, 70, 48); g.strokeStyle = '#5d646d'; g.lineWidth = 3; g.strokeRect(sx, GY - 200, 70, 48);
      const on = st.got || installed.has('yarn') ? 1 : .35 + .1 * Math.sin(t * 3);
      g.strokeStyle = `rgba(95,208,255,${.5 * on})`; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 60; i++) g.lineTo(sx + 5 + i, GY - 176 + Math.sin(i * .3 + t * (2 + 4 * on)) * 8 * on); g.stroke();
    }
    // the main-coil housing in the middle: an empty, yarn-shaped cradle until the coil is in
    const sk = room.socket;
    g.fillStyle = '#1a1d22'; g.beginPath(); g.arc(sk.x, sk.y, 24, 0, TAU); g.fill(); g.strokeStyle = '#b58a3c'; g.lineWidth = 3; g.beginPath(); g.arc(sk.x, sk.y, 24, 0, TAU); g.stroke();
    if (st.got || installed.has('yarn')) { yarnBall(g, sk.x, sk.y, 16, t * 2); g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, sk.x, sk.y, 40, 40, .25 + .1 * Math.sin(t * 4), '240,122,140'); g.restore(); }
    else { g.setLineDash([4, 4]); g.strokeStyle = 'rgba(240,122,140,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(sk.x, sk.y, 16, 0, TAU); g.stroke(); g.setLineDash([]); }
    g.save(); g.font = '600 8px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.6)'; g.textAlign = 'center'; g.fillText(st.got || installed.has('yarn') ? 'MAIN COIL · SEATED' : 'MAIN COIL · MISSING', sk.x, sk.y - 32); g.restore();
    // the system lamps along the desk's lip: each repair, lit one by one in the finale (or all lit when it's done)
    SYSTEMS.forEach((s, i) => {
      const lx = x + 24 + i * ((w - 48) / 6), ly = GY - 70;
      const lit = installed.has('yarn') && !f ? 1 : f ? clamp((f.t - T_ICONS - i * T_ICON) / .25, 0, 1) : (installed.has(s.id) ? .25 : 0);
      g.fillStyle = '#14171c'; g.fillRect(lx - 11, ly - 8, 22, 16);
      g.fillStyle = lit > .5 ? `rgba(123,216,143,${.5 + .5 * lit})` : 'rgba(255,106,90,.35)'; g.beginPath(); g.arc(lx, ly - 1, 3.5, 0, TAU); g.fill();
      if (lit > 0) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, lx, ly - 1, 12, 8, .35 * lit, '123,216,143'); g.restore(); }
      g.save(); g.font = '600 5.5px Oswald,sans-serif'; g.fillStyle = `rgba(214,165,78,${.35 + .5 * lit})`; g.textAlign = 'center'; g.fillText(s.name, lx, ly + 14); g.restore();
    });
  }
  // the held thread, from the crack to catbot's mouth: it sags less the more is reeled
  function drawHeld(g, cx, cy) { const m = rig.mouthP(), k = state.progress / room.ckp.pull; g.quadraticCurveTo((cx + m.x) / 2, Math.max(cy, m.y) + 20 * (1 - k), m.x, m.y); g.stroke(); }
  function front(g, t) {
    if (!live()) return;
    if (state.hold) { const cx = room.glass.x + 22, cy = GY - 150; g.strokeStyle = '#b8455a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, cy); drawHeld(g, cx, cy); }
    drawWheel(g, t, 'front');
    drawLamp(g, t, 'front');
    // the ball inside the cabin: falling in, rolling, at rest (drawn over index.html's part disc), or in flight to the socket
    if (state.ball === 'fall') { const b = ballPos(room, state); if (!b.out) yarnBall(g, b.x, GY - b.y, 15, b.a); }
    else if (state.ball === 'rest' && partHere()) { const p = partPos(T); yarnBall(g, p.x, p.y, 16.5, p.a); }
    // emergency red until the reactor catches
    if (fx.red > 0) { g.fillStyle = `rgba(150,20,10,${.13 * fx.red})`; g.fillRect(camX - 10, -260, W / zoom + 20, H + 520); }
  }

  /* ---------- the finale overlay: screen space, drawn after everything else (index.html calls it last) ---------- */
  const CREDITS = () => {
    const f = fin, E = f.eggs, L = [];
    const push = (text, style = 'body', egg) => L.push({ text, style, egg });
    push('CATBOT', 'title'); push('a clockwork cat fixes a shuttle', 'sub'); push('', 'gap');
    push(`Repaired in ${fmtTime(f.time)}  ·  ${f.rewinds} rewind${f.rewinds === 1 ? '' : 's'}`, 'stat');
    push(`Easter eggs found: ${E.found} of ${E.total}`, 'stat'); push('', 'gap');
    push('MADE BY', 'head'); push('Tasha · storyline, design, direction, every playtest'); push('', 'gap');
    push('INSPIRED BY', 'head'); push('Doctor Who · \"The Girl in the Fireplace\"'); push('', 'gap');
    push('BUILT WITH (AI-USE DISCLOSURE)', 'head');
    push('Claude Opus 5.5 · Claude Code and Claude Cowork', 'name'); push('the rig, the Aft Hold, the Engine Bay, Observation, Sanitation,', 'small'); push('Hydroponics, this cockpit, Berthing\'s second pass, the Galley\'s revisions', 'small'); push('the WebMCP tools an AI agent plays the game through', 'small');
    push('Claude Sonnet 5.5 · Claude chat, Claude Code and Claude Cowork', 'name'); push('the brainstorming and room design, the deck plan, the sound layer', 'small');
    push('GPT-6.1-Sol · Codex', 'name'); push('the Galley; the itch.io cover image, playing the game through WebMCP', 'small');
    push('Mistral Medium 3.5 · Vibe', 'name'); push('Berthing, first pass', 'small');
    push('Concept art and storyboard', 'name'); push('Gemini 3 Pro Image and resplendent-flash via Arena', 'small'); push('GPT-5.6-Sol with ChatGPT Images 2.5, in ChatGPT', 'small');
    push('', 'gap'); push('EASTER EGGS', 'head');
    for (const e of E.eggs) push(e.found ? `★  ${e.room} · ${e.what}` : `?  ${e.room} · something is hidden here`, e.found ? 'egg' : 'eggOff', e), push(e.by, 'small');
    push('', 'gap'); push('Jamference: AI Game Jam Hack 1 · 2026', 'sub'); push('Every input is movement. Thanks for walking.', 'sub');
    return L;
  };
  const STY = { title: ['600 44px Oswald,sans-serif', '#d6a54e', 54], sub: ['400 13px Inter,sans-serif', 'rgba(239,230,210,.7)', 22], gap: [null, null, 16], stat: ['600 15px Oswald,sans-serif', '#efe6d2', 24], head: ['600 12px Oswald,sans-serif', '#d6a54e', 26], name: ['600 14px Oswald,sans-serif', '#efe6d2', 21], small: ['400 11px Inter,sans-serif', 'rgba(239,230,210,.6)', 17], body: ['400 13px Inter,sans-serif', '#efe6d2', 22], egg: ['600 13px Oswald,sans-serif', '#f0c27a', 20], eggOff: ['600 13px Oswald,sans-serif', 'rgba(239,230,210,.35)', 20] };
  function overlay(g) {
    if (!fin || !live()) return;
    const f = fin, t = f.t;
    if (t < T_EXT) return;
    const a = clamp((t - T_EXT) / .6, 0, 1);
    g.save(); g.setTransform(S, 0, 0, S, 0, 0); g.globalAlpha = a;
    if (t < T_CRED + 1) drawLiftoff(g, t);
    if (t >= T_CRED) { g.globalAlpha = clamp((t - T_CRED) / 1, 0, 1); drawCredits(g, t); }
    g.restore();
  }
  function stars(g, t, drift) {
    g.fillStyle = '#05070e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 140; i++) { const x = hh(i) * W, y = ((hh(i + 300) * H + drift * (.2 + hh(i + 600) * .8)) % H + H) % H, b = .3 + .7 * hh(i + 900); g.fillStyle = `rgba(230,240,255,${b})`; g.fillRect(x, y, 1.3, 1.3); }
  }
  function drawLiftoff(g, t) {
    const u = clamp((t - T_LIFT) / 6, 0, 1), rise = u * u * 520, hover = t > T_LIFT ? Math.min(1, (t - T_LIFT) / 1.2) : 0;
    // the sky and the surface; the camera follows up a little, then lets it go
    const camUp = Math.min(rise, 140);
    stars(g, t, camUp * .4);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, 'rgba(22,35,58,0)'); sky.addColorStop(1, 'rgba(59,74,92,.9)'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const gy = H - 70 + camUp;
    g.fillStyle = '#2a2d33'; g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W + 20; x += 18) g.lineTo(x, gy - 30 - 40 * hh(x * .05) - 50 * Math.max(0, Math.sin(x * .009 + 1))); g.lineTo(W + 20, H + 200); g.lineTo(0, H + 200); g.closePath(); g.fill();
    g.fillStyle = '#1b1d22'; g.fillRect(0, gy, W, H);
    // the shuttle: a stubby brass hull, nose right, the cockpit window lit with a small cat shape and the coil's red glow
    const sx = W * .5, sy = gy - 46 - rise + Math.sin(t * 9) * 1.5 * hover, sh = (t < T_LIFT + 1 && t > T_LIFT - 1.2 && !settings.calm) ? (Math.random() - .5) * 3 : 0;
    g.save(); g.translate(sx + sh, sy); g.rotate(-.06 * u);
    // the flames
    if (t > T_LIFT - .3) {
      const fl = (.6 + .4 * Math.sin(t * 40)) * (.5 + .5 * hover);
      for (const [ex, ey] of [[-118, 22], [-118, -6]]) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const fg = g.createLinearGradient(ex, ey, ex - 90 * fl, ey + 30); fg.addColorStop(0, 'rgba(255,240,200,.95)'); fg.addColorStop(.4, 'rgba(255,150,60,.7)'); fg.addColorStop(1, 'rgba(255,80,40,0)');
        g.fillStyle = fg; g.beginPath(); g.moveTo(ex, ey - 9); g.lineTo(ex - 100 * fl, ey + 34); g.lineTo(ex, ey + 9); g.closePath(); g.fill(); g.restore();
      }
      // and under it, the thrusters that lift it
      g.save(); g.globalCompositeOperation = 'lighter'; for (const tx of [-60, 40]) { const tg = g.createLinearGradient(0, 30, 0, 30 + 70 * hover); tg.addColorStop(0, 'rgba(160,230,255,.8)'); tg.addColorStop(1, 'rgba(160,230,255,0)'); g.fillStyle = tg; g.fillRect(tx - 8, 30, 16, 70 * hover * (.8 + .2 * Math.sin(t * 30 + tx))); } g.restore();
    }
    const hull = g.createLinearGradient(0, -40, 0, 40); hull.addColorStop(0, '#e7b866'); hull.addColorStop(.5, '#b5853b'); hull.addColorStop(1, '#7a5520');
    g.fillStyle = hull; g.beginPath(); g.moveTo(-120, -30); g.lineTo(70, -34); g.quadraticCurveTo(130, -26, 140, 6); g.quadraticCurveTo(128, 30, 70, 34); g.lineTo(-120, 34); g.closePath(); g.fill();
    g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(80,50,15,.6)'; g.lineWidth = 1; for (const x of [-80, -30, 20]) { g.beginPath(); g.moveTo(x, -32); g.lineTo(x, 34); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -110; x < 60; x += 14) { g.beginPath(); g.arc(x, -24, 1.4, 0, TAU); g.fill(); }
    // engine bells
    g.fillStyle = '#5d646d'; g.fillRect(-132, -14, 14, 16); g.fillRect(-132, 14, 14, 16);
    // the cockpit window: lit, the coil glowing, a small cat silhouette with ears
    g.fillStyle = '#9fd8ff'; g.beginPath(); g.moveTo(78, -26); g.quadraticCurveTo(122, -20, 128, 0); g.lineTo(84, 0); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, 104, -8, 22, 12, .4 + .2 * Math.sin(t * 5), '240,122,140'); g.restore();
    g.fillStyle = '#22150a'; g.beginPath(); g.moveTo(98, 0); g.lineTo(98, -10); g.lineTo(100, -16); g.lineTo(103, -11); g.lineTo(107, -11); g.lineTo(110, -16); g.lineTo(112, -10); g.lineTo(112, 0); g.closePath(); g.fill();
    g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(78, -26); g.quadraticCurveTo(122, -20, 128, 0); g.lineTo(84, 0); g.closePath(); g.stroke();
    // the egg crew sees it off (all ten found): a few small faces in the hull's portholes
    if (fin.bonus) { for (let i = 0; i < 4; i++) { const px = -95 + i * 36; g.fillStyle = '#1a1206'; g.beginPath(); g.arc(px, 6, 8, 0, TAU); g.fill(); g.fillStyle = '#ffb35a'; for (const d of [-3, 3]) { g.beginPath(); g.ellipse(px + d, 6, 1.8, 1.2 + Math.max(0, Math.sin(t * 2 + i)) * .6, 0, 0, TAU); g.fill(); } } }
    else { for (let i = 0; i < 4; i++) { const px = -95 + i * 36; g.fillStyle = '#2b2620'; g.beginPath(); g.arc(px, 6, 8, 0, TAU); g.fill(); g.strokeStyle = OL; g.stroke(); } }
    g.restore();
    // dust kicked up at liftoff
    if (hover > 0 && u < .6) { g.save(); g.globalAlpha *= (1 - u / .6) * .6; for (let i = 0; i < 18; i++) { const dx = (hh(i + 40) - .5) * 360 * (.4 + hover), dy = -hh(i + 41) * 30 * hover; g.fillStyle = 'rgba(160,150,135,.5)'; g.beginPath(); g.arc(sx + dx, gy - 4 + dy, 10 + 18 * hh(i + 42) * hover, 0, TAU); g.fill(); } g.restore(); }
    if (u > .85) { g.fillStyle = `rgba(5,7,14,${(u - .85) / .15 * .6})`; g.fillRect(0, 0, W, H); }
  }
  function drawCredits(g, t) {
    const f = fin;
    stars(g, t, (t - T_CRED) * 8);
    const L = CREDITS();
    let y = H + 20 - f.cred, total = 0;
    g.textAlign = 'center';
    for (const l of L) {
      const s = STY[l.style] || STY.body; total += s[2];
      if (s[0] && y > -40 && y < H + 40) { g.font = s[0]; g.fillStyle = s[1]; g.fillText(l.text, W / 2, y); }
      y += s[2];
    }
    g.textAlign = 'left';
    if (f.end) drawEnd(g, t);
    else if (t > T_CRED + 3) { g.font = '600 10px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.textAlign = 'right'; g.fillText('◀ ▶  skip', W - 16, 24); g.textAlign = 'left'; }
  }
  // the end card; with every egg found, first the bonus
  function drawEnd(g, t) {
    const f = fin, u = t - f.endT;
    g.fillStyle = `rgba(5,7,14,${Math.min(1, u / .6)})`; g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    if (f.bonus && u < 4.5 + 999) {
      const k = clamp(u / .8, 0, 1);
      g.globalAlpha = k;
      g.font = '600 13px Oswald,sans-serif'; g.fillStyle = '#d6a54e'; g.fillText('BONUS', W / 2, 92);
      g.font = '600 30px Oswald,sans-serif'; g.fillStyle = '#efe6d2'; g.fillText('EVERY EGG FOUND', W / 2, 128);
      g.font = '400 13px Inter,sans-serif'; g.fillStyle = 'rgba(239,230,210,.75)'; g.fillText('The things that weren\'t supposed to be there came to see you off.', W / 2, 154);
      drawEggCrew(g, t, u);
      g.globalAlpha = 1;
    } else {
      g.font = '600 40px Oswald,sans-serif'; g.fillStyle = '#d6a54e'; g.fillText('THE SHUTTLE FLIES', W / 2, H / 2 - 10);
      g.font = '400 13px Inter,sans-serif'; g.fillStyle = 'rgba(239,230,210,.7)'; g.fillText(`${f.eggs.found} of ${f.eggs.total} easter eggs found. ${f.eggs.found < f.eggs.total ? 'The rest are still out there.' : ''}`, W / 2, H / 2 + 20);
    }
    if (ready()) { g.font = '600 12px Oswald,sans-serif'; g.fillStyle = `rgba(214,165,78,${.5 + .3 * Math.sin(t * 3)})`; g.fillText('◀ ▶   back to the deck plan   (or click)', W / 2, H - 40); }
    g.textAlign = 'left';
  }
  // the bonus: each egg's thing, in a row, bobbing (simple shapes in the game's own style)
  function drawEggCrew(g, t, u) {
    const items = ['tail', 'foot', 'eyes', 'doodle', 'cucumber', 'rake', 'clock', 'locker', 'fern', 'bubble'];
    const n = items.length, x0 = W / 2 - (n - 1) * 32;
    items.forEach((k, i) => {
      const x = x0 + i * 64, a = clamp((u - .6 - i * .18) / .4, 0, 1), y = 250 + Math.sin(t * 2.4 + i) * 5 - (1 - a) * 20;
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.translate(x, y);
      g.fillStyle = 'rgba(214,165,78,.12)'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
      g.strokeStyle = '#efe6d2'; g.fillStyle = '#efe6d2'; g.lineWidth = 1.6;
      if (k === 'tail') { g.strokeStyle = '#d6a54e'; g.lineWidth = 3; g.beginPath(); g.arc(0, 2, 12, Math.PI * .2, Math.PI * 1.7 + t % TAU * 0); g.stroke(); }
      else if (k === 'foot') { g.font = '600 26px Oswald,sans-serif'; g.textAlign = 'center'; g.fillText('¹', 0, 10); }
      else if (k === 'eyes') { g.fillStyle = '#ffb35a'; for (const d of [-7, 7]) { g.beginPath(); g.ellipse(d, 0, 5, 2.6, 0, 0, TAU); g.fill(); } g.fillStyle = '#22150a'; for (const d of [-7, 7]) g.fillRect(d - .7, -2.4, 1.4, 4.8); }
      else if (k === 'doodle') { g.strokeStyle = '#ff5a5a'; g.beginPath(); g.arc(0, 2, 10, 0, TAU); g.moveTo(-9, -4); g.lineTo(-6, -14); g.lineTo(-2, -8); g.moveTo(9, -4); g.lineTo(6, -14); g.lineTo(2, -8); g.stroke(); g.fillStyle = '#ff5a5a'; g.fillRect(-4, 0, 2, 2); g.fillRect(2, 0, 2, 2); }
      else if (k === 'cucumber') { g.fillStyle = '#5d9a4a'; g.save(); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, 15, 5, 0, 0, TAU); g.fill(); g.restore(); }
      else if (k === 'rake') { g.strokeStyle = '#d6a54e'; g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 4); g.moveTo(-12, 4); g.lineTo(12, 4); g.stroke(); for (let d = -10; d <= 10; d += 5) { g.beginPath(); g.moveTo(d, 4); g.lineTo(d, 11); g.stroke(); } }
      else if (k === 'clock') { g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.stroke(); const q = -t * 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * 9, Math.sin(q) * 9); g.stroke(); }
      else if (k === 'locker') { g.strokeRect(-8, -14, 16, 28); g.strokeStyle = 'rgba(255,214,150,.8)'; g.strokeRect(-4, -8, 8, 14); g.strokeRect(-2, -4, 4, 7); }
      else if (k === 'fern') { g.strokeStyle = '#3f9a4c'; for (let j = 0; j < 5; j++) { const q = -Math.PI / 2 + (j - 2) * .4 + Math.sin(t * 2) * .1; g.beginPath(); g.moveTo(0, 10); g.lineTo(Math.cos(q) * 16, 10 + Math.sin(q) * 16); g.stroke(); } }
      else if (k === 'bubble') { g.beginPath(); g.ellipse(0, -2, 14, 10, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(-6, 12, 2.5, 0, TAU); g.stroke(); g.fillStyle = '#f07a8c'; g.beginPath(); g.arc(0, -2, 4.5, 0, TAU); g.fill(); }
      g.restore();
    });
  }

  /* =====================================================================
     LIVE TEST (&verify): the smart bot's choices through the real loop by
     keys and taps (STEADY off and on), through the pounce and the whole
     finale to the end card; then isolation in the other rooms.
     ===================================================================== */
  function liveTest() {
    if (!mine()) return { pass: false, reason: 'load the cockpit first' };
    const saved = { settings: { ...settings }, storage: localStorage.getItem('catbot.settings'), parts: [...installed], run: { ...run }, caps: [...seenCaps], T };
    const runs = [], shots = {};
    try {
      for (const steady of [false, true]) {
        settings.sound = false; settings.calm = steady; AUDIO.enable(false);
        installed.delete('yarn'); resetRoom(); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0;
        const brain = {}; let frames = 0, lastTap = -99, finaleAt = -1, endAt = -1;
        while (frames < 60 * 260) {
          Object.assign(state.cat, { x: rig.x, vx: rig.vx, face: rig.facing });
          const inp = mode === 'play' ? botInput(state, room, brain) : { dir: 0 };
          keys.l = inp.dir < 0; keys.r = inp.dir > 0;
          if (inp.doubleTap && inp.dir && sprint !== inp.dir && frames - lastTap > 30) { tap(inp.dir); tap(inp.dir); lastTap = frames; }
          tick(DT); frames++;
          if (mode === 'finale' && finaleAt < 0) finaleAt = frames;
          if (!steady) {
            const checks = { lamp: !state.done && Math.abs(rig.x - state.lamp.x) < 80, wheel: state.eng && state.reactor > .5, pull: state.hold && state.progress > 120, ball: state.ball === 'fall' && state.ballT > 1.4, console: fin && fin.t > 3.2 && fin.t < 4.2, liftoff: fin && fin.t > T_LIFT + 3 && fin.t < T_LIFT + 3.2, credits: fin && fin.t > T_CRED + 9 && fin.t < T_CRED + 9.2 };
            for (const [k, okk] of Object.entries(checks)) if (okk && !shots[k]) { render(0); shots[k] = cv.toDataURL('image/png'); }
          }
          if (fin && fin.end && endAt < 0) endAt = frames;
          if (!steady && endAt > 0 && frames - endAt === 90) { render(0); shots.end = cv.toDataURL('image/png'); }
          if (endAt > 0 && frames - endAt > 60 * 2) break;
        }
        const r = { steady, finale: finaleAt > 0, toFinale: +(finaleAt / 60).toFixed(2), creditsEnd: endAt > 0, total: +(frames / 60).toFixed(1), installed: installed.has('yarn'), spots: state.spots };
        r.pass = r.finale && r.creditsEnd && r.installed;
        runs.push(r); console.log('[CKP] LIVE', JSON.stringify(r));
      }
      const isolation = [];
      for (let i = 0; i < ROOMS.length; i++) if (!ROOMS[i].ckp) {
        loadRoom(i); mode = 'play';
        const c = freshCtrl(), before = JSON.stringify(c), rx = rig.x;
        reset(); update(DT, c, 1); audio(DT); deck(ctx, 0); front(ctx, 0); overlay(ctx);
        const okk = JSON.stringify(c) === before && rig.x === rx && blocks().length === 0 && !strain() && look() === null;
        isolation.push({ room: room.id, pass: okk });
      }
      console.log('[CKP] ISOLATION', JSON.stringify(isolation));
      return { pass: runs.every(r => r.pass) && isolation.every(r => r.pass), runs, isolation, shots: Object.keys(shots) };
    } finally {
      installed.clear(); for (const id of saved.parts) installed.add(id);
      Object.assign(settings, saved.settings); if (saved.storage === null) localStorage.removeItem('catbot.settings'); else localStorage.setItem('catbot.settings', saved.storage);
      Object.assign(run, saved.run); seenCaps.clear(); for (const k of saved.caps) seenCaps.add(k); T = saved.T;
      AUDIO.enable(settings.sound); keys.l = keys.r = false; sprint = 0; fin = null;
      loadRoom(ROOMS.findIndex(r => r.ckp)); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0; camX = camTarget(); camY = 0; caps.length = 0;
      window.__ckpShots = shots;
      render(0);
    }
  }
  const measureSounds = () => SAN.measureSounds ? SAN.measureSounds(['ckTaut', 'ckPop', 'ckFlap', 'ckReactor', 'ckIcon', 'ckRumble', 'ckLiftoff', 'ckCredits'], '[CKP]') : Promise.resolve({ verified: false });

  if (window.ENG && ENG.seat) { const prev = ENG.seat; ENG.seat = (...a) => mine() ? undefined : prev(...a); }

  return { reset, update, blocks, strain, look, click, clickable, audio, deck, front, overlay, simulate, selfTest, explore, liveTest, measureSounds, stepRules, fresh, botInput, get state() { return state; }, get fin() { return fin; } };
})();

/* dev entry: index.html#room=cockpit  (&parts=... ; the seven room parts are assumed; &test runs the self-test, &verify the live run through the finale) */
if (typeof location !== 'undefined' && /(^|[#&])room=cockpit(?:&|$)/.test(location.hash)) {
  const pm = /parts=([\w,-]+)/.exec(location.hash);
  for (const id of pm ? pm[1].split(',') : ['hip', 'engine', 'berthing', 'galley', 'observation', 'sanitation', 'hydroponics']) if (id !== 'none') installed.add(id);
  OPEN.finish(false); loadRoom(ROOMS.findIndex(r => r.id === 'cockpit')); mode = 'play'; modeT = 0;
  if (/[#&]test/.test(location.hash)) setTimeout(async () => {
    const r = window.__ckpTest = CKP.selfTest();
    if (/[#&]verify(?:&|$)/.test(location.hash)) { r.live = CKP.liveTest(); r.sounds = await CKP.measureSounds(); r.pass = r.pass && r.live.pass; }
    console.log('[CKP] RESULT', r.pass ? 'PASS' : 'FAIL');
  }, 500);
}
