(function (root) {
  'use strict';

  const PALETTE = {
    amber: { core: '#ffe299', mid: '#f0a84b', glow: 'rgba(240, 168, 75, ' },
    cyan:  { core: '#b8fffc', mid: '#48e5e0', glow: 'rgba(72, 229, 224, ' },
    gold:  { core: '#fff0b8', mid: '#ffd166', glow: 'rgba(255, 209, 102, ' },
    rose:  { core: '#ffd0e0', mid: '#e883a8', glow: 'rgba(232, 131, 168, ' }
  };

  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    let width = 1;
    let height = 1;
    let dpr = 1;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(300, Math.floor(rect.width));
      height = Math.max(200, Math.floor(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawCavernBackdrop(state, pointer) {
      const poolY = state.poolSurfaceY * height;

      // Deep subterranean vault gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, poolY);
      bgGrad.addColorStop(0, '#05070c');
      bgGrad.addColorStop(0.38, '#0b101b');
      bgGrad.addColorStop(0.82, '#121928');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, poolY);

      // Subtle warm cavern floor up-lighting arches (Cathedral Hall alcoves)
      const alcoves = [
        { x: 0.22, r: 0.28, color: 'rgba(240, 168, 75, 0.055)' },
        { x: 0.54, r: 0.34, color: 'rgba(72, 229, 224, 0.045)' },
        { x: 0.82, r: 0.26, color: 'rgba(232, 131, 168, 0.045)' }
      ];
      for (let i = 0; i < alcoves.length; i++) {
        const a = alcoves[i];
        const gx = a.x * width;
        const gy = poolY * 0.72;
        const rad = a.r * Math.max(width, height);
        const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, rad);
        grad.addColorStop(0, a.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, poolY);
      }

      // Geologist's lantern beam following pointer in cavern
      if (pointer && pointer.active && pointer.yNorm < state.poolSurfaceY + 0.05) {
        const px = pointer.xNorm * width;
        const py = pointer.yNorm * height;
        const lGrad = ctx.createRadialGradient(px, py, 6, px, py, Math.min(width, height) * 0.32);
        lGrad.addColorStop(0, 'rgba(255, 220, 155, 0.16)');
        lGrad.addColorStop(0.45, 'rgba(240, 178, 101, 0.06)');
        lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lGrad;
        ctx.fillRect(0, 0, width, poolY);
      }

      // Distant stalagmites along the shoreline of the subterranean mirror pool
      for (let i = 0; i < state.stalagmites.length; i++) {
        const m = state.stalagmites[i];
        const mx = m.xNorm * width;
        const mh = m.heightNorm * height;
        const mw = m.widthNorm * width;
        ctx.fillStyle = m.layerIndex === 0 ? '#0d121d' : (m.layerIndex === 1 ? '#121926' : '#172030');
        ctx.beginPath();
        ctx.moveTo(mx - mw, poolY + 2);
        ctx.quadraticCurveTo(mx - mw * 0.35, poolY - mh * 0.6, mx, poolY - mh);
        ctx.quadraticCurveTo(mx + mw * 0.35, poolY - mh * 0.6, mx + mw, poolY + 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawCopperWireAndMallet(s, state) {
      const sx = s.xNorm * width;
      const baseY = s.baseYNorm * height;
      const tipY = s.tipYNorm * height;
      const strikeY = baseY + (tipY - baseY) * 0.56;
      const consoleOriginX = (0.06 + (s.index / 36) * 0.88) * width;
      const consoleOriginY = height;

      const hasPulses = s.wirePulses.length > 0;
      const wireAlpha = state.showSchematics
        ? 0.48
        : (hasPulses || s.energy > 0.15 ? 0.32 : 0.085);

      // Control points for copper wire snaking from console up cavern wall/vault to solenoid
      const cp1x = consoleOriginX + (sx - consoleOriginX) * 0.25;
      const cp1y = height * 0.68;
      const cp2x = sx + (s.isBlack ? -14 : 14);
      const cp2y = baseY + 12;
      const bracketX = sx + (s.widthNorm * width * 1.15);
      const bracketY = strikeY - 8;

      ctx.save();
      ctx.strokeStyle = state.showSchematics
        ? `rgba(72, 229, 224, ${wireAlpha})`
        : `rgba(217, 130, 75, ${wireAlpha})`;
      ctx.lineWidth = state.showSchematics ? 1.25 : 0.9;
      if (state.showSchematics) {
        ctx.setLineDash([4, 4]);
      }

      ctx.beginPath();
      ctx.moveTo(consoleOriginX, consoleOriginY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bracketX, bracketY);
      ctx.stroke();
      ctx.restore();

      // Render racing electrical pulses along the Bezier wire
      for (let p = 0; p < s.wirePulses.length; p++) {
        const t = Math.min(1, s.wirePulses[p].progress);
        const inv = 1 - t;
        const px =
          inv * inv * inv * consoleOriginX +
          3 * inv * inv * t * cp1x +
          3 * inv * t * t * cp2x +
          t * t * t * bracketX;
        const py =
          inv * inv * inv * consoleOriginY +
          3 * inv * inv * t * cp1y +
          3 * inv * t * t * cp2y +
          t * t * t * bracketY;

        const sparkGrad = ctx.createRadialGradient(px, py, 1, px, py, 12);
        sparkGrad.addColorStop(0, '#fff6d6');
        sparkGrad.addColorStop(0.4, '#ffae42');
        sparkGrad.addColorStop(1, 'rgba(255, 174, 66, 0)');
        ctx.fillStyle = sparkGrad;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw miniature 1950s solenoid bracket & hinged rubber mallet beside the stalactite
      const swing = s.malletAngle; // 0 at rest, 1.0 when striking rock
      const pivotX = bracketX + 6;
      const pivotY = bracketY;
      const armLen = 13;
      // Angle swings from +0.55 rad (away from rock) to -0.15 rad (striking rock surface)
      const angle = 0.58 - swing * 0.72;
      const headX = pivotX - Math.sin(angle) * armLen;
      const headY = pivotY + Math.cos(angle) * armLen;

      // Solenoid coil box
      ctx.fillStyle = s.energy > 0.2 ? '#c98a4b' : '#4a3b2c';
      ctx.fillRect(pivotX - 3, pivotY - 4, 7, 6);

      // Mallet lever arm
      ctx.strokeStyle = '#a89070';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Rubber / felt / calcite mallet tip
      ctx.fillStyle = state.malletType === 'calcite'
        ? '#aef7f4'
        : (state.malletType === 'felt' ? '#e07a5f' : '#d96b38');
      ctx.beginPath();
      ctx.arc(headX, headY, 3.3, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawStalactite(s, state) {
      const totalEnergy = Math.min(1.6, s.energy + s.sympatheticEnergy * 0.75);
      const vibOffset = state.reducedMotion
        ? 0
        : Math.sin(s.vibrationPhase) * s.vibrationAmp * 2.6;

      const sx = s.xNorm * width + vibOffset;
      const baseY = s.baseYNorm * height;
      const tipY = s.tipYNorm * height;
      const halfW = s.widthNorm * width;
      const pal = PALETTE[s.hueType] || PALETTE.amber;

      // Ambient halo when singing
      if (totalEnergy > 0.02) {
        const midY = (baseY + tipY) * 0.52;
        const glowRad = Math.max(28, (tipY - baseY) * 0.65);
        const halo = ctx.createRadialGradient(sx, midY, 2, sx, midY, glowRad);
        const alpha = Math.min(0.46, totalEnergy * 0.32);
        halo.addColorStop(0, pal.glow + alpha.toFixed(3) + ')');
        halo.addColorStop(1, pal.glow + '0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sx, midY, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Build organic fluted limestone polygon
      ctx.beginPath();
      ctx.moveTo(sx - halfW, baseY);
      for (let i = 1; i < s.profile.length; i++) {
        const pt = s.profile[i];
        const py = baseY + pt.t * (tipY - baseY);
        const px = sx - halfW * pt.leftScale;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(sx, tipY);
      for (let i = s.profile.length - 1; i >= 1; i--) {
        const pt = s.profile[i];
        const py = baseY + pt.t * (tipY - baseY);
        const px = sx + halfW * pt.rightScale;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(sx + halfW, baseY);
      ctx.closePath();

      // Base limestone rock fill graded by depth layer
      const rockGrad = ctx.createLinearGradient(sx - halfW, baseY, sx + halfW, tipY);
      if (s.layerIndex === 0) {
        rockGrad.addColorStop(0, '#131926');
        rockGrad.addColorStop(1, '#1e2738');
      } else if (s.layerIndex === 1) {
        rockGrad.addColorStop(0, '#1a2233');
        rockGrad.addColorStop(1, '#2b364d');
      } else {
        rockGrad.addColorStop(0, '#222b3d');
        rockGrad.addColorStop(1, '#394661');
      }
      ctx.fillStyle = rockGrad;
      ctx.fill();

      // Internal crystalline calcite luminescence when struck
      if (totalEnergy > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.92, totalEnergy * 0.72);
        const veinGrad = ctx.createLinearGradient(sx, baseY, sx, tipY);
        veinGrad.addColorStop(0, pal.mid);
        veinGrad.addColorStop(0.65, pal.core);
        veinGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = veinGrad;
        ctx.fill();
        ctx.restore();
      }

      // Subtle mineral ridge highlight & vein line
      ctx.strokeStyle = totalEnergy > 0.08
        ? pal.core
        : 'rgba(210, 220, 240, 0.13)';
      ctx.lineWidth = totalEnergy > 0.08 ? 1.3 : 0.7;
      ctx.beginPath();
      ctx.moveTo(sx, baseY + 6);
      for (let i = 1; i < s.profile.length; i++) {
        const pt = s.profile[i];
        const py = baseY + pt.t * (tipY - baseY);
        ctx.lineTo(sx + pt.veinOffset * halfW, py);
      }
      ctx.lineTo(sx, tipY);
      ctx.stroke();

      // Swelling mineral water droplet at the tip of the stalactite
      const dropRadius = 1.4 + s.dripCharge * 2.2;
      ctx.fillStyle = totalEnergy > 0.15 ? pal.core : 'rgba(165, 235, 245, 0.75)';
      ctx.beginPath();
      ctx.arc(sx, tipY + dropRadius * 0.7, dropRadius, 0, Math.PI * 2);
      ctx.fill();

      // Schematics mode blueprint callout
      if (state.showSchematics && (s.index % 2 === 0 || totalEnergy > 0.15)) {
        ctx.save();
        ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = totalEnergy > 0.15 ? '#ffe299' : 'rgba(72, 229, 224, 0.78)';
        ctx.fillText(s.noteName, sx, tipY + 14);
        ctx.font = '500 8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(243, 237, 226, 0.54)';
        ctx.fillText(`${Math.round(s.freq)}Hz·${s.distanceFeet}ft`, sx, tipY + 24);
        ctx.restore();
      }
    }

    function drawUnmappedFormation(state) {
      const u = state.unmapped;
      const vib = state.reducedMotion ? 0 : Math.sin(u.vibrationPhase) * u.vibrationAmp * 2.5;
      const ux = u.xNorm * width + vib;
      const baseY = u.baseYNorm * height;
      const tipY = u.tipYNorm * height;
      const halfW = u.widthNorm * width;

      // Golden resonance aura if tuned or being ground
      if (u.energy > 0.02 || u.tuned) {
        const auraAlpha = u.tuned ? Math.max(0.18, u.energy * 0.4) : u.energy * 0.3;
        const rad = 46;
        const aura = ctx.createRadialGradient(ux, (baseY + tipY) * 0.55, 2, ux, (baseY + tipY) * 0.55, rad);
        aura.addColorStop(0, `rgba(255, 212, 133, ${auraAlpha.toFixed(3)})`);
        aura.addColorStop(1, 'rgba(255, 212, 133, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(ux, (baseY + tipY) * 0.55, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Craggy, un-wired limestone silhouette (becomes smoother as tuningStep progresses)
      const roughness = (3 - u.tuningStep) * 2.4;
      ctx.beginPath();
      ctx.moveTo(ux - halfW, baseY);
      ctx.lineTo(ux - halfW * 0.85 - roughness, baseY + (tipY - baseY) * 0.32);
      ctx.lineTo(ux - halfW * 0.48 + roughness * 0.6, baseY + (tipY - baseY) * 0.68);
      ctx.lineTo(ux, tipY);
      ctx.lineTo(ux + halfW * 0.52 + roughness, baseY + (tipY - baseY) * 0.64);
      ctx.lineTo(ux + halfW * 0.88 - roughness * 0.5, baseY + (tipY - baseY) * 0.3);
      ctx.lineTo(ux + halfW, baseY);
      ctx.closePath();

      ctx.fillStyle = u.tuned ? '#4a3922' : '#1f2129';
      ctx.fill();

      if (u.energy > 0.02 || u.tuned) {
        ctx.save();
        ctx.globalAlpha = u.tuned ? Math.max(0.55, u.energy * 0.85) : u.energy * 0.65;
        const g = ctx.createLinearGradient(ux, baseY, ux, tipY);
        g.addColorStop(0, '#d4943a');
        g.addColorStop(1, '#fff0b8');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = u.tuned ? '#ffd485' : 'rgba(240, 178, 101, 0.32)';
      ctx.lineWidth = u.tuned ? 1.4 : 0.9;
      ctx.stroke();

      // Chalk surveyor's mark below the 38th stone
      ctx.save();
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = u.tuned
        ? '#ffd485'
        : (u.tuningStep > 0 ? 'rgba(255, 212, 133, 0.82)' : 'rgba(243, 237, 226, 0.36)');
      const label = u.tuned
        ? 'No.38 · 440Hz'
        : (u.tuningStep > 0 ? `${u.currentFreq.toFixed(0)}Hz (${u.tuningStep}/3)` : 'No.38 [unwired]');
      ctx.fillText(label, ux - 6, tipY + 15);
      ctx.restore();

      // Sandstone grinding sparks
      for (let i = 0; i < u.sparks.length; i++) {
        const sp = u.sparks[i];
        ctx.fillStyle = `rgba(255, 218, 130, ${Math.max(0, sp.life).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sp.xNorm * width, sp.yNorm * height, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawMirrorPool(state) {
      const poolY = state.poolSurfaceY * height;
      const poolH = height - poolY;

      // Dark reflective subterranean water body
      const waterGrad = ctx.createLinearGradient(0, poolY, 0, height);
      waterGrad.addColorStop(0, '#070b14');
      waterGrad.addColorStop(0.35, '#09101c');
      waterGrad.addColorStop(1, '#04060b');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, poolY, width, poolH);

      // Inverted reflections of singing stalactites in the mirror pool
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, poolY, width, poolH);
      ctx.clip();

      for (let i = 0; i < state.stalactites.length; i++) {
        const s = state.stalactites[i];
        const totalEnergy = Math.min(1.5, s.energy + s.sympatheticEnergy * 0.7);
        if (totalEnergy < 0.04) continue;

        const pal = PALETTE[s.hueType] || PALETTE.amber;
        const sx = s.xNorm * width + Math.sin(state.time * 3.5 + i) * 3.5;
        const reflLen = (s.tipYNorm - s.baseYNorm) * height * 0.45;
        const rGrad = ctx.createLinearGradient(sx, poolY, sx, poolY + reflLen);
        const a = Math.min(0.34, totalEnergy * 0.24);
        rGrad.addColorStop(0, pal.glow + a.toFixed(3) + ')');
        rGrad.addColorStop(1, pal.glow + '0)');

        ctx.fillStyle = rGrad;
        ctx.fillRect(sx - s.widthNorm * width * 1.4, poolY, s.widthNorm * width * 2.8, reflLen);
      }

      // Concentric elliptical ripples from mineral drops
      for (let i = 0; i < state.ripples.length; i++) {
        const r = state.ripples[i];
        const pal = PALETTE[r.hueType] || PALETTE.cyan;
        const rx = r.xNorm * width;
        const ry = Math.max(poolY + 6, r.yNorm * height);
        const radX = r.radius * width;
        const radY = radX * 0.24;

        ctx.strokeStyle = pal.glow + Math.max(0, r.alpha).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (radX > 8) {
          ctx.strokeStyle = pal.glow + Math.max(0, r.alpha * 0.5).toFixed(3) + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(rx, ry, radX * 0.58, radY * 0.58, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Subtle horizon shoreline shimmer at poolSurfaceY
      const shoreGrad = ctx.createLinearGradient(0, poolY - 1, width, poolY + 1);
      shoreGrad.addColorStop(0, 'rgba(72, 229, 224, 0.04)');
      shoreGrad.addColorStop(0.5, 'rgba(240, 178, 101, 0.18)');
      shoreGrad.addColorStop(1, 'rgba(72, 229, 224, 0.04)');
      ctx.fillStyle = shoreGrad;
      ctx.fillRect(0, poolY - 0.5, width, 1.5);
    }

    function drawFallingDrops(state) {
      for (let i = 0; i < state.drops.length; i++) {
        const d = state.drops[i];
        const pal = PALETTE[d.hueType] || PALETTE.cyan;
        const dx = d.xNorm * width;
        const dy = d.yNorm * height;

        ctx.fillStyle = pal.core;
        ctx.beginPath();
        ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Droplet motion streak
        ctx.strokeStyle = pal.glow + '0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx, dy - 8);
        ctx.stroke();
      }
    }

    function render(state, pointer) {
      ctx.clearRect(0, 0, width, height);

      drawCavernBackdrop(state, pointer);

      // Draw stalactites and their copper wires back-to-front by layerIndex (0 -> 1 -> 2)
      for (let layer = 0; layer <= 2; layer++) {
        for (let i = 0; i < state.stalactites.length; i++) {
          const s = state.stalactites[i];
          if (s.layerIndex !== layer) continue;
          drawCopperWireAndMallet(s, state);
          drawStalactite(s, state);
        }
      }

      // Draw the 38th unmapped formation on the far right cavern wall
      drawUnmappedFormation(state);

      // Draw falling mineral water drops
      drawFallingDrops(state);

      // Draw subterranean mirror pool & reflections
      drawMirrorPool(state);
    }

    resize();
    return {
      resize,
      render,
      getDimensions: function () { return { width, height }; }
    };
  }

  root.Stalacpipe = root.Stalacpipe || {};
  root.Stalacpipe.createRenderer = createRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
