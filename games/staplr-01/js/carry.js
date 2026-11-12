/* STAPLR-01 — carry.js
   The things stapled to you, and what they do to you.

   Every handicap is applied HERE, centrally, to the input and the screen, so
   levels never need to know which attachments exist. A level reads ctx.input
   and draws; this file bends both.

   The attachments are also physically there: each one dangles off "you" on a
   chain of staples, wherever "you" are in the level (levels report that with
   an optional anchor(ctx) method; the cursor is the fallback). The tax
   return is real paper and you cannot quite see through it.

   Fairness rule (see _wiki/portfolio/staplr-01.md): annoying and funny, never unwinnable. */
(function () {
    'use strict';
    var S = window.STAPLR = window.STAPLR || {};
    var W = 960, H = 600;
    var F = 'ui-monospace, Consolas, monospace';
    var EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

    var DEFS = {
        tax:        { name: 'a 2009 tax return',             chip: 'TAX RETURN',   effect: 'It flaps around you and gets in the way of what you are looking at.' },
        kia:        { name: 'a 2017 Kia Soul',               chip: 'KIA SOUL',     effect: 'It drags, and your aim drifts sideways.' },
        tuesday:    { name: 'Tuesday',                       chip: 'TUESDAY',      effect: 'Once per level, the last moment happens again.' },
        cooking:    { name: '8,000 pages of a cooking show', chip: 'COOKING SHOW', effect: 'Everything you control is heavier and slower.' },
        reflection: { name: 'your own reflection',           chip: 'REFLECTION',   effect: 'At intervals it takes the controls, and it is left-handed.' },
        fax:        { name: 'a fax machine',                 chip: 'FAX MACHINE',  effect: 'It screeches, and you lose the sound cues.' }
    };
    var ORDER = ['tax', 'kia', 'tuesday', 'cooking', 'reflection', 'fax'];

    var list = [];
    var C = S.carry = { MAX: 3, DEFS: DEFS };

    C.reset = function (ids) {
        list = [];
        (ids || []).forEach(function (id) { if (DEFS[id] && list.indexOf(id) < 0) list.push(id); });
    };
    C.ids = function () { return list.slice(); };
    C.count = function () { return list.length; };
    C.has = function (id) { return list.indexOf(id) >= 0; };
    C.def = function (id) { return DEFS[id]; };
    C.full = function () { return list.length >= C.MAX; };
    /* Adds the attachment. If it is somehow already on you (debug params),
       the next free one is used instead so a failure always costs something. */
    C.add = function (id) {
        if (!DEFS[id] || C.has(id)) {
            id = ORDER.filter(function (o) { return !C.has(o); })[0];
        }
        if (id) list.push(id);
        return id;
    };

    /* ---------- per-level runtime ---------- */
    var t = 0, lastDt = 0, cur = null, buf = [], bufT = 0, replay = null, replayI = 0;
    var tuesdayAt = 0, tuesdayDone = false, wasDeaf = false, nodes = [];

    var REPLAY_SECS = 1.4;
    var MIRROR_CYCLE = 12, MIRROR_WARN = 7, MIRROR_ON = 8, MIRROR_OFF = 11;
    var DEAF_CYCLE = 13, DEAF_ON = 9, DEAF_OFF = 12;

    C.beginLevel = function () {
        t = 0; lastDt = 0; cur = null; buf = []; bufT = 0; replay = null; replayI = 0;
        tuesdayAt = 6 + Math.random() * 7;
        tuesdayDone = false; wasDeaf = false; nodes = [];
    };

    function mirrorPhase() { return t % MIRROR_CYCLE; }
    C.mirrored = function () { var p = mirrorPhase(); return C.has('reflection') && p >= MIRROR_ON && p < MIRROR_OFF; };
    C.deaf = function () { var p = (t + 5) % DEAF_CYCLE; return C.has('fax') && p >= DEAF_ON && p < DEAF_OFF; };
    C.replaying = function () { return !!replay; };

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    /* base: { tx, ty, ax, ay, action, down } straight from the hardware.
       Returns what the level is allowed to believe. */
    C.apply = function (base, dt) {
        t += dt; lastDt = dt;

        var deaf = C.deaf();
        if (deaf && !wasDeaf && S.audio) S.audio.screech();
        wasDeaf = deaf;

        var heavy = C.has('cooking');
        if (!cur) cur = { x: base.tx, y: base.ty };
        if (heavy) {
            var k = 1 - Math.exp(-5 * dt);
            cur.x += (base.tx - cur.x) * k;
            cur.y += (base.ty - cur.y) * k;
        } else {
            cur.x = base.tx; cur.y = base.ty;
        }

        var x = cur.x, ax = base.ax, ay = base.ay;
        if (C.has('kia')) x += Math.sin(t * 0.7) * 45;
        if (C.mirrored()) { x = W - x; ax = -ax; }
        if (heavy) { ax *= 0.6; ay *= 0.6; }

        var out = {
            x: clamp(x, 0, W), y: clamp(cur.y, 0, H),
            axisX: ax, axisY: ay,
            action: base.action, down: base.down
        };

        /* Tuesday: once per level, the last moment happens again. */
        if (replay) {
            var frame = replay[replayI++];
            if (replayI >= replay.length) replay = null;
            return frame;
        }
        buf.push({ o: out, dt: dt }); bufT += dt;
        while (bufT > REPLAY_SECS && buf.length > 1) bufT -= buf.shift().dt;
        if (C.has('tuesday') && !tuesdayDone && t >= tuesdayAt) {
            tuesdayDone = true;
            replay = buf.map(function (b) { return b.o; });
            replayI = 0;
        }
        return out;
    };

    C.banner = function () {
        if (replay) return 'IT IS TUESDAY AGAIN';
        if (C.has('reflection')) {
            var p = mirrorPhase();
            if (p >= MIRROR_ON && p < MIRROR_OFF) return 'YOUR REFLECTION HAS THE CONTROLS';
            if (p >= MIRROR_WARN && p < MIRROR_ON) return 'YOUR REFLECTION IS REACHING FOR THE CONTROLS';
        }
        if (C.deaf()) return 'FAX MACHINE: SKREEEEEEEE';
        return null;
    };

    /* ---------- the chain: everything stapled to you, dangling ---------- */
    var HANG = { tax: 78, kia: 54, tuesday: 56, cooking: 56, reflection: 62, fax: 54 };

    /* Drawn by core on top of every level. anchor is where "you" are. */
    C.drawOverlay = function (g, anchor) {
        var ax = anchor && typeof anchor.x === 'number' ? anchor.x : W / 2;
        var ay = anchor && typeof anchor.y === 'number' ? anchor.y : H / 2;
        var prev = { x: ax, y: ay }, k = 1 - Math.exp(-7 * (lastDt || 0.016)), i;
        /* the tax return is the big one, so it hangs at the bottom of the chain
           where it cannot hide the others */
        var chain = list.filter(function (id) { return id !== 'tax'; });
        if (C.has('tax')) chain.push('tax');

        /* each thing follows the one above it, a beat late */
        for (i = 0; i < chain.length; i++) {
            var n = nodes[i];
            if (!n || n.id !== chain[i]) n = nodes[i] = { id: chain[i], x: prev.x, y: prev.y + 30, vx: 0 };
            var tx = prev.x + Math.sin(t * 2.3 + i * 1.7) * 9, ty = prev.y + HANG[n.id];
            var ox = n.x;
            n.x += (tx - n.x) * k; n.y += (ty - n.y) * k;
            n.vx = n.x - ox;
            prev = n;
        }
        nodes.length = chain.length;

        if (list.length) {
            g.save();
            /* the links: silver, a staple at each joint */
            prev = { x: ax, y: ay };
            g.strokeStyle = '#c9ced6'; g.lineWidth = 2;
            for (i = 0; i < nodes.length; i++) {
                g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(nodes[i].x, nodes[i].y - 20); g.stroke();
                staple(g, nodes[i].x, nodes[i].y - 20, 0);
                prev = { x: nodes[i].x, y: nodes[i].y + 14 };
            }
            staple(g, ax, ay, 0);                              /* the one that goes through YOU */
            /* the things themselves, furthest first so the nearest sits on top */
            for (i = nodes.length - 1; i >= 0; i--) drawThing(g, nodes[i]);
            g.restore();
        }

        var b = C.banner();
        if (b) {
            g.save();
            g.font = 'bold 18px ' + F;
            var w = g.measureText(b).width + 28;
            g.fillStyle = 'rgba(0,0,0,.78)';
            g.fillRect((W - w) / 2, 14, w, 32);
            g.strokeStyle = '#c9ced6'; g.lineWidth = 2;
            g.strokeRect((W - w) / 2, 14, w, 32);
            g.fillStyle = '#f3ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(b, W / 2, 31);
            g.restore();
        }
    };

    function staple(g, x, y, rot) {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.strokeStyle = '#5a616b'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-8, 5); g.lineTo(-8, -3); g.lineTo(8, -3); g.lineTo(8, 5); g.stroke();
        g.strokeStyle = '#e8edf2'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(-8, 5); g.lineTo(-8, -3); g.lineTo(8, -3); g.lineTo(8, 5); g.stroke();
        g.restore();
    }

    function drawThing(g, n) {
        var tilt = clamp(n.vx * 0.05, -0.5, 0.5);
        g.save(); g.translate(n.x, n.y); g.rotate(tilt);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (n.id === 'tax') {
            /* real paper: big, and only mostly see-through. This IS the handicap. */
            g.rotate(Math.sin(t * 3.1) * 0.08);
            g.globalAlpha = 0.74;
            g.fillStyle = '#e6dfca'; g.fillRect(-58, -18, 112, 134);
            g.fillStyle = '#f4efdf'; g.fillRect(-52, -22, 112, 134);
            g.strokeStyle = '#8a8168'; g.lineWidth = 1; g.strokeRect(-52, -22, 112, 134);
            g.globalAlpha = 0.9;
            g.fillStyle = '#3a3528'; g.font = 'bold 11px ' + F; g.textAlign = 'left';
            g.fillText('FORM 1040 — 2009', -44, -8);
            g.fillStyle = '#a39a80';
            for (var r = 0; r < 6; r++) g.fillRect(-44, 8 + r * 16, 70 + ((r * 37) % 26), 3);
        } else if (n.id === 'kia') {
            g.font = '44px ' + EMOJI; g.fillStyle = '#000'; g.fillText('🚙', 0, 4);
            g.fillStyle = '#fffdf2'; g.fillRect(8, -18, 13, 10);      /* its ticket, still on the hood */
        } else if (n.id === 'tuesday') {
            g.fillStyle = '#fffdf2'; g.fillRect(-24, -20, 48, 46);
            g.fillStyle = '#c8392b'; g.fillRect(-24, -20, 48, 14);
            g.strokeStyle = '#2c261a'; g.lineWidth = 1; g.strokeRect(-24, -20, 48, 46);
            g.fillStyle = '#fffdf2'; g.font = 'bold 9px ' + F; g.fillText('ALWAYS', 0, -13);
            g.fillStyle = '#2c261a'; g.font = 'bold 15px ' + F; g.fillText('TUE', 0, 8);
            g.font = '20px ' + EMOJI; g.fillText('🐦', 22, -22);        /* the pigeon came with it */
        } else if (n.id === 'cooking') {
            for (var p = 3; p >= 0; p--) {
                g.fillStyle = p ? '#e6dfca' : '#f4efdf'; g.fillRect(-26 + p * 3, -18 + p * 4, 50, 36);
                g.strokeStyle = '#8a8168'; g.lineWidth = 1; g.strokeRect(-26 + p * 3, -18 + p * 4, 50, 36);
            }
            g.font = '18px ' + EMOJI; g.fillStyle = '#000'; g.fillText('🍳', -6, -4);
            g.fillStyle = '#3a3528'; g.font = 'bold 8px ' + F; g.fillText('p. 8,000', 0, 11);
        } else if (n.id === 'reflection') {
            /* you, but the wrong way round, and not quite there */
            g.globalAlpha = 0.45 + Math.sin(t * 4) * 0.12;
            g.scale(-1, 1);
            g.fillStyle = '#9fd0ff'; g.fillRect(-11, -8, 22, 30);
            g.beginPath(); g.arc(0, -19, 11, 0, 7); g.fill();
            g.strokeStyle = '#9fd0ff'; g.lineWidth = 4; g.lineCap = 'round';
            g.beginPath(); g.moveTo(-9, -4); g.lineTo(-22, 10); g.moveTo(9, -4); g.lineTo(22, -18); g.stroke();
            if (C.mirrored()) { g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(0, -4, 32, 0, 7); g.stroke(); }
        } else if (n.id === 'fax') {
            var sk = C.deaf() ? Math.sin(t * 60) * 3 : 0;
            g.font = '42px ' + EMOJI; g.fillStyle = '#000'; g.fillText('📠', sk, 4);
        }
        g.restore();
    }
})();
