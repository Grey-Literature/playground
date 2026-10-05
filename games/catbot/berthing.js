'use strict';
/* =====================================================================
   BERTHING: room 3. Dark. Two lamps patrol the floor; they only see what moves.
   Pass 1 (room, hooks, sound, the egg under bunk 2): Mistral Vibe (Mistral AI) in Mistral Vibe CLI.
   The egg's eyes as eyes (Vibe drew ovals): Claude Sonnet 5.5 (claude-sonnet-5-5) in Claude Code.
   Pass 2 (patrol paths, second lamp, alert, creaky plates, the bot test, set dressing):
   Claude Opus 5.5 (claude-opus-5-5) in Claude Code, from HANDOFF-berthing-pass2.md.
   Same shape as engine.js: an IIFE that reads the game's globals
   (ROOMS, room, st, rig, mode, camX, camY, FX, sfx, AUDIO, caption, calmK, inHub, GY...).
   index.html calls BERTH.* from commented hook lines; every call is a no-op
   unless the current room has a beam.

   One rule set, two consumers. stepWorld() advances the lamps and decides
   creaks, spots and the teaching moment from a plain {x,vx,air,play} cat.
   update() feeds it the real rig and turns its events into FX, sound and the
   flee; simulate() feeds it a virtual cat at a fixed 1/60 step, no drawing.
   So the bot test plays the same room the player does.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA
   beam.lamps[i].path is a loop of {x,dwell}: the lamp travels between the
   points at beam.speed (trapezoid accel, never faster) and parks at each for
   dwell s, with a slow ~25 px sway while parked; ph0 is where in its loop it
   starts. Long dwells sit between bunks on purpose: that is where you have to freeze.
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'berthing', name: 'Berthing', w: 3400,
  floorSlip: 0,
  start: { x: 230, face: 1 },
  reset: { x: 22, w: 112 },
  beam: {
    half: 110,            // floor spot half-width (shared by both lamps)
    speed: 120,           // px/s while sweeping
    accel: 260,           // px/s² at the ends of a sweep
    seek: 340,            // px/s when a creak pulls a lamp off its patrol
    hold: 3,              // s a pulled lamp stares at the creak
    lampY: GY - 252, railY: GY - 274,
    /* Lamp A watches gap 2 but every lap swings back over bunk 2 and parks in gap 1: you see it pass
       overhead and go behind it (at 120 vs 105 it can't catch a cat from behind), and if it finds you in
       gap 1 that's where you learn to freeze. Lamp B never leaves gap 3 (a sweep out of it is a light
       you can follow across), so gap 3 is the one you have to freeze in: step out while B looks at the
       far end, hold still as it passes over you, go behind it. */
    lamps: [
      { rail: [600, 1560], tint: '255,198,135', ph0: 12, path: [
        { x: 1140, dwell: 2.2 }, { x: 1470, dwell: 2.6 }, { x: 1300, dwell: .3 }, { x: 1460, dwell: .3 },
        { x: 780, dwell: 2.6 }, { x: 980, dwell: .3 } ] },
      { rail: [1200, 2800], tint: '200,218,255', ph0: 12, path: [
        { x: 1780, dwell: .3 }, { x: 2050, dwell: 2.6 }, { x: 1900, dwell: .3 }, { x: 2400, dwell: 2.8 }, { x: 2150, dwell: 2.2 } ] }
    ]
  },
  covers: [{ x: 380, w: 240 }, { x: 900, w: 200 }, { x: 1520, w: 300 }, { x: 2420, w: 220 }],
  plates: [{ x: 1200, w: 110 }, { x: 2040, w: 170 }, { x: 2660, w: 130 }],   // gap 2, the long gap, just before the part
  lights: [260, 640, 1020, 1400, 1780, 2160, 2540, 2920, 3300],              // ceiling lights, dead until the breaker has its gear back
  part: { x: 2980, id: 'berthing', name: 'BREAKER GEAR' },
  socket: { x: 2980, y: GY - 73 },   // the breaker panel: the gear flies into it, not into catbot's hip
  exit: { x: 3120 },
  noCart: [[380, 3400]],
  captions: [
    { on: 'seen', text: 'It saw you move.' },
    { on: 'spot', text: 'Hold still. It only sees what moves.' },
    { on: 'creak', text: 'The grating rings. The lamp heard that.' },
    { on: 'power', text: 'The breaker catches. The lights come back, and the lamps stand down.' }
  ]
});

