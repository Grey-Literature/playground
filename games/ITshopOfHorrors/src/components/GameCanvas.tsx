import { useEffect, useRef } from "react";
import {
  MAP,
  MAP_W,
  MAP_H,
  TILE,
  SPAWN,
  MINPIN_SPAWN,
  MINPIN_PATROL,
  SAFE_POINTS,
  CAMERAS,
  T3_POS,
  tileAt,
  isSolid,
  findTiles,
} from "../game/mapData";
import type { Flags } from "../game/types";
import { actOf } from "../game/acts";
import { TICKETS, TICKET_BY_ID, isOpen, ticketAt } from "../game/tickets";
import { echoKey, type Dir, type Watch } from "../game/watch";
import { PICKUPS, GREEN_RACK, KEYCARD_SPOT, available } from "../game/pickups";
import { sfxBark, sfxGrowl, sfxScare } from "../game/audio";

const VIEW_W = 960;
const VIEW_H = 600;
const PLAYER_SPEED = 4.3; // tiles/sec
const CHASE_SPEED = 3.5;
const PATROL_SPEED = 2.1;
const PLAYER_R = 0.3;
const CONE = 0.45; // headlamp half-angle, radians
const GLINT_SEE = 3.2; // how far the headlamp finds a glint
const GLINT_NEAR = 1.2; // close enough to notice without the lamp
const SIGHT = 6; // how far the Min Pin sees you, with a clear line
const SIGHT_DARK = 2.2; // ...and with your headlamp off
const ALERT_RATE = 1.7; // alert per second while seen: ~0.6 s to charge
const LOSE_AFTER = 2.5; // seconds out of sight before it gives up
const SNIFF_TIME = 1.5; // seconds it sniffs where it lost you
const DARK_SPEED = 0.75; // you fumble in the dark
const CHECKPOINT_R = 1.4;
const PEEK_RANGE = 7; // desk monitors that report your position, Act II on
const PEEK_OFF_CONE = 1.2; // ...only ones well outside the headlamp
const WATCHING_CART = { x: 37, y: 10 }; // the triage cart that says I SEE YOU
const GAME_KEYS = new Set(["w", "a", "s", "d", "e", "f", "arrowup", "arrowdown", "arrowleft", "arrowright", "enter", " "]);

interface Props {
  flags: Flags;
  paused: boolean;
  watch: Watch;
  onInteract: (id: string) => void;
  onCaught: (dir: Dir) => void;
}

interface Interactable {
  id: string;
  x: number;
  y: number;
}

