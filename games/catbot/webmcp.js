'use strict';
/* =====================================================================
   WebMCP: lets an AI agent play catbot. Claude Opus 5.5 (claude-opus-5-5) in Claude Code, 2026-10-07.
   Asked for so Codex could play the game and make the itch.io cover image.

   The tools are registered with the browser's WebMCP API (document.modelContext, or
   navigator.modelContext in older builds and polyfills) when it exists, and are always
   also on window.catbot for agents that drive the page by evaluating script
   (Playwright, Chrome DevTools): `await catbot.call('catbot_move', { dir: 'right', ms: 1200 })`.

   Playing: catbot_status, catbot_move (movement only, the same keys a player holds:
   the jam rule holds for agents too), catbot_screenshot.
   Staging, only with #mcp in the URL (index.html#mcp): catbot_goto (any room or the
   deck plan, with chosen parts installed), catbot_stage (hide the HUD, freeze time,
   STEADY). A #mcp session never counts toward the all-eggs bonus (EGGS in index.html).

   Hooks in index.html: `hud` and `paused` (frame() and render()), the #mcp clause in
   EGGS' testing(), and the script tag. Delete the script tag and nothing else changes.
   ===================================================================== */
(() => {
  const staging = /(^|[#&])mcp(?:&|$)/.test(location.hash);
  const r1 = v => Math.round(v * 10) / 10;
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], 'up-left': [-1, -1], 'up-right': [1, -1], 'down-left': [-1, 1], 'down-right': [1, 1], none: [0, 0] };
  let moveId = 0;

  function status() {
    const hub = inHub(), R = room, tok = hub ? HUB.tok() : null;
    const s = {
      mode, paused, hud, clock: document.hidden ? 'stepped (tab hidden: each move runs its ms of game time at once)' : 'real time',
      place: hub ? 'deck plan (hub)' : R.id,
      caption: caps[0]?.text || null,
      installed: [...installed],
      eggs: (({ found, total }) => ({ found, total }))(EGGS.summary()),
      runTime: r1(run.t), rewinds: run.rewinds,
      settings: { ...settings }
    };
    if (hub) {
      s.hub = {
        token: tok ? { x: r1(tok.x), y: r1(tok.y) } : null,
        rooms: HUB.DECK.slots.map(d => ({ id: d.id, label: d.label, built: ROOMS.some(q => q.id === d.id), needs: d.needs || [], repaired: !!d.part && installed.has(d.part) })),
        note: 'Walk with up/down/left/right (8-way). Stand on a door mat to read its hint; walk past the sill to go in. Sealed doors bump back.'
      };
    } else {
      s.room = {
        name: R.name, width: R.w,
        rewindTile: R.reset ? [R.reset.x, R.reset.x + R.reset.w] : null,
        exitX: R.exit ? R.exit.x + 64 : null,
        part: R.part ? { id: R.part.id, name: R.part.name, x: R.part.x, got: !!st.got } : null
      };
      s.catbot = { x: r1(rig.x), floor: r1(rig.fl || 0), facing: rig.facing > 0 ? 'right' : 'left', vx: r1(rig.vx), inAir: !!rig.air, trotting: Math.abs(rig.vx) > 140, screenX: r1((rig.x - camX) * zoom) };
      s.note = mode === 'cover' ? 'Cover page: any move starts the opening.' : mode === 'intro' ? 'Opening cinematic: any move skips it.' : mode === 'asleep' ? 'Catbot is asleep: any move winds it up.' : 'Left/right only. Hold a direction 1.6 s (or trot:true) to trot. Stand still and things happen; walk onto REWIND (far left) to reset the room; walk out of the hatch (exitX) once the part is in.';
    }
    return s;
  }

  function release() { keys.l = keys.r = keys.u = keys.d = false; }
  function move({ dir = 'right', ms = 600, trot = false } = {}) {
    const d = DIRS[dir]; if (!d) throw new Error('dir must be one of ' + Object.keys(DIRS).join(', '));
    ms = Math.max(0, Math.min(15000, +ms || 0));
    const id = ++moveId; release();
    const [dx, dy] = d;
    if (dx) { keys[dx < 0 ? 'l' : 'r'] = true; pulse = dx; tap(dx); if (trot) tap(dx); }   // two fresh presses within 0.28 s: the double-tap trot
    if (dy) { keys[dy < 0 ? 'u' : 'd'] = true; pulseY = dy; }
    if (document.hidden) {                         // a hidden tab gets no animation frames: step the game's own loop at 60 Hz instead
      if (!paused) for (let n = Math.round(ms * .06); n > 0; n--) tick(1 / 60);
      release(); last = performance.now(); render(0);
      return Promise.resolve(status());
    }
    return new Promise(res => setTimeout(() => { if (id === moveId) release(); res(status()); }, ms));
  }

  function goto({ place, parts } = {}) {
    if (!staging) throw new Error('staging tools need #mcp in the URL');
    if (Array.isArray(parts)) { installed.clear(); for (const p of parts) installed.add(p); }
    if (mode === 'cover' || mode === 'intro') OPEN.finish(false);
    fade = 0; fadeDir = 0; fadeCb = null; latch = false; release();
    if (place === 'hub') { HUB.enter(null); return status(); }
    const i = ROOMS.findIndex(q => q.id === place);
    if (i < 0) throw new Error('place must be hub or one of ' + ROOMS.map(q => q.id).join(', '));
    document.body.classList.remove('hub');
    loadRoom(i); mode = 'play'; modeT = 0;
    return status();
  }

  function stage({ hud: h, pause, steady, sound } = {}) {
    if (!staging) throw new Error('staging tools need #mcp in the URL');
    if (h != null) hud = !!h;
    if (pause != null) paused = !!pause;
    if (steady != null) settings.calm = !!steady;
    if (sound != null) { settings.sound = !!sound; AUDIO.enable(settings.sound); }
    return status();
  }

  /* renders one frame at `scale` x the game's 720x405 (crop in those same game px), restores the canvas after */
  function screenshot({ scale = 2, crop, output = 'download', name = 'catbot' } = {}) {
    scale = Math.max(.5, Math.min(4, +scale || 2));
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale); S = scale;
    for (const c of [catC, silC]) { c.width = cv.width; c.height = cv.height; }
    const sh = shake; shake = 0; render(0); shake = sh;
    let out = cv;
    if (crop) {
      const x = Math.max(0, crop.x || 0), y = Math.max(0, crop.y || 0), w = Math.min(W - x, crop.w || W), h = Math.min(H - y, crop.h || H);
      out = document.createElement('canvas'); out.width = Math.round(w * scale); out.height = Math.round(h * scale);
      out.getContext('2d').drawImage(cv, x * scale, y * scale, w * scale, h * scale, 0, 0, out.width, out.height);
    }
    const url = out.toDataURL('image/png'), size = { width: out.width, height: out.height };
    resize();
    if (output === 'dataUrl') return { ...size, dataUrl: url };
    const file = `${name.replace(/[^\w-]/g, '') || 'catbot'}-${Date.now()}.png`, a = document.createElement('a');
    a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
    return { ...size, downloaded: file };
  }

  const roomIds = ROOMS.map(q => q.id);
  const TOOLS = [
    {
      name: 'catbot_status', annotations: { readOnlyHint: true },
      description: 'What is on screen: the mode, the room or deck plan, catbot\'s position and facing, the room\'s rewind tile, part and exit, the current caption, installed parts, eggs found. Read it between moves.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => status()
    },
    {
      name: 'catbot_move',
      description: 'Hold a direction for ms milliseconds, then let go, and return the status. Movement is the only input the game has (jam rule): it also starts the opening, skips it, wakes catbot, presses trolley buttons (by standing still on them) and goes through doors. dir "none" just waits. In rooms only left/right matter; the deck plan takes all eight. trot:true double-taps first, going straight to the trot. Runs in real time in a visible tab; in a hidden tab the game is stepped through ms of its own time before returning.',
      inputSchema: {
        type: 'object', properties: {
          dir: { type: 'string', enum: Object.keys(DIRS) },
          ms: { type: 'number', minimum: 0, maximum: 15000, description: 'how long to hold it (default 600)' },
          trot: { type: 'boolean', description: 'double-tap first: trot at once (left/right only)' }
        }, required: ['dir']
      },
      execute: move
    },
    {
      name: 'catbot_screenshot',
      description: 'Render the current frame at scale x 720x405 and save it as a PNG (output "download", the default) or return it as a data URL (output "dataUrl"). crop {x,y,w,h} is in the 720x405 game frame. For the itch.io cover (630x500) crop a 510x405 window, e.g. {x:105,y:0,w:510,h:405}, at scale 2 or more and resize.',
      inputSchema: {
        type: 'object', properties: {
          scale: { type: 'number', minimum: .5, maximum: 4 },
          crop: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } } },
          output: { type: 'string', enum: ['download', 'dataUrl'] },
          name: { type: 'string', description: 'file name prefix' }
        }
      },
      execute: screenshot
    }
  ];
  if (staging) TOOLS.push(
    {
      name: 'catbot_goto',
      description: 'Staging (#mcp only): jump to a room or the deck plan, skipping the cover and opening. parts replaces the installed parts (part ids: hip, engine, berthing, galley, observation, sanitation, hydroponics, yarn); leave it out to keep them. A room whose part is installed is shown repaired.',
      inputSchema: {
        type: 'object', properties: {
          place: { type: 'string', enum: ['hub', ...roomIds] },
          parts: { type: 'array', items: { type: 'string' } }
        }, required: ['place']
      },
      execute: goto
    },
    {
      name: 'catbot_stage',
      description: 'Staging (#mcp only): hud:false hides the toolbox, captions, title and star log for a clean shot; pause:true freezes time (rendering continues, moves do nothing); steady:true is the STEADY setting (less shake and flash); sound on or off.',
      inputSchema: { type: 'object', properties: { hud: { type: 'boolean' }, pause: { type: 'boolean' }, steady: { type: 'boolean' }, sound: { type: 'boolean' } } },
      execute: stage
    }
  );

  /* WebMCP results are strings in Chrome's examples: JSON text, except a data URL comes back as itself */
  const wrap = t => async args => { const v = await t.execute(args || {}); return v?.dataUrl ? v.dataUrl : JSON.stringify(v); };
  window.catbot = {
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    call: async (name, args) => { const t = TOOLS.find(q => q.name === name); if (!t) throw new Error('no tool ' + name); return t.execute(args || {}); },
    status
  };
  const mc = document.modelContext || navigator.modelContext;
  if (mc?.registerTool) for (const t of TOOLS) try { mc.registerTool({ ...t, execute: wrap(t) }); } catch (e) { console.warn('[catbot webmcp]', t.name, e); }
  else if (mc?.provideContext) try { mc.provideContext({ tools: TOOLS.map(t => ({ ...t, execute: wrap(t) })) }); } catch (e) { console.warn('[catbot webmcp]', e); }
  console.log(`[catbot webmcp] ${TOOLS.length} tools${mc ? ' registered' : ' on window.catbot (no modelContext in this browser)'}${staging ? ', staging on' : ''} · Claude Opus 5.5`);
})();
