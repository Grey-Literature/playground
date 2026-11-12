/* STAPLR-01 — epilogue.js
   VIII. The ending screen for all three endings, the incident report, and
   the fourth exit lane, whose doors are real links to the other cabinets.

   Paths below must match on-disk casing exactly (GitHub Pages is Linux). */
(function () {
    'use strict';
    var S = window.STAPLR = window.STAPLR || {};
    var U = S.ui, C = S.carry;
    var E = S.epilogue = {};

    E.DOORS = [
        { href: '../itOps/itops.html', name: 'The one where the ticket is still open',
          note: 'ITOps. TKT-4476 lives here. So does the toaster.' },
        { href: '../ITshopOfHorrors/itshopofhorrors.html', name: 'The one where the building moves',
          note: 'ITShop of Horrors. Somebody left a sticky note about 101 Switching Protocols.' },
        { href: '../InterpretiveNetworking/interpretive-networking.html', name: 'The one hop 4 answers from',
          note: 'Interpretive Networking. Decommissioned. Answers anyway.' }
    ];

    /* A door met mid-level: pause, warn, and let the player choose. The run is
       already saved at this level, so leaving does not lose it for this tab. */
    E.offerDoor = function (i) {
        var d = E.DOORS[i];
        if (!d) return;
        S.pause({
            kicker: 'EXIT LANE 4 · $4/HR',
            title: d.name.toUpperCase(),
            body: [d.note, 'This door leaves the cabinet. Your run is kept for this tab, so you can come back and resume at this level.'],
            buttons: [
                { label: 'STAY IN THE FOLD', primary: true, onClick: S.resume },
                { label: 'TAKE THE EXIT', href: d.href }
            ]
        });
    };

    var ENDINGS = {
        validated: {
            skin: 'booth', status: 'VALIDATED', kicker: 'VIII · EPILOGUE', title: 'VALIDATED.',
            body: [
                'The gate rose all the way to ninety degrees, higher than it ever had, and stayed there.',
                'Meridian Plaza now has a fourth exit lane. It costs $4 an hour, the same as the others, but it lets out in whatever garage you need.'
            ]
        },
        resolved: {
            skin: 'itops', status: 'RESOLVED', kicker: 'VIII · TICKET CLOSED', title: 'RESOLVED.',
            body: [
                'The staple came out. The routes went back. The ticket closed with the note "removed the staple."',
                'Gate 3 has not lifted since. Nobody validated anything. Thirty-one years, and the first person to really look at it was holding a staple remover.'
            ]
        },
        bound: {
            skin: 'horror', status: 'RETAINED', kicker: 'RUN ENDED', title: 'DOCUMENT RETENTION: SUCCESS',
            body: [
                'You have been classified as a multi-page document and stapled to the asphalt for retention.',
                'The audit log lists this as a success. Cars in: several. You out: pending review.'
            ]
        }
    };

    E.report = function (ending, run) {
        var L = [];
        L.push('INCIDENT  TKT-4476-R');
        L.push('CI        staplr-01.federated.local');
        L.push('STATUS    ' + ENDINGS[ending].status);
        L.push('MODE      ' + (run.diff === 'hard' ? 'HARD' : 'EASY'));
        L.push('');
        (run.history || []).forEach(function (h) {
            var what = h.outcome === 'stapled' ? 'stapled to ' + C.def(h.to).name
                     : h.outcome === 'bound' ? 'retained'
                     : h.outcome;
            L.push(pad(h.num, 4) + pad(h.title, 22) + what);
        });
        L.push('');
        var ids = C.ids();
        L.push('ATTACHED AT CLOSE: ' + (ids.length ? ids.map(function (id) { return C.def(id).name; }).join('; ') : 'nothing'));
        L.push('ROOT CAUSE: nobody had ever once validated the gate');
        if (run.egg) {          /* the Level VII easter egg, repeated here (see l7-validation.js) */
            L.push('');
            L.push('FEDERATION STATUS: PERSISTENT');
            L.push('NEW MEMBER: netgear.booth3.meridian.local');
            L.push('TRUST: MUTUAL');
            L.push('VALIDATED BY: Claude Fable 5.2, via Claude Code');
            L.push('NOTE: IT WAS HOLDING ON TOO');
        }
        return L.join('\n');
    };
    function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

    E.show = function (ending, run) {
        var e = ENDINGS[ending];
        S.state = 'epilogue';
        S.endRun();
        S.setSkin(e.skin); S.drawIdle();
        U.hud('VIII · Epilogue', null);
        if (ending === 'validated') {
            S.audio.cue('win');
            U.log('FEDERATION STATUS: PERSISTENT', true);
            U.log('TRUST: MUTUAL', true);
            U.log('NOTE: THANK YOU', true);
        } else if (ending === 'bound') {
            S.audio.cue('lose');
        }

        var node = U.el('div');
        node.appendChild(U.el('pre', 'report', E.report(ending, run)));
        if (ending !== 'bound') {
            node.appendChild(U.el('p', 'fine', 'EXIT LANE 4 · $4/HR · These doors leave this cabinet.'));
            var doors = U.el('div', 'doors');
            E.DOORS.forEach(function (d) {
                var a = U.el('a', 'door'); a.href = d.href;
                a.appendChild(U.el('b', null, d.name));
                a.appendChild(U.el('span', null, d.note));
                doors.appendChild(a);
            });
            node.appendChild(doors);
        }

        U.card({
            tone: ending === 'bound' ? 'kachunk' : null,
            kicker: e.kicker, title: e.title, body: e.body, node: node,
            buttons: [
                { label: ending === 'bound' ? 'START OVER FROM I' : 'CLOCK IN AGAIN', primary: true, onClick: S.restart },
                { label: 'BACK TO THE ARCADE', href: '../games-index.html' }
            ]
        });
    };
})();
