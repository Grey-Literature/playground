# Stalacpipe Cavern

An interactive subterranean lithophone inspired by Leland W. Sprinkle’s 1954–1957 **Great Stalacpipe Organ** inside Luray Caverns, Virginia. Open `../stalacpipe-cavern.html` or serve the portfolio with any static HTTP server. No external dependencies, build steps, API keys, or audio files are needed at runtime.

## Playing

Press or slide across the 37-key electro-mechanical console (`C3` to `C6`), or sweep your lantern pointer directly across the 37 limestone stalactites hanging across three depth vaults (*Near Vault*, *Cathedral Hall*, and *Deep Alcove*).

When a key closes a circuit:
1. A 1950s relay clicks at the console and sends an amber electrical pulse racing along a thin copper wire snaking up the cave roof.
2. A hinged solenoid mallet beside the assigned stalactite swings in to strike the limestone formation.
3. The rock shimmers with internal calcite luminescence, micro-oscillates, excites harmonic neighbors (`±7` and `±12` semitones), and shakes loose mineral water droplets that fall into the subterranean mirror pool below.

### Console Controls
- **Mallet**: Choose between **Gum Rubber** (warm, hollow fundamental), **Weathered Felt** (soft attack, deep organ sustain), and **Calcite Hammer** (crystalline modal stone overtones).
- **Scale Lock**: Switch between **37-Key Chromatic**, **Cavern Pentatonic**, **Subterranean Lydian**, and **Deep Dorian** so sweeping glissandos always lock to the chosen harmonic world.
- **Seepage**: Controls ambient cave water droplets (**Slow Seep**, **Living Cave**, or **Dry Stone**) so the cavern gently plays itself when left idle.
- **Schematics**: Reveals Leland Sprinkle’s 1950s copper relay paths, acoustic distances (in feet across the 3.5 acres), and tuned frequencies (`Hz`).
- **Keyboard**: `Z–M` plays the lower octave, `Q–P` and `A–L` play the middle and upper octaves, `Space` sends a sympathetic **Cathedral Chord** ripple across the cave, `Shift+W` toggles schematics, and `Esc` closes the field notes.

## The Approved Easter Egg

On the far right cavern wall (`x ≈ 96%`) hangs a rough, un-wired 38th limestone formation (`No. 38 [unwired]`). Clicking or rubbing it three times grinds down its rough calcite crust (showering sandstone sparks and raising its pitch from `418.0 Hz` → `429.5 Hz` → `436.2 Hz` → `440.0 Hz`), just as Leland Sprinkle tuned the real Luray Caverns stalactites with an angle grinder. On the third pass, it locks into pure `440.0 Hz` resonance, sweeps an A-Lydian sympathetic chord across the cavern, and illuminates a recessed brass surveyor’s plaque:

> **Surveyed & tuned by Gemini 4 Argon · Antigravity**

## Structure and Verification

- `physics.js` models the 37 deterministic stalactite profiles, copper wire pulse propagation, damped-spring mallet kinematics, sympathetic neighbor resonance, falling mineral droplets, mirror-pool ripples, scale quantization, and the 38th formation tuning state.
- `audio.js` synthesizes the 1950s relay clicks, distance-delayed mallet impacts, inharmonic limestone bar partials (`1 : 2.0 : 2.756`), water drop chimes, and a procedural 3.6-second stereo cavern convolution impulse response.
- `render.js` paints the three cavern depth tiers, copper relay wiring, glowing calcite veins, subterranean mirror-pool reflections, and the surveyor’s plaque.
- `main.js` manages multi-touch/pointer glissando on both the keybed and cavern ceiling, computer keyboard mapping, and tab visibility pause/resume.

Run `node pianoFidget/check.cjs` from `fidgetToy/toys/` for deterministic physics, scale-quantizer, droplet-to-ripple, and easter-egg state verification (local `.cjs` check scripts are ignored via `.gitignore`).
