# Handoff: Berthing (room 3), for Mistral Vibe

You are building one room of an existing browser game, Catbot, for the Jamference AI Game Jam (hard deadline 2026-10-09 07:00). Two rooms already exist and work. Your job is a third, self-contained room that follows the same pattern. This is a test of how well you work in an unfamiliar codebase, so precision matters more than ambition. Work in small steps, check each one, and stop at the checkpoints to report.

## Read first, in this order

1. `CLAUDE.md` in this folder. It is the project's working memory. Read **Game structure**, **The hub**, **The engine bay** and **Audio** in full.
2. `engine.js`: room 2, your template. Copy its shape (an IIFE reading the game's globals, a no-op stub in `index.html`, commented hook lines). Read how it applies a shove and the oops pose (`shove(v)`), how it feeds sound (`ENG.audio`), and its dev entry (`#room=engine`).
3. `index.html`: find every `ENG.` hook line and the `window.ENG={...}` stub. You will add matching `BERTH` hooks and nothing more.
4. `hub.js`: only the `DECK.slots[]` entries and the `needs` comment.
5. `audio.js`: the header comment and how a `SOUNDS` entry is written (see `vent` and `venthit`).

## Hard rules

- **Movement is the only verb.** No action, jump or interact input. Context comes from where catbot is and whether it is moving. Do not add keys.
- Plain HTML/JS, no build step, no libraries, no external assets. Art is drawn in canvas, audio is synthesized.
- Failure is soft: a nudge back and a pose, never a reset or a rewind count.
- The room must be playable and readable with sound muted and with `settings.calm` (STEADY) on. Every sound needs a visual twin.
- **Files you may change:** a new `berthing.js`; `index.html` (hook lines only, see below); `hub.js` (one `needs` line and its lock text); `audio.js` (new `SOUNDS` entries only); `CLAUDE.md` (docs and the disclosure log). **Do not touch** `catbot.js`, `opening.js`, `engine.js`, or any existing function bodies in `audio.js` and `hub.js`.
- Do not use `chase` mode or anything related to the easter eggs. If `AGENTS.md` exists at the repo root and you can read it, follow its easter-egg rule; if you cannot read it, skip eggs and say so in your final report.
- Sign the header of `berthing.js` with your model identity, and add a line to the AI-use disclosure log at the end of `CLAUDE.md`.

## The room: freeze

Berthing is dark. A light sweeps the floor. The only thing that matters is whether catbot is moving.

- **Beam.** A ceiling lamp on a rail sweeps a cone of light along the floor between two x limits and back, with a short dwell at each end. The beam is always visible. There is no hidden information.
- **Spotted.** Catbot is spotted when all of these hold: the beam's floor spot is on it, `Math.abs(rig.vx)` is above 25 px/s (the same "walking" threshold the trolley pads use), it is not under cover, `mode==='play'`, and a one-beat cooldown has passed. Standing still in the beam is safe. That is the whole mechanic.
- **Cover.** Bunks along the wall. The space under a bunk is permanently safe: the beam visibly does not reach under it (clip or fade the cone at the cover edges) and the floor there is darker. A cat under a bunk is the point.
- **Layout.** Room width about 2400. Start, REWIND tile, three or four covers, the part, then the hatch, as in the other rooms. The first gap between covers is short and the last is longest. The part sits past the final cover (a breaker gear on a panel).
- **Spotted consequence.** The lamp flares and locks on for about 0.6 s, catbot plays the oops pose, and it is nudged back to the nearest cover behind it. No reset, no rewind count. Reuse the way `engine.js` applies a jet shove and the oops pose. Show a caption the first time only: "Hold still. It only sees what moves."
- **Visuals.** Dim the room with a dark overlay, then add light with `globalCompositeOperation='lighter'` radial gradients: catbot's core glow, the beam cone and its floor spot, a faint warm lamp at the rail. Set dressing: bunks, lockers, a blanket pile. Keep it cheap: no per-frame blur, no `ctx.filter` on large areas.
- **Trolley.** Standing still summons the trolley after 1.2 s, and this room is full of standing still. Set `room.noCart` to cover the whole room except the first 400 px, so freezing does not roll it in.

### Room data fields (your module reads them)

`id:'berthing'`, `name:'Berthing'`, `w`, `floorSlip:0`, `start:{x,face}`, `reset:{x,w}`, `beam:{x0,x1,period,half,lampY}` (`half` = half-width of the cone on the floor), `covers:[{x,w}]`, `part:{x,id:'berthing'}`, `exit:{x}`, `noCart:[[x0,x1]]`, `captions:[...]`. Copy the shape of `ROOMS.push({...})` in `engine.js`.

## Sound, built with the room

Add entries to `SOUNDS`. Call `sfx('name',{x})` on the same line as the visual it matches. Loops go through `AUDIO.start/stop`, fed once per tick like `ENG.audio`.

- Lamp hum loop: pitch follows the beam's position, level follows distance to catbot, panned by `x`.
- Lock-on: a short rising tone as the lamp flares, then a dull brass bonk when it spots catbot. Give the bonk a 150-400 Hz body so it is audible on laptop and phone speakers.
- Quiet room tone: low and sparse (a bunk creak now and then). Part install reuses the existing `socket`.
- If you can, measure the new heavy sounds as `CLAUDE.md` describes (share of energy above 150 Hz, peak) and report the numbers.

## Hub change

In `hub.js`, the `berthing` slot currently has `needs:['hydroponics']`. Change it to `needs:['engine']` so Berthing is the next door after Engine Bay, and update the slot's lock text if it has one. Do nothing else in `hub.js`. Check that entering Berthing from the hub and returning to it works.

## Hooks in index.html

Add a no-op `window.BERTH={...}` stub next to the `ENG` stub, then one commented hook line beside each `ENG.` line your room needs (at minimum: reset, update, audio, the wall/deck draw, and the front/overlay draw). Look at what each `ENG` hook does and mirror only the ones you need. Your whole `index.html` diff should be roughly 15 lines. If it needs more, stop and report why.

## Self-test (required)

Add `BERTH.selfTest()`, run by the dev entry `index.html#room=berthing&test`, that logs PASS or FAIL for each:

1. Every gap between covers can be crossed inside the beam's absence window at 70% of catbot's maximum walk speed (measure that speed from the rig, don't guess).
2. The beam never reaches under any cover.
3. The part and the exit hatch are never permanently in the beam.
4. `BERTH.reset()` leaves no state behind after a rewind or after leaving to the hub and coming back.

Also add the dev entry `#room=berthing` (same shape as `#room=engine`).

## Gotchas learned on room 2

- Do not name locals after game globals (`camX`, `camY`, `room`, `st`, `rig`, `mode`, `S`, `T`). A local `camY` once shadowed the camera and layers drew at NaN.
- When the hub loads a room, the mode is still the hub's. Your `reset()` must check the room, not the mode, or its first frame can throw.
- `index.html` runs on `requestAnimationFrame`, which pauses in a hidden tab. If you test in a browser, keep the tab visible, or step the loop yourself.
- Settings persist in `localStorage` (`catbot.settings`). Restore them if you toggle them while testing.
- Everything in your module must be a no-op outside Berthing, so rooms 1 and 2 stay untouched.

## Order of work, with checkpoints

1. Plan. Post a short plan: files touched, the data fields, the hook sites you found. **Stop and wait for approval.**
2. Stub, dev entry, empty room that loads from the hub. Check: Aft Hold, hub, Engine Bay installed, Berthing opens, empty room loads, hatch returns to the hub.
3. Beam, covers and the spotted rule in grey box (rectangles and a line), with the lock-on sound. **Checkpoint: report.**
4. Layout, part, hatch, captions, trolley rule.
5. Art: dark overlay, lighting, bunks, set dressing. Then the rest of the sound.
6. Self-test, docs in `CLAUDE.md`, disclosure line.

## Final report

List the files you changed with a one-line diff summary each, the `index.html` line count you added, the `selfTest` output, anything you could not verify, and anything in this brief that was wrong or missing.

## Stretch, only if everything above passes

Dot temptation: if the beam parks its spot in front of a frozen catbot, its tail twitches as a tell. After about 2.5 s it pounces out of cover and gets spotted. Do not start this until the rest is finished and reported.
