// Theme-agnostic pinball physics. Everything table-specific comes from TABLE /
// ACTIVE; everything feel-specific comes from DIFF. Call stepPhysics(STEP) at a
// fixed rate (see timestep.ts) — never with a render-frame delta.

import {
  BALL_RADIUS, WALL_PAD, GRAVITY, AIR_DRAG, ROLL_FRICTION, SLOPE_G, SUBSTEPS,
} from './constants';
import type { BallState, PhysEvent, FlipperSide, FlipperState } from './types';
import { FIELD } from './types';
import {
  TABLE, ACTIVE, samplePath, rideById, captureById, kinematicSpeed, kinematicPose, layerSet, layerById, insidePolygon,
  pathLength, pathTangent, rideSpeed,
} from './table';
import { gameRef, isTilted } from './runtime';
import { DIFF } from './difficulty';

// Scale a base restitution by the difficulty's reactivity, with a sanity clamp so
// hard/impossible can never inject more energy than they absorb per bounce.
function bounciness(base: number) {
  return Math.min(1.3, base * DIFF.rest);
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function collideSegment(ball: BallState, ax: number, ay: number, bx: number, by: number, radius: number) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = 0;
  if (len2 > 1e-9) {
    t = ((ball.x - ax) * abx + (ball.y - ay) * aby) / len2;
    t = clamp(t, 0, 1);
  }
  const cx = ax + abx * t, cy = ay + aby * t;
  const dx = ball.x - cx, dy = ball.y - cy;
  const dist = Math.hypot(dx, dy);
  return { t, cx, cy, dx, dy, dist, nx: dist > 1e-6 ? dx / dist : 0, ny: dist > 1e-6 ? dy / dist : 1, overlap: radius - dist };
}

function collideCircle(ball: BallState, cx: number, cy: number, r: number) {
  const dx = ball.x - cx, dy = ball.y - cy;
  const dist = Math.hypot(dx, dy);
  const minD = r + BALL_RADIUS;
  return {
    dist,
    nx: dist > 1e-6 ? dx / dist : 0,
    ny: dist > 1e-6 ? dy / dist : 1,
    overlap: minD - dist,
  };
}

function decayFlashes(dt: number) {
  const f = gameRef.flashes;
  const rates = TABLE.flashDecay ?? {};
  for (const k of Object.keys(f)) {
    const colon = k.indexOf(':');
    const rate = rates[colon < 0 ? k : k.slice(0, colon)] ?? 2.5;
    f[k] = Math.max(0, f[k] - dt * rate);
    if (f[k] <= 0) delete f[k];
  }
}

function updateFlipper(fl: FlipperState, side: FlipperSide, tilted: boolean, dt: number) {
  const pressed = tilted ? false : fl.pressed;
  const target = pressed ? side.active : side.rest;
  const diff = target - fl.angle;
  const dir = Math.sign(diff);
  const maxSpeed = (pressed ? TABLE.flippers.upSpeed : TABLE.flippers.downSpeed) * DIFF.flipSpeed;
  const step = maxSpeed * dt;
  fl.prevAngle = fl.angle;
  if (Math.abs(diff) <= step) {
    fl.angle = target;
    fl.angVel = diff / dt;
  } else {
    fl.angle = fl.angle + dir * step;
    fl.angVel = dir * maxSpeed;
  }
}

