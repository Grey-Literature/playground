(function (root) {
  'use strict';

  function createAudio() {
    let ctx = null;
    let masterGain = null;
    let dryBus = null;
    let wetBus = null;
    let convolver = null;
    let noiseBuffer = null;
    let enabled = false;
    let volume = 0.88;
    const MASTER_BOOST = 1.45;
    const activeVoices = [];
    const MAX_VOICES = 18;

    function buildCavernImpulse(audioCtx) {
      const rate = audioCtx.sampleRate;
      const duration = 3.6;
      const length = Math.floor(rate * duration);
      const impulse = audioCtx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      // Early discrete limestone wall reflections (in seconds)
      const earlyReflections = [
        { t: 0.017, gain: 0.42, pan: -0.4 },
        { t: 0.031, gain: 0.35, pan: 0.5 },
        { t: 0.053, gain: 0.28, pan: -0.25 },
        { t: 0.079, gain: 0.22, pan: 0.35 },
        { t: 0.118, gain: 0.18, pan: -0.6 }
      ];

      for (let i = 0; i < earlyReflections.length; i++) {
        const er = earlyReflections[i];
        const idx = Math.floor(er.t * rate);
        if (idx < length) {
          left[idx] += er.gain * (er.pan < 0 ? 1 : 0.6);
          right[idx] += er.gain * (er.pan > 0 ? 1 : 0.6);
        }
      }

      // Diffuse 3.5-acre subterranean decay tail with warm lowpass damping
      let lpL = 0;
      let lpR = 0;
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const env = Math.pow(1 - i / length, 2.45) * Math.exp(-t * 0.95);
        const rawL = (Math.random() * 2 - 1) * env * 0.28;
        const rawR = (Math.random() * 2 - 1) * env * 0.28;
        const damp = Math.max(0.08, 0.42 - t * 0.09);
        lpL += damp * (rawL - lpL);
        lpR += damp * (rawR - lpR);
        left[i] += lpL;
        right[i] += lpR;
      }

      return impulse;
    }

    function buildNoiseBuffer(audioCtx) {
      const rate = audioCtx.sampleRate;
      const len = Math.floor(rate * 0.4);
      const buf = audioCtx.createBuffer(1, len, rate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buf;
    }

    function ensureContext() {
      if (ctx) return ctx;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = enabled ? volume * MASTER_BOOST : 0;

      const compressor = ctx.createDynamicsCompressor
        ? ctx.createDynamicsCompressor()
        : null;
      if (compressor) {
        compressor.threshold.value = -10;
        compressor.knee.value = 12;
        compressor.ratio.value = 3.5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.18;
      }

      dryBus = ctx.createGain();
      dryBus.gain.value = 0.95;

      wetBus = ctx.createGain();
      wetBus.gain.value = 0.78;

      convolver = ctx.createConvolver();
      convolver.buffer = buildCavernImpulse(ctx);

      noiseBuffer = buildNoiseBuffer(ctx);

      dryBus.connect(masterGain);
      wetBus.connect(convolver);
      convolver.connect(masterGain);
      if (compressor) {
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
      } else {
        masterGain.connect(ctx.destination);
      }

      return ctx;
    }

    function registerVoice(stopTime, cleanupFn) {
      while (activeVoices.length >= MAX_VOICES) {
        const oldest = activeVoices.shift();
        if (oldest && oldest.cleanup) oldest.cleanup();
      }
      const entry = { stopTime, cleanup: cleanupFn };
      activeVoices.push(entry);
    }

    function setEnabled(nextEnabled) {
      enabled = !!nextEnabled;
      if (enabled) {
        const audioCtx = ensureContext();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(function () {});
        }
      }
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(enabled ? volume * MASTER_BOOST : 0.0001, ctx.currentTime, 0.04);
      }
      return enabled;
    }

    function setVolume(nextVol) {
      volume = Math.max(0, Math.min(1, nextVol));
      if (masterGain && ctx && enabled) {
        masterGain.gain.setTargetAtTime(volume * MASTER_BOOST, ctx.currentTime, 0.03);
      }
    }

    function playStalactite(stalactite, malletType, velocity) {
      if (!enabled) return;
      const audioCtx = ensureContext();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
      }

      const now = audioCtx.currentTime;
      const vel = Math.max(0.2, Math.min(1.0, velocity || 0.85));
      const mode = malletType || 'rubber';
      const delaySec = (stalactite.delayMs || 15) / 1000;
      const strikeTime = now + delaySec;
      const freq = stalactite.freq || 440;

      // Stereo placement across the cavern
      const panner = audioCtx.createStereoPanner
        ? audioCtx.createStereoPanner()
        : null;
      const voiceOut = panner || audioCtx.createGain();
      if (panner) {
        panner.pan.setValueAtTime(Math.max(-0.88, Math.min(0.88, (stalactite.xNorm - 0.5) * 1.75)), now);
      }

      // Depth-dependent dry/wet balance (deeper vault = more cathedral reverb)
      const drySend = audioCtx.createGain();
      const wetSend = audioCtx.createGain();
      const depthFactor = stalactite.layerIndex === 2 ? 0.85 : (stalactite.layerIndex === 1 ? 0.62 : 0.42);
      drySend.gain.value = depthFactor;
      wetSend.gain.value = 1.15 - depthFactor * 0.45;

      voiceOut.connect(drySend);
      voiceOut.connect(wetSend);
      drySend.connect(dryBus);
      wetSend.connect(wetBus);

      // 1. Immediate 1950s electro-mechanical solenoid relay click at console (t = now)
      const clickOsc = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1450, now);
      clickOsc.frequency.exponentialRampToValueAtTime(290, now + 0.011);
      clickGain.gain.setValueAtTime(0.035 * vel, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
      clickOsc.connect(clickGain);
      clickGain.connect(dryBus);
      clickOsc.start(now);
      clickOsc.stop(now + 0.014);

      // 2. Mallet impact on limestone at t = strikeTime
      if (noiseBuffer) {
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(
          mode === 'calcite' ? 2400 : (mode === 'felt' ? 680 : 1250),
          strikeTime
        );
        filter.Q.value = mode === 'calcite' ? 3.5 : 1.8;

        const thudGain = audioCtx.createGain();
        const thudPeak = (mode === 'calcite' ? 0.14 : mode === 'felt' ? 0.06 : 0.09) * vel;
        thudGain.gain.setValueAtTime(0.0001, strikeTime);
        thudGain.gain.linearRampToValueAtTime(thudPeak, strikeTime + 0.003);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 0.045);

        noise.connect(filter);
        filter.connect(thudGain);
        thudGain.connect(voiceOut);
        noise.start(strikeTime);
        noise.stop(strikeTime + 0.05);
      }

      // 3. Modal stone resonator + subterranean organ sustain
      // Fundamental (1.0x)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = mode === 'felt' ? 'sine' : 'triangle';
      osc1.frequency.setValueAtTime(freq, strikeTime);

      const sustainDur = Math.max(1.4, Math.min(3.4, 2.8 - (stalactite.index / 36) * 1.2));
      gain1.gain.setValueAtTime(0.0001, strikeTime);
      gain1.gain.linearRampToValueAtTime(0.34 * vel, strikeTime + (mode === 'felt' ? 0.018 : 0.006));
      gain1.gain.exponentialRampToValueAtTime(0.105 * vel, strikeTime + 0.35);
      gain1.gain.exponentialRampToValueAtTime(0.0001, strikeTime + sustainDur);

      osc1.connect(gain1);
      gain1.connect(voiceOut);

      // Cavern air-column 2nd harmonic (2.0x) — gives the "Stalacpipe Organ" warmth
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, strikeTime);
      gain2.gain.setValueAtTime(0.0001, strikeTime);
      gain2.gain.linearRampToValueAtTime(0.135 * vel, strikeTime + 0.055);
      gain2.gain.exponentialRampToValueAtTime(0.0001, strikeTime + sustainDur * 0.78);

      osc2.connect(gain2);
      gain2.connect(voiceOut);

      // Inharmonic calcite lithophone partial (2.756x) — singing limestone ring
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 2.756, strikeTime);
      const modalLevel = (mode === 'calcite' ? 0.16 : mode === 'felt' ? 0.042 : 0.09) * vel;
      gain3.gain.setValueAtTime(0.0001, strikeTime);
      gain3.gain.linearRampToValueAtTime(modalLevel, strikeTime + 0.003);
      gain3.gain.exponentialRampToValueAtTime(0.0001, strikeTime + sustainDur * 0.42);

      osc3.connect(gain3);
      gain3.connect(voiceOut);

      const stopAt = strikeTime + sustainDur + 0.05;
      osc1.start(strikeTime);
      osc2.start(strikeTime);
      osc3.start(strikeTime);
      osc1.stop(stopAt);
      osc2.stop(stopAt);
      osc3.stop(stopAt);

      registerVoice(stopAt, function () {
        try {
          osc1.disconnect();
          osc2.disconnect();
          osc3.disconnect();
          voiceOut.disconnect();
        } catch (e) {}
      });
    }

    function playWaterDrop(drop) {
      if (!enabled) return;
      const audioCtx = ensureContext();
      if (!audioCtx || audioCtx.state === 'suspended') return;

      const now = audioCtx.currentTime;
      const baseFreq = Math.max(520, Math.min(2100, (drop.freq || 440) * 2));
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 0.88, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.24, now + 0.065);

      const amp = 0.068 * (drop.energy || 0.6);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(wetBus);
      gain.connect(dryBus);

      osc.start(now);
      osc.stop(now + 0.19);
    }

    function playGrindstoneStep(result) {
      if (!enabled) return;
      const audioCtx = ensureContext();
      if (!audioCtx || audioCtx.state === 'suspended') return;

      const now = audioCtx.currentTime;
      const freq = result.freq || 440;

      // Sandstone grinding scrape if still chipping the rock
      if (!result.tuned || result.justTuned) {
        if (noiseBuffer) {
          const scrape = audioCtx.createBufferSource();
          scrape.buffer = noiseBuffer;
          const bp = audioCtx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1900 + result.step * 350, now);
          bp.Q.value = 2.4;

          const sGain = audioCtx.createGain();
          sGain.gain.setValueAtTime(0.0001, now);
          sGain.gain.linearRampToValueAtTime(0.11, now + 0.015);
          sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

          scrape.connect(bp);
          bp.connect(sGain);
          sGain.connect(dryBus);
          scrape.start(now);
          scrape.stop(now + 0.15);
        }
      }

      // Ring the 38th formation at its current pitch
      const osc = audioCtx.createOscillator();
      const overtone = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.02);
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2.0, now + 0.02);

      gain.gain.setValueAtTime(0.0001, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(wetBus);
      gain.connect(dryBus);

      osc.start(now + 0.02);
      overtone.start(now + 0.02);
      osc.stop(now + 2.45);
      overtone.stop(now + 2.45);
    }

    function suspend() {
      if (ctx && ctx.state === 'running') {
        ctx.suspend().catch(function () {});
      }
    }

    function resume() {
      if (enabled && ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
    }

    return {
      setEnabled,
      setVolume,
      playStalactite,
      playWaterDrop,
      playGrindstoneStep,
      suspend,
      resume,
      isEnabled: function () { return enabled; }
    };
  }

  root.Stalacpipe = root.Stalacpipe || {};
  root.Stalacpipe.createAudio = createAudio;
})(typeof window !== 'undefined' ? window : globalThis);
