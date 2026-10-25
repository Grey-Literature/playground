'use strict';
/* =====================================================================
   HYDROPONICS: room 7. Something in here is catnip.
   Built with Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork, 2026-10-07,
   from the plan in the Cowork planning chat (claude/rooms-6-7-plan.md).
   Same shape as the other room modules: an IIFE that reads the game's
   globals and is a no-op unless the current room has `hyd`.

   Movement is still the only verb. A cat exercise wheel drives a pump:
   walking into the wheel spins it and catbot runs on the spot (a treadmill,
   through ctrl.belt like the engine bay's belts). The pump fills a trough
   and a floating planter raft rises with the water to deck level, so catbot
   can walk across. Once the pump has what it can get from that pace, the
   wheel's clutch lets go and catbot runs out of it, and the water starts to
   drain: that's the window. A walk never lets the clutch go (it keeps the
   wheel ticking over); a trot fills it to deck level; the zoomies fill it
   past that, which buys a longer window. Catbot won't put a paw in water:
   a sunk raft is a soggy hop back to the bank it came from. No reset, no
   counter.

   The catnip: two planters puff on a cycle. Stand still in a puff (a cat
   sniffs; a running cat doesn't stop for it) and catbot gets the zoomies for
   a few seconds (240 px/s), then flops on the floor, very pleased with
   itself, and can't be moved for a moment.

   The rules live in stepRules(), a pure function at 60 Hz fed with catbot's
   x, speed and facing; the live game feeds it the rig, the bot (simulate)
   feeds it a small model of the rig's walk (stepCat), which also plays the
   wheel, the zoomies, the flop and the soggy hop. Nothing here owns
   catbot's x: the wheel moves the floor under it, the troughs block it
   through index.html's blockers, the hop is the rig's own jump.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA. Fields only this file reads:
     hyd:{fill,drain,ok,zoom,zoomT,flopT}  pump fill and drain (level/s), the level a raft needs to be at deck height,
                                           the zoomies' pace and length, the flop's length
     wheels:[{x,w,feeds}]                  a cat wheel at x..x+w; feeds = the troughs its pump fills
     troughs:[{x0,x1,need}]                gaps in the deck full of water, each with a raft; need = the bot's plan ('trot'/'nip')
     nips:[{x,r,period,on,ph}]             catnip planters: a puff of radius r for `on` s every `period` s (phase ph)
     pump:{x}                              the main pump on the back wall (the socket)
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'hydroponics', name: 'Hydroponics', w: 4140, floorSlip: 0,
  hyd: { fill: .55, drain: .1, ok: .75, zoom: 240, zoomT: 5, flopT: 1.2 },
  start: { x: 360, face: 1 }, reset: { x: 22, w: 112 },
  wheels: [{ x: 560, w: 150, feeds: [0] }, { x: 1560, w: 150, feeds: [1] }, { x: 2650, w: 150, feeds: [2] }],
  troughs: [{ x0: 770, x1: 930, need: 'trot' }, { x0: 2120, x1: 2320, need: 'nip' }, { x0: 3200, x1: 3420, need: 'nip' }],
  nips: [{ x: 1350, r: 110, period: 5, on: 2.2, ph: 0 }, { x: 2725, r: 120, period: 7, on: 2.4, ph: 3 }],
  pump: { x: 3830 },
  part: { x: 3700, id: 'hydroponics', name: 'PUMP IMPELLER' },
  exit: { x: 3990 },
  captions: [
    { on: 'hydStart', text: 'Wind the wheel to pump water.' },
    { on: 'hydFaster', text: 'Trot-trot-trot!' },
    { on: 'hydWet', text: 'Yikes! Water! Catbot needs the raft to stay up!' },
    { on: 'hydDrain', text: 'Please stay up! Catbot needs to run!' },
    { on: 'hydFar', text: 'Need... zoomies... to... move... faster...', dur: 5 },
    { on: 'hydSniff', text: 'Sniff-sniff... mrrrow? Hold still and take a whiff.' },
    { on: 'hydNip', text: 'Oh-ho! Catnip! 🪴' },
    { on: 'hydFlop', text: 'Worth it.' },
    { on: 'hydWait', text: 'Wait in the wheel for the puff. Prrrfectly positioned zoomies! 🏎️', dur: 5 },
    { on: 'hydFixed', text: 'Finally! Catbot saved the zoomies!', dur: 5 }
  ]
});
{
  const R = ROOMS[ROOMS.length - 1];
  R.socket = { x: R.pump.x, y: GY - 122 };
  R.noCart = [[R.wheels[0].x - 80, R.part.x - 60]];       // the trolley keeps to the start apron and the pump end
  R.rail = [[0, R.wheels[0].x - 90], [R.part.x - 50, R.w]];
}

window.HYD = (function () {
  const layout = ROOMS.find(r => r.id === 'hydroponics');
  const mine = () => !!room && !!room.hyd;
  const live = () => mine() && !inHub();
  const DT = 1 / 60, ACC = 260, ZACC = 520, TURN = .25, NOSE = 88, PAW = 62, MAXL = 1.5;
  const approach = (v, t, d) => v + clamp(t - v, -d, d);

  function fresh(def) {
    return {
      t: 0,
      wheels: def.wheels.map(() => ({ level: 0, released: false, spin: 0, eng: false, on: 0 })),
      troughs: def.troughs.map(() => ({ up: false, side: 0 })),
      zoom: 0, flop: 0, cool: 0, sniff: 0, nips: 0, soggy: 0, hop: null, walkInWheel: 0,
      cat: { x: def.start.x, vx: 0, face: def.start.face || 1, walkT: 0, sprint: 0, turn: 0, air: 0 },
      got: false, gotT: -1, done: false
    };
  }
  const copy = w => JSON.parse(JSON.stringify(w));
  const wheelOf = (def, i) => def.wheels.findIndex(wh => wh.feeds.includes(i));
  const levelOf = (w, def, i) => w.wheels[wheelOf(def, i)].level;
  const inWheel = (x, wh) => x > wh.x + 18 && x < wh.x + wh.w - 18;
  const holdX = wh => wh.x + wh.w / 2;
  // a catnip puff's radius at room time t (0 between puffs)
  function cloudR(n, t) { const u = ((t + n.ph) % n.period + n.period) % n.period; return u < n.on ? n.r * smooth(u / .5) * (1 - seg(u, n.on - .4, n.on)) : 0; }

  /* ---------- the rules. Pure: fed catbot as {x, vx, face, air} ---------- */
  function stepRules(w, def, dt, cat) {
    const ev = [], H = def.hyd;
    w.t += dt;
    // the zoomies, then the flop, then a short cooldown before catnip works again
    if (w.zoom > 0) { w.zoom -= dt; if (w.zoom <= 0) { w.zoom = 0; w.flop = H.flopT; ev.push({ k: 'flop', x: cat.x }); } }
    else if (w.flop > 0) { w.flop -= dt; if (w.flop <= 0) { w.flop = 0; w.cool = 1.5; ev.push({ k: 'up', x: cat.x }); } }
    else if (w.cool > 0) w.cool = Math.max(0, w.cool - dt);
    // catnip: standing still (a sniff) inside a puff for 0.4 s
    let inPuff = -1;
    def.nips.forEach((n, i) => { const r = cloudR(n, w.t); if (r > 10 && Math.abs(cat.x - n.x) < r * .85) inPuff = i; });
    if (inPuff >= 0 && !cat.air && Math.abs(cat.vx) < 25 && !w.zoom && !w.flop && !w.cool) {
      w.sniff += dt; if (w.sniff >= .4) { w.sniff = 0; w.zoom = H.zoomT; w.nips++; ev.push({ k: 'zoom', i: inPuff, x: cat.x }); }
    } else w.sniff = 0;
    // wheels and pumps: running right inside a wheel pumps toward the pace's share of a trot; the clutch lets go
    // once the level is as high as that pace can take it and at least deck level. Leaving the wheel re-arms the clutch.
    def.wheels.forEach((wh, i) => {
      const s = w.wheels[i], inside = inWheel(cat.x, wh);
      if (!inside && s.released) s.released = false;
      const eng = inside && !s.released && cat.face > 0 && !cat.air;
      s.eng = eng;
      const pace = eng ? Math.max(0, cat.vx) : 0, target = Math.min(MAXL, pace / GAIT.trot);
      if (eng && pace > 20) {
        s.level = s.level < target ? Math.min(target, s.level + H.fill * dt) : Math.max(target, s.level - H.drain * dt);
        if (s.level >= .97 && s.level >= target - .03 && target >= .97) { s.released = true; ev.push({ k: 'release', i, x: holdX(wh), level: s.level }); }
      } else s.level = Math.max(0, s.level - H.drain * dt);
      if (w.got) s.level = Math.max(s.level, 1.2);           // repaired: the main pump keeps every trough full (a revisit walks straight across)
      s.spin += (eng ? pace : (s.released && inside ? cat.vx : 0) * .3) * dt / 80;
      s.on = eng && pace > 20 ? 1 : 0;
    });
    // troughs: the raft is at deck height while its pump's level is at `ok`; a cat on a raft that sinks hops back
    def.troughs.forEach((tr, i) => {
      const s = w.troughs[i], lvl = levelOf(w, def, i), up = lvl >= H.ok;
      if (up && !s.up) ev.push({ k: 'raftUp', i, x: (tr.x0 + tr.x1) / 2 });
      if (!up && s.up) ev.push({ k: 'raftDown', i, x: (tr.x0 + tr.x1) / 2 });
      s.up = up;
      if (cat.x < tr.x0) s.side = -1; else if (cat.x > tr.x1) s.side = 1;
      if (!up && !cat.air && cat.x > tr.x0 + 4 && cat.x < tr.x1 - 4 && w.soggy <= 0) {
        const to = s.side < 0 ? tr.x0 - 74 : tr.x1 + 74;
        w.soggy = .9; ev.push({ k: 'soggy', i, x: cat.x, to });
      }
    });
    if (w.soggy > 0) w.soggy = Math.max(0, w.soggy - dt);
    return ev;
  }

  /* ---------- the bot's catbot: the rig's walk, plus what this room does to it ---------- */
  function blocksFor(w, def, cx) {
    const b = [{ x0: -1e4, x1: 16, clr: NOSE }];
    def.troughs.forEach((tr, i) => { if (!w.troughs[i].up && !(cx > tr.x0 && cx < tr.x1)) b.push({ x0: tr.x0, x1: tr.x1, clr: PAW }); });
    if (def.exit && !w.got) b.push({ x0: def.exit.x + 10, x1: def.exit.x + 30, clr: NOSE });
    return b;
  }
  function stepCat(w, def, dt, inp) {
    const c = w.cat, H = def.hyd;
    if (c.air > 0) { c.air -= dt; c.x += c.vx * dt; if (c.air <= 0) { c.air = 0; c.vx = 0; } return; }   // the soggy hop
    let dir = inp.dir || 0;
    if (w.flop > 0) dir = 0;
    const acc = (w.zoom > 0 || w.flop > 0 ? ZACC : ACC) * dt;
    if (dir && dir !== c.face) {
      c.vx = approach(c.vx, 0, acc); c.walkT = 0; c.sprint = 0;
      if (Math.abs(c.vx) < 25) { c.turn += dt; if (c.turn >= TURN) { c.face = dir; c.turn = 0; } }
    } else {
      c.turn = 0;
      if (dir) { c.walkT += dt; if (inp.doubleTap) c.sprint = dir; } else { c.walkT = 0; c.sprint = 0; }
      let max = dir ? (c.walkT >= GAIT.hold || c.sprint === dir ? GAIT.trot : GAIT.walk) : 0;
      if (dir && w.zoom > 0) max = H.zoom;
      c.vx = approach(c.vx, dir * max, acc);
    }
    // a wheel engaged holds catbot on the spot (the floor runs back under its feet at its own pace)
    const wi = def.wheels.findIndex((wh, i) => w.wheels[i].eng);
    if (wi >= 0) { const hx = holdX(def.wheels[wi]); c.x = approach(c.x, hx, 400 * dt) + 0 * c.vx; }
    else c.x += c.vx * dt;
    for (const b of blocksFor(w, def, c.x)) {
      if (b.x0 > c.x - 1) { const lim = b.x0 - b.clr; if (c.x > lim) { c.x = lim; if (c.vx > 0) c.vx = 0; } }
      else if (b.x1 < c.x + 1) { const lim = b.x1 + b.clr; if (c.x < lim) { c.x = lim; if (c.vx < 0) c.vx = 0; } }
    }
  }
  function botPart(w, def) {
    const p = def.part, d = p.x - w.cat.x;
    if (!w.got && w.gotT < 0 && !w.flop && Math.sign(d) === w.cat.face && Math.abs(d) < 190 && Math.abs(d) > 40) w.gotT = w.t;
    if (w.gotT >= 0 && !w.got && w.t - w.gotT > 2.1) w.got = true;
  }
  function botStep(w, def, inp) {
    if (w.gotT >= 0 && !w.got) inp = { dir: 0 };
    stepCat(w, def, DT, inp);
    const ev = stepRules(w, def, DT, w.cat);
    for (const e of ev) if (e.k === 'soggy') { const c = w.cat; c.air = .45; c.vx = (e.to - c.x) / .45; c.walkT = 0; c.sprint = 0; }
    botPart(w, def);
    if (w.got && w.cat.x > def.exit.x + 64) w.done = true;
    return ev;
  }

  /* ---------- bot brains ---------- */
  function botInput(w, def, brain) {
    const c = w.cat;
    if (w.flop > 0 || c.air > 0) return { dir: 0 };
    const k = def.troughs.findIndex(tr => c.x < tr.x1 + 30);
    if (k < 0) { // past the last trough: the part, then the hatch
      if (!w.got) { if (w.gotT >= 0) return { dir: 0 }; return { dir: c.x < def.part.x - 120 ? 1 : 0 }; }
      return { dir: 1 };
    }
    const tr = def.troughs[k], wi = wheelOf(def, k), wh = def.wheels[wi], s = w.wheels[wi], ts = w.troughs[k];
    if (brain.k !== k) { brain.k = k; brain.ph = null; }
    const nip = def.nips.find(n => Math.abs(n.x - holdX(wh)) < 600 && n.x < tr.x0);
    // on the far side of the trough's near bank: if the raft is up (or we're on it), go
    if (c.x > wh.x + wh.w) {
      if (ts.up || c.x > tr.x0) return { dir: 1, doubleTap: w.zoom <= 0 };
      // stuck at a sunk trough: back to the wheel (from its left, facing right)
      brain.ph = 'back';
    }
    if (brain.ph === 'back') { if (c.x > wh.x - 30) return { dir: -1 }; if (Math.abs(c.vx) > 3) return { dir: 0 }; brain.ph = null; }
    // the catnip plan: a puff before the wheel (stop and sniff in it), or one over the wheel (tick over in the wheel and wait)
    if (tr.need === 'nip' && w.zoom <= 0) {
      if (nip && nip.x < wh.x - 40) {
        if (c.x < wh.x - 20) { if (Math.abs(c.x - nip.x) > 12) return { dir: c.x < nip.x ? 1 : -1 }; return { dir: 0 }; }
        // already in or past the wheel without the zoomies: go back for them
        if (inWheel(c.x, wh) || c.x > wh.x) { brain.ph = 'back'; return { dir: -1 }; }
      } else if (nip) {
        // over the wheel: stand still inside it until the puff comes (standing still doesn't pump, and doesn't release)
        if (c.x < holdX(wh) - 8) return { dir: 1 };
        return { dir: 0 };
      }
    }
    // in the wheel: run (the zoomies or a trot) until the clutch lets go
    return { dir: 1, doubleTap: w.zoom <= 0 };
  }
  const STRATS = {
    idle: () => ({ dir: 0 }),
    walker: (w, def, b) => { b.n = (b.n || 0) + 1; return { dir: b.n % 84 === 0 ? 0 : 1 }; },
    trotter: () => ({ dir: 1, doubleTap: true }),
    smart: botInput
  };
  function simulate(strategy, opt = {}) {
    const def = opt.def || layout, w = opt.world ? copy(opt.world) : fresh(def), brain = opt.brain || {}, f = STRATS[strategy];
    const max = opt.max || 240; let n = 0, soggy = 0, zooms = 0, flops = 0, rel = [];
    while (!w.done && n < max * 60) { for (const e of botStep(w, def, f(w, def, brain))) { if (e.k === 'soggy') soggy++; if (e.k === 'zoom') zooms++; if (e.k === 'flop') flops++; if (e.k === 'release') rel.push(+e.level.toFixed(2)); } n++; }
    return { finished: w.done, time: +(n / 60).toFixed(2), soggy, zooms, flops, releases: rel.slice(0, 12), x: Math.round(w.cat.x), got: w.got, world: w };
  }
  function explore(def = layout, n = 60, seed = 0x4d1b7a2) {
    let s = seed >>> 0; const rr = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    let worst = 0; const fails = [];
    for (let i = 0; i < n; i++) {
      const w = fresh(def), brain = {}; let d = 0, hold = 0;
      const steps = Math.floor(rr() * 60 * 80);
      for (let k = 0; k < steps && !w.done; k++) {
        if (hold-- <= 0) { d = [-1, 0, 1, 1, 1][Math.floor(rr() * 5)]; hold = Math.floor(rr() * 150); }
        botStep(w, def, rr() < .5 ? botInput(w, def, brain) : { dir: d, doubleTap: rr() < .2 });
      }
      const r = simulate('smart', { def, world: w, max: 200 });
      if (!r.finished) fails.push({ i, x: Math.round(w.cat.x) }); else worst = Math.max(worst, r.time);
    }
    return { states: n, recovered: n - fails.length, worst: +worst.toFixed(1), fails, seed: '0x' + seed.toString(16) };
  }
  // derived windows: how long each raft stays up after the clutch lets go at a trot and with the zoomies, and how long the run to its far bank takes
  function timings(def = layout) {
    const H = def.hyd;
    return def.troughs.map((tr, i) => {
      const wh = def.wheels[wheelOf(def, i)], dist = tr.x1 + 30 - holdX(wh);
      const win = l => +((l - H.ok) / H.drain).toFixed(2);
      return { trough: i + 1, dist: Math.round(dist), trot: { window: win(1), run: +(dist / GAIT.trot).toFixed(2), ok: dist / GAIT.trot < win(1) }, zoom: { window: win(H.zoom / GAIT.trot), run: +(dist / H.zoom).toFixed(2) } };
    });
  }
  function selfTest() {
    const def = layout, lines = [], ok = (c, m) => { lines.push((c ? 'PASS ' : 'FAIL ') + m); return c; };
    const bots = {};
    for (const k of ['idle', 'walker', 'trotter', 'smart']) { const r = simulate(k); delete r.world; bots[k] = r; console.log('[HYD] BOT', k, JSON.stringify(r)); }
    ok(!bots.idle.finished && bots.idle.zooms === 0 && bots.idle.releases.length === 0, 'idle: nothing happens');
    ok(!bots.walker.finished && bots.walker.releases.length === 0 && bots.walker.x < def.troughs[0].x0, `walker (never trots): the clutch never lets go; stuck at the first wheel (x ${bots.walker.x})`);
    ok(!bots.trotter.finished && bots.trotter.zooms === 0 && bots.trotter.x < def.troughs[1].x1, `trotter (holds right): no catnip (it never stops to sniff), past trough 1, stuck at trough 2 (x ${bots.trotter.x}, ${bots.trotter.soggy} soggy)`);
    ok(bots.smart.finished && bots.smart.time <= 150, `smart: finishes within 150 s (${bots.smart.time} s, ${bots.smart.zooms} zoomies, ${bots.smart.soggy} soggy)`);
    if (bots.smart.time < 45) lines.push(`NOTE perfect play takes ${bots.smart.time} s (unverified by a person)`);
    const tab = timings(def); console.log('[HYD] TIMINGS', JSON.stringify(tab));
    ok(tab[0].trot.ok, 'trough 1 can be crossed at a trot after the clutch lets go');
    ok(!tab[1].trot.ok && !tab[2].trot.ok, 'troughs 2 and 3 cannot be crossed on a trot\'s fill alone (they need the zoomies)');
    ok(bots.smart.zooms >= 2, 'smart uses the catnip for troughs 2 and 3');
    const ex = explore(def); console.log('[HYD] EXPLORER', JSON.stringify(ex));
    ok(ex.fails.length === 0, `explorer: from every state random play reached, the smart bot still finishes (${ex.recovered}/${ex.states}, worst ${ex.worst} s, seed ${ex.seed})`);
    // a sunk raft never strands catbot: from on each trough with its raft sinking, the hop lands on the side it came from, on dry deck
    for (let i = 0; i < def.troughs.length; i++) {
      const tr = def.troughs[i], w = fresh(def), wi = wheelOf(def, i);
      w.wheels[wi].level = def.hyd.ok + .01; w.troughs[i].up = true; w.troughs[i].side = -1;
      Object.assign(w.cat, { x: (tr.x0 + tr.x1) / 2, face: 1 });
      for (let n = 0; n < 120; n++) botStep(w, def, { dir: 0 });
      ok(w.cat.x < tr.x0 - PAW + 1 && !w.cat.air, `trough ${i + 1}: a raft sinking under catbot hops it back to the near bank (x ${Math.round(w.cat.x)})`);
    }
    { const b = blocksFor(fresh(def), def, def.start.x); ok(b.some(e => e.x0 === def.exit.x + 10), 'the hatch stays shut until the part is in'); }
    ok(def.noCart[0][0] > def.start.x && def.noCart[0][1] < def.exit.x, `the trolley has the start apron (x ${def.start.x}) and the pump end (x ${def.exit.x})`);
    { const a = JSON.stringify(fresh(def)); simulate('smart'); ok(a === JSON.stringify(fresh(def)), 'fresh() is a clean state (reset() uses it)'); }
    ok(def.wheels.every((wh, i) => wh.x + wh.w < def.troughs[i].x0), 'every wheel sits before the trough it fills (always on the near bank)');
    const pass = lines.every(l => !l.startsWith('FAIL'));
    for (const l of lines) console.log('[HYD]', l);
    return { pass, lines, bots, explorer: ex, timings: tab };
  }

  /* =====================================================================
     LIVE
     ===================================================================== */
  let state = fresh(layout), remainder = 0, fx = { t: 0, light: 0, perk: 0, tick: [0, 0, 0], drops: [], pump: 0, puffSnd: [] }, prevRelease = [];
  function reset() {
    if (!mine()) return;
    state = fresh(room); remainder = 0; fx.drops = []; fx.light = 0; fx.perk = 0; fx.puffSnd = room.nips.map(() => -1);
    if (installed.has(room.part.id)) { state.got = true; fx.light = 1; fx.perk = 1; }
  }
  const catNow = () => ({ x: rig.x, vx: rig.vx, face: rig.facing, air: rig.air });
  function update(dt, c, inputDir) {
    if (!live()) return;
    fx.t += dt;
    if (st.got && !state.got) { state.got = true; sfx('hydPumpRun', { x: room.pump.x }); caption('hydFixed'); console.log('%cHYDROPONICS · the pump catches (Claude Opus 5.5 in Claude Cowork)', 'color:#9ef0b0'); }
    if (state.got) { fx.light = Math.min(1, fx.light + dt / 2); fx.perk = Math.min(1, fx.perk + dt / 3); }
    const play = mode === 'play';
    if (!play && mode !== 'pounce' && mode !== 'exit') return;
    if (rig.x > room.wheels[0].x - 200) caption('hydStart');
    remainder += dt;
    const ev = [];
    while (remainder >= DT) { ev.push(...stepRules(state, room, DT, catNow())); remainder -= DT; }
    for (const e of ev) onEvent(e);
    if (!play) return;
    // what the room does to the walk: the zoomies, the flop, the wheel
    if (state.zoom > 0) {
      if (c.vx) c.vx = Math.sign(c.vx) * room.hyd.zoom;
      Object.assign(c, { accel: ZACC, earL: 34, earR: 30, pupil: 1, lid: 0, tailBase: 120, tailCurve: -8, tailTip: -14, wagAmp: 14, wagFreq: 5, mouth: .5, lookY: -.2 });
      if (Math.random() < dt * 12) puffMote(rig.x + rnd(-40, 40), GY - rig.fl - rnd(20, 70), true);
    } else if (state.flop > 0) {
      const k = 1 - state.flop / room.hyd.flopT;
      Object.assign(c, { vx: 0, accel: ZACC, colF: .85, colH: .7, headDrop: 26, happy: 1, lid: .5, tailBase: 200, tailCurve: 3, wagAmp: 10, wagFreq: 1.4, earL: 20, earR: 26, mouth: .9, keySpin: 2, limp: 0 });
      if (k < .1) rig.hOy.vel += 4;
    }
    const wi = room.wheels.findIndex((wh, i) => state.wheels[i].eng);
    if (wi >= 0) {
      const wh = room.wheels[wi], s = state.wheels[wi];
      c.belt = -rig.vx - (rig.x - holdX(wh)) * 6;          // the floor runs back under its feet at its own pace
      if (s.level >= .55 && s.level < .9 && Math.abs(rig.vx) < 130 && rig.vx > 20) { state.walkInWheel += dt; if (state.walkInWheel > 1.4) caption('hydFaster'); } else state.walkInWheel = 0;
      // a ratchet tick per spoke, faster as it spins (twin: the spokes)
      fx.tick[wi] -= dt * Math.max(0, rig.vx) / 60; if (fx.tick[wi] <= 0) { fx.tick[wi] = 1; sfx('hydWheel', { x: holdX(wh), mag: .4 + .6 * Math.min(1.3, rig.vx / 165), rate: .9 + .3 * rig.vx / 165 }); }
    }
    // the second puff hangs over its wheel: say so the first time catbot runs it without the zoomies and the raft won't hold
    if (state.nips === 0 && rig.x > room.nips[0].x - 260 && rig.x < room.wheels[1].x) caption('hydSniff');
  }
  function onEvent(e) {
    if (e.k === 'release') { sfx('hydClutch', { x: e.x }); FX.sparks(e.x, GY - 30, 4, 1, .4); caption('hydDrain'); }
    else if (e.k === 'raftUp') { sfx('hydRaft', { x: e.x }); splash(e.x, 6); }
    else if (e.k === 'raftDown') { sfx('hydRaft', { x: e.x, rate: .8, mag: .6 }); }
    else if (e.k === 'soggy') {
      const d = Math.sign(e.to - rig.x) || -1, P = Math.max(40, Math.abs(e.to - rig.x)), vx = (-.23 + Math.sqrt(.0529 + .004 * P)) / .002;
      if (rig.facing !== d && rig.turnT < 0) { /* it hops back the way it faces away: a startle, not a turn */ }
      rig.jump(330, d * vx); st.oops = 0;
      rig.earL.vel -= 18; rig.earR.vel -= 16; rig.hOy.vel -= 30; rig.tailFlick(6);
      sfx('hydSplash', { x: e.x }); splash(e.x, 14); shake = Math.max(shake, 2 * calmK());
      caption('hydWet');
      if (e.i > 0 && state.nips === 0) caption('hydFar');
      if (e.i === 2) caption('hydWait');
    }
    else if (e.k === 'zoom') { sfx('hydZoom', { x: e.x }); for (let i = 0; i < 10; i++) puffMote(e.x + rnd(-50, 50), GY - rnd(10, 80), true); caption('hydNip'); rig.earL.vel -= 20; rig.earR.vel -= 20; rig.tailFlick(6); }
    else if (e.k === 'flop') { sfx('hydFlop', { x: e.x }); FX.dust(e.x, GY - rig.fl, 6, .6); caption('hydFlop'); }
  }
  function splash(x, n) { for (let i = 0; i < n; i++) fx.drops.push({ x: x + rnd(-30, 30), y: GY - 18, vx: rnd(-60, 60), vy: -rnd(80, 220), life: 0, max: rnd(.4, .8) }); }
  function puffMote(x, y, big) { fx.drops.push({ x, y, vx: rnd(-20, 20), vy: -rnd(10, 40), life: 0, max: rnd(.8, 1.6), nip: true, r: big ? rnd(1.5, 3) : 1.2 }); }
  // no rig event needs changing here: footsteps on the raft are the deck's
  const ev = () => false;
  const blocks = () => {
    if (!live()) return [];
    const b = []; room.troughs.forEach((tr, i) => { if (!state.troughs[i].up && !(rig.x > tr.x0 && rig.x < tr.x1)) b.push({ x0: tr.x0, x1: tr.x1, clr: CAT.paw }); });
    return b;
  };
  let pumpT = 0;
  function audio(dt) {
    if (!live() || mode === 'card' || mode === 'rewind') return;
    // the pump gurgles while a wheel is filling (twin: the water rising in its trough)
    pumpT -= dt;
    if (pumpT <= 0) {
      pumpT = .45;
      room.wheels.forEach((wh, i) => { const s = state.wheels[i]; if (s.on) sfx('hydPump', { x: holdX(wh) + 200, mag: .4 + .5 * Math.min(1, s.level), rate: .8 + .4 * s.level }); });
      if (state.got) { const d = Math.abs(rig.x - room.pump.x); if (d < 900 && Math.random() < .35) sfx('hydPumpRun', { x: room.pump.x, mag: .3 * (1 - d / 900), rate: 1.2 }); }
    }
    // a puff, heard as it blooms (twin: the cloud)
    room.nips.forEach((n, i) => { const r = cloudR(n, state.t); if (r > 5 && fx.puffSnd[i] <= 0 && Math.abs(rig.x - n.x) < 900) sfx('hydPuff', { x: n.x, mag: .7 }); fx.puffSnd[i] = r; });
  }

  /* =====================================================================
     DRAW. A grow bay: magenta grow light over everything until the pump is
     fixed (then white), planters along the back wall, troughs with rafts that
     ride the water, the wheels, the catnip planters with their puffs. No
     ctx.filter; plants are a few hashed strokes each. STEADY stills the
     sway and the mist, never a puff (that's the game).
     ===================================================================== */
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const inView = (x0, x1 = x0) => x1 > camX - 120 && x0 < camX + W / zoom + 120;
  function plant(g, x, y, s, t, kind, perk) {
    const sway = settings.calm ? 0 : Math.sin(t * 1.1 + x * .03) * .08, droop = 1 - perk;
    g.save(); g.translate(x, y);
    const n = kind === 'nip' ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * .38 + sway + droop * (i < n / 2 ? -.35 : .35), L = s * (16 + 10 * hh(x + i)) * (1 - .25 * droop);
      g.strokeStyle = kind === 'nip' ? '#5d9a4a' : '#3f8a4c'; g.lineWidth = 1.4;
      const ex = Math.cos(a) * L, ey = Math.sin(a) * L;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ex * .4, ey * .7, ex, ey); g.stroke();
      g.fillStyle = kind === 'nip' ? '#8cc56a' : (i % 2 ? '#4fae5c' : '#3c9450');
      g.beginPath(); g.ellipse(ex, ey, kind === 'nip' ? 5 * s : 6 * s, 2.6 * s, a, 0, TAU); g.fill();
    }
    if (kind === 'nip') { g.fillStyle = 'rgba(214,190,255,.8)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-6 + i * 6, -s * 24 - (i % 2) * 4, 1.8, 0, TAU); g.fill(); } }
    g.restore();
  }
  function deck(g, t) {
    if (!live()) return;
    const R = room, x0 = camX - 10, x1 = camX + W / zoom + 10;
    // planter shelves on the back wall: two tiers, ends of each run lit by grow lamps
    for (const [y, step] of [[GY - 150, 90], [GY - 70, 70]]) {
      for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
        g.fillStyle = '#2c2f33'; g.fillRect(x + 4, y, step - 8, 12); g.fillStyle = 'rgba(214,165,78,.25)'; g.fillRect(x + 4, y, step - 8, 1.5);
        plant(g, x + step / 2, y, .8 + .2 * hh(x), t, 'leaf', .6 + .4 * fx.perk);
      }
      g.fillStyle = '#1f2226'; g.fillRect(x0, y + 12, x1 - x0, 3);
    }
    // the grow lamp tubes along the top, magenta until the pump is fixed
    const lc = mixRGB([255, 80, 210], [255, 248, 230], fx.light);
    g.fillStyle = `rgb(${lc})`; for (let x = Math.floor(x0 / 260) * 260 + 30; x < x1; x += 260) { g.fillRect(x, GY - 232, 180, 5); g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, x + 90, GY - 228, 120, 18, .25, lc); g.restore(); }
    g.save(); g.font = '600 12px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.24)';
    for (let x = Math.floor((camX - 100) / 1100) * 1100 + 1220; x < camX + W + 100; x += 1100) g.fillText('HYDROPONICS  ·  KEEP PAWS OUT OF THE TROUGHS', x, GY - 186);   // clear of the hull's CATBOT livery at the start
    g.restore();
    drawPump(g, t);
    R.nips.forEach((n, i) => drawNipPlanter(g, t, n, i));
    R.troughs.forEach((tr, i) => drawTrough(g, t, tr, i));
    R.wheels.forEach((wh, i) => drawWheel(g, t, wh, i, 'back'));
  }
  function mixRGB(a, b, k) { return a.map((v, i) => Math.round(lerp(v, b[i], k))).join(','); }
  function drawTrough(g, t, tr, i) {
    if (!inView(tr.x0, tr.x1)) return;
    const s = state.troughs[i], lvl = clamp(levelOf(state, room, i), 0, MAXL), w = tr.x1 - tr.x0;
    // the gap: a dark tank cut into the deck, the water at its level (deck height at `ok`, a little over when overcharged)
    const depth = 64, k = clamp(lvl / room.hyd.ok, 0, 1), water = GY + depth - (depth + 2) * k - (lvl > room.hyd.ok ? (lvl - room.hyd.ok) * 6 : 0);
    g.fillStyle = '#0b0e12'; g.fillRect(tr.x0, GY - 24, w, depth + 24);
    g.fillStyle = '#1a1f25'; g.fillRect(tr.x0, GY - 24, 4, depth + 24); g.fillRect(tr.x1 - 4, GY - 24, 4, depth + 24);
    const wg = g.createLinearGradient(0, water, 0, GY + depth); wg.addColorStop(0, 'rgba(90,170,200,.75)'); wg.addColorStop(1, 'rgba(20,50,70,.9)');
    g.fillStyle = wg; g.fillRect(tr.x0 + 4, water, w - 8, GY + depth - water);
    g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 1; g.beginPath();
    for (let x = tr.x0 + 4; x <= tr.x1 - 4; x += 6) g.lineTo(x, water + (settings.calm ? 0 : Math.sin(t * 3 + x * .12) * 1.2)); g.stroke();
    // the raft: a planter tray riding the water, with seedlings
    const ry = Math.min(water, GY + depth - 6) - 6, up = s.up;
    g.fillStyle = up ? '#8a6a3e' : '#6e5532'; g.fillRect(tr.x0 + 8, ry - 16, w - 16, 16); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(tr.x0 + 8, ry - 16, w - 16, 16);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = tr.x0 + 20; x < tr.x1 - 16; x += 24) g.fillRect(x, ry - 14, 2, 12);
    for (let x = tr.x0 + 26; x < tr.x1 - 18; x += 34) plant(g, x, ry - 16, .5, t, 'leaf', .7 + .3 * fx.perk);
    // the level gauge on the near post: the deck mark, and the level
    const gx = tr.x0 - 16, gy0 = GY - 140, gh = 100, lk = clamp(lvl / MAXL, 0, 1);
    g.fillStyle = '#14171c'; g.fillRect(gx - 5, gy0, 10, gh); g.fillStyle = up ? 'rgba(120,210,240,.9)' : 'rgba(90,140,170,.7)'; g.fillRect(gx - 4, gy0 + gh * (1 - lk), 8, gh * lk);
    const okY = gy0 + gh * (1 - room.hyd.ok / MAXL); g.fillStyle = '#d6a54e'; g.fillRect(gx - 8, okY - 1, 16, 2);
    g.strokeStyle = OL; g.strokeRect(gx - 5, gy0, 10, gh);
    g.save(); g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText('DECK', gx + 9, okY + 3); g.restore();
  }
  function drawWheel(g, t, wh, i, layer) {
    const cx = holdX(wh), R = 82, cy = GY - R - 2;
    if (!inView(cx - R, cx + R)) return;
    const s = state.wheels[i], a = s.spin;
    if (layer === 'back') {
      // the stand and the pipe to its trough's pump
      g.fillStyle = '#2d3239'; g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx - 46, GY - 24); g.lineTo(cx - 36, GY - 24); g.lineTo(cx, cy + 10); g.lineTo(cx + 36, GY - 24); g.lineTo(cx + 46, GY - 24); g.lineTo(cx + 10, cy); g.closePath(); g.fill();
      const tr = room.troughs[wh.feeds[0]];
      g.strokeStyle = '#3d5560'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 20, cy); g.lineTo(cx + 20, GY - 40); g.lineTo(tr.x0 + 30, GY - 40); g.stroke();
      g.strokeStyle = s.on ? 'rgba(140,220,255,.7)' : 'rgba(120,170,190,.25)'; g.lineWidth = 1.5; g.setLineDash([6, 6]); g.lineDashOffset = -fx.t * 40 * s.on; g.beginPath(); g.moveTo(cx + 20, GY - 40); g.lineTo(tr.x0 + 30, GY - 40); g.stroke(); g.setLineDash([]);
      // the far rim and spokes
      g.strokeStyle = '#6d747d'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R - 4, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(141,147,155,.7)'; g.lineWidth = 1.5;
      for (let k = 0; k < 10; k++) { const q = a + k / 10 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(q) * (R - 4), cy + Math.sin(q) * (R - 4)); g.stroke(); }
      g.fillStyle = '#8d939b'; g.beginPath(); g.arc(cx, cy, 7, 0, TAU); g.fill();
      // the running surface: slats across the bottom, moving with the spin
      g.strokeStyle = 'rgba(30,30,30,.6)'; g.lineWidth = 2;
      for (let k = 0; k < 24; k++) { const q = a + k / 24 * TAU; if (Math.sin(q) < .55) continue; g.beginPath(); g.moveTo(cx + Math.cos(q) * (R - 2), cy + Math.sin(q) * (R - 2)); g.lineTo(cx + Math.cos(q) * (R + 4), cy + Math.sin(q) * (R + 4)); g.stroke(); }
      // the clutch lamp: amber while it holds, green as it lets go
      g.fillStyle = s.released ? '#7bd88f' : s.on ? '#ffb35a' : '#5a5045'; g.beginPath(); g.arc(cx, cy - R - 10, 4, 0, TAU); g.fill();
      return;
    }
    // the near rim, in front of catbot
    g.strokeStyle = '#a4abb4'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R + 2, 0, TAU); g.stroke();
    g.strokeStyle = OL; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R + 4.5, 0, TAU); g.stroke();
  }
  function drawNipPlanter(g, t, n, i) {
    if (!inView(n.x - 140, n.x + 140)) return;
    // a planter at the back of the deck; the catnip plant looks a little different (paler, with lilac flowers)
    g.fillStyle = '#3a3226'; g.fillRect(n.x - 30, GY - 46, 60, 22); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(n.x - 30, GY - 46, 60, 22);
    plant(g, n.x, GY - 46, 1.15, t, 'nip', 1);
    g.save(); g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.45)'; g.fillText('NEPETA · DO NOT', n.x - 28, GY - 50 - 34); g.restore();
  }
  function drawPump(g, t) {
    const x = room.pump.x, y = GY - 122; if (!inView(x - 90, x + 90)) return;
    g.fillStyle = '#2b3038'; g.fillRect(x - 64, y - 60, 128, 150); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x - 64, y - 60, 128, 150);
    g.fillStyle = '#3d5560'; g.fillRect(x - 90, y + 50, 26, 10); g.fillRect(x + 64, y + 50, 40, 10);
    g.save(); g.translate(x, y); g.fillStyle = '#20262c'; g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fill();
    g.strokeStyle = '#8d939b'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.stroke();
    if (st.got) disc(g, 0, 0, 16, NEAR, fx.t * 8, false);
    else { g.setLineDash([4, 4]); g.strokeStyle = 'rgba(214,165,78,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke(); g.setLineDash([]); }
    g.restore();
    g.save(); g.font = '600 9px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText(st.got ? 'MAIN PUMP  ·  RUNNING' : 'MAIN PUMP  ·  IMPELLER MISSING', x - 62, y - 68); g.restore();
  }
  function front(g, t) {
    if (!live()) return;
    room.wheels.forEach((wh, i) => drawWheel(g, t, wh, i, 'front'));
    // catnip puffs: a soft lilac cloud that blooms and fades, with motes
    room.nips.forEach(n => {
      const r = cloudR(n, state.t); if (r < 4 || !inView(n.x - r, n.x + r)) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      softEllipse(g, n.x, GY - 40, r, r * .45, .22, '200,170,255');
      softEllipse(g, n.x, GY - 30, r * .6, r * .3, .18, '180,255,190');
      g.restore();
      if (Math.random() < .5) puffMote(n.x + rnd(-r, r) * .8, GY - rnd(10, 70), false);
    });
    // droplets and motes
    for (let i = fx.drops.length - 1; i >= 0; i--) {
      const d = fx.drops[i]; d.life += 1 / 60; if (d.life > d.max) { fx.drops.splice(i, 1); continue; }
      if (d.nip) { d.x += d.vx / 60; d.y += d.vy / 60; g.fillStyle = `rgba(220,200,255,${.7 * (1 - d.life / d.max)})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill(); }
      else { d.vy += 900 / 60; d.x += d.vx / 60; d.y += d.vy / 60; g.fillStyle = `rgba(170,220,255,${.8 * (1 - d.life / d.max)})`; g.fillRect(d.x, d.y, 2, 3); }
    }
    if (fx.drops.length > 300) fx.drops.splice(0, fx.drops.length - 300);
    // the grow light's tint over the whole bay, magenta until the pump is fixed (STEADY: no flicker either way)
    g.save(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(255,60,200,${.10 * (1 - fx.light)})`; g.fillRect(camX - 10, -200, W / zoom + 20, H + 400);
    g.restore();
    // after the repair: mist from the sprinklers drifting down in the light
    if (state.got && !settings.calm && Math.random() < .4) fx.drops.push({ x: camX + rnd(0, W), y: GY - 230, vx: rnd(-8, 8), vy: rnd(20, 50), life: 0, max: 2.5, nip: true, r: .9 });
  }

  /* =====================================================================
     LIVE TEST (&verify): the smart bot's choices through the real loop by
     keys and taps (the bot reads the live world), STEADY off and on; then
     isolation: in every other room, every hook does nothing.
     ===================================================================== */
  function liveTest() {
    if (!mine()) return { pass: false, reason: 'load the hydroponics first' };
    const saved = { settings: { ...settings }, storage: localStorage.getItem('catbot.settings'), parts: [...installed], run: { ...run }, caps: [...seenCaps], T };
    const runs = [], shots = {};
    try {
      for (const steady of [false, true]) {
        settings.sound = false; settings.calm = steady; AUDIO.enable(false);
        installed.delete(room.part.id); resetRoom(); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0;
        const brain = {}; let frames = 0, finished = false, lastTap = -99, soggy = 0, zooms = 0;
        while (frames < 60 * 200) {
          Object.assign(state.cat, { x: rig.x, vx: rig.vx, face: rig.facing, air: rig.air ? 1 : 0 });
          const inp = mode === 'play' ? botInput(state, room, brain) : { dir: 0 };
          keys.l = inp.dir < 0; keys.r = inp.dir > 0;
          if (inp.doubleTap && inp.dir && sprint !== inp.dir && frames - lastTap > 30) { tap(inp.dir); tap(inp.dir); lastTap = frames; }
          const z0 = state.nips, s0 = state.soggy;
          tick(DT); frames++;
          if (state.nips > z0) zooms++; if (state.soggy > 0 && s0 <= 0) soggy++;
          if (!steady) {
            const checks = { wheel: state.wheels[0].on && state.wheels[0].level > .6, raft: state.troughs[0].up && rig.x > room.troughs[0].x0 + 30 && rig.x < room.troughs[0].x1, zoom: state.zoom > 3, flop: state.flop > .6, pump: st.got && fx.light > .8 };
            for (const [k, okk] of Object.entries(checks)) if (okk && !shots[k]) { render(0); shots[k] = cv.toDataURL('image/png'); }
          }
          if (mode === 'exit') { finished = true; break; }
        }
        const r = { steady, finished, time: +(frames / 60).toFixed(2), installed: installed.has(room.part.id), zooms, soggy, x: Math.round(rig.x) };
        r.pass = finished && r.installed;
        runs.push(r); console.log('[HYD] LIVE', JSON.stringify(r));
      }
      const isolation = [];
      for (let i = 0; i < ROOMS.length; i++) if (!ROOMS[i].hyd) {
        loadRoom(i); mode = 'play';
        const c = freshCtrl(), before = JSON.stringify(c), rx = rig.x;
        reset(); update(DT, c, 1); audio(DT); deck(ctx, 0); front(ctx, 0);
        const okk = JSON.stringify(c) === before && rig.x === rx && blocks().length === 0;
        isolation.push({ room: room.id, pass: okk });
      }
      console.log('[HYD] ISOLATION', JSON.stringify(isolation));
      return { pass: runs.every(r => r.pass) && isolation.every(r => r.pass), runs, isolation, shots: Object.keys(shots) };
    } finally {
      installed.clear(); for (const id of saved.parts) installed.add(id);
      Object.assign(settings, saved.settings); if (saved.storage === null) localStorage.removeItem('catbot.settings'); else localStorage.setItem('catbot.settings', saved.storage);
      Object.assign(run, saved.run); seenCaps.clear(); for (const k of saved.caps) seenCaps.add(k); T = saved.T;
      AUDIO.enable(settings.sound); keys.l = keys.r = false; sprint = 0;
      loadRoom(ROOMS.findIndex(r => r.hyd)); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0; camX = camTarget(); camY = 0; caps.length = 0;
      window.__hydShots = shots;
      render(0);
    }
  }
  const measureSounds = () => SAN.measureSounds ? SAN.measureSounds(['hydWheel', 'hydClutch', 'hydPump', 'hydRaft', 'hydSplash', 'hydPuff', 'hydZoom', 'hydFlop', 'hydPumpRun'], '[HYD]') : Promise.resolve({ verified: false });

  if (window.ENG && ENG.seat) { const prev = ENG.seat; ENG.seat = (...a) => mine() ? undefined : prev(...a); }

  return { reset, update, ev, blocks, audio, deck, front, simulate, selfTest, explore, timings, liveTest, measureSounds, stepRules, fresh, botInput, get state() { return state; } };
})();

/* dev entry: index.html#room=hydroponics  (&parts=... ; hip, engine, galley, observation and sanitation are assumed; &test runs the self-test, &verify adds the live run) */
if (typeof location !== 'undefined' && /(^|[#&])room=hydroponics(?:&|$)/.test(location.hash)) {
  const pm = /parts=([\w,-]+)/.exec(location.hash);
  for (const id of pm ? pm[1].split(',') : ['hip', 'engine', 'galley', 'observation', 'sanitation']) if (id !== 'none') installed.add(id);
  OPEN.finish(false); loadRoom(ROOMS.findIndex(r => r.id === 'hydroponics')); mode = 'play'; modeT = 0;
  if (/[#&]test/.test(location.hash)) setTimeout(async () => {
    const r = window.__hydTest = HYD.selfTest();
    if (/[#&]verify(?:&|$)/.test(location.hash)) { r.live = HYD.liveTest(); r.sounds = await HYD.measureSounds(); r.pass = r.pass && r.live.pass; }
    console.log('[HYD] RESULT', r.pass ? 'PASS' : 'FAIL');
  }, 500);
}
