/* STAPLR-01 — Level II: The First Car. You are Gate 3.
   Slide the prongs along the arm and KA-CHUNK the paper ticket to each car's
   HOOD as it passes. Lift for everything else: the pigeon, the cart, Ines.

   An incident is: stapling a driver, stapling a non-car, or letting a car
   leave unvalidated. Three incidents fails the level. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';

    var GROUND = 440, RAIL = 150, MIN_X = 110, MAX_X = 800, MAX_INCIDENTS = 3, COOLDOWN = 0.42;

    /* zones are fractions of length measured from the REAR (cars drive right) */
    var TYPES = {
        kia:    { car: true, len: 160, h: 78, color: '#86b35c', name: '2017 Kia Soul',        cabin: [0.16, 0.64] },
        camry:  { car: true, len: 190, h: 58, color: '#b7b2a4', name: 'Camry',                cabin: [0.26, 0.66] },
        civic:  { car: true, len: 172, h: 56, color: '#5a86c8', name: 'Civic',                cabin: [0.26, 0.66] },
        lambo:  { car: true, len: 186, h: 40, color: '#e8d21d', name: 'terrible Lamborghini', cabin: [0.34, 0.62] },
        f150:   { car: true, len: 236, h: 80, color: '#a8402e', name: 'F-150',                cabin: [0.42, 0.68] },
        prius:  { car: true, len: 166, h: 60, color: '#d6dfe2', name: 'Prius',                cabin: [0.24, 0.66] },
        pigeon: { len: 36, h: 28, name: 'pigeon', oops: 'The pigeon has been classified as a document.' },
        ines:   { len: 40, h: 104, name: 'Ines',  oops: "That was Ines's lanyard. She has noticed." },
        cart:   { len: 74, h: 62, name: 'shopping cart', oops: 'Retained: one shopping cart. Nobody asked for this.' }
    };
    /* [spawn time, type, speed px/s] */
    var SCHEDULE = [
        [0.5, 'kia', 135], [6, 'camry', 185], [9.5, 'pigeon', 80], [11.5, 'civic', 215],
        [15.5, 'ines', 115], [17.5, 'lambo', 340], [20.5, 'cart', 200], [23, 'f150', 195],
        [27, 'prius', 250], [29.5, 'pigeon', 95], [31, 'camry', 280]
    ];
    var CARS_TOTAL = SCHEDULE.filter(function (s) { return TYPES[s[1]].car; }).length;

    var st, SPEED = 1;

    function say(msg, bad) { st.msg = msg; st.msgT = 3.5; st.bad = bad ? 0.5 : 0; }
    function incident(msg, ctx) {
        st.incidents++; say(msg, true); ctx.audio.cue('bad');
        ctx.log('> incident ' + st.incidents + '/' + MAX_INCIDENTS + ': ' + msg);
    }

    S.registerLevel('firstcar', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            SPEED = ctx.hard ? 1.3 : 1;                     /* hard: every car is in more of a hurry */
            st = { t: 0, next: 0, things: [], stapled: 0, incidents: 0, cool: 0, strikeX: 0, strikeY: GROUND,
                   headX: W / 2, msg: 'Aim at the hood. KA-CHUNK. Everything that is not a car, you lift for.', msgT: 6, bad: 0,
                   end: null, res: null };
            ctx.log('> gate-3: capability BIND, first use');
        },

        update: function (dt, ctx) {
            var inp = ctx.input;
            st.t += dt; st.cool = Math.max(0, st.cool - dt);
            st.msgT = Math.max(0, st.msgT - dt); st.bad = Math.max(0, st.bad - dt);
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; }

            while (st.next < SCHEDULE.length && st.t >= SCHEDULE[st.next][0]) {
                var s = SCHEDULE[st.next++], ty = TYPES[s[1]];
                st.things.push({ type: s[1], def: ty, x: -ty.len - 20, v: s[2] * SPEED, stapled: false, staples: [], counted: false });
            }
            st.things.forEach(function (th) {
                th.x += th.v * dt;
                if (th.def.car && !th.stapled && !th.counted && th.x > MAX_X + 10 && !st.end) {
                    th.counted = true;
                    incident('The ' + th.def.name + ' left unvalidated. You went up. For nothing.', ctx);
                }
            });
            st.things = st.things.filter(function (th) { return th.x < W + 40; });

            st.headX = Math.max(MIN_X, Math.min(MAX_X, inp.x));

            if (inp.action && st.cool <= 0 && !st.end) {
                st.cool = COOLDOWN; st.strikeX = st.headX; st.strikeY = GROUND;
                ctx.audio.kachunk(); ctx.shake();
                var hit = null;
                for (var i = st.things.length - 1; i >= 0; i--) {
                    var th = st.things[i];
                    if (st.strikeX >= th.x && st.strikeX <= th.x + th.def.len) { hit = th; break; }
                }
                if (!hit) {
                    say('You stapled the asphalt. The asphalt is fine with it.');
                } else {
                    st.strikeY = GROUND - hit.def.h;
                    var f = (st.strikeX - hit.x) / hit.def.len;
                    hit.staples.push(f);
                    if (!hit.def.car) {
                        incident(hit.def.oops, ctx);
                    } else if (f >= hit.def.cabin[1]) {
                        if (!hit.stapled) {
                            hit.stapled = true; st.stapled++; ctx.audio.cue('good');
                            say('Ticket stapled to the hood of the ' + hit.def.name + '. Through the metal.');
                            ctx.log('> document retention: success (' + hit.def.name + ')', true);
                        }
                    } else if (f >= hit.def.cabin[0]) {
                        incident('That was the driver of the ' + hit.def.name + '. His tie is now a document.', ctx);
                    } else {
                        say('That was the back of the ' + hit.def.name + '. The ticket goes on the hood.');
                    }
                }
            }

            if (!st.end) {
                if (st.incidents >= MAX_INCIDENTS) {
                    st.end = { res: 'fail', t: 2.2 };
                    say('Facilities has opened a ticket about you.', true); st.msgT = 9;
                    ctx.audio.cue('lose');
                } else if (st.next >= SCHEDULE.length && !st.things.length) {
                    st.end = { res: 'win', t: 1.8 };
                    say('Cars stapled: ' + st.stapled + '. The gate went up. Politely. Almost proud.'); st.msgT = 9;
                    ctx.audio.cue('win');
                }
            }
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, i;
            /* sodium-lit lane */
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);
            var glow = g.createRadialGradient(W / 2, 120, 20, W / 2, 260, 620);
            glow.addColorStop(0, 'rgba(242,178,51,.22)'); glow.addColorStop(1, 'rgba(242,178,51,0)');
            g.fillStyle = glow; g.fillRect(0, 0, W, H);
            g.fillStyle = '#2a2415'; g.fillRect(0, GROUND, W, H - GROUND);
            g.fillStyle = '#5c4d22';
            for (i = 0; i < W; i += 120) g.fillRect(i + 20, GROUND + 70, 60, 6);

            /* booth + post on the right */
            g.fillStyle = '#3a3018'; g.fillRect(856, 250, 104, GROUND - 250);
            g.fillStyle = '#f1e3b0'; g.fillRect(872, 276, 56, 60);
            g.fillStyle = '#d8c9a3'; g.fillRect(884, 322, 28, 10);                    /* Bartholomew, in the window */
            g.fillStyle = '#6b5a2a'; g.fillRect(826, RAIL - 12, 22, GROUND - RAIL + 12);

            /* the arm: red and white, with the prongs sliding along it */
            for (i = 0; i < 18; i++) {
                g.fillStyle = i % 2 ? '#f4efdf' : '#c8392b';
                g.fillRect(MIN_X - 30 + i * 42, RAIL - 9, 42, 18);
            }
            var down = st.cool > COOLDOWN - 0.16;
            var hx = down ? st.strikeX : st.headX, tipY = down ? st.strikeY : RAIL + 44;
            g.fillStyle = '#c8392b'; g.fillRect(hx - 5, RAIL, 10, tipY - RAIL - 14);
            g.strokeStyle = '#e8edf2'; g.lineWidth = 5;
            g.beginPath(); g.moveTo(hx - 16, tipY); g.lineTo(hx - 16, tipY - 16); g.lineTo(hx + 16, tipY - 16); g.lineTo(hx + 16, tipY); g.stroke();
            if (!down) {                                                               /* aim line */
                g.strokeStyle = 'rgba(241,227,176,.25)'; g.lineWidth = 1; g.setLineDash([4, 8]);
                g.beginPath(); g.moveTo(hx, tipY + 4); g.lineTo(hx, GROUND); g.stroke(); g.setLineDash([]);
            }

            st.things.forEach(function (th) { drawThing(g, th, st.t); });

            /* CCTV furniture */
            g.fillStyle = 'rgba(0,0,0,.10)';
            for (i = 0; i < H; i += 4) g.fillRect(0, i, W, 1);
            g.textBaseline = 'top'; g.textAlign = 'left';
            g.fillStyle = sk.ink; g.font = 'bold 14px ' + F;
            var secs = 51 * 60 + Math.floor(st.t * 2);
            g.fillText('CAM 07 · LANE 3 · 02:' + pad2(Math.floor(secs / 60) % 60) + ':' + pad2(secs % 60), 20, 56);
            g.font = 'bold 18px ' + F;
            g.fillText('CARS STAPLED: ' + st.stapled + '/' + CARS_TOTAL, 20, 80);
            g.fillStyle = st.incidents ? '#ff6b4a' : sk.mute;
            g.fillText('INCIDENTS: ' + st.incidents + '/' + MAX_INCIDENTS, 20, 104);
            if (Math.floor(st.t * 1.5) % 2) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(W - 250, 64, 6, 0, 7); g.fill(); }

            if (st.msgT > 0) {
                g.font = 'bold 15px ' + F;
                var w = Math.min(W - 40, g.measureText(st.msg).width + 24);
                g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(20, 540, w, 34);
                g.fillStyle = st.bad > 0 ? '#ff6b4a' : sk.ink;
                g.fillText(st.msg, 32, 549, W - 64);
            }
        },

        /* where the things stapled to you hang from */
        anchor: function (ctx) { return { x: st.headX, y: RAIL + 34 }; },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function drawThing(g, th, t) {
        var d = th.def, x = th.x, y = GROUND;
        if (d.car) {
            var c0 = d.cabin[0] * d.len, c1 = d.cabin[1] * d.len, bodyH = d.h * 0.55;
            g.fillStyle = d.color;
            g.fillRect(x, y - bodyH - 12, d.len, bodyH);                               /* body */
            g.beginPath();                                                             /* cabin */
            g.moveTo(x + c0, y - bodyH - 12); g.lineTo(x + c0 + 10, y - d.h - 12);
            g.lineTo(x + c1 - 18, y - d.h - 12); g.lineTo(x + c1, y - bodyH - 12); g.closePath(); g.fill();
            g.fillStyle = 'rgba(20,24,30,.75)';                                        /* glass */
            g.beginPath();
            g.moveTo(x + c0 + 8, y - bodyH - 14); g.lineTo(x + c0 + 15, y - d.h - 7);
            g.lineTo(x + c1 - 21, y - d.h - 7); g.lineTo(x + c1 - 8, y - bodyH - 14); g.closePath(); g.fill();
            g.fillStyle = '#f1e3b0'; g.beginPath(); g.arc(x + c1 - 30, y - bodyH - 20, 7, 0, 7); g.fill();   /* the driver */
            g.fillStyle = '#16130b';
            g.beginPath(); g.arc(x + d.len * 0.2, y - 10, 14, 0, 7); g.arc(x + d.len * 0.82, y - 10, 14, 0, 7); g.fill();
            g.fillStyle = '#fff7c2'; g.fillRect(x + d.len - 5, y - bodyH - 4, 5, 8);   /* headlight */
            /* the paper ticket, riding on the hood */
            var hoodMid = x + (c1 + d.len) / 2;
            g.save(); g.translate(hoodMid, y - bodyH - 12);
            if (th.stapled) g.rotate(Math.sin(t * 14) * 0.12 - 0.1);
            g.fillStyle = '#fffdf2'; g.fillRect(-11, -16, 22, 16);
            g.fillStyle = '#b9b29a'; g.fillRect(-7, -11, 14, 2); g.fillRect(-7, -7, 10, 2);
            g.restore();
            g.strokeStyle = '#e8edf2'; g.lineWidth = 4;                                /* staples that landed */
            th.staples.forEach(function (f) {
                var top = f >= d.cabin[0] && f < d.cabin[1] ? y - d.h - 12 : y - bodyH - 12;
                g.beginPath(); g.moveTo(x + f * d.len - 9, top); g.lineTo(x + f * d.len + 9, top); g.stroke();
            });
            return;
        }
        if (th.type === 'pigeon') {
            var bob = Math.sin(t * 12) * 2;
            g.fillStyle = '#8f96a3'; g.beginPath(); g.ellipse(x + 16, y - 14, 15, 10, 0, 0, 7); g.fill();
            g.beginPath(); g.arc(x + 29, y - 24 + bob, 7, 0, 7); g.fill();
            g.fillStyle = '#e0a13a'; g.fillRect(x + 35, y - 25 + bob, 6, 3);
            g.fillStyle = '#c46a4a'; g.fillRect(x + 12, y - 5, 2, 5); g.fillRect(x + 19, y - 5, 2, 5);
        } else if (th.type === 'ines') {
            var step = Math.sin(t * 9) * 6;
            g.fillStyle = '#3d5a80'; g.fillRect(x + 8, y - 70, 24, 44);
            g.fillStyle = '#f1e3b0'; g.beginPath(); g.arc(x + 20, y - 84, 13, 0, 7); g.fill();
            g.fillStyle = '#22252c'; g.fillRect(x + 10 + step * 0.4, y - 26, 8, 26); g.fillRect(x + 22 - step * 0.4, y - 26, 8, 26);
            g.fillStyle = '#fffdf2'; g.fillRect(x + 32, y - 60, 9, 13);              /* coffee */
            g.strokeStyle = '#c8392b'; g.lineWidth = 2;                               /* lanyard */
            g.beginPath(); g.moveTo(x + 14, y - 72); g.lineTo(x + 20, y - 50); g.lineTo(x + 26, y - 72); g.stroke();
        } else {                                                                      /* cart */
            g.strokeStyle = '#c9ced6'; g.lineWidth = 3;
            g.strokeRect(x + 10, y - 56, 54, 34);
            g.beginPath(); g.moveTo(x, y - 60); g.lineTo(x + 10, y - 56); g.stroke();
            g.fillStyle = '#16130b'; g.beginPath(); g.arc(x + 20, y - 8, 7, 0, 7); g.arc(x + 54, y - 8, 7, 0, 7); g.fill();
        }
        g.strokeStyle = '#e8edf2'; g.lineWidth = 4;
        th.staples.forEach(function (f) {
            g.beginPath(); g.moveTo(x + f * d.len - 9, y - d.h); g.lineTo(x + f * d.len + 9, y - d.h); g.stroke();
        });
    }
})();
