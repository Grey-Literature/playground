import { useEffect, type CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import './themes';
import { PinballScene } from './engine/scene/PinballScene';
import { HUD } from './engine/hud/HUD';
import { useGame, bootTheme } from './engine/store';
import { themeById } from './engine/theme';
import { gameRef, spawnBallAt } from './engine/runtime';
import { DIFF_ORDER } from './engine/difficulty';
import { sound } from './engine/audio';
import { createAgentApi } from './engine/agent';

bootTheme();

// ?debug exposes the live runtime for browser-driven checks (Playwright screenshots
// of specific ball states). Opt-in only; nothing is exposed on a normal visit —
// and because it can spawn balls, nothing a ?debug page scores is ever filed.
// ?agent installs the agent API (engine/agent.ts) as window.flipperSeance.
try {
  const q = new URLSearchParams(window.location.search);
  if (q.has('debug')) {
    (window as unknown as { __pinball: unknown }).__pinball = { gameRef, useGame, spawnBallAt };
    useGame.setState({ unranked: true });
  }
  if (q.has('agent')) {
    (window as unknown as { flipperSeance: unknown }).flipperSeance = createAgentApi();
    console.info('%cFLIPPER SÉANCE — agent API ready: flipperSeance.help()', 'color:#fbbf24;font-weight:bold');
  }
} catch { /* no window */ }

function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = useGame.getState();
      // initials entry (or any text field) owns the keyboard — nothing leaks into play
      if (st.initialsEntry || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return;
      // prevent scrolling for game keys
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      sound.ensure();

      if (e.code === 'KeyH') { st.toggleHelp(); return; }
      if (e.code === 'Escape') {
        if (st.showHelp) { st.toggleHelp(); return; }
        if (st.phase === 'playing') st.setPaused(!st.paused);
        return;
      }

      // table + difficulty select (outside live play so nobody cheats a save)
      if (st.phase !== 'playing') {
        const digit = /^Digit([1-5])$/.exec(e.code);
        if (digit) {
          e.preventDefault();
          st.setDifficulty(DIFF_ORDER[Number(digit[1]) - 1]);
          return;
        }
        if (e.code === 'KeyT') { st.cycleTheme(e.shiftKey ? -1 : 1); return; }
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
          e.preventDefault();
          st.startGame();
        }
        return;
      }

      switch (e.code) {
        case 'KeyZ':
        case 'ArrowLeft':
          st.setFlipper('left', true);
          break;
        case 'KeyM':
        case 'ArrowRight':
        case 'Slash':
          st.setFlipper('right', true);
          break;
        case 'Space':
        case 'ArrowDown':
          st.chargePlunger();
          break;
        case 'KeyA':
        case 'KeyX':
          st.nudge('left');
          break;
        case 'KeyD':
        case 'KeyN':
          st.nudge('right');
          break;
        case 'KeyW':
        case 'ArrowUp':
          st.nudge('up');
          break;
        case 'Enter':
          // quick re-plunge: a tap aims for the skill zone
          if (st.ballPhase === 'plunger' && !gameRef.plungerCharging) {
            gameRef.plungerPower = 0.4;
            st.releasePlunger();
          }
          break;
        case 'KeyC':
          st.cycleCamera();
          break;
        case 'KeyP':
          st.setPaused(!st.paused);
          break;
        case 'KeyB':
          // rescue a stuck ball without ending the game
          st.reserveBall();
          break;
        case 'KeyR':
          st.startGame();
          break;
      }
    };

    const up = (e: KeyboardEvent) => {
      const st = useGame.getState();
      switch (e.code) {
        case 'KeyZ':
        case 'ArrowLeft':
          st.setFlipper('left', false);
          break;
        case 'KeyM':
        case 'ArrowRight':
        case 'Slash':
          st.setFlipper('right', false);
          break;
        case 'Space':
        case 'ArrowDown':
          if (gameRef.plungerCharging) st.releasePlunger();
          break;
      }
    };

    const blur = () => {
      const st = useGame.getState();
      if (st.phase !== 'playing') return;
      // an agent's browser tooling steals focus constantly; its games don't auto-pause
      if (st.run.agent) return;
      st.setFlipper('left', false);
      st.setFlipper('right', false);
      if (gameRef.plungerCharging) st.releasePlunger();
      st.setPaused(true);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}

/** The active theme's palette as CSS variables — the HUD's pa-/pb- colours and fonts read these. */
function useThemeVars(): CSSProperties {
  const themeId = useGame((s) => s.themeId);
  const p = themeById(themeId)?.palette;
  if (!p) return {};
  const vars: Record<string, string> = {
    '--pb-font-display': p.fontDisplay,
    '--pb-font-body': p.fontBody,
    '--pb-bg': p.bg,
    background: p.bg,
  };
  for (const [k, v] of Object.entries(p.a)) vars[`--color-pa-${k}`] = v;
  for (const [k, v] of Object.entries(p.b)) vars[`--color-pb-${k}`] = v;
  return vars as CSSProperties;
}

export default function App() {
  useKeyboard();
  const vars = useThemeVars();
  return (
    <div
      className="fixed inset-0 overflow-hidden text-white select-none"
      style={{ ...vars, fontFamily: 'var(--pb-font-body)' }}
      onPointerDown={() => sound.ensure()}
      onTouchStart={() => sound.ensure()}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, position: [0, 72, 50], near: 1, far: 600 }}
      >
        <PinballScene />
      </Canvas>
      <HUD />
    </div>
  );
}
