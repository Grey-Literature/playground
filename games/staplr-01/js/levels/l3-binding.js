/* STAPLR-01 — Level III: The Binding. You are the tow truck.
   You came to deal with the situation. You are now the front of it: a conga
   line circling Level 2 at exactly 5 mph. Every car the gate drops in the
   lane gets stapled on behind you. Reach nine vehicles without hitting a
   wall, a pillar, or your own conga line.

   Steering: arrow keys / WASD, or point (or touch) where you want to head. */
(function () {
    'use strict';
    var S = window.STAPLR, W = S.W, H = S.H;
    var F = 'ui-monospace, Consolas, monospace';

    var CELL = 40, COLS = 24, ROWS = 15, GOAL = 9;
    var PILLARS = [[6, 4], [6, 10], [12, 7], [17, 4], [17, 10]];
    var CARS = [
        { name: 'Prius',        color: '#d6dfe2', line: 'a Prius. it had opinions about the lane.' },
        { name: 'F-150',        color: '#a8402e', line: 'an F-150. it is a Pri-150 now. two steering wheels, one destiny.' },
        { name: 'Vespa',        color: '#7fd1c4', line: 'a Vespa.' },
        { name: 'Volvo',        color: '#5a86c8', line: 'a Volvo. the Vespa is a Volvo problem now.' },
        { name: 'Tesla',        color: '#e8e8ee', line: 'a Tesla.' },
        { name: 'mirror-Tesla', color: '#9aa7ff', line: "the Tesla's reflection, from a puddle. it came along." },
        { name: 'Camry',        color: '#b7b2a4', line: 'a Camry. it had been going home.' },
        { name: 'Civic',        color: '#86b35c', line: 'a Civic. that is nine. the line is complete.' }
    ];
    /* An original, slightly-wrong little jingle. One note per car collected. */
    var HONK = [311, 233, 415, 349, 277, 466, 392, 311];

    var st, SLOW = 1;

    function blocked(x, y) {
        if (x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2) return true;
        for (var i = 0; i < PILLARS.length; i++) if (PILLARS[i][0] === x && PILLARS[i][1] === y) return true;
        return false;
    }
    function onSnake(x, y) {
        for (var i = 0; i < st.snake.length; i++) if (st.snake[i].x === x && st.snake[i].y === y) return true;
        return false;
    }
    function dropCar() {
        var head = st.snake[0], x, y, tries = 0;
        do {
            x = 2 + Math.floor(Math.random() * (COLS - 4));
            y = 2 + Math.floor(Math.random() * (ROWS - 4));
            tries++;
            /* never under the bottom-right corner, where a tax return may be */
            var corner = x >= 17 && y >= 10;
            var ok = !blocked(x, y) && !onSnake(x, y) && !corner &&
                     Math.abs(x - head.x) + Math.abs(y - head.y) >= 4;
        } while (!ok && tries < 200);
        st.car = { x: x, y: y, born: st.t };
    }

    S.registerLevel('binding', {
        init: function (ctx) {
            if (S.debug) S.peek = function () { return st; };
            SLOW = ctx.easy ? 1.5 : 1;                      /* easy: the conga line takes its time */
            st = { t: 0, tick: 0, ready: 1.4, snake: [{ x: 5, y: 7 }], dir: { x: 1, y: 0 }, want: null,
                   grow: 0, got: 0, car: null, flash: 0, msg: 'Steer with arrows, or point where you want to go.', msgT: 6,
                   end: null, res: null };
            dropCar();
            ctx.log('> tow truck dispatched to Level 2. estimated resolution: soon');
        },

        update: function (dt, ctx) {
            var inp = ctx.input, head = st.snake[0];
            st.t += dt; st.flash = Math.max(0, st.flash - dt); st.msgT = Math.max(0, st.msgT - dt);
            if (st.end) { st.end.t -= dt; if (st.end.t <= 0) st.res = st.end.res; return; }

            /* steering intent */
            var want = null;
            if (inp.mode === 'keys') {
                if (Math.abs(inp.axisX) > 0.3) want = { x: inp.axisX > 0 ? 1 : -1, y: 0 };
                else if (Math.abs(inp.axisY) > 0.3) want = { x: 0, y: inp.axisY > 0 ? 1 : -1 };
            } else {
                var dx = inp.x - (head.x + 0.5) * CELL, dy = inp.y - (head.y + 0.5) * CELL;
                var horiz = { x: dx > 0 ? 1 : -1, y: 0 }, vert = { x: 0, y: dy > 0 ? 1 : -1 };
                if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
                    want = Math.abs(dx) >= Math.abs(dy) ? horiz : vert;
                    /* cannot reverse: take the other axis instead, if it means anything */
                    if (want.x === -st.dir.x && want.y === -st.dir.y) {
                        want = want === horiz ? (Math.abs(dy) > 12 ? vert : null) : (Math.abs(dx) > 12 ? horiz : null);
                    }
                }
            }
            if (want && !(want.x === -st.dir.x && want.y === -st.dir.y)) st.want = want;

            if (st.ready > 0) { st.ready -= dt; return; }

            st.tick -= dt;
            if (st.tick > 0) return;
            st.tick = Math.max(0.115, 0.185 - st.snake.length * 0.007) * SLOW;

            if (st.want) { st.dir = st.want; st.want = null; }
            var nx = head.x + st.dir.x, ny = head.y + st.dir.y;
            var tail = st.snake[st.snake.length - 1];
            var hitSelf = onSnake(nx, ny) && !(st.grow === 0 && tail.x === nx && tail.y === ny);
            if (blocked(nx, ny) || hitSelf) {
                st.end = { res: 'fail', t: 2.4 };
                st.msg = hitSelf ? 'You have rear-ended yourself. The conga line folds.'
                                 : 'The conga line meets concrete. It is Tuesday. It will be Tuesday.';
                st.msgT = 9;
                ctx.audio.kachunk(); ctx.shake(); ctx.audio.cue('lose');
                return;
            }
            st.snake.unshift({ x: nx, y: ny });
            var popped = null;
            if (st.grow > 0) st.grow--; else popped = st.snake.pop();

            if (st.car && st.car.x === nx && st.car.y === ny) {
                var c = CARS[st.got];
                st.got++; st.grow++; st.flash = 0.3;
                ctx.audio.kachunk(); ctx.shake();
                ctx.audio.note(HONK[(st.got - 1) % HONK.length], 0.22);
                ctx.log('> KA-CHUNK. conga +1: ' + c.line, st.got === CARS.length);
                st.msg = 'Stapled on: ' + c.name + '.'; st.msgT = 2.5;
                if (st.got + 1 >= GOAL) {
                    st.car = null;
                    if (popped) st.snake.push(popped);       /* show all nine at the finish */
                    st.end = { res: 'win', t: 2.6 };
                    st.msg = 'Nine vehicles. One line. Circling Level 2 at 5 mph, honking.'; st.msgT = 9;
                    HONK.forEach(function (f, i) { setTimeout(function () { ctx.audio.note(f, 0.2); }, 180 * i); });
                } else {
                    dropCar();
                }
            }
        },

        draw: function (g, ctx) {
            var sk = ctx.skin, i, x, y;
            g.fillStyle = sk.bg; g.fillRect(0, 0, W, H);

            /* blueprint grid + parking stalls */
            g.strokeStyle = 'rgba(143,176,214,.16)'; g.lineWidth = 1;
            for (x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * CELL, 0); g.lineTo(x * CELL, H); g.stroke(); }
            for (y = 0; y <= ROWS; y++) { g.beginPath(); g.moveTo(0, y * CELL); g.lineTo(W, y * CELL); g.stroke(); }
            g.strokeStyle = sk.ink; g.lineWidth = 3;
            g.strokeRect(CELL - 2, CELL - 2, W - 2 * CELL + 4, H - 2 * CELL + 4);
            g.fillStyle = 'rgba(232,241,255,.08)';
            PILLARS.forEach(function (p) {
                g.fillStyle = sk.panel; g.fillRect(p[0] * CELL + 3, p[1] * CELL + 3, CELL - 6, CELL - 6);
                g.strokeStyle = sk.ink; g.lineWidth = 2; g.strokeRect(p[0] * CELL + 3, p[1] * CELL + 3, CELL - 6, CELL - 6);
                g.beginPath(); g.moveTo(p[0] * CELL + 3, p[1] * CELL + 3); g.lineTo((p[0] + 1) * CELL - 3, (p[1] + 1) * CELL - 3); g.stroke();
            });

            /* the car the gate just dropped */
            if (st.car) {
                var pulse = 1 + Math.sin((st.t - st.car.born) * 7) * 0.08, cc = CARS[st.got];
                drawCar(g, st.car.x, st.car.y, cc.color, pulse);
                g.fillStyle = sk.accent; g.font = 'bold 12px ' + F; g.textAlign = 'center'; g.textBaseline = 'bottom';
                g.fillText(cc.name.toUpperCase(), (st.car.x + 0.5) * CELL, st.car.y * CELL - 2);
            }

            /* the conga line, tail first so the truck is on top */
            for (i = st.snake.length - 1; i >= 0; i--) {
                var s = st.snake[i];
                if (i > 0) {
                    var p2 = st.snake[i - 1];                                      /* the staple holding it on */
                    g.strokeStyle = '#e8edf2'; g.lineWidth = 4;
                    g.beginPath();
                    g.moveTo((s.x + 0.5) * CELL, (s.y + 0.5) * CELL); g.lineTo((p2.x + 0.5) * CELL, (p2.y + 0.5) * CELL);
                    g.stroke();
                    drawCar(g, s.x, s.y, CARS[Math.min(i - 1, CARS.length - 1)].color, 1);
                } else {
                    drawTruck(g, s.x, s.y, st.dir, st.flash > 0);
                }
            }

            /* pointer steering reticle */
            if (ctx.input.mode !== 'keys' && !st.end) {
                g.strokeStyle = sk.accent; g.lineWidth = 2;
                g.beginPath(); g.arc(ctx.input.x, ctx.input.y, 10, 0, 7);
                g.moveTo(ctx.input.x - 16, ctx.input.y); g.lineTo(ctx.input.x + 16, ctx.input.y);
                g.moveTo(ctx.input.x, ctx.input.y - 16); g.lineTo(ctx.input.x, ctx.input.y + 16); g.stroke();
            }

            g.textAlign = 'left'; g.textBaseline = 'middle';
            g.fillStyle = sk.ink; g.font = 'bold 15px ' + F;
            g.fillText('CONGA ' + (st.got + 1) + '/' + GOAL + ' · 5 MPH', 12, 20);
            if (st.ready > 0) {
                g.textAlign = 'center'; g.font = 'bold 30px ' + F; g.fillStyle = sk.accent;
                g.fillText('DISPATCHED', W / 2, H / 2 - 60);
            }
            if (st.msgT > 0) {
                g.textAlign = 'left'; g.font = 'bold 15px ' + F;
                var w = Math.min(W - 420, g.measureText(st.msg).width + 24);
                g.fillStyle = 'rgba(6,20,38,.85)'; g.fillRect(8, H - 34, w + 8, 28);
                g.fillStyle = st.end && st.end.res === 'fail' ? '#ff8a6b' : sk.ink;
                g.fillText(st.msg, 18, H - 20, W - 440);
            }
        },

        /* where the things stapled to you hang from */
        anchor: function (ctx) { var s = st.snake[st.snake.length - 1]; return { x: (s.x + 0.5) * CELL, y: (s.y + 0.5) * CELL }; },

        /* mirrored into the page below the stage on small screens */
        caption: function () { return st.msgT > 0 || st.end ? st.msg : ''; },

        result: function () { return st.res; }
    });

    function drawCar(g, cx, cy, color, scale) {
        var x = cx * CELL, y = cy * CELL, m = (CELL - (CELL - 10) * scale) / 2, s = CELL - 2 * m;
        g.fillStyle = color; g.fillRect(x + m, y + m, s, s);
        g.fillStyle = 'rgba(13,42,74,.55)'; g.fillRect(x + m + 6, y + m + 6, s - 12, s - 12);
        g.strokeStyle = '#0d2a4a'; g.lineWidth = 1.5; g.strokeRect(x + m, y + m, s, s);
    }
    function drawTruck(g, cx, cy, dir, flash) {
        var x = cx * CELL, y = cy * CELL;
        g.fillStyle = flash ? '#fff7c2' : '#ffd24a'; g.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        g.strokeStyle = '#0d2a4a'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
        /* cab at the front, amber light on top */
        var fx = x + CELL / 2 + dir.x * 10, fy = y + CELL / 2 + dir.y * 10;
        g.fillStyle = '#0d2a4a'; g.fillRect(fx - 7, fy - 7, 14, 14);
        g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(x + CELL / 2 - dir.x * 8, y + CELL / 2 - dir.y * 8, 4, 0, 7); g.fill();
    }
})();
