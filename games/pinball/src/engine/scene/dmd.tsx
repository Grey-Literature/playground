import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store';
import { isTilted } from '../runtime';
import { DIFF } from '../difficulty';
import { activeTheme } from '../theme';

// Dot-matrix display. Colours and attract title come from the active theme.
export function DMD({ position = [0, 16.5, -36.1] as [number, number, number], size = [34, 10.6] as [number, number] }) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);
  const acc = useRef(0);
  useFrame((state, dt) => {
    acc.current += dt;
    if (acc.current < 0.08) return;
    acc.current = 0;
    const st = useGame.getState();
    const theme = activeTheme();
    const { on, dim, hot, bg } = theme.palette.dmd;
    const g = canvas.getContext('2d')!;
    const t = state.clock.elapsedTime;
    g.shadowBlur = 0;
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 160);
    g.textAlign = 'left';
    // attract rotates: title card (6 s) → Spirit Board top 5 (4 s) → Agent Board
    // top 5 (4 s), skipping any board that's empty
    const agentRows = [...st.agentBoards.realtime.map((e) => ({ ...e, tag: 'RT' })), ...st.agentBoards.lockstep.map((e) => ({ ...e, tag: 'LS' }))]
      .sort((a, b) => b.score - a.score);
    const pages = ['title', ...(st.board.length ? ['spirits'] : []), ...(agentRows.length ? ['agents'] : [])];
    const cycle = 6 + (pages.length - 1) * 4;
    const tc = t % cycle;
    const page = st.phase !== 'attract' || tc < 6 ? 'title' : pages[1 + Math.floor((tc - 6) / 4)];
    const boardPage = page === 'spirits';
    if (page === 'agents') {
      g.fillStyle = '#34d399';
      g.shadowColor = '#34d399'; g.shadowBlur = 10;
      g.font = '900 26px "Courier New", monospace';
      g.fillText('AGENT BOARD', 30, 34);
      g.fillStyle = DIFF.accent;
      g.textAlign = 'right';
      g.font = '700 18px "Courier New", monospace';
      g.fillText(DIFF.label, 486, 34);
      g.textAlign = 'left';
      agentRows.slice(0, 5).forEach((e, i) => {
        const y = 60 + i * 21;
        g.fillStyle = i === 0 ? hot : on;
        g.font = '700 19px "Courier New", monospace';
        g.fillText(`${i + 1}. ${e.name.toUpperCase().slice(0, 16)} ${e.tag}`, 30, y);
        g.textAlign = 'right';
        g.fillText(e.score.toLocaleString(), 486, y);
        g.textAlign = 'left';
      });
    } else if (boardPage) {
      g.fillStyle = on;
      g.shadowColor = on; g.shadowBlur = 10;
      g.font = '900 26px "Courier New", monospace';
      g.fillText('SPIRIT BOARD', 30, 34);
      g.fillStyle = DIFF.accent;
      g.textAlign = 'right';
      g.font = '700 18px "Courier New", monospace';
      g.fillText(DIFF.label, 486, 34);
      g.textAlign = 'left';
      st.board.slice(0, 5).forEach((e, i) => {
        const y = 60 + i * 21;
        g.fillStyle = i === 0 ? hot : on;
        g.font = '700 19px "Courier New", monospace';
        g.fillText(`${i + 1}. ${e.initials}`, 40, y);
        g.textAlign = 'right';
        g.fillText(e.score.toLocaleString(), 470, y);
        g.textAlign = 'left';
      });
    } else if (st.phase === 'attract') {
      g.fillStyle = on;
      g.shadowColor = on; g.shadowBlur = 12;
      const title = theme.copy.dmdTitle;
      g.font = `900 ${title.length > 12 ? 40 : 52}px "Courier New", monospace`;
      g.fillText(title, 30, 62);
      g.font = '700 24px "Courier New", monospace';
      g.fillStyle = Math.sin(t * 4) > 0 ? on : dim;
      g.fillText('> PRESS ENTER TO START <', 40, 108);
      g.fillStyle = dim;
      g.font = '700 20px "Courier New", monospace';
      g.fillText(`HIGH ${st.highScore.toLocaleString().padStart(9, ' ')}`, 40, 140);
      g.fillStyle = DIFF.accent;
      g.textAlign = 'right';
      g.fillText(`MODE ${DIFF.label}`, 486, 140);
      g.textAlign = 'left';
      for (let i = 0; i < 24; i++) {
        const h = 6 + Math.abs(Math.sin(t * 3 + i * 0.6)) * 22;
        g.fillStyle = i % 3 === 0 ? hot : on;
        g.fillRect(30 + i * 19, 150 - h, 12, h);
      }
    } else if (st.phase === 'gameover') {
      g.fillStyle = on;
      g.shadowColor = on; g.shadowBlur = 12;
      g.font = '900 46px "Courier New", monospace';
      g.fillText('GAME OVER', 110, 62);
      g.font = '700 30px "Courier New", monospace';
      g.fillText(`${st.score.toLocaleString()}`, 150, 104);
      g.fillStyle = Math.sin(t * 4) > 0 ? on : dim;
      g.font = '700 20px "Courier New", monospace';
      g.fillText('PRESS ENTER - PLAY AGAIN', 110, 138);
    } else {
      if (st.ballPhase === 'bonus' || st.bonusCounting) {
        g.fillStyle = on;
        g.shadowColor = on; g.shadowBlur = 10;
        g.font = '900 30px "Courier New", monospace';
        g.fillText('BONUS', 30, 48);
        g.font = '900 44px "Courier New", monospace';
        g.fillText(`${st.bonusDisplay.toLocaleString()}`, 200, 52);
        g.font = '700 22px "Courier New", monospace';
        g.fillStyle = dim;
        g.fillText(`BALL ${st.ball}  x${st.multiplier}`, 30, 92);
        g.fillStyle = on;
        g.fillText(`TOTAL ${st.score.toLocaleString()}`, 30, 126);
      } else {
        const tilted = isTilted();
        g.fillStyle = tilted && Math.sin(t * 16) > 0 ? '#ff2200' : on;
        g.shadowColor = on; g.shadowBlur = 10;
        g.font = '900 56px "Courier New", monospace';
        g.fillText(st.score.toLocaleString().padStart(9, ' '), 24, 64);
        g.font = '700 22px "Courier New", monospace';
        g.fillStyle = hot;
        g.fillText(`BALL ${st.ball}/${st.totalBalls}`, 30, 100);
        g.fillText(`x${st.multiball ? st.multiplier * 2 : st.multiplier}${st.multiball ? ' 2X MB!' : ''}`, 250, 100);
        if (st.multiball) {
          g.fillStyle = '#22c55e';
          g.fillRect(250, 110, (st.multiballT / DIFF.mbTime) * 200, 10);
        }
        g.fillStyle = dim;
        g.font = '700 19px "Courier New", monospace';
        g.fillText((st.bigMessage || st.message).slice(0, 34), 30, 136);
        if (tilted) {
          g.fillStyle = '#ff2200';
          g.font = '900 30px "Courier New", monospace';
          g.fillText('!! TILT !!', 330, 136);
        }
      }
      g.fillStyle = dim;
      g.globalAlpha = 0.7;
      g.font = '700 16px "Courier New", monospace';
      g.textAlign = 'right';
      g.fillText(`HI ${st.highScore.toLocaleString()}`, 492, 24);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
    // dot matrix overlay
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < 160; y += 3) g.fillRect(0, y, 512, 1);
    for (let x = 0; x < 512; x += 3) g.fillRect(x, 0, 1, 160);
    tex.needsUpdate = true;
  });
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}
