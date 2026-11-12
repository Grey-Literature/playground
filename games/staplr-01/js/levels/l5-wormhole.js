/* STAPLR-01 — Level V: The Wormhole. You are Ines.
   You are falling through the fold: the paperclip garage, the rubber-band
   garage, the Post-it garage. Things drift up past you the whole way down,
   in plain view (the falling-emoji idea is borrowed from Feed the Mountain).

   GRAB the office supplies. Each one is a minute: 18 of them takes you from
   4:01 to 4:19 and out the bottom of the fold.
   DODGE the staples, pins and scissors. Three hits and the fold closes.
   Mom's phone drifts by sometimes. Catch it: her text is from 18 minutes in
   the future, and everything slows down while you read it.

   The doors in the side walls are real exits to other cabinets. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';
    var EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

    var PY = 170, LEFT = 80, RIGHT = 880, NEED = 18, MAX_HITS = 3;
    var SLOW_SECS = 4, SLOW_FACTOR = 0.45, FALL = 200;
    var LAYERS = [
        { name: 'THE PAPERCLIP GARAGE',   bg: '#efe6cf', wall: '#aab0b9', crease: '#d9cfb2',
          good: ['📎', '📎', '🖇️', '🎫'], bad: ['staple', 'staple', '📌'], v: [140, 180], every: 0.66, badShare: 0.36 },
        { name: 'THE RUBBER-BAND GARAGE', bg: '#f3dfd2', wall: '#c9745e', crease: '#e3c7b6',
          good: ['➰', '➰', '📎', '🎫'], bad: ['staple', 'staple', '📌', '✂️'], v: [165, 210], every: 0.56, badShare: 0.44 },
        { name: 'THE POST-IT GARAGE',     bg: '#fbf3b4', wall: '#e0b93a', crease: '#ead98a',
          good: ['🗒️', '🗒️', '✏️', '🎫'], bad: ['staple', 'staple', '📌', '✂️', '🦣'], v: [185, 235], every: 0.48, badShare: 0.5 }
    ];
    var GOOD_LINES = {
        '📎': 'A paperclip. It holds things together without hurting them.',
        '🖇️': 'Two paperclips, already friends.',
        '🎫': 'A parking ticket. Unvalidated. Keep it.',
        '➰': 'A rubber band. It remembers your shape.',
        '🗒️': 'A Post-it. It says "DENTIST THURS". It was a sedan.',
        '✏️': 'A pencil. For the crossword, later.'
    };
    var BAD_LINES = {
        'staple': 'KA-CHUNK. A staple went through your sleeve.',
        '📌': 'A pushpin. You are briefly a notice on a corkboard.',
        '✂️': 'Scissors. Your lanyard is shorter now.',
        '🦣': 'A mammoth. Its ticket says "THE PLEISTOCENE, 2 HRS".'
    };
    var MOM = [
        'oh honey. 18 minutes',
        'the staples come in pairs. they always did',
        'you were always good at catching things',
        'say hi to the paperclip man for me',
        'it is not angry. it is lonely. you will see'
    ];
    var DOORS = [
        { at: 1900, side: 'L', door: 0, tag: 'EXIT 4 · ITOPS' },
        { at: 4300, side: 'R', door: 1, tag: 'EXIT 4 · ITSHOP' },
        { at: 6500, side: 'L', door: 2, tag: 'EXIT 4 · INTERPRETIVE NET' }
    ];

    var st, SPEED = 1, BAD_ADD = 0;

    function layerIndex() { return Math.min(LAYERS.length - 1, Math.floor(st.got / 6)); }
    function clock(mins) { var m = 1 + mins; return '4:' + (m < 10 ? '0' : '') + m + ' a.m.'; }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function say(msg, secs) { st.msg = msg; st.msgT = secs || 3; }

    function spawn() {
        var L = LAYERS[layerIndex()], kind, icon, roll = Math.random();
        if (roll < 0.07 && !st.items.some(function (i) { return i.kind === 'mom'; }) && st.slow <= 0) { kind = 'mom'; icon = '📱'; }
        else if (roll < 0.10) { kind = 'joke'; icon = '🐦'; }
        else if (Math.random() < L.badShare + BAD_ADD) { kind = 'bad'; icon = pick(L.bad); }
        else { kind = 'good'; icon = pick(L.good); }
        st.items.push({
            kind: kind, icon: icon,
            x0: LEFT + 50 + Math.random() * (RIGHT - LEFT - 100), y: H + 40,
            v: (L.v[0] + Math.random() * (L.v[1] - L.v[0])) * SPEED,
            sway: 12 + Math.random() * 26, ph: Math.random() * 6.28,
            size: icon === '🦣' ? 62 : 42, spin: (Math.random() - 0.5) * 2
        });
    }

    S.registerLevel('wormhole', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            SPEED = ctx.hard ? 1.3 : 1; BAD_ADD = ctx.hard ? 0.07 : 0;   /* hard: a faster fall, and more of it is sharp */
            st = { t: 0, scroll: 0, items: [], pops: [], nextSpawn: 0.6, got: 0, hits: 0, x: W / 2,
                   hurt: 0, glow: 0, slow: 0, momI: 0, mom: null,
                   doors: DOORS.map(function (d) { return { d: d, used: false }; }),
                   msg: 'Grab the office supplies. Dodge the staples.', msgT: 6,
                   finale: 0, chunked: false, end: null, res: null };
            ctx.log('> the air has folded. one side of the exit lane is not Cleveland');
            ctx.log('> paperclip attendant: "Oh no. Not the staplers again."');
        },

        update: function (dt, ctx) {
            var inp = ctx.input;
            st.t += dt; st.hurt = Math.max(0, st.hurt - dt); st.glow = Math.max(0, st.glow - dt);
            st.msgT = Math.max(0, st.msgT - dt);
            st.pops.forEach(function (p) { p.t -= dt; p.y -= 40 * dt; });
            st.pops = st.pops.filter(function (p) { return p.t > 0; });
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }

            if (st.finale > 0) {                              /* the gate at the bottom of everything */
                st.finale -= dt;
                if (!st.chunked && st.finale <= 1.9) {
                    st.chunked = true; ctx.audio.kachunk(); ctx.shake();
                    ctx.log('> it went up. it went down. KA-CHUNK.', true);
                }
                if (st.finale <= 0) st.res = 'win';
                return;
            }

            st.slow = Math.max(0, st.slow - dt);
            var k = st.slow > 0 ? SLOW_FACTOR : 1, gdt = dt * k;       /* the world's clock, not yours */
            st.x = Math.max(LEFT + 18, Math.min(RIGHT - 18, inp.x));
            st.scroll += FALL * SPEED * gdt;

            /* side doors */
            st.doors.forEach(function (o) {
                if (o.used || Math.abs(o.d.at - st.scroll - PY) > 60) return;
                if ((o.d.side === 'L' && st.x <= LEFT + 30) || (o.d.side === 'R' && st.x >= RIGHT - 30)) {
                    o.used = true; ctx.exitDoor(o.d.door);
                }
            });

            st.nextSpawn -= gdt;
            if (st.nextSpawn <= 0) { spawn(); st.nextSpawn = LAYERS[layerIndex()].every * (0.8 + Math.random() * 0.4) / SPEED; }

            var before = layerIndex();
            for (var i = st.items.length - 1; i >= 0; i--) {
                var it = st.items[i];
                it.y -= it.v * gdt;
                it.x = it.x0 + Math.sin(st.t * 1.6 + it.ph) * it.sway;
                var reach = it.kind === 'bad' ? it.size * 0.55 : it.size * 0.95;   /* generous to grab, stingy to hurt */
                if (Math.abs(it.x - st.x) < reach && Math.abs(it.y - (PY - 4)) < reach + 14) {
                    st.items.splice(i, 1);
                    touch(it, ctx);
                    if (st.end || st.finale > 0) return;
                } else if (it.y < -60) {
                    st.items.splice(i, 1);
                }
            }
            if (layerIndex() !== before) {
                say(layerIndex() === 1 ? 'Behind the paperclips: a garage made of rubber bands.'
                                       : 'Behind that: a garage of Post-its, where all the cars are reminders.', 4);
            }
        },

        draw: function (g, ctx) {
            if (st.finale > 0 || (st.end && st.end.res === 'win')) { drawAncientGate(g); return; }
            var L = LAYERS[layerIndex()], i;

            g.fillStyle = L.bg; g.fillRect(0, 0, W, H);
            /* creases streaming upward: you are the one falling */
            g.strokeStyle = L.crease; g.lineWidth = 3;
            var off = st.scroll % 90;
            for (i = -1; i < 9; i++) {
                var cy = H - (i * 90 + off);
                g.beginPath(); g.moveTo(LEFT, cy + 14); g.lineTo(RIGHT, cy - 14); g.stroke();
            }
            /* side walls */
            g.fillStyle = L.wall; g.fillRect(0, 0, LEFT, H); g.fillRect(RIGHT, 0, W - RIGHT, H);
            g.fillStyle = 'rgba(0,0,0,.14)';
            var w2 = st.scroll % 60;
            for (i = 0; i < 12; i++) { g.fillRect(0, H - (i * 60 + w2), LEFT, 4); g.fillRect(RIGHT, H - (i * 60 + w2) + 30, W - RIGHT, 4); }

            /* doors */
            g.textBaseline = 'middle';
            st.doors.forEach(function (o) {
                var y = o.d.at - st.scroll; if (y < -80 || y > H + 80) return;
                var left = o.d.side === 'L', x = left ? 0 : RIGHT;
                g.fillStyle = '#17120c'; g.fillRect(x, y - 60, LEFT, 120);
                g.strokeStyle = '#c23a26'; g.lineWidth = 4; g.strokeRect(x + 2, y - 58, LEFT - 4, 116);
                g.font = 'bold 13px ' + F;
                var tw = g.measureText(o.d.tag).width + 20, tx = left ? LEFT + 6 : RIGHT - 6 - tw;
                g.fillStyle = o.used ? '#8c8573' : '#c23a26'; g.fillRect(tx, y - 14, tw, 28);
                g.fillStyle = '#fffdf2'; g.textAlign = 'left'; g.fillText(o.d.tag, tx + 10, y + 1);
            });

            /* the things drifting past */
            g.textAlign = 'center'; g.textBaseline = 'middle';
            st.items.forEach(function (it) {
                if (it.kind === 'bad') {                       /* hazards get a red halo so nobody has to guess */
                    g.fillStyle = 'rgba(194,58,38,.16)'; g.beginPath(); g.arc(it.x, it.y, it.size * 0.72, 0, 7); g.fill();
                    g.strokeStyle = 'rgba(194,58,38,.7)'; g.lineWidth = 2; g.setLineDash([5, 5]);
                    g.beginPath(); g.arc(it.x, it.y, it.size * 0.72, 0, 7); g.stroke(); g.setLineDash([]);
                } else if (it.kind === 'mom') {
                    g.fillStyle = 'rgba(61,90,128,.22)'; g.beginPath(); g.arc(it.x, it.y, 34 + Math.sin(st.t * 8) * 4, 0, 7); g.fill();
                }
                if (it.icon === 'staple') drawStaple(g, it.x, it.y, st.t * it.spin + it.ph);
                else { g.font = it.size + 'px ' + EMOJI; g.fillStyle = '#000'; g.fillText(it.icon, it.x, it.y + 2); }
            });

            drawInes(g, st.x, PY, st.hurt > 0, st.glow > 0, st.t);

            g.font = 'bold 15px ' + F; g.textAlign = 'center';
            st.pops.forEach(function (p) {
                g.globalAlpha = Math.min(1, p.t * 2); g.fillStyle = p.bad ? '#c23a26' : '#2f7d4f';
                g.fillText(p.text, p.x, p.y);
            });
            g.globalAlpha = 1;

            /* slow-motion tint while reading Mom's text */
            if (st.slow > 0) { g.fillStyle = 'rgba(61,90,128,.10)'; g.fillRect(LEFT, 0, RIGHT - LEFT, H); }

            /* Mom */
            if (st.mom) {
                var fresh = st.slow > 0;
                g.fillStyle = '#fffdf2'; g.fillRect(LEFT + 12, 54, 400, 62);
                g.strokeStyle = fresh ? '#3d5a80' : '#2c261a'; g.lineWidth = fresh ? 4 : 2; g.strokeRect(LEFT + 12, 54, 400, 62);
                g.textAlign = 'left'; g.textBaseline = 'top';
                g.fillStyle = '#7a7058'; g.font = '12px ' + F;
                g.fillText('Mom · sent ' + st.mom.stamp + (fresh ? ' · time is being polite' : ''), LEFT + 24, 62);
                g.fillStyle = '#2c261a'; g.font = 'bold 16px ' + F; g.fillText(st.mom.text, LEFT + 24, 84, 376);
            }

            /* clock, layer, hits */
            g.textAlign = 'right'; g.textBaseline = 'top';
            g.fillStyle = '#2c261a'; g.font = 'bold 20px ' + F; g.fillText(clock(st.got), RIGHT - 14, 56);
            g.font = 'bold 13px ' + F; g.fillText(L.name, RIGHT - 14, 82);
            g.fillText('GRABBED ' + st.got + '/' + NEED, RIGHT - 14, 100);
            g.fillStyle = st.hits ? '#c23a26' : '#7a7058';
            g.fillText('HITS ' + st.hits + '/' + MAX_HITS, RIGHT - 14, 118);

            if (st.msgT > 0) {
                g.textAlign = 'left'; g.font = 'bold 14px ' + F;
                g.fillStyle = 'rgba(44,38,26,.9)'; g.fillRect(LEFT + 12, H - 44, 600, 30);
                g.fillStyle = '#fffdf2'; g.fillText(st.msg, LEFT + 22, H - 36, 580);
            }
        },

        /* where the things stapled to you hang from */
        anchor: function (ctx) { return { x: st.x, y: PY + 22 }; },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });

    function touch(it, ctx) {
        if (it.kind === 'good') {
            st.got++; st.glow = 0.25;
            ctx.audio.cue('good');
            st.pops.push({ x: it.x, y: PY - 60, t: 0.9, text: '+1 min' });
            say(GOOD_LINES[it.icon] || 'Got it.', 2.5);
            if (st.got >= NEED) {
                st.items = []; st.finale = 4.2; st.mom = null; st.slow = 0;
                ctx.log('> 4:19 a.m. something very old is down here. it is striped.');
            }
        } else if (it.kind === 'bad') {
            st.hits++; st.hurt = 0.5;
            ctx.audio.kachunk(); ctx.shake(); ctx.audio.cue('bad');
            st.pops.push({ x: it.x, y: PY - 60, t: 0.9, text: 'HIT', bad: true });
            say(BAD_LINES[it.icon] || 'That hurt.', 3);
            if (st.hits >= MAX_HITS) {
                st.end = { res: 'fail', t: 2.6 };
                say('The fold closes. You and your reflection have been filed as one document.', 9);
                ctx.audio.cue('lose');
            }
        } else if (it.kind === 'mom') {
            st.slow = SLOW_SECS;
            st.mom = { text: MOM[st.momI % MOM.length], stamp: clock(st.got + 18) };
            st.momI++;
            ctx.audio.cue('blip');
            ctx.log('> Mom (' + st.mom.stamp + '): ' + st.mom.text, true);
            say('A text from Mom, from 18 minutes from now. Everything slows down while you read it.', 3.5);
        } else {
            ctx.audio.cue('tick');
            say('A pigeon. It is still Tuesday for this pigeon. It seems happy there.', 3);
        }
    }

    function drawStaple(g, x, y, rot) {
        g.save(); g.translate(x, y); g.rotate(rot);
        g.strokeStyle = '#5a616b'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-18, 14); g.lineTo(-18, -10); g.lineTo(18, -10); g.lineTo(18, 14); g.stroke();
        g.strokeStyle = '#e8edf2'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(-18, 14); g.lineTo(-18, -10); g.lineTo(18, -10); g.lineTo(18, 14); g.stroke();
        g.restore(); g.lineCap = 'butt'; g.lineJoin = 'miter';
    }

    function drawInes(g, x, y, hurt, glow, t) {
        var flail = Math.sin(t * 16) * 8;
        if (glow) { g.fillStyle = 'rgba(47,125,79,.25)'; g.beginPath(); g.arc(x, y - 6, 52, 0, 7); g.fill(); }
        g.strokeStyle = hurt ? '#c23a26' : '#2c261a'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 10, y - 14); g.lineTo(x - 26, y - 40 + flail);        /* arms, up */
        g.moveTo(x + 10, y - 14); g.lineTo(x + 26, y - 40 - flail);
        g.moveTo(x - 7, y + 16); g.lineTo(x - 12, y + 38 - flail * 0.5);   /* legs */
        g.moveTo(x + 7, y + 16); g.lineTo(x + 12, y + 38 + flail * 0.5);
        g.stroke();
        g.fillStyle = hurt ? '#c23a26' : '#3d5a80'; g.fillRect(x - 13, y - 20, 26, 38);
        g.fillStyle = '#b98a5e'; g.beginPath(); g.arc(x, y - 32, 13, 0, 7); g.fill();
        g.strokeStyle = '#c23a26'; g.lineWidth = 2;                         /* lanyard, flying upward */
        g.beginPath(); g.moveTo(x - 5, y - 20); g.lineTo(x + flail * 0.4, y - 62); g.lineTo(x + 5, y - 20); g.stroke();
        g.lineCap = 'butt';
    }

    function drawAncientGate(g) {
        var p = st.finale > 0 ? 1 - st.finale / 4.2 : 1, i;
        g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#f3ecd8';
        for (i = 0; i < 70; i++) {
            g.globalAlpha = 0.3 + ((i * 13) % 7) / 10; g.fillRect((i * 137.5) % W, (i * 71.3) % H, 2, 2);
        }
        g.globalAlpha = 1;
        g.fillStyle = '#3a3340'; g.fillRect(250, 250, 34, 260);             /* post */
        /* the arm: up, then down */
        var up = p < 0.28 ? p / 0.28 : p < 0.55 ? 1 : p < 0.6 ? 1 - (p - 0.55) / 0.05 : 0;
        g.save(); g.translate(267, 280); g.rotate(-up * 1.25);
        for (i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#f4efdf' : '#c8392b'; g.fillRect(i * 40, -13, 40, 26); }
        g.strokeStyle = '#e8edf2'; g.lineWidth = 7;                         /* prongs at the tip */
        g.beginPath(); g.moveTo(480, -22); g.lineTo(480, 30); g.moveTo(462, -22); g.lineTo(480, -22); g.moveTo(462, 30); g.lineTo(480, 30); g.stroke();
        g.restore();

        g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#f3ecd8';
        g.font = 'bold 15px ' + F;
        g.fillText('Deep down the tunnel, in the dark between galaxies: one enormous parking gate.', W / 2, 70);
        g.fillText('Ancient. Striped red and white. Older than light.', W / 2, 94);
        g.font = 'bold 30px ' + F; g.fillStyle = '#e0b84a';
        if (p >= 0.05) g.fillText(p < 0.55 ? 'It went up.' : p < 0.62 ? 'It went down.' : 'KA-CHUNK.', W / 2, 150);
        if (p >= 0.72) {
            g.font = '15px ' + F; g.fillStyle = '#f3ecd8';
            g.fillText('Not with a bang. With a staple.', W / 2, 540);
        }
    }
})();
