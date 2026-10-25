'use strict';
/* GALLEY / MESS · GPT-6.1-Sol in Codex.
   Movement is the only verb. No assets, dependencies or rig changes.
   stepWorld owns motion, counter landings and all puzzle rules at 60 Hz. The rig
   consumes that motion, supplies springs/feet/poses, and is synchronized
   after its substeps. The bot consumes the same stepWorld, without canvas.
   Approved revision: coast-and-catch, reverse produce hops and visible repair.
   Egg signature: GPT-6.1-Sol · REJECTED PRODUCE · Failed the cat scan.
   Revised 2026-10-05 by Claude Opus 5.5 in Claude Code, on Tasha's notes:
   three trays (plates, stock pot, cups) with loads drawn on them and a
   service lift that takes each one down; the pepper leaps forward onto the
   shelf again, and is drawn as a bell pepper; bot and checks per lane.
*/
ROOMS.push({
  id: 'galley', name: 'Galley / Mess', w: 3960, galley: true, floorSlip: 0,
  start: { x: 310, face: 1 }, reset: { x: 22, w: 112 },
  slick: [{ x: 600, w: 450, slip: .82 }, { x: 2460, w: 440, slip: .84 }, { x: 3040, w: 560, slip: .88 }],
  // Three trays, three weights, one per lane: plates (the teach), the stock pot
  // (too heavy for a walk: lean until the trot takes over), cups (light, on the
  // grease already: walk into them and let go; `bump` hands them the cat's momentum).
  trays: [
    { x: 500, w: 84, mass: 3.2, home: 500, end: 1050, load: 'plates' },
    { x: 2320, w: 96, mass: 5, home: 2320, end: 2900, load: 'pot' },
    { x: 3040, w: 76, mass: 2, home: 3040, end: 3600, load: 'cups', bump: .85 }
  ],
  plates: [{ x: 820, w: 140, catchSpeed: 95 }, { x: 2700, w: 150, catchSpeed: 95 }, { x: 3200, w: 150, catchSpeed: 100 }],
  counters: [{ x: 970, w: 620, y: 120, name: 'PREP COUNTER' }, { x: 1530, w: 570, y: 220, name: 'PRODUCE SHELF' }],
  produce: [
    { x: 1320, y: 0, kind: 'cucumber', range: 110, jump: 1000, kick: 220 },
    // leap: the startle goes up and over, forward onto the shelf (cucumber hops back)
    { x: 1480, y: 120, kind: 'pepper', range: 90, jump: 1000, kick: 280, leap: true },
    { x: 1750, y: 220, kind: 'crooked', range: 100 }
  ],
  grill: { x: 1430, w: 150 },
  gate: { x: 3640, w: 32 }, part: { x: 3790, id: 'galley', name: 'MIXER GEAR' },
  socket: { x: 3858, y: GY - 168 }, exit: { x: 3860 },
  noCart: [[460, 3620]], rail: [[180, 440], [3675, 3850]],
  captions: [
    { on: 'galPush', text: 'Hot plate! Hot plate! Nice and steady... 🍽️' },
    { on: 'galPlate', text: 'Delivery completed. 🚚' },
    { on: 'galSlick', text: 'Someone should really clean up this grease... 🧼' },
    { on: 'galBump', text: 'Fast food! Whoops! Too fast.' },
    { on: 'galHeat', text: 'Too hot for Catbot paws! Use the counter.' },
    { on: 'galGreen', text: 'Ahh! What was that!?' },
    { on: 'galPepper', text: 'Ew! Pepper. Absolutely not!' },
    { on: 'galHeavy', text: 'Move. Across. The. Floor. So. Heavy. 🪨' },
    { on: 'galLight', text: 'Nice gentle tap now. No need to break the teacups. ☕' },
    { on: 'galOpen', text: 'Your delivery is acceptable.' },
    { on: 'galRepair', text: 'Tick... tick... tick... whirr... The central gear has locked into place. 🐈🕰️🪢' }
  ]
});

