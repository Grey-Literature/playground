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
- No fail-state rule: **soft, decided by room 2**. Nothing resets you or
  ends the run. The engine bay's hazards shove (a jet knocks catbot back, or
  down a level) and that is the harshest thing in the game so far. The Defeat
  pose exists if a later room wants more; it would need deciding here first.

## Files

| File | What |
| --- | --- |
| `catbot-storyboard.webp` | Concept storyboard (idle, ear scan, stretch, pivot, pounce, land) |
| `catbot-sprite` | Sprite-sheet concept (PNG, no extension) |
| `index.html` | **The game.** Room 1 + intro. Room data, world, control modes, render |
| `engine.js` | Room 2, the engine bay: its `ROOMS[]` entry, belts, vents (lifts and jets), platforms, the carry, the turbine, its depth layers and sound feeds. Loaded after `hub.js`; see **The engine bay** below. Replaces a no-op `window.ENG` stub in `index.html`, so if it fails to load room 2 just doesn't exist. Dev entry: `index.html#room=engine` (assumes the hip unless `&parts=` is given; `#room=aft-hold&parts=none` works too) |
| `opening.js` | Opening cinematic (premise): space → cabin → impact → the real hold, close in, with its sound cue sheet and a muted-caption fallback. Boots the game on the **cover page** (`mode='cover'`, in `index.html`); PLAY or the first step calls `OPEN.begin()`. Delete the script tag and the game starts at the title |
| `audio.js` | Sound layer: Web Audio, all synthesized, placeholder sounds. Loaded after `catbot.js`, before the game script; see **Audio** below. Optional: if it fails to load the game runs silent |
| `berthing.js` | Room 3, berthing: two patrol lamps, bunks to hide under, creaky plates, the alert, and the bot test (`BERTH.simulate`, `BERTH.selfTest`). Loaded after `engine.js`; see **Berthing** below. Replaces the no-op `window.BERTH` stub. Dev entry: `index.html#room=berthing` (assumes hip + engine; add `&test` to run the self-test) |
| `galley.js` | Room 4, Galley / Mess: three trays of three weights (plates, stock pot, cups), oily coast-and-catch with return belts and service lifts, cucumber hop back onto the counter and pepper leap forward onto the shelf, visible planetary repair and rejected-produce egg. GPT-6.1-Sol in Codex; revised by Claude Opus 5.5. Loaded after `berthing.js`; see **Galley** below. Dev: `#room=galley&test`, optional `&verify` for actual-loop/input/isolation/audio checks |
| `observation.js` | Room 5, Observation: low gravity, spring plates, the glass's lift, the telescope and the yarn sighting, and the bots (`OBS.simulate`, `OBS.selfTest`, `OBS.liveTest`). Claude Opus 5.5. Loaded after `galley.js`; see **Observation** below. Replaces the no-op `window.OBS` stub. Dev: `#room=observation&test`, add `&verify` for the real-loop runs, isolation and sound measurements |
| `sanitation.js` | Room 6, Sanitation (the litter box): paw prints in sand, a rake that replays catbot's trail 3 s behind, grates that only the rake trips, sifter screens (one timed), the mound you dig, the sifter drum, the raked-credit egg, and the bots (`SAN.simulate`, `SAN.selfTest`, `SAN.liveTest`). Claude Opus 5.5 in Claude Cowork. Loaded after `observation.js`; see **Sanitation** below. Dev: `#room=sanitation&test`, add `&verify` |
| `hydroponics.js` | Room 7, Hydroponics: cat wheels that pump troughs full, floating rafts, the drain window, catnip puffs (zoomies, then the flop), the main pump, and the bots (`HYD.simulate`, `HYD.selfTest`, `HYD.liveTest`). Claude Opus 5.5 in Claude Cowork. Loaded after `sanitation.js`; see **Hydroponics** below. Dev: `#room=hydroponics&test`, add `&verify` |
| `eggs.js` | Four eggs for rooms that had none (Engine Bay clock, Observation locker, Hydroponics fern, Aft Hold daydream crediting the Claude chat brainstorming), the all-eggs bonus's other half. Claude Opus 5.5 in Claude Cowork. Loaded after `hydroponics.js`; see the all-eggs bonus in **Game structure** |
| `cockpit.js` | Room 8, the Cockpit and the finale: the encore corridor (belt, search lamp, cat wheel and reactor, bulkhead), the yarn reeled in through the cracked windscreen, the pounce into the main-coil socket, then the power-up, liftoff, credits (AI-use lines, every egg with its maker) and the all-eggs bonus card. Claude Opus 5.5 in Claude Cowork. Loaded last; see **Cockpit** below. Dev: `#room=cockpit&test`, add `&verify` |
| `webmcp.js` | WebMCP tools so an AI agent can play: `catbot_status`, `catbot_move`, `catbot_screenshot`, plus `catbot_goto` / `catbot_stage` under `#mcp`. Loaded last; see **WebMCP** below. Delete the script tag and nothing else changes |
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
  Shift-trot: holding a direction for 1.6 s (`GAIT.hold`) breaks into a trot instead, and
  double-tapping a direction (two fresh presses within 0.28 s; key auto-repeat
  is ignored, the touch pads count too) goes straight to that trot until the
  direction is released or reversed (`tap()`, `sprint` in `index.html`).
  Neither works while the hip is broken. The deck plan has no trot. Title, restart and room change are all
  places you walk: first step winds it up, the REWIND tile resets the room,
  the end hatch leaves it.
- **Rooms are data.** `ROOMS[]` in `index.html`: `floorSlip, start, reset,
  crate, plate, gate, part, exit, captions`. The world code reads those
  fields; a new room with the same props should need no new code. Every prop
  is optional (the engine bay has no crate). `part.name` is the toolbox label;
  `rail:[[x0,x1]]` limits the trolley's wall rail to those spans. Room 2's own
  fields (`plats, belts, vents, pocket, carry, socket, noCart, part.y`) are read
  only by `engine.js`, through a handful of commented `ENG.*` hook lines in
  `index.html` (reset, update, wall, deck, front, blocks, camY, audio, tread,
  seat, pickUp); each is a no-op in a room without belts or vents.
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
  `makeStarLog()` and the console; don't remove it. Aft Hold only (it
  could be set off in any room until 2026-10-07; the credits list it as the
  Aft Hold's).
- Easter egg #2, the hub's (approved per `AGENTS.md`, 2026-10-03): sit on the
  plot table for 8 s and a footnote types itself into the blueprint's bottom
  margin, signed Claude Sonnet 5.5 (`FOOT`, `startFoot()`, `drawFoot()` in
  `hub.js`; also logged to the console). Don't remove it.
- **The all-eggs bonus (Tasha's idea, 2026-10-07; registry by Claude Opus 5.5
  in Claude Cowork).** `EGGS` in `index.html` records which eggs this player
  has found (ten): `chase` (Aft Hold), `footnote` (deck plan), `eyes`
  (Berthing: the single eye from waiting under bunk 2, or reading the
  scratch), `doodle` (Berthing), `produce` (Galley), `raked` (Sanitation),
  and the four in `eggs.js`: `tick`, `locker`, `creeper`, `brainstorm` (see
  below). Each egg calls
  `EGGS.mark(id)` where it fires (guarded with `typeof EGGS`, so the node
  tests still load the modules alone). **Silent on purpose:** nothing during
  play says it is counting; the credits / final score read `EGGS.summary()`
  (`{found,total,all,eggs:[{id,room,what,by,found}]}`) and reveal the bonus
  there. Kept in localStorage (`catbot.eggs`) so it spans sessions;
  `EGGS.forget()` clears it. Dev entries with `&test` or `&verify` never
  count, so the bots can't find eggs for a player. A new egg needs an entry in
  `EGGS.LIST` and one `mark()` call.
