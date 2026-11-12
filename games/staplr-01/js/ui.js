/* STAPLR-01 — ui.js
   DOM side of the cabinet: overlay cards, the HUD, the federation log, and
   all sound (synthesised; there are no audio files in this game). */
(function () {
    'use strict';
    var S = window.STAPLR = window.STAPLR || {};
    var U = S.ui = {};
    var $ = function (id) { return document.getElementById(id); };

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }
    U.el = el;

    /* opts: { kicker, title, body: [strings], list: [strings], node, fine,
               tone: 'kachunk', buttons: [{ label, primary, onClick, href }] } */
    U.card = function (opts) {
        var card = $('card');
        card.className = 'card' + (opts.tone ? ' ' + opts.tone : '');
        card.textContent = '';
        if (opts.kicker) card.appendChild(el('p', 'card-kicker', opts.kicker));
        var h = el('h1', 'card-title', opts.title); h.id = 'card-title';
        card.appendChild(h);
        (opts.body || []).forEach(function (p) { card.appendChild(el('p', null, p)); });
        if (opts.list && opts.list.length) {
            var ul = el('ul');
            opts.list.forEach(function (li) { ul.appendChild(el('li', null, li)); });
            card.appendChild(ul);
        }
        if (opts.node) card.appendChild(opts.node);
        if (opts.fine) card.appendChild(el('p', 'fine', opts.fine));
        var actions = el('div', 'card-actions'), first = null;
        (opts.buttons || []).forEach(function (b) {
            var btn = b.href ? el('a', 'btn', b.label) : el('button', 'btn', b.label);
            if (b.href) btn.href = b.href; else btn.type = 'button';
            if (b.primary) { btn.className += ' primary'; first = first || btn; }
            if (b.onClick) btn.addEventListener('click', b.onClick);
            actions.appendChild(btn);
        });
        card.appendChild(actions);
        $('overlay').hidden = false;
        $('overlay').scrollTop = 0;
        if (first) first.focus({ preventScroll: true });
    };
    U.hide = function () { $('overlay').hidden = true; $('game').focus(); };
    U.cardOpen = function () { return !$('overlay').hidden; };

    U.hud = function (levelText, pov) {
        $('hud-level').textContent = levelText || 'Booth 3 · Level P3';
        var p = $('hud-pov'); p.textContent = '';
        if (pov) { p.appendChild(document.createTextNode('YOU ARE: ')); p.appendChild(el('b', null, pov)); }
        var c = $('hud-carry'); c.textContent = '';
        var ids = S.carry.ids();
        c.appendChild(el('span', null, 'STAPLED TO YOU ' + ids.length + '/' + S.carry.MAX));
        ids.forEach(function (id) {
            var chip = el('span', 'chip', S.carry.def(id).chip);
            chip.title = S.carry.def(id).effect;
            c.appendChild(chip);
        });
    };

    /* The federation log: the monospace readout under the stage. */
    var lines = [];
    U.log = function (text, hot) {
        lines.push({ text: text, hot: !!hot });
        if (lines.length > 6) lines = lines.slice(-6);
        var box = $('fedlog'); box.textContent = '';
        lines.forEach(function (l) {
            var s = el('span', l.hot ? 'hot' : null, l.text + '\n');
            box.appendChild(s);
        });
    };
    U.clearLog = function () { lines = []; $('fedlog').textContent = ''; };

    /* The current level message, as page text. Only shown on small screens,
       where the same words drawn inside the canvas are too small to read. */
    U.caption = function (text) { $('caption').textContent = text || ''; };

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    U.reducedMotion = function () { return reduced; };
    U.shake = function () {
        if (reduced) return;
        var st = $('stage');
        st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
    };

    /* ---------- audio ---------- */
    var A = S.audio = {}, ac = null, master = null, muted = false;
    A.unlock = function () {
        if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            ac = new AC();
            master = ac.createGain(); master.gain.value = muted ? 0 : 0.5;
            /* a limiter, so stacked KA-CHUNKs do not clip */
            var comp = ac.createDynamicsCompressor();
            comp.threshold.value = -14; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.12;
            master.connect(comp); comp.connect(ac.destination);
        } catch (e) { ac = null; }
    };
    A.setMuted = function (m) {
        muted = m;
        if (master) master.gain.value = m ? 0 : 0.5;
        var b = $('hud-mute');
        b.textContent = m ? 'SOUND OFF' : 'SOUND ON';
        b.setAttribute('aria-pressed', m ? 'true' : 'false');
        try { sessionStorage.setItem('staplr-01.muted', m ? '1' : '0'); } catch (e) {}
    };
    try { if (sessionStorage.getItem('staplr-01.muted') === '1') muted = true; } catch (e) {}
    A.isMuted = function () { return muted; };
    A.toggle = function () { A.setMuted(!muted); };

    function tone(type, f0, f1, dur, vol, when) {
        if (!ac) return;
        var t0 = ac.currentTime + (when || 0);
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t0);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noise(dur, vol, freq, q) {
        if (!ac) return;
        var n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        var src = ac.createBufferSource(); src.buffer = b;
        var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
        var g = ac.createGain(); g.gain.value = vol;
        src.connect(f); f.connect(g); g.connect(master); src.start();
    }

    /* The one sound every level shares. Never muted by the fax machine. */
    A.kachunk = function () {
        noise(0.07, 0.9, 2400, 0.8);
        tone('sine', 110, 38, 0.18, 0.9);
        tone('square', 900, 300, 0.04, 0.15, 0.05);
    };
    A.screech = function () {
        tone('sawtooth', 1900, 2600, 0.5, 0.12);
        tone('square', 1300, 2100, 0.5, 0.06, 0.05);
        noise(0.5, 0.15, 3000, 4);
    };
    /* Gameplay cues: these are what the fax machine takes away. */
    var CUES = {
        blip: function () { tone('square', 660, 660, 0.06, 0.2); },
        good: function () { tone('triangle', 520, 520, 0.09, 0.3); tone('triangle', 780, 780, 0.14, 0.3, 0.09); },
        bad:  function () { tone('sawtooth', 200, 90, 0.28, 0.3); },
        tick: function () { tone('square', 1000, 1000, 0.02, 0.12); },
        win:  function () { [392, 494, 587, 784].forEach(function (f, i) { tone('triangle', f, f, 0.16, 0.3, i * 0.1); }); },
        lose: function () { [330, 262, 196, 131].forEach(function (f, i) { tone('sawtooth', f, f * 0.94, 0.22, 0.25, i * 0.14); }); }
    };
    /* A single pitched note, for levels with their own tunes. Also a cue. */
    A.note = function (freq, dur) {
        if (S.carry.deaf && S.carry.deaf() && S.state === 'play') return;
        tone('square', freq, freq, dur || 0.18, 0.18);
    };
    A.cue = function (name) {
        if (S.carry.deaf && S.carry.deaf() && S.state === 'play') return;
        if (CUES[name]) CUES[name]();
    };
})();