window.GAL = (() => {
  const layout = ROOMS[ROOMS.length - 1], DT = 1 / 60, NOSE = 88;
  const mine = () => !!room && room.galley === true;
  const live = () => mine() && !inHub();
  const copy = v => JSON.parse(JSON.stringify(v));
  const cap = (v, a, b) => Math.max(a, Math.min(b, v));
  const approach = (v, target, delta) => v + cap(target - v, -delta, delta);
  function fresh(def) {
    return {
      cat: { x: def.start.x, vx: 0, face: def.start.face, turn: 0, hold: 0, dir: 0, sprint: 0, h: 0, fl: 0, vy: 0, air: false },
      trays: def.trays.map(p => ({ x: p.x, v: 0, seat: 0, set: false, contact: 0, pushing: false, flash: 0, returning: false, missed: false })),
      produce: def.produce.map(() => ({ armed: true, cool: 0, flash: 0 })), got: false, heatCool: 0, gateTime: 0,
      pushes: 0, grillHits: 0, startles: 0, landings: [], pushPose: { i: -1, t: 0, force: 0 }, egg: { approach: false, wait: 0, t: -1, done: false }
    };
  }
  function slipAt(x, def) {
    def = def || (mine() ? room : null); if (!def) return room?.floorSlip || 0;
    if (def.plates?.some(p => x >= p.x && x <= p.x + p.w)) return 0;
    return def.slick?.find(p => x >= p.x && x <= p.x + p.w)?.slip || def.floorSlip || 0;
  }
  // A long tray still has oily runners while its nose crosses the rubber mat.
  // Only a full, slow arrival can engage the mat's catch.
  function traySlip(tray, spec, def) { return def.slick.find(p => tray.x + spec.w / 2 >= p.x && tray.x < p.x + p.w)?.slip || 0; }
  function trayDrag(tray, spec, def) { return traySlip(tray, spec, def) > 0 ? 16 : 140; }
  function solids(world, def) {
    return world.trays.flatMap((p, i) => p.set ? [] : [{ x0: p.x, x1: p.x + def.trays[i].w, clr: NOSE }]);
  }
  function gateOpen(world) { return world.trays.every(p => p.set) && world.gateTime >= 1; }
  function floorAt(x, top, def) { return def.counters.reduce((f, p) => x >= p.x && x <= p.x + p.w && p.y <= top + .01 ? Math.max(f, p.y) : f, 0); }

  // Pure state transition: no rig, DOM, audio, mutable globals or randomness.
  function stepWorld(world, def, dt, input) {
    const events = [], cat = world.cat, dir = input.play === false ? 0 : (input.dir || 0);
    if (dir !== cat.dir) { cat.hold = 0; cat.sprint = 0; cat.dir = dir; }
    if (input.doubleTap && dir) cat.sprint = dir;
    if (dir) cat.hold += dt;
    if (!dir) { cat.hold = 0; cat.sprint = 0; }
    if (cat.turn > 0) cat.turn = Math.max(0, cat.turn - dt);
    if (dir && dir !== cat.face && Math.abs(cat.vx) < 25 && cat.turn === 0 && !cat.air) { cat.face = dir; cat.turn = .36; }
    const speed = input.walkOnly ? GAIT.walk : cat.hold >= GAIT.hold || cat.sprint === dir ? GAIT.trot : GAIT.walk;
    const target = dir === cat.face && cat.turn === 0 ? dir * speed : 0;
    const oldX = cat.x;
    if (!cat.air) cat.vx = approach(cat.vx, target, 260 * (1 - .8 * (cat.fl ? 0 : slipAt(cat.x, def))) * dt);
    cat.x += cat.vx * dt;
    if (!cat.air && floorAt(cat.x, cat.fl, def) < cat.fl) { cat.air = true; cat.fl = floorAt(cat.x, cat.fl, def); }
    if (cat.air) {
      const oldHeight = cat.h; cat.vy -= 2600 * dt; cat.h += cat.vy * dt;
      const landing = floorAt(cat.x, oldHeight, def);
      if (cat.vy <= 0 && cat.h <= landing) {
        cat.h = cat.fl = landing; cat.vy = 0; cat.air = false; cat.vx *= .55; cat.hold = 0; cat.sprint = 0;
        if (landing && !world.landings.includes(landing)) world.landings.push(landing);
        events.push({ k: 'land', y: landing });
      }
    }
    world.pushPose = { i: -1, t: 0, force: 0 };
    world.heatCool = Math.max(0, world.heatCool - dt);
    for (let i = 0; i < world.trays.length; i++) {
      const tray = world.trays[i], spec = def.trays[i], pad = def.plates[i];
      tray.flash = Math.max(0, tray.flash - dt);
      if (tray.set) continue;
      if (tray.returning) {
        tray.contact = 0; tray.pushing = false; tray.v = approach(tray.v, -85, 180 * dt); tray.x += tray.v * dt;
        if (tray.x <= spec.home) { tray.x = spec.home; tray.v = 0; tray.returning = tray.missed = false; }
        continue;
      }
      if (tray.missed) {
        // Even a marginally-too-fast arrival gets conveyed to the bumper;
        // it cannot lose momentum just beyond the mat and strand the retry.
        tray.contact = 0; tray.pushing = false; tray.v = approach(tray.v, 85, 60 * dt);
      }
      const slick = traySlip(tray, spec, def), contact = dir > 0 && cat.face === 1 && cat.x >= tray.x - NOSE - 2 && oldX <= tray.x && !cat.air && cat.fl === 0 && cat.turn === 0;
      const onPad = tray.x >= pad.x && tray.x + spec.w <= pad.x + pad.w;
      const capturing = onPad && !tray.missed && Math.abs(tray.v) <= pad.catchSpeed;
      if (contact && !capturing && !tray.missed) {
        if (!tray.pushing) {
          tray.pushing = true; world.pushes++; events.push({ k: 'brace', i });
          // A light tray skids off at first touch: that is the nudge. It takes the cat's pace up to a walk's
          // (a trot arriving after a long hold mustn't doom the first try); leaning on is what adds more.
          const nudge = Math.min(cat.vx, GAIT.walk) * (spec.bump || 0);
          if (nudge > tray.v) { tray.v = nudge; tray.flash = .3; events.push({ k: 'push', i }); }
        }
        tray.contact += dt;
        const build = cap((tray.contact - .25) / (.5 + spec.mass * .1), 0, 1), force = (speed === GAIT.trot ? 6.2 : 4.3) * build;
        world.pushPose = { i, t: tray.contact, force: build };
        if (tray.v === 0 && force > spec.mass * (slick ? .12 : 1)) { tray.v = 4; tray.flash = .3; events.push({ k: 'push', i }); }
        if (tray.v > 0) {
          const resistance = spec.mass * .65 * (slick ? .08 : 1);
          tray.v = cap(tray.v + (force - resistance) * 45 / spec.mass * dt, 0, slick ? 210 : (speed === GAIT.trot ? 136 : 80) / spec.mass);
        }
      } else {
        tray.contact = 0; tray.pushing = false;
        if (!tray.missed) tray.v = approach(tray.v, 0, trayDrag(tray, spec, def) * dt);
      }
      tray.x += tray.v * dt;
      // Overshoots engage a visible motorized return belt, not a cat-speed
      // bounce multiplier. It delivers every miss to the reachable home apron.
      if (tray.x > spec.end - spec.w) {
        tray.x = spec.end - spec.w; tray.v = -25; tray.returning = true;
        tray.contact = 0; tray.pushing = false; tray.seat = 0; tray.flash = .5; events.push({ k: 'bumper', i });
        if (world.pushPose.i === i) world.pushPose = { i: -1, t: 0, force: 0 };
      }
      if (tray.x <= spec.home && tray.v < 0) { tray.x = spec.home; tray.v = 0; }
      if (!tray.returning && tray.x >= pad.x && tray.x + spec.w <= pad.x + pad.w) {
        if (tray.v > pad.catchSpeed && !tray.missed) { tray.missed = true; tray.flash = .5; events.push({ k: 'miss', i }); }
        if (!tray.missed) {
          tray.v = approach(tray.v, 0, 1100 * dt);
          if (Math.abs(tray.v) < 2) { tray.v = 0; tray.seat += dt; }
        }
      } else tray.seat = 0;
      if (tray.seat >= .8) { tray.set = true; tray.x = pad.x + (pad.w - spec.w) / 2; tray.v = 0; events.push({ k: 'plate', i }); }
    }
    // The weight puzzle precedes every takeoff; its approach stays accessible.
    for (let i = 0; i < world.trays.length; i++) {
      const tray = world.trays[i]; if (!tray.set && cat.x > tray.x - NOSE) { cat.x = tray.x - NOSE; cat.vx = Math.min(tray.v, cat.vx); }
    }
    // On grip the feet follow the weight. On oil, motion stays independent:
    // the tray can outrun the paws and pushing ends when contact is lost.
    if (world.pushPose.i >= 0) { const i = world.pushPose.i, tray = world.trays[i]; if (!tray.returning && !traySlip(tray, def.trays[i], def)) { cat.x = tray.x - NOSE; cat.vx = tray.v; } }
    cat.x = Math.max(104, Math.min(def.w - 16, cat.x));
    if (!gateOpen(world) && cat.x > def.gate.x - NOSE) { cat.x = def.gate.x - NOSE; cat.vx = Math.min(0, cat.vx); }
    if (!world.got && cat.x > def.exit.x + 10 - NOSE) { cat.x = def.exit.x + 10 - NOSE; cat.vx = Math.min(0, cat.vx); }
    if (world.trays.every(p => p.set)) { world.gateTime += dt; if (world.gateTime >= 1 && world.gateTime - dt < 1) events.push({ k: 'open' }); }
    def.produce.forEach((p, i) => {
      const item = world.produce[i], distance = Math.abs(p.x - cat.x);
      item.cool = Math.max(0, item.cool - dt); item.flash = Math.max(0, item.flash - dt);
      if (item.cool === 0 && distance > 280) item.armed = true;
      if (p.kind !== 'crooked' && item.armed && !cat.air && cat.fl === p.y && cat.turn === 0 && cat.face === Math.sign(p.x - cat.x) && distance < p.range) {
        item.armed = false; item.cool = 2; item.flash = 1;
        world.startles++; cat.vx = (p.leap ? 1 : -1) * cat.face * p.kick; cat.vy = p.jump; cat.air = true; events.push({ k: 'startle', i, vy: p.jump });
      }
    });
    // The grill's narrow pale edge is safe only at a careful approach.
    if (cat.x + 30 > def.grill.x && cat.x - 30 < def.grill.x + def.grill.w && !cat.air && cat.fl === 0 && Math.abs(cat.vx) > 120 && world.heatCool === 0) {
      cat.vx = -Math.sign(cat.vx) * 240; cat.vy = 320; cat.air = true; world.heatCool = 1.5; world.grillHits++; events.push({ k: 'heat', vy: 320 });
    }
    eggStep(world, def, dt, events);
    return events;
  }
  function eggStep(world, def, dt, events) {
    const cat = world.cat, egg = world.egg, item = def.produce.find(p => p.kind === 'crooked'), d = item.x - cat.x;
    if (egg.t >= 0) egg.t += dt;
    if (egg.done) return;
    const near = Math.abs(d) < item.range && !cat.air && cat.fl === item.y, facing = cat.face === Math.sign(d);
    if (!near) { egg.approach = false; egg.wait = 0; return; }
    if (facing && cat.vx * cat.face > 8 && Math.abs(cat.vx) <= GAIT.walk + 5 && cat.hold < GAIT.hold && !cat.sprint) egg.approach = true;
    if (facing && Math.abs(cat.vx) < 8 && egg.approach) egg.wait += dt; else egg.wait = 0;
    if (egg.wait >= .9) { egg.done = true; egg.t = 0; events.push({ k: 'egg' }); }
  }

  // lift[i]: seconds since tray i was seated. Drawing only (the service lift
  // takes the tray down, then closes flush); the rules never read it.
  let state = fresh(layout), remainder = 0, pendingDir = 0, lastPlay = false, scrapeClock = 0, sizzleClock = 0, rattleClock = 0, repairAge = -1, drivePhase = 0, lift = layout.trays.map(() => 0);
  function reset() { if (!mine()) return; state = fresh(room); remainder = 0; pendingDir = 0; lastPlay = false; scrapeClock = sizzleClock = rattleClock = 0; repairAge = -1; drivePhase = 0; if (installed.has(room.part.id)) { state.got = true; repairAge = 2; state.trays.forEach((p, i) => { p.set = true; p.x = room.plates[i].x + (room.plates[i].w - room.trays[i].w) / 2; }); state.gateTime = 2; } lift = state.trays.map(p => p.set ? 9 : 0); }
  function update(dt, c, inputDir) {
    if (!live()) return;
    if (st.got && !state.got) { repairAge = 0; caption('galRepair'); sfx('spinup', { x: room.socket.x, mag: .65 }); }
    state.got = st.got;
    if (state.got) { repairAge += dt; drivePhase += dt * 2.3 * Math.min(1, repairAge / 1.2); }
    state.trays.forEach((p, i) => { if (p.set) lift[i] += dt; });
    // The shared pickup watches a hip gear over its shoulder. Here the part
    // flies into a machine in front of the cat, well above its silhouette.
    if (mode === 'pounce' && (st.pk.flying || st.pk.home)) {
      Object.assign(c, { headYaw: .35, lookX: .65, lookY: -.85, headFwd: 4, headDrop: -9, headPitch: .12, headTilt: 0, earL: -14, earR: -12, lid: 0, pupil: .7 });
      if (st.pk.home) c.mouth = repairAge < .6 ? .3 : .7;
    }
    lastPlay = mode === 'play'; if (!lastPlay) return;
    remainder += dt;
    const movement = latch ? 0 : (inputDir ?? dirInput());
    if (movement) pendingDir = movement;
    const ev = [];
    while (remainder >= DT) { ev.push(...stepWorld(state, room, DT, { dir: movement || pendingDir, doubleTap: !!sprint })); remainder -= DT; pendingDir = 0; }
    const cat = state.cat, slip = cat.fl ? 0 : slipAt(cat.x);
    rig.setFloor(cat.fl, cat.air && !rig.air);
    Object.assign(c, { kin: cat.vx, face: cat.face, slip, accel: 260 * (1 - .8 * slip) });
    const strainT = state.pushPose.t;
    if (strainT > 0) {
      const i = state.pushPose.i, tray = state.trays[i], slick = traySlip(tray, room.trays[i], room);
      const k = Math.min(1, strainT / .3) * (.55 + .45 * state.pushPose.force) * (slick ? .35 : 1);
      Object.assign(c, { crouch: .42 * k, pitch: -.15 * k, headDrop: 14 * k, headPitch: -.32 * k, earL: 40 * k, earR: 36 * k, lid: .35, strain: state.pushPose.force, hindReach: -16 * k, gaitRate: 0, tailStiff: 1.4, tailBase: 174, wagAmp: 1 });
      c.manual.FN = { x: tray.x - 2, y: 15, ang: 1.45, rate: 9 }; c.manual.FF = { x: tray.x - 2, y: 20, ang: 1.45, rate: 8 };
      const hind = rig.leg('HN'), far = rig.leg('HF');
      if (hind.planted && far.planted && -(rig.footErr(hind) + rig.footErr(far)) / 2 > 12) rig.forceStep(Math.floor(strainT / .28) % 2 ? 'HN' : 'HF', .2);
    }
    if (cat.air || state.heatCool > 1) { Object.assign(c, { earL: 68, earR: 62, lid: 0, pupil: 1, mouth: -.6, tailBase: 205, tailCurve: 0, earFlick: false }); }
    if (state.egg.wait > 0 && !state.egg.done) Object.assign(c, { headDrop: 9, headPitch: -.25, headFwd: 6, earL: -8, earR: -4, lookX: 1, lid: .2, wagAmp: 1 });
    for (const e of ev) {
      const tx = ['brace', 'push', 'plate', 'bumper', 'miss'].includes(e.k) ? state.trays[e.i].x + room.trays[e.i].w / 2 : rig.x;
      if (e.k === 'startle' || e.k === 'heat') {
        rig.jump(e.vy, cat.vx); st.oops = 0; caption(e.k === 'startle' ? (e.i === 0 ? 'galGreen' : 'galPepper') : 'galHeat');
        sfx(e.k === 'startle' ? 'galStartle' : 'galHeat', { x: rig.x }); rig.tailFlick(4); shake = Math.max(shake, 2 * calmK());
        FX.ring(rig.x, GY - cat.fl, .5);
      }
      if (e.k === 'brace') { const load = room.trays[e.i].load; caption(load === 'pot' ? 'galHeavy' : load === 'cups' ? 'galLight' : 'galPush'); sfx('galClatter', { x: tx, mag: load === 'cups' ? .6 : .45, rate: load === 'pot' ? .65 : load === 'cups' ? 1.3 : .8 }); }
      if (e.k === 'push') {                      // breaking free, scaled to the load (room 1's crate is the full crack); the cups just chink
        const h = HEFT[room.trays[e.i].load] ?? 1;
        if (h > .15) sfx('unstick', { x: tx, mag: .25 + .6 * h, rate: 1.6 - .9 * h }); else sfx('galClink', { x: tx, mag: .8, rate: 1.1 });
        FX.dust(tx, GY, 3, .4, -1);
      }
      if (e.k === 'plate') { caption('galPlate'); sfx('galChunk', { x: tx }); sfx('galRoll', { x: tx, mag: .35, rate: .55, delay: .15 }); FX.ring(tx, GY, .5); }
      if (e.k === 'miss') caption('galBump');
      if (e.k === 'bumper') { caption('galBump'); sfx('galClatter', { x: tx, mag: 1.1, rate: .8 }); FX.dust(tx, GY, 4, .5, -1); }
      if (e.k === 'open') caption('galOpen');
      if (e.k === 'egg') { if (typeof EGGS !== 'undefined') EGGS.mark('produce'); console.log('GPT-6.1-Sol in Codex · REJECTED PRODUCE · Failed the cat scan.'); sfx('galStartle', { x: room.produce[2].x, mag: .4, rate: .8 }); }
    }
    if (!cat.fl && (slipAt(cat.x) > 0 || state.trays.some((p, i) => !p.set && traySlip(p, room.trays[i], room) > 0))) caption('galSlick');
    st.cable = state.trays.every(p => p.set) ? 1 : 0;
  }
  function after() { if (live() && lastPlay && mode === 'play') { rig.x = state.cat.x; rig.vx = state.cat.vx; } else if (live()) { Object.assign(state.cat, { x: rig.x, vx: rig.vx, face: rig.facing }); } }
  function blocks() { return live() ? solids(state, room) : []; }
  const intent = (dir, toward) => !mine() || dir === toward;
  // How heavy each load sounds, on room 1's crate scale (1 = the crate): the shared strain
  // loop and the break-free crack both take it, so no tray drags like the crate.
  const HEFT = { pot: .3, plates: .1, cups: .08 };
  function strain() {
    if (!live()) return false;
    if (mode === 'play' && state.pushPose.t > 0 && !traySlip(state.trays[state.pushPose.i], room.trays[state.pushPose.i], room)) { const i = state.pushPose.i; AUDIO.start('strain', { amt: state.pushPose.force, slide: Math.abs(state.trays[i].v) / 50, weight: HEFT[room.trays[i].load] ?? 1 }); }
    else AUDIO.stop('strain');
    return true;
  }
  function audio(dt) {
    if (!live() || mode !== 'play') { scrapeClock = sizzleClock = rattleClock = 0; return; }
    scrapeClock -= dt; sizzleClock -= dt; rattleClock -= dt;
    const moving = state.trays.map((p, i) => ({ p, i })).filter(o => Math.abs(o.p.v) > 4);
    const near = moving.length ? moving.sort((a, b) => Math.abs(a.p.x - rig.x) - Math.abs(b.p.x - rig.x))[0] : null;
    // Each weight drags its own way: the pot grinds low and slow, the plates
    // scrape and glide, the cups barely skitter. Then each load rattles its own way.
    if (scrapeClock <= 0) {
      scrapeClock = .2;
      if (near) {
        const { p, i } = near, v = Math.abs(p.v), load = room.trays[i].load, glide = p.returning || traySlip(p, room.trays[i], room) > 0;
        if (load === 'pot') { sfx('galGrind', { x: p.x, mag: glide ? .3 + Math.min(.3, v / 300) : Math.min(1, v / 25), rate: (glide ? .8 : .6) + Math.min(.4, v / 200) }); scrapeClock = .27; }
        else if (load === 'cups') { sfx('galRoll', { x: p.x, mag: .07 + Math.min(.13, v / 900), rate: 1.5 + Math.min(.8, v / 150) }); scrapeClock = .13; }
        else sfx(glide ? 'galRoll' : 'galScrape', { x: p.x, mag: glide ? .18 + Math.min(.22, v / 600) : Math.min(1, v / 50), rate: .65 + Math.min(1.1, v / 100) });
      }
    }
    if (rattleClock <= 0) {
      rattleClock = .1;
      if (near && Math.abs(near.p.v) > 12) {
        const { p, i } = near, v = Math.abs(p.v), load = room.trays[i].load, k = Math.min(1, v / 120);
        if (load === 'cups') { sfx('galClink', { x: p.x, mag: .3 + .5 * k, rate: .95 + Math.random() * .55 }); rattleClock = (.05 + Math.random() * .16) * (1.6 - k); }
        else if (load === 'plates') { sfx('galClink', { x: p.x, mag: .2 + .25 * k, rate: .48 + Math.random() * .1 }); rattleClock = .2 + Math.random() * .35 * (1.4 - k); }
        else if (load === 'pot' && v > 18) { sfx('galLid', { x: p.x, mag: .3 + .5 * k, rate: .92 + Math.random() * .16 }); rattleClock = .35 + Math.random() * .6 * (1.4 - k); }
      }
    }
    if (sizzleClock <= 0) { const near = 1 - Math.min(1, Math.abs(rig.x - (room.grill.x + room.grill.w / 2)) / 550); if (near > .03) sfx('galSizzle', { x: room.grill.x, mag: near * .55 }); sizzleClock = .2; }
  }

  // Cache the tiled wall/cupboards once. Steam and ladles are a few paths;
  // no large filters, glow buffers, assets or per-frame background rebuild.
  let backdrop = null;
  const LIGHTS = [410, 1200, 1860, 2520, 3180];
  function bakeWall() {
    const canvas = document.createElement('canvas'); canvas.width = layout.w; canvas.height = GY + 32;
    const d = canvas.getContext('2d');
    d.fillStyle = '#292d30'; d.fillRect(0, 0, canvas.width, canvas.height);
    const warm = d.createLinearGradient(0, 0, 0, GY); warm.addColorStop(0, '#6c6959'); warm.addColorStop(.55, '#a49b7e'); warm.addColorStop(1, '#4b5150'); d.fillStyle = warm; d.fillRect(0, 35, layout.w, GY - 60);
    d.strokeStyle = 'rgba(30,35,34,.35)'; d.lineWidth = 2;
    for (let y = 35; y < GY - 90; y += 32) { d.beginPath(); d.moveTo(0, y); d.lineTo(layout.w, y); d.stroke(); for (let x = (y % 64 ? 0 : 32); x < layout.w; x += 64) { d.beginPath(); d.moveTo(x, y); d.lineTo(x, y + 32); d.stroke(); } }
    for (let x = 56; x < layout.gate.x - 40; x += 200) {
      const steel = d.createLinearGradient(x, 0, x + 175, 0); steel.addColorStop(0, '#858d8a'); steel.addColorStop(.5, '#515b5a'); steel.addColorStop(1, '#343d3e');
      d.fillStyle = steel; d.fillRect(x, GY - 112, 175, 77); d.strokeStyle = '#252f2f'; d.lineWidth = 2; d.strokeRect(x, GY - 112, 175, 77);
      d.beginPath(); d.moveTo(x + 88, GY - 110); d.lineTo(x + 88, GY - 36); d.stroke(); d.fillStyle = '#b4b8a7'; d.fillRect(x + 73, GY - 91, 6, 20); d.fillRect(x + 99, GY - 91, 6, 20);
      d.fillStyle = '#c2c1ad'; d.fillRect(x - 5, GY - 118, 185, 6); d.fillStyle = '#181e20'; d.fillRect(x, GY - 35, 175, 10);
      d.fillStyle = 'rgba(229,214,164,.32)'; d.fillRect(x, GY - 115, 172, 1);
    }
    d.fillStyle = '#222b2d'; d.fillRect(0, 14, layout.w, 20); d.fillStyle = '#a6a48c'; d.fillRect(0, 34, layout.w, 3);
    d.font = '600 42px sans-serif'; d.fillStyle = 'rgba(35,41,37,.55)'; d.fillText('GALLEY / MESS', 260, 102);
    d.font = '11px monospace'; d.fillStyle = '#d2c5a1'; d.fillText('PLEASE RETURN YOUR TRAYS. THE VEGETABLES ARE NOT STAFF.', 263, 123);
    for (const x of LIGHTS) { d.fillStyle = '#333c3c'; d.fillRect(x - 63, 22, 126, 13); d.fillStyle = '#e5cb8f'; d.fillRect(x - 55, 32, 110, 3); }
    // Pass-through and a battered planetary mixer. Its missing gear is
    // installed by the game's existing socket/pounce animation. Drawn for a
    // gate at 2560 and shifted to wherever the gate is now.
    d.save(); d.translate(layout.gate.x - 2560, 0);
    d.fillStyle = '#121e22'; d.fillRect(2608, 77, 218, 188); d.strokeStyle = '#a9aaa0'; d.lineWidth = 7; d.strokeRect(2608, 77, 218, 188);
    d.fillStyle = '#949789'; d.fillRect(2692, GY - 176, 24, 161); d.fillRect(2692, GY - 179, 130, 18); d.fillRect(2690, GY - 17, 117, 12);
    d.fillStyle = '#485858'; d.fillRect(2700, GY - 155, 9, 115);
    d.fillStyle = '#778f8b'; d.fillRect(2732, GY - 209, 92, 82); d.strokeStyle = '#c8caba'; d.lineWidth = 2; d.strokeRect(2732, GY - 209, 92, 82);
    d.fillStyle = '#bfc5b6'; d.beginPath(); d.ellipse(2778, GY - 30, 25, 13, 0, 0, Math.PI); d.fill();
    d.strokeStyle = '#d9ddc8'; d.lineWidth = 2; d.beginPath(); d.ellipse(2778, GY - 30, 25, 8, 0, 0, Math.PI * 2); d.stroke();
    d.fillStyle = '#d7ba7f'; d.font = '10px monospace'; d.fillText('PLANETARY DRIVE', 2668, 64);
    d.fillStyle = '#bfc2ad'; d.fillRect(2630, GY - 5, 130, 5); d.fillStyle = '#343f40'; d.fillRect(2634, GY + 1, 122, 4);
    d.restore();
    return canvas;
  }
  function wall(g, t) {
    if (!live()) return false;
    if (!backdrop) backdrop = bakeWall(); g.fillStyle = '#242b2d'; g.fillRect(camX - 5, -90, W + 10, GY + 90); g.drawImage(backdrop, 0, 0);
    // Warm cones behind everything. STEADY holds their brightness constant.
    for (const x of LIGHTS) {
      if (x < camX - 180 || x > camX + W + 180) continue;
      const glow = g.createLinearGradient(0, 35, 0, GY); glow.addColorStop(0, 'rgba(255,218,142,.16)'); glow.addColorStop(1, 'rgba(255,218,142,0)'); g.fillStyle = glow;
      g.beginPath(); g.moveTo(x - 55, 35); g.lineTo(x + 55, 35); g.lineTo(x + 165, GY - 28); g.lineTo(x - 165, GY - 28); g.fill();
    }
    const small = settings.calm ? .2 : 1;
    for (let i = 0; i < 7; i++) {
      const x = 970 + i * 36; if (x < camX - 30 || x > camX + W + 30) continue;
      g.save(); g.translate(x, 116); g.rotate(Math.sin(t * .8 + i) * .03 * small); g.strokeStyle = '#c4c8b8'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 47 + i % 3 * 7); g.stroke(); g.fillStyle = '#929e97'; g.beginPath(); g.ellipse(0, 53 + i % 3 * 7, 8, 11, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    // A pot has a broad lid: the steam has a clear visual source.
    g.fillStyle = '#657273'; g.fillRect(1157, GY - 147, 48, 30); g.fillStyle = '#c5c7b5'; g.fillRect(1153, GY - 149, 56, 4); g.fillStyle = '#353d3c'; g.fillRect(1177, GY - 155, 10, 6);
    return true;
  }
  function deck(g, t) {
    if (!live()) return;
    room.counters.forEach((p, i) => {
      const top = GY - p.y;
      g.fillStyle = '#273837';
      if (i === 0) { for (const x of [p.x + 14, p.x + p.w - 22]) { g.fillRect(x, top + 9, 8, p.y - 9); g.fillStyle = '#a8b4a9'; g.fillRect(x, top + 10, 2, p.y - 13); g.fillStyle = '#273837'; } }
      else { for (let x = p.x + 40; x < p.x + p.w; x += 180) { g.beginPath(); g.moveTo(x, top + 7); g.lineTo(x + 32, top + 34); g.lineTo(x + 32, top + 7); g.closePath(); g.fill(); } }
      g.fillStyle = '#aab9ae'; g.fillRect(p.x - 4, top - 5, p.w + 8, 7); g.fillStyle = '#495e57'; g.fillRect(p.x, top + 2, p.w, 7);
      g.fillStyle = '#e2e6c9'; g.fillRect(p.x - 4, top - 5, p.w + 8, 1); g.font = '9px monospace'; g.fillStyle = '#d4d6ba'; g.fillText(p.name, p.x + 20, top + 21);
      g.fillStyle = '#aac1a0'; g.beginPath(); g.moveTo(p.x + 20, top - 18); g.lineTo(p.x + 30, top - 18); g.lineTo(p.x + 30, top - 23); g.lineTo(p.x + 39, top - 16); g.lineTo(p.x + 30, top - 9); g.lineTo(p.x + 30, top - 14); g.lineTo(p.x + 20, top - 14); g.closePath(); g.fill();
    });
    drawSignature(g);
    for (const strip of room.slick) {
      g.fillStyle = '#726c48'; g.fillRect(strip.x, GY - 23, strip.w, 25);
      g.strokeStyle = 'rgba(223,215,133,.45)'; g.lineWidth = 1;
      for (let x = strip.x + 12; x < strip.x + strip.w; x += 65) { g.beginPath(); g.ellipse(x, GY - 10, 25, 3, -.02, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#d0bc78'; g.font = '9px monospace'; g.fillText(strip === room.slick[0] ? 'SLICK · RELEASE EARLY' : 'SLICK', strip.x + 10, GY - 29);
    }
    room.plates.forEach((pad, i) => {
      const tray = state.trays[i], lit = tray.set, L = lift[i];
      g.fillStyle = '#161e20'; g.fillRect(pad.x - 3, GY - 23, pad.w + 6, 26); g.fillStyle = lit ? '#626f61' : '#3e4941'; g.fillRect(pad.x, GY - 19, pad.w, 20);
      g.strokeStyle = lit ? '#a1ddb1' : '#a79869'; g.lineWidth = 1.5; g.strokeRect(pad.x, GY - 20, pad.w, 21);
      g.strokeStyle = 'rgba(18,24,22,.7)'; for (let x = pad.x + 5; x < pad.x + pad.w; x += 8) { g.beginPath(); g.moveTo(x, GY - 17); g.lineTo(x, GY - 1); g.stroke(); }
      // While the lift is down: an open shaft, then the two leaves close back flush.
      if (lit && L < LIFT_SHUT) {
        const close = Math.max(0, (L - LIFT_DOWN) / (LIFT_SHUT - LIFT_DOWN)), leaf = pad.w / 2 * close * close * (3 - 2 * close);
        g.fillStyle = '#07090a'; g.fillRect(pad.x, GY - 20, pad.w, 21);
        g.fillStyle = 'rgba(255,214,140,.10)'; g.fillRect(pad.x + 6, GY - 20, pad.w - 12, 3);
        g.fillStyle = '#4f5c55'; g.fillRect(pad.x, GY - 20, leaf, 21); g.fillRect(pad.x + pad.w - leaf, GY - 20, leaf, 21);
      }
      // corner bolts: a lift top, not just a mat
      g.fillStyle = '#8f9a8c'; for (const [bx, by] of [[pad.x + 3, GY - 17], [pad.x + pad.w - 5, GY - 17], [pad.x + 3, GY - 4], [pad.x + pad.w - 5, GY - 4]]) g.fillRect(bx, by, 2, 2);
      g.fillStyle = lit ? '#8fefae' : '#d5a664'; g.beginPath(); g.arc(pad.x + pad.w / 2, GY - 34, 3.5, 0, Math.PI * 2); g.fill();
      g.font = '9px monospace'; g.fillText(lit ? (L < LIFT_SHUT ? 'ORDER UP' : 'DELIVERED') : tray.missed ? 'TOO FAST · RETURN' : tray.seat > 0 ? 'SETTLING' : 'SERVICE LIFT · SLOW', pad.x + 4, GY - 43);
      if (tray.seat > 0 && !lit) { g.fillStyle = '#92d7a3'; g.fillRect(pad.x, GY + 4, pad.w * Math.min(1, tray.seat / .8), 2); }
    });
    state.trays.forEach((tray, i) => {
      const spec = room.trays[i];
      if (tray.x > camX - 140 && tray.x < camX + W + 40 && (!tray.set || lift[i] < LIFT_DOWN)) {
        // Seated: the lift lowers it (eased) into the shaft; the deck's front edge hides what has gone below.
        const u = tray.set ? Math.min(1, lift[i] / LIFT_DOWN) : 0, sink = u * u * ({ plates: 44, pot: 72, cups: 42 }[spec.load] || 60);
        g.save(); if (tray.set) { g.beginPath(); g.rect(tray.x - 30, -200, spec.w + 60, GY + 200); g.clip(); }
        drawTray(g, tray.x, GY + sink, spec, tray, t, i);
        g.restore();
      }
      const bx = spec.end, compression = tray.flash * 6;
      g.fillStyle = '#394643'; g.fillRect(bx - 4, GY - 29, 10, 28); g.fillStyle = '#a2ae84'; g.fillRect(bx - 5 - compression, GY - 27, 5 + compression, 23); g.strokeStyle = '#263b37'; g.lineWidth = 1; g.strokeRect(bx - 5 - compression, GY - 27, 5 + compression, 23);
      g.font = '8px monospace'; g.fillStyle = '#c1c7a4'; g.fillText('RETURN', bx - 18, GY - 34);
      const beltActive = tray.returning || tray.missed, beltDir = tray.missed && !tray.returning ? 1 : -1;
      g.fillStyle = '#263b38'; g.fillRect(spec.home, GY + 7, spec.end - spec.home, 12); g.strokeStyle = beltActive ? '#d7c085' : '#72806d'; g.lineWidth = 1;
      for (let x = spec.home + 8; x < spec.end - 6; x += 24) { const shift = beltActive ? beltDir * (t * 85) % 24 : 0; g.beginPath(); g.moveTo(x + shift - beltDir * 6, GY + 10); g.lineTo(x + shift, GY + 13); g.lineTo(x + shift - beltDir * 6, GY + 16); g.stroke(); }
      g.font = '8px monospace'; g.fillStyle = beltActive ? '#f0d49a' : '#88947c'; g.fillText(tray.returning ? 'RETURNING · TRY AGAIN' : tray.missed ? 'TO THE RETURN' : 'RETURN BELT', spec.home + 10, GY + 30);
    });
    const hot = room.grill;
    g.fillStyle = '#ded2ae'; g.fillRect(hot.x - 6, GY - 25, hot.w + 12, 27); g.fillStyle = '#7b5036'; g.fillRect(hot.x, GY - 22, hot.w, 22);
    for (let x = hot.x + 3; x < hot.x + hot.w; x += 7) { g.fillStyle = '#efb16a'; g.fillRect(x, GY - 21, 2, 18); g.fillStyle = '#303b39'; g.fillRect(x + 2, GY - 21, 3, 18); }
    g.fillStyle = '#f1c797'; g.font = '9px monospace'; g.fillText('HOT · COUNTER ABOVE', hot.x - 5, GY - 39);
    g.strokeStyle = 'rgba(207,199,160,.3)'; g.beginPath(); g.moveTo(room.plates[0].x, GY + 23); g.lineTo(room.gate.x + 15, GY + 23); g.stroke();
    state.trays.forEach((p, i, a) => { g.fillStyle = p.set ? '#a0d3a0' : '#5f6553'; g.fillRect(room.gate.x - 14 - (a.length - 1 - i) * 14, GY - 48, 7, 7); });
    drawProduce(g, t);
  }
  const LIFT_DOWN = 1.1, LIFT_SHUT = 1.55;
  // A stainless service tray on two greasy runners: rolled rim, cut-out
  // handles, and a load that says how heavy it is. Loads rattle with speed
  // (not under STEADY). y is the floor line under the runners.
  function drawTray(g, x, y, spec, tray, t, i) {
    const w = spec.w, v = Math.abs(tray.v), rattle = settings.calm ? 0 : Math.min(1, v / 80) * (spec.load === 'cups' ? 1.6 : spec.load === 'pot' ? .4 : 1);
    const jx = k => Math.sin(t * 41 + k * 2.3) * rattle, jy = k => -Math.abs(Math.sin(t * 33 + k * 1.7)) * rattle * 1.4;
    softEllipse(g, x + w / 2, y, w * .55, 3, .35);
    g.fillStyle = '#1f2729'; g.fillRect(x + 7, y - 4, w * .28, 4); g.fillRect(x + w - 7 - w * .28, y - 4, w * .28, 4);
    g.fillStyle = 'rgba(222,206,128,.55)'; g.fillRect(x + 7, y - 1, w * .28, 1); g.fillRect(x + w - 7 - w * .28, y - 1, w * .28, 1);   // grease on the runners
    const pan = g.createLinearGradient(0, y - 17, 0, y - 4); pan.addColorStop(0, '#eef1e8'); pan.addColorStop(.3, '#aab6b2'); pan.addColorStop(1, '#4f5f63');
    g.fillStyle = pan; g.beginPath(); g.moveTo(x - 2, y - 17); g.lineTo(x + w + 2, y - 17); g.lineTo(x + w - 3, y - 4); g.lineTo(x + 3, y - 4); g.closePath(); g.fill();
    g.strokeStyle = '#26353a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#f6f7f0'; g.fillRect(x - 3, y - 19, w + 6, 2.5); g.fillStyle = '#7d8b8a'; g.fillRect(x - 3, y - 16.5, w + 6, 1);   // rolled rim
    g.fillStyle = '#1d282b'; for (const hx of [x + 4, x + w - 15]) { g.beginPath(); g.ellipse(hx + 5.5, y - 11, 5.5, 2.2, 0, 0, Math.PI * 2); g.fill(); }   // handle slots
    const top = y - 19, cx = x + w / 2;
    if (spec.load === 'plates') {
      // a stack of plates and a mug
      for (let k = 0; k < 5; k++) {
        const py = top - 2 - k * 3.2, px = cx - 8 + jx(k) * .6;
        g.fillStyle = k % 2 ? '#e9e6da' : '#f4f1e6'; g.beginPath(); g.ellipse(px, py, w * .3, 2.4, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#5f7c8e'; g.lineWidth = .8; g.beginPath(); g.ellipse(px, py, w * .3, 2.4, 0, .15, Math.PI - .15); g.stroke();
      }
      const mx = x + w - 22 + jx(9), my = top + jy(9);
      g.fillStyle = '#c9583e'; g.fillRect(mx, my - 15, 13, 15); g.fillStyle = '#e7866a'; g.fillRect(mx + 2, my - 14, 2, 12);
      g.strokeStyle = '#c9583e'; g.lineWidth = 2.4; g.beginPath(); g.arc(mx + 14, my - 8, 4, -Math.PI / 2, Math.PI / 2); g.stroke();
      g.fillStyle = '#5a2c1e'; g.fillRect(mx + 1, my - 15, 11, 2);
    } else if (spec.load === 'pot') {
      // a big stock pot: the weight is obvious before it's pushed
      const pw = w * .7, px = cx - pw / 2 + jx(1) * .5, ph = 40, py = top - ph;
      const steel = g.createLinearGradient(px, 0, px + pw, 0); steel.addColorStop(0, '#5d6a6c'); steel.addColorStop(.25, '#d6dcd6'); steel.addColorStop(.55, '#8d999a'); steel.addColorStop(1, '#3f4b4e');
      g.fillStyle = steel; g.beginPath(); g.moveTo(px, py); g.lineTo(px + pw, py); g.lineTo(px + pw, top - 4); g.quadraticCurveTo(px + pw, top, px + pw - 5, top); g.lineTo(px + 5, top); g.quadraticCurveTo(px, top, px, top - 4); g.closePath(); g.fill();
      g.strokeStyle = '#263235'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = '#2f3b3e'; g.lineWidth = 3; for (const sx of [-1, 1]) { const hx = sx < 0 ? px : px + pw; g.beginPath(); g.moveTo(hx, py + 8); g.quadraticCurveTo(hx + sx * 9, py + 10, hx, py + 16); g.stroke(); }
      g.fillStyle = '#e8ebe2'; g.fillRect(px - 3, py - 4, pw + 6, 4); g.fillStyle = '#9aa6a4'; g.beginPath(); g.ellipse(cx + jx(1) * .5, py - 4, pw / 2 + 1, 4, 0, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = '#2f3b3e'; g.fillRect(cx - 5, py - 12, 10, 5);
      g.fillStyle = 'rgba(40,48,50,.75)'; g.font = 'bold 8px monospace'; g.fillText('STOCK', cx - 13, py + 24);
      if (!settings.calm) { g.strokeStyle = 'rgba(235,226,200,.28)'; g.lineWidth = 1.5; for (let k = 0; k < 2; k++) { const u = (t * .4 + k * .5) % 1; g.beginPath(); g.moveTo(cx - 6 + k * 12, py - 12 - u * 8); g.quadraticCurveTo(cx - 12 + k * 12 + Math.sin(t * 2 + k) * 5, py - 24 - u * 14, cx - 4 + k * 10, py - 34 - u * 16); g.stroke(); } }
    } else {
      // three teacups on saucers: light, and they let you know it
      for (let k = 0; k < 3; k++) {
        const ux = x + 13 + k * (w - 26) / 2 + jx(k), uy = top + jy(k);
        g.fillStyle = '#f3efe2'; g.beginPath(); g.ellipse(ux, uy - 1.5, 9, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f8f5ea'; g.beginPath(); g.moveTo(ux - 6, uy - 12); g.lineTo(ux + 6, uy - 12); g.lineTo(ux + 4, uy - 3); g.lineTo(ux - 4, uy - 3); g.closePath(); g.fill();
        g.strokeStyle = '#6d8fa3'; g.lineWidth = 1; g.beginPath(); g.moveTo(ux - 5.5, uy - 9); g.lineTo(ux + 5.5, uy - 9); g.stroke();
        g.strokeStyle = '#e2ddcf'; g.lineWidth = 1.6; g.beginPath(); g.arc(ux + 7, uy - 8, 2.6, -Math.PI / 2, Math.PI / 2); g.stroke();
        g.fillStyle = '#7b5a3a'; g.beginPath(); g.ellipse(ux, uy - 12, 5.6, 1.2, 0, 0, Math.PI * 2); g.fill();
      }
    }
  }
  // A bell pepper, upright: three lobes at the foot, creases, a gloss, and a
  // green calyx and stem. Startled, it rocks on its lobes.
  function drawPepper(g, x, base, flash) {
    const small = settings.calm ? .2 : 1;
    g.save(); g.translate(x, base); g.rotate(Math.sin(flash * 22) * .18 * flash * small);
    const skin = g.createLinearGradient(-16, 0, 16, 0); skin.addColorStop(0, '#ff6f4f'); skin.addColorStop(.35, '#df3420'); skin.addColorStop(1, '#7d1610');
    g.fillStyle = skin; g.beginPath();
    g.moveTo(0, -28); g.quadraticCurveTo(-12, -32, -15, -24); g.bezierCurveTo(-18, -15, -17, -6, -13, -2);
    g.quadraticCurveTo(-10, 1, -5, -1); g.quadraticCurveTo(0, 2, 5, -1); g.quadraticCurveTo(10, 1, 13, -2);
    g.bezierCurveTo(17, -6, 18, -15, 15, -24); g.quadraticCurveTo(12, -32, 0, -28); g.closePath(); g.fill();
    g.strokeStyle = '#5a0f0b'; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = 'rgba(90,14,10,.55)'; g.lineWidth = 1.3;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 5, -26); g.bezierCurveTo(s * 8, -18, s * 7, -8, s * 5, -1); g.stroke(); }
    g.fillStyle = 'rgba(255,236,220,.55)'; g.beginPath(); g.ellipse(-9, -17, 2.2, 6.5, .15, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,236,220,.35)'; g.beginPath(); g.ellipse(1, -20, 1.4, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3f7a2c'; g.beginPath();
    for (let k = 0; k < 5; k++) { const a = Math.PI * (1.05 + k * .225), r = k % 2 ? 5 : 8; g.lineTo(Math.cos(a) * r * 1.1, -28 + Math.sin(a) * r * .45); }
    g.lineTo(7, -28); g.closePath(); g.fill();
    g.strokeStyle = '#4f8a36'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -29); g.quadraticCurveTo(1, -36, 6, -38); g.stroke();
    g.fillStyle = '#b9d58e'; g.beginPath(); g.arc(6.5, -38, 1.8, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // The egg's signature: GPT-6.1-Sol's, in marker on a strip of masking tape stuck to the shelf
  // lip under the crooked cucumber (kitchens label everything this way). It writes itself
  // on once the egg fires and stays for the visit; REWIND clears it with the egg.
  function drawSignature(g) {
    const u = state.egg.t; if (u < .9) return;
    const p = room.produce.find(q => q.kind === 'crooked'), shelf = room.counters.find(c => c.y === p.y), top = GY - shelf.y;
    const text = 'GPT-6.1-Sol · rejected produce', k = Math.min(1, (u - .9) / 1.4);
    g.save(); g.font = '10px "Permanent Marker", cursive';
    const w = g.measureText(text).width + 16, h = 16;
    g.translate(p.x - w / 2 - 42, top + 1); g.rotate(-.025);                                    // left of centre: the cucumber's own swing tag hangs to the right
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(2, 2, w, h);                                   // its shadow on the steel
    g.fillStyle = 'rgba(233,222,188,.95)'; g.beginPath(); g.moveTo(0, 0);                      // the tape, torn at both ends
    for (let j = 1; j <= 5; j++) g.lineTo(j % 2 ? 2.5 : 0, j * h / 5);
    g.lineTo(w, h); for (let j = 4; j >= 0; j--) g.lineTo(w - (j % 2 ? 2.5 : 0), j * h / 5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(3, 1.5, w - 6, 2);
    g.beginPath(); g.rect(0, -4, 8 + (w - 8) * k, h + 8); g.clip();                           // written on, left to right
    g.fillStyle = '#22314a'; g.fillText(text, 8, 12);
    g.restore();
  }
  function drawProduce(g, t) {
    const egg = state.egg, small = settings.calm ? .15 : 1;
    room.produce.forEach((p, i) => {
      const crooked = p.kind === 'crooked', u = crooked ? egg.t : -1, base = GY - p.y;
      if (p.kind === 'pepper') { softEllipse(g, p.x, base, 17, 3, .3); drawPepper(g, p.x, base, state.produce[i].flash); if (state.produce[i].flash > 0) { g.fillStyle = '#ded5a0'; g.font = 'bold 16px monospace'; g.fillText('!', p.x - 4, base - 46); } return; }
      const hop = u >= 0 && u < .65 ? Math.sin(Math.PI * u / .65) * 22 * small : 0;
      softEllipse(g, p.x, base, 24, 3, .3); g.save(); g.translate(p.x, base - 8 - hop);
      g.rotate(-.14 + (u >= 0 && u < 1.1 ? Math.sin(u * 9) * .5 * small : 0));
      const pigment = g.createLinearGradient(0, -12, 0, 10); pigment.addColorStop(0, p.kind === 'pepper' ? '#f39f65' : '#a6ce6b'); pigment.addColorStop(.25, p.kind === 'pepper' ? '#c95135' : '#669e45'); pigment.addColorStop(1, p.kind === 'pepper' ? '#6d302b' : '#264735'); g.fillStyle = pigment;
      g.beginPath();
      if (p.kind === 'pepper') { g.moveTo(-11, -10); g.bezierCurveTo(-23, -12, -22, 12, -9, 11); g.bezierCurveTo(-3, 15, 3, 14, 8, 10); g.bezierCurveTo(22, 11, 23, -11, 10, -12); g.quadraticCurveTo(0, -16, -11, -10); }
      else if (crooked) { g.moveTo(-23, 1); g.bezierCurveTo(-8, -18, 7, 13, 23, -2); g.quadraticCurveTo(28, 5, 21, 9); g.bezierCurveTo(3, 22, -8, -4, -19, 9); g.quadraticCurveTo(-27, 8, -23, 1); }
      else g.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2);
      g.closePath(); g.fill(); g.strokeStyle = '#263b2c'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = '#a8bc75'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.kind === 'pepper' ? 0 : 23, p.kind === 'pepper' ? -13 : 0); g.lineTo(p.kind === 'pepper' ? 4 : 28, p.kind === 'pepper' ? -19 : -3); g.stroke();
      if (p.kind !== 'pepper') {
        g.strokeStyle = 'rgba(185,215,116,.65)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-17, -3); g.quadraticCurveTo(0, crooked ? 7 : -6, 17, -3); g.stroke();
        g.fillStyle = '#346143'; for (let n = 0; n < 8; n++) { g.beginPath(); g.arc(-17 + n * 4.6, 2 + Math.sin(n * 4) * 2, .7, 0, Math.PI * 2); g.fill(); }
      }
      if (crooked) {
        g.strokeStyle = '#b7ab85'; g.lineWidth = .7; g.beginPath(); g.moveTo(24, 0); g.lineTo(35, 8); g.stroke();
        g.fillStyle = '#e9dec1'; g.fillRect(29, 5, 42, 14); g.fillStyle = '#3b4936'; g.font = egg.done ? '5.5px monospace' : '7px monospace'; g.fillText(egg.done ? 'GPT-6.1-Sol' : 'SECONDS', 32, 15);   // the longer name in a smaller hand, to fit the tag
      }
      g.restore();
      if (state.produce[i].flash > 0) { g.fillStyle = '#ded5a0'; g.font = 'bold 16px monospace'; g.fillText('!', p.x - 4, base - 34); }
    });
  }
  function front(g, t) {
    if (!live()) return;
    drawMixer(g);
    if (mode === 'pounce' && st.pk.flying && !st.got) drawPartFly(g, t);
    const k = settings.calm ? .2 : 1;
    g.save(); g.strokeStyle = 'rgba(233,218,179,.22)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const u = (t * .28 + i / 4) % 1; g.beginPath(); g.moveTo(1181 + i * 4 + Math.sin(t + i) * 6 * k, GY - 150 - u * 55); g.quadraticCurveTo(1195 + Math.sin(t * .7 + i) * 12 * k, GY - 185 - u * 45, 1170 + i * 9, GY - 200 - u * 40); g.stroke(); }
    g.strokeStyle = 'rgba(245,190,125,.23)'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const x = room.grill.x + 8 + i * 15; g.beginPath(); g.moveTo(x, GY - 26); g.quadraticCurveTo(x + Math.sin(t * 2 + i) * 5 * k, GY - 45, x, GY - 64); g.stroke(); }
    g.restore();
  }

  function drawMixer(g) {
    const { x: cx, y: cy } = room.socket, phase = state.got ? drivePhase : 0;
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#162b2d'; g.beginPath(); g.arc(0, 0, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#b4c5b2'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 36, 0, Math.PI * 2); g.stroke();
    // Stationary outer ring, three orbiting planets, and the missing sun gear.
    for (let i = 0; i < 30; i++) { const a = i * Math.PI / 15; g.beginPath(); g.moveTo(Math.cos(a) * 31, Math.sin(a) * 31); g.lineTo(Math.cos(a) * 35, Math.sin(a) * 35); g.stroke(); }
    g.strokeStyle = '#667e76'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const a = phase + i * Math.PI * 2 / 3, px = Math.cos(a) * 22, py = Math.sin(a) * 22;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(px, py); g.stroke(); gear(g, px, py, 9, 9, -phase * 3, '#b1c2ac');
      g.fillStyle = '#334e49'; g.beginPath(); g.arc(px, py, 2, 0, Math.PI * 2); g.fill();
    }
    if (state.got) { gear(g, 0, 0, 13, 12, phase * 4, '#e7c88b'); g.fillStyle = '#43605b'; g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill(); }
    else { g.setLineDash([3, 3]); g.strokeStyle = '#ecc587'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.fillStyle = '#edc98e'; g.font = 'bold 13px monospace'; g.fillText('?', -4, 5); }
    g.restore();
    const wx = cx + (state.got ? Math.sin(phase) * 7 : 0), bowlY = GY - 31;
    g.strokeStyle = '#b2c5b8'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + 38); g.lineTo(cx, GY - 67); g.lineTo(wx, bowlY - 6); g.stroke();
    g.lineWidth = 1.5;
    for (const bend of [-8, 0, 8]) { g.beginPath(); g.moveTo(wx, GY - 67); g.quadraticCurveTo(wx + bend, bowlY - 7, wx, bowlY + 1); g.stroke(); }
    // Keep the bowl visible beside the paws and in front of the hatch frame.
    g.fillStyle = '#99aca3'; g.beginPath(); g.ellipse(cx, bowlY, 25, 13, 0, 0, Math.PI); g.fill();
    g.strokeStyle = '#d9ddc8'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, bowlY, 25, 8, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = state.got ? '#99e5ad' : '#e0ae69'; g.beginPath(); g.arc(cx - 54, cy + 16, 4, 0, Math.PI * 2); g.fill();
    g.font = '9px monospace'; g.fillText(state.got ? 'MIXING' : 'CENTER GEAR?', cx - 97, cy + 53);
  }

  // The gait the bot leans with: the light tray at a walk, the others at a trot.
  const botGait = spec => spec.mass < 2.5 ? 'walk' : 'trot';
  function botInput(sim, def, brain, force) {
    const cat = sim.cat;
    let dir = 1, doubleTap = false;
    if (cat.air) return { dir: 0, doubleTap: false };
    brain.burst = (brain.burst || 0) + DT;
    // At an unseated tray's lane (on the deck, behind it): push that tray.
    const i = sim.trays.findIndex(p => !p.set);
    if (i >= 0 && cat.fl === 0 && cat.x > def.trays[i].home - NOSE - 140) {
      const tray = sim.trays[i], spec = def.trays[i], pad = def.plates[i], trot = (force || botGait(spec)) === 'trot';
      // Release when the oily coast reaches the mat at about 40 px/s.
      // This uses observed velocity and the same runner drag as the world.
      const arrival2 = tray.v * tray.v - 2 * trayDrag(tray, spec, def) * Math.max(0, pad.x - tray.x);
      if (tray.returning || tray.missed || tray.seat > 0 || (traySlip(tray, spec, def) && tray.v > 0 && arrival2 >= 40 * 40)) return { dir: 0, doubleTap: false };
      return { dir: 1, doubleTap: trot };
    }
    const steer = goal => { const delta = goal - cat.x, brake = cat.vx * cat.vx / (2 * 260); return Math.abs(delta) < 4 && Math.abs(cat.vx) < 8 ? 0 : Math.sign(delta) !== Math.sign(cat.vx) || Math.abs(delta) > brake + 2 ? Math.sign(delta) : 0; };
    // An optional cautious inspection: actual releases brake to a standstill.
    if (!force && !brain.skipEgg && !sim.egg.done && cat.fl === 220 && cat.x > 1550 && cat.x < 1740 && cat.face === 1) {
      const goal = def.produce.find(p => p.kind === 'crooked').x - 65, delta = goal - cat.x;
      if (delta < -7 && !brain.inspect) brain.skipEgg = true;   // already past the spot: walk on (turning back would flip it out of this branch, then in again)
      else {
        if (Math.abs(delta) < 7 && Math.abs(cat.vx) < 8) brain.inspect = true;
        if (brain.inspect && !sim.egg.approach) { brain.skipEgg = true; dir = 1; }
        else if (brain.inspect) dir = 0;
        else dir = steer(goal);
      }
      doubleTap = false;
    }
    if (!doubleTap && brain.burst % 1.3 > 1.05) dir = 0;
    // Ground fallback stays safe even after a missed counter or a reverse hop.
    if (cat.fl === 0 && cat.x > def.grill.x - 180 && cat.x < def.grill.x + def.grill.w + 60 && Math.abs(cat.vx) > 110) dir = 0;
    return { dir, doubleTap };
  }
  function simulate(strategy, options) {
    if (strategy === 'explorer') return explore(options);
    const def = options?.def || layout, sim = options?.state ? copy(options.state) : fresh(def), trace = options?.trace;
    let t = 0, got = false, pounce = -1, finished = false;
    const brain = { phase: 'position', active: -1, burst: 0 };
    while (t < 180) {
      let dir = 0, doubleTap = false, walkOnly = strategy === 'walker';
      const cat = sim.cat, idx = sim.trays.findIndex(p => !p.set), tray = sim.trays[idx], spec = def.trays[idx];
      if (pounce >= 0) { pounce -= DT; if (pounce < 0) { got = true; sim.got = true; cat.x = def.part.x - 64; } }
      else if (strategy === 'trotter' || strategy === 'walker') { dir = 1; doubleTap = strategy === 'trotter'; }
      else if (strategy === 'smart') ({ dir, doubleTap } = botInput(sim, def, brain));
      if (options?.inputTrace) options.inputTrace.push({ dir, doubleTap });
      const events = stepWorld(sim, def, DT, { dir, doubleTap, walkOnly });
      if (events.some(e => e.k === 'push')) brain.phase = 'position';
      if (trace && events.length) trace.push({ t: +t.toFixed(2), x: +cat.x.toFixed(1), events: copy(events), trays: sim.trays.map(p => [+p.x.toFixed(1), +p.v.toFixed(1), p.set]) });
      if (!got && pounce < 0 && gateOpen(sim) && cat.x >= def.part.x - 190 && cat.face === 1) { pounce = 4.5; cat.vx = 0; }
      if (got && cat.x > def.exit.x + 64 && dir > 0) { finished = true; break; }
      t += DT;
    }
    return { finished, time: +t.toFixed(2), pushes: sim.pushes, grillHits: sim.grillHits, startles: sim.startles, landings: sim.landings, egg: sim.egg.done, stuck: !finished && strategy === 'smart', plates: sim.trays.filter(p => p.set).length, ...(options?.details ? { state: sim } : {}) };
  }
  // Recovery samples actual movement histories, including reversed approaches,
  // mid-push releases, both counters and falls. It claims finite coverage only.
  function explore() {
    const snapshots = [fresh(layout)], guide = fresh(layout), brain = { burst: 0 };
    for (let k = 0; k < 60 * 120 && !gateOpen(guide); k++) {
      stepWorld(guide, layout, DT, botInput(guide, layout, brain));
      if (k % 60 === 0) snapshots.push(copy(guide));
    }
    let seed = 0x6ca7b07, worst = 0, failed = null;
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    let checked = 0;
    for (let j = 0; j < 256; j++) {
      const sample = copy(snapshots[Math.floor(random() * snapshots.length)]);
      for (let episode = 0; episode < 4; episode++) {
        const input = { dir: [-1, 0, 1][Math.floor(random() * 3)], doubleTap: random() > .5 };
        const frames = 30 + Math.floor(random() * 210);
        for (let k = 0; k < frames; k++)stepWorld(sample, layout, DT, input);
      }
      const result = simulate('smart', { state: sample }), further = result.pushes - sample.pushes; checked++;
      worst = Math.max(worst, further);
      if (!result.finished || further > 8) { failed = { sample: j, reason: 'movement state did not recover within eight further pushes', result }; break; }
    }
    return { finished: !failed, stuck: !!failed, statesChecked: checked, pushes: worst, seed: '0x6ca7b07', ...(failed ? { failure: failed } : {}) };
  }
  function selfTest() {
    const lines = [], bots = {}, log = (ok, label) => { const line = `${ok ? 'PASS' : 'FAIL'} ${label}`; lines.push(line); console.log('[GAL]', line); };
    for (const name of ['idle', 'trotter', 'walker', 'smart', 'explorer']) { bots[name] = simulate(name); console.log('[GAL]', name, JSON.stringify(bots[name])); }
    log(!bots.idle.finished && bots.idle.pushes === 0 && bots.idle.startles === 0 && bots.idle.grillHits === 0, 'idle leaves the puzzle unchanged');
    log(!bots.walker.finished && !bots.trotter.finished && bots.walker.plates === 0 && bots.trotter.plates === 0, 'holding either gait overshoots; arrival timing matters');
    log(bots.smart.finished && bots.smart.time <= 150 && bots.smart.plates === layout.trays.length && bots.smart.grillHits === 0 && bots.smart.landings.includes(120) && bots.smart.landings.includes(220) && bots.smart.egg, 'smart delivers every tray, uses both elevated landings, avoids the grill and discovers the egg');
    // A state at tray i's lane: the trays before it delivered, catbot on the deck behind it.
    const atLane = i => { const w = fresh(layout); w.trays.forEach((p, j) => { if (j < i) { p.set = true; p.x = layout.plates[j].x + (layout.plates[j].w - layout.trays[j].w) / 2; } }); Object.assign(w.cat, { x: layout.trays[i].home - NOSE - 60, vx: 0, face: 1 }); return w; };
    log(bots.explorer.finished && bots.explorer.pushes <= 8, 'all 256 fixed-seed movement states recover in <=8 further pushes');
    const empty = fresh(layout), idleCopy = copy(empty);
    for (let k = 0; k < 600; k++)stepWorld(idleCopy, layout, DT, { dir: 0 });
    log(JSON.stringify(empty) === JSON.stringify(idleCopy), 'idle changes no state, including timers');
    const gaitProbe = fresh(layout); gaitProbe.trays.forEach(p => p.set = true);
    const holdFrames = Math.round(GAIT.hold / DT);
    for (let k = 0; k < holdFrames - 4; k++)stepWorld(gaitProbe, layout, DT, { dir: 1 });
    const walking = gaitProbe.cat.vx <= GAIT.walk;
    for (let k = 0; k < 24; k++)stepWorld(gaitProbe, layout, DT, { dir: 1 });
    log(walking && gaitProbe.cat.vx > GAIT.walk, `a held direction starts trotting after ${GAIT.hold} s`);
    const tapProbe = fresh(layout); tapProbe.trays.forEach(p => p.set = true);
    for (let k = 0; k < 40; k++)stepWorld(tapProbe, layout, DT, { dir: 1, doubleTap: k === 0 });
    const earlyTrot = tapProbe.cat.vx > GAIT.walk && tapProbe.cat.hold < GAIT.hold;
    stepWorld(tapProbe, layout, DT, { dir: 0 });
    log(earlyTrot && tapProbe.cat.sprint === 0, 'double-tap requests trot early; release clears it');
    const braceProbe = fresh(layout); braceProbe.cat.x = layout.trays[0].x - NOSE;
    for (let k = 0; k < 18; k++)stepWorld(braceProbe, layout, DT, { dir: 1 });
    log(braceProbe.trays[0].x === layout.trays[0].x && braceProbe.pushPose.t > 0, 'short contact braces without moving a heavy tray');
    const slow = copy(braceProbe), fast = copy(braceProbe);
    for (let k = 0; k < 90; k++) { stepWorld(slow, layout, DT, { dir: 1, walkOnly: true }); stepWorld(fast, layout, DT, { dir: 1, doubleTap: true }); }
    log(slow.trays[0].x > layout.trays[0].x && fast.trays[0].x > slow.trays[0].x && !traySlip(fast.trays[0], layout.trays[0], layout) && fast.trays[0].v < 50, 'continued pressure moves the tray; trot pushes harder on grip');
    const oily = fresh(layout); Object.assign(oily.trays[0], { x: 620, v: 80, contact: 1, pushing: true }); Object.assign(oily.cat, { x: 532, vx: 80, face: 1, dir: 1, sprint: 1 });
    for (let k = 0; k < 90; k++)stepWorld(oily, layout, DT, { dir: 1, doubleTap: true });
    log(oily.trays[0].v > GAIT.trot && oily.trays[0].x - NOSE - oily.cat.x > 5 && oily.pushPose.t === 0, 'grease accelerates the tray ahead of the cat and releases the paws');
    const slideProbe = fresh(layout); Object.assign(slideProbe.trays[0], { x: 670, v: 110 }); slideProbe.cat.x = 500;
    const beforeSlide = slideProbe.trays[0].x;
    stepWorld(slideProbe, layout, DT, { dir: 0 });
    log(slideProbe.trays[0].x > beforeSlide && slideProbe.pushPose.t === 0, 'release removes force while grease preserves the tray glide');
    let miss, allReturned = true, returnedFinish = true;
    layout.trays.forEach((spec, i) => {
      const pad = layout.plates[i];
      for (const arrival of [pad.catchSpeed + .5, pad.catchSpeed + 15, 130, 165, 210]) {
        miss = atLane(i); Object.assign(miss.trays[i], { x: pad.x, v: arrival }); miss.cat.x = pad.x - 120;
        const missEvents = []; for (let k = 0; k < 900; k++)missEvents.push(...stepWorld(miss, layout, DT, { dir: 0 }));
        if (!missEvents.some(e => e.k === 'bumper') || miss.trays[i].set || miss.trays[i].returning || miss.trays[i].x !== spec.home || miss.cat.x > spec.home - NOSE) allReturned = false;
      }
      if (!simulate('smart', { state: miss }).finished) returnedFinish = false;
    });
    log(allReturned, 'in every lane, five overshoot speeds (from the catch boundary up) return to the accessible home apron');
    log(returnedFinish, 'a returned overshoot in any lane completes with ordinary movement');
    // Sweep real push histories in each lane, then release all movement. Keep
    // each successful window wide enough for a player, not just the precise bot.
    const windows = layout.trays.map((spec, i) => {
      const pressure = atLane(i), trot = botGait(spec) === 'trot'; let longest = 0, run = 0;
      for (let k = 0; k < 900; k++) {
        stepWorld(pressure, layout, DT, { dir: 1, doubleTap: trot }); if (pressure.trays[i].returning || pressure.trays[i].set) break;
        if (pressure.trays[i].v <= 0) continue; const released = copy(pressure);
        for (let j = 0; j < 900; j++)stepWorld(released, layout, DT, { dir: 0 });
        run = released.trays[i].set ? run + 1 : 0; longest = Math.max(longest, run);
      }
      return Math.max(0, (longest - 1) * DT);
    });
    const releaseSeconds = Math.min(...windows);
    log(releaseSeconds >= .35, `every push has a successful release window of at least 0.35 s (${layout.trays.map((p, i) => p.load + ' ' + windows[i].toFixed(3)).join(', ')} s)`);
    // The stock pot: a walk braces against it and nothing happens; keep leaning
    // and the held direction becomes the trot that shifts it.
    const pot = layout.trays.findIndex(p => p.load === 'pot'), potWalk = atLane(pot); potWalk.cat.x = layout.trays[pot].home - NOSE;
    for (let k = 0; k < 240; k++)stepWorld(potWalk, layout, DT, { dir: 1, walkOnly: true });
    const potLean = atLane(pot); potLean.cat.x = layout.trays[pot].home - NOSE;
    for (let k = 0; k < 180; k++)stepWorld(potLean, layout, DT, { dir: 1 });
    log(potWalk.trays[pot].x === layout.trays[pot].home && potWalk.pushPose.force === 1 && potLean.trays[pot].x > layout.trays[pot].home, 'a walk cannot shift the stock pot; leaning on into the trot does');
    // The cups: walk or trot into them and let go at once, or a moment later: delivered.
    // Keep leaning: too fast, back on the belt.
    const cups = layout.trays.findIndex(p => p.load === 'cups'), nudge = (tap, hold) => {
      const w = atLane(cups); w.cat.x = layout.trays[cups].home - NOSE - (tap ? 240 : 110); let c = -1;
      for (let k = 0; k < 600; k++) { stepWorld(w, layout, DT, { dir: 1, doubleTap: tap && k === 0 }); if (c < 0 && w.trays[cups].pushing) c = k; if (c >= 0 && k - c >= hold) break; }
      for (let k = 0; k < 900; k++)stepWorld(w, layout, DT, { dir: 0 });
      return w.trays[cups].set;
    };
    const nudges = { walk: [0, 10, 20, 30].filter(h => nudge(false, h)).length, trot: [0, 10, 20].filter(h => nudge(true, h)).length };
    log(nudges.walk === 4 && nudges.trot === 3 && !nudge(false, 60) && !nudge(true, 45), `a nudge delivers the cups at a walk or a trot; a long lean overshoots (${JSON.stringify(nudges)})`);
    let protectedGate = true;
    for (let mask = 0; mask < (1 << layout.trays.length) - 1; mask++) {
      const probe = fresh(layout); probe.trays.forEach((p, i) => { p.set = !!(mask & (1 << i)); });
      probe.cat.x = layout.gate.x - NOSE; probe.cat.vx = GAIT.trot;
      for (let k = 0; k < 300; k++)stepWorld(probe, layout, DT, { dir: 1, doubleTap: true });
      if (gateOpen(probe) || probe.cat.x >= layout.part.x - 190 || probe.cat.x >= layout.exit.x) protectedGate = false;
    }
    log(protectedGate, 'closed serving gate protects the part and exit');
    const solved = simulate('smart', { details: true }).state;
    log(solved.trays.every(p => p.set) && solids(solved, layout).length === 0, 'the seated tray is flush, traversable floor');
    const exitProbe = copy(solved); exitProbe.got = false; exitProbe.cat.x = layout.exit.x - 100;
    for (let k = 0; k < 120; k++)stepWorld(exitProbe, layout, DT, { dir: 1, doubleTap: true });
    log(exitProbe.cat.x < layout.exit.x, 'gear installation still protects the exit hatch');
    // Each lane: an open approach on the deck behind it, clear of the previous lane
    // and of the produce. Counters are reached only by a deck-level startle; once that
    // is possible before a lane, a drop off any counter must land behind the tray
    // (a trot off the end carries about 70 px), never past it.
    const lifts = layout.produce.filter(q => q.y === 0 && q.kind !== 'crooked');
    log(layout.trays.every((p, i) => {
      const a = p.home - NOSE - 60;
      return a > 104 && p.end - p.w > p.home && (i === 0 || p.home - NOSE > layout.trays[i - 1].end + 40) && layout.produce.every(q => q.x < a || q.x > p.end)
        && (lifts.every(q => q.x > p.end) || layout.counters.every(c => c.x + c.w + 80 < p.home - NOSE));
    }), 'every lane has an open approach; no lane overlaps another, a surprise, or the landing from a counter');
    const rearm = fresh(layout); rearm.trays.forEach(p => p.set = true); rearm.produce[0].armed = false; rearm.produce[0].cool = 2; rearm.cat.x = 1000;
    for (let k = 0; k < 180; k++)stepWorld(rearm, layout, DT, { dir: 0 });
    rearm.cat.x = layout.produce[0].x - 100; rearm.cat.face = 1;
    log(stepWorld(rearm, layout, DT, { dir: 1 }).some(e => e.k === 'startle'), 'leaving a surprise rearms its traversal hop');
    // Walking along the prep counter into the pepper leaps catbot up and over it onto the shelf, at a walk or a trot.
    const pi = layout.produce.findIndex(p => p.kind === 'pepper'), pepper = layout.produce[pi], shelfTop = layout.counters.find(c => c.y > pepper.y);
    const leaps = [false, true].map(tap => {
      const w = fresh(layout); w.trays.forEach(p => p.set = true); Object.assign(w.cat, { x: pepper.x - 260, h: pepper.y, fl: pepper.y, vx: 0, face: 1 });
      let fwd = false;
      for (let k = 0; k < 360 && w.cat.fl !== shelfTop.y; k++) { const ev = stepWorld(w, layout, DT, { dir: w.cat.air ? 0 : 1, doubleTap: tap }); if (ev.some(e => e.k === 'startle' && e.i === pi)) fwd = w.cat.vx > 0; }
      return fwd && w.cat.fl === shelfTop.y && w.cat.x > shelfTop.x + 20;
    });
    log(leaps.every(Boolean), 'the pepper leaps catbot forward, up and over it onto the produce shelf (walk and trot)');
    const shelf = layout.counters[1], fall = copy(solved); Object.assign(fall.cat, { x: shelf.x + shelf.w - 1, h: 220, fl: 220, air: false, vy: 0, vx: GAIT.trot, face: 1, dir: 1 });
    for (let k = 0; k < 120; k++)stepWorld(fall, layout, DT, { dir: 1 });
    log(!fall.cat.air && fall.cat.fl === 0 && fall.cat.x > shelf.x + shelf.w, 'walking off the shelf returns safely to the deck');
    log(layout.socket.y < GY - 135 && layout.socket.x > layout.part.x, 'the mixer socket is above the cat silhouette and ahead of the pickup');
    const inspect = fresh(layout); inspect.trays.forEach(p => p.set = true);
    Object.assign(inspect.cat, { x: 1660, h: 220, fl: 220, vx: GAIT.walk, face: 1, dir: 1 });
    stepWorld(inspect, layout, DT, { dir: 1 }); inspect.cat.vx = 0;
    const baseline = copy(inspect); baseline.egg.done = true; let reveals = 0;
    for (let k = 0; k < 150; k++) {
      reveals += stepWorld(inspect, layout, DT, { dir: 0 }).filter(e => e.k === 'egg').length;
      stepWorld(baseline, layout, DT, { dir: 0 });
    }
    log(reveals === 1 && inspect.egg.done && JSON.stringify(inspect.cat) === JSON.stringify(baseline.cat) && JSON.stringify(inspect.trays) === JSON.stringify(baseline.trays) && JSON.stringify(inspect.produce) === JSON.stringify(baseline.produce), 'cautious inspection reveals the egg once without changing traversal physics');
    const rush = fresh(layout); rush.trays.forEach(p => p.set = true); Object.assign(rush.cat, { x: 1660, h: 220, fl: 220, vx: GAIT.trot, face: 1, dir: 1 });
    stepWorld(rush, layout, DT, { dir: 1, doubleTap: true }); rush.cat.vx = 0;
    for (let k = 0; k < 120; k++)stepWorld(rush, layout, DT, { dir: 0 });
    log(!rush.egg.done, 'rushing the imperfect vegetable does not reveal the egg');
    if (mine()) {
      const saved = state, savedRemainder = remainder, savedPending = pendingDir, savedLast = lastPlay, savedCable = st.cable, savedRepairAge = repairAge, savedDrivePhase = drivePhase;
      reset(); const baseline = copy(state); state = copy(solved); reset(); log(JSON.stringify(state) === JSON.stringify(baseline), 'reset restores the trays, lifts, hop rearming and egg');
      state = saved; remainder = savedRemainder; pendingDir = savedPending; lastPlay = savedLast; st.cable = savedCable; repairAge = savedRepairAge; drivePhase = savedDrivePhase;
    } else log(JSON.stringify(fresh(layout)) === JSON.stringify(empty), 'fresh reset state is deterministic');
    return { pass: lines.every(l => l.startsWith('PASS')), lines, bots, releaseWindow: +releaseSeconds.toFixed(3) };
  }
  // Dev-only proof through the actual game loop, including native pickup,
  // socket installation and hatch. Inputs are directions and double taps;
  // there is no puzzle-state injection. Run with #room=galley&test&verify.
  function liveTest() {
    if (!mine()) return { pass: false, reason: 'load the galley first' };
    const savedSettings = { ...settings }, savedStorage = localStorage.getItem('catbot.settings'), savedParts = [...installed], savedRun = { ...run }, savedCaps = [...seenCaps], savedTime = T, results = [], shots = {};
    for (const trial of [{ steady: false, overshoot: false }, { steady: true, overshoot: false }, { steady: false, overshoot: true }]) {
      const { steady, overshoot } = trial;
      settings.sound = false; settings.calm = steady; AUDIO.enable(false);
      installed.delete('galley'); resetRoom(); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0;
      const brain = { phase: 'position', active: -1, burst: 0 }; let frames = 0, mismatch = 0, finished = false, missedOnce = false, socketAligned = false;
      while (frames < 60 * 150) {
        if (state.trays[0].returning) missedOnce = true;
        const input = mode === 'play' ? (overshoot && !missedOnce ? { dir: 1, doubleTap: true } : botInput(state, room, brain)) : { dir: 0, doubleTap: false };
        keys.l = input.dir < 0; keys.r = input.dir > 0; sprint = input.doubleTap ? input.dir : 0;
        const predicted = mode === 'play' ? copy(state) : null;
        if (predicted) stepWorld(predicted, room, DT, input);
        tick(DT);
        if (predicted && mode === 'play' && Math.abs(predicted.cat.x - state.cat.x) > .001) mismatch++;
        frames++;
        if (st.got && st.pk.home) socketAligned = Math.abs(st.pk.x - room.socket.x) < .001 && Math.abs(st.pk.y - room.socket.y) < .001;
        // Real rig frames for weight, free coast, recovery, hop and repair.
        if (!steady) {
          const tray = state.trays[0], checks = { brace: state.pushPose.t > .4 && tray.v === 0, glide: !overshoot && tray.v > 70 && tray.x - NOSE - state.cat.x > 18, return: tray.returning, pepper: state.cat.air && state.cat.vx > 0 && state.cat.h > 245 && state.cat.fl === 120, egg: state.egg.t >= .7, flight: mode === 'pounce' && st.pk.flying && !st.pk.home && st.pk.u > .55, repair: mode === 'pounce' && st.pk.home && repairAge > .75 };
          for (const [label, ready] of Object.entries(checks)) if (ready && !shots[label]) { render(0); shots[label] = cv.toDataURL('image/png'); }
        }
        if (mode === 'exit') { finished = true; break; }
      }
      const result = { steady, muted: true, overshoot, returned: missedOnce, finished, time: +(frames / 60).toFixed(2), pushes: state.pushes, grillHits: state.grillHits, startles: state.startles, landings: [...state.landings], egg: state.egg.done, installed: installed.has('galley'), socketAligned, physicsMismatches: mismatch };
      result.pass = finished && result.installed && socketAligned && (!overshoot || missedOnce) && mismatch === 0 && state.grillHits === 0 && state.landings.includes(120) && state.landings.includes(220) && state.egg.done;
      results.push(result); console.log('[GAL] LIVE', JSON.stringify(result));
    }
    // Check the actual keyboard and touch-pad event consumers separately
    // from accelerated replay (tap() uses real, not simulated, wall time).
    const inputResult = inputTest(); console.log('[GAL] INPUT', JSON.stringify(inputResult));
    const isolation = [];
    for (let i = 0; i < ROOMS.length; i++)if (!ROOMS[i].galley) {
      loadRoom(i); mode = 'play'; const prior = JSON.stringify(state), ctrl = freshCtrl(), beforeCtrl = JSON.stringify(ctrl), beforeRig = rig.x;
      reset(); update(DT, ctrl); after(); audio(DT); deck(ctx, 0); front(ctx, 0);
      const ok = JSON.stringify(state) === prior && JSON.stringify(ctrl) === beforeCtrl && rig.x === beforeRig && blocks().length === 0 && slipAt(rig.x) === (room.floorSlip || 0) && intent(0) && !wall(ctx, 0) && !strain() && GAL.camY() === 0 && GAL.kitShift() === 0;
      isolation.push({ room: room.id, pass: ok });
    }
    console.log('[GAL] ISOLATION', JSON.stringify(isolation));
    installed.clear(); for (const id of savedParts) installed.add(id);
    Object.assign(settings, savedSettings); if (savedStorage === null) localStorage.removeItem('catbot.settings'); else localStorage.setItem('catbot.settings', savedStorage);
    Object.assign(run, savedRun); seenCaps.clear(); for (const id of savedCaps) seenCaps.add(id); T = savedTime;
    AUDIO.enable(settings.sound); keys.l = keys.r = false; sprint = 0; loadRoom(ROOMS.findIndex(r => r.galley)); mode = 'play'; modeT = 0; latch = false; fade = 0; fadeDir = 0; acc = 0; camX = camTarget(); camY = 0; caps.length = 0; egg.last = 0; egg.rev = [];
    render(0);
    window.__galleyShots = shots;
    for (const [label, src] of Object.entries(shots)) {
      const img = document.createElement('img'); img.id = 'galley-shot-' + label; img.src = src; img.hidden = true; document.body.appendChild(img);
      if (label === 'repair') {
        const link = document.createElement('a'); link.id = 'galley-proof-download'; link.href = src; link.download = 'galley-mixer-proof.png'; link.textContent = 'Download mixer proof';
        link.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:1000;padding:8px;background:#ede1bd;color:#304332;font:12px monospace'; document.body.appendChild(link);
      }
    }
    return { pass: results.every(r => r.pass) && inputResult.pass && isolation.every(r => r.pass), runs: results, input: inputResult, isolation };
  }
  function inputTest() {
    const saved = { ...keys }, savedPulse = pulse, savedSprint = sprint, savedTap = tapT, savedDir = tapDir, wasTouch = document.body.classList.contains('touch');
    keys.l = keys.r = false; tapT = -1e9; sprint = 0; resetRoom(); mode = 'play'; latch = false; fadeDir = 0; acc = 0;
    const keyboard = { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true };
    dispatchEvent(new KeyboardEvent('keydown', keyboard)); const keyboardDown = keys.r && pulse === 1;
    dispatchEvent(new KeyboardEvent('keyup', keyboard)); const keyboardUp = !keys.r;
    dispatchEvent(new KeyboardEvent('keydown', { ...keyboard, repeat: true })); const repeatDoesNotTrot = sprint === 0;
    dispatchEvent(new KeyboardEvent('keyup', keyboard));
    const initialX = state.cat.x; tick(DT); const quickTapMoves = state.cat.x > initialX;
    dispatchEvent(new KeyboardEvent('keydown', keyboard)); const doubleTap = sprint === 1;
    for (let k = 0; k < 40; k++)tick(DT);
    const earlyTrot = state.cat.vx > GAIT.walk && state.cat.hold < GAIT.hold;
    dispatchEvent(new KeyboardEvent('keyup', keyboard));
    const keyPairs = [];
    for (const [key, code, keyCode, dir] of [['ArrowLeft', 'ArrowLeft', 37, -1], ['ArrowRight', 'ArrowRight', 39, 1], ['a', 'KeyA', 65, -1], ['d', 'KeyD', 68, 1]]) {
      keys.l = keys.r = false; tapT = -1e9; sprint = 0;
      const event = { key, code, keyCode, which: keyCode, bubbles: true, cancelable: true };
      dispatchEvent(new KeyboardEvent('keydown', event)); dispatchEvent(new KeyboardEvent('keyup', event));
      dispatchEvent(new KeyboardEvent('keydown', event)); keyPairs.push({ key, pass: sprint === dir && (dir < 0 ? keys.l : keys.r) });
      dispatchEvent(new KeyboardEvent('keyup', event));
    }
    const pad = document.getElementById('padL'), capture = Object.getOwnPropertyDescriptor(pad, 'setPointerCapture');
    // Synthetic pointers have no OS capture; substitute only that browser
    // operation. The real, unmodified pad listeners still handle the test.
    pad.setPointerCapture = () => { };
    try {
      pad.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 96, pointerType: 'touch', bubbles: true }));
      const touchDown = keys.l && pulse === -1 && pad.classList.contains('on');
      pad.dispatchEvent(new PointerEvent('pointerup', { pointerId: 96, pointerType: 'touch', bubbles: true }));
      const touchUp = !keys.l && !pad.classList.contains('on');
      const directionalGuards = !intent(0, -1) && !intent(0, 1) && !intent(1, -1) && !intent(-1, 1) && intent(-1, -1) && intent(1, 1);
      return { pass: keyboardDown && keyboardUp && repeatDoesNotTrot && doubleTap && earlyTrot && keyPairs.every(p => p.pass) && touchDown && touchUp && quickTapMoves && directionalGuards, keyboardDown, keyboardUp, repeatDoesNotTrot, doubleTap, earlyTrot, keyPairs, touchDown, touchUp, quickTapMoves, directionalGuards };
    } finally {
      if (capture) Object.defineProperty(pad, 'setPointerCapture', capture); else delete pad.setPointerCapture;
      Object.assign(keys, saved); pulse = savedPulse; sprint = savedSprint; tapT = savedTap; tapDir = savedDir; document.body.classList.toggle('touch', wasTouch);
    }
  }
  async function measureSounds() {
    if (typeof OfflineAudioContext === 'undefined') return { verified: false, reason: 'OfflineAudioContext unavailable' };
    // Isolate the sound module so the game's active audio context/settings
    // remain untouched. This loads our own audio.js, never an external asset.
    const frame = document.createElement('iframe'); frame.hidden = true;
    const loaded = new Promise(resolve => { frame.onload = resolve; });
    frame.srcdoc = '<script src="audio.js"><\/script>'; document.body.appendChild(frame); await loaded;
    const measurements = {};
    try {
      const audio = frame.contentWindow.AUDIO;
      for (const name of ['galClatter', 'galChunk', 'galScrape', 'galSizzle', 'galHeat', 'galStartle', 'galRoll', 'galGrind', 'galLid', 'galClink']) {
        const ctx = new OfflineAudioContext(1, 48000, 48000); audio.attach(ctx, true); audio.limits(false); audio.sfx(name, { mag: 1, rate: 1 });
        const rendered = await ctx.startRendering(), samples = rendered.getChannelData(0), n = 65536, re = new Float64Array(n), im = new Float64Array(n);
        let peak = 0; for (let i = 0; i < samples.length; i++) { re[i] = samples[i]; peak = Math.max(peak, Math.abs(samples[i])); }
        for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1)j ^= bit; j ^= bit; if (i < j) { const v = re[i]; re[i] = re[j]; re[j] = v; } }
        for (let size = 2; size <= n; size *= 2) {
          const angle = -2 * Math.PI / size;
          for (let start = 0; start < n; start += size)for (let j = 0; j < size / 2; j++) {
            const a = start + j, b = a + size / 2, co = Math.cos(angle * j), si = Math.sin(angle * j), br = re[b] * co - im[b] * si, bi = re[b] * si + im[b] * co;
            re[b] = re[a] - br; im[b] = im[a] - bi; re[a] += br; im[a] += bi;
          }
        }
        let total = 0, above = 0, body = 0; for (let i = 1; i < n / 2; i++) { const hz = i * 48000 / n, e = re[i] * re[i] + im[i] * im[i]; total += e; if (hz >= 150) above += e; if (hz >= 150 && hz <= 400) body += e; }
        measurements[name] = { peak: +peak.toFixed(4), above150Pct: +(above / total * 100).toFixed(1), body150to400Pct: +(body / total * 100).toFixed(1) };
        console.log('[GAL] SOUND', name, JSON.stringify(measurements[name]));
      }
    } finally { frame.remove(); }
    return { verified: true, measurements };
  }
  // The engine owns its turbine; this room uses only the shared install cues.
  // Match the berthing guard so seating the mixer never spins another room.
  if (window.ENG && ENG.seat) { const previousSeat = ENG.seat; ENG.seat = (...args) => mine() ? undefined : previousSeat(...args); }
  if (typeof location !== 'undefined' && /(^|[#&])room=galley(?:&|$)/.test(location.hash)) {
    const pm = /parts=([\w,-]+)/.exec(location.hash); for (const id of pm ? pm[1].split(',') : ['hip', 'engine']) if (id !== 'none') installed.add(id);
    OPEN.finish(false); loadRoom(ROOMS.findIndex(r => r.id === 'galley')); mode = 'play'; modeT = 0;
    if (/[#&]test/.test(location.hash)) setTimeout(async () => {
      window.__galleyTest = GAL.selfTest();
      if (/[#&]verify(?:&|$)/.test(location.hash)) {
        window.__galleyTest.live = liveTest(); window.__galleyTest.sounds = await measureSounds();
        window.__galleyTest.pass = window.__galleyTest.pass && window.__galleyTest.live.pass && window.__galleyTest.sounds.verified;
        console.log('[GAL] BROWSER PROOF', JSON.stringify(window.__galleyTest));
      }
    }, 500);
  }
  return { reset, update, after, blocks, slipAt, intent, strain, camY: () => live() ? -Math.max(0, state.cat.h - 90) : 0, kitShift: () => live() && rig.x > room.gate.x - 100 ? -Math.max(0, W - 256) : 0, audio, wall, deck, front, simulate, selfTest, liveTest, measureSounds, stepWorld, fresh, botInput, get state() { return state; } };
})();
