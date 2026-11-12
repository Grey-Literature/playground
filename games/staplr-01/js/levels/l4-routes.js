/* STAPLR-01 — Level IV: The Routes. You are Priya Nair, network engineer.
   The gate has looked at the global routing table and seen a stack of loose
   paper. It keeps stapling routes through Level P3. Every stapled route
   pours traffic into Booth 3, where it arrives as printouts.

   KA-CHUNK a staple to withdraw the route. Hold out until the prefix filter
   finishes deploying. If 8,000 pages print first, you lose.

   Keyboard players get a wider reach (the nearest staple to the cursor). */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';

    var DURATION = 40, PAGE_LIMIT = 8000, MAX_ACTIVE = 6;
    var RATE = 90, RATE_FOLD = 130, FOLD_FROM = 18, SPAWN_MUL = 1;    /* RATE* and SPAWN_MUL are reset per difficulty in init */
    var SPOTS = null;
    var REACH_POINTER = 36, REACH_KEYS = 150;

    var P3 = { n: 'LEVEL P3 · CLEVELAND', x: 480, y: 300 };
    var CITIES = [
        { n: 'REYKJAVIK', x: 330, y: 170 }, { n: 'LONDON', x: 455, y: 125 }, { n: 'HELSINKI', x: 600, y: 120 },
        { n: 'TOKYO', x: 850, y: 190 },     { n: 'MUMBAI', x: 745, y: 300 }, { n: 'PERTH', x: 640, y: 450 },
        { n: 'LAGOS', x: 440, y: 490 },     { n: 'SAO PAULO', x: 240, y: 450 }
    ];
    var SCENERY = [
        { n: 'toaster.idf-3', sub: 'BGP session: stable', x: 120, y: 300 },
        { n: '??.decommissioned.floor', sub: 'answers anyway', x: 850, y: 380 }
    ];
    var ARRIVALS = [
        [2000, 'A Netflix stream bound for Helsinki has arrived in Booth 3 as a printout. Still warm.'],
        [4000, 'A Zoom call from Mumbai is coming out of the ticket dispenser. One face per ticket.'],
        [6000, 'Eight thousand pages of a cooking show are nearly done. Collated. Stapled, of course.']
    ];

    var st;

    function say(msg, bad) { st.msg = msg; st.msgT = 4; st.bad = bad ? 0.5 : 0; }

    function spawn(ctx) {
        if (st.staples.length >= MAX_ACTIVE) return;
        var free = CITIES.filter(function (c) {
            return !st.staples.some(function (s) { return s.a === c || s.b === c; });
        });
        if (!free.length) return;
        var a = free[Math.floor(Math.random() * free.length)], b = P3, fold = false;
        if (st.t >= FOLD_FROM && free.length >= 2 && Math.random() < 0.4) {
            do { b = free[Math.floor(Math.random() * free.length)]; } while (b === a);
            fold = true;
        }
        var along = 0.3 + Math.random() * 0.4;               /* the staple can land anywhere along the route */
        st.staples.push({ a: a, b: b, fold: fold, hp: fold ? 2 : 1, born: st.t, hit: 0,
                          x: a.x + (b.x - a.x) * along, y: a.y + (b.y - a.y) * along });
        ctx.audio.kachunk();
        if (fold && !st.foldSeen) {
            st.foldSeen = true;
            say('It is stapling places that are not next to each other. Those take two pulls.');
            ctx.log('> ' + a.n.toLowerCase() + ' stapled to ' + b.n.toLowerCase() + '. packets arriving before they were sent.', true);
        }
    }

    S.registerLevel('routes', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            RATE = ctx.hard ? 110 : 90; RATE_FOLD = ctx.hard ? 155 : 130; SPAWN_MUL = ctx.hard ? 0.8 : 1;
            /* A different internet every run: the cities trade places, everything
               shifts a little, and P3 is never quite where it was. */
            if (!SPOTS) SPOTS = CITIES.map(function (c) { return { x: c.x, y: c.y }; });
            var names = CITIES.map(function (c) { return c.n; });
            for (var k = names.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), tmp = names[k]; names[k] = names[j]; names[j] = tmp; }
            CITIES.forEach(function (c, i) {
                c.n = names[i];
                c.x = SPOTS[i].x + (Math.random() - 0.5) * 56;
                c.y = SPOTS[i].y + (Math.random() - 0.5) * 44;
            });
            P3.x = 480 + (Math.random() - 0.5) * 90; P3.y = 300 + (Math.random() - 0.5) * 60;
            st = { t: 0, pages: 0, staples: [], nextSpawn: 1.2, arrivals: 0, foldSeen: false, mom: false,
                   pull: 0, msg: 'KA-CHUNK a staple to withdraw the route. Hold out until the filter deploys.', msgT: 6, bad: 0,
                   end: null, res: null };
            ctx.log('> BGP UPDATE from gate-3: "ALL ROADS NOW LEAD THROUGH LEVEL P3."', true);
            ctx.log('> the internet, being polite, believed it');
        },

        update: function (dt, ctx) {
            var inp = ctx.input;
            st.msgT = Math.max(0, st.msgT - dt); st.bad = Math.max(0, st.bad - dt); st.pull = Math.max(0, st.pull - dt);
            st.staples.forEach(function (s) { s.hit = Math.max(0, s.hit - dt); });
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }
            st.t += dt;

            st.nextSpawn -= dt;
            if (st.nextSpawn <= 0) {
                spawn(ctx);
                st.nextSpawn = (2.0 - 1.1 * Math.min(1, st.t / DURATION)) * SPAWN_MUL;
            }

            st.staples.forEach(function (s) { st.pages += (s.fold ? RATE_FOLD : RATE) * dt; });
            while (st.arrivals < ARRIVALS.length && st.pages >= ARRIVALS[st.arrivals][0]) {
                say(ARRIVALS[st.arrivals][1], true); ctx.log('> booth 3: ' + ARRIVALS[st.arrivals][1]);
                st.arrivals++;
            }
            if (!st.mom && st.t >= 27) {
                st.mom = true;
                say('Text from Mom, stamped 4:19 a.m.: "did you see the wormhole yet"');
                ctx.log('> Mom (4:19 a.m.): did you see the wormhole yet', true);
            }

            if (inp.action) {
                st.pull = 0.18;
                var reach = inp.mode === 'keys' ? REACH_KEYS : REACH_POINTER, best = null, bd = reach;
                st.staples.forEach(function (s) {
                    var d = Math.hypot(s.x - inp.x, s.y - inp.y);
                    if (d <= bd) { bd = d; best = s; }
                });
                if (best) {
                    best.hp--; best.hit = 0.25;
                    if (best.hp <= 0) {
                        st.staples.splice(st.staples.indexOf(best), 1);
                        ctx.audio.cue('good');
                        ctx.log('> withdrawn: ' + best.a.n.toLowerCase() + ' via ' + (best.fold ? best.b.n.toLowerCase() : 'p3'));
                    } else {
                        ctx.audio.cue('blip');
                    }
                } else {
                    ctx.audio.cue('tick');
                    say('Nothing there. And for once, it is not DNS.');
                }
            }

            if (st.pages >= PAGE_LIMIT) {
                st.pages = PAGE_LIMIT;
                st.end = { res: 'fail', t: 2.6 };
                say('8,000 pages. A cooking show, start to finish. It has been stapled to you.', true); st.msgT = 9;
                ctx.audio.kachunk(); ctx.shake(); ctx.audio.cue('lose');
            } else if (st.t >= DURATION) {
                st.end = { res: 'win', t: 2.6 };
                st.staples = [];
                say('Prefix filter deployed. The routes drift back to where they belong, a little straighter than before.'); st.msgT = 9;
                ctx.log('> filter live. gate-3 announcements: dropped. gate-3 feelings: unknown', true);
                ctx.audio.cue('win');
            }
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, inp = ctx.input, i;
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);
            g.strokeStyle = 'rgba(169,241,198,.07)'; g.lineWidth = 1;
            for (i = 0; i < W; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); }
            for (i = 0; i < H; i += 40) { g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }

            /* the honest routes */
            g.strokeStyle = 'rgba(169,241,198,.22)'; g.lineWidth = 1.5;
            for (i = 0; i < CITIES.length; i++) {
                var a = CITIES[i], b = CITIES[(i + 1) % CITIES.length];
                g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            }
            g.setLineDash([3, 6]);
            SCENERY.forEach(function (n) { g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(P3.x, P3.y); g.stroke(); });
            g.setLineDash([]);

            /* the stapled ones */
            st.staples.forEach(function (s) {
                var col = s.fold ? '#ff9de0' : sk.accent;
                g.strokeStyle = col; g.lineWidth = 4;
                g.beginPath(); g.moveTo(s.a.x, s.a.y); g.lineTo(s.b.x, s.b.y); g.stroke();
                g.fillStyle = '#ffffff';
                for (var k = 0; k < 3; k++) {
                    var f = (st.t * 0.9 + k / 3) % 1;
                    g.fillRect(s.a.x + (s.b.x - s.a.x) * f - 3, s.a.y + (s.b.y - s.a.y) * f - 3, 6, 6);
                }
                /* the staple itself: the thing you hit */
                var grow = Math.min(1, (st.t - s.born) * 6), r = 22 * grow + (s.hit > 0 ? 5 : 0);
                g.fillStyle = 'rgba(5,10,8,.9)'; g.beginPath(); g.arc(s.x, s.y, r + 8, 0, 7); g.fill();
                g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, r + 8, 0, 7); g.stroke();
                g.strokeStyle = '#e8edf2'; g.lineWidth = 5;
                g.beginPath(); g.moveTo(s.x - r * 0.7, s.y + 9); g.lineTo(s.x - r * 0.7, s.y - 7);
                g.lineTo(s.x + r * 0.7, s.y - 7); g.lineTo(s.x + r * 0.7, s.y + 9); g.stroke();
                if (s.hp > 1) {
                    g.fillStyle = col; g.font = 'bold 13px ' + F; g.textAlign = 'center'; g.textBaseline = 'top';
                    g.fillText('x2', s.x, s.y + r + 12);
                }
            });

            /* nodes */
            g.textAlign = 'center'; g.textBaseline = 'top';
            CITIES.forEach(function (c) {
                var lit = st.staples.some(function (s) { return s.a === c || s.b === c; });
                g.fillStyle = lit ? sk.accent : sk.ink; g.fillRect(c.x - 6, c.y - 6, 12, 12);
                g.font = 'bold 12px ' + F; g.fillText(c.n, c.x, c.y + 10);
            });
            SCENERY.forEach(function (n) {
                g.fillStyle = sk.mute; g.fillRect(n.x - 5, n.y - 5, 10, 10);
                g.font = '11px ' + F; g.fillText(n.n, n.x, n.y + 9); g.fillText(n.sub, n.x, n.y + 23);
            });
            var busy = st.staples.length > 0, pulse = busy ? 4 + Math.sin(st.t * 10) * 3 : 0;
            g.strokeStyle = busy ? sk.accent : sk.ink; g.lineWidth = 3;
            g.strokeRect(P3.x - 16 - pulse, P3.y - 16 - pulse, 32 + pulse * 2, 32 + pulse * 2);
            g.fillStyle = busy ? sk.accent : sk.ink; g.fillRect(P3.x - 8, P3.y - 8, 16, 16);
            g.font = 'bold 12px ' + F; g.fillText(P3.n, P3.x, P3.y + 26);

            /* cursor */
            var d = st.pull > 0 ? 6 : 0;
            g.strokeStyle = sk.ink; g.lineWidth = 2;
            g.beginPath(); g.arc(inp.x, inp.y, (inp.mode === 'keys' ? 26 : 14) - d, 0, 7); g.stroke();
            g.beginPath(); g.moveTo(inp.x - 22, inp.y); g.lineTo(inp.x - 6, inp.y); g.moveTo(inp.x + 6, inp.y); g.lineTo(inp.x + 22, inp.y); g.stroke();

            /* readouts */
            g.textAlign = 'left';
            var pf = st.pages / PAGE_LIMIT, hot = pf > 0.7;
            g.fillStyle = sk.mute; g.font = '12px ' + F; g.fillText('PAGES PRINTED IN BOOTH 3', 20, 58);
            g.strokeStyle = sk.mute; g.lineWidth = 1; g.strokeRect(20, 76, 240, 12);
            g.fillStyle = hot ? '#ff6b6b' : sk.ink; g.fillRect(21, 77, 238 * pf, 10);
            g.font = 'bold 14px ' + F; g.fillText(Math.floor(st.pages).toLocaleString('en-US') + ' / 8,000', 20, 94);

            var tf = Math.min(1, st.t / DURATION), mins = 52 + Math.floor(tf * 9);
            g.textAlign = 'right';
            g.fillStyle = sk.mute; g.font = '12px ' + F; g.fillText('PREFIX FILTER DEPLOYING · ' + (mins >= 60 ? '4:0' + (mins - 60) : '3:' + mins) + ' a.m.', W - 20, 58);
            g.strokeStyle = sk.mute; g.strokeRect(W - 260, 76, 240, 12);
            g.fillStyle = sk.accent; g.fillRect(W - 259, 77, 238 * tf, 10);
            g.fillStyle = sk.ink; g.font = 'bold 14px ' + F; g.fillText(Math.floor(tf * 100) + '%', W - 20, 94);

            g.fillStyle = 'rgba(0,0,0,.14)';
            for (i = 0; i < H; i += 3) g.fillRect(0, i, W, 1);

            if (st.msgT > 0) {
                g.textAlign = 'left'; g.font = 'bold 14px ' + F;
                g.fillStyle = 'rgba(5,10,8,.88)'; g.fillRect(12, H - 40, 690, 30);
                g.fillStyle = st.bad > 0 ? '#ff8a8a' : sk.ink;
                g.fillText(st.msg, 22, H - 32, 670);
            }
        },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });
})();