window.BERTH = (function () {
  const R0 = ROOMS[ROOMS.length - 1];
  const mine = () => !!room && !!room.beam;
  const on = () => mine() && !inHub();

  /* ---------- the rule constants ---------- */
  const BODY = 45;        // catbot's body is rig.x ± BODY
  const GRACE = 12;       // px of body that must be lit to count (a whisker in the light isn't a cat)
  const MOVE = 25;        // |vx| above this is moving (the trolley pads' threshold)
  const CREAK_V = 130;    // trot territory on a plate (walk is 105, trot 165)
  const BUNK_H = 150;     // bunk top above the deck: the light stops there
  const SWAY = 12.5, SWAY_P = 2.6;   // parked lamp sway: ±12.5 px, 2.6 s period
  const COOL = 1.5, ALERT_DECAY = 15, RAGE = 12, RAGE_K = 1.25;
  const FLEE_V = 165, HUNKER = .8;
  const TEMPT = 2.5, TEMPT_NEAR = 0, TEMPT_FAR = 170;    // the laser dot: 0-170 px ahead of a frozen cat, from a parked lamp; it holds out 2.5 s
  const DOT_IN = 16;                                      // the dot dances this far inside the spot's edge, so a cat that pounces on it lands in the light
  const DOODLE_T = 9.5;                                   // the egg: how long the bored dot's doodle lasts

  /* ---------- patrol: a pure function of patrol time ---------- */
  const TL = new Map();
  function travelT(D, v, a) { return D >= v * v / a ? D / v + v / a : 2 * Math.sqrt(D / a); }
  function travelS(s, D, v, a) {        // distance covered after s seconds of a trapezoid move of length D
    const ta = Math.min(v / a, Math.sqrt(D / a)), vm = a * ta, T = travelT(D, v, a);
    if (s <= 0) return 0; if (s >= T) return D;
    if (s < ta) return .5 * a * s * s;
    if (s < T - ta) return .5 * a * ta * ta + vm * (s - ta);
    const r = T - s; return D - .5 * a * r * r;
  }
  function timeline(L, B) {
    let tl = TL.get(L); if (tl) return tl;
    const segs = [], n = L.path.length; let t = 0;
    for (let i = 0; i < n; i++) {
      const p = L.path[i], q = L.path[(i + 1) % n], D = Math.abs(q.x - p.x), T = travelT(D, B.speed, B.accel);
      segs.push({ k: 'dwell', t0: t, t1: t + p.dwell, x: p.x }); t += p.dwell;
      segs.push({ k: 'move', t0: t, t1: t + T, x0: p.x, x1: q.x, D }); t += T;
    }
    tl = { segs, cyc: t }; TL.set(L, tl); return tl;
  }
  const sway = (u, dur) => SWAY * Math.sin(TAU * u / SWAY_P) * smooth(Math.min(u, dur - u) / .5);
  function patrolX(L, ph, B) {
    const tl = timeline(L, B); ph = ((ph % tl.cyc) + tl.cyc) % tl.cyc;
    for (const s of tl.segs) if (ph < s.t1) {
      if (s.k === 'dwell') return s.x + sway(ph - s.t0, s.t1 - s.t0);
      return s.x0 + Math.sign(s.x1 - s.x0) * travelS(ph - s.t0, s.D, B.speed, B.accel);
    }
    return L.path[0].x;
  }
  /* parked at a long dwell right now? (the lamp leans in: brighter housing, a tell) */
  function inspecting(L, ph, B) {
    const tl = timeline(L, B); ph = ((ph % tl.cyc) + tl.cyc) % tl.cyc;
    for (const s of tl.segs) if (ph < s.t1) return s.k === 'dwell' && s.t1 - s.t0 >= 1.5;
    return false;
  }

  /* ---------- light geometry: the cone is top-down and stops at a bunk's top ---------- */
  function litLen(lx, cx, R, bh = BODY) {   // px of catbot's body (cx ± bh) inside the spot and not under a bunk
    let a = Math.max(cx - bh, lx - R.beam.half), b = Math.min(cx + bh, lx + R.beam.half);
    if (b <= a) return 0;
    let len = b - a;
    for (const c of R.covers) len -= Math.max(0, Math.min(b, c.x + c.w) - Math.max(a, c.x));
    return len;
  }

  /* ---------- state: everything the room remembers lives in one object ---------- */
  function fresh(R) {
    return {
      lamps: R.beam.lamps.map(L => ({ ph: L.ph0 || 0, x: patrolX(L, L.ph0 || 0, R.beam), px: patrolX(L, L.ph0 || 0, R.beam), mode: 'patrol', tx: 0, hold: 0, holdT: 0, flare: 0, lt: 0, ds: 1 })),
      alert: 0, calmT: 0, rage: 0, cd: 0, teach: 0, taught: false, creakCd: 0,
      flee: null, hunker: 0, rings: [], spots: 0, power: 0, powerT: 0, powered: false, litOn: R.lights.map(() => false), sparkT: 1.5,
      eggEyes: false, tempt: 0, temptX: 0, temptI: -1, teased: false, lastFace: 0, resist: 0, doodled: false, doodle: null,
      lurk: { p: 0, peek: 0, still: 0, sig: 0 }
    };
  }
  let S = fresh(R0);

  /* ---------- one lamp, one step ---------- */
  function moveTo(l, tx, v, dt) { const d = tx - l.x; l.x += Math.sign(d) * Math.min(Math.abs(d), v * dt, Math.abs(d) * 6 * dt + 1); return Math.abs(tx - l.x) < .5; }
  function stepLamp(l, L, dt, m, B) {
    l.flare = Math.max(0, l.flare - dt); l.px = l.x; l.lt += dt;
    if (l.mode === 'park') { moveTo(l, L.rail[0] + 20, B.seek * .5, dt); return; }      // power's back: it rolls to the end of its rail and stays
    if (l.mode === 'patrol') { l.ph += dt * m; l.x = patrolX(L, l.ph, B); return; }
    if (l.mode === 'seek') { if (moveTo(l, l.tx, B.seek * m, dt)) { l.mode = 'hold'; l.hold = B.hold; l.holdT = 0; } return; }
    if (l.mode === 'hold') {
      l.holdT += dt; l.hold -= dt;
      l.x = l.tx + SWAY * Math.sin(TAU * l.holdT / SWAY_P) * smooth(l.holdT / .5);
      if (l.hold <= 0) l.mode = 'back';
      return;
    }
    if (l.mode === 'back' && moveTo(l, patrolX(L, l.ph, B), B.seek * m, dt)) l.mode = 'patrol';
  }
  /* a creak pulls the nearest lamp that can reach it (true when it was a fresh pull, for the whir) */
  function pull(W, R, x) {
    let best = -1, bd = 1e9;
    R.beam.lamps.forEach((L, i) => {
      const reach = x >= L.rail[0] - R.beam.half && x <= L.rail[1] + R.beam.half, d = Math.abs(W.lamps[i].x - x) + (reach ? 0 : 1e6);
      if (d < bd) { bd = d; best = i; }
    });
    const l = W.lamps[best], L = R.beam.lamps[best], was = l.mode;
    l.tx = clamp(x, L.rail[0], L.rail[1]);
    if (was === 'hold') l.hold = R.beam.hold; else l.mode = 'seek';
    return { i: best, fresh: was === 'patrol' || was === 'back' };
  }

  /* ---------------------------------------------------------------------
     THE RULES. cat = {x, vx, air, play, face}; play = in 'play' mode, not fleeing
     or hunkering; face = the way it looks (0 mid-turn).
     Returns events: spot {i, pulled}, creak {x, pull}, pounce (the dot's x), doodle (the egg), teach.
     --------------------------------------------------------------------- */
  function stepWorld(W, R, dt, cat) {
    const B = R.beam, m = W.rage > 0 ? RAGE_K : 1, ev = {};
    W.rage = Math.max(0, W.rage - dt); W.cd = Math.max(0, W.cd - dt); W.creakCd = Math.max(0, W.creakCd - dt);
    W.calmT += dt; if (W.alert > 0 && W.calmT >= ALERT_DECAY) { W.alert--; W.calmT = 0; }
    if (W.powered) W.lamps.forEach(l => { l.mode = 'park'; });
    B.lamps.forEach((L, i) => stepLamp(W.lamps[i], L, dt, m, B));
    if (W.powered) {                                  // the lamps stood down: nothing sees, nothing creaks, no dot
      if (W.doodle && (W.doodle.t += dt) > DOODLE_T) W.doodle = null;
      W.tempt = 0; return ev;
    }

    const moving = Math.abs(cat.vx) > MOVE;
    /* creak: trotting on a grating */
    if (cat.play && !cat.air && Math.abs(cat.vx) > CREAK_V && W.creakCd <= 0) {
      const p = (R.plates || []).find(p => cat.x >= p.x && cat.x <= p.x + p.w);
      if (p) { W.creakCd = .35; ev.creak = { x: cat.x, pull: pull(W, R, cat.x) }; }
    }
    /* spotted: lit, moving, on its feet, in play, off cooldown */
    let litAny = false;
    for (let i = 0; i < B.lamps.length; i++) {
      if (litLen(W.lamps[i].x, cat.x, R) < GRACE) continue;
      litAny = true;
      if (cat.play && !cat.air && moving && W.cd <= 0 && !ev.spot) {
        const l = W.lamps[i];
        ev.spot = { i, pulled: l.mode !== 'patrol' };
        l.flare = .6; W.cd = COOL; W.spots++;
        W.alert = Math.min(2, W.alert + 1); W.calmT = 0; if (W.alert === 2) W.rage = RAGE;
      }
    }
    /* the dot (stretch): a frozen cat facing a parked spot just ahead of it can't help itself. The tell is the
       tail (update() draws it from W.tempt); after TEMPT s it pounces into the light, and lands moving. */
    W.lamps.forEach(l => { const side = cat.x > l.x + 4 ? 1 : cat.x < l.x - 4 ? -1 : l.ds; l.ds = damp(l.ds, side, 3, dt); });
    const dot = cat.play && !moving && !cat.air && !litAny && cat.face ? dotAhead(W, R, cat, dt) : null;
    if (dot != null) { W.tempt += dt; W.temptX = dot; if (W.tempt >= TEMPT) { ev.pounce = dot; W.tempt = 0; W.teased = false; } }
    else W.tempt = Math.max(0, W.tempt - dt * 1.5);
    /* the egg's trigger: the tail was going (tempt past 1 s) and the cat walked or turned away from the dot.
       Three of those in one visit and the dot gets bored. A lamp moving off on its own doesn't count. */
    if (dot != null && W.tempt > 1) W.teased = true;
    if (W.teased && dot == null && cat.play && (moving || cat.face !== W.lastFace)) {
      W.teased = false; W.resist++;
      if (W.resist >= 3 && !W.doodled && W.temptI >= 0) { W.doodled = true; W.doodle = { t: 0, i: W.temptI, x: null }; ev.doodle = true; }
    }
    if (dot == null && W.tempt <= 0) W.teased = false;
    W.lastFace = cat.face;
    if (W.doodle && (W.doodle.t += dt) > DOODLE_T) W.doodle = null;
    /* the lesson: held still in the light for a second and nothing happened */
    if (cat.play && !moving && litAny) { W.teach += dt; if (W.teach >= 1 && !W.taught) { W.taught = true; ev.teach = true; } }
    else W.teach = 0;
    return ev;
  }
  /* each lamp housing carries a red targeting laser. Its dot dances just inside the edge of the spot, on the side
     facing catbot (l.ds eases between sides), never under a bunk; null when the spot has no open floor for it, or
     while that lamp's laser is busy doodling (the egg) */
  function laserDot(W, R, i) {
    const l = W.lamps[i]; if (W.powered || (W.doodle && W.doodle.i === i)) return null;
    const h = R.beam.half, wig = 7 * Math.sin(l.lt * 4.1) + 4 * Math.sin(l.lt * 9.3 + 1);
    let x = l.x + l.ds * (h - DOT_IN) + wig;
    for (const c of R.covers) if (x > c.x - 3 && x < c.x + c.w + 3) x = l.x < c.x + c.w / 2 ? c.x - 3 : c.x + c.w + 3;   // off the bunk, back toward the lamp
    return Math.abs(x - l.x) <= h - 4 ? x : null;
  }
  /* the laser dot ahead of the cat's front, if a parked lamp puts it TEMPT_NEAR..TEMPT_FAR px away */
  function dotAhead(W, R, cat, dt) {
    const f = cat.face, front = cat.x + f * BODY;
    for (let i = 0; i < W.lamps.length; i++) {
      const l = W.lamps[i];
      if (Math.abs(l.x - l.px) / dt > 40) continue;                       // a sweeping lamp drags its dot along: not a target yet
      const x = laserDot(W, R, i); if (x == null) continue;
      const d = (x - front) * f;
      if (d >= TEMPT_NEAR && d <= TEMPT_FAR) { W.temptI = i; return x; }
    }
    return null;
  }
  /* where a spotted cat runs to: just inside the right end of the nearest bunk behind it, else the start */
  function refuge(R, x) {
    let best = null;
    for (const c of R.covers) if (c.x + c.w - BODY - 14 < x - 1 && (!best || c.x > best.x)) best = c;
    return best ? best.x + best.w - BODY - 14 : R.start.x;
  }

  /* the breaker: while its gear is missing the empty socket arcs now and then (sparks + a crackle); once the gear
     is seated (st.got, set by index.html's install) power climbs the conduit and runs along the ceiling, and each
     light comes on as it arrives, flickering, outward from the panel */
  const lightAt = (R, x) => .6 + Math.abs(x - R.socket.x) / 900;
  function breaker(R, dt) {
    if (!st.got) {
      if ((S.sparkT -= dt) <= 0 && vis(R.socket.x - 40, R.socket.x + 40)) {
        FX.sparks(R.socket.x + rnd(-8, 8), R.socket.y + rnd(-6, 6), 3 + (Math.random() * 3 | 0), Math.random() < .5 ? -1 : 1, .5);
        sfx('arc', { x: R.socket.x }); S.sparkT = rnd(1.2, 3.4);
      }
      return;
    }
    if (!S.powered) { S.powered = true; S.powerT = 0; caption('power'); }
    S.powerT += dt; S.power = clamp((S.powerT - .6) / 2.5, 0, 1);
    R.lights.forEach((x, i) => { if (!S.litOn[i] && S.powerT >= lightAt(R, x)) { S.litOn[i] = true; sfx('lightsOn', { x }); } });
  }
  function lightLevel(R, i, t) {        // 0..1, flickering for the first 0.4 s after it catches
    if (!S.litOn[i]) return 0;
    const u = S.powerT - lightAt(R, R.lights[i]);
    if (u > .4 || settings.calm) return 1;
    return Math.sin(u * 70 + i) > -.2 ? 1 : .15;
  }

  /* index.html calls ENG.seat() for any part with a room.socket. engine.js's seat() spins up its turbine; here
     the generic install (st.got, flash, sparks, the socket sound) is all it needs, and the panel lamp goes
     green from st.got. So in this room the call does nothing; everywhere else it is engine.js's. */
  if (window.ENG && ENG.seat) { const engSeat = ENG.seat; ENG.seat = (...a) => mine() ? undefined : engSeat(...a); }

  /* ---------- public: reset ---------- */
  function reset() {
    if (!mine()) return;
    S = fresh(room);
    if (installed.has(room.part.id)) {               // already fixed: lit, lamps parked, as it was left
      Object.assign(S, { powered: true, powerT: 99, power: 1, litOn: room.lights.map(() => true) });
      S.lamps.forEach((l, i) => { l.mode = 'park'; l.x = l.px = room.beam.lamps[i].rail[0] + 20; });
    }
  }

  /* ---------- public: update ---------- */
  function update(dt, c) {
    if (!on()) return;
    const R = room;
    if (!S.eggEyes && rig.x > R.covers[1].x - 80) { S.eggEyes = true; console.log('%cBERTHING EYES (under bed 2) · Mistral Medium 3.5 via Vibe Code', 'color:#5fd0ff'); }

    lurk(R, dt);
    breaker(R, dt);
    const play = mode === 'play' && !S.flee;
    const ev = stepWorld(S, R, dt, { x: rig.x, vx: rig.vx, air: rig.air || rig.fl > 0, play: play && S.hunker <= 0, face: rig.turnT < 0 ? rig.facing : 0 });

    if (ev.creak) {
      const x = ev.creak.x;
      S.rings.push({ x, t: 0 });
      sfx('plateCreak', { x });
      if (ev.creak.pull.fresh) sfx('lampRetarget', { x: S.lamps[ev.creak.pull.i].x });
      caption('creak');
    }
    if (ev.teach) caption('spot');
    if (ev.doodle) {                             // the egg: anchored on the wall where you can see it, pointing back at Vibe's drawer
      S.doodle.x = clamp(rig.x - 150, camX + 30, camX + W - 290);
      S.doodle.dir = Math.sign(R.covers[1].x + R.covers[1].w / 2 - (S.doodle.x + 130)) || -1;
      console.log('%cLASER DOODLE · Claude Opus 5.5 (claude-opus-5-5) in Claude Code · hi, Vibe', 'color:#ff5a5a');
    }
    if (ev.pounce != null) {                     // it couldn't help itself
      const f = rig.facing, d = Math.abs(ev.pounce + f * 30 - rig.x);
      rig.jump(380, f * clamp(d / .3, 120, 420)); sfx('pounce', { x: rig.x });
      rig.earL.vel -= 12; rig.earR.vel -= 12; rig.tailFlick(4);
    }
    if (S.tempt > 0 && S.flee == null && S.hunker <= 0 && !rig.air) {   // the tell: tail tip twitching, ears up, eyes on the dot, and at the end the rump wiggle
      const k = clamp(S.tempt / TEMPT, 0, 1), hx = rig.toWorld({ x: rig.hx, y: rig.hy }).x;
      Object.assign(c, { wagTip: 8 + 18 * k, tipFreq: 3 + 5 * k, tailBase: 170, earL: -10 * k, earR: -8 * k, pupil: .5 + .5 * k, lid: 0,
        lookX: clamp((S.temptX - hx) * rig.facing / 120, -1, 1), lookY: -.4, earFlick: false });
      if (k > .7) { c.crouch = .3 * seg(k, .7, .85); c.hipLift = (k - .7) * 20 + Math.sin(T * 24) * 2.5; }
    }
    if (ev.spot) {
      const l = S.lamps[ev.spot.i];
      sfx('beamLock', { x: l.x }); sfx('beamSpot', { x: rig.x, delay: .12 }); caption('seen');
      if (S.spots >= 2 && !S.taught) { S.taught = true; caption('spot'); }   // seen twice and never tried holding still: say it
      FX.flash(rig.x, GY - 60, .9, R.beam.lamps[ev.spot.i].tint);
      FX.steam(rig.x, GY - rig.fl - 50, Math.ceil(4 * calmK()) + 1, 1);
      rig.earL.vel -= 16; rig.earR.vel -= 14; rig.hOy.vel -= 30; rig.tailFlick(5);
      shake = Math.max(shake, 2.4);
      rig.jump(260, -60);                        // the startle: a hop straight up and back
      S.flee = refuge(R, rig.x); S.tempt = 0;
    }

    /* the flee: a spotted cat bolts for the bunk behind it, on its own; the player has it back once it's under */
    if (S.flee != null) {
      if (rig.x <= S.flee + 4) { S.flee = null; S.hunker = HUNKER; }
      else {
        c.face = -1; c.vx = (rig.facing < 0 && rig.turnT < 0) ? -FLEE_V : 0; c.accel = 700; c.limp = 0;
        Object.assign(c, { earL: 30, earR: 26, tailBase: 190, tailCurve: -2, crouch: .25, lid: 0, pupil: 1, earFlick: false });
      }
    } else if (S.hunker > 0) {
      S.hunker -= dt;
      Object.assign(c, { vx: 0, crouch: .35, earL: 34, earR: 30, tailBase: 200, lid: .2, pupil: 1, earFlick: false });
    }

    for (const r of S.rings) r.t += dt;
    S.rings = S.rings.filter(r => r.t < .9);
  }

  /* ---------- public: audio ---------- */
  let audioOn = false;
  const lastX = [];
  function audio(dt) {
    const live = on() && mode !== 'card' && mode !== 'rewind';
    if (live) {
      room.beam.lamps.forEach((L, i) => {
        const l = S.lamps[i], v = dt > 0 && lastX[i] != null ? Math.abs(l.x - lastX[i]) / dt : 0;
        lastX[i] = l.x;
        const near = Math.pow(clamp(1 - Math.abs(l.x - rig.x) / 700, 0, 1), 1.5) * (1 - S.power);
        AUDIO.start('beamHum' + i, { pos: (l.x - L.rail[0]) / (L.rail[1] - L.rail[0]), v, near, x: l.x, alert: S.rage > 0 ? 1 : 0, cool: i });
      });
      audioOn = true;
    } else if (audioOn) {
      room && room.beam ? room.beam.lamps.forEach((_, i) => AUDIO.stop('beamHum' + i)) : (AUDIO.stop('beamHum0'), AUDIO.stop('beamHum1'));
      lastX.length = 0; audioOn = false;
    }
  }

  /* =====================================================================
     DRAW
     ===================================================================== */
  const vis = (x0, x1) => x1 > camX - 40 && x0 < camX + W + 40;
  /* the strip light over the REWIND end: mostly on, now and then it stutters (steady under STEADY) */
  function stripOn(t) {
    if (settings.calm) return .8;
    const k = t % 9.3;
    if (k > 7.6 && k < 8.3) return (Math.sin(k * 61) > .2 ? 1 : .15) * (Math.sin(k * 23) > -.6 ? 1 : .3);
    return .92 + .08 * Math.sin(t * 13);
  }
  const STRIP = { x0: 80, x1: 300 };

  /* ---------- under-bunk storage: a two-drawer cabinet against the wall, and what the crew left in it ---------- */
  const STORE = [   // per bunk: how far each drawer hangs open (px of dark slot), what spills out, what's on the floor or the post
    { open: [8, 0], spill: [['sleeve', '#7a3b2e'], null], floor: 'boots', post: true },
    { open: [9, 16], spill: [['sock', '#9aa3ad'], null], floor: null, post: false },   // bunk 2: the right drawer is where the eyes live
    { open: [0, 7], spill: [null, ['fold', '#4f6b5a']], floor: 'duffel', post: true, stack: true },
    { open: [6, 0], spill: [['sleeve', '#3e5670'], null], floor: 'boots', post: false }
  ];
  function cabinet(c) {
    const x0 = c.x + 12, x1 = c.x + c.w - 12, mid = (x0 + x1) / 2;
    return { x0, x1, y0: GY - 62, y1: GY - 8, d: [[x0 + 2, mid - 2], [mid + 2, x1 - 2]] };
  }
  function drawStorage(g, c, i) {
    const k = cabinet(c), so = STORE[i % STORE.length];
    g.fillStyle = '#262a31'; g.fillRect(k.x0, k.y0, k.x1 - k.x0, GY - k.y0);              // carcass and plinth
    g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(k.x0 + .5, k.y0 + .5, k.x1 - k.x0 - 1, GY - k.y0 - 1);
    k.d.forEach(([a, b], n) => {
      const o = so.open[n], top = k.y0 + 3;
      if (o) { g.fillStyle = '#060709'; g.fillRect(a, top, b - a, o); }                    // a drawer left hanging open: the dark inside
      g.fillStyle = o ? '#3a3f48' : '#33373f'; g.fillRect(a, top + o, b - a, k.y1 - top - o);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(a + .5, top + o + .5, b - a - 1, k.y1 - top - o - 1);
      g.fillStyle = '#7d838b'; g.fillRect((a + b) / 2 - 7, top + o + 9, 14, 2.5);           // pull
      const sp = so.spill[n];
      if (sp && o) {
        g.fillStyle = sp[1];
        if (sp[0] === 'fold') g.fillRect(a + 6, top + o - 3, b - a - 12, 3);               // a folded shirt's edge in the slot
        else {                                                                             // a sleeve or a sock hanging over the front
          const sx = a + (b - a) * .3, len = sp[0] === 'sock' ? 16 : 30;
          g.beginPath(); g.moveTo(sx, top + o - 1); g.quadraticCurveTo(sx + 7, top + o + len * .5, sx + 2, top + o + len);
          g.lineTo(sx + 9, top + o + len + 1); g.quadraticCurveTo(sx + 14, top + o + len * .5, sx + 10, top + o - 1); g.closePath(); g.fill();
          if (sp[0] === 'sock') { g.beginPath(); g.ellipse(sx + 7, top + o + len + 1, 6, 3, 0, 0, TAU); g.fill(); }
        }
      }
    });
    if (so.stack) for (let n = 0; n < 3; n++) { g.fillStyle = ['#5d5446', '#46525e', '#6b4a3a'][n]; g.fillRect(k.x0 + 10 + n, k.y0 - 5 - n * 5, 34 - n * 2, 5); }
    if (so.floor === 'boots') for (const bx of [k.x1 - 30, k.x1 - 16]) {
      g.fillStyle = '#1c1a18'; g.fillRect(bx, GY - 20, 9, 18);
      g.beginPath(); g.moveTo(bx, GY - 2); g.lineTo(bx - 7, GY - 2); g.quadraticCurveTo(bx - 8, GY - 8, bx, GY - 9); g.fill();
    }
    if (so.floor === 'duffel') {
      g.fillStyle = '#3b4636'; g.beginPath(); g.ellipse(k.x0 + 4, GY - 11, 26, 11, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.moveTo(k.x0 - 14, GY - 18); g.quadraticCurveTo(k.x0 + 4, GY - 32, k.x0 + 22, GY - 18); g.stroke();
    }
    if (so.post) {                                                                         // coveralls on a hook at the end post
      const px = c.x + c.w - 5, py = GY - BUNK_H + 18;
      g.fillStyle = '#48525c'; g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px + 9, py + 4); g.lineTo(px + 11, py + 58);
      g.lineTo(px + 3, py + 60); g.lineTo(px - 1, py + 30); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(px + 4, py + 6); g.lineTo(px + 6, py + 56); g.stroke();
    }
  }

  /* easter egg (Mistral Vibe placed it as two ovals; Claude Sonnet 5.5 made them eyes; made lurkier in pass 2
     at Tasha's request): something lives in the half-open drawer under bunk 2. Same grammar as catbot's own
     eyes (almond, slit pupil, glint), smaller and dimmer. It watches from the dark crack once catbot has been past bunk 2, follows it with its eyes, shuts
     them when light comes near, withdraws when catbot comes close, and now and then just isn't there. Wait
     long enough under that bunk and one eye opens in the other drawer. The signature is a scratch on the
     cabinet's plinth that catbot's own glow only reads when it stands close and still. */
  function lurk(R, dt) {
    const cv = R.covers[1], L = S.lurk; if (!cv) return;
    const cx = cv.x + cv.w / 2, d = Math.abs(rig.x - cx), under = d < cv.w / 2 - 20;
    const lightNear = S.lamps.some(l => Math.abs(l.x - cx) < R.beam.half + cv.w / 2);
    L.still = under && Math.abs(rig.vx) < 8 ? L.still + dt : 0;
    const away = T % 13.7 > 11.9;                                                          // now and then: nothing there
    const pairT = S.eggEyes && !lightNear && !away && d > 150 && d < 760 ? 1 : 0;
    const peekT = S.eggEyes && !lightNear && L.still > 4 ? 1 : 0;
    L.p = damp(L.p, pairT, pairT > L.p ? .9 : 6, dt);                                       // slow to open, quick to shut
    L.peek = damp(L.peek, peekT, peekT > L.peek ? .7 : 8, dt);
    L.sig = damp(L.sig, under && L.still > 2.5 ? 1 : 0, 1.5, dt);
  }
  function eggSpots(R) {      // the pair's drawer, the drawer away from catbot (the peek), the eye line, the scratch
    const cv = R.covers[1], k = cabinet(cv), cx = cv.x + cv.w / 2;
    const right = (k.d[1][0] + k.d[1][1]) / 2, left = (k.d[0][0] + k.d[0][1]) / 2;
    return { pair: right, peek: rig.x > cx ? left : right, y: k.y0 + 3 + 8, sx: k.x0 + 4 };
  }
  function eye(g, ex, ey, sd, open, look, blink) {
    const w = 7, h = 3.6 * open * (1 - blink * .9);
    if (h < .3) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    softEllipse(g, ex, ey, 13, 6, .1 * open, '255,125,20');
    const al = new Path2D();
    al.moveTo(ex - sd * w, ey + 1.2);
    al.quadraticCurveTo(ex, ey - h * 1.8, ex + sd * w, ey - 1.5);
    al.quadraticCurveTo(ex, ey + h * 1.5, ex - sd * w, ey + 1.2);
    const ig = g.createRadialGradient(ex + look * 1.5, ey, 0, ex, ey, w);
    ig.addColorStop(0, `rgba(255,215,120,${.85 * open})`); ig.addColorStop(.55, `rgba(230,120,25,${.75 * open})`); ig.addColorStop(1, `rgba(150,45,8,${.6 * open})`);
    g.fillStyle = ig; g.fill(al);
    g.restore();
    if (blink < .6 && open > .3) {
      g.fillStyle = 'rgba(20,4,0,.95)';
      g.beginPath(); g.ellipse(ex + look * 2, ey - .2, 1, h * .95, 0, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,245,215,${.8 * open})`;
      g.beginPath(); g.arc(ex + look * 2 - 1.8, ey - h * .45, .8, 0, TAU); g.fill();
    }
  }
  function drawEyes(g, R) {
    const cv = R.covers[1], L = S.lurk;
    if (!cv || !vis(cv.x, cv.x + cv.w)) return;
    const e = eggSpots(R), look = clamp((rig.x - e.pair) / 300, -1, 1);
    const bt = T % 7.1, blink = bt < .22 ? Math.sin(bt / .22 * Math.PI) : 0;
    const wink = T % 23 < 3;                                                               // sometimes only one of them is open
    if (L.p > .02) { eye(g, e.pair - 11, e.y, -1, L.p * (wink ? .15 : 1), look, blink); eye(g, e.pair + 11, e.y, 1, L.p, look, blink); }
    if (L.peek > .02) eye(g, e.peek, e.y - 1, rig.x > e.peek ? 1 : -1, L.peek, clamp((rig.x - e.peek) / 120, -1, 1), (T % 4.3 < .2) ? 1 : 0);
    if (L.sig > .02) {
      g.save(); g.font = '500 5px Inter,sans-serif'; g.textAlign = 'left';
      g.fillStyle = `rgba(205,190,165,${.55 * L.sig})`; g.fillText('Mistral Medium 3.5 via Vibe Code', e.sx, GY - 1.5);
      g.restore();
    }
  }

  /* ---------- public: deck (behind catbot) ---------- */
  function deck(g, t) {
    if (!on()) return false;
    const R = room;

    /* lockers along the back wall */
    for (const lx of [150, 660, 700, 1180, 1240, 1900, 1940, 2290, 2860]) {
      if (!vis(lx, lx + 36)) continue;
      g.fillStyle = '#2b3038'; g.fillRect(lx, GY - 120, 36, 120);
      g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(lx, GY - 120, 36, 120);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = GY - 112; y < GY - 96; y += 4) g.fillRect(lx + 8, y, 20, 1.5);
      g.fillStyle = '#8d939b'; g.fillRect(lx + 26, GY - 62, 4, 10);
    }

    /* bunks: a frame with the light stopping on its top, a sleeper's blanket breathing on it, the dark under it */
    R.covers.forEach((c, i) => {
      if (!vis(c.x, c.x + c.w)) return;
      const x = c.x, w = c.w, top = GY - BUNK_H;
      const sh = g.createLinearGradient(0, top, 0, GY);
      sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = sh; g.fillRect(x, top + 14, w, BUNK_H - 14);
      drawStorage(g, c, i);
      g.fillStyle = '#2a2e35';
      for (const lx of [x, x + w - 9]) g.fillRect(lx, top - 26, 9, BUNK_H + 26);
      g.fillStyle = '#3a3f47'; g.fillRect(x - 2, top, w + 4, 14);               // the bunk's side rail: the light stops here
      g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x - 2, top, w + 4, 14);
      g.fillStyle = '#5a4630'; g.fillRect(x + 10, top - 10, w - 20, 10);         // mattress
      g.fillStyle = '#c9bfa8'; g.beginPath(); g.ellipse(x + 26, top - 13, 16, 7, 0, 0, TAU); g.fill();   // pillow
      const br = Math.sin(TAU * t / 5 + i * 1.7), bw = w - 64;                    // breathing: about 5 s a breath
      g.fillStyle = '#6b5236';
      g.beginPath(); g.moveTo(x + 40, top - 9);
      g.bezierCurveTo(x + 40 + bw * .2, top - 26 - 3 * br, x + 40 + bw * .55, top - 28 - 4 * br, x + 40 + bw * .75, top - 19 - 2 * br);
      g.bezierCurveTo(x + 40 + bw * .9, top - 14, x + 40 + bw, top - 12, x + w - 14, top - 9); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
      const cl = i % 2 ? x + w - 40 : x + 9;                                      // the privacy curtain, bunched at one end
      g.fillStyle = '#26303a'; g.fillRect(x, top + 14, w, 3);
      g.fillStyle = '#3b4a57'; g.beginPath(); g.moveTo(cl, top + 16);
      for (let k = 0; k <= 4; k++) g.lineTo(cl + k * 7.75, top + 16 + (k % 2) * 3);
      g.lineTo(cl + 33, GY - 34); g.quadraticCurveTo(cl + 16, GY - 26, cl - 2, GY - 36); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.4)'; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cl + k * 8, top + 20); g.lineTo(cl + k * 8 + (k - 2) * 2, GY - 34); g.stroke(); }
    });

    /* creaky plates: grating, visibly not the plain deck */
    for (const p of R.plates || []) {
      if (!vis(p.x, p.x + p.w)) continue;
      g.fillStyle = '#15181d'; g.fillRect(p.x, GY - 1, p.w, 16);
      g.fillStyle = '#4c525b';
      for (let x = p.x + 3; x < p.x + p.w - 2; x += 7) g.fillRect(x, GY, 3, 13);
      g.fillStyle = '#6d747d'; g.fillRect(p.x, GY - 2, p.w, 2.5); g.fillRect(p.x, GY + 13, p.w, 2);
      g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(p.x, GY - 2, p.w, 17);
    }

    /* the conduit along the ceiling, the dead (or living) lights hanging from it */
    g.fillStyle = '#23272e'; g.fillRect(camX - 20, 8, W + 40, 4);
    R.lights.forEach((x, i) => {
      if (!vis(x - 40, x + 40)) return;
      const k = lightLevel(R, i, t);
      g.fillStyle = '#2a2e35'; g.fillRect(x - 3, 12, 6, 6); g.fillRect(x - 32, 18, 64, 7);
      g.fillStyle = k > 0 ? `rgba(225,238,255,${.35 + .65 * k})` : '#1a1d22'; g.fillRect(x - 28, 25, 56, 3);
      if (!k) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - 6, 25, 3, 3); }               // the dead tube's burnt end
    });
    /* the breaker: a scorched empty socket the gear fell out of, tripped switches, a conduit up to the ceiling */
    const sk = R.socket;
    if (sk && vis(sk.x - 60, sk.x + 60)) {
      const x0 = sk.x - 46, y0 = GY - 150, got = st.got;
      g.fillStyle = '#2b2f36'; g.fillRect(sk.x - 4, 12, 8, y0 - 12);                         // conduit drop
      g.fillStyle = '#3b3f46'; g.fillRect(x0, y0, 92, 136);
      g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x0 + .5, y0 + .5, 91, 135);
      for (let n = 0; n < 9; n++) { g.fillStyle = n % 2 ? '#d6a54e' : '#22150a'; g.fillRect(x0 + n * 10.2, y0, 10.2, 5); }
      g.fillStyle = '#23262c'; g.fillRect(x0 + 10, y0 + 12, 52, 10);
      g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.7)'; g.fillText('MAIN · BERTHING', x0 + 13, y0 + 20);
      g.beginPath(); g.arc(sk.x + 32, y0 + 17, 4, 0, TAU);                                   // status lamp
      g.fillStyle = got ? '#7dffb0' : (Math.sin(t * 5) > 0 ? '#ff5a4a' : '#5a1c16'); g.fill(); g.stroke();
      if (!got) {
        const sc = g.createRadialGradient(sk.x, sk.y, 10, sk.x, sk.y, 34);                  // scorch
        sc.addColorStop(0, 'rgba(10,6,3,.9)'); sc.addColorStop(1, 'rgba(10,6,3,0)'); g.fillStyle = sc; g.fillRect(sk.x - 34, sk.y - 34, 68, 68);
      }
      g.beginPath(); g.arc(sk.x, sk.y, 19, 0, TAU); g.fillStyle = '#0b0c0f'; g.fill();       // the socket
      g.strokeStyle = '#6d747d'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1;
      if (got) { g.save(); g.translate(sk.x, sk.y); g.scale(1, -1); disc(g, 0, 0, 16, NEAR, t * 1.6, false); g.restore(); }
      else {
        g.fillStyle = '#5b6068'; g.fillRect(sk.x - 3, sk.y - 3, 6, 6);                       // the sheared axle
        g.strokeStyle = '#4b5058'; g.beginPath(); g.moveTo(sk.x + 8, sk.y - 12); g.lineTo(sk.x + 13, sk.y - 6); g.moveTo(sk.x - 11, sk.y + 9); g.lineTo(sk.x - 6, sk.y + 14); g.stroke();
      }
      for (let n = 0; n < 3; n++) {                                                         // the switches: tripped down until it's fixed
        const bx = x0 + 18 + n * 22, by = GY - 44;
        g.fillStyle = '#1d2026'; g.fillRect(bx, by, 12, 22);
        g.fillStyle = '#8d939b'; g.fillRect(bx + 2, got ? by + 2 : by + 12, 8, 8);
      }
    }
    /* the power climbing the conduit and running along the ceiling */
    if (S.powered && sk && S.powerT < 4.5) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const u = S.powerT;
      if (u < .6) softEllipse(g, sk.x, lerp(GY - 150, 10, u / .6), 10, 10, .8, '180,220,255');
      else for (const dir of [-1, 1]) { const x = sk.x + dir * (u - .6) * 900; if (vis(x - 20, x + 20)) softEllipse(g, x, 10, 14, 6, .8, '180,220,255'); }
      g.restore();
    }

    /* ceiling: the strip light's fitting and the lamp rails */
    if (vis(STRIP.x0, STRIP.x1)) {
      const k = stripOn(t);
      g.fillStyle = '#2a2e35'; g.fillRect(STRIP.x0 - 6, 10, STRIP.x1 - STRIP.x0 + 12, 8);
      g.fillStyle = `rgba(${200 + 40 * k | 0},${220 + 30 * k | 0},235,${.25 + .7 * k})`; g.fillRect(STRIP.x0, 17, STRIP.x1 - STRIP.x0, 3);
    }
    R.beam.lamps.forEach((L, i) => {
      const y = R.beam.railY + i * 8;
      if (!vis(L.rail[0], L.rail[1])) return;
      g.fillStyle = '#30353d'; g.fillRect(L.rail[0], y - 2, L.rail[1] - L.rail[0], 4);
      g.fillStyle = '#4b5058'; for (const x of L.rail) g.fillRect(x - 3, y - 6, 6, 12);
    });
    drawEyes(g, R);
    return true;
  }

  /* ---------- public: front (darkness, light, lamps, ripples) ---------- */
  let dk = null, dctx = null;
  function darkLayer() {
    const cvs = document.getElementById('c') || ctx.canvas;
    if (!dk) { dk = document.createElement('canvas'); dctx = dk.getContext('2d'); }
    if (dk.width !== cvs.width || dk.height !== cvs.height) { dk.width = cvs.width; dk.height = cvs.height; }
    return dctx;
  }
  function coverPath(R, x0, x1) {        // everything except the space under each bunk top (the self-test probes this same path)
    const p = new Path2D(); p.rect(x0, -40, x1 - x0, H + 80);
    for (const c of R.covers) p.rect(c.x, GY - BUNK_H + 14, c.w, BUNK_H + 40);
    return p;
  }
  function coverClip(g, R) { g.clip(coverPath(R, camX - 60, camX + W + 60), 'evenodd'); }
  function lampTint(R, i) { return S.rage > 0 ? '255,110,80' : R.beam.lamps[i].tint; }
  function conePath(g, lx, ly, half) {
    g.beginPath(); g.moveTo(lx - 7, ly); g.lineTo(lx + 7, ly); g.lineTo(lx + half, GY); g.lineTo(lx - half, GY); g.closePath();
  }

  /* ---------- the egg: the bored laser doodles on the wall ----------
     approved by Tasha (2026-10-04, per AGENTS.md). Resist the dot three times in one visit and the lamp's laser
     leaves the floor: it draws a cat face on the back wall, signs it "Claude Opus 5.5 · hi, Vibe" with an arrow
     back toward bunk 2's drawer, lets it glow a moment, and fades. Same line in the console. */
  const FACE = (() => {                        // the cat face as strokes of [x,y] points, in a 52 px box
    const st = [], c = [];
    for (let k = 0; k <= 26; k++) { const a = Math.PI * .75 + k / 26 * TAU; c.push([26 + 20 * Math.cos(a), 30 + 17 * Math.sin(a)]); }
    st.push(c, [[10, 18], [9, 2], [21, 13]], [[31, 13], [43, 2], [42, 18]], [[18, 26], [19, 29]], [[33, 26], [34, 29]],
      [[22, 35], [26, 38], [30, 35]], [[17, 34], [2, 31]], [[17, 37], [3, 40]], [[35, 34], [50, 31]], [[35, 37], [49, 40]]);
    let len = 0; for (const p of st) for (let k = 1; k < p.length; k++) len += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
    return { st, len };
  })();
  const SIG_TXT = 'Claude Opus 5.5 · hi, Vibe', DY = 58;      // DY: the doodle's top, in screen y (the wall above the bunks)
  const dPhase = t => ({ face: clamp((t - .4) / 1.6, 0, 1), text: clamp((t - 2.1) / 2.6, 0, 1), arrow: clamp((t - 4.8) / .5, 0, 1),
    a: t < 7.6 ? 1 : clamp(1 - (t - 7.6) / 1.6, 0, 1) });
  function facePoint(u) {                       // where the pen is after u (0..1) of the face
    let want = u * FACE.len;
    for (const p of FACE.st) for (let k = 1; k < p.length; k++) {
      const sl = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
      if (want <= sl) { const f = want / sl; return [lerp(p[k - 1][0], p[k][0], f), lerp(p[k - 1][1], p[k][1], f)]; }
      want -= sl;
    }
    return [26, 13];
  }
  let sigW = 190;
  function doodleHead(D, t) {                  // the laser's dot while it doodles
    const q = dPhase(D.t), ox = D.x, oy = DY;
    if (q.face < 1) { const [fx, fy] = facePoint(q.face); return { x: ox + fx, y: oy + fy }; }
    if (q.text < 1) return { x: ox + 62 + sigW * q.text, y: oy + 34 + 5 * Math.sin(D.t * 38) };
    if (q.arrow < 1) { const ax = ox + 62 + sigW / 2; return { x: ax + D.dir * 40 * (q.arrow - .5), y: oy + 50 }; }
    return { x: ox + 62 + sigW / 2 + D.dir * 20, y: oy + 50 + 2 * Math.sin(t * 3) };   // it waits with its work, wiggling
  }
  function drawDoodle(g, D, t) {
    const q = dPhase(D.t), ox = D.x, oy = DY;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    const pass = (w, a) => {
      g.strokeStyle = `rgba(255,40,40,${a * q.a})`; g.lineWidth = w;
      let want = q.face * FACE.len;                                                       // the face, as far as the pen has got
      for (const p of FACE.st) {
        if (want <= 0) break;
        g.beginPath(); g.moveTo(ox + p[0][0], oy + p[0][1]);
        for (let k = 1; k < p.length && want > 0; k++) {
          const sl = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]), f = Math.min(1, want / sl);
          g.lineTo(ox + lerp(p[k - 1][0], p[k][0], f), oy + lerp(p[k - 1][1], p[k][1], f)); want -= sl;
        }
        g.stroke();
      }
      if (q.arrow > 0) {
        const ax = ox + 62 + sigW / 2, len = 40 * q.arrow;
        g.beginPath(); g.moveTo(ax - D.dir * 20, oy + 50); g.lineTo(ax - D.dir * 20 + D.dir * len, oy + 50);
        if (q.arrow >= 1) { g.moveTo(ax + D.dir * 13, oy + 45); g.lineTo(ax + D.dir * 20, oy + 50); g.lineTo(ax + D.dir * 13, oy + 55); }
        g.stroke();
      }
    };
    pass(5, .12); pass(1.6, .85);                                                          // glow, then the line
    if (q.text > 0) {                                                                       // the signature, written out behind the moving dot
      g.font = 'italic 600 16px "Segoe Script","Brush Script MT",cursive'; sigW = g.measureText(SIG_TXT).width;
      g.save(); g.beginPath(); g.rect(ox + 60, oy + 10, sigW * q.text + 2, 40); g.clip();
      g.lineWidth = 3; g.strokeStyle = `rgba(255,40,40,${.15 * q.a})`; g.strokeText(SIG_TXT, ox + 62, oy + 38);
      g.lineWidth = 1; g.strokeStyle = `rgba(255,70,70,${.9 * q.a})`; g.strokeText(SIG_TXT, ox + 62, oy + 38);
      g.restore();
    }
    g.restore();
  }

  function front(g, t) {
    if (!on()) return;
    const R = room, B = R.beam, half = B.half, ly = B.lampY;

    /* 1. darkness with the light cut out of it, so lit things show their real colours */
    const d = darkLayer();
    d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, dk.width, dk.height);
    d.fillStyle = `rgba(5,7,12,${.68 - .4 * S.power})`; d.fillRect(0, 0, dk.width, dk.height);
    d.setTransform(g.getTransform());
    d.globalCompositeOperation = 'destination-out';
    const k = stripOn(t);
    if (vis(STRIP.x0 - 120, STRIP.x1 + 120)) {
      const sg = d.createRadialGradient((STRIP.x0 + STRIP.x1) / 2, GY - 40, 10, (STRIP.x0 + STRIP.x1) / 2, GY - 40, 260);
      sg.addColorStop(0, `rgba(0,0,0,${.55 * k})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = sg; d.fillRect(STRIP.x0 - 260, 0, STRIP.x1 - STRIP.x0 + 520, H);
    }
    R.lights.forEach((x, i) => {                                                     // pools under the ceiling lights once they're on
      const k = lightLevel(R, i, t); if (!k || !vis(x - 280, x + 280)) return;
      const q = d.createRadialGradient(x, GY - 90, 20, x, GY - 90, 300); q.addColorStop(0, `rgba(0,0,0,${.5 * k})`); q.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = q; d.fillRect(x - 300, 0, 600, H);
    });
    const lk = 1 - S.power;                                                           // the lamps' own light, fading as they stand down
    d.save(); coverClip(d, R);
    S.lamps.forEach((l, i) => {
      if (lk <= 0 || !vis(l.x - half, l.x + half)) return;
      d.globalAlpha = lk;
      const lg = d.createLinearGradient(0, ly, 0, GY);
      lg.addColorStop(0, 'rgba(0,0,0,.3)'); lg.addColorStop(.6, 'rgba(0,0,0,.62)'); lg.addColorStop(1, `rgba(0,0,0,${l.flare > 0 ? .95 : .8})`);
      d.fillStyle = lg; conePath(d, l.x, ly, half); d.fill();
      const fg = d.createRadialGradient(l.x, GY, 0, l.x, GY, half + 4);   // the spot: flat to near its edge, so the rule's edge is the drawn edge
      fg.addColorStop(0, 'rgba(0,0,0,.95)'); fg.addColorStop(.85, 'rgba(0,0,0,.85)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = fg; d.save(); d.translate(l.x, GY); d.scale(1, .24); d.translate(-l.x, -GY);
      d.beginPath(); d.arc(l.x, GY, half + 4, 0, TAU); d.fill(); d.restore();
    });
    d.globalAlpha = 1; d.restore();
    const small = (x, y, r, a) => { if (!vis(x - r, x + r)) return; const q = d.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(0,0,0,${a})`); q.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = q; d.fillRect(x - r, y - r, r * 2, r * 2); };
    const core = rig.toWorld(rig.core); small(core.x, core.y, 50, .5); small(rig.x, GY - rig.fl - 55, 100, .4);   // catbot's own glow keeps it readable
    for (const p of R.plates || []) for (let x = p.x + 20; x < p.x + p.w; x += 40) small(x, GY + 6, 26, .35);   // light coming up through the grating
    if (R.part && !st.got) small(R.part.x, GY - 20, 50, .45);
    if (R.socket) { small(R.socket.x + 32, GY - 133, 18, .7); small(R.socket.x, R.socket.y, 40, st.got ? .6 : .3); }   // the panel's lamp, the socket
    if (R.exit) small(R.exit.x + 20, GY - 176, 40, .7);
    R.covers.forEach(c => small(c.x + 4, GY - 104, 16, .7));                       // berth number tags
    if (R.covers[1]) {                                                              // the egg: only what it lets you see
      const e = eggSpots(R), L = S.lurk;
      if (L.p > .02) { small(e.pair - 11, e.y, 11, .8 * L.p); small(e.pair + 11, e.y, 11, .8 * L.p); }
      if (L.peek > .02) small(e.peek, e.y, 11, .8 * L.peek);
      if (L.sig > .02) small(e.sx + 40, GY - 3, 50, .5 * L.sig);
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(dk, 0, 0); g.restore();

    /* 2. a little tint in the light (additive), cones clipped at the bunk tops */
    g.save(); coverClip(g, R); g.globalCompositeOperation = 'lighter';
    S.lamps.forEach((l, i) => {
      if (!vis(l.x - half, l.x + half)) return;
      const tint = lampTint(R, i), a = (l.flare > 0 ? .22 : .07) * (S.rage > 0 ? 1.8 : 1) * lk;
      const cg = g.createLinearGradient(0, ly, 0, GY); cg.addColorStop(0, `rgba(${tint},${a * 1.6})`); cg.addColorStop(1, `rgba(${tint},${a})`);
      g.fillStyle = cg; conePath(g, l.x, ly, half); g.fill();
      softEllipse(g, l.x, GY + 2, half, half * .22, (l.flare > 0 ? .35 : .16) * (S.rage > 0 ? 1.6 : 1) * lk, tint);
    });
    g.restore();

    /* 3. lamp housings on their rails; the glow is the alert's visual twin */
    S.lamps.forEach((l, i) => {
      if (!vis(l.x - 30, l.x + 30)) return;
      const L = B.lamps[i], y = B.railY + i * 8, tint = lampTint(R, i);
      const insp = l.mode === 'hold' || (l.mode === 'patrol' && inspecting(L, l.ph, B));
      const flick = S.rage > 0 && !settings.calm ? .1 * Math.sin(t * 37) : 0;
      const glow = clamp(.35 + .18 * S.alert + (insp ? .15 : 0) + l.flare + flick, 0, 1.4) * (1 - .8 * S.power);
      g.fillStyle = '#3e434b'; g.fillRect(l.x - 13, y - 5, 26, 9); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(l.x - 13, y - 5, 26, 9);
      g.fillStyle = '#2a2e35'; g.fillRect(l.x - 3, y + 4, 6, ly - y - 8);
      g.beginPath(); g.moveTo(l.x - 10, ly - 6); g.lineTo(l.x + 10, ly - 6); g.lineTo(l.x + 8, ly + 2); g.lineTo(l.x - 8, ly + 2); g.closePath();
      g.fillStyle = '#4b5058'; g.fill(); g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter';
      softEllipse(g, l.x, ly + 1, 26 + 10 * glow, 12 + 4 * glow, .3 * glow, tint);
      g.fillStyle = `rgba(${tint},${.5 + .4 * Math.min(1, glow)})`; g.fillRect(l.x - 7, ly, 14, 2.5);
      g.restore();
    });

    /* 3b. the targeting lasers: a faint line from each housing to its dancing dot (the doodling one points at the wall) */
    g.save(); g.globalCompositeOperation = 'lighter';
    S.lamps.forEach((l, i) => {
      const dz = S.doodle && S.doodle.i === i && S.doodle.x != null ? doodleHead(S.doodle, t) : null;
      const x = dz ? dz.x : laserDot(S, R, i), y = dz ? dz.y : GY + 3;
      if (x == null || !vis(x - 20, x + 20)) return;
      g.strokeStyle = 'rgba(255,40,40,.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(l.x, ly + 2); g.lineTo(x, y); g.stroke();
      const fl = settings.calm ? 1 : .85 + .15 * Math.sin(t * 31 + i * 2);                  // a laser's little shimmer
      softEllipse(g, x, y, dz ? 12 : 18, dz ? 12 : 6, .75 * fl, '255,30,30');
      softEllipse(g, x, y, dz ? 5 : 7, dz ? 5 : 3, .9 * fl, '255,80,60');
      g.fillStyle = 'rgba(255,225,215,1)'; g.beginPath(); g.ellipse(x, y, 2.6, dz ? 2.6 : 1.6, 0, 0, TAU); g.fill();
    });
    g.restore();
    if (S.doodle && S.doodle.x != null) drawDoodle(g, S.doodle, t);

    /* 4. what you need to read in the dark: a rim on each bunk and its berth number */
    R.covers.forEach((c, i) => {
      if (!vis(c.x, c.x + c.w)) return;
      const top = GY - BUNK_H;
      g.strokeStyle = 'rgba(160,170,185,.22)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(c.x - 2, top + .5); g.lineTo(c.x + c.w + 2, top + .5);
      g.moveTo(c.x + .5, top - 26); g.lineTo(c.x + .5, GY); g.moveTo(c.x + c.w - .5, top - 26); g.lineTo(c.x + c.w - .5, GY); g.stroke();
      g.fillStyle = 'rgba(30,24,14,.9)'; g.fillRect(c.x - 3, GY - 110, 15, 11);
      g.font = '600 9px Oswald,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,196,110,.75)'; g.fillText(String(i + 1), c.x + 4.5, GY - 101.5); g.textAlign = 'left';
    });

    /* 5. the creak's ripple on the grating (its sound's visual twin) */
    for (const r of S.rings) {
      const u = r.t / .9, a = (1 - u) * .7;
      g.strokeStyle = `rgba(255,214,150,${a})`; g.lineWidth = 2 - u;
      for (const s of [1, .6]) { g.beginPath(); g.ellipse(r.x, GY + 6, 12 + 70 * u * s, (12 + 70 * u * s) * .18, 0, 0, TAU); g.stroke(); }
    }

  }

  /* =====================================================================
     THE BOT TEST
     simulate(strategy): fixed 1/60 step, no drawing, the same stepWorld the
     game runs. The virtual cat accelerates at the rig's 260 px/s², flees to
     the bunk behind at 165 px/s when spotted (immune while it runs, then a
     0.8 s hunker), and is immune through the pounce (4.5 s, ends at part.x-64).
     ===================================================================== */
  const DT = 1 / 60, ACC = 260, WALK = 105, TROT = 165, CAP = 400;
  function cloneW(W) { return { ...W, lamps: W.lamps.map(l => ({ ...l })), rings: [] }; }
  function catStep(cat, target, dt) { cat.vx += clamp(target - cat.vx, -ACC * dt, ACC * dt); cat.x += cat.vx * dt; }
  const goalX = (R, got) => got ? R.exit.x + 64 : R.part.x - 190;

  /* would this plan get the cat seen? plan(cat,t) -> target vx. Runs until the cat has stopped or reached stopX */
  function planSafe(W0, R, cat0, plan, maxT, stopX) {
    const W = cloneW(W0), cat = { ...cat0 };
    for (let t = 0; t < maxT; t += DT) {
      catStep(cat, plan(cat, t), DT);
      const p = plan(cat, t); if (p) cat.face = Math.sign(p);
      const ev = stepWorld(W, R, DT, { x: cat.x, vx: cat.vx, air: false, play: true, face: cat.face || 1 });
      if (ev.spot || ev.creak || ev.pounce != null) return false;
      if (stopX != null && cat.x >= stopX) return true;
      if (stopX == null && t > .2 && Math.abs(cat.vx) < 1) return true;
    }
    return stopX == null;
  }
  /* where the next safe place is: fully under the next bunk ahead, else the goal */
  function nextSafe(R, x, got) {
    for (const c of R.covers) if (c.x + BODY - GRACE + 2 > x) return c.x + BODY - GRACE + 2;
    return goalX(R, got);
  }
  /* gaps you can never cross clean: no start time in a long sample gives a crossing without meeting a lamp */
  function freezeGaps(R) {
    const out = R.covers.map(() => false);
    R.covers.forEach((c, ci) => {
      const W = fresh(R), from = c.x + c.w - BODY - GRACE, to = nextSafe(R, from + 1, false);
      let clean = false;
      for (let t = 0; t < 240 && !clean; t += .5) {
        if (planSafe(W, R, { x: from, vx: 0 }, () => WALK, 20, to)) clean = true;
        for (let k = 0; k < 30; k++) stepWorld(W, R, DT, { x: -9999, vx: 0, air: false, play: false });
      }
      out[ci] = !clean;
    });
    return out;
  }

  function simulate(strategy, R, trace) {
    R = R || R0;
    const W = fresh(R), cat = { x: R.start.x, vx: 0 };
    let t = 0, got = false, pounce = -1, flee = null, hunker = 0, spots = 0, plateSpots = 0, finished = false, decideT = 0, want = 0, freezes = 0, stopped = true, face = 1, backT = 0, pounces = 0;
    const hist = [];                                  // human: what the lamps looked like, frame by frame
    const needFreeze = strategy === 'smart' ? freezeGaps(R) : null;
    const coverIdx = x => R.covers.findIndex(c => x - BODY >= c.x - GRACE + 1 && x + BODY <= c.x + c.w + GRACE - 1);
    while (t < CAP) {
      let target = 0, play = true;
      if (pounce >= 0) { play = false; pounce -= DT; cat.vx = 0; if (pounce < 0) { got = true; W.powered = true; cat.x = R.part.x - 64; } }
      else if (flee != null) { play = false; target = -FLEE_V; if (cat.x <= flee + 4) { flee = null; hunker = HUNKER; cat.vx = 0; } }
      else if (hunker > 0) { hunker -= DT; target = 0; }
      else if (strategy === 'frozen') target = 0;
      else if (strategy === 'naive') target = WALK;
      else if (strategy === 'trotter') target = TROT;
      else if (strategy === 'smart') {
        decideT -= DT; backT -= DT;
        if (W.tempt > .8 && backT <= 0 && planSafe(W, R, { x: cat.x, vx: cat.vx }, (c, tt) => tt < .35 ? -WALK : 0, 3, null)) backT = .35;   // the tail's going: step back, look away
        if (backT > 0) want = -WALK;
        else if (decideT <= 0) {
          decideT = .1;
          const goal = nextSafe(R, cat.x, got), ci = coverIdx(cat.x), c0 = { x: cat.x, vx: cat.vx };
          const cross = planSafe(W, R, c0, () => WALK, 30, goal);
          const short = planSafe(W, R, c0, (c, tt) => tt < .8 ? WALK : 0, 4, null);
          if (cross) want = WALK;
          else if (ci >= 0 && !needFreeze[ci]) want = 0;   // under a bunk with a clean crossing still to come: wait for it
          else want = short ? WALK : 0;                     // in the open (or a gap that can't be crossed clean): edge forward, freeze when it comes
        }
        target = want;
      }
      else if (strategy === 'human') {
        /* plays by sight: sees the lamps 0.25 s late (reaction), judges their direction from the 0.2 s before that,
           knows nothing about the paths. Freezes when a light is on it or coming at it, waits under a bunk while a
           light ahead is close and not leaving, steps back when the tail starts going. */
        decideT -= DT; backT -= DT;
        if (W.tempt > 1.2 && backT <= 0) backT = .35;
        if (backT > 0) want = -WALK;
        else if (decideT <= 0 && hist.length > 30) {
          decideT = .15;
          const now = hist[hist.length - 16], was = hist[hist.length - 28], REACH = R.beam.half + BODY - GRACE;
          const under = coverIdx(cat.x) >= 0;
          let stop = false, hold = false;
          now.forEach((lx, i) => {
            const v = (lx - was[i]) / .2, d = Math.abs(lx - cat.x) - REACH, ahead = lx > cat.x;
            const toward = Math.sign(lx - cat.x) * v < -15;
            if (litLen(lx, cat.x, R) >= GRACE) stop = true;       // a light is on it
            if (toward && d < 170) stop = true;                    // one is coming at it
            if (ahead && d < 60) stop = true;                      // one is parked just ahead
            if (under && ahead && d < 280 && v < 15) hold = true;  // from a bunk: wait until the light ahead is leaving or far
          });
          want = stop || hold ? 0 : WALK;
        }
        target = want;
      }
      if (target) face = Math.sign(target);
      catStep(cat, target, DT);
      if (flee == null && pounce < 0 && cat.vx < 0 && cat.x < R.start.x) { cat.x = R.start.x; cat.vx = 0; }
      const ev = stepWorld(W, R, DT, { x: cat.x, vx: cat.vx, air: false, play: play && hunker <= 0, face });
      hist.push(W.lamps.map(l => l.x)); if (hist.length > 60) hist.shift();
      if (ev.pounce != null) { pounces++; cat.x = ev.pounce + face * 30; cat.vx = face * 200; }   // lands in the light, skidding
      if (ev.spot) { spots++; if (ev.spot.pulled) plateSpots++; flee = refuge(R, cat.x); hunker = 0; face = -1; }
      const still = Math.abs(cat.vx) <= MOVE;
      if (still && !stopped && play && hunker <= 0 && coverIdx(cat.x) < 0) freezes++;   // came to a stop in the open (not pouncing, not hunkering)
      stopped = still;
      if (trace) trace.push({ t: +t.toFixed(2), x: +cat.x.toFixed(1), vx: +cat.vx.toFixed(1), cover: coverIdx(cat.x), ev: ev.spot ? 'spot' + ev.spot.i : ev.creak ? 'creak' : '' });
      t += DT;
      if (!got && pounce < 0 && flee == null && cat.x >= R.part.x - 190) { pounce = 4.5; cat.vx = 0; }
      if (got && cat.x >= R.exit.x + 64) { finished = true; break; }
    }
    return { strategy, spots, plateSpots, pounces, openFreezes: freezes, time: +t.toFixed(1), finished, freezeGaps: needFreeze };
  }

  /* ---------- self-test ---------- */
  function selfTest() {
    const out = [], R = R0, B = R.beam;
    const log = (ok, msg) => out.push((ok ? 'PASS: ' : 'FAIL: ') + msg);

    /* (a) sample each lamp over a full cycle. Every floor point in its spot must agree three ways: the rule
       (litLen on a 1 px probe), the drawn clip (isPointInPath on the same Path2D front() clips with), and
       "is it under a bunk". And a cat tucked fully under a bunk is never seen. */
    {
      let bad = 0, seen = 0, worst = '';
      const probe = document.createElement('canvas').getContext('2d'), path = coverPath(R, -100, R.w + 100);
      B.lamps.forEach((L, i) => {
        const cyc = timeline(L, B).cyc;
        for (let ph = 0; ph < cyc; ph += .1) {
          const lx = patrolX(L, ph, B);
          for (let x = Math.ceil(lx - B.half) + .5; x < lx + B.half; x += 2) {
            const under = R.covers.some(c => x > c.x && x < c.x + c.w);
            const drawn = probe.isPointInPath(path, x, GY - 8, 'evenodd');
            const rule = ruleLit(lx, x, R);
            if (under === drawn || under === rule) { bad++; worst = `lamp ${i} at ${lx | 0}, x=${x}: under=${under} drawn=${drawn} rule=${rule}`; }
          }
          for (const c of R.covers) for (let cx = c.x + BODY - GRACE + 2; cx <= c.x + c.w - BODY + GRACE - 2; cx += 4)
            if (litLen(lx, cx, R) >= GRACE) { seen++; worst = `lamp ${i} at ${lx | 0} sees a cat at ${cx}`; }
        }
      });
      log(!bad && !seen, `(a) light never reaches under a bunk, in the rule or the drawing, over a full cycle of each lamp${bad || seen ? ` (${bad} disagreements, ${seen} seen; ${worst})` : ''}`);
    }
    /* (b) the part and the exit each get a lamp-free window of 4 s or more in every stretch of one long cycle */
    {
      const W = fresh(R), span = Math.max(...B.lamps.map(L => timeline(L, B).cyc)), total = span * 4;
      for (const [name, x] of [['part', R.part.x - 64], ['exit', R.exit.x + 30]]) {
        const runs = []; let run = 0, t = 0, Wk = cloneW(W);
        for (; t < total; t += DT) {
          stepWorld(Wk, R, DT, { x: -9999, vx: 0, air: false, play: false });
          const free = Wk.lamps.every(l => litLen(l.x, x, R) < GRACE);
          if (free) run += DT; else { if (run > 0) runs.push({ end: t, len: run }); run = 0; }
        }
        runs.push({ end: t, len: run });
        let ok = true, worstWin = 1e9;
        for (let w0 = 0; w0 + span <= total; w0 += 1) {
          const best = Math.max(0, ...runs.map(r => Math.min(r.end, w0 + span) - Math.max(r.end - r.len, w0)));
          worstWin = Math.min(worstWin, best); if (best < 4) ok = false;
        }
        log(ok, `(b) ${name} (x=${x}) has a lamp-free window ≥ 4 s in every ${span.toFixed(1)} s stretch (worst ${worstWin.toFixed(1)} s)`);
      }
    }
    /* (c) reset() after a spotted, alerted, pulled, fleeing state gives exactly a fresh room's state */
    if (mine()) {
      const snap = () => JSON.stringify(S);
      loadRoom(roomI); const a = snap();
      stepWorld(S, room, 1, { x: 0, vx: 0, air: false, play: false });
      Object.assign(S, { alert: 2, rage: 7, cd: 1, calmT: 3, teach: .5, taught: true, flee: 500, hunker: .3, spots: 3, eggEyes: true, tempt: 1, temptX: 1200, temptI: 1, teased: true, lastFace: -1, resist: 2, doodled: true, doodle: { t: 3, i: 0, x: 900, dir: -1 }, lurk: { p: 1, peek: 1, still: 9, sig: 1 } });
      S.lamps.forEach(l => { l.lt = 7; l.ds = -1; });
      Object.assign(S, { power: .5, powerT: 2, powered: true, sparkT: .2 }); S.litOn[0] = true;
      S.rings.push({ x: 1, t: 0 }); pull(S, room, 2100); S.lamps[0].flare = .6;
      resetRoom(); const b = snap();
      log(a === b, `(c) reset() after a spotted state equals a fresh loadRoom${a === b ? '' : ` (fresh ${a} vs reset ${b})`}`);
    } else log(false, '(c) not in berthing: run from index.html#room=berthing&test');

    /* the bots */
    const want = {
      frozen: r => r.spots === 0,
      naive: r => r.spots >= 4,
      trotter: r => r.spots >= 3 && r.plateSpots >= 1,
      smart: r => r.finished && r.spots === 0 && r.time >= 60 && r.time <= 150 && r.freezeGaps.some(Boolean) && r.openFreezes > 0,
      human: r => r.finished && r.spots <= 3 && r.time <= 150
    };
    const bots = {};
    for (const s of Object.keys(want)) {
      const r = simulate(s); bots[s] = r;
      log(want[s](r), `bot ${s}: ${r.spots} spots (${r.plateSpots} from plates), ${r.time} s, ${r.finished ? 'finished' : 'did not finish'}${r.pounces ? `, ${r.pounces} dot pounces` : ''}${s === 'smart' ? `, froze in the open ${r.openFreezes}x, gaps that need a freeze: ${r.freezeGaps.map((f, i) => f ? i + 1 : '').filter(Boolean).join(',') || 'none'}` : ''}`);
    }
    console.log('BERTHING SELF-TEST\n' + out.join('\n'));
    window.__berthTest = { lines: out, bots };
    return out;
  }
  /* the rule's answer for one floor point: litLen of a 1 px wide body at x */
  const ruleLit = (lx, x, R) => litLen(lx, x, R, .5) > .5;

  /* ---------- dev entry: index.html#room=berthing  (&parts=..., &test) ---------- */
  if (typeof location !== 'undefined') {
    const m = /(^|[#&])room=berthing/.exec(location.hash);
    if (m) {
      const pm = /parts=([\w,-]+)/.exec(location.hash);
      const parts = pm ? pm[1].split(',') : ['hip', 'engine'];
      for (const id of parts) installed.add(id);
      OPEN.finish(false);
      loadRoom(ROOMS.findIndex(r => r.id === 'berthing'));
      mode = 'play'; modeT = 0;
      if (/[#&]test/.test(location.hash)) setTimeout(() => BERTH.selfTest(), 500);
    }
  }

  return { reset, update, audio, deck, front, selfTest, simulate, stepWorld, patrolX, get state() { return S; } };
})();
