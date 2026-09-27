import { useState } from 'react';
import { useGame } from '../store';
import { scores, cleanInitials } from '../scores';
import { DIFF_ORDER, DIFF, diffFor } from '../difficulty';
import { obstacleCount } from '../table';
import { activeTheme, hallThemes, themeById } from '../theme';
import {
  Volume2, VolumeX, Camera, Vibrate, VibrateOff, CircleHelp,
  Play, Pause, RotateCcw, Trophy, Zap, TriangleAlert, LifeBuoy, Ghost,
} from 'lucide-react';

export function fmt(n: number) {
  return n.toLocaleString('en-US');
}

export function Kbd({ children, active, wide }: { children: React.ReactNode; active?: boolean; wide?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${wide ? 'px-2.5' : 'px-1.5'} min-w-7 h-7 rounded-md border text-[11px] font-bold tracking-wide transition-all duration-75 ${
        active
          ? 'bg-pa-400 text-slate-950 border-pa-300 shadow-[0_0_14px_color-mix(in_srgb,var(--color-pa-400)_80%,transparent)] scale-105'
          : 'bg-slate-800/80 text-slate-200 border-slate-600/80'
      }`}
    >
      {children}
    </span>
  );
}

function DifficultyPicker({ compact }: { compact?: boolean }) {
  const selected = useGame((s) => s.difficulty);
  useGame((s) => s.themeId); // tier copy is theme-specific
  const setDifficulty = useGame((s) => s.setDifficulty);
  return (
    <div className={`grid w-full gap-1.5 ${compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'}`}>
      {DIFF_ORDER.map((id, i) => {
        const cfg = diffFor(id);
        const on = selected === id;
        return (
          <button
            key={id}
            onClick={() => setDifficulty(id)}
            title={cfg.blurb}
            className={`group pointer-events-auto relative overflow-hidden rounded-lg border px-2 py-2 text-left transition-all duration-150 ${
              on ? 'scale-[1.03] border-transparent shadow-lg' : 'border-slate-700/60 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/70'
            }`}
            style={on ? { background: `${cfg.accent}22`, borderColor: cfg.accent, boxShadow: `0 0 18px ${cfg.accent}55` } : undefined}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[10px] font-black tracking-wider ${on ? '' : 'text-slate-300'}`} style={on ? { color: cfg.accent } : undefined}>
                {cfg.label}
              </span>
              <span className="text-[9px] font-bold text-slate-500">{i + 1}</span>
            </div>
            {!compact && (
              <div className="mt-1 flex items-center gap-1">
                <span className="h-1 w-1 rounded-full" style={{ background: cfg.accent }} />
                <span className="text-[9px] font-bold text-slate-400">+{obstacleCount(id)} obst</span>
                <span className="text-[9px] font-bold text-slate-500">·</span>
                <span className="text-[9px] font-black" style={{ color: cfg.score >= 1 ? cfg.accent : '#64748b' }}>
                  {cfg.score >= 1 ? `${cfg.score.toFixed(2)}x pts` : `${cfg.score.toFixed(2)}x`}
                </span>
              </div>
            )}
            {on && <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: cfg.accent }} />}
          </button>
        );
      })}
    </div>
  );
}

function DifficultyBadge() {
  const difficulty = useGame((s) => s.difficulty);
  useGame((s) => s.themeId);
  const cfg = diffFor(difficulty);
  return (
    <div
      className="pointer-events-none flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-md"
      style={{ borderColor: `${cfg.accent}66`, background: `${cfg.accent}14` }}
      title={cfg.blurb}
    >
      <Zap className="h-3 w-3" style={{ color: cfg.accent }} />
      <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: cfg.accent }}>{cfg.label}</span>
      {cfg.score !== 1 && <span className="text-[10px] font-black text-slate-300">{cfg.score}x</span>}
    </div>
  );
}

function TopBar() {
  const score = useGame((s) => s.score);
  const highScore = useGame((s) => s.highScore);
  const ball = useGame((s) => s.ball);
  const totalBalls = useGame((s) => s.totalBalls);
  const multiplier = useGame((s) => s.multiplier);
  const multiball = useGame((s) => s.multiball);
  const multiballT = useGame((s) => s.multiballT);
  const phase = useGame((s) => s.phase);
  const isHigh = phase === 'playing' && score > 0 && score >= highScore;

  return (
    <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
      {/* score */}
      <div className="min-w-0 flex-1">
        <div className="inline-block rounded-xl border border-pa-400/25 bg-slate-950/70 px-4 py-2 backdrop-blur-md shadow-[0_0_30px_color-mix(in_srgb,var(--color-pa-400)_15%,transparent)]">
          <div className="text-[10px] font-bold tracking-[0.3em] text-pa-400/80">SCORE</div>
          <div className={`font-display text-2xl sm:text-4xl font-black tabular-nums leading-none ${isHigh ? 'text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.7)]' : 'text-white drop-shadow-[0_0_12px_color-mix(in_srgb,var(--color-pa-400)_60%,transparent)]'}`}>
            {fmt(score)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <Trophy className="h-3 w-3 text-amber-400" />
            <span className="tabular-nums">{fmt(highScore)}</span>
            {isHigh && <span className="ml-1 animate-pulse rounded bg-yellow-400/20 px-1.5 py-px text-[10px] font-black text-yellow-300">NEW BEST!</span>}
          </div>
        </div>
      </div>

      {/* multiball / multiplier center */}
      <div className="hidden sm:flex flex-col items-center gap-2 pt-1">
        <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md ${multiball ? 'border-pb-400/60 bg-pb-950/70 shadow-[0_0_24px_color-mix(in_srgb,var(--color-pb-400)_50%,transparent)]' : 'border-slate-600/50 bg-slate-950/70'}`}>
          <Zap className={`h-4 w-4 ${multiball ? 'text-pb-300' : multiplier >= 5 ? 'text-yellow-300' : 'text-pa-300'}`} />
          <span className={`font-display text-lg font-black ${multiball ? 'text-pb-200' : 'text-white'}`}>
            {multiball ? `${multiplier * 2}X` : `${multiplier}X`}
          </span>
          <span className="text-[10px] font-bold tracking-widest text-slate-400">{multiball ? 'MULTIBALL' : 'MULTI'}</span>
        </div>
        {multiball && (
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-pb-400 to-pa-300 transition-all" style={{ width: `${(multiballT / DIFF.mbTime) * 100}%` }} />
          </div>
        )}
        <DifficultyBadge />
      </div>

      {/* ball */}
      <div className="flex flex-1 justify-end">
        <div className="rounded-xl border border-pb-400/25 bg-slate-950/70 px-4 py-2 text-right backdrop-blur-md shadow-[0_0_30px_color-mix(in_srgb,var(--color-pb-400)_15%,transparent)]">
          <div className="text-[10px] font-bold tracking-[0.3em] text-pb-400/80">BALL</div>
          <div className="font-display text-2xl sm:text-4xl font-black leading-none text-white drop-shadow-[0_0_12px_color-mix(in_srgb,var(--color-pb-400)_60%,transparent)] tabular-nums">
            {ball}<span className="text-slate-500 text-lg sm:text-2xl">/{totalBalls}</span>
          </div>
          <BallsDots />
        </div>
      </div>
    </div>
  );
}

function BallsDots() {
  const ball = useGame((s) => s.ball);
  const totalBalls = useGame((s) => s.totalBalls);
  const phase = useGame((s) => s.phase);
  if (phase !== 'playing') return <div className="mt-1 h-2" />;
  return (
    <div className="mt-1.5 flex justify-end gap-1">
      {Array.from({ length: Math.min(totalBalls, 6) }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < totalBalls - ball + 1 ? 'bg-pb-400 shadow-[0_0_6px_color-mix(in_srgb,var(--color-pb-400)_90%,transparent)]' : 'bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

function MessageBar() {
  const message = useGame((s) => s.message);
  const messageT = useGame((s) => s.messageT);
  const phase = useGame((s) => s.phase);
  if (phase !== 'playing') return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4">
      <div key={messageT} className="msg-pop max-w-[46vw] lg:max-w-[38vw] truncate rounded-full border border-slate-600/60 bg-slate-950/75 px-4 py-1 text-center text-xs font-bold tracking-wide text-slate-100 backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}

function Popups() {
  const popups = useGame((s) => s.popups);
  return (
    <div className="pointer-events-none absolute right-4 sm:right-8 top-32 z-20 flex flex-col items-end gap-2">
      {popups.map((p) => (
        <div key={p.id} className="popup-rise rounded-lg border border-yellow-300/40 bg-slate-950/85 px-3 py-1.5 text-right backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.25)]">
          <div className="font-display text-lg font-black text-yellow-300 tabular-nums">{p.text}</div>
          {p.sub && <div className="text-[10px] font-black tracking-[0.2em] text-yellow-200/70">{p.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function BigMessage() {
  const big = useGame((s) => s.bigMessage);
  const t = useGame((s) => s.bigMessageT);
  if (!big) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div key={t} className="big-pop px-6 text-center">
        <div className="font-display text-4xl sm:text-7xl font-black tracking-tight text-white drop-shadow-[0_0_25px_color-mix(in_srgb,var(--color-pa-400)_90%,transparent)]" style={{ WebkitTextStroke: '1px color-mix(in_srgb,var(--color-pa-400)_60%,transparent)' }}>
          {big}
        </div>
      </div>
    </div>
  );
}

function PlungerMeter() {
  const ballPhase = useGame((s) => s.ballPhase);
  const charging = useGame((s) => s.plungerCharging);
  const power = useGame((s) => s.plungerPower);
  const phase = useGame((s) => s.phase);
  if (phase !== 'playing' || ballPhase !== 'plunger') return null;
  return (
    <div className="pointer-events-none absolute bottom-40 right-4 sm:right-8 lg:bottom-20 lg:right-44 z-20 flex flex-col items-center gap-2">
      <div className="text-[10px] font-black tracking-[0.25em] text-slate-300">POWER</div>
      <div className="relative h-44 w-5 overflow-hidden rounded-full border border-slate-600 bg-slate-900/90">
        {/* skill zone */}
        <div className="absolute left-0 right-0 bg-emerald-500/50" style={{ bottom: '32%', height: '16%' }} />
        <div
          className={`absolute bottom-0 left-0 right-0 transition-none ${power > 0.85 ? 'bg-gradient-to-t from-yellow-400 to-red-500' : 'bg-gradient-to-t from-pa-500 to-pb-400'}`}
          style={{ height: `${power * 100}%` }}
        />
      </div>
      <div className={`text-[11px] font-black ${charging ? 'animate-pulse text-pa-300' : 'text-slate-400'}`}>
        {charging ? 'RELEASE!' : 'HOLD SPACE'}
      </div>
    </div>
  );
}

function ControlsBar() {
  const st = useGame.getState;
  const toggleMute = useGame((s) => s.toggleMute);
  const muted = useGame((s) => s.muted);
  const cycleCamera = useGame((s) => s.cycleCamera);
  const cameraMode = useGame((s) => s.cameraMode);
  const toggleShake = useGame((s) => s.toggleShake);
  const shakeEnabled = useGame((s) => s.shakeEnabled);
  const toggleHelp = useGame((s) => s.toggleHelp);
  const paused = useGame((s) => s.paused);
  const setPaused = useGame((s) => s.setPaused);
  const phase = useGame((s) => s.phase);
  void st;
  return (
    // Small screens: a column on the right edge (no side panels there).
    // Large screens: the theme's side panels own the right edge, so the
    // buttons move to the bottom-right corner, mirroring the key legend: a
    // two-row block under the panel column on narrower desktops, one row at xl.
    <div className="absolute top-24 sm:top-28 right-3 sm:right-4 z-30 flex flex-col gap-2 lg:top-auto lg:bottom-3 lg:right-3 lg:w-36 lg:flex-row lg:flex-wrap lg:items-center lg:justify-center lg:gap-1.5 lg:rounded-xl lg:border lg:border-slate-700/50 lg:bg-slate-950/75 lg:p-1.5 lg:backdrop-blur-md xl:w-auto xl:flex-nowrap">
      {[
        { icon: muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />, fn: toggleMute, label: muted ? 'Unmute' : 'Mute', active: !muted },
        { icon: <Camera className="h-4 w-4" />, fn: cycleCamera, label: `Cam: ${cameraMode}`, active: true },
        { icon: shakeEnabled ? <Vibrate className="h-4 w-4" /> : <VibrateOff className="h-4 w-4" />, fn: toggleShake, label: 'Shake', active: shakeEnabled },
        { icon: <CircleHelp className="h-4 w-4" />, fn: toggleHelp, label: 'Help', active: false },
      ].map((b, i) => (
        <button
          key={i}
          onClick={b.fn}
          title={b.label}
          className={`pointer-events-auto flex h-9 w-9 lg:h-8 lg:w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
            b.active ? 'border-pa-400/40 bg-slate-900/80 text-pa-300' : 'border-slate-700/60 bg-slate-900/80 text-slate-400'
          }`}
        >
          {b.icon}
        </button>
      ))}
      {phase === 'playing' && (
        <>
          <span className="hidden h-6 w-px bg-slate-700 xl:block" aria-hidden="true" />
          <button
            onClick={() => useGame.getState().reserveBall()}
            title="Ball reset (B) — frees a stuck ball, no ball lost"
            className="pointer-events-auto flex h-9 w-9 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-amber-400/50 bg-slate-900/80 text-amber-300 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <LifeBuoy className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPaused(!paused)}
            title={paused ? 'Resume' : 'Pause'}
            className="pointer-events-auto flex h-9 w-9 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80 text-slate-300 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={() => useGame.getState().startGame()}
            title="Restart"
            className="pointer-events-auto flex h-9 w-9 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/80 text-slate-300 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// Compact key legend tucked into the bottom-left corner, off the playfield.
// Fades back while the ball is live so it never competes with the table.
function KeyHints() {
  const leftPressed = useGame((s) => s.leftPressed);
  const rightPressed = useGame((s) => s.rightPressed);
  const plungerCharging = useGame((s) => s.plungerCharging);
  const phase = useGame((s) => s.phase);
  const ballPhase = useGame((s) => s.ballPhase);
  const live = phase === 'playing' && ballPhase === 'active';
  // During play on large-but-short screens the theme's side panels fill the
  // left column; the legend steps aside (keys stay in the help modal / attract card).
  const rows: { keys: React.ReactNode; label: string }[] = [
    { keys: <><Kbd active={leftPressed}>Z</Kbd><Kbd active={leftPressed}>◀</Kbd></>, label: 'LEFT' },
    { keys: <><Kbd active={rightPressed}>M</Kbd><Kbd active={rightPressed}>▶</Kbd></>, label: 'RIGHT' },
    { keys: <Kbd active={plungerCharging} wide>SPACE</Kbd>, label: 'PLUNGE' },
    { keys: <><Kbd>A</Kbd><Kbd>W</Kbd><Kbd>D</Kbd></>, label: 'NUDGE' },
    { keys: <Kbd>B</Kbd>, label: 'BALL RESET' },
    { keys: <><Kbd>1</Kbd><Kbd>…</Kbd><Kbd>5</Kbd></>, label: 'MODE' },
    { keys: <Kbd>⏎</Kbd>, label: phase === 'playing' ? 'START' : 'PLAY' },
  ];
  return (
    <div
      className={`absolute bottom-3 left-3 z-20 hidden flex-col gap-1 rounded-xl border border-slate-700/50 bg-slate-950/75 px-3 py-2 backdrop-blur-md transition-opacity duration-500 hover:opacity-100 sm:flex ${live ? 'opacity-35' : 'opacity-100'} ${phase === 'playing' ? 'lg:hidden lg:tall:flex' : ''}`}
    >
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-1">
          {r.keys}
          <span className="ml-1 text-[10px] font-bold tracking-wide text-slate-300">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function TouchControls() {
  const phase = useGame((s) => s.phase);
  const ballPhase = useGame((s) => s.ballPhase);
  if (phase !== 'playing') return null;
  const setFlipper = useGame.getState().setFlipper;
  const press = (side: 'left' | 'right', v: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    setFlipper(side, v);
  };
  const plungerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    useGame.getState().chargePlunger();
  };
  const plungerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!useGame.getState().plungerCharging) return;
    useGame.getState().releasePlunger();
  };
  return (
    <div className="absolute bottom-16 left-0 right-0 z-30 flex items-end justify-between px-4 sm:hidden">
      <button
        className="pointer-events-auto h-20 w-24 rounded-2xl border border-pa-400/50 bg-pa-500/20 text-2xl font-black text-pa-200 backdrop-blur-md active:bg-pa-400/50"
        onPointerDown={press('left', true)}
        onPointerUp={press('left', false)}
        onPointerLeave={press('left', false)}
        onPointerCancel={press('left', false)}
      >
        ◀
      </button>
      {ballPhase === 'plunger' ? (
        <button
          className="pointer-events-auto h-20 w-20 rounded-full border border-yellow-300/60 bg-yellow-500/25 text-xs font-black text-yellow-200 backdrop-blur-md active:bg-yellow-400/50"
          onPointerDown={plungerDown}
          onPointerUp={plungerUp}
          onPointerLeave={plungerUp}
          onPointerCancel={plungerUp}
        >
          HOLD<br />FIRE
        </button>
      ) : (
        <button
          className="pointer-events-auto h-14 w-14 rounded-full border border-slate-600 bg-slate-800/60 text-lg backdrop-blur-md active:bg-slate-600"
          onPointerDown={(e) => { e.preventDefault(); useGame.getState().nudge('up'); }}
        >
          👊
        </button>
      )}
      <button
        className="pointer-events-auto h-20 w-24 rounded-2xl border border-pb-400/50 bg-pb-500/20 text-2xl font-black text-pb-200 backdrop-blur-md active:bg-pb-400/50"
        onPointerDown={press('right', true)}
        onPointerUp={press('right', false)}
        onPointerLeave={press('right', false)}
        onPointerCancel={press('right', false)}
      >
        ▶
      </button>
    </div>
  );
}

function AttractScreen() {
  const phase = useGame((s) => s.phase);
  const selected = useGame((s) => s.difficulty);
  const themeId = useGame((s) => s.themeId);
  const theme = themeById(themeId);
  if (phase !== 'attract' || !theme) return null;
  const { Title } = theme;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-slate-950/60 via-slate-950/40 to-slate-950/80 p-4">
      <div className="attract-in max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-pa-400/25 bg-[color-mix(in_srgb,var(--pb-bg,#020617)_85%,transparent)] p-6 sm:p-10 text-center shadow-[0_0_80px_color-mix(in_srgb,var(--color-pa-400)_25%,transparent)] backdrop-blur-xl">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-950/40 px-3 py-0.5 text-[10px] font-black tracking-[0.3em] text-amber-300">
          WORK IN PROGRESS · MORE TABLES BEING SUMMONED
        </div>
        <ThemePicker />
        <div className="mb-1 mt-5 text-[11px] font-black tracking-[0.5em] text-pa-400">INSERT COIN • 3 BALLS</div>
        <Title />

        <div className="mx-auto mt-5 max-w-md">
          <SpiritBoard limit={5} />
        </div>

        <div className="mx-auto mt-5 max-w-xl text-left">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.35em] text-slate-400">SELECT DIFFICULTY</span>
            <span className="text-[10px] font-bold text-slate-500">keys 1–5</span>
          </div>
          <DifficultyPicker />
          <div className="mt-2 text-center text-[11px] font-semibold text-slate-400" style={{ color: diffFor(selected).accent }}>
            {diffFor(selected).blurb}
          </div>
        </div>

        <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-2 text-left sm:grid-cols-4">
          {[
            { k: ['Z', '◀'], label: 'Left flipper' },
            { k: ['M', '▶'], label: 'Right flipper' },
            { k: ['SPACE'], label: 'Hold = plunge', wide: true },
            { k: ['A', 'W', 'D'], label: 'Nudge (tilt!)' },
            { k: ['B'], label: 'Ball reset' },
            { k: ['C'], label: 'Camera view' },
            { k: ['T'], label: 'Next table' },
          ].map((r, i) => (
            <div key={i} className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-2">
              <div className="flex gap-1">
                {r.k.map((k) => (
                  <span key={k} className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-slate-600 bg-slate-800 px-1 text-[10px] font-black text-slate-100">{k}</span>
                ))}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-400">{r.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => useGame.getState().startGame()}
          className="group pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pa-500 to-pb-500 px-8 py-3.5 font-display text-lg font-black tracking-wide text-white shadow-[0_0_35px_color-mix(in_srgb,var(--color-pa-400)_50%,transparent)] transition-all hover:scale-105 hover:shadow-[0_0_50px_color-mix(in_srgb,var(--color-pb-400)_60%,transparent)] active:scale-95"
        >
          <Play className="h-5 w-5 fill-current" /> PRESS ENTER / TAP TO PLAY
        </button>
        <div className="mt-3 animate-pulse text-xs font-bold tracking-widest text-pa-300/80">{theme.copy.attractHint}</div>
        <div className="mt-4 text-[11px] text-slate-500">{theme.copy.attractFooter}</div>
      </div>
    </div>
  );
}

function GameOverScreen() {
  const phase = useGame((s) => s.phase);
  const score = useGame((s) => s.score);
  const difficulty = useGame((s) => s.difficulty);
  const entry = useGame((s) => s.initialsEntry);
  if (phase !== 'gameover') return null;
  const cfg = diffFor(difficulty);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
      <div className="attract-in max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-pb-400/30 bg-[color-mix(in_srgb,var(--pb-bg,#020617)_90%,transparent)] p-8 text-center shadow-[0_0_60px_color-mix(in_srgb,var(--color-pb-400)_30%,transparent)] backdrop-blur-xl">
        <div className="flex items-center justify-center gap-2 text-[11px] font-black tracking-[0.4em] text-pb-400">
          GAME OVER
          <span className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.2em]" style={{ color: cfg.accent, background: `${cfg.accent}1a`, border: `1px solid ${cfg.accent}55` }}>
            {cfg.label}{cfg.score !== 1 ? ` · ${cfg.score}X PTS` : ''}
          </span>
        </div>
        <div className="font-display mt-2 text-5xl font-black text-white tabular-nums drop-shadow-[0_0_20px_color-mix(in_srgb,var(--color-pb-400)_60%,transparent)]">{fmt(score)}</div>
        {entry ? <InitialsEntry rank={entry.rank} /> : (
          <div className="mt-4 text-left"><SpiritBoard limit={10} /></div>
        )}
        {!entry && <>
        <div className="mt-5 text-left">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.3em] text-slate-500">RETRY ON A DIFFERENT TIER?</div>
          <DifficultyPicker compact />
        </div>
        <button
          onClick={() => useGame.getState().startGame()}
          className="pointer-events-auto mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pa-500 to-pb-500 px-6 py-3 font-display text-base font-black text-white shadow-[0_0_30px_color-mix(in_srgb,var(--color-pa-400)_40%,transparent)] transition-all hover:scale-[1.02] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" /> PLAY AGAIN (ENTER)
        </button>
        </>}
      </div>
    </div>
  );
}

function BonusOverlay() {
  const bonusCounting = useGame((s) => s.bonusCounting);
  const bonusDisplay = useGame((s) => s.bonusDisplay);
  const multiplier = useGame((s) => s.multiplier);
  if (!bonusCounting) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="rounded-2xl border border-slate-600/60 bg-slate-950/90 px-10 py-6 text-center backdrop-blur-xl shadow-2xl">
        <div className="text-[11px] font-black tracking-[0.4em] text-slate-400">BALL BONUS ×{multiplier}</div>
        <div className="font-display mt-1 text-4xl font-black text-pa-300 tabular-nums">+{fmt(bonusDisplay)}</div>
      </div>
    </div>
  );
}

function StuckHint() {
  const stuckHint = useGame((s) => s.stuckHint);
  const phase = useGame((s) => s.phase);
  if (!stuckHint || phase !== 'playing') return null;
  return (
    <div className="pointer-events-none absolute bottom-40 left-0 right-0 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-950/85 px-4 py-2 backdrop-blur-md shadow-[0_0_28px_rgba(251,191,36,0.35)]">
        <LifeBuoy className="h-4 w-4 animate-pulse text-amber-300" />
        <span className="text-xs font-black tracking-widest text-amber-200">BALL STUCK?</span>
        <button
          onClick={() => useGame.getState().reserveBall()}
          className="rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950 transition hover:bg-amber-300 active:scale-95"
        >
          PRESS B TO RESET
        </button>
      </div>
    </div>
  );
}

function TiltFlash() {
  const tilted = useGame((s) => s.tilted);
  if (!tilted) return null;
  return <div className="tilt-flash pointer-events-none absolute inset-0 z-30 rounded-none" />;
}

function PausedOverlay() {
  const paused = useGame((s) => s.paused);
  const phase = useGame((s) => s.phase);
  if (!paused || phase !== 'playing') return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="rounded-2xl border border-slate-600 bg-slate-900 px-10 py-8 text-center">
        <div className="font-display text-3xl font-black text-white">PAUSED</div>
        <div className="mt-2 text-sm text-slate-400">Press P to resume</div>
        <button onClick={() => useGame.getState().setPaused(false)} className="pointer-events-auto mt-4 rounded-xl bg-pa-500 px-6 py-2 font-bold text-slate-950 hover:bg-pa-400">
          RESUME
        </button>
      </div>
    </div>
  );
}

function HelpModal() {
  const show = useGame((s) => s.showHelp);
  const toggle = useGame((s) => s.toggleHelp);
  useGame((s) => s.themeId);
  if (!show) return null;
  const theme = activeTheme();
  const sets = theme.copy.obstacleSets;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={toggle}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-black text-white">HOW TO PLAY — {theme.copy.name.toUpperCase()}</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p><b className="text-pa-300">Flippers:</b> <Kbd>Z</Kbd> / <Kbd>◀</Kbd> left, <Kbd>M</Kbd> / <Kbd>▶</Kbd> right. Time your shots — late flips aim up the middle, early flips aim the sides.</p>
          <p><b className="text-pa-300">Plunger:</b> hold <Kbd wide>SPACE</Kbd>, release in the <span className="font-bold text-emerald-400">green zone</span> then hit a top lane for a 15K SKILL SHOT.</p>
          <p><b className="text-pa-300">Nudge:</b> <Kbd>A</Kbd> <Kbd>W</Kbd> <Kbd>D</Kbd> shoves the machine to save drains — but too many nudges in 2.5s = <span className="font-bold text-red-400">TILT</span> (flippers die 5s).</p>
          {theme.help}
          <p><b className="text-amber-300">Stuck ball:</b> press <Kbd>B</Kbd> to re-serve the ball to the plunger. You keep your score and <i>don't</i> lose a ball. The machine also auto-kicks a resting ball after ~3s.</p>
          <p><b className="text-pa-300">Difficulty</b> (<Kbd>1</Kbd>–<Kbd>5</Kbd> on the title screen): Super Easy → Impossible. Each tier scales gravity, launch power, bounciness and flipper snap{sets.length ? <>, adds obstacles ({sets.join(' → ')})</> : null}, and multiplies all points earned. Best scores are kept per table and per tier — Impossible pays 1.5x.</p>
          <p><b className="text-amber-300">Spirit Board:</b> the top 10 for each table and difficulty, with initials. It lives in <i>this browser only</i> — another device keeps its own board. <ClearBoardButton /></p>
          <p><b className="text-pb-300">Tables:</b> <Kbd>T</Kbd> on the title screen summons the next table. <b className="text-pa-300">Extra balls</b> at 120K / 300K / 600K. <b className="text-pa-300">Camera:</b> <Kbd>C</Kbd> cycles Auto / Broadcast / Top / Cinematic.</p>
        </div>
        <button onClick={toggle} className="pointer-events-auto mt-5 w-full rounded-xl bg-gradient-to-r from-pa-500 to-pb-500 py-2.5 font-black text-white">GOT IT</button>
      </div>
    </div>
  );
}

// The hall: pick which table's ghost to summon. Only offered between games.
function ThemePicker() {
  const themeId = useGame((s) => s.themeId);
  const setTheme = useGame((s) => s.setTheme);
  const current = themeById(themeId);
  // a hidden fixture table shows itself in the picker only while it's active
  const themes = current?.hidden ? [...hallThemes(), current] : hallThemes();
  return (
    <div className="mx-auto max-w-xl text-left">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.35em] text-slate-400">
          <Ghost className="h-3 w-3" /> FLIPPER SÉANCE — SUMMON A TABLE
        </span>
        {themes.length > 1 && <span className="text-[10px] font-bold text-slate-500">key T</span>}
      </div>
      <div className={`grid gap-2 ${themes.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {themes.map((t) => {
          const on = t.id === themeId;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`pointer-events-auto rounded-xl border px-3 py-2 text-left transition-all ${on ? 'scale-[1.02]' : 'border-slate-700/60 bg-slate-900/50 hover:border-slate-500'}`}
              style={on ? { borderColor: t.palette.a['400'], background: `${t.palette.a['400']}1a`, boxShadow: `0 0 18px ${t.palette.a['400']}44` } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: `linear-gradient(135deg, ${t.palette.a['400']}, ${t.palette.b['400']})` }} />
                <span className="text-sm font-black tracking-wide text-white" style={{ fontFamily: t.palette.fontDisplay }}>{t.copy.name}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{t.copy.tagline}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Spirit Board (local arcade leaderboard) ----------------
export function SpiritBoard({ limit = 10 }: { limit?: number }) {
  const board = useGame((s) => s.board);
  const lastRank = useGame((s) => s.lastEntryRank);
  const difficulty = useGame((s) => s.difficulty);
  const cfg = diffFor(difficulty);
  const rows = board.slice(0, limit);
  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-950/25 px-4 py-2.5 text-left">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.35em] text-amber-300">
          <Trophy className="h-3 w-3" /> SPIRIT BOARD
        </span>
        <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: cfg.accent }}>{cfg.label}</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-1 text-center text-[11px] font-semibold italic text-slate-400">The board is silent. Be the first spirit.</div>
      ) : (
        <ol className="space-y-0.5">
          {rows.map((e, i) => {
            const mine = lastRank === i + 1;
            return (
              <li key={i} className={`flex items-center gap-3 rounded px-1.5 font-display text-sm tabular-nums ${mine ? 'animate-pulse bg-amber-300/20 text-amber-200' : i === 0 ? 'text-amber-300' : 'text-slate-200'}`}>
                <span className="w-5 text-right text-[11px] font-bold text-slate-500">{i + 1}</span>
                <span className="w-10 font-black tracking-[0.2em] whitespace-pre">{e.initials}</span>
                <span className="flex-1 text-right font-black">{fmt(e.score)}</span>
                <span className="hidden w-20 text-right text-[10px] font-semibold text-slate-500 sm:inline">{e.day}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Arcade-style initials: three big slots over a real <input> so phone keyboards work. */
function InitialsEntry({ rank }: { rank: number }) {
  const submit = useGame((s) => s.submitInitials);
  const skip = useGame((s) => s.skipInitials);
  const [text, setText] = useState(() => scores.lastInitials());
  const slots = text.padEnd(3, ' ').slice(0, 3).split('');
  return (
    <div className="mt-4">
      <div className="text-[11px] font-black tracking-[0.35em] text-amber-300">A NEW SPIRIT — RANK #{rank}</div>
      <label className="relative mx-auto mt-3 flex w-fit cursor-text gap-2">
        {slots.map((c, i) => (
          <span key={i} className={`flex h-14 w-12 items-center justify-center rounded-lg border-2 font-display text-3xl font-black ${i === Math.min(text.length, 2) ? 'border-amber-300 text-amber-200 shadow-[0_0_14px_rgba(252,211,77,0.5)]' : 'border-slate-600 text-white'}`}>
            {c.trim() || '_'}
          </span>
        ))}
        <input
          autoFocus
          aria-label="Your initials"
          value={text}
          maxLength={3}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="absolute inset-0 opacity-0"
          onChange={(e) => setText(cleanInitials(e.target.value))}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); submit(text); }
            if (e.key === 'Escape') { e.preventDefault(); skip(); }
          }}
        />
      </label>
      <div className="mt-3 flex justify-center gap-2">
        <button onClick={() => submit(text)} className="pointer-events-auto rounded-xl bg-amber-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-amber-300">CARVE IT (ENTER)</button>
        <button onClick={skip} className="pointer-events-auto rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-400">SKIP (ESC)</button>
      </div>
    </div>
  );
}

/** Two-tap "clear this board" for grown-ups. */
function ClearBoardButton() {
  const [armed, setArmed] = useState(false);
  const phase = useGame((s) => s.phase);
  if (phase === 'playing') return null;
  return (
    <button
      onClick={() => { if (armed) { useGame.getState().clearBoard(); setArmed(false); } else setArmed(true); }}
      onBlur={() => setArmed(false)}
      className={`pointer-events-auto ml-1 rounded border px-1.5 text-[11px] font-bold ${armed ? 'border-red-400 text-red-300' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}
    >
      {armed ? 'Tap again to clear this board' : 'Clear this board'}
    </button>
  );
}

function ThemePanels() {
  const themeId = useGame((s) => s.themeId);
  const phase = useGame((s) => s.phase);
  const Panels = themeById(themeId)?.StatusPanels;
  if (phase !== 'playing' || !Panels) return null;
  return <Panels />;
}

/** Engine-standard BONUS card for theme side panels. */
export function BonusCard() {
  const bonus = useGame((s) => s.bonus);
  const multiball = useGame((s) => s.multiball);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 backdrop-blur-md w-36">
      <div className="text-[10px] font-black tracking-[0.25em] text-slate-400">BONUS</div>
      <div className="font-display text-xl font-black text-slate-200 tabular-nums">{fmt(Math.round(bonus))}</div>
      {multiball && <div className="mt-1 animate-pulse text-[10px] font-black text-pb-300">2X SCORING!</div>}
    </div>
  );
}

/** Engine-standard TILT card for theme side panels. */
export function TiltCard() {
  const tiltWarnings = useGame((s) => s.tiltWarnings);
  const tilted = useGame((s) => s.tilted);
  return (
    <div className={`rounded-xl border p-3 backdrop-blur-md w-36 ${tilted ? 'border-red-500 bg-red-950/80' : 'border-slate-700/60 bg-slate-950/70'}`}>
      <div className="flex items-center gap-1 text-[10px] font-black tracking-[0.25em] text-slate-400">
        <TriangleAlert className="h-3 w-3" /> TILT
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {[0, 1].map((i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${tilted ? 'bg-red-500' : i < tiltWarnings ? 'bg-orange-400' : 'bg-slate-700'}`} />
        ))}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">{tilted ? 'FLIPPERS DEAD!' : 'Nudge carefully'}</div>
    </div>
  );
}

export function HUD() {
  return (
    <>
      <TopBar />
      <ThemePanels />
      <ControlsBar />
      <MessageBar />
      <Popups />
      <BigMessage />
      <PlungerMeter />
      <KeyHints />
      <TouchControls />
      <BonusOverlay />
      <StuckHint />
      <TiltFlash />
      <AttractScreen />
      <GameOverScreen />
      <PausedOverlay />
      <HelpModal />
    </>
  );
}
