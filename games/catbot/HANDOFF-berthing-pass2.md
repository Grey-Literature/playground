# Berthing, pass 2: make it a room, not a flash of light (for Mistral Vibe)

Pass 1 works. Nothing crashes, the hooks are clean, the sound is wired. Good. This pass changes the design numbers and adds three mechanics. **Run it start to finish without waiting for approval.** Tasha is not available to steer. Your feedback loop is the bot test in step 1, not a person. Stop only for the three conditions at the bottom.

Same hard rules as `HANDOFF-berthing.md` (movement is the only verb; no libraries or assets; soft failure; works muted and with `settings.calm`; every sound has a visual twin). Files you may change: `berthing.js`, `audio.js` (new `SOUNDS` entries only), `CLAUDE.md`, and `index.html` hook lines only, now up to about 25 added lines in total. Do not touch `catbot.js`, `opening.js`, `engine.js`, or existing function bodies in `audio.js`/`hub.js`. Do not add or remove easter eggs in this pass.

## Why the beam is useless (measured from your code, not playtested)

- It is fast. 2000 px in 4.4 s with a quadratic ease is about 450 px/s on average and about 900 at the middle. Catbot walks at 105. The beam is over any given spot for well under a second, and you can see it coming from across the room. The only decision is "wait under a bunk, then go". Nobody ever has to freeze in the open, so the core mechanic (standing still in the beam is safe) never comes up.
- It is predictable. One ping-pong path, forever. There is nothing to read.
- It is unfair at the edges. The spotted test uses `rig.x ± 88` against a spot of `±70`, so catbot can be spotted when the drawn light is visibly not on it.
- It is the only mechanic in a 2400 px room, and a failure costs almost nothing (a hop back to the last bunk).
- The self-test cannot fail. Test 2 has no code in it (it always passes), tests 3 and 4 check things that cannot go wrong. Replace all four (step 1).

## Step 1: a bot that plays the room (do this first)

Write `BERTH.simulate(strategy)`: a deterministic fixed-step (1/60) simulation with no rendering. It advances the lamps with the same code `update()` uses (refactor lamp motion into a pure function of time that both call), moves a virtual catbot along x, and applies the real spotted rule. It returns `{spots, time, finished}`. A spot teleports the bot back to the nearest cover behind, as the game does. Strategies:

- `frozen`: never moves. Must get **0** spots.
- `naive`: walks right at 105 px/s from `start` to `exit.x`, never hiding. Must get **at least 4** spots.
- `trotter`: like naive at 165 px/s. Must get **at least 3** spots, and at least 1 of them from the creaky plates (step 4).
- `smart`: knows the lamp paths. Hides when a lamp will reach it before it reaches the next cover, freezes in the open when a lamp is on it, otherwise walks. Must **finish with 0 spots** in **60 to 150 s**.

Rewrite `selfTest()` to also: (a) sample the lamp paths over a full cycle and verify no lamp spot overlaps any cover's interior (real geometry, not a comment); (b) verify the part and the exit each have a lamp-free window of at least 4 s per cycle; (c) verify `reset()` after a spotted state restores exactly the state that a fresh `loadRoom` produces (compare the whole state object, including the new fields). Log PASS/FAIL per check and the four strategy results. **Tune numbers until all pass. Do not weaken the bot to make a pass.**

## Step 2: re-tune the lamp (the core change)

- Speed 110 to 150 px/s while sweeping. Spot `half` 100 to 120, and draw it wide enough that the spotted rule is visibly true: spotted when the spot overlaps catbot's body, which is `rig.x ± 45`. Delete the `±88` fudge.
- Replace the ping-pong with a **patrol path**: `beam.path:[{x,dwell},...]`, looping. Mix short dwells (0.3 s) with long "inspect" dwells (2 to 3 s) at places that are between bunks, so freezing in the open is something you must do. Path must not be symmetric; the player should be able to learn it.
- When the lamp parks, give it a slow small oscillation (about 25 px) so a parked lamp still looks alive. The hum pitch must follow it.
- Cover layout: widths 200 to 320 (vary them), gaps 250 to 650. The longest gap comes before the part. At least one gap must be too long to cross without meeting the lamp, so you have to freeze in it.
- Keep the dwell/lock-on flare and the caption. Teach the rule once: the first time catbot freezes while the spot is on it for 1 s without being spotted, show the caption "Hold still. It only sees what moves." (instead of showing it on the first failure).

## Step 3: a second lamp and a soft alert

- Add lamp B on its own rail segment covering roughly the right half (x 1200 to 2300), with a different period from lamp A. Lamps share `beam.half` but have separate paths. Hand-over zone: both can reach x 1200 to 1500. Draw each lamp with its own housing and a slightly different tint (A warm, B a bit cooler) so they read as two.
- `alert` 0 to 2. Each spot raises it by 1. It decays by 1 every 15 s without a spot. At alert 2, both lamps move 25% faster and tint redder for 12 s. Soft: no reset, no counter shown. Visual twin: the housing glow brightens. `settings.calm` reduces flicker, not the speed change.

## Step 4: creaky plates (gives trotting a cost)

- `plates:[{x,w}]`, 2 or 3 spans of floor drawn as a grating (visibly different from the plain floor). Catbot moving above 130 px/s on a plate (trot territory; walk is 105) makes it creak: lamp A or B, whichever is closer, retargets to that x for 3 s, then resumes its patrol. A ring/ripple on the plate and a short creak sound (`sfx` with `x`) are the visual and audio twins. Walking on plates is silent.
- Put one plate in the longest gap and one just before the part. A trot is tempting there, which is the point.

## Step 5: set dressing and sound (cheap)

- Under-blanket breathing on the bunks (a slow ellipse rise and fall, about 5 s period), and one flickering ceiling strip. No per-frame blur, no `ctx.filter`.
- New `SOUNDS` entries: `plateCreak` (150 to 400 Hz body, short), `lampRetarget` (a soft servo whir, about 0.4 s). Use the existing `beamHum`, `beamLock`, `beamSpot`. Measure the energy above 150 Hz and the peak for the two new sounds as `CLAUDE.md` describes and report the numbers.

## Step 6: docs

Update `CLAUDE.md`: Berthing section (new room fields: `beam.path`, second lamp, `plates`, `alert`), the bot test and how to run it (`#room=berthing&test`), and fix the line that says Berthing has "no easter eggs", because it does (the eyes under bunk 2). Add one line to the AI-use log for this pass, naming the model.

## Final report

Files changed with a one-line diff summary each, total `index.html` lines added, the full self-test and strategy output, the two sound measurements, what you could not verify, and what in this brief was wrong or missing. Mention the unapproved easter egg (eyes and signature text under bunk 2) once, without changing it.

## Stop and report only if

1. You need to change a forbidden file.
2. `index.html` needs more than about 25 added lines.
3. After 3 rounds of tuning, `smart` cannot clear the room with 0 spots in 150 s, or `naive` gets fewer than 4 spots. Report the numbers you have and stop.

## Stretch, only if all of the above passes

The dot-temptation tail twitch from pass 1: if a lamp parks its spot a short distance in front of a frozen catbot, the tail twitches as a tell. After about 2.5 s catbot pounces out of cover and gets spotted.
