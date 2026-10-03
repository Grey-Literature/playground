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
| `opening.js` | Opening cinematic (premise): space → cabin → impact → the real hold, close in, with its sound cue sheet and a muted-caption fallback. Boots the game on the **cover page** (`mode='cover'`, in `index.html`); PLAY or the first step calls `OPEN.begin()`. Delete the script tag and the game starts at the title |
| `audio.js` | Sound layer: Web Audio, all synthesized, placeholder sounds. Loaded after `catbot.js`, before the game script; see **Audio** below. Optional: if it fails to load the game runs silent |
| `hub.js` | The deck plan: the top-down hub that doubles as the goal screen. Loaded after `opening.js`; see **The hub** below. Dev entry: `index.html#hub&parts=hip,engine` (skips the opening, lands in the hub with those parts shown) |
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

- **Movement only, literally.** Keys ← → / A D and two touch pads in the
  rooms (the deck plan adds ↑ ↓ / W S and swaps the pads for a thumb-stick). No
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
  (`ctrl.limp`) like a machine, not a hurt cat: its swing ratchets forward
  in four jerks with dead holds (skipping teeth), each footfall grinds
  (nose-down hitch + sparks at the socket via the rig's `grind` event), and
  standing still it occasionally slips a gear and the leg jerks. The
  pounce/fly-home/click restores both. Installed parts
  survive a rewind.
- Control layering kept from the rig: mode → `ctrl` → `Catbot.update`.
  Modes: cover → intro → asleep → wake → play ⇄ (pounce | oops | chase) → exit → card
  → hub (the card is the beat between the hold and the deck plan; it no longer
  loops back to asleep). The cover is a plain DOM page (summary, PLAY, a Sound
  toggle) in front of the opening: PLAY or the first step starts it, and that
  gesture is also what lets the browser start audio. Once the opening is running,
  any movement skips it; the input latch stops that same keypress also waking
  it (and the key that started it from skipping it).
- The opening's last shot is the game itself (`zoom`/`camY` on the room
  camera, darkness overlay), so the cut to the aft hold is a camera move,
  not a scene swap. `room.wreck` is the crash debris it shows; set dressing only.
- **Settings are places, not menus** (jam mods: "the character moves to
  select", like Unrailed!). A service trolley rides a wall rail and parks
  near catbot whenever it stands still for 1.2 s. Its three floor buttons
  (toolbox panel, sound, steady = reduced shake/flashes) are pressed by
  standing still on one for 0.7 s; walking over them does nothing, and
  any walking re-arms them. Settings persist in localStorage
  (`catbot.settings`). The SOUND / MUTE button is the audio's mute switch
  (`settings.sound` -> `AUDIO.enable()`); no other sound control exists.
- **Toolbox panel** (top right, opened from the trolley, peeks open by
  itself when a part is installed). The lid reads TOYS until the hip
  clicks, then flips to REPAIR KIT and repair % appears. It shows only the
  current room's parts (silhouette → object); the yarn is never listed.
  `GAME.totalParts` is the hub's slot count (`DECK.slots.length` in
  `hub.js`, currently 8), so the toolbox bar and the deck plan agree.
- Easter egg (approved per `AGENTS.md`): `chase` mode. Signature lives in
  `makeStarLog()` and the console; don't remove it.
- Easter egg #2, the hub's (approved per `AGENTS.md`, 2026-10-03): sit on the
  plot table for 8 s and a footnote types itself into the blueprint's bottom
  margin, signed Claude Sonnet 5.5 (`FOOT`, `startFoot()`, `drawFoot()` in
  `hub.js`; also logged to the console). Don't remove it.

## The hub (`hub.js`)