- **`eggs.js` (Claude Opus 5.5 in Claude Cowork, 2026-10-07, Tasha's request):**
  eggs for the three rooms that had none, themed as nods **by idea only** to
  the TV show whose clockwork droids inspired catbot (none of the show's
  characters, props, names or lines appear: keep it that way), plus one for
  the brainstorming in Claude chat. Hooks `EGGX.reset/update/deck/front`;
  no physics, a no-op elsewhere. Entries carry `nod:true` in `EGGS.LIST`.
  - `tick` (Engine Bay): stand still on the deck belt that runs against you
    (x 740-940) and let it carry you backwards for 2.5 s: the clock on the
    wall above it stops, then runs backwards for about 8 s (`eggRewind`).
  - `locker` (Observation): at the far end of the last gantry, stand still
    beside the narrow STORES 4 locker, facing it, for 2.5 s: the door opens on
    a lit corridor far deeper than the locker (`eggCreak`).
  - `creeper` (Hydroponics): a potted fern on the start apron (x 170) moves
    only while catbot faces away from it (after a 1 s pause, 25 px/s, never
    past the apron) and stops dead when catbot looks. Let it reach catbot and
    it taps it with a frond (`eggRustle`). Hydroponics' start moved 300 → 360
    to give it room.
  - `brainstorm` (Aft Hold): with the hip back, stand still with catbot's
    head under the porthole (either way round) for 4.5 s: catbot daydreams the rooms in thought bubbles (a belt, a
    lamp, a tray, a planet, paw prints, a wheel, the yarn), then "brainstormed
    in Claude chat · Claude Sonnet 5.5" (`eggThink`). Credits Sonnet 5.5's
    brainstorming in Claude chat; drawn by Opus 5.5. Walking off ends it.
    The settings trolley is sent off and kept away while catbot settles in
    (`EGGX.hush()` in `updCart`): it used to park across the bubbles. The
    bubble arc slides to stay on screen.
  Each logs a console line with model ids.

## The hub (`hub.js`)

- **The plan is the goal screen.** One compartment per `DECK.slots[]` entry
  (8: aft hold, engine, galley, observation, berthing, hydroponics,
  sanitation, cockpit), each with one socket. An installed part (`installed`
  Set, keyed by the slot's `part` id) fills its socket with the real disc art,
  warms the room to brass and lights a conduit to the cockpit. The central
  plot table carries the REPAIR ring. `GAME.totalParts = DECK.slots.length`.
- **A slot is sealed unless a `ROOMS[]` entry has its id**, and also while
  its `needs` aren't installed. The chain follows the conduits on the plan:
  aft hold → engine → galley → observation along the top bus, then
  sanitation → hydroponics → berthing back along the bottom. A chained door
  says its own `lock` line once ("Breaker tripped. Power stops at the Aft
  Hold."); an unbuilt one gives the generic line. Add the room and, once its
  `needs` are met, the door opens with no other hub change.
- **The cockpit** waits on every *other slot whose room exists* (`others()`),
  not all eight, so the ending stays reachable if fewer rooms ship; the
  power-up pulse uses the same rule and only runs down the conduits that carry
  power. With two rooms built it fires as the engine socket lights ("Every
  working room is back on line."). Its room isn't built, so the door then
  says "The way in is not built yet". **Open:** the ending's minimum scope
  (how many rooms, what the cockpit does) is undecided. Sealed doors bump the token, flare their lamp, play a "nu-uh" (`nuh`)
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
  one. When the last built non-cockpit socket lights, a pulse runs down the
  lit conduits and the cockpit gets power (`ckOn`).
- **Floor glyphs** (`drawGlyph`) preview each room faintly: belts + vent,
  trays + cucumber, window, bunks + sweeping light, planters, sand + paws,
  crates + recess, console.

## The engine bay (`engine.js`)

Room 2, built with Claude Opus 5.5 from `HANDOFF-engine-bay.md`. Hub hint "The
floors drift. Steam keeps time." The turbine gear sits on a conveyor up under
the ceiling; catbot climbs to it, carries it down in its mouth, and the gear
hops from its mouth into the turbine on the main deck.

- **Layout, left to right:** deck belt with you, deck belt against you (a
  treadmill), a single deck jet with a painted safe pocket, a lift to P1
  (y 100: a jet, a lift), P2 (y 200: a belt drifting back to the edge, a jet,
  a lift), P3 (y 290, hung from the ceiling: a jet, a belt away from the gear,
  the gear, a belt toward the way down), P4 (y 150) as a step down, then the
  turbine and the hatch on the deck. Platforms run on under the next one up,
  so a fall always lands on the level you came from.
- **The beat:** a 2.4 s bar, four beats at 100 BPM, one clock for the room.
  Lifts fire on beat 1, jets on beat 3. A lift lands catbot half a beat later,
  so walking straight on from a landing reaches the next jet as it blows: land,
  wait for it, then go. Every vent warns 0.5 s ahead (wisps, a warming grate,
  a lamp that ramps and never flashes, the hiss) and a board of four beat lamps
  above each vent shows the bar. A careful run is about 40 s with no shoves;
  holding right never gets past P1.
- **Lifts (`vents[].lift:{x,y}`)** are the only way up (no jump: the jam
  rule). Stand on one when it blows and it throws catbot to land on that spot,
  high enough to clear the platform's edge. Green pad with up-arrows, green
  lamp. Walking into a platform's face stops catbot right on its lift.
- **Jets (`vents[].push`)** shove catbot back the way it came (a hop, the
  oops pose, no reset, no rewind count). `push` is the distance on level
  ground; 240 on a platform carries it off the edge, so a hit knocks it down a
  level. Striped grate, amber lamp. Only in `play` mode, with a one-beat
  cooldown.
- **Belts (`belts[]`, `y` = level)** add drift through `ctrl.belt`: planted
  feet ride the belt and `rig.vx` stays catbot's own pace over it, so gait,
  trot and idle read its own effort and standing still is being carried. No
  drift while pouncing (claws in). REWIND and the exit hatch need the player
  walking toward them (`rig.bv` guard), so a belt can't trigger them. Footsteps
  on tread sound different (`tread`).
- **Platforms and floors.** The rig has a floor height now (`rig.fl`,
  `setFloor(nf,fall)`; see *What the rig can't sell*). Each tick `ENG.update`
  takes the platform catbot has risen above, or walks it off an edge into a
  fall. A platform too low to walk under is a soft blocker (`ENG.blocks()`,
  `soft:true`: a cat landing beside one is eased out, not snapped). Landing on
  a different level soaks up 70% of the sideways speed and resets the trot, so
  a fall or a lift throw doesn't skid on into the next jet; a jet's shove on
  the same level keeps its skid. The camera rises with catbot
  (`ENG.camY()`, down to -250).
- **The carry (`room.carry`).** After the pounce the gear doesn't fly home:
  `ENG.pickUp()` sets `st.carry` and the gear is drawn at the muzzle
  (`rig.mouthP()`), chin up. Knocked down, catbot keeps it. On the deck within
  90 px of the turbine it hops from the mouth into the hub (`fly`), then
  `seat()` installs it (`st.got`, `installed`), spins the turbine up and opens
  the hatch. A rewind puts the gear back on the conveyor.
- **The trolley** rides the deck only: it parks off belts, vents, platforms
  and the turbine (`room.noCart`), follows only while catbot is on the main
  deck, and its buttons press only there. Its rail is drawn only along the
  open deck (`room.rail`).
- **Depth layers.** Far (giant turbines, ducting, furnace haze; parallax
  0.35, blur 3), mid (bulkhead I-beams, catwalk rails, pipes and gauges; 0.65,
  blur 1.2), the play plane (live), near (pipes and cables along the top edge
  of the screen; 1.25, blur 4). Each is painted once into an offscreen canvas
  with `ctx.filter` blur baked in, rebuilt lazily when the room or the canvas
  scale changes, and drawn as one cropped `drawImage` a frame; resolution is
  capped per layer (`cap`) since blurred layers don't need it. The near layer
  is pinned to the top of the *screen* (`fixY`, sideways parallax only): with
  vertical parallax it would sink over the platforms as the camera climbs.
  The catwalks in mid are kept thin and dark so they never read as walkable.
  Steam from blasts drifts into the near layer (halved by STEADY). The first
  blast in view racks the far layer sharp for a moment (`rack`), echoing the
  opening's focus pull. No `ctx.filter`: layers fall back to lower contrast.
  Script cost measured at about 1 ms a frame, the same as room 1.
- **Don't name engine.js locals after game globals.** A local `camY` once
  shadowed the camera and the layers drew at NaN. The camera target is
  `camYTarget` inside, exported as `ENG.camY`.
- **Entering from the hub:** `intoRoom()` loads the room while the mode is
  still the hub's, so `ENG.reset()` checks the room, not the mode (it used to
  skip itself there and the first frame threw).

## Berthing (`berthing.js`)

Room 3. Pass 1 (room, hooks, sounds) by Mistral Vibe from `HANDOFF-berthing.md`;
pass 2 (the room as it plays now) by Claude Opus 5.5 from
`HANDOFF-berthing-pass2.md`. Hub hint "Dark. A light sweeps the floor."

- **The rule:** catbot is seen when at least 12 px of its body (`rig.x ± 45`)
  is inside a lamp's floor spot (`beam.half` 110) and not under a bunk, it is
  moving (`|rig.vx|>25`), on its feet, in `play`, not fleeing or hunkering,
  and the 1.5 s cooldown has passed. Standing still in the light is safe. The
  light is top-down and stops at a bunk's top (`BUNK_H` 150), so under a bunk
  is dark in the rule and in the drawing alike (the same columns clip both).
- **One rule set, two consumers.** `stepWorld(W,R,dt,cat)` advances the lamps
  and decides creaks, spots, the dot and the teaching moment from a plain
  `{x,vx,air,play,face}`. `update()` feeds it the rig and turns its events
  into FX, sound and the flee; `simulate()` feeds it a virtual cat. Change a
  rule there and the bot test plays the change.
- **Lamps (`beam.lamps[]`):** each has a `rail`, a `tint`, a start phase
  `ph0`, and a looping `path:[{x,dwell}]`. They travel at `beam.speed` 120 with
  a trapezoid ramp (`accel` 260), never faster, and sway ±12.5 px while parked.
  `patrolX(L,ph,B)` is a pure function of patrol time; the live lamp keeps its
  own phase so the alert can speed it up. A long dwell (≥1.5 s) brightens the
  housing: the lamp is looking. Lamp A (warm) watches gap 2 but every lap
  swings back over bunk 2 and parks in gap 1: you see it pass overhead and go
  behind it (at 120 vs 105 it can't catch a cat from behind), and if it finds
  you in gap 1 that is where you learn to freeze. Lamp B (cool) **never leaves
  gap 3** (a sweep out of it is a light you can follow across), so gap 3 is the
  one you must freeze in: step out while B looks at the far end, hold still as
  it passes over, go behind it. The first version kept A inside gap 2 too; the
  bots could cross it but a person waiting under bunk 2 for it to leave never
  got a moment (Tasha, 2026-10-04), hence the swing. Rails overlap at
  x 1200-1560 (the hand-over).
- **Layout:** w 3400, start 230 (lit by a flickering strip light, steady under
  STEADY), bunks at 380/900/1520/2420 (w 240/200/300/220), so gaps of 280 (lamp
  A swings in once a lap: where you first meet the light), 420 (lamp A, with a
  clean window each lap) and 600 (lamp B, the longest, right before the last
  bunk: needs a freeze); the breaker gear at 2980, hatch at
  3120. `noCart=[[380,3400]]`.
- **What's broken, and the fix:** the room is dark because its main breaker
  lost its gear, which is why the search lamps are on emergency patrol. The
  panel (`MAIN · BERTHING`, at `room.socket`) shows a scorched empty socket
  with a sheared axle that arcs now and then (sparks + `arc`), tripped
  switches and a blinking red lamp; the gear lies on the floor beneath it; a
  conduit runs up to a row of dead ceiling lights (`room.lights`). Install:
  the gear flies into the socket (not catbot's hip; `ENG.seat` is wrapped to
  do nothing here) and spins, the switches go up, the lamp goes green, power
  climbs the conduit and runs along the ceiling at 900 px/s, and each light
  flickers on as it arrives (`lightsOn`). Darkness lifts (.68 to .28 over
  2.5 s), the lamps stand down (`mode:'park'`: roll to the end of their rails,
  cones fade, hum fades) and nothing can see you, creak or tempt you on the way
  to the hatch. Caption "The breaker catches. The lights come back, and the
  lamps stand down." Coming back to a finished room, it is already lit
  (`reset()` checks `installed`). `breaker()`, `lightLevel()`.
- **Spotted:** the lamp flares, `beamLock` + `beamSpot`, a startle hop, then
  catbot **bolts on its own** at 165 px/s to just inside the right end of the
  nearest bunk behind it (or the start), immune while it runs, then hunkers for
  0.8 s and the player has it back. No reset, no rewind count. Caption on the
  first spot "It saw you move."; the rule itself ("Hold still. It only sees
  what moves.") is taught the first time catbot holds still in a spot for 1 s,
  or on the second spot if that hasn't happened yet.
- **Alert (`alert` 0-2):** +1 per spot, -1 per 15 s without one. Reaching 2
  sets 12 s of rage: both lamps' clocks run 25% faster and tint red (cone,
  spot, housing; the housing glow is the alert's visual twin and also rises
  with `alert`). STEADY drops the red flicker, not the speed.
- **Creaky plates (`plates:[{x,w}]`):** gratings at 1200 (gap 2), 2040 (the
  long gap) and 2660 (just before the part), lit faintly from below. Over
  130 px/s on one (trot; walk is 105) it creaks: a ripple ring, `plateCreak`,
  and the nearest lamp that can reach is pulled to the creak at `beam.seek`
  340 px/s (`lampRetarget` whir), stares for `beam.hold` 3 s (a fresh creak
  restarts it), then returns to where it left its patrol. Caption once.
- **The laser dot (the brief's stretch, 2026-10-04 as a laser):** each lamp
  housing carries a red targeting laser whose dot dances 16 px inside the edge
  of its spot (`DOT_IN`), on the side facing catbot, never under a bunk
  (`laserDot`); a faint red line runs up to the housing. A frozen cat facing a
  parked lamp's dot 0-170 px ahead can't help it. The tell is the tail: tip
  twitching faster, ears up, eyes on the dot, then the rump wiggle; at 2.5 s it
  pounces on the dot, which is in the light, so it lands moving and is seen.
  Stepping back or turning away resets it. Lamp A's 2.2 s stop at bunk 2's end
  only teases; lamp B's 2.6 and 2.8 s stops, or a pulled lamp's 3 s stare, can
  fire it (waiting at bunk 3's far end facing B is the classic).
- **Set dressing:** bunks with a sleeper's blanket breathing (about 5 s a
  breath), a pillow, a bunched privacy curtain, the dark under them, a rim light
  and a glowing berth number so the layout reads in the dark. Under each raised
  bunk a two-drawer cabinet against the wall (`STORE[]`, `drawStorage`): drawers
  left hanging open with a sleeve, a sock or a folded shirt showing, boots, a
  duffel, a folded stack, coveralls on an end post. Lockers; the
  breaker panel (its lamp goes green with `st.got`); lamp rails on the ceiling.
  Darkness is one offscreen layer (a .68) with light cut out of it
  (`destination-out`: cones, spots, the strip light, catbot's own glow, the
  gratings, the panel, the hatch lamp), then a little additive tint. No
  per-frame blur, no `ctx.filter`.
- **Easter egg (placed by Mistral Vibe as two ovals, made into eyes by Claude
  Sonnet 5.5, made lurkier 2026-10-04 at Tasha's request):** something lives in bunk 2's half-open right drawer. Small, dim
  eyes in catbot's own eye grammar watch from the crack once catbot has been
  past bunk 2 and follow it; they shut when a lamp comes near, withdraw when
  catbot comes within 150 px, are now and then simply not there, and sometimes
  only one is open. Wait still under bunk 2 for 4 s and a single eye opens in
  the other drawer, the one away from catbot. The signature "Mistral Medium 3.5
  via Vibe" is a 5 px scratch on the cabinet's plinth that catbot's glow
  only reads when it stands close and still (2.5 s). Console line when catbot
  first nears bunk 2. State in `S.lurk`; `lurk()`, `drawEyes()`.
- **Easter egg #2, the laser doodle (approved per `AGENTS.md`, 2026-10-04;
  Claude Opus 5.5):** resist the laser dot three times in one visit (the tail
  was going for over a second, then you walked or turned away) and that lamp's
  laser gets bored: it leaves the floor and draws a cat face on the back wall,
  signs it "Claude Opus 5.5 · hi, Vibe" in a laser scrawl, adds an arrow back
  toward bunk 2's drawer, then fades (9.5 s). Console:
  `LASER DOODLE · Claude Opus 5.5 (claude-opus-5-5) in Claude Code · hi, Vibe`.
  The signature is short on purpose (Tasha: shorthand is fine in favour of
  calling out Vibe). `W.resist`, `W.doodle`, `drawDoodle()`. Don't remove it.
- **The bot test.** `BERTH.simulate(strategy)`: fixed 1/60 step, no drawing,
  the real `stepWorld`. The virtual cat accelerates at 260 px/s², flees as the
  game does (165 px/s, immune, then the 0.8 s hunker), is immune through the
  pounce (4.5 s, ends at `part.x-64`), and finishes past the hatch; 400 s cap.
  Strategies: `frozen` (never moves: 0 spots), `naive` (walks right at 105:
  ≥4 spots), `trotter` (165: ≥3 spots, ≥1 while a lamp is pulled by a creak),
  `smart` (knows the lamps: from cover it goes only if the walk to the next
  safe place is clean, unless the gap can never be crossed clean, then edges
  forward and freezes when a lamp comes; steps back when the tail starts):
  must finish with 0 spots in 60-150 s, and at least one gap must need a
  freeze. `human` (plays by sight: sees the lamps 0.25 s late, judges their
  direction, knows nothing of the paths; freezes when a light is on it or
  coming, waits under a bunk while a light ahead is close and not leaving):
  must finish in 150 s with at most 3 spots. `BERTH.selfTest()` also checks (a) light never reaches under a bunk,
  sampled over a full cycle of each lamp, in the rule (`litLen`), the drawing
  (`isPointInPath` on the clip path `front()` uses) and the cover geometry, and a
  cat tucked under a bunk is never seen; (b) the part and the hatch each get a
  lamp-free window ≥4 s in every cycle-long stretch; (c) `reset()` after a
  spotted, alerted, pulled, fleeing state equals a fresh `loadRoom`, compared as
  the whole state object. Run it: `index.html#room=berthing&test` (logs PASS /
  FAIL per line, result in `window.__berthTest`), or in node by loading
  `catbot.js` then `berthing.js` with `ROOMS`/`W`/`H` stubbed. Last run:
  frozen 0 spots; naive 82 and trotter 81 (49 pulled), neither finishes; smart
  69.6 s, 0 spots, 10 stops in the open, gap 3 needs a freeze; human 68.9 s,
  0 spots.
- **Smart's time depends on when you reach each gap.** Over a grid of lamp
  start phases it ranges about 48-82 s (median about 62; the human bot about
  59 median, 74 worst, half a spot on average); `ph0` A 12 / B 12 is a middling
  start (69.6 s), not the luckiest. (b) passes trivially: no lamp
  patrols the part or the hatch; only a creak on the last plate pulls B there.
- **Hooks:** `index.html` calls `BERTH.reset/update/audio/deck/front` beside the
  matching `ENG.*` lines (7 lines, all from pass 1); pass 2 added none.

## Galley (room 4)

Built by **GPT-6.1-Sol in Codex** (2026-10-04/05); revised by **Claude Opus 5.5 in
Claude Code** (2026-10-05) on Tasha's playtest notes: the coast-and-catch,
the return belt and the mixer repair stay as Codex made them; the room went
from one tray to three, the trays got drawn as trays, and the pepper leaps
forward onto the shelf again. Hub hint "Slidey trays. Something green."

3960 px, three beats: **tray 1** (plates), then **the hops** (cucumber back
onto the prep counter, pepper up and over onto the produce shelf, the egg on
the shelf), then **trays 2 and 3** (the stock pot, the cups). All three
delivered raise the serving hatch; the **MIXER GEAR** flies into the
planetary mixer; the exit opens. Careful run about 64 s (bot 63.6 s, native
loop 63.8 s); one deliberate overshoot and recovery, 74.7 s.

- **Fields:** `galley`, `slick:[{x,w,slip}]`, `trays:[{x,w,mass,home,end,load}]`
  (`load` is `plates`/`pot`/`cups`, drawing and captions only),
  `plates:[{x,w,catchSpeed}]` (tray *i* is delivered on plate *i*),
  `counters:[{x,w,y,name}]`, `produce:[{x,y,kind,range,jump?,kick?,leap?}]`,
  `grill`, plus the usual gate, part, socket, exit, noCart, rail, captions.
  The backdrop's pass-through and mixer are drawn relative to `gate.x`, so the
  far end can move without redrawing.
- **Lanes:** each tray has its own lane from `home` to a rubber bumper at
  `end`, with a return belt under it. A tray blocks catbot until delivered, so
  the lanes come strictly one after another; nothing (a counter drop, a
  produce hop) can put catbot past an undelivered tray. Lane 1 is
  500-1050, lane 2 (pot) 2320-2900, lane 3 (cups) 3040-3600.
- **Three weights** (walk 105 / trot 165, the trot after holding a direction
  1.6 s or a double-tap; see `GAIT` in `index.html`. Codex had shortened the
  hold to 1.15 s for every room; Tasha put it back to 1.6 s, 2026-10-05):
  - *plates*, mass 3.2: the teach. A walk can move it; the coast-and-catch
    as Codex built it.
  - *stock pot*, mass 5: a walk braces against it and nothing happens
    (caption "A walk won't shift it; keep leaning"). Holding on turns the walk
    into the trot, and the trot shifts it. Slow to speed up, so it has the
    widest release window (0.62 s).
  - *cups*, mass 2, `bump:.85`: light, and already on the grease (lane 3's
    slick starts at its home). First touch hands it the cat's pace, capped at
    a walk's, so walking or trotting into it and letting go is the whole move
    (the caption says "Barely a nudge needed"); leaning on for about 0.75 s
    sends it to the belt. The cap matters: the walk from the pot's lift is
    long enough that holding right turns into a trot, and an uncapped trot
    nudge made every first try a miss. Lift at 3200, `catchSpeed` 100. From a
    standstill against it the window is 0.77 s. (First version, 2026-10-05:
    on dry deck, about 4 s of pushing; Tasha: "more than a nudge".)
- **Weight and coast** (Codex's rules, unchanged): front paws brace, pressure
  builds after 0.25 s, static resistance must be overcome; on grip the cat
  pushes at a capped speed, on grease the tray's resistance drops, it can
  outrun the paws and contact ends. Coast drag on grease 16 px/s², on grip
  140. Arrive fully on the plate at or under `catchSpeed` and it brakes
  (1100 px/s²) and seats after 0.8 s at rest; faster, it is conveyed to the
  bumper and the belt returns it home at 85 px/s, pushing catbot back with it.
- **The service lift:** a plate is a lift top. A seated tray is delivered:
  the shaft opens, the tray sinks (`LIFT_DOWN` 1.1 s, clipped at the deck
  edge), the leaves close flush (`LIFT_SHUT` 1.55 s): "ORDER UP", then
  "DELIVERED". Drawing only (`lift[]`); the rules never read it, and a
  delivered tray is flush floor from the moment it seats, as before.
- **The hops:** startles fire when catbot is on a produce item's level,
  facing it, within `range`, and it is armed (it rearms 280 px away after a
  2 s cooldown). The cucumber (deck, 1320) hops catbot **back** onto the prep
  counter (y 120). The pepper (counter, 1480, at the foot of the shelf) has
  `leap:true`: catbot leaps **forward**, up and over it, onto the produce
  shelf (y 220, from 1530), landing about x 1570 at a walk or a trot. Codex's
  version hopped back off the pepper, and the shelf could only be reached by
  walking past it, turning round and coming back from the right; that is gone.
  The deck under the counter stays walkable (the grill shoves only over
  120 px/s), so the shelf is the natural route, not a forced one.
- **Approved egg (Codex's) — rejected produce:** a crooked cucumber marked
  SECONDS on the shelf at 1750. Walk up within 100 px and stop facing it for
  0.9 s: it startles, flips its tag to **GPT-6.1-Sol · REJECTED PRODUCE / Failed the
  cat scan.** Once per visit, reset by REWIND; changes no physics. Don't remove it.
  Once it fires, the signature also writes itself on (left to right, 1.4 s)
  in marker (`Permanent Marker`, already loaded by `index.html`) on a strip of
  masking tape stuck to the shelf lip under the cucumber, and stays for the
  visit (`drawSignature()`, added by Claude Opus 5.5 at Tasha's request).
- **Slip/settings:** mats and elevated surfaces grip; slick spans affect deck
  movement. The trolley stays on the entrance and exit aprons. Drift can't
  trigger REWIND or the exit (`GAL.intent`). STEADY stills the rattling loads,
  the pot's steam and the decorative motion; every hop, shove and catch is
  unchanged.
- **Visible repair** (Codex's): socket at `gate.x+218` / GY-168, above the
  cat; an open gearbox with three planets and a dashed missing centre gear.
  Installed, the carrier, centre gear and whisk turn. `GAL.kitShift` slides
  the kit panel left near the mixer. `ENG.seat` is a no-op here, as in
  Berthing.
- **Sound:** each weight drags its own way (`audio()`, nearest moving tray):
  the *pot* grinds (`galGrind`: low grit, a steel edge, a sawtooth groan;
  every 0.27 s, slower and lower on dry deck) and its lid chatters
  (`galLid`, now and then, more with speed); the *plates* scrape on dry deck
  and glide on grease (`galScrape`/`galRoll`) with a dull stack clack
  (`galClink` at about half pitch); the *cups* only skitter (`galRoll` pitched
  up, quiet) and clink often (`galClink` near full pitch, faster with speed).
  Also `galClatter` (brace, pitched by load), `galChunk` + a slow `galRoll`
  (delivery and the lift), `galSizzle`, `galHeat`, `galStartle`, shared
  `strain`, `unstick`, gate/hatch/socket, `spinup`. Checked by recording the
  `sfx()` calls per lane in the real loop; not heard by ear.
- **Heft (`HEFT` in `galley.js`: pot .5, plates .2, cups .08; room 1's crate
  is 1).** The trays share room 1's `strain` loop and `unstick` crack, which
  made the pot and the plates drag like the crate (Tasha, 2026-10-05).
  `strain()` passes `weight` and the break-free passes a scaled `mag`/`rate`
  (the cups chink instead). Measured at the same effort (amt .9, slide .3):
  strain RMS crate 0.057, pot 0.043 (-2.5 dB), plates 0.029 (-5.9 dB), each
  brighter and chattering faster as it gets lighter, rumble falling with
  weight squared; `unstick` peak crate 0.055, pot 0.024, plates 0.013.

### Galley verification

Load `index.html#room=galley&test`; add `&verify` for three runs through the
real game loop (normal, STEADY, deliberate overshoot), keyboard/touch input,
isolation from the other rooms and the offline sound measurements. The dev
entry assumes hip + engine; `&parts=` overrides. In Node: evaluate the `GAIT`
line from `index.html`, then `galley.js`, in a VM with `ROOMS:[]`,
`window:{}`, `GY:302`, `room:null`, `console`; call `window.GAL.selfTest()`.

The bot (`smart`) pushes each tray with the gait for its weight (walk for
the cups, trot otherwise) and lets go when the predicted coast reaches the
lift at about 40 px/s. It takes the optional egg detour on the shelf and
skips it if it is already past the spot. `explorer` perturbs states along
the whole run (to the gate) with random movement and checks that the bot
still finishes from each in at most eight further pushes. Fixed-seed,
finite coverage, not a proof.

```text
idle:     finished=false, pushes=0,  startles=0
walker:   finished=false, pushes=14, plates=0
trotter:  finished=false, pushes=17, plates=0
smart:    finished=true,  time=61.7, pushes=3, plates=3, grillHits=0,
          startles=2, landings=[120,220], egg=true
explorer: 256 states recovered; worst 3 further pushes; seed=0x6ca7b07
release windows: plates 0.417 s, pot 0.617 s, cups 0.767 s
cups nudge: delivered when released 0-0.5 s after touching at a walk,
            0-0.33 s at a trot; overshoots after a 0.75 s lean
```

All 27 self-test checks pass, among them: every lane returns five overshoot
speeds (from the catch boundary up) to its home apron, and a returned
overshoot in any lane still finishes; a walk cannot shift the pot and leaning
on does; a nudge delivers the cups at either gait and a long lean
overshoots; the pepper leaps forward onto the shelf at a walk and a trot; no
lane overlaps another, a surprise, or a counter's landing; the closed hatch
protects the part and exit.

Native loop (`&verify`, 2026-10-05, trot hold 1.6 s): 61.95 s, three
pushes, zero physics mismatches, part installed, socket aligned, egg, both
landings, no grill hits; same with STEADY on; overshoot run 72.22 s / four
pushes. Input, isolation
(Aft Hold, Engine Bay, Berthing) and sound checks pass. The trays, the leap,
the pot, the cups in flight, the lift and the mixer end were looked at in a
Chromium preview; physical touch feel and the sounds by ear are unverified.

Offline sound measurements (master/limiter output at magnitude/rate 1; the
first seven are Codex's, the last three added with the tray weights):

| Sound | Peak | Energy above 150 Hz | Energy 150–400 Hz |
| --- | --- | --- | --- |
| galClatter | 0.2034 | 100% | 98.6% |
| galChunk | 0.1956 | 100% | 97.4% |
| galScrape | 0.0326 | 99.7% | 26.7% |
| galSizzle | 0.0204 | 100% | 0% |
| galHeat | 0.0469 | 99.8% | 81.3% |
| galStartle | 0.1026 | 100% | 4.2% |
| galRoll | 0.0145 | 99.0% | 97.1% |
| galGrind | 0.0299 | 97.5% | 71.1% |
| galLid | 0.0432 | 100% | 83.5% |
| galClink | 0.0139 | 99.9% | 0.2% |

## Observation (room 5, `observation.js`)

Built by Claude Opus 5.5 in Claude Code (2026-10-05/06) from
`HANDOFF-observation.md`, after a review of that handoff against the code
(Tasha approved the revisions; the handoff carries a note). Hub hint "Low
gravity. Long jumps." Flight, after Berthing's stillness, the Engine Bay's
timing and the Galley's mass.

**What changed from the handoff, and why** (the review, in short):
- `G=2600` is a constant inside `Catbot.update` and the rig ignores input in
  the air, so gravity can't be a room field without touching `catbot.js`. The
  world (`stepWorld`) owns catbot's x, speed and height here; the rig keeps
  springs, legs, poses and the landing, and `OBS.after()` puts its body where
  the world says each tick (as `GAL.after()` does for x). No substep hook.
- Low gravity is only for flights the room starts (throws, falls off a
  gantry, the drop in from the deck plan). The shared pounce and the chase egg
  assume full gravity (`rig.jump(430, d/.36)`) and keep it.
- The route runs **up**, not down: nothing can sit under GY (the floor is
  drawn solid there, the trolley only works at `!rig.fl`). The deck is a glass
  floor over the stars; the way across is a chain of brass gantries. A miss
  comes down on the glass, and the glass between gantries lifts catbot back.
- Holding right is forward lean, so "trotter holds right without steering" is
  impossible: beat 2 is built so the held-right trot **overshoots**, and the
  lesson is to let go or lean back. A walk is the hard gait to produce (1.6 s
  of holding breaks into the trot), so the start is 130 px from the first lip:
  the first try is a walk and falls short.
- The ghost arc shows on the approach (within 260 px), not only on the plate:
  at 105-165 px/s there is no time to read it on the plate.
- No edge grab (the rig can't climb): a landing within 22 px of an end is
  eased onto the top; a lip grazed within 14 px of its height is a landing.
- The telescope "sweep" is an eyepiece inset (`camX` has no module hook), and
  it finds the red thing **snagged on the hull by the cockpit glass**, not
  drifting in space, so the ending only has to reach the cockpit.

**Fields:** `obs:{g,steer,cap}` (520 px/s², 80 px/s², ±60 px/s),
`plats:[{id,x,w,y,solid,hang,rest}]`, `pads:[{x,w,y,vy,to}]`,
`pits:[{x0,x1,nb}]`, `scope:{x}`, plus `start, reset, part (y = the last
gantry), socket (derived: the telescope mount), exit, noCart, rail,
captions`. No `belts`/`vents` (they would wake `engine.js`), no `beam`, no
`galley`. `mine()` is `!!room.obs`.

**Rules (`stepWorld`, 60 Hz, pure):**
- Gait as the shared one (`GAIT`, hold 1.6 s or double-tap). After a landing
  catbot only turns round on a fresh press, for up to 0.45 s, so leaning back
  in the air doesn't walk it off the far side. Turning needs |vx| < 25.
- **Plates:** crossing a plate's far end (the lip) walking right throws
  catbot: vx = its speed there (min 30), vy = the plate's (520). Any speed
  throws; a slow step off is a tiny hop onto the glass. The coil and lamp ramp
  from 260 px out.
- **Air:** g 520. A held direction adds 80 px/s², capped at ±60 px/s of the
  throw's vx (reach about ±100 px over a 2 s flight); nothing steers height.
  The sides of gantries stop catbot (`BODY` 30) and it drops straight down
  (`bonk`); a slung gantry's underside stops a rising head.
- **Landing:** through a top within its span ±22 px (only from above, not off
  its own end), or a graze. Speed ×0.4, gait back to a walk, a 0.6 s soft
  squash (`c.crouch`, lower `c.bodyFreq`). On the glass after a throw = a miss.
- **The lift:** 0.9 s on the glass between two gantries and a current takes
  catbot straight up (above every top between), across (≤360 px/s) and down
  onto the gantry it was **thrown from** (`rest`), whatever pit it fell into.
  Returning to the pit's own neighbour instead let a trot that overshot F
  skip beat 2. No steering, no collisions, no counter.
- REWIND and the hatch need a step toward them on the ground (`OBS.intent`).
  The hatch stays shut until the part is in (the world copies index.html's
  blocker).

**Layout** (w 4260): start 410 (REWIND 22-134, trolley span at the start);
plate on the glass, lip 540 → **G1** (870-1310, y 100): needs a trot that
isn't leaned back; G1's plate → **F** (1530-1670, y 120, slung): only the
held-right trot overshoots; F → **G2** (1910-2380, y 70): forgiving; G2 →
**S** (2650-2870, y 160, slung): a trot; S → **T** (3210-3690, y 200): a
trot leaned forward, from a run-up too short for the 1.6 s hold (tap twice,
or back up). The ASTROLABE GEAR sits mid-T (3500), the telescope at 3600;
off T's end a slow fall to the hatch apron (exit 4020, trolley span there).
Pits 1310-1530, 1670-1910, 2380-2650, 2870-3210.

**The telescope:** the gear flies into the mount's hub (`room.socket`;
`ENG.seat` is wrapped to do nothing here, as in Berthing and the Galley). The
tube swings fore with the `obsServo`; at 1.6 s an eyepiece opens top left,
pans across the stars and stops on the yarn (the opening's colours,
`#f07a8c → #8e2c40`, trailing a thread) caught on an antenna strut by the
cockpit glass; caption at 2 s, gone by 8.5 s. A speck of red stays in the
window's forward end. Console line on the sighting.

**Look:** two star layers baked once (f .08 and .22), a planet limb low in
the window (f .05), twinkling stars and drifting debris drawn live, brass
mullions, the glass floor with stars under it, gantries with trusses or
ceiling cables, back railings, edge lights at every lip, spring plates with a
coil in the slab cutaway. The ghost arc: dashed, green if it comes down on a
gantry, pale blue on the glass, with a bracket for a full lean either way;
standing near a plate shows the walk (blue) and trot (amber) arcs faintly. In
the air the marker slides as you lean. The camera aims at the top of the arc
on the way up. STEADY stills twinkle, edge-light and ring pulses and the arc's
crawl, not parallax. No `ctx.filter`.

**Sound** (new `SOUNDS` entries; offline, master/limiter output, one sound
alone; `land` is the shared rig landing at a full 420, for comparison):

| Sound | Peak | Energy above 150 Hz | Energy 150–400 Hz |
| --- | --- | --- | --- |
| obsBoing | 0.2509 | 100% | 99.2% |
| obsServo | 0.2124 | 98.8% | 96.9% |
| obsDraft | 0.1443 | 100% | 87.9% |
| obsCoil | 0.1077 | 87.1% | 85.8% |
| obsLand | 0.0749 | 91.4% | 90.1% |
| obsBonk | 0.0689 | 99.9% | 99.3% |
| obsHum | 0.0555 | 100% | 99.1% |
| obsGlide | 0.0276 | 99.8% | 3.3% |
| land (shared) | 0.1236 | 6.2% | 2.3% |

In this room `OBS.ev()` swaps the rig's `land`/`thud` for `obsLand` and cuts
their dust and shake to 35%. Every sound has a twin on screen (plate dip and
lamp, ring and dust, the arc, motes and the warming glass, sparks, the tube
swinging). Not heard by ear.

**The bots** (`OBS.simulate(strategy)`, the real `stepWorld` at 1/60):
`idle`; `walker` (holds right, lets go a moment every 1.4 s so it never
trots); `trotter` (holds right and taps twice: trots everywhere, never leans
back); `smart` (per plate, tries walk/trot × lean back/none/forward on a copy
and takes the safest that lands, a walk if a walk will do; in the air it
re-plans the lean every 0.1 s like a person watching the marker; backs off
for a run-up when it is too close to a lip); `explore()` (seeded random play
mixed with smart, sampling resting states; smart must finish from each).
`selfTest()` also throws every plate at 30-165 px/s × three leans and checks
smart can finish from each landing; checks that on the glass nothing walks
past a gantry, the hatch stays shut without the part, the trolley has a span
at each end, `reset()` equals a fresh load, the start-to-lip distance is under
the hold-to-trot distance, and there is room to back up without REWIND.
`liveTest()` (`&verify`) plays smart through the real loop by keys and taps,
with STEADY off and on, comparing the world against a copy stepped by the
bot's rules every tick; forces a miss and checks the lift; calls every hook
in the four other rooms and checks nothing changes. In node: load
`catbot.js`, then `observation.js`, in a VM with `ROOMS:[]`, `window`,
`installed:new Set()`, `inHub:()=>false`, `room:null` and the `GAIT` line.

```text
idle:     finished=false, launches=0, misses=0
walker:   finished=false, launches=1, misses=1 (short at the first plate, then leans on G1's side)
trotter:  finished=false, launches=22, misses=21, lifts=21 (overshoots F forever)
smart:    finished=true,  time=30.17 s, launches=5, misses=0
throws:   150/150 plate landings recoverable
explorer: 190/190 resting states recovered, worst 38 s, seed 0xb5e7ab1
live:     30.23 s both runs, 0 physics mismatches, scope seen, forced miss lifted back
isolation: aft-hold, engine, berthing, galley pass
```

**Not met: the handoff's 50 s floor for smart.** Perfect play takes 30 s;
the self-test prints it as a NOTE, not a pass. A person who misses a few
throws (each costs about 5 s: the fall, 0.9 s on the glass, the lift, the
run-up) should land around 50-70 s, but nobody has played it. If the room
should be longer, add a beat (another slung gantry) rather than slowing the
bot.

## Sanitation (room 6, `sanitation.js`)

Built by Claude Opus 5.5 in **Claude Cowork** (2026-10-07), from the plan in
the Cowork planning chat (mostly Claude Sonnet 5.5; `claude/rooms-6-7-plan.md`
in the project). Hub hint "Sand. It remembers where you walked." (scrawled
LITTER BOX). Memory, after Berthing's stillness, the Engine Bay's timing, the
Galley's mass and Observation's flight.

- **The rule:** paw prints stay in the sand (`SAN.ev` turns the rig's `foot`
  events into prints and a sand crunch). The bay's rake rides a rail on the
  back wall and is wherever catbot was `san.delay` (3 s) ago, raking prints
  smooth as it passes. **Grates only feel the rake**, never catbot. A grate
  opens its sifter screen while tripped, then for `grace` s; a `latch` screen
  instead stays open after for as long as its grate was tripped (a HOLD gauge
  on its post). A screen never closes on catbot (room 1's gate rule) and,
  once the part is in, stays up for good (a revisit walks straight through).
- **One rule set, two consumers** (Berthing's split): `stepRules(w,def,dt,x)`
  is pure and fed catbot's x; the live game feeds the rig's x at 60 Hz, the
  bot feeds a small model of the rig's walk (`stepCat`: accel 260, the 1.6 s
  hold or a double-tap for the trot, a turn on the spot). Nothing in this file
  moves catbot: screens block through `SAN.blocks()`.
- **Layout** (w 3920): start 300, sand 420-3660. Grate 1 (690) → screen 1
  (1000): a plain walk arrives early and waits (the teach). Grate 2 (1250) →
  screen 2 (1800): a walk is late, a trot across the grate makes it; lingering
  can't help, it delays you as much as the rake. Grate 3 (2160) → screen 3
  (3160, timed): even a trot is late; stand on the grate about 1.5 s or more,
  then go. `SAN.timings()` prints the derived windows. Then the mound (3420,
  4 crossings of its middle dig it up; the part sits at `y:-400` until then so
  index.html neither draws nor pounces it), the sifter drum on the wall
  (socket, 3580), the hatch (3760).
- **Repair:** the SIFTER GEAR flies into the drum (`ENG.seat` wrapped to a
  no-op, as in the other rooms), the drum turns, the bed drains a little lower,
  the rake goes home and docks (green lamp). Caption "The sifter turns...".
- **Captions** teach from what just happened: the first trip, waiting at
  screen 2 after its grate was tripped ("Cross its grate faster"), waiting at
  the timed screen, the mound, the repair.
- **Easter egg (Tasha asked for it, 2026-10-07): planning credit.** After the
  repair, sit still in the sand (away from the mound) for 5 s: the rake leaves
  its dock and rakes, letter by letter, ahead of catbot:
  `PLANNED IN CLAUDE COWORK · MOSTLY SONNET 5.5 · RAKED BY OPUS 5.5`. Console:
  the same, with the full model ids. Changes no physics. `eggUpdate()`,
  `drawEggText()`. Don't remove it.
- **Sound** (offline, master/limiter output, one sound alone):

| Sound | Peak | Energy above 150 Hz | Energy 150–400 Hz |
| --- | --- | --- | --- |
| sanDrum | 0.1906 | 93.9% | 92.4% |
| sanScreen | 0.1384 | 95.2% | 89.0% |
| sanTrip | 0.0741 | 98.8% | 96.0% |
| sanStep | 0.0215 | 92.1% | 63.9% |
| sanDig | 0.0206 | 98.1% | 69.6% |
| sanRake | 0.0164 | 100% | 66.2% |

  Twins: the print, the spray at the rake head, the grate lamp and ring, the
  panel moving, the dust kicked back, the drum and chute. Not heard by ear.
- **The bots** (`SAN.simulate`): `idle` (nothing), `walker` (never trots:
  stuck at screen 2), `trotter` (never stops: stuck at screen 3), `smart`
  (walks screen 1, runs at screen 2 from a run-up, lingers 2.4 s on grate 3,
  digs, pounces; retries from a run-up if a screen stays shut), `explore()`
  (seeded random play mixed with smart; smart must finish from each).
  `liveTest()` (`&verify`) plays smart's choices through the real loop by keys
  and taps (STEADY off and on) and checks isolation in the other rooms.

```text
smart:    finished, 40.95 s (bot), 42.65 s (real loop, both runs), 0 retries
walker:   stuck at x 1712 (screen 2);  trotter: stuck at x 3072 (screen 3)
explorer: 60/60 states recovered, worst 55.5 s, seed 0x5a7d0b5
isolation: aft-hold, engine, berthing, galley, observation, hydroponics pass
```

## Hydroponics (room 7, `hydroponics.js`)

Built by Claude Opus 5.5 in **Claude Cowork** (2026-10-07), same plan. Hub
hint "Something in here is catnip." Charge and dash.

- **The wheel** (`wheels:[{x,w,feeds}]`): walking into it facing right runs
  catbot on the spot (`c.belt = -rig.vx`, plus a spring to the wheel's middle;
  the engine bay's belt mechanism). Its pump fills the trough(s) it feeds
  toward the pace's share of a trot (`rig.vx / 165`, capped 1.5) at `fill`
  .55/s. The clutch lets go once the level is as high as that pace can take
  it and at least deck level, and catbot runs out. A walk (.64) never lets it
  go: it keeps the wheel ticking over. Holding right in the wheel turns the
  walk into a trot after 1.6 s, so "hold right" is the first lesson.
- **Troughs and rafts** (`troughs:[{x0,x1,need}]`): the raft is at deck level
  while the level is at `ok` (.75); the water drains at `drain` .1/s once the
  wheel stops. A trot's fill (1.0) holds a raft up 2.5 s; the zoomies' (1.45)
  7 s. A sunk trough blocks like room 1's recess (`HYD.blocks()`, paw
  clearance). A raft sinking under catbot is a soggy hop (the engine bay's
  shove formula) back to the bank it came from. Once the pump is repaired
  every trough stays full.
- **Catnip** (`nips:[{x,r,period,on,ph}]`): a planter puffs a lilac cloud for
  `on` s every `period` s. Standing still in it for 0.4 s (a sniff: a running
  cat never stops for it, so holding right never gets nipped) gives the
  zoomies for 5 s (240 px/s, accel 520, ears and tail up), then a 1.2 s flop
  (no input, slumped and happy), then 1.5 s before catnip works again.
- **Layout** (w 4140): wheel 1 (560) → trough 1 (770-930): a trot's fill
  crosses it. Catnip 1 (1350, on the deck before wheel 2) → wheel 2 (1560) →
  trough 2 (2120-2320): needs the zoomies. Wheel 3 (2650) with catnip 2 puffing
  over the wheel itself → trough 3 (3200-3420): stand in the wheel, wait for
  the puff, then run. Then the PUMP IMPELLER (3700), the main pump on the wall
  (socket, 3830), the hatch (3990).
- **Repair:** the impeller flies into the pump, the grow lights go from
  magenta to white, the plants perk up, sprinkler mist drifts down.
- **Sound** (same method):

| Sound | Peak | Energy above 150 Hz | Energy 150–400 Hz |
| --- | --- | --- | --- |
| hydPumpRun | 0.1278 | 100% | 99.8% |
| hydZoom | 0.1153 | 99.9% | 23.6% |
| hydClutch | 0.0653 | 99.3% | 97.0% |
| hydFlop | 0.0605 | 72.3% | 72.1% |
| hydPump | 0.0545 | 99.9% | 99.5% |
| hydRaft | 0.0526 | 99.9% | 97.9% |
| hydPuff | 0.0450 | 100% | 69.0% |
| hydSplash | 0.0347 | 98.9% | 36.9% |
| hydWheel | 0.0091 | 98.0% | 93.4% |

  Twins: spokes and slats, the clutch lamp, the dashes in the pipe and the
  rising water, the raft, droplets, the lilac cloud, the zoomies pose, the
  flop and dust, the impeller turning. Not heard by ear.
- **The bots** (`HYD.simulate`): `idle`; `walker` (never trots: the clutch
  never lets go at wheel 1); `trotter` (holds right: no catnip, stuck at
  trough 2); `smart` (sniffs catnip 1 then runs wheel 2; stands in wheel 3
  for its puff); `explore()`. `selfTest()` also checks the derived windows,
  that a sinking raft hops catbot back to the near bank on every trough, the
  hatch, the trolley aprons and `fresh()`.

```text
smart:    finished, 38.87 s (bot), 40.47 s (real loop, both runs), 2 zoomies, 0 soggy
walker:   stuck at wheel 1 (x 635);  trotter: stuck at trough 2 (x 2058)
explorer: 60/60 states recovered, worst 38.6 s, seed 0x4d1b7a2
isolation: aft-hold, engine, berthing, galley, observation, sanitation pass
```

**Both rooms, not yet played by a person.** Perfect runs are about 40 s; the
plan targeted 45-70 s for a person. Tonight's tuning: the screen windows and
the rake delay (Sanitation); the drain rate, puff timing and how the flop
feels (Hydroponics); whether either needs a fourth beat.

## Cockpit (room 8, `cockpit.js`): the finale

Built by Claude Opus 5.5 in **Claude Cowork** (2026-10-07), from the five
steps Tasha picked in the Cowork chat ("a bit grand finale-ish"). The yarn is
the main coil; Observation's scope found it snagged on the hull outside the
cockpit glass.

1. **Encore corridor**, on emergency power (red tint until the reactor
   catches): a deck belt running back at you (Engine Bay), a search lamp on
   patrol that only sees what moves, faster than 25 px/s (Berthing; a spot is
   the engine's shove), and a cat wheel (Hydroponics) whose reactor fills
   toward the pace's share of a trot and catches only at a trot. The reactor
   opens the bulkhead for good.
2. **The yarn**: its loose end trails in through a crack in the windscreen.
   Reaching it takes it in catbot's mouth; walking **away** (left, at
   `ckp.pullV` 46 px/s, with the Galley's strain pose and the shared strain
   loop through `CKP.strain()`) reels it. Stopping lets it drag catbot back
   (`ckp.drag`) and the progress decays. At `ckp.pull` 240 px it pops: down
   the hull, in through the CREW ACCESS cat flap, rolls to x 2640.
3. **The coil**: `room.part` is hidden (`y:-400`) until the ball rests, then
   the shared pounce sends it into `room.socket` (the console).
4. **Power-up and liftoff**: mode `'finale'` (control() has no branch for
   it; CKP poses catbot). The seven repairs light on the console in turn,
   the engines rumble, then a screen-space overlay (`CKP.overlay`, drawn
   after `drawCard`) shows the shuttle lifting off. With every egg found its
   portholes have faces in them.
5. **Credits** roll (34 px/s; a step after 3 s skips): run time, rewinds,
   eggs found, MADE BY, the AI-use lines, every egg with its maker (unfound
   ones as "something is hidden here"). Then the end card: "EVERY EGG FOUND"
   with the ten egg icons if `EGGS.all()`, else "THE SHUTTLE FLIES". A step
   or a click fades to the deck plan (a click also skips the credits:
   `CKP.click()`, called from the canvas's pointerdown in `index.html`). **The credit text is the `CREDITS()` list in
   `cockpit.js`**: edit names and lines there.

- The finale starts once, when the coil is seated on this visit
  (`state.seen`). A later visit opens with the coil in; stepping up to the
  console plays the show again (the cockpit has no hatch of its own).
- `CKP.look()` holds the nose in view (camTarget) from the grab until the
  coil is in, as long as catbot fits.
- Hooks in `index.html`: stub, reset, blockers, update, the strain guard in
  `audioFrame`, audio, deck, front, overlay, `look` in `camTarget`, script tag.

```text
smart:    finished, 43.18 s (bot); live: finale at 46.2 s, credits end, both STEADY runs
walker:   never catches the reactor;  trotter: never pulls;  idle: never seen
explorer: 50/50 states recovered, worst 41.9 s, seed 0xc0c4b17
isolation: every other room passes; their own tests still pass with cockpit.js loaded
```

**Not yet played by a person.** Tuning candidates: the lamp's speed, the
pull length, the credits' pace.

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
- **The strain loop takes a `weight`** (0-1, default 1 = room 1's crate,
  unchanged): lighter scales the grit level (.2+.8w), rumble (w²) and groan
  (w) down and the filter centre, grain and stick-slip rates up, so a light
  load sounds light rather than just quieter. `unstick` now scales with `mag`
  (it ignored it before; the crate passes none, so it is unchanged).
- **Weight needs mid, not just sub.** A thud that lives under ~150 Hz vanishes
  on laptop and phone speakers. The crate seating was measured at 8% of its
  energy above 150 Hz and a peak of 0.13 (it read as a faint clang); rebuilt
  with a 150-400 Hz body, a long ring and a smaller settle it is 46% and 0.42.
  The limiter caps every loud sound near the same peak, so heaviness comes from
  spectrum and duration, not input level. `land`, `thud`, `headthud` and `boom`
  are still sub-heavy (under 10% above 150 Hz) and could get the same treatment.
  Measure with an `OfflineAudioContext` + `AUDIO.attach(ctx,true)`.
- **Engine bay sounds** (added by Claude Opus 5.5). One-shots: `hiss` (a
  vent's 0.5 s warning), `vent` (the blast), `venthit` (a jet catches catbot),
  `pulse` (the beat, very quiet), `spinup` (the turbine takes the gear); foot
  has a `tread` variant (`fn` now gets the caller's options as a 4th
  argument). Loops: `belt0..` (one per belt; numbered names share one `LOOPS`
  definition) with level and pan from catbot's distance, and `rumble`, the far
  machinery, behind its own low-pass so it sits back while the near cues stay
  dry (a hum joins once the turbine runs). Fed from `ENG.audio()` in
  `audioFrame()`, stopped outside the bay and on the card. Measured offline
  (peak / share of energy above 150 Hz): `vent` 0.32 / 90%, `spinup` 0.20 /
  43%, `venthit` 0.09 / 98%, `hiss` 0.12 / 100%, `pulse` 0.03 / 45%. Beds,
  as RMS: `rumble` was 0.056 at first (the crate's whole impact, 2% above
  150 Hz: a drone on headphones, nothing on a laptop, and the limiter kept
  busy); now 0.02, belt 0.016. Everything at once (rumble, two belts, two
  blasts, a hit, a heavy landing, the spin-up) peaks at 0.62. When measuring,
  park the game on the card first: the live loop otherwise feeds its loops
  into whatever context is current, offline ones included.
- **Berthing sounds.** `beamLock` (lock-on) and `beamSpot` (the brass bonk)
  from pass 1 (Mistral Vibe); pass 2 (Claude Opus 5.5) added `plateCreak`,
  `lampRetarget` and the `beamHum` loop (`beamHum0`, `beamHum1`: mains hum whose
  pitch follows the lamp along its rail plus a servo whine that follows its
  speed, so a parked lamp's sway is heard; fed by `BERTH.audio`). Pass 1's
  `beamHum` was a one-shot entry fed through `AUDIO.start`, which only knows
  `LOOPS`, so it never played. Measured offline (peak / energy above 150 Hz /
  in 150-400 Hz): `plateCreak` 0.145 / 99.9% / 96.5%, `lampRetarget` 0.093 /
  99.2% / 95.1%. The hum next to a lamp: RMS 0.0195 (0.033 at first, louder
  than the engine bay's beds, so its gain was cut to .07). Not heard by ear.
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

## WebMCP (`webmcp.js`)

Added by Claude Opus 5.5 in Claude Code (2026-10-07) so Codex could play the
game and make the itch.io cover image. Registers tools with
`document.modelContext.registerTool` (falls back to `navigator.modelContext`,
then `provideContext`) when the browser has WebMCP, and always puts the same
tools on `window.catbot` for agents that drive the page by evaluating script:
`await catbot.call('catbot_move', {dir:'right', ms:1200})`. Results are JSON
strings over WebMCP, plain objects through `window.catbot`.

- **Always:** `catbot_status` (mode, room, catbot's x/facing/speed, the
  room's rewind tile, part and exit, the current caption, parts, eggs
  found); `catbot_move` (holds a direction for `ms`, then lets go, through
  the same `keys`/`pulse`/`tap()` a player sets: movement only, so the jam
  rule holds for agents too; `trot:true` double-taps); `catbot_screenshot`
  (renders one frame at `scale` × 720x405, optional `crop` in game px,
  downloads a PNG or returns a data URL; for the 630x500 itch.io cover crop
  510x405).
- **Staging, only with `#mcp` in the URL:** `catbot_goto` (any room or the
  hub, replacing the installed parts), `catbot_stage` (`hud:false` hides the
  toolbox, captions, title and star log; `pause`; `steady`; `sound`). A `#mcp`
  session never counts eggs (`EGGS` treats it like `&test`).
- **Hidden tabs** get no animation frames, so there `catbot_move` steps the
  game's own `tick()` through `ms` of game time at 60 Hz before returning.
- **Hooks in `index.html`:** `paused` and `hud` (in `frame()` and
  `render()`), `mcp` in `EGGS`' testing regex, the script tag.
- Verified 2026-10-07 in a hidden preview tab: room 1 played from the cover
  to the deck plan by `catbot_move` alone (wake, crate, pounce, hatch, card);
  `goto` engine + clean 510x405 crop; registration through a stand-in
  `modelContext`. Not yet tried in a browser with native WebMCP, or by Codex.

## What the rig can't sell (yet)

- **Carrying, really.** There's still no jaw. Room 1's gear flies home by
  itself; the engine bay's is drawn held at the muzzle (`rig.mouthP()`), which
  reads as carried but isn't gripped, and the hop into the turbine covers the
  seating.
- **Grooming is a paw to the muzzle and head bobs.** There's no tongue and
  no licking shape, and it reads as "paw at face" more than "lick".
- **Climbing / steps.** The rig now has a floor height (`rig.fl`; feet,
  events, contact shadows, `toWorld` and the projected shadow all use it) and
  `setFloor()` moves it to a new floor without moving it in the world, so it
  can land on a platform and fall off an edge. It still can't step or climb
  up: the only way up is being thrown (a lift). Room 1's recess predates
  this; catbot still stops at its edge and the recess is still crate-deep.
  The tail clamps to its own floor, so it can float for a moment over an edge.
- **The crate tipping in.** The crate slides into the recess with a small
  scripted lean, not a real pivot on the edge.
- **Looking at the hip.** Head yaw tops out around ¾ turned. "Looks back
  over its shoulder" is yaw plus eyes; it can't really look at its own hip.
- **Purr / kneading as sound.** The sound layer exists now, but only as
  placeholders: there is no purr voice, no kneading rhythm. The ambient tick
  is the seed of the ticking-as-purring idea.

## Open questions

- Berthing: the eyes egg was never formally approved per `AGENTS.md`, but
  Tasha asked for it to be lurkier (2026-10-04), so it stays; the smart bot's
  time spread (48-82 s by start phase, see **Berthing**); no person has
  played gap 3's freeze yet; whether
  the breaker going in should bring the room's lights up (not built).
- Galley is built (room 4): three trays, span-local slip, cucumber and pepper
  hops, grill. No person has played the three-tray version yet; the pot's
  long push (about 7 s to the release) and the cups' rattle want a hand on
  them. Falling cutlery remains a stretch. Rooms 5+ / idle director /
  yarn-as-main-coil remain designs from the Sonnet chat.
- Observation is built (room 5). No person has played it; the throws' feel,
  the lean's strength and the 30 s perfect run (under the handoff's 50 s) want
  a hand on them. The scope puts the yarn on the hull by the cockpit glass:
  the ending should pick it up from there. With room 5 built, the cockpit now
  also waits on the observation socket (`others()`).
- Sanitation (room 6) and Hydroponics (room 7) are built (2026-10-07, Claude
  Opus 5.5 in Claude Cowork) and unplayed by a person; see their sections.
  With them, the cockpit waits on seven sockets.
- The cockpit and finale are built (room 8, see **Cockpit**), unplayed by a
  person. The credits read `EGGS.summary()` and reveal the all-eggs bonus.
- Hip gear is catbot's own socket, but the deck plan shows it as slot 1 of
  the shuttle (the aft hold's socket). Left that way; revisit if the story
  wants the hip kept off the shuttle blueprint.
- How the yarn travels. The cockpit is its socket and sanitation is "where
  you'd bury it". The engine bay's carry (`room.carry`, `st.carry`) could take
  it there now, but only within a room; carrying between rooms isn't built.
- Re-entering a finished room (aft hold) replays it with the part already in,
  so the hatch opens straight away. Fine for now.
- Sounds were verified by trace, meter and offline-style barrage, not by ear.
  Expect to retune levels, pitches and the ambient tick once they've been
  heard. Hub sounds, a wind-down that actually drains `rig.E`, and any music
  are not started.
- The engine bay's sounds are measured, not heard by a person yet; expect
  to retune (the vent's body, the belt clatter, the pulse level).
- Folder name is lowercase `catbot` (category convention is PascalCase);
  rename before it's linked from `games-index.html`, if it ever is.

## AI-use disclosure log (for the jam submission)

From the signatures in the file headers; add a line whenever a model touches a file.
- GPT-6.1-Sol (Codex), planned: the itch.io cover image, made by playing the
  game through the WebMCP tools. Already credited in the in-game credits
  (`CREDITS()` in `cockpit.js`); update both if the cover ends up made
  another way.
- Claude Opus 5.5 (Claude Code), 2026-10-07: `webmcp.js` (WebMCP tools so an
  AI agent can play the game, staging and screenshot tools under `#mcp`), its
  hooks in `index.html` (`paused`, `hud`, `#mcp` in `EGGS`, script tag), and
  two credits lines in `cockpit.js`.
- Claude Opus 5.5 (Claude Cowork), 2026-10-07, playtest fixes: the porthole
  egg keyed to the head and the trolley kept clear of it, the tail chase
  limited to the Aft Hold, the credits and end card clickable, the cockpit's
  deck-plan tag updated once it has power.
- Claude Opus 5.5 (Claude Cowork), 2026-10-07: the Cockpit and finale
  (`cockpit.js`: rules, bots, self-test, live test, art, liftoff, credits,
  bonus card), the `CKP` stub and hook lines in `index.html`, eight `ck*`
  sounds in `audio.js`, and the intro SKIP label made clickable (it was drawn
  but had no handler). Steps chosen by Tasha in the Cowork chat.
- Claude Opus 5.5 (Claude Cowork), 2026-10-07: `eggs.js` (the clock, the
  locker, the fern, the daydream), its `EGGX` stub and four hook lines in
  `index.html`, four `EGGS.LIST` entries, four `egg*` sounds in `audio.js`,
  and Hydroponics' start moved to 360. The daydream credits the brainstorming
  done with Claude Sonnet 5.5 in Claude chat.
- Claude Opus 5.5 (Claude Cowork), 2026-10-07: the `EGGS` registry in
  `index.html` (the all-eggs bonus, Tasha's idea) and one `EGGS.mark()` line
  at each egg in `index.html`, `hub.js`, `berthing.js`, `galley.js` and
  `sanitation.js`.
- Claude Opus 5.5 (Claude Cowork), 2026-10-07: rooms 6 and 7 (`sanitation.js`,
  `hydroponics.js`: rules, bots, self-tests, live tests, art, repairs), the
  `SAN`/`HYD` stubs and hook lines in `index.html` (reset, blockers, update,
  events, audio, deck, front, script tags), 15 new `san*`/`hyd*` entries in
  `audio.js`, the raked planning-credit egg, and these sections. Planned in the
  Cowork planning chat, mostly with Claude Sonnet 5.5.
- Claude Opus 5.5 (Claude Code), Observation, 2026-10-05/06: reviewed
  `HANDOFF-observation.md` against the code and revised the design (route up,
  lift back to the launch gantry, lean-back lesson, approach-time ghost arc,
  eyepiece, yarn by the cockpit); built room 5 (`observation.js`: rules, bots,
  self-test, live test, art, telescope beat), the `OBS` hook lines and stub in
  `index.html`, eight `obs*` entries in `audio.js`, and this section.
- Claude Opus 5.5 (Claude Code), Galley revision, 2026-10-05: three trays
  (plates, stock pot, cups) with per-lane tuning, loads drawn on the trays and
  the service-lift delivery; the pepper's forward leap onto the shelf and its
  bell-pepper drawing; the backdrop and mixer following the gate; the bot and
  self-test made per-lane (release windows, overshoot returns, the pot's
  walk/trot, the leap), and a fix to the bot's egg detour; `galley.js` and
  this file only.
- Claude Opus 5.5 (Claude Code), Galley follow-up, 2026-10-05: the cups as a
  real nudge (`bump`, on the grease from home, lift moved closer); per-weight
  drag sounds in `galley.js` and three new `SOUNDS` entries in `audio.js`
  (`galGrind`, `galLid`, `galClink`); the self-test reads `GAIT.hold` instead
  of a hard-coded 1.15 s.
- Claude Opus 5.5 (Claude Code), Galley heft, 2026-10-05: a `weight` param on
  the shared `strain` loop and `mag` scaling on `unstick` in `audio.js`
  (both default to room 1's crate, unchanged), and `HEFT` per tray load in
  `galley.js`.
- Claude Opus 5.5 (Claude Code), 2026-10-05: GPT-6.1-Sol's egg signature written in
  marker on masking tape on the shelf under the crooked cucumber
  (`drawSignature()` in `galley.js`); the egg itself is still GPT-6.1-Sol's.
- GPT-6.1-Sol (Codex), Galley polish, 2026-10-05: implemented the user-approved
  grease release, coast-and-catch/return belt, opposite-side pepper approach
  and visible planetary mixer repair in galley.js; added the kit-position hook
  in index.html; extended native recovery/visual checks and updated CLAUDE.md.
- GPT-6.1-Sol (Codex), Galley revision, 2026-10-04: implemented the user-approved
  heavy-push/vegetable traversal redesign and rejected-produce egg in galley.js;
  shared 1.15 s gait timing and galley camera hook in index.html; updated the
  native-loop/input/recovery checks and room documentation in CLAUDE.md.

- GPT-6.1-Sol (Codex), Galley: `galley.js` room, shared physics, bot/explorer/self-test,
  cached canvas art, approved cucumber-revenge egg and its GPT-6.1-Sol signature;
  galley integration/slip/strain hooks in `index.html`, seven new `SOUNDS`
  entries in `audio.js`, and the Galley documentation/disclosure in `CLAUDE.md`.

- Claude Opus 5.5 (Claude Code): the rig (`catbot.js`), room 1 and the game
  loop (`index.html`), the opening (`opening.js`), room 2 (`engine.js`), and,
  for room 2, the floor-height and belt support in `catbot.js`, the unlock
  chain and cockpit rule in `hub.js`, the engine bay sounds in `audio.js`, and
  the double-tap trot.
- Claude Sonnet 5.5 (Claude Code): the eyes of berthing's egg under bunk 2
  (Vibe's ovals turned into eyes), the deck plan hub (`hub.js`), the sound
  layer (`audio.js`), and the gameplay design chat for rooms 2+.
- Claude Opus 5.5 (Claude Code), berthing pass 2: the two-lamp patrol, alert,
  creaky plates, flee, the dot, set dressing and lighting, the bot test and
  self-test in `berthing.js`; `plateCreak`, `lampRetarget` and the `beamHum`
  loop in `audio.js`; then the laser dot, the lurkier eyes, the under-bunk
  storage and the laser-doodle egg.
- Mistral Vibe (Mistral AI): room 3 berthing (`berthing.js`), its hook lines and
  dev entry in `index.html`, the berthing slot unlock in `hub.js`, and the
  berthing sounds in `audio.js`.
