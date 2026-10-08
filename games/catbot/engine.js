'use strict';
/* =====================================================================
   ENGINE BAY: room 2. Floors that drift, steam that keeps time.
   Built with Claude Opus 5.5 (claude-opus-5-5) in Claude Code.
   Same shape as hub.js: an IIFE that reads the game's globals (ROOMS,
   room, st, rig, mode, camX, camY, S, FX, sfx, AUDIO, caption, calmK ...).
   index.html calls ENG.* from a few commented hook lines; every call is a
   no-op unless the current room has belts or vents, so room 1 is untouched.

   The climb: the turbine gear sits on a conveyor up under the ceiling.
   Movement is still the only verb, so there is no jump: a LIFT vent throws
   catbot up to the next platform when it blows (stand on it and wait for
   the beat), and a JET vent on a platform knocks it back down a level. With
   the gear in its mouth it walks off the far edges to get down again, and the
   gear hops from its mouth into the turbine on the main floor.
   ===================================================================== */

/* ---------------------------------------------------------------------
   ROOM DATA. New fields (engine.js reads them, index.html doesn't):
     plats:[{x,w,y,hang}]      platforms: y = height of the walking surface above
                               the deck, hang = hung from the ceiling (no legs)
     belts:[{x,w,v,y}]         floor spans that move; v px/s, sign = direction; y = which level
     vents:[{x,w,y,beat,duty,lift|push}]
                               grates that blow on the shared beat: beat = which beat
                               of the bar (0..3), duty = how long, in beats.
                               lift:{x,y} = a steam lift: throws catbot to land there.
                               push = a jet: shoves catbot that far back (px)
     pocket:{x,w}              painted safe box on the deck
     part.y                    the part sits up on a platform
     carry                     catbot carries the part in its mouth instead of it flying home
     socket:{x,y}              where the part goes (the turbine's hub), world px
     noCart:[[x0,x1]]          spans the service trolley won't park over (filled below)
   Lifts fire on the downbeat (beat 0), jets on beat 2, so the whole bay keeps one rhythm. A lift lands you half a beat
   later, so walking straight on from a landing reaches the next jet as it blows: land, wait for it, then go.
   --------------------------------------------------------------------- */
ROOMS.push({
  id: 'engine', name: 'Engine Bay', w: 3880,
  floorSlip: 0,
  start: { x: 250, face: 1 },
  reset: { x: 22, w: 112 },
  plats: [
    { x: 1340, w: 460, y: 100 },                 // P1
    { x: 1780, w: 520, y: 200 },                 // P2 (runs on under P3 so a fall off P3 lands here)
    { x: 2280, w: 700, y: 290, hang: true },      // P3: the conveyor under the ceiling, the gear between its belts
    { x: 2950, w: 250, y: 150 }                  // P4: the step down
  ],
  belts: [
    { x: 480, w: 200, v: 60, y: 0 },            // the deck: one that helps you along...
    { x: 740, w: 200, v: -65, y: 0 },            //   ...then one against you: a treadmill
    { x: 1840, w: 180, v: -50, y: 200 },          // P2: drifts you back off the edge you came up
    { x: 2480, w: 160, v: -55, y: 290 },          // P3: the conveyor runs away from the gear...
    { x: 2800, w: 160, v: 60, y: 290 }           //   ...and on the far side, toward the way down
  ],
  vents: [
    { x: 1060, w: 64, y: 0, beat: 2, duty: .6, push: 120 },                 // a single jet on the deck, with a safe pocket in front of it
    { x: 1250, w: 64, y: 0, beat: 0, duty: .6, lift: { x: 1380, y: 100 } },      // lift to P1
    { x: 1458, w: 64, y: 100, beat: 2, duty: .6, push: 240 },                 // P1's jet: keep walking off the lift and it catches you; wait for it to blow, then go
    { x: 1660, w: 64, y: 100, beat: 0, duty: .6, lift: { x: 1815, y: 200 } },      // lift to P2
    { x: 2060, w: 64, y: 200, beat: 2, duty: .6, push: 240 },                 // P2's jet: back onto the belt, and off
    { x: 2160, w: 64, y: 200, beat: 0, duty: .6, lift: { x: 2300, y: 290 } },      // lift to the conveyor
    { x: 2380, w: 64, y: 290, beat: 2, duty: .6, push: 240 }                  // P3's jet, between you and the gear: it knocks you back down to P2
  ],
  pocket: { x: 960, w: 84 },
  part: { x: 2720, y: 290, id: 'engine', name: 'TURBINE GEAR' },
  carry: true,
  socket: { x: 3360, y: GY - 150 },
  exit: { x: 3600 },
  rail: [[0, 1330], [3220, 3880]],               // the trolley's wall rail: only along the open deck, not through the climb
  captions: [
    { on: 'belt', text: 'Keep time with the steam. Go back in time with the belts.' },
    { on: 'vent', text: '1... 2... 3... 4... 1... 2... 3... 4...' },
    { on: 'carry', text: 'Finders keepers. Now take it home.' }
  ]
});
{
  const R = ROOMS[ROOMS.length - 1];
  R.noCart = [...R.belts.filter(b => !b.y), ...R.vents.filter(v => !v.y)].map(z => [z.x - 30, z.x + z.w + 30])
    .concat(R.plats.map(p => [p.x - 40, p.x + p.w + 40]), [[R.socket.x - 90, R.socket.x + 90]]);
}

