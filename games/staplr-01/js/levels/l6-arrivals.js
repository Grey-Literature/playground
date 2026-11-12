/* STAPLR-01 — Level VI: Things Came Through. You are Ines, in the booth.
   The hole is open and it has visitors. Each one wants exactly one of four
   things. Read what is in front of you and pick the right response before
   its patience runs out. Three complaints and you fail.

   Pointer: click a button. Keyboard: Left/Right picks a button, Space confirms.
   ITOps staff phone in throughout. They do not help. The last thing through
   the hole is the Jaws. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';
    var EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

    var MAX_COMPLAINTS = 3, PATIENCE_FIRST = 7.5, PATIENCE_LAST = 4.2, GAP = 0.8;
    var ACTIONS = [
        { id: 'change',     label: 'TAKE EXACT CHANGE' },
        { id: 'validate',   label: 'VALIDATE TICKET' },
        { id: 'directions', label: 'POINT DOWN THE RAMP' },
        { id: 'duck',       label: 'DUCK' }
    ];
    var BTN = { y: 500, h: 66, w: 222, gap: 10, x0: 21 };

    /* The first four arrive in story order; the rest are shuffled. */
    var OPENING = [
        { icon: '🚗', title: '1987 Buick LeSabre', want: 'change',
          clue: 'No driver. The window is down. A hand that is not there holds out four dollars, exactly.',
          ok: 'It pays, and leaves. Nobody was driving it.' },
        { icon: '🦣', title: 'Woolly mammoth', want: 'validate',
          clue: 'A parking ticket is stapled to its tusk: "THE PLEISTOCENE, 2 HRS".',
          ok: 'Validated. The mammoth is good until the Holocene.' },
        { icon: '📠', title: 'A flock of fax machines', want: 'duck', flock: true,
          clue: 'Migrating across the ceiling. Low. Screeching.',
          ok: 'They pass overhead. One of them drops a cover sheet.' },
        { icon: '👨‍⚖️', title: 'Man in a powdered wig', want: 'directions',
          clue: 'He would like to know the way to the Constitutional Convention.',
          ok: 'You point him down the ramp. Because frankly, sure.' }
    ];
    var REST = [
        { icon: '🚙', title: '2017 Kia Soul', want: 'validate',
          clue: 'The ticket is still stapled to the hood. The man in scrubs holds it up through the windshield, hopefully.',
          ok: 'Validated, through the metal. He drives away very fast, again.' },
        { icon: '🛻', title: 'The Pri-150', want: 'change',
          clue: 'Two steering wheels, two drivers, one fare. They have agreed to split it. In coins.',
          ok: 'Exact change, from two wallets. They have exchanged phone numbers.' },
        { icon: '🐦', title: 'The pigeon', want: 'duck',
          clue: 'It is coming straight at your face. It has been coming straight at your face since Tuesday.',
          ok: 'It misses. It will try again next Tuesday, which is also this Tuesday.' },
        { icon: '🚘', title: '"DENTIST THURS"', want: 'directions',
          clue: 'A sedan from the Post-it garage. It is a reminder, and it is lost. It is looking for Thursday.',
          ok: 'Thursday is down the ramp and to the left. Probably.' },
        { icon: '🐴', title: 'A Roman chariot', want: 'change',
          clue: 'The driver counts out four denarii. It is, somehow, the posted rate.',
          ok: 'The drawer accepts denarii. The drawer has seen things tonight.' },
        { icon: '🖇️', title: 'The paperclip attendant', want: 'directions',
          clue: 'Off shift, holding a crossword. "Which way is your break room?"',
          ok: '"Down the ramp. Seven across is STAPLE." "Oh no," he says.' },
        { icon: '🦣', title: 'The same mammoth', want: 'validate',
          clue: 'It has been two hours. It would like to extend.',
          ok: 'Extended. It thanks you in a language with no word for "parking".' },
        { icon: '📠', title: 'One fax machine, lost', want: 'duck',
          clue: 'Separated from the flock. Panicking. At head height.',
          ok: 'It clears you by an inch and rejoins the others.' }
    ];
    var WRONG = {
        change:     'You held out your hand for money. That was not what it wanted.',
        validate:   'You validated it. It did not have a ticket. It is confused and so is the log.',
        directions: 'You pointed down the ramp. It did not want the ramp.',
        duck:       'You ducked. Nothing was coming. It watched you do that.'
    };
    /* Callers are from the ITOps roster (itOps/src/data/seed.js), in voice. */
    var CALLS = [
        [1, 'Dylan Park',  'Have you tried power cycling the universe? I can walk you through it.'],
        [4, 'Marcus Webb', 'Which ticket is this about? I have not read it. I was told there was a ticket.'],
        [6, 'Sam Okafor',  'Ines. It is Sam. Mom says hi. Also: what did you DO.'],
        [9, 'Priya Nair',  'It was not DNS. I checked. It is the gate. I would like that written down.'],
        [11, 'R. Keys',    'Awake 71 hours. If you can see a mammoth, the mammoth is real. Confirm?']
    ];

    var st, PATIENCE_MUL = 1;

    function shuffle(a) {
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function btnX(i) { return BTN.x0 + i * (BTN.w + BTN.gap); }
    function say(msg, bad) { st.msg = msg; st.msgT = 3.2; st.bad = !!bad; }

    function nextArrival(ctx) {
        st.i++;
        if (st.i >= st.queue.length) {
            st.cur = null; st.jaws = 0.001;
            ctx.audio.cue('bad');
            ctx.log('> through the hole: a staple remover. the big chrome kind. the Jaws.', true);
            return;
        }
        var f = st.i / (st.queue.length - 1);
        st.cur = st.queue[st.i];
        st.patienceMax = (PATIENCE_FIRST + (PATIENCE_LAST - PATIENCE_FIRST) * f) * PATIENCE_MUL;
        st.patience = st.patienceMax; st.enter = 0;
        CALLS.forEach(function (c) {
            if (c[0] === st.i) {
                st.call = { who: c[1], text: c[2], t: 5.5 };
                ctx.audio.cue('blip'); ctx.audio.cue('blip');
                ctx.log('> incoming call, ' + c[1] + ': "' + c[2] + '"');
            }
        });
    }

    function respond(id, ctx) {
        if (!st.cur) return;
        if (id === st.cur.want) {
            ctx.audio.cue('good'); say(st.cur.ok); st.served++;
        } else {
            complain(id ? WRONG[id] : 'It waited. You did nothing. It has left a review.', ctx);
        }
        st.cur = null; st.gap = GAP;
    }
    function complain(msg, ctx) {
        st.complaints++; say(msg, true);
        ctx.audio.kachunk(); ctx.shake(); ctx.audio.cue('bad');
        if (st.complaints >= MAX_COMPLAINTS) {
            st.end = { res: 'fail', t: 2.8 };
            say('Three complaints. A fax machine lands on your shoulders and stays there.', true); st.msgT = 9;
            ctx.audio.cue('lose');
        }
    }

    S.registerLevel('arrivals', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            PATIENCE_MUL = ctx.easy ? 1.45 : 0.9;           /* easy: everyone is in less of a hurry */
            st = { t: 0, queue: OPENING.concat(shuffle(REST.slice())), i: -1, cur: null, gap: 1.2, served: 0, complaints: 0,
                   patience: 0, patienceMax: 1, enter: 0, sel: 0, prevAxis: 0, hover: -1, call: null, jaws: 0,
                   msg: 'Read what comes through. Give it the one thing it wants.', msgT: 5, bad: false, end: null, res: null };
            ctx.log('> the hole is open. things are coming out of it. all of them need parking');
        },

        update: function (dt, ctx) {
            var inp = ctx.input, i;
            st.t += dt; st.msgT = Math.max(0, st.msgT - dt);
            if (st.call) { st.call.t -= dt; if (st.call.t <= 0) st.call = null; }
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }

            /* which button is the player on */
            st.hover = -1;
            if (inp.mode === 'keys') {
                var ax = inp.axisX > 0.3 ? 1 : inp.axisX < -0.3 ? -1 : 0;
                if (ax && !st.prevAxis) st.sel = (st.sel + ax + ACTIONS.length) % ACTIONS.length;
                st.prevAxis = ax; st.hover = st.sel;
            } else if (inp.y >= BTN.y - 8 && inp.y <= BTN.y + BTN.h + 8) {
                for (i = 0; i < ACTIONS.length; i++) if (inp.x >= btnX(i) && inp.x <= btnX(i) + BTN.w) st.hover = i;
            }

            if (st.jaws > 0) {                                  /* the last arrival: no clock, one choice */
                st.jaws += dt;
                if (inp.action && st.jaws > 1.2 && (inp.mode === 'keys' || (inp.y >= BTN.y - 8 && inp.y <= BTN.y + BTN.h + 8))) {
                    st.end = { res: 'win', t: 3 };
                    say('It fits your hand like a sword in a legend. Bartholomew, for the first time in eleven years, flinches.'); st.msgT = 9;
                    ctx.audio.kachunk(); ctx.shake();
                    ctx.log('> ines has picked up the Jaws', true);
                }
                return;
            }

            if (!st.cur) {
                st.gap -= dt;
                if (st.gap <= 0) nextArrival(ctx);
                return;
            }
            st.enter = Math.min(1, st.enter + dt * 3);
            st.patience -= dt;
            if (st.patience <= 0) { respond(null, ctx); return; }
            if (inp.action && st.hover >= 0) respond(ACTIONS[st.hover].id, ctx);
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, i;
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);

            /* the hole: perfectly round, like a hole-punch makes, the size of a garage door */
            var hx = 480, hy = 200, hr = 128;
            var halo = g.createRadialGradient(hx, hy, hr * 0.7, hx, hy, hr * 2.4);
            halo.addColorStop(0, 'rgba(224,48,63,.30)'); halo.addColorStop(1, 'rgba(224,48,63,0)');
            g.fillStyle = halo; g.fillRect(0, 0, W, 460);
            g.fillStyle = '#030104'; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill();
            g.fillStyle = '#f0dada';
            for (i = 0; i < 26; i++) {
                var a = i * 2.4, rr = (i * 37 % hr) * 0.9;
                g.globalAlpha = 0.35 + (i % 5) / 8; g.fillRect(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr, 2, 2);
            }
            g.globalAlpha = 1;
            g.strokeStyle = '#e8edf2'; g.lineWidth = 7;         /* the two prongs holding the fold shut */
            g.beginPath(); g.moveTo(hx - hr - 26, hy - 40); g.lineTo(hx - hr - 26, hy + 40);
            g.moveTo(hx + hr + 26, hy - 40); g.lineTo(hx + hr + 26, hy + 40); g.stroke();

            /* whoever is at the window */
            g.textAlign = 'center'; g.textBaseline = 'middle';
            if (st.cur) {
                var e = st.enter, scale = 0.35 + 0.65 * e, y = hy + 10 * e;
                g.globalAlpha = Math.min(1, e * 1.5);
                g.font = Math.round(120 * scale) + 'px ' + EMOJI; g.fillStyle = '#000';
                if (st.cur.flock) {
                    for (i = -1; i <= 1; i++) {
                        g.font = Math.round(74 * scale) + 'px ' + EMOJI;
                        g.fillText(st.cur.icon, hx + i * 96, y - 30 + Math.sin(st.t * 9 + i) * 14);
                    }
                } else {
                    g.fillText(st.cur.icon, hx, y + Math.sin(st.t * 5) * 4);
                }
                g.globalAlpha = 1;
            } else if (st.jaws > 0) {
                drawJaws(g, hx, hy + 6, Math.min(1, st.jaws), st.t);
            }

            /* the desk card: who, and what you can see */
            g.fillStyle = sk.panel; g.fillRect(140, 348, 680, 128);
            g.strokeStyle = sk.accent; g.lineWidth = 2; g.strokeRect(140, 348, 680, 128);
            g.textAlign = 'left'; g.textBaseline = 'top';
            if (st.cur) {
                g.fillStyle = sk.accent; g.font = 'bold 19px ' + F; g.fillText(st.cur.title.toUpperCase(), 158, 360);
                g.fillStyle = sk.ink; g.font = '16px ' + F; wrap(g, st.cur.clue, 158, 390, 644, 21);
                var pf = Math.max(0, st.patience / st.patienceMax);
                g.fillStyle = '#3a1418'; g.fillRect(158, 456, 644, 10);
                g.fillStyle = pf < 0.3 ? '#ff5a5a' : sk.accent; g.fillRect(158, 456, 644 * pf, 10);
            } else if (st.jaws > 0) {
                g.fillStyle = sk.accent; g.font = 'bold 19px ' + F; g.fillText('A STAPLE REMOVER', 158, 360);
                g.fillStyle = sk.ink; g.font = '16px ' + F;
                wrap(g, 'The big chrome kind. The Jaws. It looks around, sees Bartholomew, and hisses.', 158, 390, 644, 21);
            } else if (st.msgT > 0) {
                g.fillStyle = st.bad ? '#ff8a8a' : sk.ink; g.font = '16px ' + F; wrap(g, st.msg, 158, 372, 644, 21);
            }

            /* the buttons */
            g.textAlign = 'center'; g.textBaseline = 'middle';
            if (st.jaws > 0) {
                var ready = st.jaws > 1.2;
                g.fillStyle = ready ? sk.accent : sk.panel; g.fillRect(BTN.x0, BTN.y, W - 2 * BTN.x0, BTN.h);
                g.strokeStyle = sk.accent; g.lineWidth = 3; g.strokeRect(BTN.x0, BTN.y, W - 2 * BTN.x0, BTN.h);
                g.fillStyle = ready ? sk.bg : sk.mute; g.font = 'bold 22px ' + F;
                g.fillText('PICK UP THE JAWS', W / 2, BTN.y + BTN.h / 2);
            } else {
                for (i = 0; i < ACTIONS.length; i++) {
                    var on = st.hover === i && !st.end;
                    g.fillStyle = on ? sk.accent : sk.panel; g.fillRect(btnX(i), BTN.y, BTN.w, BTN.h);
                    g.strokeStyle = on ? sk.ink : sk.mute; g.lineWidth = on ? 3 : 2; g.strokeRect(btnX(i), BTN.y, BTN.w, BTN.h);
                    g.fillStyle = on ? '#120708' : sk.ink; g.font = 'bold 15px ' + F;
                    g.fillText(ACTIONS[i].label, btnX(i) + BTN.w / 2, BTN.y + BTN.h / 2);
                }
            }

            /* cursor (pointer mode) */
            if (ctx.input.mode !== 'keys') {
                g.strokeStyle = sk.ink; g.lineWidth = 2;
                g.beginPath(); g.arc(ctx.input.x, ctx.input.y, 9, 0, 7); g.stroke();
            }

            /* counters */
            g.textAlign = 'left'; g.textBaseline = 'top';
            g.fillStyle = sk.ink; g.font = 'bold 15px ' + F;
            g.fillText('SERVED ' + st.served + '/' + st.queue.length, 20, 58);
            g.fillStyle = st.complaints ? '#ff5a5a' : sk.mute;
            g.fillText('COMPLAINTS ' + st.complaints + '/' + MAX_COMPLAINTS, 20, 80);

            /* the phone */
            if (st.call) {
                g.fillStyle = 'rgba(18,7,8,.94)'; g.fillRect(20, 108, 300, 96);
                g.strokeStyle = sk.mute; g.lineWidth = 2; g.strokeRect(20, 108, 300, 96);
                g.fillStyle = sk.accent; g.font = 'bold 13px ' + F; g.fillText('☎ ' + st.call.who.toUpperCase() + ' · ITOPS', 30, 116);
                g.fillStyle = sk.ink; g.font = '13px ' + F; wrap(g, st.call.text, 30, 138, 280, 17);
            }

            /* outcome line, while the next thing is still on its way out of the hole */
            if (st.msgT > 0 && (st.cur || st.end)) {
                g.font = 'bold 14px ' + F; g.textAlign = 'center';
                var tw = Math.min(W - 60, g.measureText(st.msg).width + 24);
                g.fillStyle = 'rgba(18,7,8,.92)'; g.fillRect(W / 2 - tw / 2, 314, tw, 28);
                g.fillStyle = st.bad ? '#ff8a8a' : sk.ink; g.fillText(st.msg, W / 2, 321, W - 80);
            }
        },

        /* mirrored into the page below the stage on small screens: here it has
           to carry the clue itself, since reading it is the whole level */
        caption: function () {
            if (st.end) return st.msg;
            if (st.cur) return st.cur.title.toUpperCase() + ': ' + st.cur.clue;
            if (st.jaws > 0) return 'A STAPLE REMOVER: the big chrome kind. The Jaws. It sees Bartholomew, and hisses.';
            return st.msgT > 0 ? st.msg : '';
        },

        result: function () { return st.res; }
    });

    function drawJaws(g, x, y, e, t) {
        var open = 0.25 + Math.abs(Math.sin(t * 6)) * 0.35, s = 0.4 + 0.6 * e;
        g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = Math.min(1, e * 2);
        [-1, 1].forEach(function (side) {
            g.save(); g.rotate(side * open);
            g.fillStyle = '#d9dee6'; g.strokeStyle = '#6d7480'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(96, side * -14); g.lineTo(120, side * 4);
            g.lineTo(104, side * 30); g.lineTo(84, side * 12); g.lineTo(0, side * 16); g.closePath(); g.fill(); g.stroke();
            g.restore();
        });
        g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(-10, 0, 24, 0, 7); g.fill();
        g.restore(); g.globalAlpha = 1;
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