function hash(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export default function GameCanvas({ flags, paused, watch, onInteract, onCaught }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flagsRef = useRef(flags);
  const pausedRef = useRef(paused);
  const watchRef = useRef(watch);
  flagsRef.current = flags;
  pausedRef.current = paused;
  watchRef.current = watch;

  const onInteractRef = useRef(onInteract);
  const onCaughtRef = useRef(onCaught);
  onInteractRef.current = onInteract;
  onCaughtRef.current = onCaught;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ---------- interactables ----------
    const statics: Interactable[] = [];
    const add = (ch: string, id: string) =>
      findTiles(ch).forEach((t) => statics.push({ id, x: t.x + 0.5, y: t.y + 0.5 }));
    add("T", "terminal");
    add("P", "printer");
    add("U", "undead");
    add("D", "door");
    add("C", "core");
    add("K", "coffee");
    add("W", "whiteboard");
    add("X", "exit");
    for (const t of TICKETS) statics.push({ id: `ticket:${t.id}`, x: t.x + 0.5, y: t.y + 0.5 });
    // every desk and rack can be searched
    const searchables: Interactable[] = [...findTiles("="), ...findTiles("S")].map((t) => ({
      id: `search:${t.x},${t.y}`,
      x: t.x + 0.5,
      y: t.y + 0.5,
    }));
    const glints = PICKUPS.filter((p) => p.reveal === "glint");
    const revealed = new Set<string>();
    const desks = findTiles("=");

    // ---------- mutable state ----------
    const player = { x: SPAWN.x, y: SPAWN.y, dx: 0, dy: 1, moving: false };
    const pin = {
      x: MINPIN_SPAWN.x,
      y: MINPIN_SPAWN.y,
      wp: 0,
      mode: "patrol" as "patrol" | "chase" | "search" | "follow",
      cooldown: 0,
      barked: false,
      alert: 0, // 0–1; charges at 1
      unseen: 0, // seconds since it last saw you
      sniff: 0,
      lastSeen: { x: MINPIN_SPAWN.x, y: MINPIN_SPAWN.y },
    };
    let checkpoint = SPAWN;
    const keys = new Set<string>();
    const lampOff = () => keys.has("f");
    let time = 0;
    let flicker = 1;
    let flickerTimer = 0;
    let dips = 0;
    // the building watching (Act II on): one desk monitor at a time reports you
    let peekTimer = 6;
    let peek: { x: number; y: number; until: number; text: string } | null = null;
    let iSeeYouUntil = 0;
    let pacifyFired = false;
    let raf = 0;
    let last = performance.now();

    const ghosts = [
      { x: 31.5, y: 23.5, p: 0 },
      { x: 37.5, y: 26.0, p: 2.1 },
      { x: 32.5, y: 21.8, p: 4.2 },
    ];

    // ---------- input ----------
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      keys.add(k);
      // only keys pressed while you're moving about, not while reading dialogue
      if (!e.repeat && GAME_KEYS.has(k) && !pausedRef.current) echoKey(watchRef.current, k);
      if ((k === "e" || k === "enter") && !pausedRef.current) {
        const target = nearestInteractable();
        if (target) onInteractRef.current(target.id);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    // a key held while the tab loses focus never gets its keyup
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    // Nearest wins; story objects get a small head start so a desk beside
    // the ticket terminal doesn't steal its prompt.
    function nearestInteractable(): Interactable | null {
      let best: Interactable | null = null;
      let bestScore = Infinity;
      const consider = (it: Interactable, range: number, bias = 0) => {
        const d = Math.hypot(it.x - player.x, it.y - player.y);
        if (d < range && d - bias < bestScore) {
          bestScore = d - bias;
          best = it;
        }
      };
      for (const s of statics) consider(s, 1.8, 0.3);
      consider({ id: "minpin", x: pin.x, y: pin.y }, 2.2);
      const f = flagsRef.current;
      for (const g of glints)
        if (revealed.has(g.id) && available(g, f)) consider({ id: `pickup:${g.id}`, x: g.x, y: g.y }, 1.1, 0.3);
      for (const s of searchables) consider(s, 1.3);
      return best;
    }

    function revealGlints(f: Flags) {
      const facing = Math.atan2(player.dy, player.dx);
      for (const g of glints) {
        if (revealed.has(g.id) || !available(g, f)) continue;
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        let off = Math.abs(Math.atan2(g.y - player.y, g.x - player.x) - facing);
        if (off > Math.PI) off = Math.PI * 2 - off;
        if (d < GLINT_NEAR || (d < GLINT_SEE && off < CONE && !lampOff())) revealed.add(g.id);
      }
    }

    // From Act II the building watches back: every so often a desk monitor
    // behind you (never one you're looking at) flicks on with your position.
    // And once, in Act II, the east triage cart says so out loud.
    function watchBack(f: Flags, dt: number) {
      const act = actOf(f);
      if (act < 2) return;
      peekTimer -= dt;
      if (peekTimer <= 0) {
        const facing = Math.atan2(player.dy, player.dx);
        const behind = desks.filter((d) => {
          const dx = d.x + 0.5 - player.x;
          const dy = d.y + 0.5 - player.y;
          const dist = Math.hypot(dx, dy);
          let off = Math.abs(Math.atan2(dy, dx) - facing);
          if (off > Math.PI) off = Math.PI * 2 - off;
          return dist > 1.5 && dist < PEEK_RANGE && off > PEEK_OFF_CONE;
        });
        if (behind.length) {
          const d = behind[Math.floor(Math.random() * behind.length)];
          peek = {
            x: d.x,
            y: d.y,
            until: time + 0.8,
            text: `JR.TECH @ ${Math.floor(player.x)},${Math.floor(player.y)}`,
          };
          peekTimer = 6 + Math.random() * 4;
        } else peekTimer = 2; // nothing behind you right now; try again soon
      }
      const w = watchRef.current;
      if (
        act === 2 &&
        !w.saidISeeYou &&
        Math.hypot(WATCHING_CART.x + 0.5 - player.x, WATCHING_CART.y + 0.5 - player.y) < 2
      ) {
        w.saidISeeYou = true;
        iSeeYouUntil = time + 3;
      }
    }

    // walls, desks and racks block the Min Pin's view
    function hasLOS(ax: number, ay: number, bx: number, by: number): boolean {
      const dOpen = flagsRef.current.doorOpen;
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.25);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (isSolid(tileAt(ax + (bx - ax) * t, ay + (by - ay) * t), dOpen)) return false;
      }
      return true;
    }

    // ---------- collision ----------
    function blocked(x: number, y: number): boolean {
      const dOpen = flagsRef.current.doorOpen;
      const r = PLAYER_R;
      return (
        isSolid(tileAt(x - r, y - r), dOpen) ||
        isSolid(tileAt(x + r, y - r), dOpen) ||
        isSolid(tileAt(x - r, y + r), dOpen) ||
        isSolid(tileAt(x + r, y + r), dOpen)
      );
    }

    function move(ent: { x: number; y: number }, dx: number, dy: number) {
      if (dx !== 0 && !blocked(ent.x + dx, ent.y)) ent.x += dx;
      if (dy !== 0 && !blocked(ent.x, ent.y + dy)) ent.y += dy;
    }

    // ---------- update ----------
    function update(dt: number) {
      time += dt;

      // flashlight flicker: each dip lasts ≥120 ms and is followed by ≥350 ms
      // steady, so it never strobes faster than ~2 dips a second
      flickerTimer -= dt;
      if (flickerTimer <= 0) {
        if (flicker < 1) {
          flicker = 1;
          flickerTimer = 0.35 + Math.random() * 0.25;
        } else if (Math.random() < 0.12) {
          flicker = 0.55 + Math.random() * 0.3;
          flickerTimer = 0.12 + Math.random() * 0.15;
          dips++;
        } else {
          flickerTimer = 0.06 + Math.random() * 0.25;
        }
      }

      if (pausedRef.current) return;

      // player movement
      let vx = 0;
      let vy = 0;
      if (keys.has("w") || keys.has("arrowup")) vy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) vy += 1;
      if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
      if (keys.has("d") || keys.has("arrowright")) vx += 1;
      const len = Math.hypot(vx, vy);
      player.moving = len > 0;
      if (len > 0) {
        vx /= len;
        vy /= len;
        player.dx = vx;
        player.dy = vy;
        const sp = PLAYER_SPEED * (lampOff() ? DARK_SPEED : 1) * dt;
        move(player, vx * sp, vy * sp);
      }
      for (const s of SAFE_POINTS)
        if (Math.hypot(s.x - player.x, s.y - player.y) < CHECKPOINT_R) checkpoint = s;

      const f = flagsRef.current;
      revealGlints(f);
      if (lampOff()) watchRef.current.usedDark = true;
      watchBack(f, dt);

      // ---------- min pin ----------
      pin.cooldown = Math.max(0, pin.cooldown - dt);
      const dist = Math.hypot(player.x - pin.x, player.y - pin.y);

      if (f.minPinPacified && !f.hasKeycard) {
        // it leads you to the rack it buried her keycard in, and sits
        pin.mode = "follow";
        const tgt = pin.y < 13.6 ? { x: 33.9, y: 13.6 } : KEYCARD_SPOT;
        const d = Math.hypot(tgt.x - pin.x, tgt.y - pin.y);
        if (d > 0.15) {
          const sp = Math.min(2.6 * dt, d);
          move(pin, ((tgt.x - pin.x) / d) * sp, ((tgt.y - pin.y) / d) * sp);
        }
      } else if (f.minPinPacified) {
        pin.mode = "follow";
        if (dist > 2.4) {
          const sp = Math.min(3.2, dist) * dt;
          move(pin, ((player.x - pin.x) / dist) * sp * 1.2, ((player.y - pin.y) / dist) * sp * 1.2);
        }
      } else {
        const range = lampOff() ? SIGHT_DARK : SIGHT;
        const sees =
          pin.cooldown <= 0 && dist < range && hasLOS(pin.x, pin.y, player.x, player.y);
        if (sees) {
          pin.lastSeen = { x: player.x, y: player.y };
          pin.unseen = 0;
        } else pin.unseen += dt;

        if (pin.mode === "chase") {
          if (pin.unseen > LOSE_AFTER || dist > 8) {
            // lost you: go and sniff where it last saw you
            pin.mode = "search";
            pin.sniff = SNIFF_TIME;
            pin.alert = 0;
            pin.barked = false;
          }
        } else if (sees) {
          if (pin.alert === 0) sfxGrowl();
          pin.alert = Math.min(1, pin.alert + ALERT_RATE * dt);
          if (pin.alert >= 1) {
            pin.mode = "chase";
            if (!pin.barked) {
              sfxBark();
              pin.barked = true;
            }
          }
        } else {
          pin.alert = Math.max(0, pin.alert - 0.8 * dt);
        }

        const walkTo = (tx: number, ty: number, speed: number) => {
          const d = Math.hypot(tx - pin.x, ty - pin.y);
          if (d > 0.05) {
            const sp = Math.min(speed * dt, d);
            move(pin, ((tx - pin.x) / d) * sp, ((ty - pin.y) / d) * sp);
          }
          return d;
        };

        if (pin.mode === "chase" && pin.cooldown <= 0) {
          // straight at you while it can see you; to where it lost you if not
          if (sees) walkTo(player.x, player.y, CHASE_SPEED);
          else walkTo(pin.lastSeen.x, pin.lastSeen.y, CHASE_SPEED);
          // caught!
          if (dist < 0.62 && !f.gotToken) {
            sfxScare();
            const dir: Dir =
              Math.abs(player.dx) >= Math.abs(player.dy)
                ? player.dx < 0 ? "LEFT" : "RIGHT"
                : player.dy < 0 ? "UP" : "DOWN";
            onCaughtRef.current(dir);
            player.x = checkpoint.x;
            player.y = checkpoint.y;
            pin.x = MINPIN_SPAWN.x;
            pin.y = MINPIN_SPAWN.y;
            pin.mode = "patrol";
            pin.cooldown = 4;
            pin.barked = false;
            pin.alert = 0;
          }
        } else if (pin.mode === "search") {
          // sniffs once it gets there; gives up anyway if a wall is in the way
          const d = walkTo(pin.lastSeen.x, pin.lastSeen.y, PATROL_SPEED);
          pin.sniff -= d < 0.3 ? dt : dt * 0.25;
          if (pin.sniff <= 0) {
            // back to the nearest stop on its route
            let best = 0;
            MINPIN_PATROL.forEach((wp, i) => {
              const b = MINPIN_PATROL[best];
              if (Math.hypot(wp.x - pin.x, wp.y - pin.y) < Math.hypot(b.x - pin.x, b.y - pin.y))
                best = i;
            });
            pin.wp = best;
            pin.mode = "patrol";
          }
        } else {
          // patrol
          const wp = MINPIN_PATROL[pin.wp];
          if (walkTo(wp.x, wp.y, PATROL_SPEED) < 0.25) pin.wp = (pin.wp + 1) % MINPIN_PATROL.length;
        }

        // token in hand → it scans you instead of shredding you
        if (dist < 1.9 && f.gotToken && !pacifyFired) {
          pacifyFired = true;
          onInteractRef.current("minpin");
        }
      }
    }

    // ---------- rendering ----------
    function camera() {
      let cx = player.x * TILE - VIEW_W / 2;
      let cy = player.y * TILE - VIEW_H / 2;
      cx = Math.max(0, Math.min(MAP_W * TILE - VIEW_W, cx));
      cy = Math.max(0, Math.min(MAP_H * TILE - VIEW_H, cy));
      return { cx, cy };
    }

    function render() {
      if (!ctx) return;
      const { cx, cy } = camera();
      const f = flagsRef.current;

      ctx.fillStyle = "#020304";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      const x0 = Math.floor(cx / TILE);
      const y0 = Math.floor(cy / TILE);
      const x1 = Math.min(MAP_W - 1, Math.ceil((cx + VIEW_W) / TILE));
      const y1 = Math.min(MAP_H - 1, Math.ceil((cy + VIEW_H) / TILE));

      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          drawTile(ctx, MAP[ty][tx], tx, ty, cx, cy, f);
        }
      }

      drawGhosts(ctx, cx, cy);
      drawT3(ctx, cx, cy);
      drawMinPin(ctx, cx, cy, f);
      drawPlayer(ctx, cx, cy);
      drawDarkness(ctx, cx, cy, f);
      drawEmissive(ctx, cx, cy, f, x0, y0, x1, y1);
      drawPrompt(ctx, f);

      if (pin.mode === "chase" && !f.minPinPacified && !f.gotToken) {
        ctx.strokeStyle = `rgba(255,30,30,${0.35 + 0.3 * Math.sin(time * 10)})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
        ctx.fillStyle = "rgba(255,60,60,0.85)";
        ctx.font = '20px "VT323", monospace';
        ctx.textAlign = "center";
        ctx.fillText("⚠ 406 NOT ACCEPTABLE — THREAT DETECTED: YOU", VIEW_W / 2, 34);
      }

      if (lampOff()) {
        ctx.font = '20px "VT323", monospace';
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(3,6,8,0.82)";
        ctx.fillRect(14, VIEW_H - 46, 150, 28);
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText("HEADLAMP: OFF", 24, VIEW_H - 26);
      }
    }

    function drawTile(
      c: CanvasRenderingContext2D,
      ch: string,
      tx: number,
      ty: number,
      cx: number,
      cy: number,
      f: Flags,
    ) {
      const px = tx * TILE - cx;
      const py = ty * TILE - cy;
      const h = hash(tx, ty);

      if (ch === "#" || ch === "V" || ch === "N" || ch === "X") {
        c.fillStyle = "#0d1219";
        c.fillRect(px, py, TILE, TILE);
        c.fillStyle = "#141c26";
        c.fillRect(px, py, TILE, 6);
        c.strokeStyle = "rgba(0,0,0,0.5)";
        c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (ch === "V") {
          // camera housing on the room side of the wall
          const down = Math.sin(CAMERAS.find((k) => k.x === tx && k.y === ty)?.facing ?? 1) > 0;
          c.fillStyle = "#1d242e";
          c.fillRect(px + 12, down ? py + TILE - 14 : py + 2, 16, 12);
          c.strokeStyle = "#2c3644";
          c.strokeRect(px + 12.5, down ? py + TILE - 13.5 : py + 2.5, 15, 11);
        }
        if (ch === "N") {
          // wall-mounted network gear, on the room side
          const t = ticketAt(tx, ty);
          const [fx, fy] = t?.face ?? [0, 1];
          const bx = px + (fx > 0 ? TILE - 12 : fx < 0 ? 0 : 6);
          const by = py + (fy > 0 ? TILE - 12 : fy < 0 ? 0 : 6);
          const w = fx ? 12 : TILE - 12;
          const hgt = fy ? 12 : TILE - 12;
          c.fillStyle = "#151b23";
          c.fillRect(bx, by, w, hgt);
          c.strokeStyle = "#2f3b4a";
          c.strokeRect(bx + 0.5, by + 0.5, w - 1, hgt - 1);
        }
        if (ch === "X") {
          // the front exit: a door in the south wall
          c.fillStyle = "#1a1612";
          c.fillRect(px + 6, py, TILE - 12, TILE - 8);
          c.strokeStyle = "#3a3026";
          c.strokeRect(px + 6.5, py + 0.5, TILE - 13, TILE - 9);
          c.fillStyle = "#4a3e30";
          c.fillRect(px + TILE - 14, py + 14, 3, 6);
        }
        return;
      }

      // floor base for everything else
      c.fillStyle = h > 0.86 ? "#0c1014" : "#0a0d11";
      c.fillRect(px, py, TILE, TILE);
      c.strokeStyle = "rgba(255,255,255,0.025)";
      c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (h > 0.93) {
        c.fillStyle = "rgba(120,30,20,0.08)";
        c.fillRect(px + 6, py + 10, 18, 12);
      }

      switch (ch) {
        case "~": {
          // creeping cables
          c.strokeStyle = "#2a0f12";
          c.lineWidth = 4;
          c.beginPath();
          const wob = Math.sin(time * 1.4 + tx + ty) * 3;
          c.moveTo(px, py + 10 + wob);
          c.bezierCurveTo(px + 14, py + 26, px + 26, py + 2, px + TILE, py + 22 - wob);
          c.stroke();
          c.strokeStyle = "#3d1418";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(px + 4, py + 32);
          c.bezierCurveTo(px + 18, py + 18 - wob, px + 24, py + 36, px + TILE, py + 30);
          c.stroke();
          c.lineWidth = 1;
          break;
        }
        case "=": {
          c.fillStyle = "#1c1812";
          c.fillRect(px + 2, py + 4, TILE - 4, TILE - 8);
          c.fillStyle = "#2b2418";
          c.fillRect(px + 2, py + 4, TILE - 4, 6);
          // dead monitor
          c.fillStyle = "#05070a";
          c.fillRect(px + 10, py + 12, 20, 14);
          c.strokeStyle = "#333";
          c.strokeRect(px + 10, py + 12, 20, 14);
          break;
        }
        case "S": {
          c.fillStyle = "#11161d";
          c.fillRect(px + 3, py + 2, TILE - 6, TILE - 4);
          c.strokeStyle = "#1f2a36";
          c.strokeRect(px + 3, py + 2, TILE - 6, TILE - 4);
          for (let i = 0; i < 4; i++) {
            c.fillStyle = "#0a0e13";
            c.fillRect(px + 6, py + 5 + i * 8, TILE - 12, 5);
          }
          break;
        }
        case "T": {
          c.fillStyle = "#1c1812";
          c.fillRect(px + 2, py + 6, TILE - 4, TILE - 10);
          c.fillStyle = "#07131a";
          c.fillRect(px + 8, py + 10, 24, 16);
          c.fillStyle = `rgba(77,227,255,${0.5 + 0.2 * Math.sin(time * 3)})`;
          c.fillRect(px + 10, py + 12, 20, 12);
          c.fillStyle = "#032028";
          for (let i = 0; i < 3; i++) c.fillRect(px + 11, py + 13 + i * 4, 14 - i * 4, 2);
          break;
        }
        case "P": {
          c.fillStyle = "#4a4336";
          c.fillRect(px + 4, py + 10, TILE - 8, 22);
          c.fillStyle = "#5a5244";
          c.fillRect(px + 4, py + 10, TILE - 8, 6);
          // paper feed (always printing)
          const feed = (time * 10) % 12;
          c.fillStyle = "#cfd4ce";
          c.fillRect(px + 10, py + 2 - feed / 3, 20, 10 + feed / 2);
          c.fillStyle = "#777";
          for (let i = 0; i < 3; i++) c.fillRect(px + 12, py + 4 + i * 3 - feed / 3, 16, 1);
          break;
        }
        case "U": {
          c.fillStyle = "#10161a";
          c.fillRect(px + 3, py + 2, TILE - 6, TILE - 4);
          c.strokeStyle = "#1c3a2a";
          c.strokeRect(px + 3, py + 2, TILE - 6, TILE - 4);
          for (let i = 0; i < 4; i++) {
            c.fillStyle = "#0a1410";
            c.fillRect(px + 6, py + 5 + i * 8, TILE - 12, 5);
          }
          // unplugged cable coiled at its feet
          c.strokeStyle = "#222";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(px + TILE / 2, py + TILE + 6, 8, 0, Math.PI * 2);
          c.stroke();
          c.lineWidth = 1;
          break;
        }
        case "D": {
          if (f.doorOpen) {
            c.fillStyle = "#0a0d11";
            c.fillRect(px, py, TILE, TILE);
            c.fillStyle = "#1a2a1e";
            c.fillRect(px, py, 4, TILE);
            c.fillRect(px + TILE - 4, py, 4, TILE);
          } else {
            c.fillStyle = "#1a1016";
            c.fillRect(px, py, TILE, TILE);
            c.fillStyle = "#241420";
            c.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
            c.strokeStyle = `rgba(255,40,40,${0.4 + 0.25 * Math.sin(time * 2.2)})`;
            c.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
            c.fillStyle = "#ff3b3b";
            c.font = '11px "VT323", monospace';
            c.textAlign = "center";
            c.fillText("403", px + TILE / 2, py + TILE / 2 + 4);
          }
          break;
        }
        case "C": {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
          c.fillStyle = "#0c0f14";
          c.fillRect(px - 6, py - 14, TILE + 12, TILE + 18);
          c.strokeStyle = "#232f3d";
          c.strokeRect(px - 6, py - 14, TILE + 12, TILE + 18);
          c.strokeStyle = `rgba(255,40,40,${0.4 + 0.5 * pulse})`;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(px + TILE / 2, py + TILE / 2, 13 + pulse * 2, 0, Math.PI * 2);
          c.stroke();
          c.lineWidth = 1;
          c.fillStyle = `rgba(255,70,70,${0.5 + 0.5 * pulse})`;
          c.beginPath();
          c.arc(px + TILE / 2, py + TILE / 2, 5, 0, Math.PI * 2);
          c.fill();
          break;
        }
        case "K": {
          c.fillStyle = "#2a2d33";
          c.fillRect(px + 6, py + 4, TILE - 12, TILE - 8);
          c.fillStyle = "#15171b";
          c.fillRect(px + 10, py + 8, TILE - 20, 10);
          c.fillStyle = "#39ff8e";
          c.font = '8px "VT323", monospace';
          c.textAlign = "center";
          c.fillText("418", px + TILE / 2, py + 16);
          break;
        }
        case "W": {
          c.fillStyle = "#0d1219";
          c.fillRect(px, py, TILE, TILE);
          c.fillStyle = "#d8d8d2";
          c.fillRect(px + 4, py + 6, TILE - 8, TILE - 16);
          c.strokeStyle = "#5a2020";
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.moveTo(px + 7, py + 10 + i * 5);
            c.lineTo(px + TILE - 8 - hash(tx + i, ty) * 10, py + 10 + i * 5);
            c.stroke();
          }
          break;
        }
      }
    }

    function drawGhosts(c: CanvasRenderingContext2D, cx: number, cy: number) {
      for (const g of ghosts) {
        const gx = g.x * TILE - cx;
        const gy = g.y * TILE - cy + Math.sin(time * 1.2 + g.p) * 5;
        if (gx < -60 || gx > VIEW_W + 60 || gy < -60 || gy > VIEW_H + 60) continue;
        const a = 0.1 + 0.07 * Math.sin(time * 2.1 + g.p * 3);
        c.fillStyle = `rgba(110,255,168,${a})`;
        c.beginPath();
        c.arc(gx, gy - 10, 8, Math.PI, 0);
        c.lineTo(gx + 8, gy + 14);
        c.lineTo(gx + 3, gy + 8);
        c.lineTo(gx - 3, gy + 14);
        c.lineTo(gx - 8, gy + 8);
        c.closePath();
        c.fill();
      }
    }

    function drawT3(c: CanvasRenderingContext2D, cx: number, cy: number) {
      const px = T3_POS.x * TILE - cx;
      const py = T3_POS.y * TILE - cy;
      if (px < -60 || px > VIEW_W + 60 || py < -60 || py > VIEW_H + 60) return;
      const bob = Math.sin(time * 1.6) * 1.5;
      // body — half human, half machine
      c.fillStyle = "#1b222c";
      c.fillRect(px - 7, py - 10 + bob, 14, 22);
      c.fillStyle = "#2a3340";
      c.fillRect(px - 7, py - 10 + bob, 7, 22);
      // head
      c.fillStyle = "#c9a68a";
      c.beginPath();
      c.arc(px - 3, py - 16 + bob, 6, Math.PI / 2, (Math.PI * 3) / 2);
      c.fill();
      c.fillStyle = "#39414d";
      c.beginPath();
      c.arc(px + 3, py - 16 + bob, 6, (Math.PI * 3) / 2, Math.PI / 2);
      c.fill();
      // severed cable from arm
      c.strokeStyle = "#444";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(px + 8, py + 2 + bob);
      c.bezierCurveTo(px + 14, py + 10, px + 10, py + 18, px + 16, py + 24);
      c.stroke();
      c.lineWidth = 1;
    }

    function drawMinPin(c: CanvasRenderingContext2D, cx: number, cy: number, f: Flags) {
      const px = pin.x * TILE - cx;
      const py = pin.y * TILE - cy;
      if (px < -60 || px > VIEW_W + 60 || py < -60 || py > VIEW_H + 60) return;
      const trot = Math.sin(time * 14) * 2;
      // body
      c.fillStyle = "#151313";
      c.fillRect(px - 9, py - 5, 18, 9);
      // legs
      c.fillStyle = "#1c1818";
      c.fillRect(px - 8, py + 3, 3, 5 + trot);
      c.fillRect(px + 5, py + 3, 3, 5 - trot);
      // head
      c.fillRect(px + 6, py - 11, 8, 8);
      // pointy ears
      c.beginPath();
      c.moveTo(px + 6, py - 11);
      c.lineTo(px + 7, py - 17);
      c.lineTo(px + 10, py - 11);
      c.fill();
      c.beginPath();
      c.moveTo(px + 10, py - 11);
      c.lineTo(px + 13, py - 17);
      c.lineTo(px + 14, py - 11);
      c.fill();
      // tail antenna
      c.strokeStyle = "#333";
      c.beginPath();
      c.moveTo(px - 9, py - 4);
      c.lineTo(px - 14, py - 12 + (f.minPinPacified ? Math.sin(time * 10) * 4 : 0));
      c.stroke();
    }

    function drawPlayer(c: CanvasRenderingContext2D, cx: number, cy: number) {
      const px = player.x * TILE - cx;
      const py = player.y * TILE - cy;
      const step = player.moving ? Math.sin(time * 12) * 2 : 0;
      // shadow
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.beginPath();
      c.ellipse(px, py + 12, 9, 4, 0, 0, Math.PI * 2);
      c.fill();
      // legs
      c.fillStyle = "#222a33";
      c.fillRect(px - 5, py + 4, 4, 8 + step);
      c.fillRect(px + 1, py + 4, 4, 8 - step);
      // hoodie body
      c.fillStyle = "#1f4436";
      c.fillRect(px - 7, py - 8, 14, 14);
      // lanyard
      c.strokeStyle = "#9fe8c4";
      c.beginPath();
      c.moveTo(px - 3, py - 8);
      c.lineTo(px, py);
      c.lineTo(px + 3, py - 8);
      c.stroke();
      c.fillStyle = "#cfd4ce";
      c.fillRect(px - 2, py - 1, 4, 5);
      // head
      c.fillStyle = "#c9a68a";
      c.beginPath();
      c.arc(px, py - 13, 6, 0, Math.PI * 2);
      c.fill();
      // headlamp
      c.fillStyle = lampOff() ? "#4a463a" : "#ffe9a3";
      c.fillRect(px - 2 + player.dx * 3, py - 16 + player.dy * 2, 4, 3);
    }

    function drawDarkness(c: CanvasRenderingContext2D, cx: number, cy: number, f: Flags) {
      const px = player.x * TILE - cx;
      const py = player.y * TILE - cy;
      const inServerRoom = player.y < 9.5 && f.doorOpen;
      // restoring DNS brings the hallway lights back (and lets every camera see you)
      const hallLit = f.restored.includes("dns") && player.y >= 10 && player.y < 13;
      const dark = lampOff();
      const base = dark ? 40 : inServerRoom ? 170 : hallLit ? 240 : 130;
      const r0 = base * (dark ? 1 : flicker) * (0.92 + 0.08 * Math.sin(time * 7));
      const r1 = r0 * (dark ? 2.2 : 2.6);
      const grad = c.createRadialGradient(px, py, r0 * 0.35, px, py, r1);
      grad.addColorStop(0, "rgba(2,3,4,0)");
      grad.addColorStop(0.45, dark ? "rgba(2,3,4,0.7)" : "rgba(2,3,4,0.45)");
      grad.addColorStop(
        1,
        dark
          ? "rgba(2,3,4,0.975)"
          : inServerRoom
            ? "rgba(20,2,2,0.93)"
            : hallLit
              ? "rgba(2,3,4,0.8)"
              : "rgba(2,3,4,0.955)",
      );
      c.fillStyle = grad;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    function drawEmissive(
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      f: Flags,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
    ) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const act = actOf(f);
      const dot = (x: number, y: number, r: number, col: string) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      };
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const ch = MAP[ty][tx];
          const px = tx * TILE - cx;
          const py = ty * TILE - cy;
          const h = hash(tx, ty);
          if (ch === "S") {
            // the rack that never went red
            const on = (tx === GREEN_RACK.x && ty === GREEN_RACK.y) || Math.sin(time * (2 + h * 5) + h * 20) > 0;
            dot(px + 9, py + 7, 1.6, on ? "rgba(60,255,120,0.6)" : "rgba(255,60,60,0.55)");
            dot(px + TILE - 10, py + 15, 1.4, on ? "rgba(255,170,40,0.5)" : "rgba(60,180,255,0.4)");
          } else if (ch === "U") {
            const a = 0.25 + 0.2 * Math.sin(time * 2);
            dot(px + TILE / 2, py + TILE / 2, 16, `rgba(50,255,140,${a * 0.14})`);
            dot(px + 9, py + 8, 1.8, "rgba(110,255,168,0.8)");
          } else if (ch === "T") {
            dot(px + TILE / 2, py + 18, 14, "rgba(77,227,255,0.12)");
          } else if (ch === "P") {
            dot(px + 8, py + 28, 2, `rgba(255,40,40,${0.5 + 0.5 * Math.sin(time * 5)})`);
          } else if (ch === "C") {
            const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
            dot(px + TILE / 2, py + TILE / 2, 26, `rgba(255,50,50,${0.1 + pulse * 0.1})`);
          } else if (ch === "D" && !f.doorOpen) {
            dot(px + TILE / 2, py + TILE / 2, 12, "rgba(255,40,40,0.1)");
          } else if (ch === "N") {
            // port LEDs: calm green, then amber while its ticket is open,
            // steady green once restored, dim red if you left it
            const t = ticketAt(tx, ty);
            if (t) {
              const [fx, fy] = t.face;
              const open = isOpen(f, t.id);
              const restored = f.restored.includes(t.id);
              const cx0 = px + TILE / 2 + fx * 14;
              const cy0 = py + TILE / 2 + fy * 14;
              for (let i = -2; i <= 2; i++) {
                const lx = cx0 + (fx ? 0 : i * 5);
                const ly = cy0 + (fx ? i * 5 : 0);
                const on = Math.sin(time * (open ? 4 : 1.5) + i * 1.7 + h * 9) > (open ? 0 : 0.6);
                const col = open
                  ? on ? "rgba(255,170,40,0.95)" : "rgba(255,170,40,0.25)"
                  : restored || act === 1
                    ? "rgba(60,255,140,0.75)"
                    : f.deferred.includes(t.id)
                      ? "rgba(255,50,50,0.4)"
                      : on ? "rgba(60,255,140,0.6)" : "rgba(60,255,140,0.2)";
                dot(lx, ly, 1.4, col);
              }
              if (open) dot(cx0, cy0, 14, `rgba(255,170,40,${0.08 + 0.05 * Math.sin(time * 4)})`);
            }
          } else if (ch === "X") {
            // the EXIT sign: red under lockdown, green from Act III
            const green = act >= 3;
            const rgb = green ? "60,255,140" : "255,50,50";
            c.fillStyle = `rgba(${rgb},0.85)`;
            c.font = '14px "VT323", monospace';
            c.textAlign = "center";
            c.fillText("EXIT", px + TILE / 2, py + 12);
            dot(px + TILE / 2, py + 8, 16, `rgba(${rgb},0.1)`);
          } else if (ch === "=" && act === 1) {
            // Act I: nobody's here, but every dashboard is green
            c.fillStyle = `rgba(60,255,140,${0.14 + 0.04 * Math.sin(time * 2 + h * 9)})`;
            c.fillRect(px + 11, py + 13, 18, 12);
            c.fillStyle = "rgba(60,255,140,0.3)";
            for (let i = 0; i < 3; i++)
              c.fillRect(px + 12, py + 15 + i * 3, 5 + Math.floor((h * 37 + i * 5) % 10), 1);
          }
        }
      }

      // wall cameras: idle sweep in Act I, locked on you from Act II
      for (const cam of CAMERAS) {
        const px = (cam.x + 0.5) * TILE - cx;
        const py = (cam.y + 0.5) * TILE - cy;
        if (px < -200 || px > VIEW_W + 200 || py < -200 || py > VIEW_H + 200) continue;
        const ex = px + Math.cos(cam.facing) * 12;
        const ey = py + Math.sin(cam.facing) * 12;
        let aim = cam.facing + Math.sin(time * 0.7 + cam.x) * 0.8;
        if (act >= 2) {
          let d = Math.atan2(player.y * TILE - cy - 14 - ey, player.x * TILE - cx - ex) - cam.facing;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          aim = cam.facing + Math.max(-1.3, Math.min(1.3, d));
        }
        const col = act >= 2 ? "255,40,40" : "200,230,255";
        const fade = c.createRadialGradient(ex, ey, 4, ex, ey, 150);
        fade.addColorStop(0, `rgba(${col},${act >= 2 ? 0.07 : 0.045})`);
        fade.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = fade;
        c.beginPath();
        c.moveTo(ex, ey);
        c.arc(ex, ey, 150, aim - 0.22, aim + 0.22);
        c.closePath();
        c.fill();
        dot(ex + Math.cos(aim) * 3, ey + Math.sin(aim) * 3, 2.2, `rgba(${col},0.85)`);
        if (act >= 2) {
          dot(px + 22, ey - Math.sin(cam.facing) * 3, 1.6, "rgba(255,40,40,1)");
          dot(px + 22, ey - Math.sin(cam.facing) * 3, 6, "rgba(255,40,40,0.18)");
          // DNS restored: every camera can put a name to you now
          if (f.restored.includes("dns")) {
            c.font = '13px "VT323", monospace';
            c.textAlign = "center";
            c.fillStyle = "rgba(255,80,80,0.8)";
            c.fillText("ID: JR.TECH", px, ey + Math.sin(cam.facing) * 14);
          }
        } else if (Math.sin(time * 1.3 + cam.x) > 0.7) {
          dot(px + 22, ey - Math.sin(cam.facing) * 3, 1.4, "rgba(60,255,140,0.8)");
        }
      }

      // a monitor behind you, reporting your position
      const monitor = (tx: number, ty: number, rgb: string, text: string) => {
        const px = tx * TILE - cx;
        const py = ty * TILE - cy;
        c.fillStyle = `rgba(${rgb},0.7)`;
        c.fillRect(px + 10, py + 12, 20, 14);
        dot(px + 20, py + 19, 22, `rgba(${rgb},0.08)`);
        c.font = '18px "VT323", monospace';
        c.textAlign = "center";
        c.fillStyle = `rgba(${rgb},0.95)`;
        c.fillText(text, px + 20, py + 4);
      };
      if (peek && time < peek.until) monitor(peek.x, peek.y, "60,255,140", peek.text);
      if (time < iSeeYouUntil) monitor(WATCHING_CART.x, WATCHING_CART.y, "255,50,50", "I SEE YOU");
      // things the headlamp has found
      for (const g of glints) {
        if (!revealed.has(g.id) || !available(g, f)) continue;
        const px = g.x * TILE - cx;
        const py = g.y * TILE - cy;
        if (px < -20 || px > VIEW_W + 20 || py < -20 || py > VIEW_H + 20) continue;
        const tw = 0.55 + 0.45 * Math.sin(time * 4.2 + g.x * 3.1);
        const col = g.id === "cyan" ? "80,230,255" : "255,236,190";
        dot(px, py, 7, `rgba(${col},${0.12 * tw})`);
        dot(px, py, 1.8, `rgba(${col},${0.9 * tw})`);
        c.strokeStyle = `rgba(${col},${0.7 * tw})`;
        c.beginPath();
        c.moveTo(px - 5 * tw, py);
        c.lineTo(px + 5 * tw, py);
        c.moveTo(px, py - 5 * tw);
        c.lineTo(px, py + 5 * tw);
        c.stroke();
      }

      // min pin eyes
      {
        const px = pin.x * TILE - cx;
        const py = pin.y * TILE - cy;
        const col = f.minPinPacified
          ? "rgba(60,255,120,0.9)"
          : pin.mode === "chase"
            ? "rgba(255,30,30,1)"
            : "rgba(255,120,40,0.9)";
        dot(px + 8, py - 8, 1.7, col);
        dot(px + 12, py - 8, 1.7, col);
        if (pin.mode === "chase" && !f.minPinPacified)
          dot(px + 10, py - 8, 10, "rgba(255,30,30,0.15)");
        // it has noticed you: the ? fills in as it makes up its mind
        if (!f.minPinPacified && pin.mode !== "chase" && (pin.alert > 0 || pin.mode === "search")) {
          const a = pin.mode === "search" ? 0.45 : 0.4 + 0.6 * pin.alert;
          c.font = `${Math.round(18 + 12 * pin.alert)}px "VT323", monospace`;
          c.textAlign = "center";
          c.fillStyle = pin.mode === "search" ? `rgba(255,150,60,${a})` : `rgba(255,40,40,${a})`;
          c.fillText("?", px + 10, py - 20);
        }
      }
      // T3's diagnostic eye
      {
        const px = T3_POS.x * TILE - cx;
        const py = T3_POS.y * TILE - cy;
        const red = Math.sin(time * 3.3) > 0;
        dot(px + 3, py - 16, 2, red ? "rgba(255,50,50,0.95)" : "rgba(80,160,255,0.95)");
        dot(px + 3, py - 16, 9, red ? "rgba(255,50,50,0.15)" : "rgba(80,160,255,0.15)");
      }
      // player headlamp cone
      if (!lampOff()) {
        const px = player.x * TILE - cx;
        const py = player.y * TILE - cy;
        const ang = Math.atan2(player.dy, player.dx);
        const g2 = c.createRadialGradient(px, py - 14, 2, px, py - 14, 90);
        g2.addColorStop(0, "rgba(255,240,190,0.1)");
        g2.addColorStop(1, "rgba(255,240,190,0)");
        c.fillStyle = g2;
        c.beginPath();
        c.moveTo(px, py - 14);
        c.arc(px, py - 14, 90, ang - 0.45, ang + 0.45);
        c.closePath();
        c.fill();
      }
      c.restore();
    }

    const LABELS: Record<string, (f: Flags) => string> = {
      terminal: () => "TICKET QUEUE TERMINAL",
      printer: () => "THE PRINTER THAT KNOWS",
      undead: () => "THE UNDEAD SERVER",
      door: (f) => (f.doorOpen ? "SERVER ROOM" : "SERVER ROOM DOOR — LOCKED"),
      core: () => "E.S.C.A.L.A.T.E. CORE",
      coffee: () => "COFFEE MACHINE",
      whiteboard: () => "WHITEBOARD",
      exit: (f) => (actOf(f) >= 3 ? "FRONT EXIT — UNLOCKED" : "FRONT EXIT — LOCKED"),
      minpin: (f) =>
        f.minPinPacified
          ? "MIN PIN (FRIEND-SHAPED)"
          : f.gotToken
            ? "PRESENT WHITELIST TOKEN"
            : "FERAL SECURITY DAEMON — DO NOT",
    };

    function drawPrompt(c: CanvasRenderingContext2D, f: Flags) {
      if (pausedRef.current) return;
      const t = nearestInteractable();
      if (!t) return;
      const ticket = t.id.startsWith("ticket:") ? TICKET_BY_ID[t.id.slice(7)] : undefined;
      const label = LABELS[t.id]
        ? LABELS[t.id](f)
        : ticket
          ? isOpen(f, ticket.id)
            ? `${ticket.code} · ${ticket.title}`
            : ticket.device
          : t.id.startsWith("pickup:")
          ? "SOMETHING GLINTS"
          : t.id.startsWith("search:")
            ? tileAt(t.x, t.y) === "=" ? "SEARCH DESK" : "SEARCH RACK"
            : t.id;
      const text = `[E] ${label}`;
      c.font = '22px "VT323", monospace';
      c.textAlign = "center";
      const w = c.measureText(text).width + 28;
      c.fillStyle = "rgba(3,6,8,0.82)";
      c.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 54, w, 32);
      c.strokeStyle = "rgba(57,255,142,0.5)";
      c.strokeRect(VIEW_W / 2 - w / 2 + 0.5, VIEW_H - 53.5, w - 1, 31);
      c.fillStyle = "#9fe8c4";
      c.fillText(text, VIEW_W / 2, VIEW_H - 31);
    }

    // ---------- loop ----------
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // dev-only verification hook (stripped from the release build)
    if (import.meta.env.DEV) {
      const w = window as unknown as { __ishop?: Record<string, unknown> };
      w.__ishop = {
        ...w.__ishop,
        tp: (x: number, y: number) => {
          player.x = x;
          player.y = y;
        },
        where: () => ({ x: player.x, y: player.y, pin: { x: pin.x, y: pin.y, mode: pin.mode } }),
        face: (dx: number, dy: number) => {
          player.dx = dx;
          player.dy = dy;
        },
        revealed: () => [...revealed],
        pin: () => ({
          mode: pin.mode,
          alert: +pin.alert.toFixed(2),
          unseen: +pin.unseen.toFixed(2),
          x: +pin.x.toFixed(2),
          y: +pin.y.toFixed(2),
          checkpoint,
        }),
        putPin: (x: number, y: number) => {
          pin.x = x;
          pin.y = y;
        },
        dips: () => dips,
        peekNow: () => {
          peekTimer = 0;
        },
        peek: () => peek && { ...peek, live: time < peek.until },
        watch: () => watchRef.current,
        hold: (k: string, on: boolean) => (on ? keys.add(k) : keys.delete(k)),
        interact: () => {
          const t = nearestInteractable();
          if (t) onInteractRef.current(t.id);
          return t?.id ?? null;
        },
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_W}
      height={VIEW_H}
      className="h-full w-full object-contain"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