window.ENG = (() => {                            // replaces index.html's no-op stub
  const BAR = 2.4, BEAT = BAR / 4, TELE = .5;          // a bar is four beats at 100 BPM; a vent warns half a second before it blows
  const HIT = 18;                                // a vent catches catbot when its root is within w/2 + HIT of the grate's centre
  const SPIN = 5.5;                              // turbine speed once it has its gear, rad/s
  const UNDER = 125;                             // catbot's height: a platform lower than this over its head is a wall
  const SLAB = 32;                               // a platform's thickness below its walking surface
  const mine = () => !!room && !!(room.belts || room.vents);   // the current room is the engine bay (whatever mode the game is in)
  const on = () => mine() && !inHub();

  /* ---------- state (reset with the room) ---------- */
  let wasAir = false, airFrom = 0, clk = 0, beat = -1, beatK = 0, vs = [], turb = { a: 0, v: 0, seated: false, flash: 0 }, rack = 0, racked = false, audioOn = false, fly = null;
  function reset() {
    if (!mine()) return;                         // not on(): a door from the deck plan loads the room while the mode is still the hub's
    clk = BAR - 1.6; beat = Math.floor(clk / BEAT); beatK = 0; rack = 0; fly = null;   // first warning a second in, so the room is seen before it blows
    vs = room.vents.map(v => ({ tb: phase(v), tele: 0, blast: false, age: 9, col: 0, cd: 0 }));
    turb.seated = installed.has(room.part.id); turb.v = turb.seated ? SPIN : 0; turb.flash = 0;
  }
  const phase = v => (((clk - v.beat * BEAT) % BAR) + BAR) % BAR;           // where in its own bar a vent is: 0 = the blast starts
  const lv = o => o.y || 0;
  const beltAt = (x, y) => (room.belts || []).find(b => lv(b) === y && x >= b.x && x <= b.x + b.w);
  const vcx = v => v.x + v.w / 2;
  const near = (x, y) => clamp(1 - (Math.abs(x - rig.x) + Math.abs((y || 0) - rig.fl)) / 1000, .2, 1);
  const inView = x => x > camX - 80 && x < camX + W + 80;
  /* the highest floor under x that is no higher than h: a platform, or the deck */
  function floorAt(x, h) { let f = 0; for (const p of room.plats || []) if (x >= p.x && x <= p.x + p.w && p.y <= h + .5 && p.y > f) f = p.y; return f; }
  const base = () => rig.fl + (rig.air ? Math.max(0, rig.y - 58) : 0);    // how high catbot's feet are, near enough

  /* ---------- update: once per tick, before the rig substeps ---------- */
  function update(dt, c) {
    if (!on()) return;
    if (vs.length !== room.vents.length) reset();  // belt and braces: never run on vent state built for another room
    clk += dt;
    // the beat: a very quiet pulse on each one (the beat lamps above the vents are its visual twin)
    const bi = Math.floor(clk / BEAT);
    if (bi !== beat) { beat = bi; beatK = 1; sfx('pulse', { mag: bi % 4 === 0 ? 1 : .55, x: rig.x }); }
    beatK = Math.max(0, beatK - dt * 3);
    // floors: in the air, take the platform it has risen above (or the one it has fallen past); on the ground, walk off edges
    const fl0 = rig.fl;                          // the level it took off from, if it has just left the ground (walking off an edge changes fl below)
    if (rig.air) { const f = floorAt(rig.x, base() + 4); if (f !== rig.fl) rig.setFloor(f); }
    else { const f = floorAt(rig.x, rig.fl); if (f < rig.fl) rig.setFloor(f, true); }
    if (!wasAir && rig.air) airFrom = fl0;
    if (wasAir && !rig.air && rig.fl !== airFrom) { rig.vx *= .3; walkT = 0; }   // walkT=0: it lands at a walk, not the trot it 'held' through the flight   // landing on another level (a fall, a lift's throw): the heavy brass landing soaks up most of the sideways speed
    wasAir = rig.air;                                     // (a jet's shove on the same level keeps its skid: that's what carries it off the edge)
    if (rig.air && (mode === 'play' || mode === 'exit')) { c.tuck = .55; c.claws = .6; c.earL = -12; c.earR = -10; c.tailBase = 185; }   // flung or falling: a cat bracing to land
    if (st.carry) { c.mouth = -.25; c.headPitch = (c.headPitch || 0) + .06; }                                              // chin up, mouth full
    // belts: drift goes into the ctrl; the rig rides it (catbot.js: c.belt)
    const b = !rig.air && mode !== 'pounce' && beltAt(rig.x, rig.fl);   // pouncing: claws in, the belt doesn't drag it off its toy
    c.belt = b ? b.v : 0;
    if (b && mode === 'play') caption('belt');
    // vents
    room.vents.forEach((v, i) => {
      const o = vs[i], was = o.tb, tb = phase(v), cx = vcx(v), len = v.duty * BEAT, y = lv(v);
      o.tb = tb; o.age += dt; o.cd -= dt;
      o.tele = tb > BAR - TELE ? (tb - (BAR - TELE)) / TELE : 0;
      if (was <= BAR - TELE && tb > BAR - TELE && inView(cx)) sfx('hiss', { x: cx, mag: near(cx, y) });     // the warning, heard
      const blast = tb < len;
      if (blast && !o.blast) {                                                              // it blows
        o.age = 0;
        if (inView(cx)) {
          FX.steam(cx, GY - y - 16, Math.ceil(10 * calmK()) + 2, 1.6); sfx('vent', { x: cx, mag: near(cx, y) });
          shake = Math.max(shake, 2.2 * near(cx, y)); caption('vent'); if (!racked) { racked = true; rack = 1; }
          nearPuff(cx);
        }
      }
      o.blast = blast;
      o.col = blast ? Math.min(1, o.col + dt * 14) : Math.max(0, o.col - dt * 1.7);                    // the column lingers a moment after the valve shuts
      if (o.tele > 0 && inView(cx) && Math.random() < dt * (3 + 16 * o.tele) * calmK()) FX.steam(cx + rnd(-v.w / 3, v.w / 3), GY - y - 18, 1, .4 + .5 * o.tele);   // wisps: the warning, seen
      const here = !rig.air && rig.fl === y && Math.abs(rig.x - cx) < v.w / 2 + HIT;
      if (blast && o.cd <= 0 && here) {
        if (v.lift && (mode === 'play' || mode === 'pounce')) { launch(v); o.cd = BEAT * 2; }
        else if (!v.lift && mode === 'play' && st.oops == null) { shove(v); o.cd = BEAT * 2; }
      }
    });
    // carrying it home: on the main deck, under the turbine, it hops from catbot's mouth into the hub
    const s = room.socket;
    if (st.carry && !fly && mode === 'play' && !rig.air && rig.fl === 0 && Math.abs(rig.x - s.x) < 90) {
      const m = rig.mouthP(); fly = { t: 0, x0: m.x, y0: m.y }; st.carry = false; sfx('partfly', { x: m.x });
    }
    if (fly) {
      fly.t += dt / .7;
      if (fly.t >= 1) { fly = null; seat(); }
    }
    // the turbine
    turb.v = damp(turb.v, turb.seated ? SPIN : 0, turb.seated ? .8 : 3, dt); turb.a += turb.v * dt; turb.flash = Math.max(0, turb.flash - dt * .8);
    rack = Math.max(0, rack - dt / 1.2);
  }
  /* a lift: throw catbot to land on its target. High enough to clear the platform's edge, timed to come down on the spot. */
  function launch(v) {
    const L = v.lift, up = L.y - rig.fl + 45, vy = Math.sqrt(2 * G * up), t = vy / G + Math.sqrt(2 * 45 / G);
    if (mode === 'pounce') { mode = 'play'; modeT = 0; }
    st.oops = null;
    if (rig.facing !== Math.sign(L.x - rig.x) && rig.turnT < 0) rig.flip();
    rig.jump(vy, (L.x - rig.x) / t);
    rig.earL.vel -= 18; rig.earR.vel -= 16; rig.tailFlick(5); rig.hOy.vel += 40;
    FX.steam(rig.x, GY - rig.fl - 20, Math.ceil(8 * calmK()) + 2, 1.4); sfx('pounce', { x: rig.x, rate: .7 });
  }
  /* a jet: a hop backwards (the way it was facing, reversed), the oops pose, no reset and no rewind count.
     Its push is how far it travels on level ground; off a platform's edge it just falls further. */
  function shove(v) {
    const d = -rig.facing, P = v.push || 120, vx = (-.23 + Math.sqrt(.0529 + .004 * P)) / .002;   // P = vx*0.23 s in the air + vx²/1000 skidding to a stop
    rig.jump(300, d * vx);
    st.oops = 0;
    rig.earL.vel -= 16; rig.earR.vel -= 14; rig.hOy.vel -= 30; rig.tailFlick(5);
    FX.steam(rig.x, GY - rig.fl - 50, Math.ceil(6 * calmK()) + 1, 1.2); sfx('venthit', { x: rig.x });
    shake = Math.max(shake, 3);
  }
  /* index.html's pounce: catbot pinned the gear and takes it in its mouth */
  function pickUp() { st.carry = true; rig.earL.vel -= 10; rig.earR.vel -= 10; sfx('pin', { x: rig.x, rate: 1.3 }); caption('carry'); }
  /* the gear reached the turbine's hub */
  function seat() {
    st.got = true; installed.add(room.part.id); turb.seated = true; turb.flash = 1;
    const s = room.socket; FX.flash(s.x, s.y, 1.1, '255,225,150'); FX.sparks(s.x, s.y, 8, 1, .6); FX.sparks(s.x, s.y, 8, -1, .6);
    sfx('socket', { x: s.x }); sfx('spinup', { x: s.x, delay: .15 }); AUDIO.music.setLayers(installed.size);
    rig.earL.vel -= 18; rig.earR.vel -= 16; rig.tailFlick(5); shake = Math.max(shake, 2.6);
  }
  const tread = x => on() && !!beltAt(x, rig.fl);
  /* the faces of platforms too low to walk under, as index.html blockers. Only once catbot is below a platform's top
     (in the air it may be rising past one). soft: a cat that lands overlapping one is eased out, not snapped. */
  function blocks() {
    if (!on() || rig.air && rig.vy > 0) return [];      // rising (a lift's throw): the arc carries it over the edge, nothing to stop
    const out = [], b = base();
    for (const p of room.plats) if (p.y > rig.fl && p.y - SLAB < rig.fl + UNDER && b < p.y - 2) out.push({ x0: p.x, x1: p.x + p.w, clr: CAT.nose, soft: true });
    return out;
  }
  /* the camera rises with catbot so it stays in the lower part of the frame */
  const camYTarget = () => on() ? Math.max(-250, -.84 * base()) : 0;   // not named camY: that's the game's camera, which blit() reads

  /* ---------- sound: loops are states, fed once per tick from audioFrame() ---------- */
  function audio(dt) {
    const live = on() && mode !== 'card' && mode !== 'rewind';
    if (live) {
      room.belts.forEach((b, i) => {
        const d = Math.max(0, b.x - rig.x, rig.x - (b.x + b.w)) + Math.abs(lv(b) - rig.fl);
        AUDIO.start('belt' + i, { speed: b.v, near: Math.pow(clamp(1 - d / 520, 0, 1), 1.5), x: clamp(rig.x, b.x, b.x + b.w) });
      });
      AUDIO.start('rumble', { alive: turb.seated ? 1 : 0 });
      audioOn = true;
    } else if (audioOn) {
      for (let i = 0; i < 8; i++)AUDIO.stop('belt' + i);
      AUDIO.stop('rumble'); audioOn = false;
    }
  }

  /* =====================================================================
     DRAW
     ===================================================================== */
  /* ---------------------------------------------------------------------
     DEPTH LAYERS. The bay is machinery at several distances; the play plane
     (platforms, belts, vents, catbot) is the one sharp plane.
       far   f .35  giant turbines, ducting, furnace haze      blur 3
       mid   f .65  bulkhead frames, catwalks, pipes, gauges   blur 1.2
       play  f 1    drawn live (deck(), wall()'s play-plane props)
       near  f 1.25 pipes and cables across the top of the screen, blur 4
     Each scrolls with its own share (f) of the camera. Nothing is blurred per frame:
     each layer is painted once into an offscreen canvas with ctx.filter blur baked
     in, rebuilt only when the room or the canvas scale changes (lazy, from wall()),
     then drawn each frame as one cropped drawImage. Blurred layers don't need full
     resolution, so each is capped (cap) to keep memory down on big screens.
     The near layer rides the top edge of the SCREEN (fixY): it moves sideways only.
     With vertical parallax it would sink over the platforms when the camera climbs;
     pinned there, it can only ever frame, never cover the play.
     --------------------------------------------------------------------- */
  const PAD = 40;
  const LAYERS = {
    far: { f: .35, blur: 3, cap: 1, y0: -110, y1: 425 },
    mid: { f: .65, blur: 1.2, cap: 1.3, y0: -190, y1: 425 },
    near: { f: 1.25, blur: 4, cap: 1, y0: -10, y1: 96, fixY: true }
  };
  let lay = null, layKey = '', npuff = [];
  const hh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // deterministic scatter: the bay looks the same every visit
  function glow(g, x, y, rx, ry, a, rgb) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, x, y, rx, ry, a, rgb); g.restore(); }
  const PAINT = {
    far(g, w, L) {
      // the depth of the bay: black up high, a furnace-warm haze down toward the deck
      const gr = g.createLinearGradient(0, L.y0, 0, L.y1);
      gr.addColorStop(0, '#141922'); gr.addColorStop(.5, '#1d232d'); gr.addColorStop(.78, '#2b333f'); gr.addColorStop(1, '#1f252e');
      g.fillStyle = gr; g.fillRect(-PAD, L.y0, w + 2 * PAD, L.y1 - L.y0);
      for (let i = 0; i * 380 < w + PAD; i++)glow(g, i * 380 + hh(i) * 160, 262, 240, 80, .11, '255,130,60');
      // ducting: two thick runs high up, flanged
      for (const [y, r] of [[-50, 24], [34, 13]]) {
        g.fillStyle = '#252c37'; g.fillRect(-PAD, y - r, w + 2 * PAD, 2 * r);
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(-PAD, y - r + 3, w + 2 * PAD, 3);
        g.fillStyle = '#2e3643'; for (let x = -PAD; x < w + PAD; x += 120)g.fillRect(x, y - r - 4, 10, 2 * r + 8);
      }
      // giant turbines, standing on the bay floor far behind
      for (let i = 0; i * 560 < w + PAD; i++) {
        const cx = i * 560 + 150 + hh(i + 7) * 140, cy = 140 + hh(i + 3) * 30, R = 130 + hh(i + 11) * 50;
        g.fillStyle = '#262e39'; g.fillRect(cx - R * .5, cy, R, 300);                    // its plinth
        g.beginPath(); g.arc(cx, cy, R + 14, 0, TAU); g.fillStyle = '#303946'; g.fill();
        g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fillStyle = '#161b22'; g.fill();
        g.save(); g.translate(cx, cy); g.rotate(hh(i + 5) * TAU); g.fillStyle = '#38424f';
        for (let k = 0; k < 10; k++) { g.rotate(TAU / 10); g.beginPath(); g.moveTo(R * .18, -R * .06); g.quadraticCurveTo(R * .6, -R * .2, R * .95, -R * .1); g.lineTo(R * .95, R * .06); g.quadraticCurveTo(R * .6, 0, R * .18, R * .08); g.closePath(); g.fill(); }
        g.restore();
        g.beginPath(); g.arc(cx, cy, R * .18, 0, TAU); g.fillStyle = '#4a5462'; g.fill();
        for (let k = 0; k < 3; k++)glow(g, cx - R * .7 + k * R * .7, cy + R + 22, 8, 8, .5, hh(i * 3 + k) < .5 ? '255,170,90' : '110,255,170');   // status lamps on the plinth
      }
      // risers
      for (let i = 0; i * 230 < w + PAD; i++) { const x = i * 230 + hh(i + 40) * 90; g.fillStyle = '#222934'; g.fillRect(x, -110, 12 + hh(i) * 10, 400); }
      // haze in front of it all, thickest low down
      const hz = g.createLinearGradient(0, 120, 0, 300); hz.addColorStop(0, 'rgba(150,165,185,0)'); hz.addColorStop(1, 'rgba(150,165,185,.12)');
      g.fillStyle = hz; g.fillRect(-PAD, 120, w + 2 * PAD, 180);
    },
    mid(g, w, L) {
      const frames = []; for (let x = 40; x < w + PAD; x += 300)frames.push(x + hh(x) * 40);
      // catwalks between some of the frames: thin, dark and soft so they never read as somewhere to walk
      frames.forEach((x, i) => {
        const nx = frames[i + 1]; if (!nx) return;
        for (const y of [150, -40]) if (hh(i * 7 + y) < .55) {
          g.fillStyle = '#38404c'; g.fillRect(x, y, nx - x, 7);
          g.strokeStyle = '#3c4552'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 26); g.lineTo(nx, y - 26); g.moveTo(x, y - 13); g.lineTo(nx, y - 13);
          for (let px = x + 15; px < nx; px += 30) { g.moveTo(px, y); g.lineTo(px, y - 26); } g.stroke();
        }
      });
      // bulkhead frames: I-beams floor to ceiling
      for (const x of frames) {
        g.fillStyle = '#343c48'; g.fillRect(x - 13, L.y0, 26, 278 - L.y0);
        g.fillStyle = '#424b58'; g.fillRect(x - 13, L.y0, 4, 278 - L.y0); g.fillRect(x + 9, L.y0, 4, 278 - L.y0);
        g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(x - 13, L.y0, 1.5, 278 - L.y0);
        g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = L.y0 + 20; y < 270; y += 34) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
      }
      // pipes with valve wheels and gauges, a lamp or two
      for (let i = 0; i * 170 < w + PAD; i++) {
        const x = i * 170 + 60 + hh(i + 90) * 70, y0 = -190 + hh(i + 91) * 80, y1 = y0 + 160 + hh(i + 92) * 200;
        g.fillStyle = '#3a4350'; g.fillRect(x - 5, y0, 10, y1 - y0);
        if (hh(i + 93) < .5) { const vy = lerp(y0, y1, .5); g.strokeStyle = '#4d5765'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, vy, 10, 0, TAU); g.moveTo(x - 10, vy); g.lineTo(x + 10, vy); g.moveTo(x, vy - 10); g.lineTo(x, vy + 10); g.stroke(); }
        else { const gy = lerp(y0, y1, .4); g.beginPath(); g.arc(x + 12, gy, 7, 0, TAU); g.fillStyle = '#5a6068'; g.fill(); g.fillStyle = '#3a4048'; g.fillRect(x + 4, gy - 1.5, 6, 3); }
        if (hh(i + 94) < .35) glow(g, x, y1 + 8, 7, 7, .55, hh(i + 95) < .6 ? '255,180,100' : '110,255,170');
      }
    },
    near(g, w, L) {
      // two pipe runs and their cables, in segments with gaps so it frames rather than bars the top of the screen
      for (let i = 0; i * 620 < w + PAD; i++) {
        const x0 = i * 620 + hh(i + 60) * 160, len = 260 + hh(i + 61) * 260;
        for (const [y, r] of [[10, 17], [46, 9]]) {
          if (r < 10 && hh(i + 62) < .4) continue;
          g.fillStyle = '#07090c'; g.fillRect(x0, y - r, len, 2 * r);
          g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0, y - r + 2, len, 2);
          g.fillStyle = '#0b0e12'; for (let x = x0 + 30; x < x0 + len; x += 110)g.fillRect(x, y - r - 3, 8, 2 * r + 6);
        }
        // a cable sagging between brackets
        g.strokeStyle = '#050608'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + 20, 30); g.quadraticCurveTo(x0 + len / 2, 30 + 40 + hh(i + 63) * 18, x0 + len - 20, 30); g.stroke();
      }
    }
  };
  function buildLayers() {
    const key = S.toFixed(3) + '|' + room.id; if (key === layKey && lay) return;
    layKey = key; lay = {};
    const maxCam = Math.max(0, room.w - W);
    for (const [name, L] of Object.entries(LAYERS)) {
      const sc = Math.min(S, L.cap), w = Math.ceil(maxCam * L.f + W), h = L.y1 - L.y0;
      const raw = document.createElement('canvas'); raw.width = Math.ceil((w + 2 * PAD) * sc); raw.height = Math.ceil(h * sc);
      const g = raw.getContext('2d'); g.setTransform(sc, 0, 0, sc, PAD * sc, -L.y0 * sc);   // content coords: x = screen x at camX 0, y = screen y at camY 0
      PAINT[name](g, w, L);
      let out = raw;
      if (FILTER && L.blur) { out = document.createElement('canvas'); out.width = raw.width; out.height = raw.height; const o = out.getContext('2d'); o.filter = `blur(${(L.blur * sc).toFixed(2)}px)`; o.drawImage(raw, 0, 0); }
      lay[name] = { ...L, cv: out, sharp: name === 'far' ? raw : null, sc };
    }
  }
  /* one layer, cropped to what the camera shows: content x appears at screen x - camX*f */
  function blit(g, L, alpha, img) {
    const cv = img || L.cv, X0 = camX * L.f - 12, sx = Math.max(0, (X0 + PAD) * L.sc), sw = Math.min(cv.width - sx, (W / zoom + 24) * L.sc);
    if (sw <= 0 || alpha <= .003) return;
    const dx = sx / L.sc - PAD + camX * (1 - L.f), dy = L.fixY ? camY + L.y0 : L.y0 + camY * (1 - L.f);
    g.globalAlpha = alpha; g.drawImage(cv, sx, 0, sw, cv.height, dx, dy, sw / L.sc, cv.height / L.sc); g.globalAlpha = 1;
  }
  /* a puff of a vent's steam drifting into the foreground: born where the blast is, moving at the near layer's pace */
  function nearPuff(cx) {
    if (!lay) return;
    const n = Math.round(2 * calmK() + .3);
    for (let i = 0; i < n; i++)npuff.push({ X: cx + .25 * camX + rnd(-30, 30), y: rnd(30, 70), r: rnd(40, 70), vx: rnd(-12, 12), life: 0, max: rnd(2, 3) });
  }
  function drawNear(g, dt) {
    if (!lay) return;
    for (let i = npuff.length - 1; i >= 0; i--) {
      const p = npuff[i]; p.life += dt; if (p.life > p.max) { npuff.splice(i, 1); continue; }
      p.X += p.vx * dt; p.y -= 6 * dt; p.r += 10 * dt;
      const u = p.life / p.max, a = .16 * Math.sin(Math.PI * u) * (settings.calm ? .5 : 1);
      softEllipse(g, p.X - .25 * camX, p.y + camY, p.r, p.r * .7, a, '225,232,240');
    }
    blit(g, lay.near, FILTER ? .9 : .6);
  }

  const CEIL = GY - 290 - 150;                       // the underside of the ceiling, world y
  /* behind the play plane: the far and mid layers, then the ceiling, platform legs, the beat boards, the turbine */
  function wall(g, t) {
    if (!on()) return false;
    const x0 = camX - 8, x1 = camX + W + 8;
    buildLayers();
    blit(g, lay.far, 1);
    if (rack > 0) blit(g, lay.far, .85 * Math.sin(Math.PI * (1 - rack)), lay.far.sharp);   // focus rack: the first blast pulls the far machinery sharp for a moment, like the opening's focus pull
    blit(g, lay.mid, FILTER ? 1 : .75);
    // the ceiling: a heavy slab with beams
    g.fillStyle = '#14171d'; g.fillRect(x0, CEIL - 200, x1 - x0, 200);
    g.fillStyle = '#2a2e35'; g.fillRect(x0, CEIL - 14, x1 - x0, 14); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x0, CEIL, x1 - x0, 4);
    for (let x = Math.floor(x0 / 160) * 160; x < x1; x += 160) { g.fillStyle = '#1d2127'; g.fillRect(x, CEIL - 200, 22, 200); g.fillStyle = '#8d939b'; g.beginPath(); g.arc(x + 11, CEIL - 7, 1.6, 0, TAU); g.fill(); }
    // platform supports: legs down to the deck, or hangers up to the ceiling
    for (const p of room.plats) {
      if (p.x + p.w < x0 - 20 || p.x > x1 + 20) continue;
      const top = GY - p.y, bot = top + SLAB;
      g.fillStyle = '#22262d'; g.strokeStyle = OL; g.lineWidth = 1;
      if (p.hang) for (let x = p.x + 30; x < p.x + p.w; x += 140) { g.fillRect(x - 2, CEIL, 4, top - 24 - CEIL); g.fillRect(x - 6, CEIL, 12, 6); }
      else for (const x of [p.x + 18, p.x + p.w - 18, p.x + p.w / 2]) { g.fillRect(x - 5, bot, 10, GY - 24 - bot); g.strokeRect(x - 5, bot, 10, GY - 24 - bot); }
    }
    drawBeatBoards(g, t);
    drawTurbine(g, t);
    return true;
  }
  /* one board above each vent: four lamps, the current beat lit, the vent's own beat ringed. It warms as the vent warns. */
  function drawBeatBoards(g, t) {
    const bb = ((beat % 4) + 4) % 4;
    room.vents.forEach((v, i) => {
      const cx = vcx(v), y = GY - lv(v) - 152, o = vs[i]; if (!inView(cx)) return;   // above the ears, under the trolley rail / the next platform
      g.fillStyle = '#1c2028'; g.strokeStyle = OL; g.lineWidth = 1.2; g.beginPath(); g.roundRect(cx - 34, y - 12, 68, 24, 4); g.fill(); g.stroke();
      g.fillStyle = '#3b3f45'; g.fillRect(cx - 1.5, y + 12, 3, GY - lv(v) - 24 - (y + 12));            // its post down to the floor
      for (let k = 0; k < 4; k++) {
        const lx = cx - 21 + k * 14, mine = k === v.beat, cur = k === bb;
        const warm = mine ? Math.max(o.tele, o.col) : 0, hue = v.lift ? '125,255,176' : '255,170,90';
        g.beginPath(); g.arc(lx, y, 4, 0, TAU);
        g.fillStyle = mine ? (warm > .02 ? (v.lift ? `rgb(${lerp(90, 200, warm) | 0},255,${lerp(150, 220, warm) | 0})` : `rgb(255,${lerp(120, 235, warm) | 0},${lerp(60, 200, warm) | 0})`) : (v.lift ? '#1f4a33' : '#5a2a20')) : (cur ? '#d9e6ee' : '#2c3139');
        g.fill(); g.lineWidth = 1; g.strokeStyle = mine ? (v.lift ? '#7dffb0' : '#ff8a5a') : OL; g.stroke();
        if (cur && !mine) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, lx, y, 10, 10, .35 * (.5 + .5 * beatK), '200,225,255'); g.restore(); }
        if (mine && warm > .02) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, lx, y, 16, 16, .5 * warm, hue); g.restore(); }
      }
    });
  }
  /* the turbine on the back wall: its hub is the socket. Still and grey until the gear goes in, then brass and spinning. */
  function drawTurbine(g, t) {
    const s = room.socket, R = 62, on_ = turb.seated, sp = clamp(turb.v / SPIN, 0, 1);
    if (!inView(s.x)) return;
    g.fillStyle = '#2a2e35'; g.strokeStyle = OL; g.lineWidth = 1.2;
    for (const dx of [-44, 44]) { g.beginPath(); g.moveTo(s.x + dx * .6, s.y + R * .6); g.lineTo(s.x + dx, GY - 24); g.lineTo(s.x + dx + 10 * Math.sign(dx), GY - 24); g.lineTo(s.x + dx * .6 + 8 * Math.sign(dx), s.y + R * .5); g.closePath(); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(s.x, s.y, R + 9, 0, TAU); g.fillStyle = '#2f343c'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
    g.fillStyle = '#8d939b'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.arc(s.x + Math.cos(a) * (R + 4.5), s.y + Math.sin(a) * (R + 4.5), 1.5, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.fillStyle = '#0e1115'; g.fill();
    if (on_) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, s.x, s.y, R, R, .18 + .06 * Math.sin(t * 3), '255,170,80'); g.restore(); }
    g.save(); g.translate(s.x, s.y); g.rotate(turb.a);
    const bl = on_ ? '#b07f3e' : '#4b5059', bd = on_ ? '#6e4a1e' : '#2c3036';
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate(i / 8 * TAU);
      g.beginPath(); g.moveTo(17, -5); g.quadraticCurveTo(R * .6, -14, R - 4, -7); g.lineTo(R - 4, 5); g.quadraticCurveTo(R * .6, 2, 17, 6); g.closePath();
      const gr = g.createLinearGradient(0, -10, 0, 8); gr.addColorStop(0, bl); gr.addColorStop(1, bd); g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke();
      g.restore();
    }
    g.restore();
    if (sp > .4) { g.save(); g.globalAlpha = .25 * sp; g.strokeStyle = on_ ? '#ffd27a' : '#8d939b'; g.lineWidth = 6; g.beginPath(); g.arc(s.x, s.y, R * .68, 0, TAU); g.stroke(); g.restore(); }   // motion blur ring
    if (on_) disc(g, s.x, s.y, 16, NEAR, turb.a * 1.3, false);
    else {
      g.beginPath(); g.arc(s.x, s.y, 15, 0, TAU); g.fillStyle = '#07090c'; g.fill();
      g.setLineDash([3, 3.5]); g.strokeStyle = `rgba(95,208,255,${.45 + .25 * Math.sin(t * 3)})`; g.lineWidth = 1.4; g.beginPath(); g.arc(s.x, s.y, 19, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    if (turb.flash > 0) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, s.x, s.y, R * 2.2, R * 2.2, .6 * turb.flash * calmK(), '255,220,150'); g.restore(); }
    g.font = '600 9px Oswald,sans-serif'; g.textAlign = 'center'; g.fillStyle = on_ ? 'rgba(255,210,122,.7)' : 'rgba(214,165,78,.35)';
    if ('letterSpacing' in g) g.letterSpacing = '2px'; g.fillText(on_ ? 'TURBINE 2  ·  ONLINE' : 'TURBINE 2  ·  NO HUB', s.x, s.y + R + 24); if ('letterSpacing' in g) g.letterSpacing = '0px'; g.textAlign = 'left';
  }

  /* the play plane: platforms, the pocket, belts, vents, the steam behind catbot. Floor things are drawn at their own
     level: everything is drawn as if on the deck, shifted up by its y. */
  function deck(g, t) {
    if (!on()) return;
    const cxv = camX + W / 2;
    for (const p of room.plats) drawPlat(g, t, p, cxv);
    const pk = room.pocket;
    if (pk && inView(pk.x + pk.w / 2)) {
      g.save(); g.setLineDash([6, 4]); g.strokeStyle = 'rgba(125,255,176,.32)'; g.lineWidth = 1.5; g.strokeRect(pk.x, GY - 20, pk.w, 17); g.setLineDash([]);
      g.fillStyle = 'rgba(125,255,176,.18)';
      for (const [px, py] of [[pk.x + pk.w * .35, GY - 10], [pk.x + pk.w * .65, GY - 13]]) { g.save(); g.translate(px, py); g.scale(1, .45); g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); for (const dx of [-5, 0, 5]) { g.beginPath(); g.arc(dx, -6, 1.8, 0, TAU); g.fill(); } g.restore(); }
      g.restore();
    }
    for (const b of room.belts) { g.save(); g.translate(0, -lv(b)); drawBelt(g, t, b, cxv); g.restore(); }
    room.vents.forEach((v, i) => { g.save(); g.translate(0, -lv(v)); drawVent(g, t, v, vs[i]); g.restore(); });
    room.vents.forEach((v, i) => column(g, t, v, vs[i], .55));
  }
  function drawPlat(g, t, p, cxv) {
    if (p.x + p.w < camX - 20 || p.x > camX + W + 20) return;
    const x = p.x, w = p.w, top = GY - p.y;
    // walking surface: a strip of deck plate, same perspective as the main deck
    const dk = g.createLinearGradient(0, top - 24, 0, top); dk.addColorStop(0, '#3a3f48'); dk.addColorStop(1, '#565c66');
    g.fillStyle = dk; g.fillRect(x, top - 24, w, 25);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.beginPath();
    for (let sx = Math.ceil(x / 64) * 64; sx < x + w; sx += 64) { g.moveTo(sx, top - 24); g.lineTo(sx + (sx - cxv) * .05, top); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, top, w, 1.5);
    // the slab's face: girder with rivets, hazard ends
    const fc = g.createLinearGradient(0, top, 0, top + SLAB); fc.addColorStop(0, '#4b5059'); fc.addColorStop(1, '#2a2e35');
    g.fillStyle = fc; g.fillRect(x, top + 1.5, w, SLAB - 1.5); g.strokeStyle = OL; g.lineWidth = 1.2; g.strokeRect(x, top - 24, w, SLAB + 24);
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let sx = x + 12; sx < x + w - 6; sx += 24) { g.beginPath(); g.arc(sx, top + 8, 1.3, 0, TAU); g.fill(); g.beginPath(); g.arc(sx, top + SLAB - 7, 1.3, 0, TAU); g.fill(); }
    for (const ex of [x, x + w - 12]) { g.save(); g.beginPath(); g.rect(ex, top + 1.5, 12, SLAB - 1.5); g.clip(); for (let k = -4; k < 6; k++) { g.fillStyle = k % 2 ? '#d6a54e' : '#22150a'; g.beginPath(); g.moveTo(ex + k * 6, top + SLAB); g.lineTo(ex + k * 6 + 6, top + SLAB); g.lineTo(ex + k * 6 + 18, top); g.lineTo(ex + k * 6 + 12, top); g.closePath(); g.fill(); } g.restore(); }
    // its shadow on the wall below
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, top + SLAB, w - 12, 10);
  }
  function drawBelt(g, t, b, cxv) {
    if (b.x + b.w < camX - 20 || b.x > camX + W + 20) return;
    const x = b.x, w = b.w, d = Math.sign(b.v), deckLvl = !lv(b);
    g.save(); g.beginPath(); g.rect(x, GY - 23, w, 24); g.clip();
    g.fillStyle = '#1b1e24'; g.fillRect(x, GY - 23, w, 24);
    const off = ((t * b.v) % 16 + 16) % 16;
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5; g.beginPath();
    for (let sx = x - 16 + off; sx < x + w + 16; sx += 16) { g.moveTo(sx, GY - 23); g.lineTo(sx + (sx - cxv) * .05, GY + 1); }
    g.stroke();
    // chevrons painted on it, travelling with it: which way it goes, readable without sound
    const co = ((t * b.v) % 48 + 48) % 48;
    g.strokeStyle = 'rgba(214,165,78,.5)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let sx = x - 48 + co; sx < x + w + 48; sx += 48) { g.beginPath(); g.moveTo(sx - 4 * d, GY - 16); g.lineTo(sx + 3 * d, GY - 11); g.lineTo(sx - 4 * d, GY - 6); g.stroke(); }
    g.lineCap = 'butt'; g.restore();
    g.strokeStyle = '#5a616b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, GY - 23.5); g.lineTo(x + w, GY - 23.5); g.stroke();
    // rollers in the front lip, spinning with it
    for (const rx of [x + 6, x + w / 2, x + w - 6]) {
      g.save(); g.translate(rx, GY + 6.5); g.rotate(t * b.v / 5);
      g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.fillStyle = '#2a2e35'; g.fill(); g.lineWidth = 1; g.strokeStyle = OL; g.stroke();
      g.strokeStyle = '#8d939b'; g.beginPath(); g.moveTo(-3.5, 0); g.lineTo(3.5, 0); g.stroke(); g.restore();
    }
    // the return run under it (cutaway), going the other way
    g.fillStyle = '#16191e'; g.fillRect(x + 6, GY + 17, w - 12, 5);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath();
    for (let sx = x + 6 + ((-t * b.v) % 16 + 16) % 16; sx < x + w - 6; sx += 16) { g.moveTo(sx, GY + 17); g.lineTo(sx, GY + 22); } g.stroke();
    if (!deckLvl) return;                         // a platform's slab is too thin for the motor; the deck's cutaway has room
    const mx = d > 0 ? x + 18 : x + w - 18;
    g.fillStyle = '#2b2f36'; g.fillRect(mx - 14, GY + 26, 28, 20); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(mx - 14, GY + 26, 28, 20);
    g.save(); g.translate(mx, GY + 36); g.rotate(t * b.v / 8); g.strokeStyle = '#8d939b'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.moveTo(-6, 0); g.lineTo(6, 0); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke(); g.restore();
    g.beginPath(); g.arc(mx + 10, GY + 29, 1.8, 0, TAU); g.fillStyle = '#7dffb0'; g.fill();
    for (const ex of [x, x + w - 10]) { g.save(); g.beginPath(); g.rect(ex, GY + 2.5, 10, 8); g.clip(); for (let k = -1; k < 4; k++) { g.fillStyle = k % 2 ? '#d6a54e' : '#22150a'; g.beginPath(); g.moveTo(ex + k * 5, GY + 11); g.lineTo(ex + k * 5 + 5, GY + 11); g.lineTo(ex + k * 5 + 13, GY + 2); g.lineTo(ex + k * 5 + 8, GY + 2); g.closePath(); g.fill(); } g.restore(); }
  }
  /* a vent, drawn as if on the deck (deck() shifts it up to its level). A jet is a striped hazard grate with an amber
     lamp; a lift is a round pad with green arrows pointing up and a green lamp. */
  function drawVent(g, t, v, o) {
    const cx = vcx(v); if (!inView(cx)) return;
    const x = v.x, w = v.w, warm = Math.max(o.tele, o.col), L = !!v.lift;
    g.save(); g.beginPath(); g.rect(x - 8, GY - 23, w + 16, 24); g.clip();
    if (L) { g.fillStyle = '#1f3a2c'; g.fillRect(x - 8, GY - 23, w + 16, 24); }
    else for (let k = -2; k < (w + 16) / 8 + 2; k++) { g.fillStyle = k % 2 ? '#d6a54e' : '#2a1c0c'; g.beginPath(); g.moveTo(x - 8 + k * 8, GY + 1); g.lineTo(x - 4 + k * 8, GY + 1); g.lineTo(x + 4 + k * 8, GY - 23); g.lineTo(x + k * 8, GY - 23); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = '#090b0e'; g.fillRect(x, GY - 21, w, 20);
    g.fillStyle = L ? '#2f5a44' : '#3a3f48'; for (let sx = x + 3; sx < x + w - 2; sx += 6)g.fillRect(sx, GY - 21, 2.4, 20);
    g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x, GY - 21, w, 20);
    if (L) { g.strokeStyle = `rgba(125,255,176,${.45 + .4 * warm})`; g.lineWidth = 2; g.lineCap = 'round'; for (const dx of [-14, 0, 14]) { g.beginPath(); g.moveTo(cx + dx - 5, GY - 6); g.lineTo(cx + dx, GY - 13); g.lineTo(cx + dx + 5, GY - 6); g.stroke(); } g.lineCap = 'butt'; }
    if (warm > .01) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, cx, GY - 11, w * .75, 13, .12 + .55 * warm, L ? '110,255,170' : '255,150,70'); g.restore(); }
    // the lamp beside it: dim, warms through the warning (a ramp, never a flash), white while it blows
    const lx = x + w + 16;
    g.fillStyle = '#2b2f36'; g.fillRect(lx - 2.5, GY - 44, 5, 22);
    const lc = o.col > .3 ? '#f2fff6' : warm > .02 ? (L ? `rgb(${lerp(60, 170, o.tele) | 0},255,${lerp(120, 190, o.tele) | 0})` : `rgb(255,${lerp(110, 200, o.tele) | 0},${lerp(50, 110, o.tele) | 0})`) : (L ? '#1f4a33' : '#5a3a20');
    g.beginPath(); g.arc(lx, GY - 48, 6, 0, TAU); g.fillStyle = lc; g.fill(); g.strokeStyle = OL; g.stroke();
    if (warm > .02) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, lx, GY - 48, 24, 24, .45 * warm, L ? '110,255,170' : '255,180,100'); g.restore(); }
    // the pipe under it (cutaway) and a gauge whose needle climbs with the pressure (on the deck; a platform's slab only has room for the pipe)
    const deckLvl = !lv(v);
    g.fillStyle = '#2b3038'; g.fillRect(cx - 8, GY + 2, 16, deckLvl ? H - GY : SLAB - 2);
    if (!deckLvl) return;
    const gx = cx + 24, gy = GY + 40, na = lerp(-2.4, .7, warm);
    g.beginPath(); g.arc(gx, gy, 10, 0, TAU); g.fillStyle = '#d9d2bf'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#3b3f45'; g.stroke();
    g.strokeStyle = '#c3673d'; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, 7, -.1, .9); g.stroke();
    g.strokeStyle = '#22150a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(na) * 7.5, gy + Math.sin(na) * 7.5); g.stroke();
    g.fillStyle = '#2b3038'; g.fillRect(cx + 8, gy - 2, 6, 4);
  }
  /* the jet: a column of soft steam up from the grate (a lift's reaches up past the platform it throws you to).
     Drawn twice: thick behind catbot, thin in front of it. */
  function column(g, t, v, o, a) {
    if (o.col < .01) return;
    const cx = vcx(v); if (!inView(cx)) return;
    const y0 = GY - lv(v) - 14, full = v.lift ? v.lift.y - lv(v) + 120 : 230, top = full * Math.min(1, o.age / .12), n = 10;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), y = y0 - u * top, rx = v.w * (.4 + .85 * u) + 5 * Math.sin(t * 9 + i * 1.7), ry = 20 + 12 * u;
      softEllipse(g, cx + 7 * Math.sin(t * 4 + i * 1.3), y, rx, ry, a * o.col * (1 - .55 * u), v.lift ? '226,244,236' : '232,238,244');
    }
  }
  let lastT = 0;
  function front(g, t) {
    if (!on()) return;
    const dt = clamp(t - lastT, 0, .05); lastT = t;
    room.vents.forEach((v, i) => column(g, t, v, vs[i], .2));
    // the gear in catbot's mouth, or hopping from it into the turbine
    if (st.carry) { const m = rig.mouthP(); disc(g, m.x + rig.facing * 3, m.y + 3, 11, NEAR, turb.a + t * .2, false); }
    if (fly) {
      const s = room.socket, e = easeIO(fly.t), x = lerp(fly.x0, s.x, e), y = lerp(fly.y0, s.y, e) - Math.sin(Math.PI * fly.t) * 60;
      disc(g, x, y, lerp(11, 16, fly.t), NEAR, t * 14, false);
      if (Math.random() < .5) FX.sparks(x, y, 1, -rig.facing, .25);
    }
    drawNear(g, dt);                            // last: the foreground pipes and any steam drifting into them
  }

  return { reset, update, seat, pickUp, tread, audio, wall, deck, front, blocks, camY: camYTarget, on, state: () => ({ clk, beat, vs, turb, fly, lay }) };
})();

/* dev entry: index.html#room=engine  (optional  &parts=hip,... ; hip is assumed unless parts are given)
   skips the opening and drops catbot straight into that room */
{
  const m = /(^|[#&])room=([\w-]+)/.exec(location.hash);
  const i = m ? ROOMS.findIndex(r => r.id === m[2]) : -1;
  if (i >= 0) {
    const pm = /parts=([\w,-]+)/.exec(location.hash);
    for (const id of pm ? pm[1].split(',') : ['hip']) installed.add(id);
    OPEN.finish(false);
    loadRoom(i); mode = 'play'; modeT = 0;
  }
}
