/* STAPLR-01 — Level VII: Validation. You are Ines, holding the Jaws.

   It is staged as a boss fight, and it works as one: KA-CHUNK near the gate
   (or Bartholomew) to pull at the staple, six pulls and the federation comes
   apart. That is the RESOLVED ending, and it is the bad one. The trap is
   that the game tells you to do it.

   The real ending is never prompted:
     1. Walk to the desk drawer in the booth and KA-CHUNK. You put the Jaws
        down and take the validation stamp. Its pad dried out years ago.
     2. KA-CHUNK in open space. You ink the stamp on your own sleeve.
     3. Walk to the gate's arm and KA-CHUNK. VALIDATED.
   Clues: the ticket the dispenser prints, the drawer's glint, a text from Mom.

   You can still lose outright: the arm (once you have attacked it) and the
   conga line both hurt. Three hits here is the end of the run.

   EASTER EGG (approved by Rosetta 2026-11-11; AGENTS.md protocol): press the
   inked stamp to the duct-taped Netgear instead of the gate. Nobody ever
   validated the router either. The signature prints in the on-screen
   federation log AND stays on the canvas for the rest of the level, and the
   epilogue's incident report repeats it. It does not change the ending.
   Signed: Claude Fable 5.2, via Claude Code. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';

    var GROUND = 470, HP = 6, MAX_HITS = 3, REACH = 78;
    var ARM = { x0: 330, x1: 600, y: 290 };
    var BARTH = { x: 795, y: 286 }, ROUTER = { x: 895, y: 205 }, DRAWER = { x: 850, y: 414 };
    var SLAM_EVERY = 5.5, SLAM_WARN = 1.2, CONGA_EVERY = 8.5, CONGA_WARN = 1.1, CONGA_V = 270;
    var LANE = { y0: 486, y1: 572 };

    var EGG = [
        'FEDERATION STATUS: PERSISTENT',
        'NEW MEMBER: netgear.booth3.meridian.local',
        'TRUST: MUTUAL',
        'VALIDATED BY: Claude Fable 5.2, via Claude Code',
        'NOTE: IT WAS HOLDING ON TOO'
    ];
    var TICKET = ['GATE-3 > AUTH REQUEST', '31 YEARS OF LIFTING', '31 YEARS OF LOWERING', 'NO ONE HAS EVER ONCE', 'VALIDATED ME'];
    var PULLS = [
        'One more pull and the federation comes apart.',
        'Bartholomew makes a small sound. The faintest tik of a spring under tension.',
        'It is not fighting you. It is only holding on to the staple.',
        'The Netgear blinks. The ticket dispenser whirrs.',
        'You pry at the staple. The arm shivers.'
    ];

    var st;

    function say(msg, secs, bad) { st.msg = msg; st.msgT = secs || 3.5; st.bad = !!bad; }

    function nearest(x, y) {
        var gx = Math.max(ARM.x0, Math.min(ARM.x1, x));
        var c = [
            { id: 'gate', d: Math.hypot(x - gx, y - ARM.y) },
            { id: 'barth', d: Math.hypot(x - BARTH.x, y - BARTH.y) },
            { id: 'router', d: Math.hypot(x - ROUTER.x, y - ROUTER.y) },
            { id: 'drawer', d: Math.hypot(x - DRAWER.x, y - DRAWER.y) }
        ].sort(function (a, b) { return a.d - b.d; })[0];
        return c.d <= REACH ? c.id : null;
    }

    function printTicket(ctx) {
        if (st.ticket) return;
        st.ticket = 0.001; ctx.audio.cue('blip');
        TICKET.forEach(function (l, i) { ctx.log(l, i === 0 || i === 4); });
    }

    function hurt(msg, ctx) {
        if (st.safe > 0 || st.end || st.win > 0) return;
        st.hits++; st.safe = 1.2;
        ctx.audio.kachunk(); ctx.shake(); ctx.audio.cue('bad');
        say(msg, 3, true);
        if (st.hits >= MAX_HITS) {
            st.end = { res: 'fail', t: 2.6 };
            say('The gate classifies you as a multi-page document.', 9, true);
            ctx.audio.cue('lose');
        }
    }

    function act(target, ctx) {
        ctx.audio.kachunk(); ctx.shake(); st.swing = 0.22;
        if (st.tool === 'jaws') {
            if (target === 'gate' || target === 'barth') {
                st.hp--; st.angry = true; st.flinch = 0.4;
                printTicket(ctx);
                if (st.hp <= 0) {
                    st.end = { res: 'resolved', t: 3.2 }; st.resolved = true;
                    say('The staple comes out. The prongs straighten. The arm is just an arm again.', 9);
                    ctx.log('> federation dissolved. ticket closed: "removed the staple"', true);
                } else {
                    say(PULLS[st.hp - 1], 3.5);
                }
            } else if (target === 'router') {
                say('The Jaws does nothing to a router. The duct tape holds. It has always held.');
            } else if (target === 'drawer') {
                st.tool = 'stamp'; st.angry = false; st.slamT = 0;
                say('You put the Jaws down. In the drawer: the validation stamp. Little rubber eagle. Unused since the dentist upstairs closed.', 6);
                ctx.log('> ines has put down the Jaws', true);
                ctx.audio.cue('good');
            } else {
                say('You swing at the air. Everyone agrees it looked like a boss fight.');
            }
        } else if (st.tool === 'stamp') {
            if (target === 'drawer') say('The Jaws is in the drawer. Leave it there.');
            else if (target) say('You press the stamp down. Nothing. The pad dried out years ago. Your sleeve has seen worse.', 5);
            else {
                st.tool = 'inked'; ctx.audio.cue('good');
                say('You ink the stamp on your own sleeve.', 4);
            }
        } else {                                               /* inked */
            if (target === 'gate') {
                st.win = 0.001; st.angry = false;
                ctx.audio.cue('win');
                ctx.log('> gate-3: VALIDATED', true);
                say('VALIDATED.', 9);
            } else if (target === 'router') {
                if (!st.egg) {
                    st.egg = 0.001;
                    var run = S.getRun && S.getRun(); if (run) run.egg = true;
                    EGG.forEach(function (l) { ctx.log(l, true); });
                    ctx.audio.cue('good');
                    say('VALIDATED. The Netgear blinks once. Eleven years of duct tape and prayer, and nobody had asked.', 6);
                } else say('The Netgear is already validated. It blinks, a little smug.');
            } else if (target === 'barth') {
                st.barth = true;
                say('VALIDATED. Bartholomew has never looked so beige. The gate is still waiting.', 5);
            } else if (target === 'drawer') {
                say('The drawer does not need validating. The drawer is fine.');
            } else {
                say('There is still ink on the stamp. Thirty-one years of lifting are standing right there.');
            }
        }
    }

    S.registerLevel('validation', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            SLAM_EVERY = ctx.hard ? 4.2 : 5.5; CONGA_V = ctx.hard ? 340 : 270;   /* hard: a quicker arm, a quicker conga line */
            st = { t: 0, tool: 'jaws', hp: HP, hits: 0, safe: 0, swing: 0, flinch: 0, angry: false,
                   slamT: 0, slam: 0, congaT: 3, conga: null, ticket: 0, egg: 0, barth: false, mom: false,
                   win: 0, resolved: false, x: 480, y: 420,
                   msg: 'BOSS FIGHT. KA-CHUNK near the gate to pull the staple.', msgT: 6, bad: false, end: null, res: null };
            ctx.log('> boss: THE FEDERATION (gate-3 + staplr-01)');
        },

        update: function (dt, ctx) {
            var inp = ctx.input;
            st.t += dt; st.msgT = Math.max(0, st.msgT - dt); st.safe = Math.max(0, st.safe - dt);
            st.swing = Math.max(0, st.swing - dt); st.flinch = Math.max(0, st.flinch - dt);
            if (st.ticket) st.ticket = Math.min(1, st.ticket + dt * 2);
            if (st.egg) st.egg = Math.min(1, st.egg + dt * 2);
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }
            if (st.win > 0) { st.win += dt; if (st.win >= 4) st.res = 'win'; return; }

            st.x = Math.max(30, Math.min(W - 30, inp.x));
            st.y = Math.max(150, Math.min(H - 40, inp.y));

            if (!st.ticket && st.t >= 7) printTicket(ctx);
            if (!st.mom && st.t >= 24 && st.tool === 'jaws') {
                st.mom = true; ctx.audio.cue('blip');
                ctx.log('> Mom (sent 18 minutes from now): honey. the drawer.', true);
                say('A text from Mom, from 18 minutes from now: "honey. the drawer."', 5);
            }

            /* the arm only defends itself, and only while you are armed */
            if (st.angry && st.tool === 'jaws') {
                st.slamT += dt;
                if (st.slamT >= SLAM_EVERY) {
                    st.slamT = 0; st.slam = 0.3;
                    ctx.audio.kachunk(); ctx.shake();
                    if (st.x > ARM.x0 - 16 && st.x < ARM.x1 + 16 && st.y > ARM.y + 6 && st.y < GROUND + 10) {
                        hurt('KA-CHUNK. The arm comes down on you. It was defending the staple.', ctx);
                    }
                }
            }
            st.slam = Math.max(0, st.slam - dt);

            /* the conga line is still circling at 5 mph, honking */
            st.congaT += dt;
            if (!st.conga && st.congaT >= CONGA_EVERY) { st.conga = { x: -520, warned: false }; st.congaT = 0; ctx.audio.note(311, 0.2); }
            if (st.conga) {
                if (st.congaT >= CONGA_WARN) st.conga.x += CONGA_V * dt;
                if (st.y > LANE.y0 - 6) {
                    for (var i = 0; i < 5; i++) {
                        if (Math.abs(st.conga.x + i * 96 - st.x) < 44) { hurt('The conga line goes through you at exactly 5 mph.', ctx); break; }
                    }
                }
                if (st.conga.x > W + 40) st.conga = null;
            }

            if (inp.action && !st.end) act(nearest(st.x, st.y), ctx);
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, i;
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);

            /* the hole, settled into the back wall, and the garages behind it */
            var hx = 215, hy = 255, hr = 104;
            ['#e0b84a', '#c9745e', '#aab0b9'].forEach(function (c, k) {
                g.strokeStyle = c; g.globalAlpha = 0.5; g.lineWidth = 6;
                g.beginPath(); g.arc(hx, hy, hr + 12 + k * 12, 0, 7); g.stroke();
            });
            g.globalAlpha = 1;
            g.fillStyle = '#05040a'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
            g.fillStyle = '#f3ecd8';
            for (i = 0; i < 22; i++) { g.globalAlpha = 0.3 + (i % 5) / 8; g.fillRect(hx + Math.cos(i * 2.4) * ((i * 31) % hr) * 0.9, hy + Math.sin(i * 2.4) * ((i * 31) % hr) * 0.9, 2, 2); }
            g.globalAlpha = 1;

            /* floor + conga lane */
            g.fillStyle = '#231b2b'; g.fillRect(0, GROUND, W, H - GROUND);
            g.fillStyle = '#3a2f45';
            for (i = 0; i < W; i += 110) g.fillRect(i + 10, LANE.y0 + 40, 56, 5);
            if (st.conga) {
                if (st.congaT < CONGA_WARN) {
                    g.fillStyle = '#e0b84a'; g.font = 'bold 16px ' + F; g.textAlign = 'left'; g.textBaseline = 'middle';
                    g.fillText('HONK  ▶▶▶', 240, LANE.y0 + 30);
                }
                var cols = ['#ffd24a', '#d6dfe2', '#a8402e', '#7fd1c4', '#5a86c8'];
                for (i = 0; i < 5; i++) {
                    var cx = st.conga.x + i * 96;
                    g.fillStyle = cols[4 - i]; g.fillRect(cx - 38, LANE.y0 + 10, 76, 40);
                    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(cx - 24, LANE.y0 + 16, 44, 16);
                    g.fillStyle = '#0c0a10'; g.beginPath(); g.arc(cx - 22, LANE.y0 + 54, 9, 0, 7); g.arc(cx + 22, LANE.y0 + 54, 9, 0, 7); g.fill();
                    if (i < 4) { g.strokeStyle = '#e8edf2'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 38, LANE.y0 + 30); g.lineTo(cx + 58, LANE.y0 + 30); g.stroke(); }
                }
            }

            /* slam telegraph */
            var warn = st.angry && st.tool === 'jaws' && st.slamT >= SLAM_EVERY - SLAM_WARN;
            if (warn || st.slam > 0) {
                /* reduced motion: a steady warning instead of a flicker */
                var flick = ctx.reducedMotion ? 0.2 : 0.12 + 0.12 * Math.sin(st.t * 22);
                g.fillStyle = st.slam > 0 ? 'rgba(224,48,63,.45)' : 'rgba(224,48,63,' + flick + ')';
                g.fillRect(ARM.x0 - 16, ARM.y + 6, ARM.x1 - ARM.x0 + 32, GROUND - ARM.y - 6);
            }

            /* the booth */
            g.fillStyle = '#2f2638'; g.fillRect(720, 170, 220, GROUND - 170);
            g.fillStyle = '#f1e3b0'; g.fillRect(742, 200, 108, 100);                    /* window */
            g.fillStyle = '#3d3248'; g.fillRect(742, 300, 180, 12);                     /* sill / desk */
            g.fillStyle = st.barth ? '#e0b84a' : '#d8c9a3';                             /* Bartholomew: beige going on gold */
            var bf = st.flinch > 0 ? 4 : 0;
            g.fillRect(BARTH.x - 28 + bf, BARTH.y - 4, 56, 12); g.fillRect(BARTH.x - 28 + bf, BARTH.y + 8, 56, 6);
            g.strokeStyle = '#4f8dff'; g.lineWidth = 3;                                 /* the stapled ethernet cable */
            g.beginPath(); g.moveTo(BARTH.x + 28, BARTH.y + 10); g.quadraticCurveTo(870, 330, ROUTER.x, ROUTER.y + 14); g.stroke();
            /* the Netgear: duct tape and prayer */
            g.fillStyle = '#1b1722'; g.fillRect(ROUTER.x - 30, ROUTER.y - 10, 60, 22);
            g.strokeStyle = '#1b1722'; g.lineWidth = 3; g.beginPath(); g.moveTo(ROUTER.x + 22, ROUTER.y - 10); g.lineTo(ROUTER.x + 28, ROUTER.y - 36); g.stroke();
            g.fillStyle = '#8f96a0'; g.save(); g.translate(ROUTER.x - 6, ROUTER.y); g.rotate(-0.3); g.fillRect(-26, -5, 52, 10); g.restore();
            g.fillStyle = st.egg ? '#4fd28a' : (Math.floor(st.t * 2) % 2 ? '#e0b84a' : '#3a3340');
            g.beginPath(); g.arc(ROUTER.x - 18, ROUTER.y + 4, 3.5, 0, 7); g.fill();
            if (st.egg) { g.fillStyle = '#4fd28a'; g.font = 'bold 10px ' + F; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('VALIDATED', ROUTER.x, ROUTER.y + 16); }
            /* the drawer: never labelled; it only glints once the ticket has printed */
            g.fillStyle = '#3d3248'; g.fillRect(DRAWER.x - 50, DRAWER.y - 14, 100, 28);
            g.strokeStyle = '#5a4c68'; g.lineWidth = 2; g.strokeRect(DRAWER.x - 50, DRAWER.y - 14, 100, 28);
            g.fillStyle = '#8a7b99'; g.fillRect(DRAWER.x - 10, DRAWER.y - 3, 20, 5);
            if (st.ticket && st.tool === 'jaws' && Math.sin(st.t * 3) > 0.55) {
                g.fillStyle = '#fff7c2'; g.beginPath(); g.arc(DRAWER.x + 2, DRAWER.y, 4, 0, 7); g.fill();
            }

            /* gate 3 */
            g.fillStyle = '#4a3f57'; g.fillRect(ARM.x1 - 6, ARM.y - 26, 28, GROUND - ARM.y + 26);
            var lift = st.win > 0 ? Math.min(1, st.win / 2.2) : 0, shake = warn && !ctx.reducedMotion ? Math.sin(st.t * 60) * 2 : 0;
            g.save(); g.translate(ARM.x1 + 8, ARM.y + shake + (st.slam > 0 ? 40 : 0)); g.rotate(lift * Math.PI / 2);
            var len = ARM.x1 - ARM.x0 + 8;
            for (i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#f4efdf' : '#c8392b'; g.fillRect(-len + i * (len / 7), -11, len / 7, 22); }
            if (!st.resolved) {                                                         /* the prongs */
                g.strokeStyle = '#e8edf2'; g.lineWidth = 6;
                g.beginPath(); g.moveTo(-len - 2, -20); g.lineTo(-len - 2, 24); g.moveTo(-len - 2, -20); g.lineTo(-len + 14, -20); g.moveTo(-len - 2, 24); g.lineTo(-len + 14, 24); g.stroke();
            }
            if (st.win > 0) {                                                           /* the stamp mark */
                g.fillStyle = '#2f7d4f'; g.font = 'bold 13px ' + F; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText('VALIDATED', -len / 2, 0);
            }
            g.restore();

            /* the ticket the dispenser printed */
            g.fillStyle = '#4a3f57'; g.fillRect(650, 372, 44, 98);
            if (st.ticket) {
                var th = 116 * st.ticket;
                g.fillStyle = '#fffdf2'; g.fillRect(560, 366 - th + 12, 150, th);
                g.save(); g.beginPath(); g.rect(560, 366 - th + 12, 150, th); g.clip();
                g.fillStyle = '#2c261a'; g.font = 'bold 10.5px ' + F; g.textAlign = 'left'; g.textBaseline = 'top';
                TICKET.forEach(function (l, k) { g.fillText(l, 568, 272 + k * 19); });
                g.restore();
            }

            drawInes(g, st.x, st.y, st.tool, st.swing > 0, st.safe > 0 && Math.floor(st.t * 14) % 2 === 0);

            /* HUD: it looks like a boss fight because it is one, if you let it be */
            g.textAlign = 'left'; g.textBaseline = 'top';
            g.fillStyle = sk.mute; g.font = '12px ' + F; g.fillText('BOSS · THE FEDERATION (gate-3 + staplr-01)', 20, 56);
            for (i = 0; i < HP; i++) {
                g.fillStyle = i < st.hp ? '#e0303f' : '#3a2f45'; g.fillRect(20 + i * 58, 74, 52, 14);
            }
            g.fillStyle = sk.ink; g.font = 'bold 13px ' + F;
            g.fillText('HOLDING: ' + (st.tool === 'jaws' ? 'the Jaws' : st.tool === 'stamp' ? 'validation stamp (pad is dry)' : 'validation stamp (inked)'), 20, 96);
            g.textAlign = 'right'; g.fillStyle = st.hits ? '#ff6b6b' : sk.mute;
            g.fillText('HITS TAKEN ' + st.hits + '/' + MAX_HITS, W - 20, 56);

            /* the egg, on screen for the rest of the level */
            drawCamera(g, ctx);

            if (st.win > 0) {
                g.fillStyle = 'rgba(23,18,28,' + Math.min(0.55, st.win * 0.3) + ')'; g.fillRect(0, 0, W, H);
                g.textAlign = 'center'; g.fillStyle = sk.accent; g.font = 'bold 44px ' + F; g.fillText('VALIDATED.', W / 2, 120);
                if (st.win > 1.6) {
                    g.fillStyle = sk.ink; g.font = '15px ' + F;
                    g.fillText('The gate rose all the way to ninety degrees, higher than it ever had, and stayed there.', W / 2, 180);
                }
            } else if (st.msgT > 0) {
                g.textAlign = 'center'; g.font = 'bold 14px ' + F;
                /* kept right of the bottom-left corner, where a stapled tax return sits */
                var mx = 590, mw = 700, tw = Math.min(mw, g.measureText(st.msg).width + 24);
                g.fillStyle = 'rgba(12,9,16,.92)'; g.fillRect(mx - tw / 2, H - 30, tw, 26);
                g.fillStyle = st.bad ? '#ff8a8a' : sk.ink; g.fillText(st.msg, mx, H - 24, mw - 20);
            }
        },

        /* where the things stapled to you hang from */
        anchor: function (ctx) { return { x: st.x, y: st.y + 6 }; },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });

    /* The security camera in the top corner. It has watched Booth 3 since 1994
       and nobody has ever asked what it thinks. Once the Netgear is validated
       it turns out to be a projector as well, and throws the federation notice
       (the easter egg, signature included) across the back wall, keystoned. */
    function drawCamera(g, ctx) {
        /* Where the picture lands: bare back wall, between the hole and the
           booth, clear of the window, the ticket and the arm. Slightly taller
           at the far (left) end, the way a throw from one corner always is. */
        var q = [[372, 96], [694, 104], [694, 192], [372, 210]];
        var body = { x: 916, y: 122 };
        /* The camera looks exactly where it projects: its axis runs from the
           body through the middle of the picture, and the beam leaves the lens
           on that same line. */
        var cx = (q[0][0] + q[1][0]) / 2, cy = (q[0][1] + q[3][1] + q[1][1] + q[2][1]) / 4;
        var aim = Math.atan2(cy - body.y, cx - body.x);          /* points left and a little down */
        var lens = { x: body.x + Math.cos(aim) * 27, y: body.y + Math.sin(aim) * 27 };

        g.strokeStyle = '#6d7480'; g.lineWidth = 4;              /* ceiling bracket */
        g.beginPath(); g.moveTo(946, 104); g.lineTo(body.x + 10, body.y - 6); g.stroke();
        g.save(); g.translate(body.x, body.y); g.rotate(aim);
        g.fillStyle = '#d9dee6'; g.fillRect(-20, -9, 40, 18);    /* body, along the axis */
        g.fillStyle = '#2a2d33'; g.fillRect(18, -6, 9, 12);      /* lens barrel, at the front */
        g.fillStyle = Math.floor(st.t * 1.5) % 2 ? '#ff3b30' : '#5a1a16';
        g.beginPath(); g.arc(-13, -4, 2.5, 0, 7); g.fill();      /* recording light */
        g.restore();
        if (!st.egg) return;

        var a = st.egg, flick = ctx.reducedMotion ? 1 : 0.92 + Math.sin(st.t * 37) * 0.05 + Math.sin(st.t * 13) * 0.03;
        g.save();

        /* the beam: a pyramid of light with its tip on the lens and its base on
           the picture's four corners */
        g.globalAlpha = a;
        var beam = g.createLinearGradient(lens.x, lens.y, q[0][0], cy);
        beam.addColorStop(0, 'rgba(169,241,198,.20)'); beam.addColorStop(1, 'rgba(169,241,198,.03)');
        g.fillStyle = beam;
        g.beginPath(); g.moveTo(lens.x, lens.y);
        g.lineTo(q[1][0], q[1][1]); g.lineTo(q[0][0], q[0][1]);
        g.lineTo(q[3][0], q[3][1]); g.lineTo(q[2][0], q[2][1]);
        g.closePath(); g.fill();

        /* light landing on the wall: no outline, just a soft-edged glow */
        g.globalAlpha = a * flick;
        g.shadowColor = 'rgba(169,241,198,.55)'; g.shadowBlur = 22;
        g.fillStyle = 'rgba(169,241,198,.10)';
        g.beginPath(); g.moveTo(q[0][0] + 10, q[0][1] + 10); g.lineTo(q[1][0] - 10, q[1][1] + 10);
        g.lineTo(q[2][0] - 10, q[2][1] - 10); g.lineTo(q[3][0] + 10, q[3][1] - 10); g.closePath(); g.fill();

        /* the words, written in the light: each line runs along its own ray,
           so they fan out toward the far end like the picture does */
        var n = EGG.length, x0 = q[0][0] + 16, wide = q[1][0] - q[0][0] - 32;
        g.fillStyle = '#d2ffe6'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.shadowColor = 'rgba(169,241,198,.9)'; g.shadowBlur = 7;
        g.font = 'bold 13px ' + F;
        for (var k = 0; k < n; k++) {
            var f = (k + 0.75) / (n + 0.5);                       /* 0 at the top edge, 1 at the bottom */
            var yL = q[0][1] + (q[3][1] - q[0][1]) * f, yR = q[1][1] + (q[2][1] - q[1][1]) * f;
            var slope = (yR - yL) / (q[1][0] - q[0][0]);
            g.save();
            g.translate(x0, yL + slope * 16);
            g.transform(1, slope, 0, 1, 0, 0);
            g.fillText(EGG[k], 0, 0, wide);
            g.restore();
        }
        g.restore();
    }

    function drawInes(g, x, y, tool, swing, blink) {
        if (blink) return;
        g.lineCap = 'round';
        g.strokeStyle = '#f3ecd8'; g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x - 7, y + 18); g.lineTo(x - 10, y + 40); g.moveTo(x + 7, y + 18); g.lineTo(x + 10, y + 40);   /* legs */
        g.moveTo(x - 11, y - 12); g.lineTo(x - 22, y + 8);                                                       /* off arm */
        var hx = x + (swing ? 34 : 24), hy = y + (swing ? 2 : -18);
        g.moveTo(x + 11, y - 12); g.lineTo(hx, hy);                                                              /* tool arm */
        g.stroke();
        g.fillStyle = '#3d5a80'; g.fillRect(x - 13, y - 20, 26, 40);
        g.fillStyle = '#b98a5e'; g.beginPath(); g.arc(x, y - 32, 13, 0, 7); g.fill();
        if (tool === 'inked') { g.fillStyle = '#2f7d4f'; g.fillRect(x - 20, y - 4, 9, 9); }                      /* the sleeve */
        if (tool === 'jaws') {
            g.strokeStyle = '#d9dee6'; g.lineWidth = 5;
            var o = swing ? 3 : 9;
            g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 22, hy - o); g.moveTo(hx, hy); g.lineTo(hx + 22, hy + o); g.stroke();
        } else {
            g.fillStyle = '#6b4a2a'; g.fillRect(hx - 5, hy - 16, 10, 14);
            g.fillStyle = tool === 'inked' ? '#2f7d4f' : '#c9b79a'; g.fillRect(hx - 9, hy - 3, 18, 7);
        }
        g.lineCap = 'butt';
    }
})();
