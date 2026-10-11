# Galley triage and finish (for Opus)

`galley.js` (room 4, about 750 lines) was built by Codex (GPT-6) over several revisions, steered by Tasha's play feedback. Some things got better and some regressed. Your job is to **stabilise and ship it, not redesign it.** Deadline for the whole game is 2026-10-09 07:00 and other work (the ending, the submission) still needs you after this, so timebox the galley to one focused session.

## Tasha's regression notes (she fills this in before pasting)

> (list what got worse, in her words: what it did before, what it does now)

Her notes outrank everything below. If this brief or `CLAUDE.md` contradicts them, she is right.

## What is decided and what is a bug

The **Galley** section of `CLAUDE.md` says the current layout is a user-approved revision that supersedes the original `HANDOFF-galley.md` (raised counters and a shelf instead of one level, vegetable startles, a careful run of about 43 s instead of 60 to 150 s, holding either gait overshoots the catch). Treat those as decisions. Do not "fix" them back toward the original handoff.

## Do this, in order

1. **Checkpoint first.** If the folder is a git repo, commit the current state now so regressions can be bisected. If it is not a repo, say so in your report and copy `galley.js`, `index.html` and `audio.js` to a dated backup folder before you touch anything.
2. **Baseline.** Run `index.html#room=galley&test` and write down every PASS/FAIL and each bot strategy's numbers. Then run `#room=berthing&test`, and walk rooms 1 and 2 and the hub by hand (or step `tick()`/`render()`; the loop pauses in a hidden tab). Codex changed shared code, so the other rooms are in scope for regressions.
3. **Audit what Codex changed outside `galley.js`.** It touched `index.html` in more places than the handoff allowed. Look at each: the `GAIT` constants (walk 105, trot 165, **hold 1.15 s, double-tap window 280 ms**; `CLAUDE.md` Game structure still says the trot comes after a 1.6 s hold, so either the doc or the code is wrong), the `GAL.intent` conditions on the REWIND and exit lines, `GAL.slipAt` in the two `floorSlip` reads, the shared strain loop (`GAL.strain()`), the ice loop, the `ENG.wall`/`GAL.wall` pair, the camera line (`ENG.camY()+GAL.camY()`), and the `drawKit` translate. For each, confirm it is a no-op outside the galley and that the engine bay and berthing still play and still pass their tests. If a change leaks into other rooms, fix it at the hook, not in the other room's module.
4. **Triage Tasha's list.** For each item: reproduce it (the bot, or a stepped run), fix it at the rule level (`GAL.stepWorld`) rather than in drawing code, and add an assertion to the bot or `selfTest()` so it cannot silently come back. Keep the pure-function structure: the live game and the bot must keep running the same rules.
5. **Regression guard.** When the list is done, record the final bot and self-test results as a small table in the Galley section of `CLAUDE.md` ("run these, expect these") so the next change, by anyone, has something to compare against.
6. **Docs.** Fix the trot-hold line in Game structure if it changed on purpose. Add your line to the AI-use log, with the exact model identity your harness reports.

## Do not

- Add features. The shelf-and-trays stretch stays cut. A finished, readable room beats an ambitious one.
- Touch `catbot.js`, `opening.js`, `engine.js`, `berthing.js`, or any existing function body in `hub.js`.
- Rewrite `galley.js` wholesale, or change a bot to make a number pass. If a bot fails, the rules are what is wrong.

## Stop and report if

1. A fix needs a forbidden file.
2. A Galley fix breaks another room's test or feel and you cannot isolate it at the hook.
3. You have spent about an hour and Tasha's list is not mostly done. Report what is fixed, what is not, and what you would cut.

## Report

What was broken and why (one line each), what you changed, the before and after bot/self-test numbers, anything outside `galley.js` that leaked into other rooms, and what you could not verify.