- **The plan is the goal screen.** One compartment per `DECK.slots[]` entry
  (8: aft hold, engine, galley, observation, berthing, hydroponics,
  sanitation, cockpit), each with one socket. An installed part (`installed`
  Set, keyed by the slot's `part` id) fills its socket with the real disc art,
  warms the room to brass and lights a conduit to the cockpit. The central
  plot table carries the REPAIR ring. `GAME.totalParts = DECK.slots.length`.
- **A slot is sealed unless a `ROOMS[]` entry has its id** (cockpit is also
  gated on every other socket). Add the room and the door opens, with no hub
  change. Sealed doors bump the token, flare their lamp, play a "nu-uh" (`nuh`)
  and say why once. A hard hit bumps (`-vn>22` in `pushRect`), and so does any
  *fresh touch* within `SENSE` (10 px) of the frame (`touchHatch`, no contact
  for 0.3 s): a hard corner hit flings the cat ~8 px off the wall, so without the
  sensor a glide along the wall passed the next door in silence. Holding into
  one door says it once; sliding on to the next says it again.
- **Token:** brass puck, ears on springs, lagging tail, stride-locked wobble,
  sits into a loaf after 1.2 s. 8-way: arrows / WASD / touch thumb-stick
  (a floating stick that only sets `keys.l/r/u/d`; the room pads are hidden
  in the hub). Collision = circle vs the room rects minus each door's
  doorway pocket, plus pillars; the plot table is a low step you can stand on.
- **Doors:** stand still on a door's mat for 0.7 s and a hint tag reads out
  (SANITATION gets struck through and re-scrawled LITTER BOX). Walk past the
  sill to go in: zoom onto the compartment, fade, then `intoRoom()` loads the
  room with the camera high (`camY=-46`, eased to 0) and catbot dropping in.
- **Coming back:** exit hatch → the card only if a part is new to the plan
  (`HUB.hasNew()`), else straight to the hub. The camera pulls out of the
  room's compartment, catbot walks out of its door, new sockets light one by
  one. When the last non-cockpit socket lights, a pulse runs down every
  conduit and the cockpit gets power (`ckOn`).
- **Floor glyphs** (`drawGlyph`) preview each room faintly: belts + vent,
  trays + cucumber, window, bunks + sweeping light, planters, sand + paws,
  crates + recess, console.

## Audio (`audio.js`)

Plumbing plus ugly placeholder sounds, not a mix. No music yet. All
synthesized with Web Audio (oscillators, filtered noise, envelopes): no audio
files, no libraries, no build step, no asset-rights question. Output only, so
the movement-only jam rule is untouched. Signed Claude Sonnet 5.5 in the file
header; no easter eggs in it.

- **Sound is a second consumer of events the game already produces.**
  One-shots: `sfx(name,{mag,x,rate,delay})`. `handleRigEvents` forwards every
  rig event (`sfx(e.k,...)`, the sound table is keyed by the same names, a kind
  with no sound is ignored). Each mechanic calls `sfx()` on the same line as
  its `FX.*` call. Loops are states: `AUDIO.start(name,params)` (idempotent,
  doubles as "set params") / `AUDIO.stop(name)`, fed once per tick by
  `audioFrame()` in `index.html`. `AUDIO.music.setLayers(n)` is a stub that
  does nothing (called when a part is installed).
- **To add a sound:** write one entry in `SOUNDS` (name, `ref` = the raw mag
  that counts as full level, `gap` = rate limit in ms, a few `tone()`/`burst()`
  calls), then call `sfx('name',{x})` where it happens. Every number to retune
  is in that table. `end` (a fraction of `vol`) on a tone or burst lifts the
  floor of its decay so a thud can keep ringing; the default fades ~80 dB.
- **Weight needs mid, not just sub.** A thud that lives under ~150 Hz vanishes
  on laptop and phone speakers. The crate seating was measured at 8% of its
  energy above 150 Hz and a peak of 0.13 (it read as a faint clang); rebuilt
  with a 150-400 Hz body, a long ring and a smaller settle it is 46% and 0.42.
  The limiter caps every loud sound near the same peak, so heaviness comes from
  spectrum and duration, not input level. `land`, `thud`, `headthud` and `boom`
  are still sub-heavy (under 10% above 150 Hz) and could get the same treatment.
  Measure with an `OfflineAudioContext` + `AUDIO.attach(ctx,true)`.
- **Chain:** voices -> sfx/ambient bus -> master (0.35, 0 when muted) ->
  DynamicsCompressor (soft limiter) -> out. Peak measured under a 480-voice
  barrage: 0.78. Per-name rate limit plus a 28-voice cap keep bursts (trot,
  the scuff stream) from piling up.
- **Starts from a gesture, fails soft.** The context is created on the first
  key / pointer / touchend (touch needs the release) and the wake latch calls
  `AUDIO.unlock()`. Suspended while the tab is hidden. If Web Audio is missing,
  throws, or `audio.js` fails to load, every call is a no-op and `index.html`
  falls back to a stub, so the game plays exactly as before.
- **Ambient:** a quiet clockwork tick whose rate is `lerp(0.7, 3.4 Hz, rig.E)`.
  Off in the opening (`intro`), muted on the card, running in the hub at the
  rig's frozen energy. Nothing drains energy yet, so the slow-down only shows
  on the way into `asleep` (about a second, the rig's own damping) and as the
  speed-up on wake.
- **The opening has a cue sheet** (`sound()` in `opening.js`, hung off its own
  `at(...)` marks and state so sound can't drift from picture). Shot 1 is heard
  through the hull (a low-pass, since space is silent); the cabin is clear
  (alarm on each beacon pulse, hull creaks at the ends of the roll, lockers,
  then clatter driven by the real floor bounces, per object kind; the yarn
  rolls in silence on purpose, a rustle sounded like the box and would not be
  heard over the alarm anyway); the push-in on the yarn is a focus pull (muffle); the fall is wind; the impact is boom, crunch,
  debris, then the world goes dull and rings; 29-31 s is the dying tube; 31.0
  is true silence (`duck(0)`, replacing the old "Silence." caption) with one
  distant tink; the click at 35.6 is the first tick of the ambient clock, which
  keeps going until the key stops at 48.55 (a held-breath gap, then the game's
  own tick resumes); the key turn is six climbing ratchet clicks. Scene-level
  controls for this: `AUDIO.muffle(hz,secs)`, `AUDIO.duck(level,secs)`,
  `AUDIO.stopAll(secs)` (used when the opening is skipped), `AUDIO.active()`.
- **Captions when sound can't be heard.** The cut opening captions live in
  `LINES` (`opening.js`) with a kind: `fb` = story line, shown only when sound
  isn't audible; `snd` = stands in for a sound, shown only then, small, italic
  and [bracketed]. "Audible" is `AUDIO.active()`: not muted in-game, context
  running, not failed. A page cannot see a muted tab or a muted system volume,
  so for those the cover's Sound toggle (same `settings.sound` flag as the
  trolley button) is the player's way to say so.
- **Dev aids:** `AUDIO.trace` (what was asked for: `{name,mag,pan,ok}`, loops
  as `+name`/`-name`, scene calls as `~muffle`/`~duck`/`~stopAll`),
  `AUDIO.peak()`, `AUDIO.spectrum()`, `AUDIO.debug()`, `AUDIO.limits(false)`
  (rate limit and voice cap off, for barrage tests).
- **What the event system doesn't expose** (sound works around it, it doesn't
  fake it): `step` only fires at trot speed or with `stepDust`, so the rig now
  also emits `foot` on every plant and footsteps use that; nothing says what
  material is under a foot (ice is read from `room.floorSlip`); the bad leg's
  four ratchet jerks happen inside `update()` with no event; the crate's
  break-free has no rig event, but the push code has the exact line
  (`P.F>muS`), which calls `sfx('unstick')`; the plate has no event of its own
  (it clicks 80 ms after the crate seats). The strain loop is noise, not a
  tone: grit through a band-pass, roughened and chattered by two looping
  envelopes (stick-slip), plus rumble, a faint servo groan and a squeal near
  the limit. Filter brightness and level rise with `P.str`; crate speed adds
  scrape. The hub is silent
  except for the ambient tick and the locked-door `nuh` ("nu-uh", from
  `bump()`, panned to the door against the hub's own camera): its socket-light /
  cockpit-unlock / door-in moments are the obvious next `sfx()` sites.

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
- **Purr / kneading as sound.** The sound layer exists now, but only as
  placeholders: there is no purr voice, no kneading rhythm. The ambient tick
  is the seed of the ticking-as-purring idea.

## Open questions

- Rooms 2+ (ice `floorSlip`, cucumbers, knocking things off shelves,
  idle director, yarn-as-main-coil) — designed in the Sonnet chat, not built.
- Fail states: still none in room 1.
- Hip gear is catbot's own socket, but the deck plan shows it as slot 1 of
  the shuttle (the aft hold's socket). Left that way; revisit if the story
  wants the hip kept off the shuttle blueprint.
- How the yarn travels. The cockpit is its socket and sanitation is "where
  you'd bury it", but catbot can't carry. The hub only gates the cockpit on
  the other seven sockets; the yarn is a room-phase decision.
- Re-entering a finished room (aft hold) replays it with the part already in,
  so the hatch opens straight away. Fine for now.
- Sounds were verified by trace, meter and offline-style barrage, not by ear.
  Expect to retune levels, pitches and the ambient tick once they've been
  heard. Hub sounds, a wind-down that actually drains `rig.E`, and any music
  are not started.
- Folder name is lowercase `catbot` (category convention is PascalCase);
  rename before it's linked from `games-index.html`, if it ever is.
