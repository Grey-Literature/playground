'use strict';
/* =====================================================================
   OBSERVATION: room 5. Low gravity and long arcs.
   Built with Claude Opus 5.5 (claude-opus-5-5) in Claude Code, from
   HANDOFF-observation.md as revised by review (2026-10-05).
   Same shape as engine.js / berthing.js / galley.js: an IIFE that reads the
   game's globals and is a no-op unless the current room has `obs`.

   Movement is still the only verb. The route runs UP, not down: the deck is
   a glass floor over the stars, and the way across is a chain of brass
   gantries above it. A spring plate at a gantry's edge throws catbot along a
   low-gravity arc whose length is the speed it arrived at (walk short, trot
   long); a held direction leans the arc a little in the air. A short or long
   throw lands on the glass, and the glass lifts catbot back up to the gantry
   it was thrown from. No reset, no counter, no rewind.

   The rules live in stepWorld(), a pure function at 60 Hz that both the live
   game and the bot (simulate) call. The world owns catbot's x, speed and
   height in this room; the rig (catbot.js) supplies the springs, legs, poses
   and the landing itself, and is synchronized after its substeps (after()).
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA. Fields only this file reads:
     obs:{g,steer,cap}     gravity in the air (px/s²; the deck's is 2600), the
                           air lean (px/s²) and how far it can change the throw (px/s)
     plats:[{id,x,w,y,solid,hang,rest}]
                           gantries: y = walking surface above the deck; solid =
                           a pier down to the glass; hang = slung from the ceiling;
                           rest = where the glass's lift sets catbot down on it
     pads:[{x,w,y,vy,to}]  spring plates; the throw fires as catbot crosses the
                           far end (the lip) walking right; vy = the throw's lift,
                           to = the gantry it is meant to reach (bot and preview)
     pits:[{x0,x1,nb}]     stretches of glass between gantries that lift a cat
                           back up; nb = the gantries either side
     scope:{x}             the telescope on the last gantry (the socket is on its mount)
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'observation', name: 'Observation', w: 4260, floorSlip: 0,
  obs: { g: 520, steer: 80, cap: 60 },
  start: { x: 410, face: 1 }, reset: { x: 22, w: 112 },
  plats: [
    { id: 'g1', x: 870, w: 440, y: 100, solid: true, rest: 950 },
    { id: 'f', x: 1530, w: 140, y: 120, hang: true, rest: 1556 },
    { id: 'g2', x: 1910, w: 470, y: 70, solid: true, rest: 1960 },
    { id: 's', x: 2650, w: 220, y: 160, hang: true, rest: 2690 },
    { id: 't', x: 3210, w: 480, y: 200, solid: true, rest: 3270 }
  ],
  pads: [
    { x: 470, w: 70, y: 0, vy: 520, to: 'g1' },
    { x: 1240, w: 70, y: 100, vy: 520, to: 'f' },
    { x: 1600, w: 70, y: 120, vy: 520, to: 'g2' },
    { x: 2310, w: 70, y: 70, vy: 520, to: 's' },
    { x: 2800, w: 70, y: 160, vy: 520, to: 't' }
  ],
  pits: [
    { x0: 1310, x1: 1530, nb: ['g1', 'f'] },
    { x0: 1670, x1: 1910, nb: ['f', 'g2'] },
    { x0: 2380, x1: 2650, nb: ['g2', 's'] },
    { x0: 2870, x1: 3210, nb: ['s', 't'] }
  ],
  scope: { x: 3600 },
  part: { x: 3500, y: 200, id: 'observation', name: 'ASTROLABE GEAR' },
  exit: { x: 4020 },
  captions: [
    { on: 'obsPad', text: 'A spring plate. It throws you as hard as you arrive.' },
    { on: 'obsShort', text: 'Short. Come in faster: hold the direction, or tap it twice.' },
    { on: 'obsLong', text: 'Long. In the air, lean back to come down shorter.' },
    { on: 'obsLift', text: 'The glass lifts you back to where you jumped from.' },
    { on: 'obsScope', text: 'Something round and red, caught on the hull by the cockpit glass.', dur: 5.5 }
  ]
});
{
  const R = ROOMS[ROOMS.length - 1], t = R.plats.find(p => p.id === 't');
  R.part.y = t.y; R.socket = { x: R.scope.x, y: GY - t.y - 96 };
  // the trolley stays on the two stretches of open glass at the ends: the start apron and the hatch apron
  R.noCart = [[R.pads[0].x - 40, t.x + t.w + 40]];
  R.rail = [[0, R.pads[0].x - 30], [t.x + t.w + 30, R.w]];
}

window.OBS = (() => {
  const layout = ROOMS[ROOMS.length - 1], DT = 1 / 60;
  const NOSE = 88, TAIL = 64;                // a wall stops catbot's root this far from it: nose first, or tail first
  const BODY = 30, TALL = 100;               // in the air the body is narrower (legs tucked) and about this tall
  const GRAZE = 14, MAG = 22;                // a near miss: feet this close under a top still land; this much past an end still lands
  const SLAB = 32, UNDER = 125;              // a gantry's slab; a floor this low over catbot's head is a wall
  const LIFT_WAIT = .9;                      // seconds on the glass before it lifts
  const Y0 = 60;                             // the rig's standing body height (catbot.js: (HIPH+SHH)/2)
  const mine = () => !!room && !!room.obs;
  const live = () => mine() && !inHub();
  const copy = v => JSON.parse(JSON.stringify(v));
  const approach = (v, t, d) => v + clamp(t - v, -d, d);
  const platById = (def, id) => def.plats.find(p => p.id === id);
  const padLip = p => p.x + p.w;
  const padPlat = (def, i) => { const pd = def.pads[i]; return pd.y ? def.plats.find(p => p.y === pd.y && p.x + p.w === padLip(pd)) : null; };

  function fresh(def) {
    return {
      cat: {
        x: def.start.x, vx: 0, face: def.start.face, turn: 0, hold: 0, dir: 0, sprint: 0, lock: false,
        h: 0, fl: 0, vy: 0, air: false, kind: null, vx0: 0, from: -1, base: 0, settle: 0, ease: null, wait: 0, tx: 0, ty: 0, top: 0, phase: null
      },
      pads: def.pads.map(() => ({ coil: 0, fired: 0, on: false })),
      t: 0, launches: 0, misses: 0, lifts: 0, bonks: 0, got: false, pounce: -1, done: false, landings: []
    };
  }

  /* ---------- geometry ---------- */
  // the highest top at or under height h with x over it (the deck is 0)
  function floorAt(x, h, def) { let f = 0; for (const p of def.plats) if (x >= p.x && x <= p.x + p.w && p.y <= h + .01 && p.y > f) f = p.y; return f; }
  // is this gantry a wall to a cat whose feet are at height lv? (a pier, or a slab too low to walk under)
  const wallAt = (p, lv) => p.y > lv + 2 && (p.solid || p.y - SLAB < lv + UNDER);
  const pitAt = (x, def) => def.pits.findIndex(q => x >= q.x0 && x <= q.x1);

  /* =====================================================================
     RULES: one pure step. No rig, DOM, audio, randomness or globals beyond
     the shared constants (GAIT, the room data). input: {dir, doubleTap, sim}
     sim: the bot's stand-in for index.html's pounce (live, control() takes
     over before the world ever steps into it).
     ===================================================================== */
  function stepWorld(world, def, dt, input) {
    const ev = [], cat = world.cat, O = def.obs;
    world.t += dt;
    if (world.done) return ev;
    let dir = input.dir || 0;
    if (world.pounce >= 0) {                              // the bot's pounce: claws in, then the part goes home (index.html's timeline, ~4.8 s)
      world.pounce += dt; dir = 0;
      if (world.pounce > .95 && world.pounce < 1.3) cat.x = approach(cat.x, def.part.x - 64, 400 * dt);
      if (world.pounce >= 4.8) { world.pounce = -1; world.got = true; ev.push({ k: 'got' }); }
      cat.vx = 0; return ev;
    }
    // gait: hold a direction 1.6 s, or tap it twice, and it trots (index.html walk(), shared GAIT)
    if (dir !== cat.dir) { cat.hold = 0; cat.sprint = 0; cat.dir = dir; }
    if (input.doubleTap && dir) cat.sprint = dir;
    if (dir) cat.hold += dt; else { cat.hold = 0; cat.sprint = 0; }
    cat.settle = Math.max(0, cat.settle - dt);
    if (cat.turn > 0) cat.turn = Math.max(0, cat.turn - dt);
    const ox = cat.x, oh = cat.h;

    if (!cat.air) {
      // after a landing catbot only turns around on a fresh press: leaning back in the air doesn't walk it off the far side
      if (cat.lock && (dir !== -cat.face || cat.settle < .15)) cat.lock = false;
      const gdir = cat.lock ? 0 : dir;
      if (gdir && gdir !== cat.face && Math.abs(cat.vx) < 25 && cat.turn === 0) { cat.face = gdir; cat.turn = .36; ev.push({ k: 'turn' }); }
      const speed = cat.hold >= GAIT.hold || cat.sprint === gdir ? GAIT.trot : GAIT.walk;
      const target = gdir && gdir === cat.face && cat.turn === 0 ? gdir * speed : 0;
      cat.vx = approach(cat.vx, target, 260 * dt);
      if (cat.ease != null) { const d = cat.ease - cat.x; cat.x += d * Math.min(1, dt * 12); if (Math.abs(d) < .5) cat.ease = null; }
      cat.x += cat.vx * dt;
      // walls at this level: gantry faces (eased if it landed overlapping one)
      for (const p of def.plats) {
        if (!wallAt(p, cat.fl)) continue;
        if (ox <= p.x) { const lim = p.x - (cat.face > 0 ? NOSE : TAIL); if (cat.x > lim) { cat.x = cat.x - lim > 4 && ox > lim ? lerp(cat.x, lim, .25) : lim; cat.vx = Math.min(0, cat.vx); } }
        else if (ox >= p.x + p.w) { const lim = p.x + p.w + (cat.face < 0 ? NOSE : TAIL); if (cat.x < lim) { cat.x = lim - cat.x > 4 && ox < lim ? lerp(cat.x, lim, .25) : lim; cat.vx = Math.max(0, cat.vx); } }
      }
      // spring plates: walk on and the coil takes the weight; cross the lip walking right and it throws
      def.pads.forEach((pd, i) => {
        const o = world.pads[i], on = cat.fl === pd.y && cat.x >= pd.x - 40 && cat.x <= padLip(pd);
        o.coil = on ? clamp((cat.x - pd.x + 40) / (pd.w + 40), 0, 1) : approach(o.coil, 0, dt * 4);
        if (on && o.coil > 0 && !o.on) ev.push({ k: 'coil', i });
        o.on = on;
        if (cat.fl === pd.y && ox < padLip(pd) && cat.x >= padLip(pd) && cat.vx > 0) {
          const vx = Math.max(30, cat.vx);
          Object.assign(cat, { air: true, kind: 'pad', vx, vx0: vx, vy: pd.vy, from: i, base: pd.y, x: padLip(pd) });
          o.coil = 0; o.fired = world.t; world.launches++; ev.push({ k: 'launch', i, vx, vy: pd.vy });
        }
      });
      // walked off an edge: a slow fall
      if (!cat.air) { const f = floorAt(cat.x, cat.fl, def); if (f < cat.fl) { Object.assign(cat, { air: true, kind: 'fall', vy: 0, vx0: cat.vx, base: cat.fl, fl: f }); ev.push({ k: 'fall' }); } }
      // the glass lifts a cat that comes down between gantries back up to the one it jumped from
      const pi = cat.air ? -1 : cat.fl === 0 ? pitAt(cat.x, def) : -1;
      if (pi >= 0) {
        cat.wait += dt;
        if (cat.wait >= LIFT_WAIT) {
          const q = def.pits[pi], fromP = cat.from >= 0 ? padPlat(def, cat.from) : null;
          const tp = fromP || platById(def, q.nb[0]);
          // a column of air: straight up past every top between here and there, across, and down onto it
          const lo = Math.min(cat.x, tp.rest), hi = Math.max(cat.x, tp.rest);
          const over = def.plats.reduce((m, p) => p.x < hi && p.x + p.w > lo ? Math.max(m, p.y) : m, tp.y);
          Object.assign(cat, { air: true, kind: 'draft', phase: 'rise', vy: 120, vx: 0, vx0: 0, base: tp.y, tx: tp.rest, ty: tp.y, top: over + 50, wait: 0, face: Math.sign(tp.rest - cat.x) || cat.face, turn: 0 });
          world.lifts++; ev.push({ k: 'lift', i: pi, to: tp.id });
        }
      } else cat.wait = 0;
    } else {
      cat.ease = null;
      // in the air: gravity is the room's, a held direction leans the throw (not a lift's), nothing steers height
      if (cat.kind === 'draft') {
        // the lift is a current, not a throw: up, across, then a slow settle
        if (cat.phase === 'rise') { cat.vy = approach(cat.vy, 210, 500 * dt); if (cat.h >= cat.top) { cat.h = cat.top; cat.phase = 'glide'; } }
        else if (cat.phase === 'glide') {
          cat.vy = approach(cat.vy, 0, 600 * dt); const d = cat.tx - cat.x;
          cat.vx = clamp(d * 2.4, -360, 360); if (Math.abs(d) < 6) { cat.phase = 'sink'; cat.vx = 0; }
        } else { cat.vx = 0; cat.vy = approach(cat.vy, -110, 300 * dt); }
        cat.x += cat.vx * dt; cat.h += cat.vy * dt;
      } else {
        if (dir) cat.vx = clamp(cat.vx + dir * O.steer * dt, cat.vx0 - O.cap, cat.vx0 + O.cap);
        cat.x += cat.vx * dt;
        cat.h += cat.vy * dt - .5 * O.g * dt * dt; cat.vy -= O.g * dt;
      }
      // sides of gantries (a lift rises clear of them by construction)
      let grazed = null;
      if (cat.kind !== 'draft') for (const p of def.plats) {
        const bot = p.solid ? -1 : p.y - SLAB - 6;
        if (!(cat.h < p.y && cat.h + TALL > bot)) continue;
        const inX = cat.x + BODY > p.x && cat.x - BODY < p.x + p.w;
        if (!inX) continue;
        const wasIn = ox + BODY > p.x && ox - BODY < p.x + p.w;
        if (!wasIn && cat.h >= p.y - GRAZE && cat.vy < 120) { grazed = p; break; }   // grazed the lip: that's a landing
        if (!wasIn) {                                                                       // hit the side: drop straight down
          cat.x = ox <= p.x ? p.x - BODY : p.x + p.w + BODY; cat.vx = 0; cat.vx0 = 0; world.bonks++; ev.push({ k: 'bonk' });
        } else if (oh + TALL <= bot && cat.vy > 0) { cat.h = bot - TALL; cat.vy = 0; world.bonks++; ev.push({ k: 'bonk' }); }   // head on a slung gantry's underside
      }
      // what is under it now (the rig's floor and its shadow)
      cat.fl = floorAt(cat.x, Math.max(cat.h, 0), def);
      // landing: the feet come down through a top, within its span plus a forgiving margin
      if (cat.vy <= 0 || grazed) {
        let land = grazed;
        // (the margin is for coming down onto a top from above it, not for stepping off its end)
        if (cat.kind === 'draft') { if (cat.phase === 'sink' && cat.h <= cat.ty) land = def.plats.find(p => p.y === cat.ty && cat.x >= p.x && cat.x <= p.x + p.w); }
        else if (!land) for (const p of def.plats) { const m = oh > p.y + 1 ? MAG : 0; if (p.y <= oh + .01 && p.y >= cat.h - .01 && cat.x >= p.x - m && cat.x <= p.x + p.w + m && (!land || p.y > land.y)) land = p; }
        if (land || (cat.h <= 0 && cat.kind !== 'draft')) {
          const y = land ? land.y : 0, wasKind = cat.kind, impact = cat.vy;
          cat.ease = land && (cat.x < land.x + 12 || cat.x > land.x + land.w - 12) ? clamp(cat.x, land.x + 12, land.x + land.w - 12) : null;
          Object.assign(cat, { h: y, fl: y, vy: 0, air: false, kind: null, settle: .6, hold: 0, sprint: 0, lock: wasKind !== 'draft' && dir === -cat.face && dir !== 0 });
          cat.vx = wasKind === 'draft' ? 0 : cat.vx * .4;
          const miss = wasKind === 'pad' && y === 0;
          if (miss) world.misses++;
          if (world.landings.length < 64) world.landings.push(y);
          ev.push({ k: 'land', y, impact, kind: wasKind, miss, over: miss && overshot(world, def) });
        }
      }
    }
    // the room's ends, and the hatch until the part is in (index.html's blockers)
    cat.x = clamp(cat.x, 16 + NOSE, def.w - 16);
    if (!world.got && !cat.air && cat.x > def.exit.x + 10 - NOSE) { cat.x = def.exit.x + 10 - NOSE; cat.vx = Math.min(0, cat.vx); }
    // the bot's pounce, standing in for index.html's pounceReady()
    if (input.sim && !world.got && world.pounce < 0 && !cat.air && cat.turn === 0 && cat.fl === def.part.y) {
      const d = def.part.x - cat.x;
      if (Math.sign(d) === cat.face && Math.abs(d) < 190 && Math.abs(d) > 40) { world.pounce = 0; ev.push({ k: 'pounce' }); }
    }
    if (input.sim && world.got && !cat.air && cat.x > def.exit.x + 64 && dir > 0) { world.done = true; ev.push({ k: 'done' }); }
    return ev;
  }
  // a throw that came down past the gantry it was meant for (the pit beyond it), rather than short of it
  function overshot(world, def) {
    const pd = def.pads[world.cat.from], tp = platById(def, pd.to);
    return !!tp && world.cat.x > tp.x + tp.w;
  }

  /* ---------- prediction: where the current input lands (the ghost arc, and the bot) ---------- */
  // from the current state, hold `input` (and lean `steer` once in the air) until it lands or `max` s pass
  function predict(world, def, input, steer, max, path, keep) {
    const w = copy(world); let t = 0, launched = w.cat.air, from = -1;
    while (t < max) {
      const inp = w.cat.air ? { dir: steer ?? input.dir, doubleTap: false, sim: true } : { ...input, sim: true };
      const ev = stepWorld(w, def, DT, inp); t += DT;
      if (path && w.cat.air) path.push(w.cat.x, w.cat.h);
      for (const e of ev) {
        if (e.k === 'launch') { launched = true; from = e.i; if (keep) keep.at = copy(w); }
        if (e.k === 'land' && launched) return { x: w.cat.x, y: e.y, t, from, world: w };
      }
      if (!launched && !w.cat.air && Math.abs(w.cat.vx) < .5 && !input.dir) return null;
    }
    return null;
  }
  const landedOn = (def, r) => r && (r.y === 0 ? null : def.plats.find(p => p.y === r.y && r.x >= p.x - MAG && r.x <= p.x + p.w + MAG));

  /* =====================================================================
     BOTS: simulate(strategy) plays the room through stepWorld at 1/60.
     ===================================================================== */
  // where catbot stands: which gantry, pit, or open stretch of glass
  function region(world, def) {
    const c = world.cat;
    if (c.air) return { k: 'air' };
    if (c.fl > 0) return { k: 'plat', p: def.plats.find(p => p.y === c.fl && c.x >= p.x - 1 && c.x <= p.x + p.w + 1) };
    if (pitAt(c.x, def) >= 0) return { k: 'pit' };
    const t = def.plats[def.plats.length - 1];
    return c.x > t.x + t.w ? { k: 'apron' } : { k: 'start' };
  }
  // the plate to take from here: the one on this level, ahead of catbot on this gantry (or the start apron)
  function padHere(world, def) {
    const r = region(world, def), c = world.cat;
    if (r.k === 'start') return 0;
    if (r.k !== 'plat' || !r.p) return -1;
    return def.pads.findIndex(pd => pd.y === r.p.y && padLip(pd) === r.p.x + r.p.w);
  }
  // a plan for a plate: gait (walk or trot), lean in the air, and whether it works from where catbot stands now
  function choosePlan(world, def, pi) {
    const pd = def.pads[pi], tp = platById(def, pd.to), c = world.cat;
    const opts = [];
    for (const gait of ['walk', 'trot']) for (const steer of [0, 1, -1]) opts.push({ gait, steer });
    const out = [];
    for (const o of opts) {
      const r = runPlan(world, def, o, 6);
      const on = landedOn(def, r);
      if (on && on.id === tp.id) out.push({ ...o, x: r.x, margin: Math.min(r.x - tp.x, tp.x + tp.w - r.x) });
    }
    if (!out.length) return null;
    // a careful player: the widest margin, a walk if a walk will do, no lean if none is needed
    out.sort((a, b) => (b.margin > 40) - (a.margin > 40) || (a.gait === 'walk' ? -1 : 1) - (b.gait === 'walk' ? -1 : 1) || Math.abs(a.steer) - Math.abs(b.steer) || b.margin - a.margin);
    return out[0];
  }
  // run a plan forward from this state on a copy (the same inputs botInput would give)
  function runPlan(world, def, plan, max) {
    const w = copy(world), brain = { plan, rel: 0 }; let t = 0, launched = false;
    while (t < max) {
      const inp = planInput(w, def, brain);
      const ev = stepWorld(w, def, DT, { ...inp, sim: true }); t += DT;
      for (const e of ev) { if (e.k === 'launch') launched = true; if (e.k === 'land' && launched) return { x: w.cat.x, y: e.y, t }; }
    }
    return null;
  }
  // the inputs for a plan: walk = hold right but let go a moment every 1.4 s (so it never breaks into the trot), trot = tap twice and hold
  function planInput(w, def, brain) {
    const c = w.cat, p = brain.plan;
    if (c.air) return { dir: p.steer, doubleTap: false };
    if (p.gait === 'walk') { brain.rel = (brain.rel || 0) + DT; if (brain.rel > 1.4) { brain.rel = 0; return { dir: 0 }; } return { dir: 1 }; }
    return { dir: 1, doubleTap: true };
  }
  /* smart: picks walk or trot per plate and leans in the air, closed loop (re-plans the lean as it flies, like a person
     watching the landing marker). From any resting state it finds its way on, which is what the explorer leans on. */
  function botInput(world, def, brain) {
    const c = world.cat, r = region(world, def);
    if (world.pounce >= 0) return { dir: 0 };
    if (r.k === 'air') {
      if (c.kind === 'draft') return { dir: 0 };
      brain.airT = (brain.airT || 0) + DT;
      if (!brain.steerAt || brain.airT >= brain.steerAt) {
        brain.steerAt = brain.airT + .1;
        const pd = def.pads[c.from], tp = pd && platById(def, pd.to);
        let best = null;
        for (const s of [0, 1, -1]) {
          const res = predict(world, def, { dir: s }, s, 6);
          const on = landedOn(def, res);
          if (tp && on && on.id === tp.id) { const m = Math.min(res.x - tp.x, tp.x + tp.w - res.x); if (!best || m > best.m + 8 || (Math.abs(m - best.m) <= 8 && Math.abs(s) < Math.abs(best.s))) best = { s, m }; }
        }
        brain.steer = best ? best.s : (brain.plan ? brain.plan.steer : 0);
      }
      return { dir: brain.steer };
    }
    brain.airT = 0; brain.steerAt = 0;
    if (r.k === 'pit') return { dir: 0 };                               // the glass lifts it
    if (r.k === 'apron') return world.got ? { dir: 1 } : { dir: -1 };  // (can't happen without the part: the bot reports it as stuck)
    if (r.k === 'plat' && r.p && r.p.id === def.plats[def.plats.length - 1].id) {
      return { dir: c.turn > 0 ? 0 : 1 };                              // the last gantry: on to the part, then off the end to the hatch
    }
    const pi = padHere(world, def);
    if (pi < 0) return { dir: 0 };
    // backing off for a run-up: walk away from the lip, then stop and look again
    if (brain.backTo != null) {
      if (c.x > brain.backTo) return { dir: -1 };
      brain.backTo = null; return { dir: 0 };
    }
    // settle first (a careful player stops to look), then pick a plan from a standstill
    if (!brain.go || brain.goPad !== pi) {
      if (Math.abs(c.vx) > 1 || c.turn > 0) return { dir: 0 };
      const plan = choosePlan(world, def, pi);
      if (plan) { brain.go = true; brain.goPad = pi; brain.plan = plan; brain.rel = 0; }
      else {
        // too close to the lip (or past it) to build the pace: back off and come again
        const pd = def.pads[pi], r0 = region(world, def), floor = r0.k === 'plat' && r0.p ? r0.p.x + 100 : def.reset.x + def.reset.w + 80;
        brain.backTo = Math.max(floor, Math.min(c.x - 120, padLip(pd) - 260));
        if (brain.backTo >= c.x - 5) brain.backTo = null;
        return { dir: brain.backTo != null ? -1 : 0 };
      }
    }
    return planInput(world, def, brain);
  }
  function simulate(strategy, opt = {}) {
    const def = opt.def || layout, w = opt.world ? copy(opt.world) : fresh(def), max = opt.max || 400;
    const brain = {}; let stuckT = 0, lastLand = -1, events = [];
    const seed = opt.seed ?? 1; let rs = seed >>> 0;
    const rand = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296;
    let t0 = w.t, holdRel = 0;
    while (w.t - t0 < max && !w.done) {
      let inp;
      if (strategy === 'idle') inp = { dir: 0 };
      else if (strategy === 'walker') { holdRel += DT; inp = { dir: holdRel > 1.4 ? 0 : 1 }; if (holdRel > 1.4) holdRel = 0; }
      else if (strategy === 'trotter') inp = { dir: 1, doubleTap: true };
      else inp = botInput(w, def, brain);
      const ev = stepWorld(w, def, DT, { ...inp, sim: true });
      for (const e of ev) { if (e.k === 'land') { lastLand = w.t; brain.go = false; brain.backTo = null; } if (opt.events) events.push({ t: +w.t.toFixed(2), ...e }); }
      // stuck: resting somewhere with no way on and nothing about to move it
      const r = region(w, def);
      if (!w.cat.air && Math.abs(w.cat.vx) < .5 && r.k !== 'pit' && w.pounce < 0 && strategy === 'smart') stuckT += DT; else stuckT = 0;
      if (stuckT > 20) break;
    }
    const res = { finished: w.done, time: +(w.t - t0).toFixed(2), launches: w.launches, misses: w.misses, lifts: w.lifts, bonks: w.bonks, stuck: !w.done && stuckT > 20, got: w.got, x: Math.round(w.cat.x), fl: w.cat.fl };
    if (opt.details) res.world = w;
    if (opt.events) res.events = events;
    return res;
  }
  // explorer: random play (seeded), sampling resting states along the way; from every one, smart must still get out
  function explore(def, n = 40, seed = 0x0b5e7ab1) {
    let rs = seed >>> 0; const rand = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296;
    const states = [];
    for (let ep = 0; ep < n; ep++) {
      const w = fresh(def), brain = {}; let segT = 0, inp = { dir: 0 }, mixT = 0;
      const total = 20 + rand() * 90;
      while (w.t < total && !w.done) {
        if (segT <= 0) {
          segT = .1 + rand() * 1.8; mixT = rand();
          const d = rand(); inp = mixT < .45 ? null : { dir: d < .25 ? -1 : d < .45 ? 0 : 1, doubleTap: rand() < .4 };
        }
        segT -= DT;
        let use = inp || botInput(w, def, brain);
        if (w.cat.air && inp) use = { dir: rand() < .5 ? inp.dir : [-1, 0, 1][Math.floor(rand() * 3)] };
        stepWorld(w, def, DT, { ...use, sim: true });
        if (!w.cat.air && Math.abs(w.cat.vx) < .5 && w.pounce < 0 && rand() < .01 && states.length < 300) states.push(copy(w));
      }
    }
    let recovered = 0, worst = 0; const fails = [];
    for (const s of states) {
      const r = simulate('smart', { world: s, def, max: 200 });
      if (r.finished) { recovered++; worst = Math.max(worst, r.time); } else if (fails.length < 5) fails.push({ x: Math.round(s.cat.x), fl: s.cat.fl, got: s.got, r, s });
    }
    return { states: states.length, recovered, worst: +worst.toFixed(1), fails, seed: '0x' + seed.toString(16) };
  }

  /* =====================================================================
     SELF-TEST: index.html#room=observation&test (or in node: see CLAUDE.md)
     ===================================================================== */
  function selfTest(opt = {}) {
    const def = layout, lines = [], log = (ok, msg) => { const l = (ok ? 'PASS ' : 'FAIL ') + msg; lines.push(l); console.log('[OBS] ' + l); return ok; };
    const bots = {};
    for (const s of ['idle', 'walker', 'trotter', 'smart']) { bots[s] = simulate(s, { max: s === 'smart' ? 400 : 240 }); console.log('[OBS] BOT', s, JSON.stringify(bots[s])); }
    const f0 = fresh(def), idleW = simulate('idle', { details: true, max: 30 }).world; idleW.t = f0.t;
    log(JSON.stringify(idleW) === JSON.stringify(f0) && bots.idle.launches === 0 && bots.idle.misses === 0, 'idle: nothing changes, no launches, no misses');
    log(!bots.walker.finished && !bots.walker.got && bots.walker.misses >= 1, `walker (walks, never trots): never finishes, misses the first plate (${bots.walker.misses} misses)`);
    log(!bots.trotter.finished && bots.trotter.misses >= 1 && bots.trotter.lifts >= 1, `trotter (holds right, trots, never leans back): never finishes, misses and is lifted back (${bots.trotter.misses} misses, ${bots.trotter.lifts} lifts)`);
    log(bots.smart.finished && bots.smart.time <= 120 && bots.smart.misses <= 2, `smart: finishes within 120 s with at most 2 misses (${bots.smart.time} s, ${bots.smart.misses} misses)`);
    // the handoff also asked for at least 50 s. Perfect play is shorter than that; said here rather than padded (see CLAUDE.md, Observation)
    if (bots.smart.time < 50) { const l = `NOTE handoff floor of 50 s not met: perfect play takes ${bots.smart.time} s (a person who misses a few throws should take longer; unverified)`; lines.push(l); console.log('[OBS] ' + l); }
    // the walker and trotter keep trying: neither ends up somewhere it can't get on from
    for (const s of ['walker', 'trotter']) {
      const w = simulate(s, { details: true, max: 240 }).world, r = simulate('smart', { world: w, max: 200 });
      log(r.finished, `${s}: from where it ends up, a solution still exists (smart finishes in ${r.time} s)`);
    }
    // every plate, every arrival speed, every lean: wherever it lands, smart can still finish from there
    let landings = 0, ok = 0;
    def.pads.forEach((pd, i) => {
      for (let v = 30; v <= GAIT.trot; v += 15) for (const steer of [-1, 0, 1]) {
        const w = fresh(def); if (i > 0) { w.got = false; }
        const p = def.plats.find(q => q.y === pd.y && q.x + q.w === padLip(pd));
        Object.assign(w.cat, { x: padLip(pd) - 1, vx: v, face: 1, h: pd.y, fl: pd.y, dir: 1 });
        let t = 0, landed = false;
        while (t < 8 && !landed) { const ev = stepWorld(w, def, DT, { dir: w.cat.air ? steer : 1, sim: true }); t += DT; landed = ev.some(e => e.k === 'land'); }
        if (!landed) continue;
        for (let k = 0; k < 120 && w.cat.vx; k++)stepWorld(w, def, DT, { dir: 0, sim: true });
        landings++; if (simulate('smart', { world: w, max: 200 }).finished) ok++;
      }
    });
    log(landings > 0 && ok === landings, `no plate can throw catbot anywhere it can't get on from (${ok}/${landings} throws recovered)`);
    // the chain: walking the glass never gets past a gantry; the part and the hatch only come after the plates
    const t = def.plats[def.plats.length - 1];
    let walled = true;
    for (const sx of [def.start.x, ...def.pits.map(q => (q.x0 + q.x1) / 2)]) for (const tap of [false, true]) {
      const w = fresh(def); Object.assign(w.cat, { x: sx }); w.pads.forEach(() => { });
      for (let k = 0; k < 60 * 30; k++) { stepWorld(w, def, DT, { dir: 1, doubleTap: tap, sim: true }); if (w.cat.air || w.cat.fl) break; if (w.cat.x > t.x) { walled = false; break; } }
      // a deck-level stretch is walled in: nothing on the glass reaches the far gantry or the hatch apron
      if (!w.cat.air && !w.cat.fl && w.cat.x > t.x) walled = false;
    }
    log(walled, 'on the glass, catbot can never walk past a gantry to the part or the hatch');
    const probe = fresh(def); Object.assign(probe.cat, { x: t.x + t.w + 60, h: 0, fl: 0 });
    for (let k = 0; k < 600; k++)stepWorld(probe, def, DT, { dir: 1, doubleTap: true, sim: true });
    log(!probe.done && probe.cat.x <= def.exit.x + 10 - NOSE + .01, 'the hatch stays shut until the part is in');
    log(def.part.x - t.x > 260 && t.x + t.w - def.part.x > 120, 'the part sits mid-gantry: no landing comes down past it, and it is always reached before the far edge');
    // explorer
    const ex = explore(def, opt.episodes || 40);
    console.log('[OBS] EXPLORER', JSON.stringify(ex));
    log(ex.states > 50 && ex.recovered === ex.states, `explorer: from every resting state reached by random play, a solution exists (${ex.recovered}/${ex.states} states, worst ${ex.worst} s, seed ${ex.seed})`);
    // the trolley: one stable span on the start apron and one on the hatch apron
    const CH = 100, free = cx => { const a = cx - CH, b = cx + CH; if (a < def.reset.x + def.reset.w + 60 || b > def.exit.x - 8) return false; return !(def.noCart || []).some(([u, v]) => b > u && a < v); };
    const spanAt = (x0, x1) => { for (let cx = x0; cx <= x1; cx += 10) if (free(cx)) return cx; return null; };
    const sA = spanAt(0, def.pads[0].x), sB = spanAt(t.x + t.w, def.exit.x);
    const realFree = typeof cartFree === 'function' && mine() ? cx => cartFree(cx) : free;
    log(sA != null && sB != null && realFree(sA) && realFree(sB) && (def.rail || []).some(([a, b]) => sA - CH >= a - 140 && sA + CH <= b + 140) && (def.rail || []).some(([a, b]) => sB - CH >= a - 140 && sB + CH <= b + 140), `the trolley has a stable stretch at the start (x ${sA}) and at the hatch (x ${sB})`);
    // reset after a played state equals a fresh load
    if (mine()) {
      const saved = state; state = simulate('smart', { details: true, max: 30 }).world; reset(); const a = JSON.stringify(state);
      state = fresh(room); const b = JSON.stringify(state); state = saved;
      log(a === b, 'reset() after a played state equals a fresh load');
    } else {
      const played = simulate('smart', { details: true, max: 30 }).world;
      log(JSON.stringify(played) !== JSON.stringify(fresh(def)) && JSON.stringify(fresh(def)) === JSON.stringify(fresh(def)), 'a fresh state is deterministic and a played one differs (reset() itself is checked in the browser)');
    }
    // the timings come from the gait, not from feel
    const startToLip = padLip(def.pads[0]) - def.start.x, holdDist = .5 * GAIT.walk * GAIT.walk / 260 + GAIT.walk * (GAIT.hold - GAIT.walk / 260);
    log(startToLip < holdDist - 5, `from the start, the first approach is a walk (start to lip ${startToLip} px; holding breaks into the trot after ${holdDist.toFixed(0)} px)`);
    log(def.pads[0].x - def.reset.x - def.reset.w > 300, 'room to back up for a run-up without stepping on REWIND');
    return { pass: lines.every(l => !l.startsWith('FAIL')), lines, bots, explorer: ex };
  }

  /* =====================================================================
     LIVE: the hooks index.html calls
     ===================================================================== */
  let state = fresh(layout), remainder = 0, pendingDir = 0, lastPlay = false, lastDt = DT, adopted = false;
  let scopeT = -1, swing = 0, fx = { t: 0, bonk: 0, landK: 0 }, preview = null, prevT = 0;
  function reset() {
    if (!mine()) return;                       // not live(): a door from the deck plan loads the room while the mode is still the hub's
    state = fresh(room); remainder = 0; pendingDir = 0; lastPlay = false; adopted = false;
    state.got = installed.has(room.part.id);
    scopeT = state.got ? 99 : -1; swing = state.got ? 1 : 0; preview = null;
  }
  function update(dt, c, inputDir) {
    if (!live()) return;
    lastDt = dt; fx.t += dt;
    if (st.got && !state.got) { scopeT = 0; }
    state.got = st.got;
    if (scopeT >= 0 && scopeT < 99) scopeBeat(dt);
    // the drop in from the deck plan: the rig was let go above its floor, so the world takes the fall (slowly: this is the room)
    if (!adopted && mode === 'play' && rig.air && !state.cat.air) { Object.assign(state.cat, { air: true, kind: 'fall', h: state.cat.fl + Math.max(0, rig.y - Y0), vy: Math.min(0, rig.vy), vx0: 0, base: state.cat.fl }); }
    adopted = true;
    lastPlay = mode === 'play';
    if (!lastPlay) return;
    remainder += dt;
    const movement = latch ? 0 : (inputDir ?? dirInput());
    if (movement) pendingDir = movement;
    const ev = [];
    while (remainder >= DT) { ev.push(...stepWorld(state, room, DT, { dir: movement || pendingDir, doubleTap: !!sprint })); remainder -= DT; pendingDir = 0; }
    const cat = state.cat;
    if (cat.fl !== rig.fl) rig.setFloor(cat.fl, cat.air && !rig.air && cat.kind === 'fall');
    Object.assign(c, { kin: cat.vx, face: cat.face });
    // a slow body in thin gravity: drifting tail and ears in the air, a long soft squash after it lands
    if (cat.air) Object.assign(c, { tuck: cat.vy > 0 ? .15 : .4, earL: -6, earR: -2, earFlick: false, tailBase: 150, tailCurve: -6, tailTip: -10, wagAmp: 9, wagFreq: .35, lookY: cat.vy > 0 ? .3 : -.45, pupil: .7, lid: 0 });
    if (cat.settle > 0) { const k = cat.settle / .6; Object.assign(c, { crouch: .32 * k * fx.landK, bodyFreq: 3.2 - 1.4 * k }); }
    if (fx.bonk > 0) { fx.bonk -= dt; Object.assign(c, { lid: .55, earL: 30, earR: 26, mouth: -.3 }); }
    for (const e of ev) onEvent(e, cat);
    // the toolbox panel stays off the telescope's eyepiece
  }
  function onEvent(e, cat) {
    const px = cat.x, py = GY - cat.h;
    if (e.k === 'coil') { const pd = room.pads[e.i]; sfx('obsCoil', { x: padLip(pd), mag: .5 + .5 * Math.min(1, Math.abs(cat.vx) / GAIT.trot) }); caption('obsPad'); }
    else if (e.k === 'launch') {
      rig.jump(e.vy, e.vx); rig.earL.vel -= 16; rig.earR.vel -= 14; rig.tailFlick(4); rig.hOy.vel += 30;
      const k = e.vx / GAIT.trot; sfx('obsBoing', { x: px, mag: .55 + .45 * k, rate: .85 + .3 * k }); sfx('obsGlide', { x: px, mag: .4 + .6 * k, delay: .12 });
      FX.ring(px, py, .6); FX.dust(px, py, 4, .5, 1); shake = Math.max(shake, 1.2 * calmK());
    }
    else if (e.k === 'fall') { rig.earL.vel -= 8; rig.earR.vel -= 8; }
    else if (e.k === 'lift') {
      rig.jump(cat.vy, cat.vx); if (rig.facing !== cat.face && rig.turnT < 0) rig.flip();
      sfx('obsDraft', { x: px }); caption('obsLift'); FX.ring(px, GY, .7);
    }
    else if (e.k === 'bonk') { fx.bonk = .5; sfx('obsBonk', { x: px }); FX.sparks(px + rig.facing * 30, py - 50, 3, -rig.facing, .3); rig.hOx.vel -= 40 * rig.facing; rig.tailFlick(3); }
    else if (e.k === 'land') {
      fx.landK = clamp(-e.impact / 420, .35, 1);
      if (rig.air) { rig.vy = Math.min(-60, e.impact); rig.land(); }
      if (e.miss) caption(e.over ? 'obsLong' : 'obsShort');
    }
  }
  function after() {
    if (!live()) return;
    const cat = state.cat;
    if (lastPlay && mode === 'play') {
      rig.x = cat.x; rig.vx = cat.vx;
      if (cat.air) { if (!rig.air) rig.jump(cat.vy, cat.vx); rig.y = Y0 + (cat.h - rig.fl); rig.vy = cat.vy; }   // in the air the world carries the body: the rig keeps its springs, legs and tail
    } else { cat.x = rig.x; cat.vx = rig.vx; cat.face = rig.facing; }
    // the tail floats too: give back most of the deck's gravity to its chain (catbot.js pulls it with TG every substep)
    const k = 1 - room.obs.g / TG, n = Math.round(lastDt * 240);
    for (let i = 1; i < rig.tail.length; i++) rig.tail[i].y += k * TG * n / (240 * 240);
  }
  // REWIND and the hatch need a step toward them on solid ground: never a throw, a lift or a drift
  const intent = (dir, toward) => !mine() || (dir === toward && !state.cat.air);
  // the camera keeps the floor catbot left from in view, and rises with it on the high arcs
  const camYT = () => {
    if (!live()) return 0;
    const c = state.cat, lv = c.air ? (c.kind === 'draft' ? Math.max(c.base, c.h - 160) : c.base) : c.fl;
    const top = c.air && c.kind !== 'draft' && c.vy > 0 ? c.h + c.vy * c.vy / (2 * room.obs.g) : c.h;   // on the way up, aim for where the arc will peak
    return -clamp(Math.max(lv - 40, top - 165), 0, 250);   // high enough that the top of an arc stays in frame, low enough to see where it comes down
  };
  // rig events: a landing here is hushed (sound and dust), and heard as its own soft sound
  function ev(e) {
    if (!live() || (e.k !== 'land' && e.k !== 'thud')) return false;
    if (e.k === 'land') sfx('obsLand', { x: e.x, mag: Math.min(1.2, e.mag / 420) });
    e.mag *= .35;
    return true;
  }
  function scopeBeat(dt) {
    scopeT += dt;
    if (scopeT > .4 && swing === 0) { sfx('obsServo', { x: room.scope.x }); }
    swing = clamp((scopeT - .4) / 1.6, 0, 1);
    if (scopeT > 2 && scopeT - dt <= 2) { caption('obsScope'); console.log('%cOBSERVATION · scope logged by Claude Opus 5.5 (claude-opus-5-5) in Claude Code: something round and red on the hull by the cockpit glass', 'color:#f07a8c'); }
    if (scopeT > 8.5) scopeT = 99;
  }
  /* ---------- sound: the glass hums near the lifts; everything else is a one-shot at its event ---------- */
  let humT = 0;
  function audio(dt) {
    if (!live() || mode === 'card' || mode === 'rewind') { humT = 0; return; }
    humT -= dt; if (humT > 0) return; humT = 1.7;
    const c = state.cat, d = room.pits.reduce((m, q) => Math.min(m, Math.max(0, q.x0 - c.x, c.x - q.x1) + Math.abs(c.h) * .6), 1e9);
    const near = clamp(1 - d / 600, 0, 1);
    if (near > .05) sfx('obsHum', { x: c.x, mag: .25 + .75 * near, rate: .96 + .08 * Math.sin(fx.t * .7) });
  }

  /* =====================================================================
     DRAW. A long window onto the stars, a dark glass floor over more of them,
     brass gantries above it. No ctx.filter and nothing blurred per frame: the
     two star layers are painted once into offscreen canvases (rebuilt only when
     the room or the canvas scale changes) and scrolled at their own share of
     the camera. STEADY (settings.calm) stills the twinkle and the light pulses,
     not the parallax.
     ===================================================================== */
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // deterministic scatter: the same sky every visit
  const inView = (x0, x1 = x0) => x1 > camX - 80 && x0 < camX + W / zoom + 80;
  const SKY = { far: { f: .08, fy: .05, y0: -420, y1: 330, n: 900 }, mid: { f: .22, fy: .12, y0: -420, y1: 330, n: 260 } };
  let sky = null, skyKey = '';
  function paintSky(g, w, L, far) {
    if (far) {
      const gr = g.createLinearGradient(0, L.y0, 0, L.y1); gr.addColorStop(0, '#02030a'); gr.addColorStop(.55, '#060a18'); gr.addColorStop(1, '#0b1124');
      g.fillStyle = gr; g.fillRect(-40, L.y0, w + 80, L.y1 - L.y0);
      // a faint band of the galaxy, slanting across
      for (let i = 0; i < 26; i++) { const x = i / 26 * (w + 200) - 100, y = lerp(L.y0 + 120, L.y1 - 160, i / 26) + (hh(i + 3) - .5) * 80; softEllipse(g, x, y, 180 + hh(i) * 120, 60 + hh(i + 9) * 40, .05 + .04 * hh(i + 5), hh(i + 7) < .5 ? '120,140,220' : '170,120,200'); }
    }
    for (let i = 0; i < L.n; i++) {
      const x = hh(i + (far ? 11 : 501)) * w, y = lerp(L.y0, L.y1, hh(i + (far ? 77 : 777))), m = hh(i + (far ? 33 : 333));
      const r = far ? .5 + m * .8 : .8 + m * 1.3, a = far ? .35 + .5 * m : .55 + .45 * m;
      const tint = m > .93 ? '255,214,170' : m > .86 ? '170,200,255' : '230,236,255';
      g.fillStyle = 'rgba(' + tint + ',' + a + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (!far && m > .9) softEllipse(g, x, y, 6, 6, .25, tint);
    }
  }
  function buildSky() {
    const key = S.toFixed(3) + '|' + room.id; if (key === skyKey && sky) return;
    skyKey = key; sky = {};
    const maxCam = Math.max(0, room.w - W), sc = Math.min(S, 1.5);
    for (const [name, L] of Object.entries(SKY)) {
      const w = Math.ceil(maxCam * L.f + W + 40), h = L.y1 - L.y0, cv = document.createElement('canvas');
      cv.width = Math.ceil((w + 80) * sc); cv.height = Math.ceil(h * sc);
      const g = cv.getContext('2d'); g.setTransform(sc, 0, 0, sc, 40 * sc, -L.y0 * sc);
      paintSky(g, w, L, name === 'far');
      sky[name] = { ...L, cv, sc };
    }
  }
  // one layer, cropped to what the camera shows: content x appears at screen x - camX*f
  function blitSky(g, L) {
    const X0 = camX * L.f - 10, sx = Math.max(0, (X0 + 40) * L.sc), sw = Math.min(L.cv.width - sx, (W / zoom + 20) * L.sc);
    if (sw <= 0) return;
    g.drawImage(L.cv, sx, 0, sw, L.cv.height, sx / L.sc - 40 + camX * (1 - L.f), L.y0 + camY * (1 - L.fy), sw / L.sc, L.cv.height / L.sc);
  }
  const WIN_TOP = -470;                       // the window runs up out of frame: catbot never sees its top
  function wall(g, t) {
    if (!live()) return false;
    buildSky();
    const x0 = camX - 8, x1 = camX + W / zoom + 8;
    blitSky(g, sky.far);
    // the planet: a slow limb low in the window, barely moving with the camera
    const px = 560 + camX * .95, py = GY + 760 + camY * .97, R = 900;
    g.save(); g.beginPath(); g.rect(x0, WIN_TOP, x1 - x0, GY - 24 - WIN_TOP); g.clip();
    const pg = g.createRadialGradient(px - 260, py - 520, 80, px, py, R); pg.addColorStop(0, '#47607a'); pg.addColorStop(.55, '#22344a'); pg.addColorStop(1, '#0d1626');
    g.fillStyle = pg; g.beginPath(); g.arc(px, py, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,170,230,.10)'; g.lineWidth = 2;
    for (let k = 1; k < 6; k++) { g.beginPath(); g.ellipse(px, py, R * (.25 + k * .13), R * .08 * k, -.18, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }   // cloud bands
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 14; g.strokeStyle = 'rgba(110,170,255,.10)'; g.beginPath(); g.arc(px, py, R + 6, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(160,210,255,.16)'; g.beginPath(); g.arc(px, py, R + 2, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.restore();
    blitSky(g, sky.mid);
    // a few bright stars that twinkle (STEADY: they hold still)
    if (!settings.calm) for (let i = 0; i < 24; i++) {
      const sx = hh(i + 900) * (room.w * .3 + W) + camX * .7, sy = lerp(-380, GY - 80, hh(i + 901)) + camY * .85;
      if (!inView(sx)) continue;
      const a = .3 + .7 * Math.max(0, Math.sin(t * (1.2 + hh(i + 902) * 2.4) + i * 2.1));
      softEllipse(g, sx, sy, 5, 5, .5 * a, '220,232,255'); g.fillStyle = 'rgba(240,246,255,' + (.6 + .4 * a) + ')'; g.fillRect(sx - .7, sy - .7, 1.4, 1.4);
    }
    // drifting debris from the crash, tumbling slowly past outside
    for (let i = 0; i < 7; i++) {
      const sp = 6 + hh(i + 40) * 10, span = room.w + 800, X = ((hh(i + 41) * span + t * sp) % span) - 400 + camX * .4, Y = lerp(-300, GY - 120, hh(i + 42)) + camY * .6 + Math.sin(t * .2 + i) * 10;
      if (!inView(X)) continue;
      g.save(); g.translate(X, Y); g.rotate(t * (.1 + hh(i + 43) * .25) * (i % 2 ? 1 : -1));
      const sz = 3 + hh(i + 44) * 7; g.fillStyle = '#2b3138'; g.beginPath(); g.moveTo(-sz, -sz * .4); g.lineTo(sz * .8, -sz * .7); g.lineTo(sz, sz * .5); g.lineTo(-sz * .5, sz * .6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(200,215,235,.25)'; g.fillRect(-sz * .6, -sz * .45, sz * .9, 1); g.restore();
    }
    // after the telescope: the red thing, a speck at the forward end of the window (the cockpit is that way)
    if (scopeT >= 2.2) { const yx = W - 120 + .15 * Math.max(0, room.w - W) + camX * .85, yy = -40 + camY * .9; if (inView(yx)) { softEllipse(g, yx, yy, 7, 7, .5, '240,122,140'); g.fillStyle = '#f07a8c'; g.beginPath(); g.arc(yx, yy, 1.6, 0, TAU); g.fill(); } }
    // the window's ribs: brass mullions curving in toward the top, and the sill
    for (let x = Math.floor(x0 / 300) * 300 + 150; x < x1 + 300; x += 300) {
      g.fillStyle = '#1a1712'; g.beginPath(); g.moveTo(x - 9, GY - 24); g.lineTo(x - 9, -60); g.quadraticCurveTo(x - 9, WIN_TOP + 40, x + 40, WIN_TOP); g.lineTo(x + 58, WIN_TOP); g.quadraticCurveTo(x + 9, WIN_TOP + 40, x + 9, -60); g.lineTo(x + 9, GY - 24); g.closePath(); g.fill();
      g.fillStyle = 'rgba(214,165,78,.35)'; g.fillRect(x - 9, -60, 2, GY - 24 + 60);
      g.fillStyle = 'rgba(0,0,0,.5)'; for (let y = 0; y < GY - 30; y += 34) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    }
    g.fillStyle = '#14161b'; g.fillRect(x0, GY - 44, x1 - x0, 20); g.fillStyle = 'rgba(214,165,78,.3)'; g.fillRect(x0, GY - 44, x1 - x0, 1.5);
    // stencilled on the sill, like the hull livery in the other rooms
    g.save(); g.font = '600 11px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.28)';
    for (let x = Math.floor(x0 / 900) * 900 + 260; x < x1; x += 900) g.fillText('OBSERVATION  ·  MIND THE GLASS  ·  GRAVITY LOW', x, GY - 30);
    g.restore();
    drawScope(g, t, 'back');
    return true;
  }

  /* the glass floor: dark, with more stars under it, the lift glass between the gantries, then the gantries */
  function deck(g, t) {
    if (!live()) return;
    const x0 = camX - 8, x1 = camX + W / zoom + 8, fh = H - GY + 30 - camY;
    // over index.html's deck plate: glass, with the sky going on underneath
    g.fillStyle = '#05070e'; g.fillRect(x0, GY - 24, x1 - x0, fh);
    g.save(); g.beginPath(); g.rect(x0, GY - 24, x1 - x0, fh); g.clip();
    for (let i = 0; i < 70; i++) {
      const sx = hh(i + 1200) * (room.w * .5 + W) + camX * .5, sy = GY - 20 + hh(i + 1201) * (H - GY + 40);
      if (!inView(sx)) continue; g.fillStyle = 'rgba(220,232,255,' + (.25 + .5 * hh(i + 1202)) + ')'; g.fillRect(sx, sy, 1.2, 1.2);
    }
    const gl = g.createLinearGradient(0, GY - 24, 0, GY + 2); gl.addColorStop(0, 'rgba(120,150,200,.10)'); gl.addColorStop(1, 'rgba(160,190,230,.22)');
    g.fillStyle = gl; g.fillRect(x0, GY - 24, x1 - x0, 26);
    g.strokeStyle = 'rgba(170,200,240,.18)'; g.lineWidth = 1; const cx = camX + W / 2;
    for (let x = Math.floor(x0 / 96) * 96; x < x1; x += 96) { g.beginPath(); g.moveTo(x, GY - 24); g.lineTo(x + (x - cx) * .05, GY + 2); g.stroke(); }
    g.fillStyle = 'rgba(200,225,255,.28)'; g.fillRect(x0, GY + 1, x1 - x0, 1.2);
    g.restore();
    // the lift glass between gantries: paler, ringed, warming while catbot waits on it (the visual twin of the chime)
    const c = state.cat;
    room.pits.forEach((q, i) => {
      if (!inView(q.x0, q.x1)) return;
      const here = !c.air && c.fl === 0 && c.x >= q.x0 && c.x <= q.x1, k = here ? clamp(c.wait / LIFT_WAIT, 0, 1) : 0;
      g.fillStyle = 'rgba(150,200,255,' + (.07 + .12 * k) + ')'; g.fillRect(q.x0, GY - 24, q.x1 - q.x0, 26);
      const pul = settings.calm ? .5 : .5 + .5 * Math.sin(t * 2 + i);
      for (let x = q.x0 + 24; x < q.x1 - 12; x += 36) { g.save(); g.translate(x, GY - 11); g.scale(1, .3); g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.strokeStyle = 'rgba(170,215,255,' + (.18 + .1 * pul + .5 * k) + ')'; g.lineWidth = 2; g.stroke(); g.restore(); }
      if (k > 0) glowE(g, c.x, GY - 12, 90, 16, .35 * k, '150,210,255');
    });
    // a lift in progress: a pale column of rising motes under catbot
    if (c.air && c.kind === 'draft') {
      const top = GY - c.h, n = settings.calm ? 6 : 14;
      for (let i = 0; i < n; i++) { const u = ((t * .8 + i / n) % 1), y = lerp(GY - 10, top + 20, u); softEllipse(g, c.x + Math.sin(i * 2.3 + t * 2) * 26, y, 5, 5, .35 * (1 - u), '190,225,255'); }
      glowE(g, c.x, (GY + top) / 2, 50, (GY - top) / 2 + 20, .12, '150,200,255');
    }
    for (const p of room.plats) drawPlat(g, t, p);
    room.pads.forEach((pd, i) => drawPad(g, t, pd, state.pads[i]));
  }
  function glowE(g, x, y, rx, ry, a, rgb) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, x, y, rx, ry, a, rgb); g.restore(); }
  const CEIL = -470;
  function drawPlat(g, t, p) {
    if (!inView(p.x, p.x + p.w)) return;
    const x = p.x, w = p.w, top = GY - p.y, bot = top + SLAB;
    g.strokeStyle = OL; g.lineWidth = 1;
    if (p.solid) {
      // a brass truss down to the glass
      const fx0 = x + 14, fx1 = x + w - 14;
      g.fillStyle = '#211c14'; g.fillRect(fx0, bot, fx1 - fx0, GY - 24 - bot);
      g.strokeStyle = '#6e5228'; g.lineWidth = 3;
      for (const lx of [fx0 + 4, fx1 - 4]) { g.beginPath(); g.moveTo(lx, bot); g.lineTo(lx, GY - 24); g.stroke(); }
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(140,100,45,.55)';
      const n = Math.max(1, Math.round((fx1 - fx0) / 70)), cw = (fx1 - fx0) / n;
      for (let k = 0; k < n; k++) { g.beginPath(); g.moveTo(fx0 + k * cw, bot); g.lineTo(fx0 + (k + 1) * cw, GY - 24); g.moveTo(fx0 + (k + 1) * cw, bot); g.lineTo(fx0 + k * cw, GY - 24); g.stroke(); }
      g.strokeStyle = OL; g.lineWidth = 1;
    } else for (const hx of [x + 26, x + w - 26]) { g.fillStyle = '#3a3226'; g.fillRect(hx - 1.5, CEIL, 3, top - 24 - CEIL); g.fillStyle = '#6e5228'; g.fillRect(hx - 5, top - 30, 10, 6); }   // slung from the ceiling
    // railing along the back edge (behind catbot)
    g.strokeStyle = 'rgba(214,165,78,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, top - 58); g.lineTo(x + w - 4, top - 58); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); for (let sx = x + 8; sx < x + w; sx += 40) { g.moveTo(sx, top - 58); g.lineTo(sx, top - 22); } g.stroke();
    // walking surface: brass deck plate
    const dk = g.createLinearGradient(0, top - 24, 0, top); dk.addColorStop(0, '#5b4524'); dk.addColorStop(1, '#8a6a36');
    g.fillStyle = dk; g.fillRect(x, top - 24, w, 25);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.beginPath(); const cxv = camX + W / 2;
    for (let sx = Math.ceil(x / 64) * 64; sx < x + w; sx += 64) { g.moveTo(sx, top - 24); g.lineTo(sx + (sx - cxv) * .05, top); }
    g.stroke();
    g.fillStyle = 'rgba(255,227,160,.3)'; g.fillRect(x, top, w, 1.5);
    const fc = g.createLinearGradient(0, top, 0, bot); fc.addColorStop(0, '#6e5228'); fc.addColorStop(1, '#2e2414');
    g.fillStyle = fc; g.fillRect(x, top + 1.5, w, SLAB - 1.5); g.strokeStyle = OL; g.lineWidth = 1.2; g.strokeRect(x, top - 24, w, SLAB + 24);
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let sx = x + 12; sx < x + w - 6; sx += 24) { g.beginPath(); g.arc(sx, top + 8, 1.3, 0, TAU); g.fill(); }
    // edge lights along the lips: they pulse toward the gap (STEADY: steady)
    for (const [ex, d] of [[x + 6, -1], [x + w - 6, 1]]) for (let k = 0; k < 3; k++) {
      const lx = ex - d * k * 9, a = settings.calm ? .7 : .45 + .55 * Math.max(0, Math.sin(t * 3 - k * 1.1));
      g.fillStyle = 'rgba(255,190,90,' + a + ')'; g.fillRect(lx - 2, top + 16, 4, 3); glowE(g, lx, top + 17, 7, 4, .3 * a, '255,180,90');
    }
  }
  /* a spring plate: chevrons pointing over the gap, a coil in the slab that compresses under catbot, and a lamp that
     warms as it comes (a ramp, never a flash) */
  function drawPad(g, t, pd, o) {
    const lip = padLip(pd); if (!inView(pd.x, lip)) return;
    const top = GY - pd.y, c = state.cat, dist = c.fl === pd.y && !c.air ? lip - c.x : 999, near = clamp(1 - dist / 260, 0, 1) * (dist > -10 ? 1 : 0);
    const sq = o.coil * 4, fired = o.fired ? clamp(1 - (state.t - o.fired) / .5, 0, 1) : 0;
    g.fillStyle = '#2a2f36'; g.fillRect(pd.x, top - 24 + sq, pd.w, 24 - sq);
    const pg = g.createLinearGradient(0, top - 24 + sq, 0, top); pg.addColorStop(0, '#ffe3a0'); pg.addColorStop(1, '#8c5b22');
    g.fillStyle = pg; g.fillRect(pd.x + 3, top - 22 + sq, pd.w - 6, 7); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(pd.x + 3, top - 22 + sq, pd.w - 6, 7);
    g.strokeStyle = 'rgba(125,255,176,' + (.35 + .5 * near) + ')'; g.lineWidth = 2; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const cx = pd.x + 16 + k * 18; g.beginPath(); g.moveTo(cx - 4, top - 10); g.lineTo(cx + 3, top - 6); g.lineTo(cx - 4, top - 2); g.stroke(); }
    g.lineCap = 'butt';
    // the coil, seen in the slab's cutaway (on the glass, in the floor's)
    const cy0 = top + 3, cy1 = top + SLAB - 3 - sq * 1.5, n = 7;
    g.save(); g.beginPath(); g.rect(pd.x + 8, top + 1, pd.w - 16, SLAB - 2); g.clip();
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(pd.x + 8, top + 1, pd.w - 16, SLAB - 2);
    g.strokeStyle = '#c3673d'; g.lineWidth = 2; g.beginPath();
    for (let k = 0; k <= n; k++) { const y = lerp(cy0, cy1, k / n), xx = pd.x + 14 + (k % 2) * (pd.w - 28); if (k) g.lineTo(xx, y); else g.moveTo(xx, y); }
    g.stroke(); g.restore();
    // the lamp at the lip
    const lx = lip - 6, ly = top - 52, a = Math.max(near, fired);
    g.fillStyle = '#2b2f36'; g.fillRect(lx - 2.5, ly + 4, 5, 26);
    g.beginPath(); g.arc(lx, ly, 5.5, 0, TAU); g.fillStyle = fired > .3 ? '#f2fff6' : a > .02 ? 'rgb(' + (lerp(40, 170, a) | 0) + ',255,' + (lerp(90, 200, a) | 0) + ')' : '#1f4a33'; g.fill(); g.strokeStyle = OL; g.stroke();
    if (a > .02) glowE(g, lx, ly, 22, 22, .45 * a * (settings.calm ? .7 : 1), '110,255,170');
  }

  /* the telescope on the last gantry: a brass tube on a tripod; its mount's hub is the socket */
  function drawScope(g, t, layer) {
    const sc = room.scope, s = room.socket, tp = room.plats[room.plats.length - 1], top = GY - tp.y;
    if (!inView(sc.x - 200, sc.x + 200)) return;
    if (layer === 'back') {
      g.strokeStyle = '#4a3a20'; g.lineWidth = 5; g.lineCap = 'round';
      for (const dx of [-38, 0, 38]) { g.beginPath(); g.moveTo(s.x, s.y + 8); g.lineTo(s.x + dx, top - 22); g.stroke(); }
      g.lineCap = 'butt';
    }
    // tube: parked pointing up and back; swings forward (toward the cockpit) once the gear is in
    const a = lerp(-2.35, -.42, easeIO(swing)), L1 = 150, L0 = 40, c = Math.cos(a), si = Math.sin(a);
    g.save(); g.translate(s.x, s.y); g.rotate(a);
    const tg = g.createLinearGradient(0, -12, 0, 12); tg.addColorStop(0, '#ffe3a0'); tg.addColorStop(.45, '#b58340'); tg.addColorStop(1, '#5e3d17');
    g.fillStyle = tg; g.beginPath(); g.roundRect(-L0, -10, L0 + L1, 20, 4); g.fill(); g.strokeStyle = OL; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = '#3b2a12'; g.fillRect(L1 - 18, -12, 10, 24); g.fillRect(-L0 + 6, -11, 8, 22);
    g.beginPath(); g.ellipse(L1, 0, 3.5, 11, 0, 0, TAU); g.fillStyle = scopeT >= 0 ? '#9fd6ff' : '#1b2633'; g.fill(); g.stroke();
    g.restore();
    if (scopeT >= 0) glowE(g, s.x + c * L1, s.y + si * L1, 16, 16, .3, '160,210,255');
    // the mount: a ring with the astrolabe gear's socket at its centre (dashed and waiting until the gear goes in)
    g.beginPath(); g.arc(s.x, s.y, 20, 0, TAU); g.fillStyle = '#2f343c'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OL; g.stroke();
    if (state.got) disc(g, s.x, s.y, 15, NEAR, t * .4, false);
    else { g.beginPath(); g.arc(s.x, s.y, 14, 0, TAU); g.fillStyle = '#07090c'; g.fill(); g.setLineDash([3, 3.5]); g.strokeStyle = 'rgba(95,208,255,' + (.45 + .25 * (settings.calm ? 0 : Math.sin(t * 3))) + ')'; g.lineWidth = 1.4; g.beginPath(); g.arc(s.x, s.y, 18, 0, TAU); g.stroke(); g.setLineDash([]); }
    g.font = '600 9px Oswald,sans-serif'; g.textAlign = 'center'; g.fillStyle = state.got ? 'rgba(255,210,122,.7)' : 'rgba(214,165,78,.35)';
    g.fillText(state.got ? 'SURVEY SCOPE  ·  TRACKING' : 'SURVEY SCOPE  ·  NO ASTROLABE', s.x, top - 6); g.textAlign = 'left';
  }

  /* ---------- in front of catbot: the ghost arc, its landing, and the eyepiece ---------- */
  function updPreview() {
    preview = null;
    if (mode !== 'play' || latch) return;
    const c = state.cat, d = dirInput();
    if (c.air) {
      if (c.kind === 'draft') return;
      const path = [c.x, c.h], r = predict(state, room, { dir: d }, d, 6, path);
      const rb = predict(state, room, { dir: -1 }, -1, 6), rf = predict(state, room, { dir: 1 }, 1, 6);
      preview = { path, r, rb, rf, air: true };
      return;
    }
    const pi = room.pads.findIndex(pd => pd.y === c.fl && padLip(pd) - c.x < 260 && padLip(pd) - c.x > -4);
    if (pi < 0 || c.face < 0) return;
    const keep = {}, path = [];
    const r = d > 0 ? predict(state, room, { dir: 1, doubleTap: !!sprint }, 1, 5, path, keep) : null;
    if (!r) {   // standing (or turning away): the two throws it could make, faintly
      const walk = [], trot = [], ww = copy(state), wt = copy(state);
      Object.assign(ww.cat, { x: padLip(room.pads[pi]) - 1, vx: GAIT.walk, dir: 1 }); Object.assign(wt.cat, { x: padLip(room.pads[pi]) - 1, vx: GAIT.trot, dir: 1 });
      const r1 = predict(ww, room, { dir: 0 }, 0, 5, walk), r2 = predict(wt, room, { dir: 0 }, 0, 5, trot);
      preview = { idle: true, walk, trot, r1, r2 };
      return;
    }
    const at = keep.at, rb = at && predict(at, room, { dir: -1 }, -1, 6), rf = at && predict(at, room, { dir: 1 }, 1, 6);
    preview = { path, r, rb, rf, pi };
  }
  function drawArc(g, path, a, rgb, dash) {
    if (!path || path.length < 4) return;
    g.save(); g.setLineDash(dash || [5, 6]); g.lineDashOffset = settings.calm ? 0 : -fx.t * 20; g.strokeStyle = 'rgba(' + rgb + ',' + a + ')'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(path[0], GY - path[1] - 40); for (let i = 2; i < path.length; i += 6) g.lineTo(path[i], GY - path[i + 1] - 40); g.stroke(); g.restore();
  }
  function marker(g, r, a, big) {
    if (!r) return;
    const on = landedOn(room, r), y = GY - r.y, rgb = on ? '125,255,176' : '160,205,255';
    g.save(); g.translate(r.x, y - 4); g.scale(1, .32); g.beginPath(); g.arc(0, 0, big ? 22 : 12, 0, TAU); g.strokeStyle = 'rgba(' + rgb + ',' + a + ')'; g.lineWidth = big ? 3 : 2; g.stroke(); g.restore();
    if (big) { g.strokeStyle = 'rgba(' + rgb + ',' + (a * .7) + ')'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(r.x, y - 12); g.lineTo(r.x, y - 34); g.stroke(); }
  }
  function front(g, t) {
    if (!live()) return;
    if (++prevT % 3 === 0 || !preview) updPreview();
    const pv = preview;
    if (pv && pv.idle) {
      drawArc(g, pv.walk, .42, '160,205,255', [3, 6]); drawArc(g, pv.trot, .42, '255,214,140', [3, 6]);   // walk (pale blue) and trot (amber)
      marker(g, pv.r1, .5, false); marker(g, pv.r2, .5, false);
    } else if (pv) {
      const on = landedOn(room, pv.r), rgb = on ? '125,255,176' : '160,205,255';
      drawArc(g, pv.path, pv.air ? .32 : .5, rgb);
      // how far a lean could move it: a bracket between the lean-back and lean-forward landings
      if (pv.rb && pv.rf && pv.rb.y === pv.rf.y) { const y = GY - pv.rf.y - 4; g.strokeStyle = 'rgba(255,227,160,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pv.rb.x, y - 6); g.lineTo(pv.rb.x, y); g.lineTo(pv.rf.x, y); g.lineTo(pv.rf.x, y - 6); g.stroke(); }
      else { marker(g, pv.rb, .25, false); marker(g, pv.rf, .25, false); }
      marker(g, pv.r, .8, true);
    }
    if (scopeT >= 0 && scopeT < 99) eyepiece(g, t);
  }
  /* the scope's view: a lens inset that pans across the stars and stops on the red thing, snagged on the hull */
  function eyepiece(g, t) {
    const u = scopeT, a = clamp((u - 1.6) / .5, 0, 1) * clamp((8.5 - u) / 1, 0, 1); if (a <= 0) return;
    g.save(); g.setTransform(S, 0, 0, S, 0, 0); g.globalAlpha = a;
    const cx = 128, cy = 112, R = 84, pan = (1 - easeIO(clamp((u - 1.6) / 1.8, 0, 1))) * 460;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.save(); g.clip();
    g.fillStyle = '#03050c'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (let i = 0; i < 90; i++) { const x = cx - R + ((hh(i + 3000) * 900 - pan) % 900 + 900) % 900 - 300, y = cy - R + hh(i + 3001) * R * 2; g.fillStyle = 'rgba(230,236,255,' + (.3 + .6 * hh(i + 3002)) + ')'; g.fillRect(x, y, 1.4, 1.4); }
    // the hull by the cockpit glass, and the thing caught on it
    const ox = pan;
    g.fillStyle = '#3a4048'; g.beginPath(); g.moveTo(cx + 18 + ox, cy + R); g.quadraticCurveTo(cx + 30 + ox, cy - 10, cx + R + 40 + ox, cy - 46); g.lineTo(cx + R + 60 + ox, cy + R); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,210,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 40 + ox, cy + 24); g.quadraticCurveTo(cx + 54 + ox, cy - 8, cx + R + 20 + ox, cy - 30); g.stroke();   // the cockpit glass's rim
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(cx + 30 + k * 12 + ox, cy + 46 - k * 9, 1.4, 0, TAU); g.fill(); }
    g.strokeStyle = '#2a2e35'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 22 + ox, cy + 30); g.lineTo(cx - 6 + ox, cy + 8); g.stroke();   // a bent antenna strut
    const yx = cx - 6 + ox + Math.sin(t * .6) * 1.5, yy = cy + 4 + Math.cos(t * .5) * 1.5;
    g.strokeStyle = '#b8455a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(yx + 6, yy + 6); g.bezierCurveTo(yx - 20, yy + 30, yx - 40 + Math.sin(t) * 6, yy - 6, yx - 62, yy + 14 + Math.sin(t * .8) * 5); g.stroke();   // its loose end, drifting
    const yg = g.createRadialGradient(yx - 3, yy - 4, 1.5, yx, yy, 10); yg.addColorStop(0, '#f07a8c'); yg.addColorStop(1, '#8e2c40');
    g.fillStyle = yg; g.beginPath(); g.arc(yx, yy, 10, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,20,35,.6)'; g.lineWidth = 1; g.beginPath(); g.arc(yx, yy, 6.5, .4, 2.4); g.stroke(); g.beginPath(); g.arc(yx + 1, yy - 1, 8, 3.6, 5.2); g.stroke();
    // reticle
    g.strokeStyle = 'rgba(160,210,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.stroke();
    const vg = g.createRadialGradient(cx, cy, R * .55, cx, cy, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = vg; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.restore();
    g.lineWidth = 6; g.strokeStyle = '#8c5b22'; g.beginPath(); g.arc(cx, cy, R + 3, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.strokeStyle = OL; g.beginPath(); g.arc(cx, cy, R + 6.5, 0, TAU); g.stroke();
    g.font = '600 9px Oswald,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,214,140,.75)'; g.fillText('SURVEY SCOPE  ·  FORE', cx, cy + R + 20); g.textAlign = 'left';
    g.restore();
  }

  /* =====================================================================
     VERIFY (dev only): index.html#room=observation&test&verify
     The smart bot plays through the real game loop (keys and taps only, no state
     injection): the rig, index.html's pounce and hatch, the camera. Each tick the
     world is also stepped on a copy and compared, so the bot test above plays the
     same rules the game does. Then isolation (every hook is a no-op in the other
     rooms) and offline measurements of the new sounds.
     ===================================================================== */
  function liveTest() {
    if (!mine()) return { pass: false, reason: 'load the observation first' };
    const saved = { settings: { ...settings }, storage: localStorage.getItem('catbot.settings'), parts: [...installed], run: { ...run }, caps: [...seenCaps], T };
    const runs = [], shots = {};
    try {
      for (const steady of [false, true]) {
        settings.sound = false; settings.calm = steady; AUDIO.enable(false);
        installed.delete(room.part.id); resetRoom(); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0;
        const brain = {}; let frames = 0, mismatch = 0, worst = 0, finished = false, wasAir = false, landX = [], scopeSeen = false;
        while (frames < 60 * 150) {
          const inp = mode === 'play' ? botInput(state, room, brain) : { dir: 0 };
          keys.l = inp.dir < 0; keys.r = inp.dir > 0; sprint = inp.doubleTap && inp.dir ? inp.dir : 0;
          const pred = mode === 'play' ? copy(state) : null;
          if (pred) stepWorld(pred, room, DT, { dir: inp.dir, doubleTap: !!sprint });
          tick(DT); frames++;
          if (pred && mode === 'play') { const d = Math.abs(pred.cat.x - state.cat.x) + Math.abs(pred.cat.h - state.cat.h); if (d > .001) mismatch++; worst = Math.max(worst, d); }
          if (wasAir && !state.cat.air) { brain.go = false; brain.backTo = null; landX.push(Math.round(state.cat.x)); }
          wasAir = state.cat.air;
          // the rig follows the world: same x always, and once it lands, the same floor
          if (!state.cat.air && !rig.air && rig.fl !== state.cat.fl) mismatch++;
          if (scopeT > 3 && scopeT < 99) scopeSeen = true;
          if (!steady) {
            const c = state.cat, lipD = padLip(room.pads[0]) - c.x, checks = { approach: !c.air && c.fl === 0 && preview && !preview.idle && lipD < 120 && lipD > 0, flight: c.air && c.kind === 'pad' && c.vy < 0 && c.from === 1, lift: c.air && c.kind === 'draft', scope: scopeT > 3.6 && scopeT < 6 };
            for (const [k, ok] of Object.entries(checks)) if (ok && !shots[k]) { render(0); shots[k] = cv.toDataURL('image/png'); }
          }
          if (mode === 'exit') { finished = true; break; }
        }
        const r = { steady, finished, time: +(frames / 60).toFixed(2), launches: state.launches, misses: state.misses, installed: installed.has(room.part.id), scopeSeen, physicsMismatches: mismatch, worstDrift: +worst.toFixed(4), landings: landX };
        r.pass = finished && r.installed && mismatch === 0 && scopeSeen;
        runs.push(r); console.log('[OBS] LIVE', JSON.stringify(r));
      }
      // a forced miss in the real loop: hold right and trot at the beat-2 plate; the glass must lift catbot back to the gantry it left
      installed.delete(room.part.id); resetRoom(); mode = 'play'; latch = false; fade = 0; fadeDir = 0; acc = 0;
      const g1 = room.plats[0]; Object.assign(state.cat, { x: g1.x + 60, h: g1.y, fl: g1.y, face: 1 }); rig.reset(g1.x + 60); rig.setFloor(g1.y);
      let lifted = false, back = false;
      for (let f = 0; f < 60 * 20 && !back; f++) { keys.r = !state.cat.air || state.cat.kind !== 'draft'; keys.l = false; sprint = keys.r ? 1 : 0; if (state.cat.kind === 'draft') lifted = true; tick(DT); if (lifted && !state.cat.air) back = state.cat.fl === g1.y; }
      const missRun = { lifted, back, pass: lifted && back }; console.log('[OBS] MISS', JSON.stringify(missRun));
      // isolation: in every other room, every hook does nothing
      const isolation = [];
      for (let i = 0; i < ROOMS.length; i++) if (!ROOMS[i].obs) {
        loadRoom(i); mode = 'play';
        const c = freshCtrl(), before = JSON.stringify(c), rx = rig.x, ry = rig.y, tail = JSON.stringify(rig.tail), e = { k: 'land', mag: 300, x: 0, y: 0 };
        reset(); update(DT, c, 1); after(); audio(DT); deck(ctx, 0); front(ctx, 0);
        const ok = JSON.stringify(c) === before && rig.x === rx && rig.y === ry && JSON.stringify(rig.tail) === tail && intent(0, 1) && !wall(ctx, 0) && camYT() === 0 && !ev(e) && e.mag === 300;
        isolation.push({ room: room.id, pass: ok });
      }
      console.log('[OBS] ISOLATION', JSON.stringify(isolation));
      return { pass: runs.every(r => r.pass) && missRun.pass && isolation.every(r => r.pass), runs, miss: missRun, isolation, shots: Object.keys(shots) };
    } finally {
      installed.clear(); for (const id of saved.parts) installed.add(id);
      Object.assign(settings, saved.settings); if (saved.storage === null) localStorage.removeItem('catbot.settings'); else localStorage.setItem('catbot.settings', saved.storage);
      Object.assign(run, saved.run); seenCaps.clear(); for (const k of saved.caps) seenCaps.add(k); T = saved.T;
      AUDIO.enable(settings.sound); keys.l = keys.r = false; sprint = 0;
      loadRoom(ROOMS.findIndex(r => r.obs)); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0; camX = camTarget(); camY = 0; caps.length = 0;
      window.__obsShots = shots;
      render(0);
    }
  }
  // peak, share of energy above 150 Hz and in 150-400 Hz, of each new sound alone, rendered offline (master/limiter output)
  async function measureSounds() {
    if (typeof OfflineAudioContext === 'undefined') return { verified: false, reason: 'OfflineAudioContext unavailable' };
    const frame = document.createElement('iframe'); frame.hidden = true;
    const loaded = new Promise(res => { frame.onload = res; });
    frame.srcdoc = '<script src="audio.js"><\/script>'; document.body.appendChild(frame); await loaded;
    const out = {};
    try {
      const A = frame.contentWindow.AUDIO;
      for (const name of ['obsCoil', 'obsBoing', 'obsGlide', 'obsLand', 'obsDraft', 'obsHum', 'obsBonk', 'obsServo', 'land']) {
        const ctx2 = new OfflineAudioContext(1, 48000 * 2, 48000); A.attach(ctx2, true); A.limits(false); A.sfx(name, { mag: name === 'land' ? 420 : 1, rate: 1 });
        const buf = await ctx2.startRendering(), x = buf.getChannelData(0), n = 131072, re = new Float64Array(n), im = new Float64Array(n);
        let peak = 0, sq = 0; for (let i = 0; i < x.length; i++) { re[i] = x[i]; peak = Math.max(peak, Math.abs(x[i])); sq += x[i] * x[i]; }
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
        console.log('[OBS] SOUND', name, JSON.stringify(out[name]));
      }
    } finally { frame.remove(); }
    return { verified: true, measurements: out };
  }

  // index.html calls ENG.seat() for any part with a room.socket; engine.js's spins its turbine. Here the gear goes into the telescope.
  if (window.ENG && ENG.seat) { const prev = ENG.seat; ENG.seat = (...a) => mine() ? undefined : prev(...a); }

  return { reset, update, after, intent, camY: camYT, ev, audio, wall, deck, front, simulate, selfTest, explore, liveTest, measureSounds, stepWorld, fresh, botInput, predict, get state() { return state; } };
})();

/* dev entry: index.html#room=observation  (&parts=... ; hip, engine and galley are assumed; &test runs the self-test, &verify adds the live run) */
if (typeof location !== 'undefined' && /(^|[#&])room=observation(?:&|$)/.test(location.hash)) {
  const pm = /parts=([\w,-]+)/.exec(location.hash);
  for (const id of pm ? pm[1].split(',') : ['hip', 'engine', 'galley']) if (id !== 'none') installed.add(id);
  OPEN.finish(false); loadRoom(ROOMS.findIndex(r => r.id === 'observation')); mode = 'play'; modeT = 0;
  if (/[#&]test/.test(location.hash)) setTimeout(async () => {
    const r = window.__obsTest = OBS.selfTest();
    if (/[#&]verify(?:&|$)/.test(location.hash)) { r.live = OBS.liveTest(); r.sounds = await OBS.measureSounds(); r.pass = r.pass && r.live.pass && r.sounds.verified; }
    console.log('[OBS] RESULT', r.pass ? 'PASS' : 'FAIL');
  }, 500);
}
