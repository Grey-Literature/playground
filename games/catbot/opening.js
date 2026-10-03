'use strict';
/* =====================================================================
   OPENING: the premise, told in-engine, before the title.
   Built with Claude Opus 5.5 (claude-opus-5-5) in Claude Code.
   Shots 1-3 are their own small stage (space, cabin, impact). Shot 4 is
   the real aft hold at a close zoom on the real rig, lit by one flickering
   emergency lamp, so "cut to the aft hold" lands on the playable start.
   No input except movement, and any movement skips it.
   Needs: catbot.js and the game script (W, H, S, ctx, rig, room, zoom...).
   ===================================================================== */
const OPEN = (() => {
  const LB = 46;                       // letterbox bar height
  const SH = { cabin: 12.8, impact: 27.0, dark: 29.0, silence: 31.2, wreck: 33.6, end: 51.2 };
  /* [from, to, text, kind]. No kind: always shown.
     'fb':  a story line that sound can't carry. Shown only when sound can't be heard (muted in-game, never started, failed).
     'snd': stands in for a sound. Same rule, but drawn small, italic and [bracketed] so it reads as a sound cue, not narration. */
  const LINES = [
    [0.8, 3.6, 'A small shuttle tumbles out of the dark.'],
    [3.8, 5.6, 'It is already dying.'],
    [5.8, 8.6, 'One engine flickers. Another is gone entirely.'],
    [8.8, 12.6, 'Loose panels tear away as the ship spins toward the surface below.'],
    [13.2, 16.2, 'Inside, warning lights flash over an empty cabin.', 'fb'],
    [16.4, 17.8, 'Storage bins burst open.', 'snd'],
    [17.8, 21.4, 'Tools, crates, gears, and stranger pieces scatter across the deck.', 'snd'],
    [21.6, 24.8, 'Something round and tightly wound rolls beneath a bench.', 'fb'],
    [25.0, 26.8, 'A ball of yarn.', 'fb'],
    [27.2, 28.8, 'The shuttle hits.'],
    [29.2, 31.0, 'Metal folds. Lights die.', 'snd'],
    [31.4, 33.4, 'Silence.', 'snd'],
    [34.0, 35.4, 'Then—', 'fb'],
    [35.6, 37.6, 'A faint mechanical click.', 'snd'],
    [37.8, 42.6, 'In the wreckage sits a small clockwork repair droid, folded awkwardly where the impact threw it.', 'fb'],
    [42.8, 44.6, 'Brass body. Copper joints.', 'fb'],
    [44.8, 47.4, 'Cat ears that serve no obvious engineering purpose.', 'fb'],
    [47.6, 49.4, 'Its winding key turns once.'],
    [49.6, 50.8, 'Stops.', 'snd'],
  ];
  const shown = (l, t) => t >= l[0] && t < l[1] && (!l[3] || !AUDIO.active());   // 'fb' and 'snd' lines appear only when sound isn't audible
  const lineAt = t => LINES.find(l => shown(l, t));
  const eo = u => 1 - (1 - u) * (1 - u);
  let stars, fx, items, panels, yarn, lockers, quake = 0, burst = false, flash = 0, lit = 0, sparkAt = null;
  const marks = new Set();
  const at = (k, c) => { if (c && !marks.has(k)) { marks.add(k); return true; } return false; };

  /* ---------------- sound: the cue sheet ----------------
     Cues hang off the same marks and the same state as the picture (at(...) marks, floor bounces, yarn speed, the
     flicker values), so sound and picture can't drift apart. Shot 1 is heard through the hull (space itself is
     silent), the cabin is clear, the impact leaves the world dull and ringing, then true silence, then one click.
     The shape of it: loud and hard through the cabin, the yarn rolling past in silence, and quiet as the payoff.  */
  const BEDS = ['drone', 'air', 'tube'];
  const BOUNCE = { gear: 'clink', bolt: 'clink', watch: 'clink', crate: 'thunk', wrench: 'clang', spring: 'boing', bulb: 'tink', bird: 'chirp' };
  let lastBeacon = -1, nextCough = .9, nextCreak = 2.5, tubeL = 0;
  const stopBeds = () => { for (const b of BEDS) AUDIO.stop(b); };
  /* the clock ticks from the click (35.6) to the key stopping (48.55); the game's own ambient tick takes over from there */
  const ticking = () => mode === 'intro' && modeT >= 35.6 && modeT < 48.55;
  function sound(dt, t) {
    if (t >= SH.dark && t < 30.6) tubeL = Math.random() < .4 ? .12 : .55;     // the last tube: this value is drawn (render) and heard (below)
    if (t < SH.cabin) {                                                       // shot 1: through the hull
      AUDIO.start('drone', { amt: .5 + .15 * seg(t, 8, 12.6) });
      const u = seg(t, 8.8, 12.8);                                            // the atmosphere builds as the ship meets it
      if (u > 0) AUDIO.start('air', { amt: .1 + .9 * u, hz: 500 + 2400 * u });
      if (t > 1 && (nextCough -= dt) < 0) { sfx('cough', { x: ship1(t).x }); nextCough = rnd(.7, 1.7); }
      if (t > 2.5 && (nextCreak -= dt) < 0) { sfx('creak', { rate: rnd(.8, 1.2) }); nextCreak = rnd(2.2, 4.5); }
      if (at('flameout', t >= 5.8)) sfx('flameout');                          // engine B is "gone entirely": the only cue it gets
    } else if (t < SH.impact) {                                               // the cabin: inside, so clearer
      if (at('cabin', true)) { AUDIO.stop('air'); AUDIO.muffle(6000, .05); }
      AUDIO.start('drone', { amt: .3 });
      const k = Math.floor(t * 6.5 / TAU);                                    // one warning tone per beacon pulse (the beacon is sin(t*6.5))
      if (k !== lastBeacon) { lastBeacon = k; sfx('alarm'); }
      for (let i = 0; i < 4; i++) if (at('creak' + i, t >= 14.65 + 3.7 * i)) sfx('creak', { rate: .7 + .1 * i });   // the hull flexes at each end of the roll
      // (the yarn, 21.4-24.6, rolls in silence on purpose: nothing that soft would be heard over an alarm and a rolling hull)
      if (at('pull', t >= 24.8)) AUDIO.muffle(1500, 1.8);                     // the push-in on the yarn, as a focus pull: the world goes soft
    } else if (t < SH.dark) {                                                 // shot 3: the fall
      if (at('fall', true)) AUDIO.muffle(20000, .05);
      const u = clamp((t - SH.impact) / 1.6, 0, 1);
      if (t < 28.6) { AUDIO.start('air', { amt: .2 + .8 * u, hz: 400 + 2200 * u }); AUDIO.start('drone', { amt: .5 + .4 * u }); }
    }
    if (t >= SH.dark && t < 30.6) AUDIO.start('tube', { amt: tubeL });        // the tube flickers exactly as it's drawn
    if (at('fold', t >= 29.1)) sfx('groan');                                   // "metal folds"
    if (at('pwrdn', t >= 30.6)) { AUDIO.stop('tube'); sfx('powerdown'); }      // "lights die"
    if (at('hush', t >= 31.0)) AUDIO.duck(0, .25);                             // true silence (the old "Silence." caption): the ring and everything else cut away
    if (at('cool', t >= 32.9)) { AUDIO.duck(1, .02); sfx('cool'); }            // one distant tink, to prove the silence is real
    if (at('room', t >= 34.0)) { AUDIO.muffle(20000, .05); AUDIO.start('drone', { amt: .05 }); }   // "Then—": the room tone comes back, barely
    if (t >= 36.4) AUDIO.start('tube', { amt: lit * .8 });                     // the lamp: its buzz follows the same flicker as the light, and drops out when it does
  }

  function init() {
    stars = Array.from({ length: 190 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < .08 ? 1.7 : rnd(.3, 1.2), tw: rnd(1, 4), ph: rnd(0, TAU) }));
    fx = []; items = []; panels = []; marks.clear(); quake = 0; burst = false; flash = 0; lit = 0; sparkAt = null;
    lastBeacon = -1; nextCough = .9; nextCreak = 2.5; tubeL = 0;
    yarn = { x: W + 40, v: -380, a: 0, r: 13, trail: [] };
    lockers = [{ x: 328 }, { x: 438 }, { x: 548 }].map(l => Object.assign(l, { o: 0, ov: 0 }));
  }

  /* ---------------- shuttle ---------------- */
  const HOLES = [[-22, -12, 14, 8], [18, -14, 12, 7], [-4, 9, 16, 7], [34, 6, 10, 7]];
  function shipLocal(s, a, x, y, px, py) { const [rx, ry] = rot(px * s, py * s, a); return { x: x + rx, y: y + ry }; }
  function drawShuttle(g, x, y, s, a, t, o) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    // engine A: still burning, badly
    const sput = o.dead ? 0 : (Math.sin(t * 23) > .55 || Math.random() < .12) ? .15 : 1, len = (28 + Math.sin(t * 47) * 6) * sput;
    if (len > 3) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const fg = g.createLinearGradient(-64, 0, -64 - len, 0); fg.addColorStop(0, 'rgba(190,240,255,.95)'); fg.addColorStop(.3, 'rgba(255,170,70,.8)'); fg.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = fg; g.beginPath(); g.moveTo(-63, -23); g.quadraticCurveTo(-64 - len * .6, -21, -64 - len, -17); g.quadraticCurveTo(-64 - len * .6, -13, -63, -11); g.closePath(); g.fill(); g.restore();
    }
    // nacelles: A whole, B torn off at the root
    limb(g, -64, -17, -30, -17, 12, 12, STC(NEAR));
    g.fillStyle = '#2a2e34'; g.beginPath(); g.moveTo(-40, 11); g.lineTo(-48, 13); g.lineTo(-44, 17); g.lineTo(-50, 21); g.lineTo(-38, 24); g.lineTo(-30, 22); g.closePath(); g.fill(); g.lineWidth = 1.2; g.strokeStyle = OL; g.stroke();
    // hull
    const hull = new Path2D();
    hull.moveTo(-56, -19); hull.bezierCurveTo(-20, -25, 34, -24, 52, -14); hull.bezierCurveTo(70, -6, 70, 6, 52, 14);
    hull.bezierCurveTo(30, 22, -20, 22, -56, 18); hull.bezierCurveTo(-64, 10, -64, -10, -56, -19);
    const hg = g.createLinearGradient(0, -24, 0, 22); hg.addColorStop(0, '#ffe3a0'); hg.addColorStop(.35, '#d29f4a'); hg.addColorStop(.8, '#8c5b22'); hg.addColorStop(1, '#4a2e10');
    g.fillStyle = hg; g.fill(hull);
    g.save(); g.clip(hull);
    g.strokeStyle = 'rgba(74,46,16,.6)'; g.lineWidth = 1;
    for (const px of [-38, -14, 10, 32]) { g.beginPath(); g.moveTo(px, -26); g.lineTo(px + 2, 24); g.stroke(); }
    g.beginPath(); g.moveTo(-60, 2); g.lineTo(60, 2); g.stroke();
    g.fillStyle = '#8d939b'; g.fillRect(-60, 10, 120, 4);
    for (let i = 0; i < Math.min(o.lost, HOLES.length); i++) { const [hx, hy, hw, hh] = HOLES[i]; g.fillStyle = '#120b06'; g.fillRect(hx, hy, hw, hh); g.strokeStyle = '#e7b866'; g.strokeRect(hx, hy, hw, hh); }
    // cockpit glass, dark: there's nobody at the controls
    g.fillStyle = '#0b1428'; g.beginPath(); g.moveTo(40, -15); g.quadraticCurveTo(58, -12, 62, -3); g.lineTo(44, -4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,220,255,.5)'; g.beginPath(); g.moveTo(46, -13); g.lineTo(55, -10); g.stroke();
    if (o.heat > 0) { g.globalCompositeOperation = 'lighter'; const hgl = g.createLinearGradient(70, 0, -40, 0); hgl.addColorStop(0, `rgba(255,140,50,${.75 * o.heat})`); hgl.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = hgl; g.fillRect(-70, -30, 140, 60); }
    g.restore();
    g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke(hull);
    // dying running light
    if (Math.sin(t * 5) > .6 && !o.dead) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, -50, -20, 8, 8, .9, '255,60,40'); g.restore(); }
    g.restore();
  }
  /* shot-1 flight: in from the dark, tumbling, toward the planet */
  function ship1(t) { const u = clamp(t / SH.cabin, 0, 1); return { x: lerp(-50, W * .6, eo(u)), y: lerp(60, H * .56, u), s: lerp(.42, 1.08, u * u), a: .5 + t * .9 }; }
  function ship3(t) { const u = clamp((t - SH.impact) / 1.6, 0, 1); return { x: lerp(-90, W * .62, u), y: lerp(30, 300, u * u), s: 1.3, a: 2.1 + t * 1.1 }; }
  function emitTrail(p, t, heat) {
    const b = shipLocal(p.s, p.a, p.x, p.y, -44, 20);
    fx.push({ k: 'smoke', x: b.x, y: b.y, vx: rnd(-12, 12), vy: rnd(-12, 12), r: 3 * p.s, max: rnd(1.6, 2.6), life: 0 });
    if (Math.random() < .35) fx.push({ k: 'spark', x: b.x, y: b.y, vx: rnd(-90, 90), vy: rnd(-90, 90), max: rnd(.2, .5), life: 0 });
    if (heat > .1) { const n = shipLocal(p.s, p.a, p.x, p.y, rnd(-40, 50), rnd(-18, 18)); fx.push({ k: 'ember', x: n.x, y: n.y, vx: rnd(-60, -20), vy: rnd(-80, -30), max: rnd(.3, .7), life: 0, h: heat }); }
  }

  /* ---------------- cabin ---------------- */
  const FLOOR = 300;
  const KINDS = ['gear', 'gear', 'gear', 'crate', 'crate', 'wrench', 'wrench', 'spring', 'bulb', 'watch', 'bolt', 'bolt', 'bird', 'gear'];
  function roll(t) { return Math.sin((t - SH.cabin) * .85) * .17 + Math.sin((t - SH.cabin) * 2.1) * .04; }
  function burstLockers() {
    burst = true; quake = Math.max(quake, 5);
    lockers.forEach((l, i) => { l.ov = 9 + i; sfx('bang', { x: l.x + 48, delay: i * .04 }); });   // three doors, 40 ms apart
    KINDS.forEach((k, i) => { const l = lockers[i % 3]; items.push({ k, x: l.x + rnd(20, 76), y: rnd(120, 190), vx: rnd(-230, 230), vy: rnd(-160, 40), a: rnd(0, TAU), va: rnd(-8, 8), r: k === 'crate' ? 11 : k === 'gear' ? rnd(6, 10) : 7 }); });
  }
  function updCabin(dt, t) {
    const rl = roll(t), ax = -Math.sin(rl) * 1500;
    for (const l of lockers) { if (!burst) continue; l.ov += (-(l.o - 1) * 90 - l.ov * 5) * dt; l.o = clamp(l.o + l.ov * dt, 0, 1.08); }
    for (const it of items) {
      it.vx += ax * dt; it.vy += 1500 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
      // each real floor hit sounds, by what it is and how hard it landed
      if (it.y > FLOOR - it.r) { it.y = FLOOR - it.r; if (it.vy > 0) { if (it.vy > 70) sfx(BOUNCE[it.k], { mag: it.vy, x: it.x }); it.vy *= -.3; } it.vx *= Math.exp(-1.6 * dt); it.va = it.k === 'gear' || it.k === 'watch' ? it.vx / it.r : it.va * Math.exp(-6 * dt); }
      if (it.x < 24) { it.x = 24; it.vx = Math.abs(it.vx) * .4; } if (it.x > W - 24) { it.x = W - 24; it.vx = -Math.abs(it.vx) * .4; }
      it.a += it.va * dt;
    }
    if (t > 21.4 && yarn.v < 0) {
      const ox = yarn.x; yarn.v = Math.min(0, yarn.v + 119 * dt); yarn.x += yarn.v * dt; yarn.a += (yarn.x - ox) / yarn.r;
      const lt = yarn.trail[yarn.trail.length - 1]; if (!lt || Math.abs(lt - yarn.x) > 6) yarn.trail.push(yarn.x);
    }
  }
  function drawItem(g, it) {
    g.save(); g.translate(it.x, it.y); g.rotate(it.a);
    const P = NEAR;
    if (it.k === 'gear') gear(g, 0, 0, it.r, 9, 0, P.b);
    else if (it.k === 'crate') { g.fillStyle = '#8a5c2c'; g.fillRect(-11, -11, 22, 22); g.strokeStyle = OL; g.lineWidth = 1.2; g.strokeRect(-11, -11, 22, 22); g.beginPath(); g.moveTo(-11, -11); g.lineTo(11, 11); g.stroke(); }
    else if (it.k === 'wrench') { limb(g, -10, 0, 8, 0, 4, 4, STC(P), 1); g.beginPath(); g.arc(10, 0, 5, .6, TAU - .6); g.lineWidth = 3; g.strokeStyle = P.st; g.stroke(); }
    else if (it.k === 'spring') { g.strokeStyle = P.stL; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i <= 8; i++)g.lineTo(-8 + i * 2, i % 2 ? -5 : 5); g.stroke(); }
    else if (it.k === 'bulb') { g.beginPath(); g.arc(0, -2, 5, 0, TAU); g.fillStyle = 'rgba(230,240,255,.55)'; g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.fillStyle = P.st; g.fillRect(-3, 3, 6, 4); }
    else if (it.k === 'watch') { g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fillStyle = P.b; g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fillStyle = P.cr; g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -3); g.moveTo(0, 0); g.lineTo(2, 0); g.stroke(); }
    else if (it.k === 'bird') { g.fillStyle = P.c; g.beginPath(); g.ellipse(0, 0, 7, 4.5, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.beginPath(); g.moveTo(6, -2); g.lineTo(10, -1); g.lineTo(6, 0); g.fillStyle = P.b; g.fill(); gear(g, -1, 0, 2.5, 6, 0, P.b); }
    else { g.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; g.lineTo(Math.cos(q) * 4, Math.sin(q) * 4); } g.closePath(); g.fillStyle = '#9aa0a8'; g.fill(); g.strokeStyle = OL; g.lineWidth = .8; g.stroke(); }
    g.restore();
  }
  function drawYarn(g) {
    const y = FLOOR - yarn.r + 1;
    if (yarn.trail.length) { g.strokeStyle = '#b8455a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(yarn.trail[0], FLOOR - 1); for (const x of yarn.trail) g.lineTo(x, FLOOR - 1 + Math.sin(x * .13)); g.lineTo(yarn.x, FLOOR - 2); g.stroke(); }
    g.beginPath(); g.arc(yarn.x, y, yarn.r, 0, TAU);
    const gr = g.createRadialGradient(yarn.x - 4, y - 5, 2, yarn.x, y, yarn.r); gr.addColorStop(0, '#f07a8c'); gr.addColorStop(1, '#8e2c40');
    g.fillStyle = gr; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke();
    g.save(); g.beginPath(); g.arc(yarn.x, y, yarn.r - 1, 0, TAU); g.clip(); g.translate(yarn.x, y); g.rotate(yarn.a);
    g.strokeStyle = 'rgba(255,200,210,.55)'; g.lineWidth = 1; for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, 0, yarn.r * 1.05, Math.abs(i) * 3.5 + 1, i * .3, 0, TAU); g.stroke(); }
    g.restore();
  }
  function drawCabin(g, t, light, still) {
    const M = 160, rl = still ?? roll(t);
    g.save(); g.translate(W / 2, H / 2); g.rotate(rl); g.translate(-W / 2, -H / 2);
    const wall = g.createLinearGradient(0, -M, 0, FLOOR); wall.addColorStop(0, '#161a21'); wall.addColorStop(1, '#2b313c');
    g.fillStyle = wall; g.fillRect(-M, -M, W + 2 * M, FLOOR + M);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -M + 40; x < W + M; x += 112)g.fillRect(x, -M, 10, FLOOR + M);
    g.fillStyle = '#14171c'; g.fillRect(-M, 26, W + 2 * M, 16); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(-M, 26, W + 2 * M, 2);
    // porthole: stars smearing past as it spins
    g.save(); g.beginPath(); g.arc(170, 118, 30, 0, TAU); g.clip(); g.fillStyle = '#04060b'; g.fillRect(140, 88, 60, 60);
    g.strokeStyle = 'rgba(220,235,255,.7)'; g.lineWidth = 1; if (still == null) for (let i = 0; i < 9; i++) { const y = 88 + ((i * 17 + t * 140) % 60); g.beginPath(); g.moveTo(140 + i * 7 % 60, y); g.lineTo(150 + i * 7 % 60, y - 14); g.stroke(); }
    g.restore(); g.lineWidth = 7; g.strokeStyle = '#59606b'; g.beginPath(); g.arc(170, 118, 33, 0, TAU); g.stroke();
    // lockers: doors swing on their left hinges when they burst
    for (const l of lockers) {
      g.fillStyle = '#0b0d10'; g.fillRect(l.x, 104, 96, 96);
      const w = 96 * Math.cos(Math.min(1, l.o) * Math.PI / 2 * .93);   // door swings out toward us: foreshortens to its edge
      g.fillStyle = w > 0 ? '#4b5059' : '#2a2e35'; g.fillRect(l.x, 104, w, 96); g.strokeStyle = OL; g.lineWidth = 1.2; g.strokeRect(l.x, 104, w, 96);
      if (Math.abs(w) > 20) { g.fillStyle = '#d6a54e'; g.fillRect(l.x + w - (w > 0 ? 14 : -8), 146, 6, 14); }
    }
    // deck
    const dk = g.createLinearGradient(0, FLOOR - 20, 0, FLOOR + M); dk.addColorStop(0, '#3a3f48'); dk.addColorStop(.15, '#565c66'); dk.addColorStop(.2, '#23272e'); dk.addColorStop(1, '#0e1014');
    g.fillStyle = dk; g.fillRect(-M, FLOOR - 20, W + 2 * M, M + 20);
    // bench (back), contents, then the dark under it
    g.fillStyle = '#262a31'; g.fillRect(46, 170, 214, 66);
    for (const it of items) drawItem(g, it);
    drawYarn(g);
    const ub = g.createLinearGradient(0, 248, 0, FLOOR); ub.addColorStop(0, 'rgba(0,0,0,.75)'); ub.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = ub; g.fillRect(52, 248, 202, FLOOR - 248);
    g.fillStyle = '#5a616b'; g.fillRect(40, 234, 226, 14); g.strokeStyle = OL; g.lineWidth = 1.2; g.strokeRect(40, 234, 226, 14);
    g.fillStyle = '#3b3f45'; g.fillRect(52, 248, 8, FLOOR - 248); g.fillRect(246, 248, 8, FLOOR - 248);
    if (still != null) {
      // after the hit: a ceiling beam down across the cabin, one crumpled locker
      g.fillStyle = '#1d2027'; g.save(); g.translate(380, 150); g.rotate(.62); g.fillRect(-260, -11, 520, 22); g.strokeStyle = OL; g.lineWidth = 1.5; g.strokeRect(-260, -11, 520, 22); g.restore();
      g.fillStyle = '#0b0d10'; g.beginPath(); g.moveTo(548, 104); g.lineTo(644, 112); g.lineTo(630, 200); g.lineTo(560, 186); g.closePath(); g.fill();
    }
    // red beacon on the ceiling
    const pulse = still != null ? 0 : Math.max(0, Math.sin(t * 6.5));
    g.beginPath(); g.arc(470, 44, 9, Math.PI, 0); g.fillStyle = `rgb(${120 + 130 * pulse | 0},30,25)`; g.fill();
    g.restore();
    // warning wash over everything (screen space)
    g.fillStyle = `rgba(255,30,20,${.13 * pulse * light})`; g.fillRect(0, 0, W, H);
    if (light < 1) { g.fillStyle = `rgba(0,0,0,${1 - light})`; g.fillRect(0, 0, W, H); }
  }

  /* ---------------- space + impact ---------------- */
  function drawStars(g, t, drift) {
    g.fillStyle = '#03040a'; g.fillRect(0, 0, W, H);
    for (const s of stars) { g.fillStyle = `rgba(225,235,255,${.45 + .4 * Math.sin(t * s.tw + s.ph)})`; g.fillRect((s.x - drift * s.r * 8 + W) % W, s.y, s.r, s.r); }
  }
  function drawPlanet(g, t) {
    const u = clamp(t / SH.cabin, 0, 1), top = lerp(H - 34, H - 160, u), R = 1500, cx = W * .4, cy = top + R;
    const ag = g.createRadialGradient(cx, cy, R - 6, cx, cy, R + 70); ag.addColorStop(0, 'rgba(120,200,255,.4)'); ag.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = ag; g.fillRect(0, top - 80, W, H);
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
    const pg = g.createLinearGradient(0, top, 0, top + 220); pg.addColorStop(0, '#d2935a'); pg.addColorStop(1, '#3b1d10'); g.fillStyle = pg; g.fillRect(0, top, W, H);
    g.strokeStyle = 'rgba(80,40,20,.35)'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(cx, cy, R - 16 - i * 24, R - 16 - i * 24, 0, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
    const sh = g.createLinearGradient(0, 0, W, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = sh; g.fillRect(0, top, W, H);
    g.restore();
  }
  function drawGround(g, t) {
    const sky = g.createLinearGradient(0, 0, 0, 320); sky.addColorStop(0, '#120a10'); sky.addColorStop(1, '#5a2a1c'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b140e'; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= W; x += 40)g.lineTo(x, 282 + Math.sin(x * .021) * 14 + Math.sin(x * .07) * 5); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    g.fillStyle = '#1a0c08'; g.fillRect(0, 316, W, H);
  }
  function drawFx(g) {
    for (const p of fx) {
      const u = p.life / p.max;
      if (p.k === 'smoke') { g.fillStyle = `rgba(120,118,115,${.32 * (1 - u)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u * 3), 0, TAU); g.fill(); }
      else if (p.k === 'dust') { g.fillStyle = `rgba(150,95,60,${.5 * (1 - u)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u * 2.5), 0, TAU); g.fill(); }
      else if (p.k === 'panel') { g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = '#8d939b'; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
      else { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = p.k === 'ember' ? `rgba(255,${150 - 90 * u | 0},50,${1 - u})` : `rgba(255,220,120,${1 - u})`; g.fillRect(p.x - 1, p.y - 1, 2, 2); g.restore(); }
    }
  }
  function updFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.life += dt; if (p.life > p.max) { fx.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'panel') { p.a += p.va * dt; }
      else if (p.k === 'dust') { p.vx *= Math.exp(-1.5 * dt); p.vy *= Math.exp(-1.5 * dt); }
      else if (p.k === 'spark' || p.k === 'ember') { p.vy += p.k === 'ember' ? 0 : 200 * dt; }
    }
    if (fx.length > 900) fx.splice(0, fx.length - 900);
  }

  /* ---------------- public ---------------- */
  function update(dt, t) {
    quake = Math.max(0, quake - dt * 8); flash = Math.max(0, flash - dt * 1.6);
    if (t < SH.cabin) {
      const p = ship1(t); if (t > .3) emitTrail(p, t, seg(t, 10.5, 12.6));
      for (const [i, tt] of [[0, 9.0], [1, 9.8], [2, 10.7], [3, 11.6]]) if (at('panel' + i, t >= tt)) {
        const [hx, hy] = HOLES[i], q = shipLocal(p.s, p.a, p.x, p.y, hx, hy); fx.push({ k: 'panel', x: q.x, y: q.y, vx: rnd(-90, 40), vy: rnd(-110, -30), a: p.a, va: rnd(-6, 6), w: 16 * p.s, h: 8 * p.s, max: 4, life: 0 });
        sfx('rip', { x: q.x, rate: 1 + i * .1 });                              // four rips, each a little higher
      }
    } else if (t < SH.impact) {
      if (at('burst', t >= 16.4)) burstLockers();
      updCabin(dt, t); quake = Math.max(quake, .8);
    } else if (t < SH.dark) {
      if (t < 28.6) { const p = ship3(t); emitTrail(p, t, 1); quake = Math.max(quake, 1.5); }
      if (at('hit', t >= 28.6)) {
        flash = 1; quake = 12; for (let i = 0; i < 60; i++)fx.push({ k: 'dust', x: W * .62 + rnd(-30, 30), y: 300 + rnd(-10, 10), vx: rnd(-260, 260), vy: rnd(-200, -10), r: rnd(5, 12), max: rnd(1, 2.2), life: 0 });
        for (let i = 0; i < 10; i++)fx.push({ k: 'panel', x: W * .62, y: 296, vx: rnd(-300, 300), vy: rnd(-380, -120), a: rnd(0, TAU), va: rnd(-14, 14), w: rnd(8, 18), h: rnd(4, 9), max: 1.4, life: 0 });
        // the impact: boom, crush and debris; the world goes dull and the ears ring (the ring is cut by the silence at 31.0)
        AUDIO.stop('air'); AUDIO.stop('drone'); AUDIO.muffle(700, .12);
        sfx('boom'); sfx('crunch'); sfx('debris'); sfx('ring');
      }
    } else if (t >= SH.wreck) {
      // the real hold, close in, one lamp
      const u = seg(t, SH.wreck, SH.end); zoom = lerp(2.6, 2.15, u);
      camX = rig.x - W / (2 * zoom) + 8; camY = (GY - 44) - H / (2 * zoom);
      lit = t < 36.4 ? 0 : t < 37.4 ? (Math.random() < .45 ? .85 : .08) : .88 + .06 * Math.sin(t * 9) * (Math.random() < .04 ? -6 : 1);
      if (at('click', t >= 35.6)) { const k = rig.toWorld(rig.keyP); FX.sparks(k.x, k.y, 3, -1, .25); sparkAt = { x: k.x, y: k.y, t: 0 }; sfx('click', { x: k.x }); }
      if (at('ear', t >= 46.2)) { rig.earR.vel -= 22; sfx('earTink', { x: rig.toWorld({ x: rig.hx, y: rig.hy }).x }); }
      if (at('wind', t >= 48.0)) sfx('winding', { x: rig.toWorld(rig.keyP).x });         // the key turns once
      if (at('stop', t >= 48.55)) { const k = rig.toWorld(rig.keyP); FX.sparks(k.x, k.y, 2, 1, .2); sparkAt = { x: k.x, y: k.y, t: 0 }; sfx('tk', { x: k.x }); }
      if (sparkAt && (sparkAt.t += dt) > .6) sparkAt = null;
    }
    sound(dt, t);
    updFx(dt);
    if (t >= SH.end) finish(true);
  }
  function ctrl(c, t) {
    if (t >= 48.0 && t < 48.5) c.keySpin = 12.6;     // it turns once
  }
  /* shots 1-3 draw their own stage; true while that's the case */
  function cine(t) { return t < SH.wreck; }
  function render(g, t) {
    const qx = (Math.random() - .5) * quake * calmK(), qy = (Math.random() - .5) * quake * calmK();
    g.setTransform(S, 0, 0, S, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);   // nothing left over at rotated/zoomed edges
    g.setTransform(S, 0, 0, S, qx * S, qy * S);
    if (t < SH.cabin) {
      drawStars(g, t, t * .6); drawPlanet(g, t);
      const p = ship1(t); drawFx(g); drawShuttle(g, p.x, p.y, p.s, p.a, t, { lost: [9.0, 9.8, 10.7, 11.6].filter(x => t >= x).length, heat: seg(t, 10.5, 12.6) });
    } else if (t < SH.impact) {
      const z = 1 + .9 * seg(t, 24.8, 26.6), yx = yarn.x, yy = FLOOR - yarn.r;
      const zp = seg(t, 24.8, 26.6); g.translate(lerp(yx, W * .42, zp), lerp(yy, H * .6, zp)); g.scale(z, z); g.translate(-yx, -yy);
      drawCabin(g, t, 1);
    } else if (t < SH.dark) {
      drawGround(g, t);
      if (t < 28.6) { const p = ship3(t); drawFx(g); drawShuttle(g, p.x, p.y, p.s, p.a, t, { lost: 4, heat: 1 }); }
      else { drawShuttle(g, W * .62, 300, 1.3, 2.75, t, { lost: 4, heat: Math.max(0, 1 - (t - 28.6) * 2), dead: true }); drawFx(g); }
      if (flash > 0) { g.setTransform(S, 0, 0, S, 0, 0); g.fillStyle = `rgba(255,248,235,${flash * (settings.calm ? .35 : 1)})`; g.fillRect(0, 0, W, H); }
    } else if (t < SH.silence) {
      // metal folds, lights die: the cabin on its side, one tube still trying
      const l = t < 30.6 ? tubeL : 0;                                              // set in sound(): drawn here, heard there
      drawCabin(g, t, l, -.21);
    } else {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    }
    g.setTransform(S, 0, 0, S, 0, 0);
    overlay(g, t, false);
  }
  /* letterbox, narration, the shot-4 darkness */
  function overlay(g, t, hold) {
    g.setTransform(S, 0, 0, S, 0, 0);
    if (hold) {
      // shot 4: the game rendered the hold; dark it down to one lamp's reach
      const k = rig.toWorld(rig.bp(0, 10)), sx = (k.x - camX) * zoom, sy = (k.y - camY) * zoom;
      const dg = g.createRadialGradient(sx - 40, sy - 30, 30, sx, sy, W * .62);
      dg.addColorStop(0, `rgba(0,0,0,${1 - lit * .92})`); dg.addColorStop(.5, `rgba(0,0,0,${1 - lit * .6})`); dg.addColorStop(1, `rgba(0,0,0,${1 - lit * .2})`);
      g.fillStyle = dg; g.fillRect(0, 0, W, H);
      if (lit > .3) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, sx - 160, sy - 170, 220, 220, .08 * lit, '255,170,80'); g.restore(); }
      if (sparkAt) { g.save(); g.globalCompositeOperation = 'lighter'; softEllipse(g, (sparkAt.x - camX) * zoom, (sparkAt.y - camY) * zoom, 26, 26, .9 * (1 - sparkAt.t / .6), '255,210,140'); g.restore(); }
    }
    g.fillStyle = '#000'; g.fillRect(0, 0, W, LB); g.fillRect(0, H - LB, W, LB);
    const ln = lineAt(t);
    if (ln) {
      const a = Math.min(1, (t - ln[0]) / .35, (ln[1] - t) / .35), snd = ln[3] === 'snd', text = snd ? `[${ln[2]}]` : ln[2];
      const font = s => `${snd ? 'italic ' : ''}400 ${s}px Inter,sans-serif`;
      let fs = snd ? 13 : 16; g.font = font(fs); while (g.measureText(text).width > W - 48 && fs > 10) { fs -= .5; g.font = font(fs); }
      g.textAlign = 'center'; g.fillStyle = `rgba(239,230,210,${a * (snd ? .8 : 1)})`; g.fillText(text, W / 2, H - LB / 2 + (snd ? 4.5 : 5)); g.textAlign = 'left';
    }
    if (t > 1.5) { g.font = '600 11px Oswald,sans-serif'; g.fillStyle = `rgba(214,165,78,${.4 * Math.min(1, (t - 1.5) / 1)})`; g.textAlign = 'right'; g.fillText('◀ ▶  skip', W - 16, 28); g.textAlign = 'left'; }
  }
  function finish(natural) {
    zoom = 1; camY = 0; mode = 'asleep'; modeT = natural ? -3.6 : 0; camX = camTarget(); fx = [];
    stopBeds();                                   // the lamp's hum and any bed still running end with the opening
    if (!natural) AUDIO.stopAll(.25);             // skipped: cut everything, one-shots included, so nothing carries on over what comes next
    if (natural) caps.push({ text: 'Catbot lies motionless among the wreckage.', t: 0, max: 3.6 });
  }
  /* the game boots on the cover page; PLAY (or the first step) calls begin(), and shot 1 starts heard through the hull */
  function start() { init(); mode = 'cover'; modeT = 0; }
  function begin() { mode = 'intro'; modeT = 0; AUDIO.muffle(900, .01); }
  return { start, begin, update, ctrl, cine, render, overlay, finish, ticking, lineAt };
})();
OPEN.start();   // the game boots asleep; the cover page waits in front of it, then the opening plays