export function stepPhysics(dt: number): PhysEvent[] {
  const events: PhysEvent[] = [];
  const G = gameRef;
  if (G.paused) return events;
  G.time += dt;

  const T = TABLE;
  const P = T.plunger;
  const FL = T.flippers;

  decayFlashes(dt);
  G.shake = Math.max(0, G.shake - dt * 1.6);
  if (G.bumperComboTimer > 0) {
    G.bumperComboTimer -= dt;
    if (G.bumperComboTimer <= 0) G.bumperCombo = 0;
  }
  if (G.skillWindow > 0) G.skillWindow -= dt;
  if (G.launchCooldown > 0) G.launchCooldown -= dt;

  for (const id of Object.keys(G.padCool)) {
    G.padCool[id] = Math.max(0, G.padCool[id] - dt);
  }

  for (const id of Object.keys(G.spinners)) {
    const sp = G.spinners[id];
    sp.angle += sp.vel * dt;
    sp.vel *= Math.exp(-2.2 * dt);
  }

  const tilted = isTilted();

  // ---- kinematic obstacles ----
  for (const k of ACTIVE.kinematics) {
    G.kin[k.id] = (G.kin[k.id] ?? 0) + kinematicSpeed(k) * dt;
  }

  // ---- flippers ----
  updateFlipper(G.left, FL.left, tilted, dt);
  updateFlipper(G.right, FL.right, tilted, dt);

  // consume nudge
  const nudgeX = G.pendingNudge.x;
  const nudgeY = G.pendingNudge.y;
  G.pendingNudge.x = 0;
  G.pendingNudge.y = 0;

  const sub = SUBSTEPS;
  const h = dt / sub;

  for (const ball of G.balls) { ball.px = ball.x; ball.py = ball.y; }

  for (let s = 0; s < sub; s++) {
    for (const ball of G.balls) {
      if (!ball.active) continue;

      // auto-launch countdown (multiball second ball)
      if (ball.autoLaunch !== undefined) {
        ball.autoLaunch -= h;
        ball.x = P.x;
        ball.y = P.restY;
        ball.vx = 0; ball.vy = 0;
        if (ball.autoLaunch <= 0) {
          ball.autoLaunch = undefined;
          ball.vy = (P.autoLaunch + Math.random() * 15) * DIFF.launch;
          ball.vx = (Math.random() - 0.5) * 4;
          events.push({ type: 'autoLaunch', x: ball.x, y: ball.y });
        }
        continue;
      }

      // held in a capture (saucer/scoop)
      if (ball.captured > 0) {
        const cap = captureById(ball.captureId ?? '');
        ball.captured -= h;
        if (cap) {
          ball.x += (cap.x - ball.x) * Math.min(1, 10 * h);
          ball.y += (cap.y - ball.y) * Math.min(1, 10 * h);
        }
        ball.vx = 0; ball.vy = 0;
        if (ball.captured <= 0) {
          const capId = ball.captureId ?? '';
          const redirect = G.ejectRide[capId] ? rideById(G.ejectRide[capId]) : undefined;
          if (redirect) {
            // rules asked for this eject to leave on a ride (e.g. a volcano launch)
            delete G.ejectRide[capId];
            ball.captureCooldown = cap?.cooldown ?? 2.5;
            ball.captureId = undefined;
            ball.ride = { id: redirect.id, t: 0, speed: redirect.carry ? rideSpeed(redirect, 0) : undefined };
            events.push({ type: 'captureEject', id: capId, x: ball.x, y: ball.y });
            events.push({ type: 'rideEnter', id: redirect.id, x: ball.x, y: ball.y, speed: 0 });
            continue;
          }
          const ej = cap?.eject ?? { angle: Math.PI / 2, spread: 0.9, speed: 130, speedJitter: 30 };
          ball.captureCooldown = cap?.cooldown ?? 2.5;
          const a = ej.angle + (Math.random() - 0.5) * ej.spread;
          const sp = ej.speed + Math.random() * ej.speedJitter;
          ball.vx = Math.cos(a) * sp;
          ball.vy = Math.sin(a) * sp;
          events.push({ type: 'captureEject', id: ball.captureId ?? '', x: ball.x, y: ball.y });
          ball.captureId = undefined;
        }
        continue;
      }
      if (ball.captureCooldown > 0) ball.captureCooldown -= h;

      // Ride a capture-path (ramp / tunnel). No collision while in transit —
      // that's the whole point of a pipe. The ball is guaranteed to eject.
      if (ball.ride) {
        const ride = rideById(ball.ride.id);
        if (!ride) { ball.ride = undefined; continue; }
        const speed = ball.ride.speed ?? rideSpeed(ride, 0);
        ball.ride.t += ride.carry ? (h * speed) / pathLength(ride.path) : h / ride.dur;
        const p = samplePath(ride.path, Math.min(1, ball.ride.t));
        ball.x = p.x;
        ball.y = p.y;
        ball.h = p.h;
        // Velocity along the path while riding. Nothing collides in transit, so
        // this only feeds the renderer (the ball keeps rolling), the roll sound
        // and the camera — never the ride itself.
        const tan = pathTangent(ride.path, ball.ride.t);
        ball.vx = tan.x * speed;
        ball.vy = tan.y * speed;
        if (ball.ride.t >= 1) {
          ball.ride = undefined;
          ball.captureCooldown = 0.9;
          if (ride.carry) {
            // leave along the end of the path, still carrying the ride's speed
            const end = pathTangent(ride.path, 1);
            ball.vx = end.x * speed;
            ball.vy = end.y * speed;
          } else {
            ball.vx = ride.exit.vx;
            ball.vy = ride.exit.vy;
          }
          events.push({ type: 'rideExit', id: ride.id, x: ball.x, y: ball.y });
          const from = ball.layer ?? FIELD;
          const to = ride.exitLayer ?? from;
          ball.layer = to === FIELD ? undefined : to;
          if (to !== from) events.push({ type: 'layer', id: ride.id, from, to, via: 'ride', x: ball.x, y: ball.y });
        }
        continue;
      }

      // Which playfield layer this ball lives on this substep. Plunger, flippers,
      // drain and the height field only exist on the main field.
      const onField = ball.layer === undefined || ball.layer === FIELD;
      const S = layerSet(ball.layer);

      // plunger hold: a ball resting at the bottom of the shooter lane while charging
      const inLaneArea = ball.x > P.dividerX && ball.y < P.laneTopY;
      ball.inLane = onField && inLaneArea;
      if (onField && inLaneArea && ball.y < P.holdBelowY && G.plungerCharging && ball.vy < 1) {
        ball.x = P.x;
        ball.y = P.restY;
        ball.vx = 0; ball.vy = 0;
        continue;
      }

      // apply nudge once per frame (first substep)
      if (s === 0 && (nudgeX !== 0 || nudgeY !== 0)) {
        ball.vx += nudgeX;
        ball.vy += nudgeY;
      }

      // gravity + integration (difficulty scales gravity: super-easy genuinely plays slower)
      ball.vy += GRAVITY * DIFF.grav * h;

      // Slope force from the height field. Using the real gradient means inclines
      // decelerate a climbing ball AND accelerate a descending one, so a ball can
      // never come to rest partway up a ramp.
      {
        const e = 0.35;
        const gx = (T.heightAt(ball.x + e, ball.y) - T.heightAt(ball.x - e, ball.y)) / (2 * e);
        const gy = (T.heightAt(ball.x, ball.y + e) - T.heightAt(ball.x, ball.y - e)) / (2 * e);
        if (onField && (gx !== 0 || gy !== 0)) {
          const sg = SLOPE_G * DIFF.grav;
          ball.vx -= sg * gx * h;
          ball.vy -= sg * gy * h;
        }
      }
      // drag
      const drag = 1 - AIR_DRAG * h;
      ball.vx *= drag;
      ball.vy *= drag;
      // rolling friction (stronger when slow)
      const sp0 = Math.hypot(ball.vx, ball.vy);
      if (sp0 > 1) {
        const fr = Math.min(sp0, ROLL_FRICTION * 8 * h * (sp0 < 30 ? 2 : 1));
        ball.vx -= (ball.vx / sp0) * fr;
        ball.vy -= (ball.vy / sp0) * fr;
      }
      // clamp
      const sp1 = Math.hypot(ball.vx, ball.vy);
      if (sp1 > DIFF.maxSpeed) {
        ball.vx = (ball.vx / sp1) * DIFF.maxSpeed;
        ball.vy = (ball.vy / sp1) * DIFF.maxSpeed;
      }

      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      ball.spin += sp1 * h * 0.4;

      // Remember where integration left the ball so we can measure how hard the
      // colliders had to shove it back this step (see un-wedge below).
      const solveX = ball.x, solveY = ball.y;

      // ---- one-way gate: block playfield -> lane above the divider top ----
      const dX = P.dividerX;
      if (onField && ball.y > P.gate.yMin && ball.y < P.gate.yMax && ball.x > dX - BALL_RADIUS - WALL_PAD && ball.x < dX + 1 && ball.vx > 0 && ball.x - ball.vx * h < dX) {
        // Park it exactly on the divider's collision surface, otherwise the gate and
        // the wall fight each other and the ball buzzes in place.
        ball.x = dX - BALL_RADIUS - WALL_PAD;
        ball.vx = -Math.abs(ball.vx) * 0.4;
      }

      // ---- walls ----
      for (const w of S.walls) {
        const col = collideSegment(ball, w.ax, w.ay, w.bx, w.by, BALL_RADIUS + WALL_PAD);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 0) {
            const rest = bounciness(w.rest ?? 0.4);
            ball.vx -= (1 + rest) * vn * col.nx;
            ball.vy -= (1 + rest) * vn * col.ny;
            if (w.kind === 'sling') {
              const kick = (w.kick ?? 90) * (DIFF.slingKick / 92);
              ball.vx += col.nx * kick;
              ball.vy += col.ny * kick;
              events.push({ type: 'sling', id: w.group ?? w.id, x: ball.x, y: ball.y, speed: Math.abs(vn) });
            }
          }
        }
      }

      // divider top cap (rounded)
      if (onField) {
        const col = collideCircle(ball, P.cap.x, P.cap.y, P.cap.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 0) {
            ball.vx -= 1.45 * vn * col.nx;
            ball.vy -= 1.45 * vn * col.ny;
          }
        }
      }

      // ---- bumpers ----
      for (const b of S.bumpers) {
        const col = collideCircle(ball, b.x, b.y, b.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          const kick = DIFF.bumperKick;
          if (vn < 20) {
            ball.vx += col.nx * (kick - Math.min(0, vn) * 0.9);
            ball.vy += col.ny * (kick - Math.min(0, vn) * 0.9);
            // slight tangent damping for control
            const tx = -col.ny, ty = col.nx;
            const vt = ball.vx * tx + ball.vy * ty;
            ball.vx -= tx * vt * 0.12;
            ball.vy -= ty * vt * 0.12;
          }
          G.bumperCombo += 1;
          G.bumperComboTimer = 2.2;
          events.push({ type: 'bumper', id: b.id, x: ball.x, y: ball.y });
        }
      }

      // ---- passive posts ----
      for (const p of S.posts) {
        const col = collideCircle(ball, p.x, p.y, p.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 0) {
            const rest = bounciness(p.rest ?? 0.75);
            ball.vx -= (1 + rest) * vn * col.nx;
            ball.vy -= (1 + rest) * vn * col.ny;
            if (Math.abs(vn) > 25) events.push({ type: 'post', id: p.id, x: ball.x, y: ball.y });
          }
        }
      }

      // ---- kickers: spring posts that punch the ball away ----
      for (const fk of S.kickers) {
        const col = collideCircle(ball, fk.x, fk.y, fk.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 12) {
            ball.vx += col.nx * (DIFF.kickerKick - Math.min(0, vn) * 0.6);
            ball.vy += col.ny * (DIFF.kickerKick - Math.min(0, vn) * 0.6);
            events.push({ type: 'post', id: fk.id, x: ball.x, y: ball.y });
          }
        }
      }

      // ---- kinematic obstacles: moving bars and orbiting posts that swat the ball ----
      for (const k of S.kinematics) {
        const pose = kinematicPose(k, G.kin[k.id] ?? 0);
        if (pose.kind === 'orbiter') {
          const col = collideCircle(ball, pose.x, pose.y, k.r);
          if (col.overlap > 0) {
            ball.x += col.nx * col.overlap;
            ball.y += col.ny * col.overlap;
            const rvx = ball.vx - pose.vx, rvy = ball.vy - pose.vy;
            const vn = rvx * col.nx + rvy * col.ny;
            if (vn < 0) {
              const rest = bounciness(k.rest);
              ball.vx -= (1 + rest) * vn * col.nx;
              ball.vy -= (1 + rest) * vn * col.ny;
              ball.vx += pose.vx * k.swat;
              ball.vy += pose.vy * k.swat;
              events.push({ type: 'post', id: k.id, x: ball.x, y: ball.y });
            }
          }
          continue;
        }
        const col = collideSegment(ball, pose.ax, pose.ay, pose.bx, pose.by, BALL_RADIUS + k.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          // surface velocity of the moving bar at the contact point (v = ω × r)
          const dx = col.cx - k.cx, dy = col.cy - k.cy;
          const w = pose.angVel;
          const vsx = -w * dy, vsy = w * dx;
          const rvx = ball.vx - vsx, rvy = ball.vy - vsy;
          const vn = rvx * col.nx + rvy * col.ny;
          if (vn < 0) {
            const rest = bounciness(k.rest);
            ball.vx -= (1 + rest) * vn * col.nx;
            ball.vy -= (1 + rest) * vn * col.ny;
            ball.vx += vsx * k.swat;
            ball.vy += vsy * k.swat;
            events.push({ type: 'post', id: k.id, x: ball.x, y: ball.y });
          }
        }
      }

      // ---- standup targets ----
      for (const t of S.targets) {
        const col = collideCircle(ball, t.x, t.y, t.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 0) {
            const rest = bounciness(t.rest ?? 0.65);
            ball.vx -= (1 + rest) * vn * col.nx;
            ball.vy -= (1 + rest) * vn * col.ny;
            events.push({ type: 'target', id: t.id, x: ball.x, y: ball.y });
          }
        }
      }

      // ---- drop targets (no collision once down) ----
      for (const t of S.drops) {
        if (G.dropDown[t.id]) continue;
        const col = collideCircle(ball, t.x, t.y, t.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          const vn = ball.vx * col.nx + ball.vy * col.ny;
          if (vn < 0) {
            ball.vx -= 1.55 * vn * col.nx;
            ball.vy -= 1.55 * vn * col.ny;
            G.dropDown[t.id] = true;
            events.push({ type: 'drop', id: t.id, x: ball.x, y: ball.y });
          }
        }
      }

      // NOTE: no separate pivot collider — the flipper segment already starts at
      // the pivot with a larger radius, and an extra disc only creates a wedge pocket.

      // ---- flippers (segments) ----
      for (let fi = 0; onField && fi < 2; fi++) {
        const side = fi === 0 ? FL.left : FL.right;
        const st = fi === 0 ? G.left : G.right;
        const pivot = side.pivot;
        const tipX = pivot.x + Math.cos(st.angle) * FL.len;
        const tipY = pivot.y + Math.sin(st.angle) * FL.len;
        const col = collideSegment(ball, pivot.x, pivot.y, tipX, tipY, BALL_RADIUS + FL.r);
        if (col.overlap > 0) {
          ball.x += col.nx * col.overlap;
          ball.y += col.ny * col.overlap;
          // surface velocity due to rotation at the contact point: v = ω × r
          const dx = col.cx - pivot.x, dy = col.cy - pivot.y;
          const w = st.angVel;
          const vsx = -w * dy;
          const vsy = w * dx;
          const rvx = ball.vx - vsx;
          const rvy = ball.vy - vsy;
          const vn = rvx * col.nx + rvy * col.ny;
          if (vn < 0) {
            const rest = 0.35;
            ball.vx -= (1 + rest) * vn * col.nx;
            ball.vy -= (1 + rest) * vn * col.ny;
            // extra flip boost when swinging up (difficulty-tuned reactivity)
            const swingBoost = Math.abs(w) > 4 ? Math.abs(w) * DIFF.flipperBoost : 0;
            if (swingBoost > 0) {
              ball.vx += col.nx * swingBoost * 0.95 + vsx * 0.32;
              ball.vy += col.ny * swingBoost * 0.95 + vsy * 0.32;
            }
          } else if (Math.abs(w) > 8) {
            // even if separating, impart some swing energy
            ball.vx += vsx * 0.12;
            ball.vy += vsy * 0.12;
          }
        }
      }

      // ---- rollover sensors ----
      for (const sn of S.sensors) {
        const inside = Math.hypot(ball.x - sn.x, ball.y - sn.y) < sn.r;
        const was = ball.inside.has(sn.id);
        if (inside && !was) {
          ball.inside.add(sn.id);
          if (!sn.minSpeed || Math.hypot(ball.vx, ball.vy) > sn.minSpeed) {
            events.push({ type: 'sensor', kind: sn.kind, id: sn.id, x: ball.x, y: ball.y });
          }
          if (sn.blast && (G.padCool[sn.id] ?? 0) <= 0) {
            const a = sn.blast.angle + (Math.random() - 0.5) * sn.blast.spread;
            ball.vx = Math.cos(a) * sn.blast.speed;
            ball.vy = Math.sin(a) * sn.blast.speed;
            ball.stuck = 0;
            G.padCool[sn.id] = sn.blast.cooldown;
            events.push({ type: 'blast', id: sn.id, x: ball.x, y: ball.y });
          }
        } else if (!inside && was) {
          ball.inside.delete(sn.id);
        }
      }

      // ---- captures (saucers / scoops) ----
      let taken = false;
      for (const cap of S.captures) {
        const key = `cap:${cap.id}`;
        const inside = Math.hypot(ball.x - cap.x, ball.y - cap.y) < cap.r;
        const was = ball.inside.has(key);
        if (inside && !was) {
          ball.inside.add(key);
          if (ball.captureCooldown <= 0 && Math.hypot(ball.vx, ball.vy) < cap.maxSpeed) {
            ball.captured = cap.hold;
            ball.captureId = cap.id;
            events.push({ type: 'capture', id: cap.id, x: ball.x, y: ball.y });
            taken = true;
            break;
          }
        } else if (!inside && was) {
          ball.inside.delete(key);
        }
      }

      // ---- ride entries ----
      if (!taken) {
        for (const ride of S.rides) {
          if (ride.internal) continue; // only ever started by a capture redirect
          const key = `ride:${ride.id}`;
          const inside = Math.hypot(ball.x - ride.entry.x, ball.y - ride.entry.y) < ride.entry.r;
          const was = ball.inside.has(key);
          if (inside && !was) {
            ball.inside.add(key);
            const sp = Math.hypot(ball.vx, ball.vy);
            const g = ride.gate;
            const ok = ball.captureCooldown <= 0
              && (g.minSpeed === undefined || sp > g.minSpeed)
              && (g.maxSpeed === undefined || sp < g.maxSpeed)
              && (g.minVy === undefined || ball.vy > g.minVy)
              && (g.minLaunchPower === undefined || (G.skillWindow > 0 && G.lastLaunchPower >= g.minLaunchPower));
            if (ok) {
              ball.ride = { id: ride.id, t: 0, speed: ride.carry ? rideSpeed(ride, sp) : undefined };
              events.push({ type: 'rideEnter', id: ride.id, x: ball.x, y: ball.y, speed: sp });
              break;
            }
          } else if (!inside && was) {
            ball.inside.delete(key);
          }
        }
      }

      // ---- deck exits: drop holes and rail-less (waterfall) edges ----
      if (!onField && ball.active) {
        const deck = layerById(ball.layer);
        let via: 'hole' | 'edge' | null = null, id = '';
        if (deck) {
          const hole = deck.holes.find((hl) => Math.hypot(ball.x - hl.x, ball.y - hl.y) < hl.r);
          if (hole) { via = 'hole'; id = hole.id; }
          else if (!insidePolygon(ball.x, ball.y, deck.outline)) { via = 'edge'; id = deck.id; }
        } else { via = 'edge'; id = String(ball.layer); } // unknown layer: fail safe to the field
        if (via) {
          const from = ball.layer ?? FIELD;
          ball.layer = undefined;
          events.push({ type: 'layer', id, from, to: FIELD, via, x: ball.x, y: ball.y });
        }
      }

      // ---- drain ----
      if (onField && ball.y < T.drainY) {
        ball.active = false;
        ball.vx = 0; ball.vy = 0;
        events.push({ type: 'drain', id: ball.id, x: ball.x, y: ball.y });
      }

      // ---- un-wedge safety net ----
      // A wedged ball is one the solver keeps pushing every step while it barely
      // moves. The push direction is the way out, so ease it along that vector and
      // add a small kick if it persists. This guarantees no permanent stick even if
      // a future layout edit introduces a tight spot.
      const corrX = ball.x - solveX;
      const corrY = ball.y - solveY;
      const corrMag = Math.hypot(corrX, corrY);
      const speedNow = Math.hypot(ball.vx, ball.vy);
      const onFlipper = onField && ball.y < T.restZone.maxY && Math.abs(ball.x) < T.restZone.halfX;
      const inLaneRest = onField && ball.x > P.dividerX;
      if (corrMag > 0.02 && speedNow < 26 && !onFlipper && !inLaneRest) {
        ball.stuck = (ball.stuck ?? 0) + h;
        if (ball.stuck > 0.25) {
          const nx = corrX / corrMag, ny = corrY / corrMag;
          ball.x += nx * 0.06;
          ball.y += ny * 0.06;
          ball.vx += nx * 26 * h * 12;
          ball.vy += ny * 26 * h * 12;
          G.unwedgeCount++;
        }
      } else if ((ball.stuck ?? 0) > 0) {
        ball.stuck = Math.max(0, (ball.stuck ?? 0) - h * 3);
      }

      // safety: keep in bounds
      const B = T.bounds;
      if (ball.x < B.minX) { ball.x = B.minX; ball.vx = Math.abs(ball.vx) * 0.5; }
      if (ball.x > B.maxX) { ball.x = B.maxX; ball.vx = -Math.abs(ball.vx) * 0.5; }
      if (ball.y > B.maxY) { ball.y = B.maxY; ball.vy = -Math.abs(ball.vy) * 0.5; }
    }

    // ball-ball collisions
    const actives = G.balls.filter(b => b.active && b.captured <= 0 && !b.ride && b.autoLaunch === undefined);
    for (let i = 0; i < actives.length; i++) {
      for (let j = i + 1; j < actives.length; j++) {
        const a = actives[i], b = actives[j];
        if ((a.layer ?? FIELD) !== (b.layer ?? FIELD)) continue; // one on the deck, one under it
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minD = BALL_RADIUS * 2;
        if (dist < minD && dist > 1e-6) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (minD - dist) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const e = 0.92;
            const jimp = -(1 + e) * vn / 2;
            a.vx -= jimp * nx; a.vy -= jimp * ny;
            b.vx += jimp * nx; b.vy += jimp * ny;
          }
        }
      }
    }
  }

  return events;
}
