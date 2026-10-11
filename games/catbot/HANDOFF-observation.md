# Handoff: Observation (room 5), for Opus

> **Revised by review, 2026-10-05 (Tasha approved), then built.** Parts of this brief don't fit the code as it is: gravity is a constant inside `catbot.js`; nothing can sit below the deck; holding right *is* leaning forward; the shared pounce assumes full gravity; `camX` has no module hook. So the room was built with the route running up over a glass floor, the glass lifting catbot back to the gantry it jumped from, a lean-back lesson in beat 2, the ghost arc shown on the approach, an eyepiece inset for the telescope, and the yarn on the hull by the cockpit glass. One target missed: perfect play takes 30 s against the 50 s floor below. `CLAUDE.md` → **Observation** is the current spec; this file is kept as the original brief.

Build the fifth room of Catbot: the Observation deck. Hard deadline for the whole game is 2026-10-09 07:00, and the ending (the cockpit and the yarn) still needs you after this, so **timebox this room to one focused session and favor a finished, readable room over an ambitious one.** Tasha is not available to steer. Run start to finish without waiting for approval; your feedback loop is the bot test in step 1, not a person. Stop only for the conditions at the bottom.

## Read first

1. `CLAUDE.md`: Game structure, The hub, The engine bay, Berthing, Galley, Audio, Open questions. It overrides assumptions.
2. `engine.js`: the one room that already has air and heights. Lifts that throw catbot, platforms (`rig.fl`, `setFloor()`), `ENG.blocks`, `ENG.camY`, the shove and `oops` pose. Reuse its machinery before inventing any.
3. `berthing.js`: the pattern to copy. The rules live in one pure function (`stepWorld`) that both the live game and the bot (`simulate`) call, so the bot plays the real rules. `galley.js` does the same and has its own ballistic hops and platform landings, so read how it models them and reuse whichever is cleaner.
4. `index.html`: the existing hook lines (`ENG.`, `BERTH.`, `GAL.`), `control()`, `cartFree()`, the `floorSlip` and `GAIT` use, the camera line (module `camY`s are added together).
5. `hub.js`: the `observation` slot only. It already has `needs:['galley']`, hint "Low gravity. Long jumps." and a floor glyph (a window with twinkling stars). Match both.
6. `audio.js`: header comment and a few `SOUNDS` entries.

## Hard rules

- **Movement is the only verb.** No jump, action or interact input, no new keys. A "jump" is something the floor does to catbot when it walks onto a pad; its length depends on how fast catbot arrived (walk 105 px/s or trot 165 px/s), and mid-air the held direction can steer a little.
- Plain HTML/JS, no build step, no libraries, no external assets. Art in canvas, audio synthesized.
- **Failure is soft.** A bump, a float back, a pose. Never a reset, a counter or a rewind. REWIND stays player-chosen. Nothing may leave the room unwinnable without it, and the bot must prove that.
- Playable and readable muted and with `settings.calm` (STEADY) on. Every sound has a visual twin.
- **Any change to shared behavior goes through a room field with the old behavior as the default.** (The Galley shortened the global trot hold and broke Berthing. Do not repeat that.) Your module must be a no-op in every other room; check it.
- **Files you may change:** a new `observation.js`; `index.html` (hook lines only, at most about 30 added lines); `hub.js` (the observation slot's text only, if needed); `audio.js` (new `SOUNDS` entries only); `CLAUDE.md`. **Do not touch** `catbot.js`, `opening.js`, `engine.js`, `berthing.js`, `galley.js`, or existing function bodies in `audio.js`/`hub.js`.
- Sign the header of `observation.js` with the exact model identity your harness reports, and add a line to the AI-use log in `CLAUDE.md`.

## The room: low gravity and long arcs

Berthing is stillness, Engine Bay timing, Galley mass and slide. Observation is **flight**: gravity is about a quarter of the deck's, so everything is floaty and slow to land, and the only way across a gap is to be launched. Width about 3000 px. A long curved window runs the length of the room with stars, a slow planet limb and drifting debris behind it.

### Mechanics

- **Gravity.** Low in this room only (a room field, for example `gravity` as a fraction, applied the way the engine bay applies its throws). Landing is soft: a long squash, slow dust, no thud sound at full volume. Walking is normal; only airborne time changes.
- **Glass gaps.** The floor has gaps where panels are out and you can see stars through the hole. Catbot cannot cross one on foot (no jump), and walking into one does not drop it: the gap edge stops it (a soft railing glow), as the crate's recess stops it in room 1.
- **Launch pads.** A spring plate set into the deck at the edge of a gap. Walk onto it and catbot is launched along a low-gravity arc whose range and height scale with the approach speed: walk gives a short hop, trot a long one, and the two must each be reachable (the trot is earned by holding a direction or double-tapping, so the pad must be placed far enough from the gap edge that a player can build to it). Show the pad's response before it fires (a coil compressing, a lamp ramping) and a ghost arc preview when catbot is on it, so the outcome is readable without a jump button.
- **Air steering.** While airborne, a held direction adds a small acceleration toward that side (tens of px/s²), with a cap, so a good launch plus a nudge lands where intended. Releasing keeps the drift. Catbot's tail and ears react (use the existing rig reactions). Nothing steers height.
- **Landing.** Catbot lands on a platform or deck segment if its feet cross the surface within the platform's span plus a small forgiving margin; it grabs the edge softly if it grazes it. Platforms may be at different heights (gantries, a telescope catwalk); the camera follows the height (add your module's `camY` the way `ENG.camY` and `GAL.camY` do).
- **Missing.** If catbot drifts out of bounds below the deck, a safety field (a pale glass tier far below) catches it, it floats up slowly, lands at the edge of the nearest deck it can reach back toward the pad it launched from, with a bump and a caption the first time ("The glass has opinions." or similar). No reset, no counter, and no pad can ever become unreachable.
- **Drift is not a step.** Nothing in the air or on a pad may trigger REWIND or the exit hatch; use the same walking-toward guard as the others. Trolley and floor pads need standing still: keep `noCart` over gaps, pads and landing zones, and make sure one stable deck span near the start and one near the end can host them.

