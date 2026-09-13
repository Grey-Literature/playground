# Tinwater Garden

A small, unruly Central Texas water garden. Open `../tinwater-garden.html` directly, or serve the portfolio with any static HTTP server. No dependencies, build, account, API keys, or network services are needed at runtime.

## Playing

Tap a cup for a little rock. Drag a rim sideways or vertically to rotate it around its pivot; hold to resist the load, and release to let it find its balance. The main cascade has five cups. Tip the third cup backward to feed the smaller side cup. Water follows the actual lips and trajectories, collects in soil depressions, and soaks away.

Drag a fallen leaf into a cup or puddle. Ruffle a flower to scatter visitors. At night, a tap on the occupied warm rock or a nearby splash sends the Mediterranean house gecko into hiding. The green anole takes the day shift. Time runs through a twelve-minute day, with a slider to explore and hold any moment.

Keyboard: 1–6 selects a cup; left/right arrows rotate and hold; Space toggles holding; Escape releases all cups. Mouse wheel, pinch, and +/− zoom. Background dragging pans; ↔ fits the entire illustration. Narrow screens initially frame the complete cup cascade more closely. The ? button opens instructions, volume, and reduced decorative motion.

The approved easter egg: at night, tip the second cup backward toward the fly near the orb-weaver. A sufficiently sustained redirected stream nudges the fly into the web. The spider wraps it and a visible “A little help from OpenAI GPT-6” label remains for 24 seconds. Once per page visit; it does not interrupt interaction. Original implementation: OpenAI GPT-6, through Codex.

## Structure and verification

`physics.js` models counterweight/load torque, rotating collecting surfaces, volume-carrying ballistic water parcels, soil infiltration and surface exchange. Its water budget includes cups, airborne parcels, soil, infiltration and escaped water. `wildlife.js` owns ambient behavior and the hidden interaction. `render.js` paints the scene. `audio.js` responds to the same impacts and flow; `main.js` handles input, accessibility controls, time, and lifecycle.

Run `node tinwater-garden/check.cjs` from the toys directory for deterministic simulation checks and `node tinwater-garden/input-check.cjs` for the browser-shaped input/lifecycle harness. Both passed during implementation. The latter is a test harness, not a replacement for a browser. Physics advances at 120 Hz independently of rendering. Long tab absences pause simulation and audio instead of generating a backlog. Audio voices and decorative particles have fixed bounds. Only time/cycle and volume preferences persist; sound always starts muted.

Browser verification covered desktop and 390×844 layouts, day/night rendering, keyboard selection/holding/release, successful decoding of both recordings, the real spider trigger, and absence of console errors. The automated browser's URL policy blocked opening a `file://` page, so direct-file playback was packaged and its embedded bytes checked, but not verified in that browser. The static HTTP preview was verified. Sound uses real recordings; final perceptual fidelity still benefits from listening on the intended speakers/headphones.

## Sound credits

Both recordings are released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The following high-quality MP3 previews are distributed locally under that license. They are decoded in the browser, excerpted and layered, with filters, subtle variation and added metal resonance. No recording from Growbot is used.

- **Water_Pour_In_Metal_Bowl**, SonicOddities, 2026-01-05. [Source and license](https://freesound.org/people/SonicOddities/sounds/841155/). [Source MP3](https://cdn.freesound.org/previews/841/841155_410492-hq.mp3). Stored as `assets/water-pour.mp3`.
- **Water dripping on metal.wav**, deleted_user_2104797, 2012-10-03. [Source and license](https://freesound.org/people/deleted_user_2104797/sounds/166324/). [Source MP3](https://cdn.freesound.org/previews/166/166324_2104797-hq.mp3). Stored as `assets/metal-drips.mp3`.

`assets/audio-data.js` is a byte-for-byte base64 representation of those same MP3s, loaded only for `file://` playback. `node tinwater-garden/pack-audio.cjs` regenerates it if the recordings change; the checked-in output means visitors never need to run it.

## Art and generation prompts

The built-in image-generation tool created the original background `assets/garden.png` and transparent sprite sheet `assets/botanicals.png`. The image-generation skill shaped the production layout around a quiet opening for the live simulation, and kept interactive leaves and sprigs separate. They are original assets inspired by Growbot’s illustrated botanical atmosphere, not extracted game art. Wildlife, cups, water, web, lighting and UI are drawn or styled in code.

Background prompt: “Production background painting for an interactive 2D garden, landscape 1536×1024. Original whimsical, exquisitely detailed Central Texas backyard miniature, inspired by Growbot’s hand-painted botanical wonder and eccentric delicacy. Gouache and translucent watercolor on subtly textured paper, fine sepia pencil details; parchment light, sage and moss greens, faded ochres, dusty rose and lavender. Intimate ground-level theater with layered depth. Middle 55%, x=27–79%, y=8–76%, quiet pale warm negative space for later animated cups and water. No painted cups, chains, streams, critters or letters. Left: messy volunteer sunflowers, prickly pear, wiry grass. Right: tangled passionflower and morning glory around old crooked wood. Lower left: fairy flowers and Mimosa latidens. Bottom 22%: irregular limestone, empty sandy depressions, low weeds, gravel, roots, weathered horizontal wood lower right, exposed warm rock left-center. Thin branch projects into upper right middle for a later spiderweb. Copper pipe end enters near x=47%, y=8%, no painted water. Organic asymmetry, diffused background foliage, full bleed, no UI, text or watermark.”

Botanical prompt: “Transparent botanical sprite sheet, four separate cutouts with generous spacing in a 2×2 grid. Upper left: horizontal ochre-brown fallen oak leaf, stem left, fine vein. Upper right: sage green lanceolate leaf, horizontal stem left. Lower left: graceful Mimosa latidens sprig with paired leaflets and two pale pink puffball flowers, stem bottom-center. Lower right: curling passionflower vine, complex pale lavender flower and two lobed green leaves, stem bottom-center. Gouache/watercolor, fine sepia pencil strokes, paper grain inside silhouettes only, muted sage/olive/pink/ochre, delicate picture-book botanical illustration. Genuinely transparent background, no external shadows, ground, rectangle, text, borders or watermark.”
