/* STAPLR-01 — Level I: The Handshake. You are Bartholomew.
   Phase A: hold to compress the spring, release to KA-CHUNK the swaying
            ethernet cable to your own base. Three staples secure it.
   Phase B: assemble the SAML claim from drifting fragments, in order.
   The clock for both is Ines's raccoon video. Wrong moves cost seconds. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';

    var VIDEO = 48, NEED = 3, REACH = 40, SPEED = 1;      /* VIDEO, REACH, SPEED are reset per difficulty in init */
    var PIVOT = { x: 480, y: 96 }, LEN = 338, JAW_X = 480;
    var SWING = [1.4, 1.8, 2.2], AMP = 0.42;
    var CHARGE_SECS = 0.7, MIN_CHARGE = 0.5, SLIP_SECS = 1.2;

    var CLAIM = ['we are the same,', 'you and I.', 'we both close things.'];
    var DECOYS = {
        'we both open things.':    'gate-3: I also close. That was the whole job.',
        'per my last email,':      'gate-3 has never received an email.',
        'I am a printer.':         'gate-3 does not trust printers. Nobody does.',
        'grant me admin.':         'DENIED. A stapler asked for admin. This has been logged.',
        'please advise.':          'gate-3 has no advice. It goes up. It goes down.',
        'we both hold things up.': 'Close. The gate holds things up. You hold things together.'
    };

    var st;

    function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

    function makeChips(g) {
        var texts = CLAIM.concat(Object.keys(DECOYS)), chips = [];
        g.font = 'bold 17px ' + F;
        texts.forEach(function (t, i) {
            var w = Math.ceil(g.measureText(t).width) + 28;
            chips.push({
                text: t, w: w, h: 42,
                x: 40 + ((i * 211) % (W - 80 - w)), y: 250 + ((i * 97) % 250),
                vx: (i % 2 ? 1 : -1) * (22 + (i * 7) % 20), vy: (i % 3 ? 1 : -1) * (16 + (i * 5) % 16)
            });
        });
        return chips;
    }

    function penalty(secs, msg, ctx) {
        st.left -= secs; st.msg = msg; st.msgT = 3; st.bad = 0.4;
        ctx.audio.cue('bad');
    }

    S.registerLevel('handshake', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            /* hard: a shorter video, a faster cable, a narrower target */
            VIDEO = ctx.hard ? 40 : 48; REACH = ctx.hard ? 30 : 40; SPEED = ctx.hard ? 1.3 : 1;
            st = { phase: 'A', t: 0, left: VIDEO, secured: 0, charge: 0, held: 0, prevDown: false,
                   fire: 0, hitFlash: 0, bad: 0, msg: 'Hold to compress the spring. Release as the cable passes.', msgT: 6,
                   chips: null, next: 0, built: [], swingT: 0, hold: 0, end: null, res: null };
            ctx.log('> ines: away from desk (raccoon_eating_grapes.mp4, ' + fmt(VIDEO) + ')');
        },

        update: function (dt, ctx) {
            var inp = ctx.input;
            st.t += dt;
            st.fire = Math.max(0, st.fire - dt); st.hitFlash = Math.max(0, st.hitFlash - dt);
            st.bad = Math.max(0, st.bad - dt); st.msgT = Math.max(0, st.msgT - dt);

            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }

            st.left -= dt;
            if (st.left <= 0) {
                st.left = 0;
                st.end = { res: 'fail', t: 2.2 };
                st.msg = 'Ines is back. You sit perfectly still, the way only an object that has just committed a crime can.'; st.msgT = 9;
                ctx.audio.cue('lose');
                return;
            }

            if (st.phase === 'A') {
                if (st.hold > 0) {                       /* beat between A and B */
                    st.hold -= dt;
                    if (st.hold <= 0) {
                        st.phase = 'B'; st.chips = null;
                        st.msg = 'Assemble the claim. KA-CHUNK the fragments in order.'; st.msgT = 6;
                        ctx.log('INCOMING SAML ASSERTION', true);
                        ctx.log('ISSUER: urn:stapler:bartholomew:booth3');
                    }
                    return;
                }
                st.swingT += dt * SPEED * SWING[Math.min(st.secured, SWING.length - 1)];
                var theta = Math.sin(st.swingT) * AMP;
                st.tipX = PIVOT.x + Math.sin(theta) * LEN;
                st.tipY = PIVOT.y + Math.cos(theta) * LEN;

                var fire = false;
                if (inp.down) {
                    st.charge = Math.min(1, st.charge + dt / CHARGE_SECS);
                    if (st.charge >= 1) { st.held += dt; if (st.held >= SLIP_SECS) fire = true; }
                } else if (st.prevDown) {
                    if (st.charge >= MIN_CHARGE) fire = true;
                    else { st.charge = 0; st.held = 0; ctx.audio.cue('blip'); st.msg = 'tik. Not enough spring. Hold longer.'; st.msgT = 2; }
                }
                st.prevDown = inp.down && !fire;

                if (fire) {
                    st.charge = 0; st.held = 0; st.fire = 0.25;
                    ctx.audio.kachunk(); ctx.shake();
                    if (Math.abs(st.tipX - JAW_X) <= REACH) {
                        st.secured++; st.hitFlash = 0.4; ctx.audio.cue('good');
                        st.msg = 'KA-CHUNK. Cable secured ' + st.secured + ' of ' + NEED + '.'; st.msgT = 3;
                        if (st.secured >= NEED) {
                            st.hold = 1.1;
                            ctx.log('> link up. 10 Mbps, half duplex. it will do.', true);
                        }
                    } else {
                        penalty(4, 'You stapled the desk. From the bathroom: "...hello?"  (-0:04)', ctx);
                    }
                }
                return;
            }

            /* ---- phase B ---- */
            if (!st.chips) return;                       /* built on first draw (needs text metrics) */
            st.chips.forEach(function (c) {
                c.x += c.vx * dt; c.y += c.vy * dt;
                if (c.x < 20 || c.x + c.w > W - 20) { c.vx = -c.vx; c.x = Math.max(20, Math.min(W - 20 - c.w, c.x)); }
                if (c.y < 236 || c.y + c.h > H - 20) { c.vy = -c.vy; c.y = Math.max(236, Math.min(H - 20 - c.h, c.y)); }
            });
            if (inp.action) {
                st.fire = 0.2; ctx.audio.kachunk(); ctx.shake();
                var hit = null;
                for (var i = st.chips.length - 1; i >= 0; i--) {
                    var c = st.chips[i];
                    if (inp.x >= c.x - 6 && inp.x <= c.x + c.w + 6 && inp.y >= c.y - 6 && inp.y <= c.y + c.h + 6) { hit = c; break; }
                }
                if (!hit) return;
                if (hit.text === CLAIM[st.next]) {
                    st.built.push(hit.text); st.next++;
                    st.chips.splice(st.chips.indexOf(hit), 1);
                    st.hitFlash = 0.3; ctx.audio.cue('good');
                    if (st.next >= CLAIM.length) {
                        st.end = { res: 'win', t: 2.6 };
                        ctx.log('CLAIM: "' + CLAIM.join(' ') + '"');
                        ctx.log('TRUST RELATIONSHIP ESTABLISHED.', true);
                        ctx.log('SHARED CAPABILITIES: [LIFT, LOWER, BIND]', true);
                        ctx.audio.cue('win');
                    }
                } else if (DECOYS[hit.text]) {
                    penalty(4, DECOYS[hit.text] + '  (-0:04)', ctx);
                } else {
                    penalty(2, 'ASSERTION MALFORMED. Say it in order.  (-0:02)', ctx);
                }
            }
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, inp = ctx.input;
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);
            g.textBaseline = 'top'; g.textAlign = 'left';

            /* dashboard chrome: breadcrumb + the "video" clock */
            g.fillStyle = sk.panel; g.fillRect(0, 0, W, 54);
            g.fillStyle = sk.mute; g.font = '13px ' + F;
            g.fillText('Identity  /  Federation  /  Pending requests', 20, 12);
            g.fillStyle = sk.ink; g.font = 'bold 14px ' + F;
            g.fillText(st.phase === 'A' ? 'CAM 03 · BOOTH 3 DESK · 02:47' : 'staplr-01  →  gate-3.meridian.local', 20, 30);

            var urgent = st.left < 10;
            g.textAlign = 'right'; g.font = '12px ' + F; g.fillStyle = sk.mute;
            g.fillText('INES · raccoon_eating_grapes.mp4', W - 20, 10);
            g.fillStyle = '#263247'; g.fillRect(W - 280, 30, 200, 10);
            g.fillStyle = urgent ? '#ff6b6b' : sk.accent; g.fillRect(W - 280, 30, 200 * (1 - st.left / VIDEO), 10);
            g.fillStyle = urgent ? '#ff6b6b' : sk.ink; g.font = 'bold 13px ' + F;
            g.fillText(fmt(VIDEO - st.left) + ' / ' + fmt(VIDEO), W - 20, 27);
            g.textAlign = 'left';

            if (st.phase === 'A') drawDesk(g, sk); else drawAssertion(g, sk, inp);

            /* message line */
            if (st.msgT > 0 || st.end) {
                g.font = 'bold 15px ' + F;
                g.fillStyle = st.bad > 0 ? '#ff6b6b' : sk.ink;
                wrap(g, st.msg, 20, st.phase === 'A' ? 66 : 206, W - 320, 20);
            }
            if (st.end && st.end.res === 'win') {
                g.fillStyle = 'rgba(8,12,20,.86)'; g.fillRect(0, 250, W, 130);
                g.textAlign = 'center'; g.fillStyle = sk.accent; g.font = 'bold 28px ' + F;
                g.fillText('TRUST RELATIONSHIP ESTABLISHED.', W / 2, 272);
                g.fillStyle = sk.ink; g.font = 'bold 18px ' + F;
                g.fillText('SHARED CAPABILITIES: [LIFT, LOWER, BIND]', W / 2, 318);
                g.fillStyle = sk.mute; g.font = '14px ' + F;
                g.fillText('The gate had never had BIND before.', W / 2, 346);
                g.textAlign = 'left';
            }
        },

        /* where the things stapled to you hang from */
        anchor: function (ctx) { return st.phase === 'A' ? { x: JAW_X + 96, y: 474 } : ctx.input; },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });

    function drawDesk(g, sk) {
        /* desk */
        g.fillStyle = '#1a2233'; g.fillRect(0, 500, W, 100);
        g.fillStyle = '#2a3550'; g.fillRect(0, 496, W, 6);

        /* the cable */
        var secured = st.secured >= NEED;
        var tx = secured ? JAW_X : st.tipX, ty = secured ? 452 : st.tipY;
        g.strokeStyle = '#4f8dff'; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(PIVOT.x, 54);
        g.quadraticCurveTo(PIVOT.x, PIVOT.y + 80, tx, ty); g.stroke();
        g.fillStyle = '#cfd6e4'; g.fillRect(tx - 9, ty - 4, 18, 24);
        g.fillStyle = '#8a94a8'; g.fillRect(tx - 5, ty + 14, 10, 6);

        /* target zone on the base */
        g.strokeStyle = st.hitFlash > 0 ? '#4fd28a' : sk.mute; g.lineWidth = 2;
        g.setLineDash([6, 5]); g.strokeRect(JAW_X - REACH, 428, REACH * 2, 50); g.setLineDash([]);

        /* Bartholomew */
        var squash = st.fire > 0 ? 26 : st.charge * 22;
        g.fillStyle = '#b3a37c'; g.fillRect(JAW_X - 130, 478, 260, 20);              /* base */
        g.save(); g.translate(JAW_X + 130, 470); g.rotate(0.24 - squash * 0.0085);  /* arm, hinged at the right */
        g.fillStyle = '#d8c9a3'; g.fillRect(-262, -34, 262, 34);
        g.fillStyle = '#c4b48c'; g.fillRect(-262, -6, 262, 6);
        g.restore();
        for (var i = 0; i < st.secured; i++) {                                       /* staples already in */
            g.strokeStyle = '#c9ced6'; g.lineWidth = 4;
            g.beginPath(); g.moveTo(JAW_X - 24 + i * 18, 486); g.lineTo(JAW_X - 12 + i * 18, 486); g.stroke();
        }

        /* spring meter */
        g.fillStyle = sk.mute; g.font = '12px ' + F; g.fillText('SPRING', 40, 400);
        g.strokeStyle = sk.mute; g.lineWidth = 2; g.strokeRect(40, 420, 22, 70);
        g.fillStyle = st.charge >= MIN_CHARGE ? '#4fd28a' : sk.accent;
        g.fillRect(42, 488 - 66 * st.charge, 18, 66 * st.charge);
        g.fillStyle = sk.ink; g.fillRect(36, 488 - 66 * MIN_CHARGE, 30, 2);

        g.fillStyle = sk.ink; g.font = 'bold 16px ' + F;
        g.fillText('CABLE SECURED ' + st.secured + '/' + NEED, 40, 130);
        g.fillStyle = sk.mute; g.font = '13px ' + F;
        g.fillText('Hold click / touch / Space, then release.', 40, 154);
    }

    function drawAssertion(g, sk, inp) {
        if (!st.chips) st.chips = makeChips(g);

        g.fillStyle = sk.panel; g.fillRect(20, 66, W - 40, 132);
        g.strokeStyle = sk.accent; g.lineWidth = 2; g.strokeRect(20, 66, W - 40, 132);
        g.font = 'bold 15px ' + F; g.fillStyle = sk.accent;
        g.fillText('INCOMING SAML ASSERTION', 36, 78);
        g.font = '15px ' + F; g.fillStyle = sk.ink;
        g.fillText('ISSUER:   urn:stapler:bartholomew:booth3', 36, 102);
        g.fillText('SUBJECT:  gate-3.meridian.local', 36, 122);
        var blink = Math.floor(st.t * 2) % 2 ? '_' : ' ';
        g.fillStyle = st.hitFlash > 0 ? '#4fd28a' : sk.ink;
        g.fillText('CLAIM:    "' + st.built.join(' ') + (st.next < CLAIM.length ? blink : '') + '"', 36, 142);
        g.fillStyle = sk.ink;
        g.fillText('REQUEST:  FEDERATED TRUST', 36, 162);

        g.font = 'bold 17px ' + F; g.textBaseline = 'middle';
        st.chips.forEach(function (c) {
            var over = inp.x >= c.x && inp.x <= c.x + c.w && inp.y >= c.y && inp.y <= c.y + c.h;
            g.fillStyle = over ? '#22304a' : '#18202f'; g.fillRect(c.x, c.y, c.w, c.h);
            g.strokeStyle = over ? sk.accent : '#3a4763'; g.lineWidth = 2; g.strokeRect(c.x, c.y, c.w, c.h);
            g.fillStyle = sk.ink; g.fillText(c.text, c.x + 14, c.y + c.h / 2 + 1);
        });
        g.textBaseline = 'top';

        /* the cursor is a staple */
        var d = st.fire > 0 ? 6 : 0;
        g.strokeStyle = '#c9ced6'; g.lineWidth = 4; g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(inp.x - 14, inp.y + 10 + d); g.lineTo(inp.x - 14, inp.y - 4 + d);
        g.lineTo(inp.x + 14, inp.y - 4 + d); g.lineTo(inp.x + 14, inp.y + 10 + d);
        g.stroke();
    }

    function wrap(g, text, x, y, maxW, lh) {
        var words = String(text).split(' '), line = '';
        words.forEach(function (w) {
            var test = line ? line + ' ' + w : w;
            if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; }
            else line = test;
        });
        if (line) g.fillText(line, x, y);
    }
})();
