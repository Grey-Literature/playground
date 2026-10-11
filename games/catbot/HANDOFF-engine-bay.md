# Handoff: Engine Bay (room 2)

Build the second room of Catbot and wire its unlock into the deck plan. Sound and depth of field are built with the room, not afterwards. Deadline for the whole game is 2026-10-09 07:00, so favor a finished, readable room over an ambitious one.

## Read first

- `CLAUDE.md` (rig spec, game structure, hub, audio). It overrides assumptions.
- `index.html`: `ROOMS[]`, `control()`, `updCart()/cartFree()`, `drawRoom()`, `audioFrame()`.
- `hub.js`: `DECK.slots[]`, `gated`, `built`, `allOthersShown`, the conduit pulse.
- `audio.js`: header comment and the `SOUNDS` table.
- `AGENTS.md` (repo): easter-egg and identity protocol. Don't remove the two existing eggs.

## Ground rules

- Movement is the only verb. No action, jump or interact input. Context comes from where catbot is and whether it is moving.
- Plain HTML/JS, no build step, no external assets. Art is drawn in canvas, audio is synthesized (Web Audio). Nothing with an unclear rights status.
- Fail states stay soft: a shove, not a reset. This is the first hazard room, so don't set a harsher precedent.
- Gameplay must work with sound muted and with `settings.calm` (STEADY) on. Every audio cue needs a visual twin.
- Put the room in its own file (`engine.js`, loaded after `hub.js`), the way `opening.js` and `hub.js` are. Keep hook lines in `index.html` small and commented. Sign the header with your model identity.

## 1. Unlock chain (hub.js)

The wiring in the deck plan already shows the order: power leaves Aft Hold, climbs the left edge and runs the top bus east. Follow it.

- Add `needs:[]` to `DECK.slots[]`. `engine` needs `aft-hold`. `galley` needs `engine`, `observation` needs `galley`. For the bottom bus, `sanitation` needs `observation`, `hydroponics` needs `sanitation`, `berthing` needs `hydroponics`. Only the first matters today, but write the whole chain.
- `sealed(s)` should treat unmet `needs` as sealed. Per-slot caption for a gated hatch, for example "Breaker tripped. Power stops at Engine Bay." The existing generic text is the fallback.
- Cockpit gating: today `req:'others'` needs every other socket lit, which makes the ending unreachable if not all 8 rooms ship. Change it to "every other slot whose room exists in `ROOMS[]`". Leave a plain note in `CLAUDE.md` that the ending's minimum scope is still open.
- Check that `HUB.hasNew()`, the card, and the sockets/pulse behave when only two rooms exist.

## 2. The room: drift and rhythm

Engine bay hint in the hub is already "The floors drift. Steam keeps time." and the floor glyph shows belts plus a vent. Match both.

- Room data: `id:'engine'`, `name:'Engine bay'`, `w` around 1900. New fields: `belts:[{x,w,v}]` (px/s, sign = direction) and `vents:[{x,w,beat,duty}]`. Keep `start`, `reset`, `part:{x,id:'engine'}` (a turbine gear), `exit`, `captions`.
- Belts add drift to grounded catbot inside the span. Planted feet should ride the belt (compare how `c.slip` smears feet in `catbot.js`), so walking against one reads as a treadmill. Standing still on a belt means being carried. The pad logic needs `|vx|<25`, so pads can't be pressed there. Make sure idle/sit/loaf logic doesn't misfire on a drifting cat, and that drift can't trigger REWIND or the exit hatch by accident.
- Vents fire on a shared beat. A bar is 2.4 s, four beats at 100 BPM. Vents fire on beats 1 and 3, staggered between vents. Each has a visible telegraph (wisp, lamp, grate glow) about 0.5 s before the blast. A blast shoves catbot back about 120 px and plays the `oops` pose, with no reset and no rewind count.
- Layout in three beats: (a) a short belt helping you, then one against you; (b) a single vent with a safe pocket; (c) a belt carrying you toward a vent, where timing the walk is the puzzle. Then the turbine gear, then the hatch.
- `cartFree()` must exclude belt and vent spans plus a margin, so the trolley never parks on a belt or in a jet. Settings are still places: the trolley parks on solid floor.
- Captions, two or three at most, dry. For example "The floor has opinions." and "Steam keeps time. So can you."

## 3. Depth of field

The bay is machinery at several distances; the playing field is one sharp plane.

- Layers: far (big turbine, ducting, haze), mid (bulkheads, catwalks), play plane, near foreground (pipes, cables crossing, a little steam). Each scrolls with its own parallax factor of `camX`.
- Do not blur per frame. Render each depth layer once to an offscreen canvas (rebuild on resize) with `ctx.filter` blur baked in (see the `FILTER` flag in `index.html`), then draw with parallax offset. Budget for a mid-range laptop and a phone.
- Readability first: nothing in the near layer may sit over belts, vents, telegraphs, the part, or catbot's feet. Keep near-layer contrast low and let it frame, not occlude.
- Steam from vents lives on the play plane (sharp, readable). A little of it can drift into the near layer.
- `settings.calm` reduces near-layer steam pulses and any flashing. Parallax itself is fine.
- Optional, only if cheap: a focus rack (far layer sharpens a hair) on the first vent blast, echoing the opening's focus pull.

## 4. Sound, built with each mechanic

Use the existing audio.js plumbing: add an entry to `SOUNDS` and call `sfx('name',{x})` on the same line as the visual (`FX.*`) where it happens; loops via `AUDIO.start/stop` fed from `audioFrame()`.

- Belts: a motor loop per span, pitch and level follow belt speed and catbot's distance, panned by `x`. Footsteps on belt tread should differ slightly.
- Vents: telegraph = rising hiss (about 0.5 s), blast = noise burst with a 150-400 Hz body so it survives laptop and phone speakers (see the "weight needs mid" note in `CLAUDE.md`), then a short decay.
- Room pulse: a very quiet engine pulse on every beat, so the 2.4 s bar is felt. Use `AUDIO.music.setLayers` if it helps, but don't build a score.
- Depth: far-layer rumble is muffled (`AUDIO.muffle`), foreground cues are dry. Sound should agree with the picture's depth.
- Shove: the vent-hit sound plus the existing ear/tail reactions. Part install reuses `socket`.
- Measure like `CLAUDE.md` says (`OfflineAudioContext` + `AUDIO.attach(ctx,true)`): report the share of energy above 150 Hz and the peak for the new heavy sounds.

## Order of work

1. Unlock chain and cockpit gating in `hub.js`, plus a way to jump straight into the room for testing (for example a `#room=engine` dev entry next to `#hub&parts=hip`).
2. Gray-box room: belts and vents with real feel, each landing with its sound in the same commit. Telegraphs first.
3. Trolley/`cartFree()` and idle/pad edge cases.
4. Art and depth layers.
5. Mix pass and mute/calm checks.
6. Update `CLAUDE.md`: new room fields, the layer system, the new sounds, the unlock chain, the open ending-scope question. Record your model identity for the AI-use disclosure log.

## Testing notes

- The game loop runs on `requestAnimationFrame`, which pauses in a hidden tab. If you test with browser automation, keep the tab visible or step `tick()`/`render()` yourself.
- Settings persist in `localStorage` (`catbot.settings`). Restore them after toggling.
- Check: mute on, STEADY on, touch pads, the trolley parking near the room, rewind, and returning to the hub with the new socket lighting.

## Done means

Aft Hold, then the hub, then Engine Bay opens, then the turbine socket lights, and the hub's next door follows the chain. The room is readable muted, shoves rather than punishes, and doesn't drop frames with the depth layers on.