### Layout, three beats (tune the numbers with the bot)

1. **Teach the pad.** One short gap (about 200 px) and one pad. Walking launches a hop that lands in the gap's middle and falls you back (the safety field teaches "missing" safely); a trot clears it. A caption teaches it once, dry.
2. **Teach the steering.** A wider gap with a floating platform. A good trot from the pad cannot reach the platform without a mid-air nudge, so the player has to learn that holding a direction in the air matters.
3. **The chain.** Two gaps, two pads, platforms at different heights, leading to the telescope on a raised gantry. The astrolabe gear (the part, `part:{id:'observation',name:'ASTROLABE GEAR'}`) sits on the telescope mount, or hangs on its tripod.

Then the part, then the exit hatch. A careful run should take 50 to 90 s with no REWIND.

### The telescope (cheap story beat)

When the gear is seated, the telescope swings around, the viewport sweeps across the starfield and stops on a small round red thing drifting in the dark. One caption, for example "Something round and red. It is not on any chart." That is the yarn: it seeds the ending. Keep it to a few seconds of camera and a caption; this is foreshadowing, not a cutscene.

### Look and sound

- Look: a long curved window with parallax stars (a few depth layers, baked offscreen if blurred, as `engine.js` does), a slow planet, a dark deck with floor-strip lights that pulse along the edges of gaps, brass railings, a telescope on a gantry. No per-frame blur or `ctx.filter` on large areas. `settings.calm` removes star twinkle and light pulsing, not parallax.
- Sound, added with each mechanic: a pad coil (rising) and launch (a muted "boing" with a 150 to 400 Hz body, as laptop and phone speakers need weight), a long airy glide, a soft landing (low and muffled, since sound in a quiet room should feel hushed), the glass hum, the safety field's rising chime, the telescope servo. Measure the heavy new sounds as `CLAUDE.md` describes (share of energy above 150 Hz and peak) and report them. Part install reuses `socket`.

### Hooks and dev entries

A no-op `window.OBS` stub in `index.html` replaced when `observation.js` loads (after `galley.js`), plus one commented hook line beside the `GAL.` line at each site you need. The module guards itself with a field of its own room, never the mode. Dev entries: `index.html#room=observation` (assumes hip, engine and galley installed; `&parts=` changes it; `&test` runs the self-test).

## Step 1: a bot that plays the room (do this first)

Put the rules (launch from approach speed, low-gravity arc, air steering, landing, miss and return) into one pure function stepped at 1/60 that both `update()` and `OBS.simulate(strategy)` call. It returns `{finished, time, launches, misses, stuck}`. Strategies:

- `idle`: never moves. No state changes, no misses.
- `walker`: holds right at walk. **Must not finish** (it cannot clear gap 1) and must not get stuck anywhere unrecoverable.
- `trotter`: holds right and trots at every pad with no steering. **Must not finish** (beat 2 needs steering) and must record at least one miss, and every miss must return it to a state where it can try again.
- `smart`: picks walk or trot per pad, steers in the air. **Must finish in 50 to 120 s with at most 2 misses.**
- `explorer`: a seeded search over approach speeds (walk or trot), pad choices and steering inputs. **From every reachable resting state a solution exists** (no softlock without REWIND). Report the number of states checked.

Also make `selfTest()` verify: the part and the exit are only reachable by the intended chain; no pad can launch catbot into a position where every route back is blocked; `OBS.reset()` after a played state equals a fresh load; one stable deck span near the start and near the end can host the trolley and floor pads; nothing outside the room changes (call the `reset`/`update` hooks in another room and check they do nothing). Log PASS/FAIL per check and each strategy's numbers. **Tune until all pass. Do not weaken a bot to make a pass.**

## Order of work

1. The bot and rules in grey box (rectangles and numbers), the hook stub and dev entry. Run the strategies.
2. Room data, layout, gate-free flow, the part and hatch, captions. Run again.
3. The pad's readability (coil, lamp, ghost arc), steering, landing, the miss and return.
4. Art, then sound and measurements, then the telescope beat.
5. `CLAUDE.md`: an **Observation** section like the Berthing one (fields, rules, the bot and how to run it, sounds, the disclosure line), and the table of expected bot results.
6. Playtest in the browser for feel. The loop pauses in a hidden tab, so keep it visible or step `tick()`/`render()` yourself. Restore `catbot.settings` in localStorage if you toggle it.

## Gotchas

- Do not name locals after game globals (`camX`, `camY`, `room`, `st`, `rig`, `mode`, `S`, `T`, `W`, `H`).
- When the hub loads a room the mode is still the hub's. Check the room, not the mode, in `reset()`.
- Derive timings from walk 105 and trot 165, not from feel; the Berthing beam shipped useless because nobody did.
- Settings persist in `localStorage`. Everything in your module is a no-op outside the Observation.

## Stop and report only if

1. You need a forbidden file.
2. `index.html` needs more than about 30 added lines.
3. After 3 rounds of tuning, `smart` cannot finish in 120 s, or `explorer` finds a softlock you cannot design out. Report the numbers and stop.

## Report

Files changed with a one-line diff summary each, the `index.html` lines added, the full bot and self-test output, the sound measurements, any leak into other rooms (there should be none), and what you could not verify.
