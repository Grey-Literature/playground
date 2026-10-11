# Handoff: Galley / Mess (room 4), for Codex

You are building one room of an existing browser game, Catbot, for the Jamference AI Game Jam. Hard deadline 2026-10-09 07:00, judged equally on Fun, AI Use and Polish. Three rooms exist (Aft Hold, Engine Bay, Berthing); this is the fourth. Tasha is not available to steer. **Run start to finish without waiting for approval.** Your feedback loop is the bot test in step 1, not a person. Stop only for the three conditions at the bottom.

`CLAUDE.md` is not loaded automatically for you. Read it first. If `AGENTS.md` exists at the repo root, you will have it already: follow its easter-egg and model-identity rules and do not remove the existing eggs.

## Read first, in this order

1. `CLAUDE.md`: **Game structure**, **The hub**, **The engine bay**, **Berthing**, **Audio**, **Open questions**.
2. `berthing.js`: the most recent room, and the pattern to copy. Its rules live in one pure function (`stepWorld`) that both the live game and the bot (`simulate`) call, so the bot plays the real rules. Do the same.
3. `engine.js`: how a room module hooks in (an IIFE reading the game's globals, a no-op stub in `index.html`, one commented hook line per `ENG.`/`BERTH.` site).
4. `index.html`: `ROOMS[]`, the crate/plate/gate code of room 1 (search `crate`, `plate`, `gate`, `push`), `floorSlip` (lines near 89, 239, 273 and the `ice` loop near 706), `control()`, `cartFree()`, `drawRoom()`. Everything you need for pushing, slipping and ice sound already exists in some form: reuse it before inventing anything.
5. `hub.js`: the `galley` slot only. It is already `needs:['engine']`, hint "Slidey trays. Something green.", and has a floor glyph (trays, one cucumber). Match both.
6. `audio.js`: header comment, `SOUNDS` entries such as `vent`, `venthit`, `beamSpot`, and the `ice` and push-strain loops.

## Hard rules

- **Movement is the only verb.** No action, jump or interact input, no new keys. Context comes from where catbot is and how fast it is moving. Catbot has exactly two gaits that matter: walk (105 px/s) and trot (165 px/s, after holding a direction 1.6 s or double-tapping). That is your only control over force.
- Plain HTML/JS, no build step, no libraries, no external assets. Art is drawn in canvas, audio is synthesized.
- **Failure is soft.** A hop, a pose, a slide. Never a reset, a counter or a rewind. Nothing may leave the room unwinnable without the REWIND tile, and the bot must prove it (step 1).
- The room must be playable and readable with sound muted and with `settings.calm` (STEADY) on. Every sound has a visual twin.
- **Files you may change:** a new `galley.js`; `index.html` (hook lines, and the three `floorSlip` reads if you need them per span; at most about 40 added lines in total); `hub.js` (the galley slot's text only, if needed); `audio.js` (new `SOUNDS` entries only); `CLAUDE.md` (docs, the disclosure log). **Do not touch** `catbot.js`, `opening.js`, `engine.js`, `berthing.js`, or any existing function body in `audio.js` or `hub.js`.
- Sign the header of `galley.js` with the exact model identity your harness reports (do not guess a name), and add a line to the AI-use disclosure log in `CLAUDE.md`.

## The room: momentum and weight

Berthing was about stillness, Engine Bay about timing. The Galley is about **mass and slide**: things have weight, the floor is greasy, and you only get two strengths of push. It is a one-level room (no platforms), about 2800 px wide, three beats, then the part and the hatch.

### Mechanics

- **Slick strips and grip mats.** The floor is a mix: bare grippy deck, slick strips (spilled something, `floorSlip` about 0.75 to 0.9) and rubber mats (grip, `floorSlip` 0). `floorSlip` is a room scalar today; drive it per span from your module (a `slick:[{x,w,slip}]` field and a function giving the slip at catbot's x) so the existing feet-slide, accel cap, `ice` hiss and ice particles all work unchanged. Catbot cannot stop on a dime on a slick strip: that is the feel. Trolley and floor pads need standing still, so keep slick spans and tray lanes out of reach of the trolley (`room.noCart`).
- **Trays are heavy things you push.** `trays:[{x,w,mass}]`. Walking into one pushes it; catbot's speed at contact sets the tray's launch speed (walk gives a short slide, trot a long one), and then the tray slides under its own friction for whatever floor it is on (slick: far; grip: stops fast; mat: stops dead). Show the weight: use the existing push-strain pose and sound from room 1's crate, scaled by `mass`, and a clatter on contact. A tray blocks catbot like the crate does, so you can only push it away from you. **Every lane must end in a bounce wall (a rubber bumper) so a tray that goes too far comes back to you.** That is what keeps the room recoverable.
- **Plates are grip mats you rest a tray on.** A plate is a rubber mat patch in a slick lane. A tray crossing it slows and stops on it only if it arrives slowly enough (too fast and it slides off the far side to the bumper and comes back). A tray resting on a plate for 0.8 s lights it; all required plates lit open the gate (a serving hatch lid) in front of the part. Reuse room 1's plate and gate fields and drawing if they fit.
- **The grill.** One span of hot grill (heat shimmer, amber glow, sizzle) at the end of the first slick strip. Sliding into it shoves catbot back with a hop and the `oops` pose, as a jet does in the engine bay. No reset. It exists so that overshooting yourself on a slick strip costs something small. Calm mode reduces the shimmer, not the shove.
- **The cucumber.** Exactly one, lying on a slick strip, drawn properly (green, a highlight, a stem end). The first time catbot comes within 260 px facing it, catbot startles: ears flat, a full hop straight back, `oops`, and, because it lands on a slick strip, it slides on. That is the loss-of-control joke, and it is also physics: the hop's landing speed feeds the real slide. After that it is an ordinary cucumber and catbot can walk past it warily (a slower, stiffer gait is welcome if the rig supports it cheaply; otherwise skip). The cucumber is an obstacle: it rolls slowly when a tray hits it, which can unstick a tray or block a lane.

### Layout, three beats (tune the numbers with the bot)

1. **Teach the push (grip floor).** One tray, one plate 300 to 450 px away on grip floor. Walk-push and trot-push give visibly different slides. A caption teaches it once, dry ("Heavy. It has opinions." or similar).
2. **Teach the slick (slick strip, grill at the end).** A slick strip with the second tray and a plate mat in the middle of it. You push from the grip floor at its start, so the tray enters the slick at a speed you chose. Catbot following the tray onto the slick slides and has to be careful of the grill. The bumper returns an overshot tray.
3. **The cucumber and the combination.** A longer slick lane with two plates, the cucumber at one end, and two trays. You need both plates lit. The cucumber startle can launch catbot into the lane at a bad moment; the first time it is a surprise, and the second it is a thing you plan around.

Then the gate opens, the part (a **mixer gear**, a stand mixer's planetary gear, `part:{id:'galley',name:'MIXER GEAR'}`) sits on the serving hatch's shelf, then the exit hatch. A careful run should take 60 to 120 seconds with no REWIND.

### Look and sound

- Look: a steel-and-tile galley, warm light, steam rising from a pot, hanging ladles swaying a little, a pass-through window. Cheap and readable: no per-frame blur or `ctx.filter` on large areas. If you add depth, bake layers offscreen as `engine.js` does.
- Sound, added with each mechanic (see **Audio** in `CLAUDE.md`): tray scrape that tracks speed (a loop, like `ice`), clatter on contact and on the bumper (with a 150 to 400 Hz body so it survives laptop and phone speakers), plate "chunk" and lamp when lit, gate rising, grill sizzle bed that swells as you near it, cucumber startle sting (short, comic), part install reuses `socket`. Measure the new heavy sounds as `CLAUDE.md` describes (share of energy above 150 Hz, peak) and report the numbers.

### Hooks and dev entries

Follow the engine/berthing pattern: a no-op `window.GAL` stub in `index.html` (replaced when `galley.js` loads, after `berthing.js`), plus one commented hook line beside the `BERTH.` line at each site you need (reset, update, audio, deck draw, front draw, and whatever the slip read needs). The module guards itself (`mine()` checks the room's own field, not the mode) and is a no-op in every other room. Dev entries: `index.html#room=galley` (assumes hip and engine installed; `&parts=` to change; `&test` runs the self-test), as in `berthing.js`.

## Step 1: a bot that plays the room (do this first)

Same pattern as Berthing's bot. Put the rules (push impulse, friction by span, bounce, plates, grill, cucumber startle) into one pure function stepped at 1/60 that both `update()` and `GAL.simulate(strategy)` call. `simulate` returns `{finished, time, pushes, grillHits, startles, stuck}`. Strategies:

- `idle`: never moves. Nothing happens; no state changes.
- `trotter`: holds right at trot from the start. Must get at least one grill hit and **must not finish** (overshoots trays and itself).
- `walker`: holds right at walk. Must not finish (never launches the long slide the third beat needs) but must light the first plate.
- `smart`: chooses walk or trot per push and where to start it. **Must finish in 60 to 150 s with at most 1 grill hit**, and with the cucumber startle happening.
- `explorer`: exhaustively (or by randomized search with a fixed seed) tries every sequence of up to 8 pushes, each walk or trot, from each reachable catbot position class. **From every reachable state there must exist a solution of at most 8 further pushes** (no softlocks without REWIND). Report the number of states checked.

Also make `selfTest()` verify: the part and the exit are reachable only after the gate opens; no tray can end at rest where it blocks its own lane's only approach (the bumper rule); `GAL.reset()` after a played state equals a fresh load of the room; every slick span has an adjacent grip span a standing catbot can reach (so the trolley and pads still exist somewhere). Log PASS/FAIL per check and each strategy's result. **Tune numbers until all pass. Do not weaken a bot to make a pass.**

## Order of work

1. The bot and the rules as a pure function, grey box (rectangles and numbers), with the hook stub and dev entry. Run the strategies.
2. The room data and layout, the gate and part, captions. Run again.
3. The cucumber, the grill, the weight feel (strain, clatter, scrape).
4. Art, then the remaining sounds and the measurements.
5. Self-test, `CLAUDE.md` (a **Galley** section like the Berthing one: room fields, the rules, the bot and how to run it, new sounds, the disclosure line).
6. Playtest in the browser only for feel. The loop pauses in a hidden tab, so keep the tab visible or step `tick()`/`render()` yourself. Restore `catbot.settings` in localStorage if you toggle it. If you cannot run a headless browser, say so and report the bot results from whatever you can run.

## Gotchas learned on rooms 2 and 3

- Do not name locals after game globals (`camX`, `camY`, `room`, `st`, `rig`, `mode`, `S`, `T`, `W`, `H`). A local `camY` once shadowed the camera and drew layers at NaN.
- When the hub loads a room, the mode is still the hub's. Check the room, not the mode, in `reset()`.
- Settings persist in `localStorage`. Everything in your module is a no-op outside the Galley, so the other rooms stay untouched; check that.
- The floor pads and REWIND tile need `|rig.vx|<25`, and the exit hatch and REWIND need the player walking toward them (`rig.bv` guard in engine.js). A slick floor makes catbot drift: make sure drift can never trigger REWIND or the exit by accident.
- The first version of Berthing's beam was unplayable because nobody checked its numbers against walking speed. Derive timings from walk 105 and trot 165, not from feel.

## Final report

Files changed with a one-line diff summary each, the `index.html` lines added, the full bot and self-test output, the sound measurements, what you could not verify, and what in this brief was wrong or missing.

## Stop and report only if

1. You need to change a forbidden file.
2. `index.html` needs more than about 40 added lines.
3. After 3 rounds of tuning, `smart` cannot finish in 150 s, or `explorer` finds a softlock you cannot design out. Report the numbers you have and stop.

## Stretch, only if all of the above passes

A shelf of loose cutlery and a stack of trays over the counter: trotting beneath it rattles the shelf, and one tray drops each time (never more than three in the room, restored by REWIND). It is how a cat "knocks things off shelves" with movement alone. Do not start it until the rest is finished and reported.
