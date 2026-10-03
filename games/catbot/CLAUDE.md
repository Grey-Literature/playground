# CLAUDE.md — Catbot (games/catbot)

> Project brief while Catbot is mid-build. Overrides `games/CLAUDE.md` only
> where it says so. Retire it once the game ships (fold anything worth
> keeping into the wiki first).

## What this is

A game for the **Jamference: AI Game Jam Hack 1** (itch.io,
`jamference-ai-game-jam-hack-1`). Theme "cat and robot", read literally:
a heavy brass-and-copper clockwork cat. Build week 2026-10-02 → hard
deadline **2026-10-09 07:00**. Judged equally on Fun, AI Use, Polish.

Gameplay design is being planned in a separate chat with Sonnet 5.5;
this folder is where the character is settled first.

## Constraints

- **Jam rule (mandatory): every input maps only to player movement.**
  No action/jump/interact buttons; context comes from where you move.
- Web build preferred (plain HTML/JS, no build step) — matches the repo
  baseline in `games/CLAUDE.md` §4.
- Jam requires disclosing AI tools and what they did on the submission.
- No fail-state rule: **open** — the jam game may want one (the Defeat
  pose exists for it). Decide with the mechanics and record it here.

## Files

| File | What |
| --- | --- |
| `catbot-storyboard.webp` | Concept storyboard (idle, ear scan, stretch, pivot, pounce, land) |
| `catbot-sprite` | Sprite-sheet concept (PNG, no extension) |
| `index.html` | **The game.** Room 1 + intro. Room data, world, control modes, render |
| `catbot.js` | Shared rig: `Catbot` physics, drawing, shadows, particles, crate/lamp props |
| `catbot-rig.html` | Dev pose picker (not part of the game): the 8 rig studies, loads `catbot.js` |

## Rig spec (settled by `catbot-rig.html`)

- Side view, body side-on, head 3/4 to camera. Light from upper-left;
  projected silhouette shadow + per-paw contact shadows.
- `Catbot` class = physics; scenes only write a `ctrl` intent object.
  Reuse that split in the game: game state → ctrl → rig.
- Weight comes from springs, not keyframes: body 3.2 Hz / ζ 0.48,
  gravity 2600 px/s², accel cap 260 px/s², footfall impulses.
- One `energy` value (0–1) drives speed, posture, tail stiffness, spring
  frequency, core glow and key spin — a natural "wind" resource.

## Game structure (settled by room 1)

- **Movement only, literally.** Keys ← → / A D and two touch pads. No
  Shift-trot: holding a direction for 1.6 s breaks into a trot instead
  (not while the hip is broken). Title, restart and room change are all
  places you walk: first step winds it up, the REWIND tile resets the room,
  the end hatch leaves it.
- **Rooms are data.** `ROOMS[]` in `index.html`: `floorSlip, start, reset,
  crate, plate, gate, part, exit, captions`. The world code reads those
  fields; a new room with the same props should need no new code.
- **Recess is crate-deep, on purpose.** With no jump and no climb, any
  crate left standing between catbot and the gate is a wall. So the crate
  drops into the recess flush, presses the plate, and becomes the floor;
  the recess's far wall is the stopper. `plate.depth` < crate height gives
  a raised crate (a blocker) if a later room wants one off the main path.
- **Parts.** A part is drawn as the hip disc it belongs in. The near hip
  starts as an empty socket (`rig.hipGear`) and the bad leg limps
  (`ctrl.limp`); the pounce/fly-home/click restores both. Installed parts
  survive a rewind; the end card resets the demo loop.
- Control layering kept from the rig: mode → `ctrl` → `Catbot.update`.
  Modes: asleep → wake → play ⇄ (pounce | oops) → exit → card.

## What the rig can't sell (yet)

- **Carrying.** No jaw and no grip, so catbot can't pick the gear up and
  seat it. The gear flies home by itself (repair-droid parts seek their
  socket). That's a story choice that covers for the rig, not a carry.
- **Grooming is a paw to the muzzle and head bobs.** There's no tongue and
  no licking shape, and it reads as "paw at face" more than "lick".
- **Climbing / steps / ledges.** The rig has one ground line (`GY`). Feet,
  shadows and `toWorld` all assume a flat floor, so no stepping up onto
  anything and no falling off a ledge. That's why catbot won't walk into
  an open recess (it stops at the edge) and why the recess has to be
  crate-deep.
- **The crate tipping in.** The crate slides into the recess with a small
  scripted lean, not a real pivot on the edge.
- **Looking at the hip.** Head yaw tops out around ¾ turned. "Looks back
  over its shoulder" is yaw plus eyes; it can't really look at its own hip.
- **Purr / kneading as sound.** No audio yet. The ticking-as-purring idea
  needs a sound layer.

## Open questions

- Rooms 2+ (ice `floorSlip`, cucumbers, knocking things off shelves,
  idle director, yarn-as-main-coil) — designed in the Sonnet chat, not built.
- Fail states: still none in room 1.
- Folder name is lowercase `catbot` (category convention is PascalCase);
  rename before it's linked from `games-index.html`, if it ever is.
