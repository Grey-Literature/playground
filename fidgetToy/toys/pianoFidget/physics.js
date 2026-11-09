(function (root) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

  const SCALES = {
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    pentatonic: [0, 2, 4, 7, 9],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10]
  };

  const FORMATION_NAMES = [
    'Giant’s Column', 'Pluto’s Pillar', 'Saracen’s Tent', 'Empress Drapery',
    'Titania’s Veil', 'Sentinel Spire', 'Dream Lake Hang', 'Cathedral Arch',
    'Organ Pipe West', 'Ghost Flute', 'Weeping Blanket', 'Calcite Curtains',
    'Sunken Totem', 'Chime Needle', 'Banshee’s Rib', 'Ochre Stalactite',
    'Double Column', 'Frozen Cascade', 'Amber Icicle', 'Leland’s Fork',
    'Mirror Hang', 'Hollow Straw', 'Aragonite Fang', 'Vault Pendulum',
    'Silver Lance', 'Crystalline Fin', 'Shadow Spire', 'Echo Blade',
    'Soda Straw IV', 'Gypsum Whisper', 'Lantern Drop', 'Bell Drapery',
    'Glass Stalactite', 'Fairy Needle', 'High Belfry', 'Starlight Tip',
    'Seraphim Spire'
  ];

  const HUE_TYPES = ['amber', 'cyan', 'gold', 'rose'];

  // Deterministic pseudo-random generator for reproducible cavern geology
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function midiToFreq(midi) {
    return +(440 * Math.pow(2, (midi - 69) / 12)).toFixed(2);
  }

  function quantizeIndex(index, scaleName) {
    const clamped = Math.max(0, Math.min(36, Math.round(index)));
    const allowed = SCALES[scaleName] || SCALES.chromatic;
    if (allowed.length === 12) return clamped;

    const octave = Math.floor(clamped / 12);
    const semitone = clamped % 12;
    let bestSemi = allowed[0];
    let minDiff = 99;
    for (let i = 0; i < allowed.length; i++) {
      const diff = Math.abs(allowed[i] - semitone);
      if (diff < minDiff) {
        minDiff = diff;
        bestSemi = allowed[i];
      }
    }
    return Math.max(0, Math.min(36, octave * 12 + bestSemi));
  }

  function isIndexInScale(index, scaleName) {
    const allowed = SCALES[scaleName] || SCALES.chromatic;
    return allowed.includes(index % 12);
  }

  function createWorld() {
    const rand = mulberry32(19540937); // Leland Sprinkle 1954, 37 stalactites
    const poolSurfaceY = 0.79;

    const stalactites = [];
    for (let i = 0; i < 37; i++) {
      const midi = 48 + i; // C3 (48) to C6 (84)
      const semitone = i % 12;
      const octave = 3 + Math.floor(i / 12);
      const noteName = NOTE_NAMES[semitone] + octave;
      const isBlack = BLACK_SEMITONES.has(semitone);

      // Depth tier: weave across near (2), mid (1), far (0) vaults
      const layerIndex = (i % 3 === 0) ? 2 : (i % 3 === 1 ? 1 : 0);
      const layerName = layerIndex === 2 ? 'near' : (layerIndex === 1 ? 'mid' : 'far');

      // Spatial X across 0.045 .. 0.905 (leaving 0.955 for the 38th unmapped stone)
      const baseProgress = i / 36;
      const jitter = (rand() - 0.5) * 0.011;
      const xNorm = Math.max(0.04, Math.min(0.91, 0.045 + baseProgress * 0.86 + jitter));

      // Ceiling attachment Y and length: bass notes are longer/wider, treble shorter/slender
      const pitchFactor = 1 - (i / 36); // 1 at C3, 0 at C6
      const baseYNorm = 0.02 + (2 - layerIndex) * 0.032 + rand() * 0.025;
      const lengthNorm = 0.16 + pitchFactor * 0.27 + layerIndex * 0.045 + rand() * 0.04;
      const tipYNorm = Math.min(poolSurfaceY - 0.09, baseYNorm + lengthNorm);
      const widthNorm = 0.0085 + pitchFactor * 0.015 + layerIndex * 0.0035;

      // Simulated distance across 3.5 acres (in feet) & acoustic delay
      const distanceFeet = Math.round(
        (layerIndex === 2 ? 32 : layerIndex === 1 ? 145 : 290) +
        Math.abs(xNorm - 0.48) * 180 +
        rand() * 45
      );
      const delayMs = Math.round(7 + (distanceFeet / 420) * 34);

      // Organic limestone taper profile (7 segments from root to tip)
      const profile = [];
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const flute = Math.pow(1 - t, 0.78) * (0.86 + rand() * 0.28);
        profile.push({
          t,
          leftScale: flute * (0.9 + rand() * 0.2),
          rightScale: flute * (0.9 + rand() * 0.2),
          veinOffset: (rand() - 0.5) * 0.4
        });
      }

      stalactites.push({
        index: i,
        midi,
        noteName,
        formationName: FORMATION_NAMES[i],
        isBlack,
        freq: midiToFreq(midi),
        xNorm,
        baseYNorm,
        tipYNorm,
        widthNorm,
        layerIndex,
        layerName,
        distanceFeet,
        delayMs,
        hueType: HUE_TYPES[i % HUE_TYPES.length],
        profile,
        // Dynamic physical state
        wirePulses: [],
        malletAngle: 0,
        malletVel: 0,
        energy: 0,
        sympatheticEnergy: 0,
        vibrationPhase: rand() * Math.PI * 2,
        vibrationAmp: 0,
        dripCharge: 0.2 + rand() * 0.55,
        lastStrikeTime: -10
      });
    }

    // Background stalagmites rising from cavern floor / pool edge
    const stalagmites = [];
    for (let m = 0; m < 22; m++) {
      stalagmites.push({
        xNorm: 0.03 + (m / 21) * 0.94 + (rand() - 0.5) * 0.02,
        heightNorm: 0.04 + rand() * 0.11,
        widthNorm: 0.012 + rand() * 0.022,
        layerIndex: m % 3
      });
    }

    // The 38th Unmapped Formation on the far right cavern wall (Easter Egg)
    const unmapped = {
      index: 37,
      name: 'Uncharted Formation No. 38',
      xNorm: 0.958,
      baseYNorm: 0.055,
      tipYNorm: 0.43,
      widthNorm: 0.017,
      tuningStep: 0,
      targetSteps: 3,
      frequencies: [418.0, 429.5, 436.2, 440.0],
      currentFreq: 418.0,
      tuned: false,
      energy: 0,
      vibrationPhase: 0,
      vibrationAmp: 0,
      sparks: []
    };

    const state = {
      time: 0,
      poolSurfaceY,
      stalactites,
      stalagmites,
      unmapped,
      drops: [],
      ripples: [],
      scaleMode: 'chromatic',
      malletType: 'rubber', // 'rubber' | 'felt' | 'calcite'
      seepageMode: 'slow',  // 'still' | 'slow' | 'living'
      showSchematics: false,
      reducedMotion: false,
      activeKeyIndices: new Set(),
      lastTelemetry: 'CATHEDRAL HALL · 37 SOLENOID CIRCUITS READY',
      seepageTimer: 0
    };

    function spawnDrop(s, boostEnergy) {
      if (state.drops.length >= 48) {
        state.drops.shift();
      }
      state.drops.push({
        xNorm: s.xNorm,
        yNorm: s.tipYNorm,
        vy: 0.08 + boostEnergy * 0.06,
        hueType: s.hueType,
        stalactiteIndex: s.index,
        freq: s.freq,
        energy: Math.min(1, 0.45 + boostEnergy * 0.5)
      });
    }

    function spawnRipple(xNorm, yNorm, hueType, intensity, freq) {
      if (state.ripples.length >= 40) {
        state.ripples.shift();
      }
      state.ripples.push({
        xNorm,
        yNorm: yNorm || state.poolSurfaceY + 0.03 + (Math.random() * 0.11),
        radius: 0.002,
        maxRadius: 0.045 + intensity * 0.065,
        alpha: Math.min(1, 0.55 + intensity * 0.4),
        hueType: hueType || 'cyan',
        freq: freq || 440
      });
    }

    function actuateMalletStrike(s, intensity, malletType) {
      s.malletAngle = 1.0;
      s.malletVel = -3.5;
      s.energy = Math.min(1.6, Math.max(s.energy, 0.75 + intensity * 0.65));
      s.vibrationAmp = Math.min(1.2, 0.55 + intensity * 0.55);
      s.lastStrikeTime = state.time;

      // Shake loose mineral water drop if charged
      s.dripCharge += 0.48 + intensity * 0.38;
      if (s.dripCharge >= 1.0) {
        s.dripCharge = 0.15;
        spawnDrop(s, intensity);
      }

      // Sympathetic resonance in octave (+12/-12) and fifth (+7/-7) neighbors
      const neighbors = [s.index - 12, s.index - 7, s.index + 7, s.index + 12];
      for (let i = 0; i < neighbors.length; i++) {
        const nIdx = neighbors[i];
        if (nIdx >= 0 && nIdx < 37) {
          const neighbor = state.stalactites[nIdx];
          neighbor.sympatheticEnergy = Math.min(
            0.85,
            neighbor.sympatheticEnergy + 0.38 * intensity
          );
          neighbor.vibrationAmp = Math.max(neighbor.vibrationAmp, 0.24 * intensity);
        }
      }
    }

    /**
     * Trigger a stalactite via console key or direct cavern brush.
     * @param {number} rawIndex 0..36
     * @param {object} opts { velocity, immediate, bypassQuantize, onStrike }
     */
    function triggerNote(rawIndex, opts) {
      const options = opts || {};
      const targetIndex = options.bypassQuantize
        ? Math.max(0, Math.min(36, Math.round(rawIndex)))
        : quantizeIndex(rawIndex, state.scaleMode);

      const s = state.stalactites[targetIndex];
      if (!s) return null;

      const intensity = Math.max(0.25, Math.min(1.0, options.velocity || 0.85));
      const malletType = options.malletType || state.malletType;

      state.lastTelemetry =
        `${s.noteName} · ${s.formationName.toUpperCase()} · ${s.freq.toFixed(1)} Hz · ${s.distanceFeet} FT (${s.layerName.toUpperCase()} VAULT)`;

      if (options.immediate || state.reducedMotion) {
        actuateMalletStrike(s, intensity, malletType);
      } else {
        // Send electrical pulse racing up the copper wire from console to solenoid
        if (s.wirePulses.length >= 6) s.wirePulses.shift();
        const travelSpeed = 1000 / Math.max(12, s.delayMs * 2.4); // reaches 1.0 in ~25-85ms
        s.wirePulses.push({
          progress: 0,
          speed: travelSpeed,
          intensity,
          malletType
        });
      }

      return s;
    }

    /**
     * Hand-grind / tune the 38th unmapped formation on the far right wall.
     */
    function interactUnmapped() {
      const u = state.unmapped;
      if (!u.tuned) {
        u.tuningStep = Math.min(u.targetSteps, u.tuningStep + 1);
        u.currentFreq = u.frequencies[u.tuningStep];
        u.energy = 1.25;
        u.vibrationAmp = 1.0;

        // Emit sandstone / calcite grinding sparks
        for (let i = 0; i < 14; i++) {
          const angle = Math.PI * 0.25 + (i / 14) * Math.PI * 0.7;
          const speed = 0.08 + (i % 4) * 0.035;
          u.sparks.push({
            xNorm: u.xNorm + (Math.cos(angle) * 0.008),
            yNorm: u.tipYNorm - 0.04,
            vx: Math.cos(angle) * speed * 0.45,
            vy: Math.sin(angle) * speed - 0.04,
            life: 1.0
          });
        }

        if (u.tuningStep >= u.targetSteps) {
          u.tuned = true;
          state.lastTelemetry = 'FORMATION No. 38 · HAND-GROUND TO 440.0 Hz · HARMONIC LOCK ACHIEVED';
          spawnRipple(u.xNorm, state.poolSurfaceY + 0.05, 'gold', 1.0, 440);
          return {
            justTuned: true,
            tuned: true,
            step: u.tuningStep,
            freq: u.currentFreq
          };
        } else {
          state.lastTelemetry =
            `GRINDING FORMATION No. 38 (${u.tuningStep}/${u.targetSteps}) · ${u.currentFreq.toFixed(1)} Hz → 440.0 Hz`;
          return {
            justTuned: false,
            tuned: false,
            step: u.tuningStep,
            freq: u.currentFreq
          };
        }
      } else {
        u.energy = 1.3;
        u.vibrationAmp = 0.95;
        state.lastTelemetry = 'FORMATION No. 38 · 440.0 Hz · SURVEYED BY GEMINI 4 ARGON · ANTIGRAVITY';
        spawnRipple(u.xNorm, state.poolSurfaceY + 0.05, 'gold', 0.85, 440);
        return {
          justTuned: false,
          tuned: true,
          step: u.tuningStep,
          freq: 440.0
        };
      }
    }

    /**
     * Advance simulation by dt seconds (clamped for stability).
     * @param {number} dt
     * @param {object} callbacks { onDropImpact(drop, ripple), onSeepageNote(stalactite) }
     */
    function step(dt, callbacks) {
      const cb = callbacks || {};
      const clampedDt = Math.min(0.05, Math.max(0.001, dt));
      state.time += clampedDt;

      // 1. Update 37 stalactites, wire pulses, and hinged mallets
      for (let i = 0; i < state.stalactites.length; i++) {
        const s = state.stalactites[i];

        // Advance active electrical pulses along copper wire
        for (let p = s.wirePulses.length - 1; p >= 0; p--) {
          const pulse = s.wirePulses[p];
          pulse.progress += pulse.speed * clampedDt;
          if (pulse.progress >= 1.0) {
            actuateMalletStrike(s, pulse.intensity, pulse.malletType);
            s.wirePulses.splice(p, 1);
          }
        }

        // Damped spring return for rubber mallet
        if (s.malletAngle !== 0 || Math.abs(s.malletVel) > 0.001) {
          const springForce = -42 * s.malletAngle - 9.5 * s.malletVel;
          s.malletVel += springForce * clampedDt;
          s.malletAngle += s.malletVel * clampedDt;
          if (s.malletAngle < -0.15) s.malletAngle = -0.15;
          if (Math.abs(s.malletAngle) < 0.004 && Math.abs(s.malletVel) < 0.01) {
            s.malletAngle = 0;
            s.malletVel = 0;
          }
        }

        // Luminescence & vibration decay
        s.energy = Math.max(0, s.energy - clampedDt * 0.52);
        s.sympatheticEnergy = Math.max(0, s.sympatheticEnergy - clampedDt * 0.16);
        s.vibrationAmp = Math.max(0, s.vibrationAmp - clampedDt * 0.85);
        s.vibrationPhase += clampedDt * (28 + (s.index * 0.9));
      }

      // 2. Update 38th unmapped formation & grinding sparks
      const u = state.unmapped;
      u.energy = Math.max(0, u.energy - clampedDt * 0.5);
      u.vibrationAmp = Math.max(0, u.vibrationAmp - clampedDt * 0.8);
      u.vibrationPhase += clampedDt * 42;
      for (let i = u.sparks.length - 1; i >= 0; i--) {
        const sp = u.sparks[i];
        sp.xNorm += sp.vx * clampedDt;
        sp.yNorm += sp.vy * clampedDt;
        sp.vy += 0.45 * clampedDt;
        sp.life -= clampedDt * 1.9;
        if (sp.life <= 0) u.sparks.splice(i, 1);
      }

      // 3. Ambient cave seepage (auto-drip)
      if (state.seepageMode !== 'still') {
        const interval = state.seepageMode === 'living' ? 1.35 : 3.2;
        state.seepageTimer += clampedDt;
        if (state.seepageTimer >= interval) {
          state.seepageTimer = 0;
          const pick = Math.floor(((Math.sin(state.time * 12.9898) * 43758.5453) % 1 + 1) % 1 * 37);
          const targetIdx = quantizeIndex(pick, state.scaleMode);
          const s = state.stalactites[targetIdx];
          if (s) {
            s.sympatheticEnergy = Math.max(s.sympatheticEnergy, 0.42);
            spawnDrop(s, 0.55);
            if (cb.onSeepageDrip) cb.onSeepageDrip(s);
          }
        }
      }

      // 4. Update falling mineral drops
      for (let i = state.drops.length - 1; i >= 0; i--) {
        const d = state.drops[i];
        d.vy += 0.52 * clampedDt;
        d.yNorm += d.vy * clampedDt;
        if (d.yNorm >= state.poolSurfaceY) {
          const rippleY = state.poolSurfaceY + 0.025 + ((d.stalactiteIndex % 5) * 0.022);
          spawnRipple(d.xNorm, rippleY, d.hueType, d.energy, d.freq);
          if (cb.onDropImpact) cb.onDropImpact(d);
          state.drops.splice(i, 1);
        }
      }

      // 5. Update mirror pool ripples
      for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        r.radius += clampedDt * 0.042;
        r.alpha -= clampedDt * 0.36;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          state.ripples.splice(i, 1);
        }
      }
    }

    /**
     * Hit-test a normalized canvas coordinate (xNorm, yNorm) against the 38th unmapped stone
     * or any of the 37 tuned stalactites.
     */
    function hitTestCavern(xNorm, yNorm) {
      const u = state.unmapped;
      if (
        Math.abs(xNorm - u.xNorm) <= u.widthNorm * 1.9 &&
        yNorm >= u.baseYNorm &&
        yNorm <= u.tipYNorm + 0.04
      ) {
        return { type: 'unmapped', item: u };
      }

      let best = null;
      let bestDist = 0.032;
      for (let i = 0; i < state.stalactites.length; i++) {
        const s = state.stalactites[i];
        if (yNorm >= s.baseYNorm - 0.02 && yNorm <= s.tipYNorm + 0.05) {
          const dx = Math.abs(xNorm - s.xNorm);
          if (dx < bestDist) {
            bestDist = dx;
            best = s;
          }
        }
      }
      if (best) {
        return { type: 'stalactite', item: best };
      }
      return null;
    }

    return {
      state,
      triggerNote,
      interactUnmapped,
      step,
      hitTestCavern,
      quantizeIndex,
      isIndexInScale,
      spawnRipple
    };
  }

  const api = {
    createWorld,
    quantizeIndex,
    isIndexInScale,
    midiToFreq,
    SCALES
  };

  root.Stalacpipe = root.Stalacpipe || {};
  Object.assign(root.Stalacpipe, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
