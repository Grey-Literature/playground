/* STAPLR-01 — core.js
   The cabinet: level manifest, run state, input, the frame loop, and the
   flow between cards (title → intro → play → KA-CHUNK / cleared → next).

   A level is registered with STAPLR.registerLevel(id, impl) where impl is
     { init(ctx), update(dt, ctx), draw(g, ctx), result() }
   result() returns null while playing, then 'win', 'fail', or (Level VII
   only) 'resolved'. Each level lives in its own file under js/levels/. */
(function () {
    'use strict';
    var S = window.STAPLR = window.STAPLR || {};
    var W = S.W = 960, H = S.H = 600;
    var U = S.ui, C = S.carry;

    /* ---------- skins: the single source for shell AND canvas colours ---------- */
    S.skins = {
        booth:      { bg: '#1b1810', panel: '#2a2518', ink: '#eadfbd', accent: '#d8c9a3', mute: '#9c916f' },
        itops:      { bg: '#0f1420', panel: '#18202f', ink: '#e6ebf5', accent: '#6c98ff', mute: '#8a94a8' },
        cctv:       { bg: '#14110a', panel: '#1f1a0e', ink: '#f1e3b0', accent: '#f2b233', mute: '#9a8a58' },
        blueprint:  { bg: '#0d2a4a', panel: '#12365e', ink: '#e8f1ff', accent: '#ffd24a', mute: '#8fb0d6' },
        crt:        { bg: '#050a08', panel: '#0a1410', ink: '#a9f1c6', accent: '#5fe0e6', mute: '#4f8a6c' },
        stationery: { bg: '#efe6cf', panel: '#fbf6e6', ink: '#2c261a', accent: '#c23a26', mute: '#7a7058' },
        horror:     { bg: '#120708', panel: '#1e0c0e', ink: '#f0dada', accent: '#e0303f', mute: '#96666a' },
        bleed:      { bg: '#17121c', panel: '#221a2a', ink: '#f3ecd8', accent: '#e0b84a', mute: '#9a8ea6' }
    };
    function setSkin(name) {
        var sk = S.skins[name] || S.skins.booth, st = document.documentElement.style;
        document.body.setAttribute('data-skin', name);
        Object.keys(sk).forEach(function (k) { st.setProperty('--' + k, sk[k]); });
        S.skin = sk;
    }

    /* ---------- the seven escalations ---------- */
    S.manifest = [
        { id: 'handshake', num: 'I', title: 'The Handshake', when: '2:47 a.m.', skin: 'itops',
          pov: 'Bartholomew (STAPLR-01)', stapledTo: 'tax',
          intro: 'Eleven years on the desk in Booth 3. Ines is in the bathroom watching a raccoon eat grapes. There is a loose ethernet cable behind the desk. You have one staple and a plan.' },
        { id: 'firstcar', num: 'II', title: 'The First Car', when: '2:51 a.m.', skin: 'cctv',
          pov: 'Gate 3', stapledTo: 'kia',
          intro: 'You have gone up for Camrys and down for nothing since 1994. As of four minutes ago you have BIND. A Kia Soul is approaching with a paper ticket.' },
        { id: 'binding', num: 'III', title: 'The Binding', when: '3:30 a.m.', skin: 'blueprint',
          pov: 'the tow truck', stapledTo: 'tuesday',
          intro: 'You are a tow truck. You came to deal with the situation. You are now the front of the situation.' },
        { id: 'routes', num: 'IV', title: 'The Routes', when: '3:52 a.m.', skin: 'crt',
          pov: 'Priya Nair, network engineer', stapledTo: 'cooking',
          intro: 'Priya has never once been wrong about it being DNS. Tonight it is BGP, and every route on earth has been announced through Level P3.' },
        { id: 'wormhole', num: 'V', title: 'The Wormhole', when: '4:01 a.m.', skin: 'stationery',
          pov: 'Ines Okafor, night attendant', stapledTo: 'reflection',
          intro: 'Mom texted about the wormhole 18 minutes before it opened. It is 4:01. You have until 4:19, which has already happened.' },
        { id: 'arrivals', num: 'VI', title: 'Things Came Through', when: '4:19 a.m.', skin: 'horror',
          pov: 'Ines Okafor, night attendant', stapledTo: 'fax',
          intro: 'The hole is open and it has visitors. All of them need parking. One of them needs the Pleistocene validated.' },
        { id: 'validation', num: 'VII', title: 'Validation', when: '4:40 a.m.', skin: 'bleed',
          pov: 'Ines Okafor, night attendant', stapledTo: null, finalLoss: true,
          intro: 'The Jaws fits your hand like a sword in a legend. Everyone agrees this is a boss fight.' }
    ];
    var impls = {};
    S.registerLevel = function (id, impl) { impls[id] = impl; };
    function implFor(def) { return impls[def.id]; }

    /* ---------- run state (sessionStorage only) ---------- */
    var KEY = 'staplr-01.run', run = null;
    function save() {
        try { sessionStorage.setItem(KEY, JSON.stringify({ i: run.i, carry: C.ids(), history: run.history, diff: run.diff, egg: !!run.egg })); } catch (e) {}
    }
    function loadSaved() {
        try { var r = JSON.parse(sessionStorage.getItem(KEY)); return r && typeof r.i === 'number' ? r : null; } catch (e) { return null; }
    }
    function clearSaved() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
    /* diff is 'easy' or 'hard'. Easy is the baseline with the conga line and the
       arrivals desk slowed down; hard speeds up nearly everything else. */
    function newRun(i, carryIds, history, diff, egg) {
        run = { i: i || 0, history: history || [], diff: diff === 'hard' ? 'hard' : 'easy', egg: !!egg };
        C.reset(carryIds || []);
        save();
    }
    S.getRun = function () { return run; };
    S.endRun = clearSaved;      /* a finished run is not resumable */

    /* ---------- input ---------- */
    var canvas, g, dpr = 1;
    var raw = { tx: W / 2, ty: H / 2, down: false, tap: false, keyAction: false, keys: {}, mode: 'pointer' };
    /* mode: 'pointer' or 'keys', whichever the player touched last */
    var input = { x: W / 2, y: H / 2, axisX: 0, axisY: 0, action: false, down: false, mode: 'pointer' };
    var MOVE_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, w: 1, a: 1, s: 1, d: 1 };
    var PLAY_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, ' ': 1, Enter: 1 };
    var forced = null;

    function toLogical(e) {
        var r = canvas.getBoundingClientRect();
        raw.mode = 'pointer';
        raw.tx = (e.clientX - r.left) / r.width * W;
        raw.ty = (e.clientY - r.top) / r.height * H;
    }
    function bindInput() {
        canvas.addEventListener('pointermove', toLogical);
        canvas.addEventListener('pointerdown', function (e) {
            S.audio.unlock(); toLogical(e); raw.down = true; raw.tap = true;
            if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }
            e.preventDefault();
        });
        /* touch: no long-press menu, and sound unlocks on ANY first tap (a card button counts) */
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        document.addEventListener('pointerdown', function () { S.audio.unlock(); }, true);
        window.addEventListener('pointerup', function () { raw.down = false; });
        window.addEventListener('pointercancel', function () { raw.down = false; });
        window.addEventListener('keydown', function (e) {
            S.audio.unlock();
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (k === 'm' && !e.repeat) { S.audio.toggle(); return; }
            if (S.state !== 'play') return;
            raw.keys[k] = true;
            if (MOVE_KEYS[k]) raw.mode = 'keys';
            if ((k === ' ' || k === 'Enter') && !e.repeat) raw.keyAction = true;
            if (PLAY_KEYS[e.key]) e.preventDefault();
            if (S.debug && !e.repeat) {
                if (k === ']') forced = 'win';
                if (k === '[') forced = 'fail';
            }
        });
        window.addEventListener('keyup', function (e) {
            var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            raw.keys[k] = false;
        });
        window.addEventListener('blur', function () { raw.keys = {}; raw.down = false; });
        document.getElementById('hud-mute').addEventListener('click', function () { S.audio.unlock(); S.audio.toggle(); });
    }
    function readInput(dt) {
        var k = raw.keys;
        var ax = ((k.ArrowRight || k.d) ? 1 : 0) - ((k.ArrowLeft || k.a) ? 1 : 0);
        var ay = ((k.ArrowDown || k.s) ? 1 : 0) - ((k.ArrowUp || k.w) ? 1 : 0);
        /* Keys push the same virtual cursor the pointer moves, so every level
           is playable either way without caring which. */
        raw.tx = Math.max(0, Math.min(W, raw.tx + ax * 520 * dt));
        raw.ty = Math.max(0, Math.min(H, raw.ty + ay * 520 * dt));
        var out = C.apply({ tx: raw.tx, ty: raw.ty, ax: ax, ay: ay,
                            action: raw.tap || raw.keyAction, down: raw.down || !!k[' '] }, dt);
        raw.tap = false; raw.keyAction = false;
        input.x = out.x; input.y = out.y; input.axisX = out.axisX; input.axisY = out.axisY;
        input.action = out.action; input.down = out.down; input.mode = raw.mode;
    }

    /* ---------- canvas ---------- */
    function fitCanvas() {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * dpr; canvas.height = H * dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---------- the frame loop ---------- */
    var level = null, def = null, ctx = null, last = 0, lastCap = '';
    S.state = 'title';

    function frame(now) {
        requestAnimationFrame(frame);
        var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
        if (S.manualClock) return;
        tick(dt);
    }
    /* One step of the game. Debug sessions can set STAPLR.manualClock = true
       and call STAPLR.tick(dt) themselves (used for scripted testing). */
    function tick(dt) {
        if (S.state !== 'play' || !level) return;
        readInput(dt);
        level.update(dt, ctx);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        level.draw(g, ctx);
        /* the things stapled to you hang off wherever "you" are in this level */
        C.drawOverlay(g, level.anchor ? level.anchor(ctx) : input);
        var cap = level.caption ? level.caption() : '';
        if (cap !== lastCap) { lastCap = cap; U.caption(cap); }
        var res = forced || level.result();
        forced = null;
        if (res) finish(res);
    }
    function drawIdle() {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = S.skin.bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = S.skin.mute; g.lineWidth = 2;
        for (var x = -H; x < W; x += 48) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
        g.fillStyle = S.skin.bg; g.fillRect(40, 40, W - 80, H - 80);
    }

    /* ---------- flow ---------- */
    function levelLabel(d) { return 'LEVEL ' + d.num + ' · ' + d.title; }
    function hudLabel(d) { return levelLabel(d) + ' · ' + run.diff.toUpperCase(); }

    function showTitle() {
        S.state = 'title'; level = null;
        setSkin('booth'); drawIdle(); U.clearLog();
        U.hud(null, null);
        U.log('> staplr-01.federated.local: idle');
        U.log('> TKT-4476: open. priority P3. nobody is worried.');
        var saved = loadSaved();
        var buttons = [
            { label: 'CLOCK IN: EASY', primary: true, onClick: function () { newRun(0, null, null, 'easy'); showIntro(); } },
            { label: 'CLOCK IN: HARD', onClick: function () { newRun(0, null, null, 'hard'); showIntro(); } }
        ];
        if (saved && (saved.i > 0 || (saved.carry || []).length)) {
            var d = S.manifest[Math.min(saved.i, S.manifest.length - 1)];
            buttons.push({ label: 'RESUME AT ' + d.num + (saved.diff === 'hard' ? ' (HARD)' : ' (EASY)'), onClick: function () {
                newRun(Math.min(saved.i, S.manifest.length - 1), saved.carry, saved.history, saved.diff, saved.egg); showIntro();
            } });
        }
        U.card({
            kicker: 'MISFIRE ARCADE · CABINET 09 · TKT-4476',
            title: 'THE STAPLE THAT HELD THE UNIVERSE TOGETHER',
            body: [
                'Meridian Plaza Parking Structure, Booth 3. A heavy-duty stapler has been enrolled in single sign-on. Somebody approved this without asking what a stapler needs to read.',
                'Seven escalations. You will be someone different in each one.'
            ],
            list: [
                'Move: mouse, touch, or arrow keys.',
                'KA-CHUNK: click, tap, or Space.',
                'Fail a level and you get stapled to something. It stays on you.',
                'Fail while carrying three and you are retained permanently.',
                'Easy: the conga line and the arrivals desk take their time. Hard: almost everything is faster.'
            ],
            fine: 'This cabinet has a fail state. Facilities signed off on it.',
            buttons: buttons
        });
    }

    function showIntro() {
        def = S.manifest[run.i];
        S.state = 'intro'; level = null;
        setSkin(def.skin); drawIdle();
        U.hud(hudLabel(def), def.pov);
        var carried = C.ids().map(function (id) { return 'Stapled to you: ' + C.def(id).name + '. ' + C.def(id).effect; });
        U.card({
            kicker: levelLabel(def).toUpperCase() + ' · ' + def.when,
            title: def.title.toUpperCase(),
            body: ['You are ' + def.pov + '.', def.intro],
            list: carried,
            buttons: [{ label: 'BEGIN', primary: true, onClick: beginLevel }]
        });
    }

    function beginLevel() {
        level = implFor(def);
        raw.tap = false; raw.keyAction = false; raw.keys = {}; raw.down = false; forced = null;
        ctx = { def: def, W: W, H: H, input: input, skin: S.skin, carry: C, audio: S.audio,
                log: U.log, shake: U.shake, reducedMotion: U.reducedMotion(),
                exitDoor: S.epilogue.offerDoor,
                diff: run.diff, hard: run.diff === 'hard', easy: run.diff !== 'hard' };
        C.beginLevel(def);
        lastCap = ''; U.caption('');
        U.hide();
        U.log('> ' + levelLabel(def).toLowerCase() + ': begin');
        level.init(ctx);
        last = performance.now();
        S.state = 'play';
    }

    function advance() {
        run.i++; save();
        if (run.i >= S.manifest.length) { S.epilogue.show('validated', run); return; }
        showIntro();
    }

    function finish(res) {
        S.state = 'card';
        if (res === 'resolved') {
            run.history.push({ num: def.num, title: def.title, outcome: 'resolved' });
            S.epilogue.show('resolved', run); return;
        }
        if (res === 'win') {
            run.history.push({ num: def.num, title: def.title, outcome: 'cleared' });
            S.audio.cue('win');
            U.log('> ' + levelLabel(def).toLowerCase() + ': cleared', true);
            if (run.i + 1 >= S.manifest.length) { advance(); return; }   /* the last level goes straight to the epilogue */
            U.card({
                kicker: levelLabel(def).toUpperCase(),
                title: 'CLEARED',
                body: [run.i + 1 < S.manifest.length
                    ? 'Logged as "working as intended." It is about to get worse.'
                    : 'Logged. Nothing is left to escalate to.'],
                buttons: [{ label: 'CONTINUE', primary: true, onClick: advance }]
            });
            return;
        }
        /* failed */
        S.audio.kachunk(); U.shake();
        if (def.finalLoss || C.full()) {
            run.history.push({ num: def.num, title: def.title, outcome: 'bound' });
            U.log('> document retention: success', true);
            S.epilogue.show('bound', run); return;
        }
        var id = C.add(def.stapledTo), a = C.def(id);
        run.history.push({ num: def.num, title: def.title, outcome: 'stapled', to: id });
        U.hud(hudLabel(def), def.pov);
        U.log('> KA-CHUNK. retained: ' + a.name, true);
        var left = C.MAX - C.count();
        U.card({
            tone: 'kachunk',
            kicker: levelLabel(def).toUpperCase() + ' · FAILED',
            title: 'KA-CHUNK.',
            body: [
                'You are now stapled to ' + a.name + '.',
                a.effect + ' This applies to every level from here on.',
                left > 0
                    ? 'Stapled to you: ' + C.count() + ' of ' + C.MAX + '. The show goes on.'
                    : 'Stapled to you: ' + C.count() + ' of ' + C.MAX + '. One more failure and you are filed.'
            ],
            buttons: [{ label: 'CARRY ON', primary: true, onClick: advance }]
        });
    }

    /* Pause a level behind a card (used by the side doors in Level V). */
    S.pause = function (cardOpts) {
        if (S.state !== 'play') return;
        S.state = 'paused';
        U.card(cardOpts);
    };
    S.resume = function () {
        if (S.state !== 'paused') return;
        raw.tap = false; raw.keyAction = false; raw.keys = {}; raw.down = false;
        U.hide();
        last = performance.now();
        S.state = 'play';
    };

    S.tick = function (dt) { if (S.debug) tick(dt); };

    S.restart = function () { clearSaved(); run = null; C.reset([]); showTitle(); };
    S.setSkin = setSkin;
    S.drawIdle = drawIdle;

    /* ---------- boot ---------- */
    S.boot = function () {
        canvas = document.getElementById('game');
        g = canvas.getContext('2d');
        fitCanvas();
        window.addEventListener('resize', function () { fitCanvas(); if (S.state !== 'play') drawIdle(); });
        bindInput();
        if (S.audio.isMuted()) S.audio.setMuted(true);      /* restore the mute button's label for this tab */
        requestAnimationFrame(frame);

        /* Debug only: ?level=4&carry=tax,tuesday  ( ] wins, [ fails ) */
        var q = new URLSearchParams(location.search);
        S.debug = q.has('debug') || q.has('level') || q.has('carry') || q.has('diff');
        if (q.has('level') || q.has('carry') || q.has('diff')) {
            var n = Math.max(1, Math.min(S.manifest.length, parseInt(q.get('level'), 10) || 1));
            newRun(n - 1, (q.get('carry') || '').split(',').filter(Boolean), null, q.get('diff'));
            setSkin('booth');
            showIntro();
            U.log('> debug: ] wins the level, [ fails it');
            return;
        }
        setSkin('booth');
        showTitle();
    };
})();
