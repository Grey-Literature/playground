(function (Stalacpipe) {
  'use strict';

  const canvas = document.getElementById('cavern');
  const keybed = document.getElementById('keybed');
  const soundBtn = document.getElementById('sound');
  const soundLabel = document.getElementById('sound-label');
  const malletSelect = document.getElementById('mallet-select');
  const scaleSelect = document.getElementById('scale-select');
  const seepageSelect = document.getElementById('seepage-select');
  const wiresToggle = document.getElementById('wires-toggle');
  const chordBtn = document.getElementById('chord-btn');
  const aboutToggle = document.getElementById('about-toggle');
  const closeNotes = document.getElementById('close-notes');
  const fieldNotes = document.getElementById('field-notes');
  const volumeSlider = document.getElementById('volume');
  const gentleToggle = document.getElementById('gentle');
  const telemetryEl = document.getElementById('telemetry-readout');
  const hintEl = document.getElementById('hint');
  const plaqueEl = document.getElementById('plaque');

  const world = Stalacpipe.createWorld();
  const audio = Stalacpipe.createAudio();
  const renderer = Stalacpipe.createRenderer(canvas);

  const keyElements = new Array(37);
  const pointer = { active: false, down: false, xNorm: 0.5, yNorm: 0.35, lastBrushedIndex: -1, lastUnmappedHit: 0 };

  // Keyboard mapping: chromatic layout + home-row harmonic triggers
  const KEYBOARD_MAP = {
    // Lower octave C3..B3 (indices 0..11)
    KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5,
    KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
    Comma: 12,
    // Middle/Upper octaves C4..E5 (indices 12..28)
    KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17,
    Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23,
    KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
    BracketLeft: 29, Equal: 30, BracketRight: 31,
    // Remaining home-row keys for effortless tactile typing
    KeyA: 14, KeyF: 17, KeyK: 21, KeyL: 24, Semicolon: 26, Quote: 28
  };

  const KEY_LEGENDS = {
    0: 'C3', 2: 'X', 4: 'C', 5: 'V', 7: 'B', 9: 'N', 11: 'M',
    12: 'C4', 14: 'W', 16: 'E', 17: 'R', 19: 'T', 21: 'Y', 23: 'U',
    24: 'C5', 26: 'O', 28: 'P', 36: 'C6'
  };

  function buildKeybed() {
    keybed.innerHTML = '';
    const TOTAL_WHITE_KEYS = 22; // 3 octaves (7 * 3 = 21) + top C6 = 22 white keys
    let whiteCount = 0;

    for (let i = 0; i < 37; i++) {
      const s = world.state.stalactites[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'organ-key ' + (s.isBlack ? 'black-key' : 'white-key');
      btn.dataset.index = String(i);
      btn.setAttribute('aria-label', `${s.noteName} — ${s.formationName} (${Math.round(s.freq)} Hz)`);

      const lamp = document.createElement('span');
      lamp.className = 'key-lamp';
      lamp.setAttribute('aria-hidden', 'true');
      btn.appendChild(lamp);

      const legend = document.createElement('span');
      legend.className = 'key-legend';
      legend.setAttribute('aria-hidden', 'true');
      legend.textContent = KEY_LEGENDS[i] || '';
      btn.appendChild(legend);

      if (s.isBlack) {
        // Position black key centered on the boundary between the previous and next white key
        const leftPct = (whiteCount / TOTAL_WHITE_KEYS) * 100;
        btn.style.left = `${leftPct.toFixed(3)}%`;
      } else {
        whiteCount++;
      }

      keybed.appendChild(btn);
      keyElements[i] = btn;
    }
    updateScaleKeyDimming();
  }

  function updateScaleKeyDimming() {
    const scale = world.state.scaleMode;
    for (let i = 0; i < 37; i++) {
      const inScale = Stalacpipe.isIndexInScale(i, scale);
      keyElements[i].classList.toggle('scale-muted', !inScale);
    }
  }

  function flashKeyElement(index, durationMs) {
    const el = keyElements[index];
    if (!el) return;
    el.classList.add('active');
    if (el._flashTimer) clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () {
      el.classList.remove('active');
    }, durationMs || 240);
  }

  function strikeStalactiteByIndex(rawIndex, velocity, bypassQuantize) {
    const s = world.triggerNote(rawIndex, {
      velocity: velocity || 0.85,
      bypassQuantize: !!bypassQuantize
    });
    if (!s) return;

    flashKeyElement(s.index, 260);
    audio.playStalactite(s, world.state.malletType, velocity || 0.85);
    telemetryEl.textContent = world.state.lastTelemetry;
  }

  function playCathedralChord(customIndices) {
    // Lush subterranean chord spanning all 3 octaves
    const rawChord = customIndices || [0, 7, 14, 16, 23, 28, 36];
    rawChord.forEach(function (idx, step) {
      setTimeout(function () {
        strikeStalactiteByIndex(idx, 0.78 - step * 0.04, !!customIndices);
      }, step * 75);
    });
  }

  function handleUnmappedInteraction() {
    const now = performance.now();
    if (now - pointer.lastUnmappedHit < 220) return;
    pointer.lastUnmappedHit = now;

    const res = world.interactUnmapped();
    audio.playGrindstoneStep(res);
    telemetryEl.textContent = world.state.lastTelemetry;

    if (res.justTuned) {
      plaqueEl.hidden = false;
      hintEl.textContent = 'Formation No. 38 locked to 440.0 Hz — Cathedral Hall answers in sympathy.';
      // Trigger a warm A-major9 / Lydian sympathetic chord across the cave
      playCathedralChord([9, 16, 21, 25, 30, 33]);
    } else if (!res.tuned) {
      hintEl.textContent = `Grinding Formation No. 38 (${res.step}/3) — ${res.freq.toFixed(1)} Hz, getting closer to 440 Hz…`;
    } else {
      plaqueEl.hidden = false;
    }
  }

  // ─── Keybed Pointer Glissando ───────────────────────────────────────────────

  let isKeybedDragging = false;
  let lastKeybedIndex = -1;

  function getKeyIndexFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return -1;
    const keyBtn = el.closest('.organ-key');
    if (!keyBtn) return -1;
    return parseInt(keyBtn.dataset.index, 10);
  }

  keybed.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    isKeybedDragging = true;
    keybed.setPointerCapture(e.pointerId);
    const idx = getKeyIndexFromPoint(e.clientX, e.clientY);
    if (idx >= 0) {
      lastKeybedIndex = idx;
      strikeStalactiteByIndex(idx, 0.9, false);
    }
  });

  keybed.addEventListener('pointermove', function (e) {
    if (!isKeybedDragging) return;
    const idx = getKeyIndexFromPoint(e.clientX, e.clientY);
    if (idx >= 0 && idx !== lastKeybedIndex) {
      lastKeybedIndex = idx;
      strikeStalactiteByIndex(idx, 0.78, false);
    }
  });

  function stopKeybedDrag() {
    isKeybedDragging = false;
    lastKeybedIndex = -1;
  }
  keybed.addEventListener('pointerup', stopKeybedDrag);
  keybed.addEventListener('pointercancel', stopKeybedDrag);

  // ─── Cavern Canvas Pointer Sweeping & Plucking ──────────────────────────────

  function updateCanvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    pointer.yNorm = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    pointer.active = true;
  }

  function interactAtCavernPointer(isInitialClick) {
    const hit = world.hitTestCavern(pointer.xNorm, pointer.yNorm);
    if (hit) {
      if (hit.type === 'unmapped') {
        handleUnmappedInteraction();
        return;
      }
      if (hit.type === 'stalactite') {
        if (isInitialClick || pointer.lastBrushedIndex !== hit.item.index) {
          pointer.lastBrushedIndex = hit.item.index;
          strikeStalactiteByIndex(hit.item.index, isInitialClick ? 0.92 : 0.74, false);
        }
        return;
      }
    }

    // If clicking in the subterranean mirror pool below the stalactites, splash a ripple
    if (isInitialClick && pointer.yNorm >= world.state.poolSurfaceY) {
      const approxIdx = Math.round(pointer.xNorm * 36);
      const qIdx = Stalacpipe.quantizeIndex(approxIdx, world.state.scaleMode);
      const s = world.state.stalactites[qIdx];
      world.spawnRipple(pointer.xNorm, pointer.yNorm, s ? s.hueType : 'cyan', 0.85, s ? s.freq : 440);
      audio.playWaterDrop({ freq: s ? s.freq : 440, energy: 0.8 });
    }
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.focus();
    pointer.down = true;
    pointer.lastBrushedIndex = -1;
    updateCanvasPointer(e);
    interactAtCavernPointer(true);
  });

  canvas.addEventListener('pointermove', function (e) {
    updateCanvasPointer(e);
    if (pointer.down) {
      interactAtCavernPointer(false);
    }
  });

  window.addEventListener('pointerup', function () {
    pointer.down = false;
    pointer.lastBrushedIndex = -1;
  });

  canvas.addEventListener('pointerleave', function () {
    pointer.active = false;
    pointer.down = false;
    pointer.lastBrushedIndex = -1;
  });

  // ─── Computer Keyboard Controls ─────────────────────────────────────────────

  const heldCodes = new Set();

  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.code === 'Escape') {
      fieldNotes.hidden = true;
      aboutToggle.setAttribute('aria-expanded', 'false');
      heldCodes.clear();
      return;
    }

    if (e.code === 'KeyW' && e.shiftKey) {
      wiresToggle.click();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) playCathedralChord();
      return;
    }

    if (Object.prototype.hasOwnProperty.call(KEYBOARD_MAP, e.code)) {
      e.preventDefault();
      if (heldCodes.has(e.code)) return;
      heldCodes.add(e.code);
      const idx = KEYBOARD_MAP[e.code];
      strikeStalactiteByIndex(idx, 0.88, false);
    }
  });

  window.addEventListener('keyup', function (e) {
    heldCodes.delete(e.code);
  });

  // ─── HUD & Field Notes Controls ─────────────────────────────────────────────

  function toggleSound(forceState) {
    const next = typeof forceState === 'boolean' ? forceState : !audio.isEnabled();
    audio.setEnabled(next);
    soundBtn.setAttribute('aria-pressed', String(next));
    soundLabel.textContent = next ? 'Sound on' : 'Sound off';
  }

  soundBtn.addEventListener('click', function () {
    toggleSound();
  });

  malletSelect.addEventListener('change', function () {
    world.state.malletType = malletSelect.value;
    const labels = {
      rubber: 'Gum rubber mallets — warm, hollow fundamental resonance.',
      felt: 'Weathered felt mallets — soft attack and deep cathedral sustain.',
      calcite: 'Calcite hammers — bright crystalline stone overtones.'
    };
    hintEl.textContent = labels[malletSelect.value] || '';
  });

  scaleSelect.addEventListener('change', function () {
    world.state.scaleMode = scaleSelect.value;
    updateScaleKeyDimming();
  });

  seepageSelect.addEventListener('change', function () {
    world.state.seepageMode = seepageSelect.value;
  });

  wiresToggle.addEventListener('click', function () {
    const next = !world.state.showSchematics;
    world.state.showSchematics = next;
    wiresToggle.setAttribute('aria-pressed', String(next));
  });

  chordBtn.addEventListener('click', function () {
    playCathedralChord();
  });

  aboutToggle.addEventListener('click', function () {
    const open = fieldNotes.hidden;
    fieldNotes.hidden = !open;
    aboutToggle.setAttribute('aria-expanded', String(open));
  });

  closeNotes.addEventListener('click', function () {
    fieldNotes.hidden = true;
    aboutToggle.setAttribute('aria-expanded', 'false');
  });

  volumeSlider.addEventListener('input', function () {
    audio.setVolume(parseFloat(volumeSlider.value) / 100);
  });

  const motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  if (motionQuery && motionQuery.matches) {
    world.state.reducedMotion = true;
    gentleToggle.checked = true;
  }

  gentleToggle.addEventListener('change', function () {
    world.state.reducedMotion = gentleToggle.checked;
  });

  // ─── Resize & Animation Loop ────────────────────────────────────────────────

  window.addEventListener('resize', function () {
    renderer.resize();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      audio.suspend();
    } else {
      audio.resume();
      lastFrameTime = performance.now();
    }
  });

  let lastFrameTime = performance.now();
  const FIXED_STEP = 1 / 120;
  let accumulator = 0;

  function frame(now) {
    if (document.hidden) {
      lastFrameTime = now;
      requestAnimationFrame(frame);
      return;
    }
    const elapsed = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    accumulator += elapsed;

    while (accumulator >= FIXED_STEP) {
      world.step(FIXED_STEP, {
        onDropImpact: function (drop) {
          audio.playWaterDrop(drop);
        },
        onSeepageDrip: function (stalactite) {
          // Subtle ambient cave pulse when a seepage droplet detaches
          if (world.state.seepageMode === 'living') {
            audio.playStalactite(stalactite, 'felt', 0.28);
          }
        }
      });
      accumulator -= FIXED_STEP;
    }

    renderer.render(world.state, pointer);
    requestAnimationFrame(frame);
  }

  buildKeybed();
  window.stalacpipeApp = { world: world, audio: audio, renderer: renderer, keyElements: keyElements };
  // Start with a gentle visual welcoming ripple across Cathedral Hall
  setTimeout(function () {
    [0, 7, 14, 21, 28].forEach(function (idx, i) {
      setTimeout(function () {
        world.triggerNote(idx, { velocity: 0.65 });
        flashKeyElement(idx, 220);
      }, i * 95);
    });
  }, 180);

  requestAnimationFrame(frame);
})(window.Stalacpipe);
