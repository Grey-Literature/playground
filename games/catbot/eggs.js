'use strict';
/* =====================================================================
   EGGS: four small easter eggs for rooms that didn't have one, plus the
   brainstorm egg. Built with Claude Opus 5.5 (claude-opus-5-5) in Claude
   Cowork, 2026-10-07, at Tasha's request.

   Three are nods, by idea only, to the TV show whose clockwork droids
   inspired catbot. None of the show's own characters, props, names or lines
   appear: a clock that runs backwards, a locker that's bigger inside than
   out, a potted plant that only moves while you aren't looking.
   The fourth credits the brainstorming in Claude chat (Claude Sonnet 5.5):
   sit at the aft hold's porthole once the hip is back, and catbot daydreams
   the rooms in thought bubbles.

   Movement is the only verb, so every trigger is a way of moving (or not).
   Each one marks itself in EGGS (index.html) for the all-eggs bonus, changes
   no physics, and is a no-op in every other room. Hooks: EGGX.reset,
   update, deck (behind catbot), front (in front), next to the other modules'.
   ===================================================================== */
window.EGGX = (function () {
  const id = () => (room && !inHub() ? room.id : null);
  const mark = k => { if (typeof EGGS !== 'undefined') EGGS.mark(k); };
  let s = {};
  function reset() {
    if (!room) return;
    s = {
      // engine bay: the clock over the treadmill belt
      clockT: 0, carried: 0, clockA: 0, clockV: 1,
      // observation: the locker on the last gantry
      lockerStill: 0, lockerOpen: 0, lockerT: -1,
      // hydroponics: the plant on the start apron
      plantX: 170, plantLean: 0, plantMoving: false, plantDone: false, plantBoop: -1, plantAway: 0,
      // aft hold: the porthole daydream
      dreamStill: 0, dreamT: -1
    };
  }
  reset();

  /* ---------------------------------------------------------------------
     ENGINE BAY: stand still on the belt that runs against you and let it
     carry you backwards for 2.5 s. The clock on the wall above it stops,
     then runs backwards for a while, and the beat lamps flicker the wrong
     way round. (Time going backwards: the belt took you there.)
     --------------------------------------------------------------------- */
  const CLOCK = { x: 840, y: GY - 168 };
  function engine(dt) {
    // only the deck belt that runs against you (the treadmill under the clock)
    const back = rig.bv < -20 && Math.abs(rig.vx) < 8 && !rig.air && !rig.fl && rig.x > 730 && rig.x < 950 && mode === 'play';
    s.carried = back ? s.carried + dt : 0;
    if (s.carried > 2.5 && s.clockT === 0) {
      s.clockT = 1e-6; mark('tick'); sfx('eggRewind', { x: CLOCK.x });
      console.log('%cENGINE BAY · the clock runs backwards for a while · Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork', 'color:#d6a54e');
    }
    if (s.clockT > 0) { s.clockT += dt; s.clockV = s.clockT < .6 ? 1 - s.clockT / .3 : s.clockT < 9 ? -6 : damp(s.clockV, 1, 1.5, dt); if (s.clockT > 12) { s.clockT = 0; s.clockV = 1; } }
    s.clockA += s.clockV * dt * (TAU / 60);       // a second hand: one turn a minute, until it isn't
  }
  function drawClock(g, t) {
    const { x, y } = CLOCK; if (x < camX - 60 || x > camX + W + 60) return;
    g.save(); g.translate(x, y);
    g.fillStyle = '#2b2620'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
    g.strokeStyle = '#b58a3c'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke();
    g.fillStyle = '#e9dec1'; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
    g.strokeStyle = '#4a3a22'; g.lineWidth = 1;
    for (let k = 0; k < 12; k++) { const q = k / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(q) * 14, Math.sin(q) * 14); g.lineTo(Math.cos(q) * 17, Math.sin(q) * 17); g.stroke(); }
    const hr = s.clockA / 60 - Math.PI / 2, mn = s.clockA / 5 - Math.PI / 2, sc = s.clockA * 1 - Math.PI / 2;
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(hr) * 8, Math.sin(hr) * 8); g.stroke();
    g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(mn) * 13, Math.sin(mn) * 13); g.stroke();
    g.strokeStyle = '#a3402a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(sc) * 15, Math.sin(sc) * 15); g.stroke();
    g.fillStyle = '#4a3a22'; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill();
    // while it runs backwards: a faint warm shimmer (STEADY: none)
    if (s.clockT > .6 && s.clockT < 9 && !settings.calm) { g.globalCompositeOperation = 'lighter'; softEllipse(g, 0, 0, 34, 34, .18 + .08 * Math.sin(t * 9), '255,200,120'); }
    g.restore();
  }

  /* ---------------------------------------------------------------------
     OBSERVATION: a narrow service locker at the far end of the last gantry.
     Stand still beside it, facing it, for 2.5 s and its door swings open on an interior far
     larger than the locker: a long lit corridor going back and back.
     --------------------------------------------------------------------- */
  const LOCKER = { x: 3668, y: 200, w: 40, h: 150 };   // at the far end of the last gantry, past the telescope: you stand beside it, looking at it
  function observation(dt) {
    const near = rig.fl === LOCKER.y && rig.x > LOCKER.x - 135 && rig.x < LOCKER.x - 80 && rig.facing > 0 && Math.abs(rig.vx) < 6 && !rig.air && mode === 'play';
    s.lockerStill = near ? s.lockerStill + dt : 0;
    if (s.lockerStill > 2.5 && s.lockerT < 0) {
      s.lockerT = 0; mark('locker'); sfx('eggCreak', { x: LOCKER.x }); rig.earL.vel -= 14; rig.earR.vel -= 12;
      console.log('%cOBSERVATION · the locker goes back further than it should · Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork', 'color:#9ec7ff');
    }
    if (s.lockerT >= 0) { s.lockerT += dt; s.lockerOpen = s.lockerT < 8 ? Math.min(1, s.lockerT / .8) : Math.max(0, 1 - (s.lockerT - 8) / .8); if (s.lockerT > 9) { s.lockerT = -1; s.lockerStill = -6; } }
  }
  function drawLocker(g, t) {
    const L = LOCKER, x = L.x - L.w / 2, y = GY - L.y - L.h - 4;
    if (L.x < camX - 80 || L.x > camX + W + 80) return;
    // the frame, then the inside (only seen through the open door): a corridor that recedes far past the locker's own depth
    g.fillStyle = '#4a5058'; g.fillRect(x - 3, y - 3, L.w + 6, L.h + 6); g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(x - 3, y - 3, L.w + 6, L.h + 6);
    if (s.lockerOpen > 0) {
      g.save(); g.beginPath(); g.rect(x, y, L.w, L.h); g.clip();
      g.fillStyle = '#0d1016'; g.fillRect(x, y, L.w, L.h);
      const cx = x + L.w / 2, cy = y + L.h * .55;
      for (let k = 14; k >= 0; k--) {
        const f = Math.pow(.78, k), w2 = L.w * 1.6 * f, h2 = L.h * 1.3 * f, a = .15 + .6 * (1 - k / 14);
        g.strokeStyle = `rgba(255,214,150,${a * .6})`; g.lineWidth = 1; g.strokeRect(cx - w2 / 2, cy - h2 / 2, w2, h2);
        g.fillStyle = `rgba(255,200,120,${.05 * a})`; g.fillRect(cx - w2 / 2, cy + h2 / 2 - 2, w2, 2);
      }
      g.globalCompositeOperation = 'lighter'; softEllipse(g, cx, cy, 6, 6, .7, '255,230,180');
      g.restore();
    }
    // the door: plain grey, a vent slot, a handle, a number above
    const open = s.lockerOpen, dw = L.w * (1 - open * .85);
    g.fillStyle = '#5d646d'; g.fillRect(x, y, dw, L.h); g.strokeStyle = OL; g.strokeRect(x, y, dw, L.h);
    if (dw > 10) { g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 4; k++) g.fillRect(x + 6, y + 10 + k * 4, dw - 12, 1.5); g.fillStyle = '#b58a3c'; g.fillRect(x + dw - 7, y + L.h / 2, 3, 8); }
    g.save(); g.font = '600 7px Oswald,sans-serif'; g.fillStyle = 'rgba(214,165,78,.5)'; g.fillText('STORES 4', x - 2, y - 7); g.restore();
  }

  /* ---------------------------------------------------------------------
     HYDROPONICS: a potted fern on the start apron. It only moves while
     catbot is facing away from it, a little at a time, and stops dead the
     moment catbot looks. Let it reach you and it taps catbot with a frond.
     It never leaves the apron and never blocks anything.
     --------------------------------------------------------------------- */
  function hydroponics(dt) {
    if (s.plantDone) { if (s.plantBoop >= 0) s.plantBoop += dt; return; }
    const dx = rig.x - s.plantX, away = Math.sign(dx) === rig.facing, lim = room.wheels ? room.wheels[0].x - 120 : 400;
    s.plantAway = away && mode === 'play' ? s.plantAway + dt : 0;              // it waits a moment after you look away
    s.plantMoving = s.plantAway > 1 && Math.abs(dx) < 420 && Math.abs(dx) > 70 && s.plantX < lim;
    if (s.plantMoving) { const was = s.plantX; s.plantX = Math.min(lim, s.plantX + Math.sign(dx) * 25 * dt); if (Math.floor(was / 30) !== Math.floor(s.plantX / 30)) sfx('eggRustle', { x: s.plantX, mag: .35 }); }
    s.plantLean = damp(s.plantLean, s.plantMoving ? Math.sign(dx) * .18 : 0, 10, dt);
    if (Math.abs(rig.x - s.plantX) <= 72 && mode === 'play') {
      s.plantDone = true; s.plantBoop = 0; mark('creeper'); sfx('eggRustle', { x: s.plantX, mag: 1, rate: 1.2 });
      rig.earL.vel -= 20; rig.earR.vel -= 18; rig.tailFlick(6); rig.hOy.vel -= 30;
      console.log('%cHYDROPONICS · the fern got you while you weren\'t looking · Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork', 'color:#9ef0b0');
    }
  }
  function drawPlant(g, t) {
    const x = s.plantX; if (x < camX - 80 || x > camX + W + 80) return;
    g.save(); g.translate(x, GY - 20);
    g.fillStyle = '#7a4a2c'; g.beginPath(); g.moveTo(-16, -22); g.lineTo(16, -22); g.lineTo(12, 0); g.lineTo(-12, 0); g.closePath(); g.fill();
    g.strokeStyle = OL; g.lineWidth = 1; g.stroke(); g.fillStyle = '#8f5a36'; g.fillRect(-18, -26, 36, 5);
    g.rotate(s.plantLean);
    const boop = s.plantBoop >= 0 && s.plantBoop < 1.2 ? Math.sin(s.plantBoop * 10) * (1 - s.plantBoop / 1.2) : 0;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * .32 + (k === 6 ? boop * .9 + (s.plantDone ? .5 : 0) * Math.sign(rig.x - x || 1) : 0), L2 = 30 + (k % 3) * 8;
      g.strokeStyle = '#2f7a3a'; g.lineWidth = 1.6; const ex = Math.cos(a) * L2, ey = -26 + Math.sin(a) * L2;
      g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(ex * .5, -26 + Math.sin(a) * L2 * .6 - 6, ex, ey); g.stroke();
      g.fillStyle = '#3f9a4c'; for (let j = 1; j < 5; j++) { const u = j / 5; g.beginPath(); g.ellipse(ex * u, -26 + (ey + 26) * u - 2, 4, 1.6, a + .9, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  /* ---------------------------------------------------------------------
     AFT HOLD (the brainstorm, for the planning in Claude chat with Claude
     Sonnet 5.5): with the hip back, stand still in the porthole's light for
     4.5 s. Catbot daydreams the rooms, one thought bubble at a time (a belt, a
     lamp's cone, a tray, a planet, paw prints, a wheel, a ball of yarn), and
     the last bubble says where they came from.
     --------------------------------------------------------------------- */
  const DREAMS = ['belt', 'lamp', 'tray', 'planet', 'paws', 'wheel', 'yarn'];
  const DREAM_TEXT = 'brainstormed in Claude chat · Claude Sonnet 5.5';
  function aftHold(dt, inputDir) {
    const p = room.port; if (!p) return;
    // the head under the porthole, either way round (it used to be the body's middle, so facing right put the head out of the light)
    const head = rig.toWorld({ x: rig.hx, y: rig.hy }).x;
    const lit = installed.has('hip') && Math.abs(head - p.x) < 80 && !inputDir && Math.abs(rig.vx) < 4 && !rig.air && mode === 'play';
    if (s.dreamT < 0) {
      s.dreamStill = lit ? s.dreamStill + dt : 0;
      // the settings trolley parks where catbot stands still, which put it right across the thought bubbles: send it off while catbot settles in
      if (s.dreamStill > .3 && st.cart && st.cart.x != null && st.cart.tx == null && st.cart.x > camX - 140 && st.cart.x < camX + W + 140) st.cart.tx = camX + W + 160;
      if (s.dreamStill > 4.5) {
        s.dreamT = 0; mark('brainstorm');
        console.log('%cAFT HOLD · daydreamed at the porthole: every room began as a brainstorm in Claude chat with Claude Sonnet 5.5 (claude-sonnet-5-5); drawn by Claude Opus 5.5 (claude-opus-5-5) in Claude Cowork', 'color:#c9a0ff');
      }
    } else {
      const was = s.dreamT; s.dreamT += dt;
      const n0 = Math.floor((was - .5) / .9), n1 = Math.floor((s.dreamT - .5) / .9);
      if (n1 > n0 && n1 >= 0 && n1 <= DREAMS.length) sfx('eggThink', { x: rig.x, rate: 1 + n1 * .06 });
      if (s.dreamT > 17 || (inputDir && s.dreamT > 1)) { s.dreamT = -1; s.dreamStill = -4; }   // walking off ends the daydream
    }
  }
  function bubble(g, x, y, r, a) {
    g.fillStyle = `rgba(245,240,228,${.92 * a})`; g.strokeStyle = `rgba(34,21,10,${.8 * a})`; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(x, y, r * 1.25, r, 0, 0, TAU); g.fill(); g.stroke();
  }
  function glyph(g, k, x, y, a, t) {
    g.save(); g.translate(x, y); g.globalAlpha = a; g.strokeStyle = '#4a3a22'; g.fillStyle = '#4a3a22'; g.lineWidth = 1.4;
    if (k === 'belt') { g.strokeRect(-13, -4, 26, 8); for (let i = -9; i <= 9; i += 6) { g.beginPath(); g.moveTo(i + (t * 8 % 6), -4); g.lineTo(i - 2 + (t * 8 % 6), 4); g.stroke(); } }
    else if (k === 'lamp') { g.beginPath(); g.arc(0, -9, 3, 0, TAU); g.fill(); g.globalAlpha = a * .5; g.beginPath(); g.moveTo(0, -9); g.lineTo(-10, 9); g.lineTo(10, 9); g.closePath(); g.fill(); }
    else if (k === 'tray') { g.strokeRect(-12, 0, 24, 5); for (let i = -8; i <= 8; i += 8) { g.beginPath(); g.arc(i, -2, 2.4, 0, TAU); g.stroke(); } }
    else if (k === 'planet') { g.beginPath(); g.arc(0, 2, 8, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(0, 2, 14, 3.5, -.3, 0, TAU); g.stroke(); }
    else if (k === 'paws') { for (const [px, py] of [[-7, 3], [5, -3]]) { g.beginPath(); g.arc(px, py, 2.4, 0, TAU); g.fill(); for (const d of [-2.6, 0, 2.6]) { g.beginPath(); g.arc(px + d, py - 3.6, 1, 0, TAU); g.fill(); } } }
    else if (k === 'wheel') { g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.stroke(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + t; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * 10, Math.sin(q) * 10); g.stroke(); } }
    else if (k === 'yarn') { g.fillStyle = '#f07a8c'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.strokeStyle = '#8e2c40'; g.beginPath(); g.arc(0, 0, 5, .3, 2.6); g.stroke(); g.beginPath(); g.moveTo(7, 3); g.quadraticCurveTo(14, 8, 10, 12); g.stroke(); }
    g.restore();
  }
  function drawDream(g, t) {
    if (s.dreamT < 0) return;
    const hx = rig.toWorld({ x: rig.hx, y: rig.hy }), x0 = hx.x + 18 * rig.facing, y0 = hx.y - 34;
    const fade = s.dreamT > 15.5 ? Math.max(0, 1 - (s.dreamT - 15.5) / 1.5) : 1;
    // the little trail of bubbles up from the head
    for (let i = 0; i < 3; i++) bubble(g, x0 + rig.facing * i * 7, y0 - i * 9, 2 + i * 1.2, fade * Math.min(1, s.dreamT * 3 - i * .5));
    // the dream bubbles, one every 0.9 s, along an arc above catbot
    // (the whole arc slides sideways to stay on screen: at the porthole the hold's left wall is right there)
    const arcX = i => x0 + Math.cos(Math.PI * (1.12 + i * .13)) * -120 * rig.facing * .9 + rig.facing * 20;
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < DREAMS.length; i++) { lo = Math.min(lo, arcX(i)); hi = Math.max(hi, arcX(i)); }
    const ox = lo - 24 < camX + 8 ? camX + 8 - (lo - 24) : hi + 24 > camX + W - 8 ? camX + W - 8 - (hi + 24) : 0;
    for (let i = 0; i < DREAMS.length; i++) {
      const tt = s.dreamT - .5 - i * .9; if (tt < 0) break;
      const a = Math.min(1, tt * 3) * fade, q = Math.PI * (1.12 + i * .13), bx = arcX(i) + ox, by = y0 - 50 + Math.sin(q) * 46 + Math.sin(t * 1.3 + i) * 2;
      bubble(g, bx, by, 15, a); glyph(g, DREAMS[i], bx, by, a, t);
    }
    // and the last one: where they came from
    const tt = s.dreamT - .5 - DREAMS.length * .9;
    if (tt > 0) {
      g.save(); g.font = '600 10px Oswald,sans-serif'; const w = g.measureText(DREAM_TEXT).width + 22;
      const a = Math.min(1, tt * 2) * fade, bx = clamp(x0 + rig.facing * 10 + ox, camX + w / 2 + 8, camX + W - w / 2 - 8), by = y0 - 126;
      g.fillStyle = `rgba(245,240,228,${.94 * a})`; g.strokeStyle = `rgba(34,21,10,${.8 * a})`; g.lineWidth = 1.2;
      g.beginPath(); g.roundRect(bx - w / 2, by - 13, w, 24, 12); g.fill(); g.stroke();
      g.fillStyle = `rgba(74,58,34,${a})`; g.textAlign = 'center'; g.fillText(DREAM_TEXT, bx, by + 3); g.restore();
    }
  }

  /* ---------------------------------------------------------------------
     HOOKS
     --------------------------------------------------------------------- */
  function update(dt, c, inputDir) {
    const r = id(); if (!r) return;
    if (r === 'engine') engine(dt);
    else if (r === 'observation') observation(dt);
    else if (r === 'hydroponics') hydroponics(dt);
    else if (r === 'aft-hold') aftHold(dt, inputDir ?? dirInput());
  }
  function deck(g, t) {
    const r = id(); if (!r) return;
    if (r === 'engine') drawClock(g, t);
    else if (r === 'observation') drawLocker(g, t);
    else if (r === 'hydroponics') drawPlant(g, t);
  }
  function front(g, t) { if (id() === 'aft-hold') drawDream(g, t); }
  // index.html's trolley asks before it comes to catbot: not while it daydreams at the porthole
  const hush = () => id() === 'aft-hold' && (s.dreamT >= 0 || s.dreamStill > .3);
  return { reset, update, deck, front, hush, get state() { return s; } };
})();
