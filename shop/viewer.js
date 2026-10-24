/*
 * viewer.js — first-person (WASD) walkthrough of the shop, driven entirely by
 * window.SHOP_DATA from layouts.js. This file shouldn't need edits when the
 * real layouts arrive; if it does, that's a bug in here, not in the data.
 *
 * The design bias throughout: boring + robust beats pretty. This runs live in
 * front of people, so every choice favors "can't visibly break" over fidelity.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = (id) => document.getElementById(id);
const DEG = Math.PI / 180;

// ───────────────────────── data + validation ─────────────────────────
// Fail loudly in the menu card, not silently in a blank canvas. A typo in
// pasted JSON at 11pm Sunday should name itself.
const DATA = window.SHOP_DATA;
function fail(msg) { $('err').textContent = msg; throw new Error(msg); }

if (!DATA || !DATA.room || !DATA.layouts) fail('layouts.js is missing SHOP_DATA.room or SHOP_DATA.layouts.');
const ROOM = DATA.room;
const LAYOUT_KEYS = Object.keys(DATA.layouts);
if (!LAYOUT_KEYS.length) fail('SHOP_DATA.layouts is empty.');
const BEFORE_KEY = DATA.layouts.before ? 'before' : LAYOUT_KEYS[0];

for (const key of LAYOUT_KEYS) {
  const seen = new Set();
  for (const o of DATA.layouts[key].objects) {
    for (const f of ['x', 'z', 'w', 'd', 'h']) {
      if (!Number.isFinite(o[f])) fail(`Layout "${key}", object "${o.id}": "${f}" must be a number (got ${o[f]}).`);
    }
    if (seen.has(o.id)) fail(`Layout "${key}" lists id "${o.id}" twice.`);
    seen.add(o.id);
  }
}

// ───────────────────────── renderer / scene / cameras ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#14161a');

const EYE = 5.5;       // ft, eye height
const RADIUS = 1.0;    // ft, player collision circle — roomy enough that you don't clip bench corners
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(ROOM.spawn?.x ?? ROOM.width / 2, EYE, ROOM.spawn?.z ?? ROOM.depth - 2);
camera.rotation.order = 'YXZ';
camera.rotation.y = -(ROOM.spawn?.yaw ?? 0) * DEG; // yaw 0 faces -z (up the plan)

// Plan-view camera for the T key. Orthographic so the floor plan isn't distorted —
// that's the view David will actually compare against his own sketch.
const topCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
function fitTopCam() {
  const aspect = window.innerWidth / window.innerHeight;
  const m = 2; // ft of margin around the room
  const halfH = Math.max(ROOM.depth / 2 + m, (ROOM.width / 2 + m) / aspect);
  topCam.left = -halfH * aspect; topCam.right = halfH * aspect;
  topCam.top = halfH; topCam.bottom = -halfH;
  topCam.position.set(ROOM.width / 2, 60, ROOM.depth / 2);
  topCam.up.set(0, 0, -1);            // north (z=0) is the top of the screen, like a floor plan
  topCam.lookAt(ROOM.width / 2, 0, ROOM.depth / 2);
  topCam.updateProjectionMatrix();
}
fitTopCam();

// Flat-ish lighting on purpose: no shadows keeps it fast on any presentation laptop.
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f48, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(ROOM.width * 0.3, 30, ROOM.depth * 0.2);
scene.add(sun);

// ───────────────────────── the room ─────────────────────────
const W = ROOM.width, D = ROOM.depth, H = ROOM.height;

// Floor: canvas-drawn grid, one cell = 4 ft, so you can eyeball distances while walking.
function gridTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5a5e66'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#4a4e56'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(W / 4, D / 4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: gridTexture() }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(W / 2, 0, D / 2);
scene.add(floor);

// Ceiling hides in top-down view. Walls are thin boxes just OUTSIDE the room rectangle so the
// interior faces sit exactly on x=0/W and z=0/D — no plane-orientation guesswork.
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ color: '#3b3f47' }));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(W / 2, H, D / 2);
scene.add(ceiling);

const wallMat = new THREE.MeshLambertMaterial({ color: '#8d9199' });
function wall(cx, cz, sx, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), wallMat);
  m.position.set(cx, H / 2, cz);
  scene.add(m);
}
const T = 0.3;
wall(W / 2, -T / 2, W + 2 * T, T);        // north
wall(W / 2, D + T / 2, W + 2 * T, T);     // south
wall(-T / 2, D / 2, T, D);                // west
wall(W + T / 2, D / 2, T, D);             // east

// A few emissive "fixture" strips so the ceiling reads as a ceiling.
const lightMat = new THREE.MeshBasicMaterial({ color: '#fffbe8' });
const lights = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 0.6), lightMat);
  m.position.set(W * (i + 0.5) / 3, H - 0.1, D * (j + 0.5) / 2);
  scene.add(m); lights.push(m);
}

// ───────────────────────── shared box + edge geometry ─────────────────────────
// Everything is a unit cube scaled to size. That's what makes the before→after morph
// trivial: tween position/rotation/scale and the same mesh is reused for every layout.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitEdges = new THREE.EdgesGeometry(unitBox);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x0b0c0f });

// Declared up here (not next to addLabel) because the fixed-feature loop below runs first
// and a `const` read before its line is a temporal-dead-zone crash.
const labelSprites = [];

// Fixed features (doors, windows, columns). Static; only `collide:true` ones block you.
const fixedColliders = [];
for (const f of DATA.fixed || []) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: f.color || '#777' })));
  g.add(new THREE.LineSegments(unitEdges, edgeMat));
  g.position.set(f.x, (f.y || 0) + f.h / 2, f.z);
  g.scale.set(f.w, f.h, f.d);
  g.rotation.y = -(f.rot || 0) * DEG;
  scene.add(g);
  if (f.collide) fixedColliders.push(g);
  addLabel(f.name, new THREE.Vector3(f.x, (f.y || 0) + f.h + 0.8, f.z), true);
}

// ───────────────────────── labels ─────────────────────────
// Canvas-text sprites. They face the camera for free, and depthTest stays on so a label
// behind a bench doesn't float through it.
function addLabel(text, pos, isFixed = false) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = isFixed ? '#1d2026d9' : '#0b0c0fd9';
  g.beginPath(); g.roundRect(4, 4, 504, 88, 18); g.fill();
  g.font = '600 44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = isFixed ? '#9aa0a8' : '#ffffff';
  g.fillText(text, 256, 50, 480);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(4.2, 0.79, 1);
  s.position.copy(pos);
  scene.add(s);
  labelSprites.push(s);
  return s;
}

// ───────────────────────── movable objects ─────────────────────────
// One node per id across ALL layouts (union), so a model that forgets an object doesn't crash us.
const nodes = new Map(); // id → { group, label, cur, from, to, name, hidden }
for (const key of LAYOUT_KEYS) {
  for (const o of DATA.layouts[key].objects) {
    if (nodes.has(o.id)) continue;
    const group = new THREE.Group();
    group.add(new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: o.color || '#999' })));
    group.add(new THREE.LineSegments(unitEdges, edgeMat));
    scene.add(group);
    nodes.set(o.id, { group, label: addLabel(o.name || o.id, new THREE.Vector3()), cur: null, from: null, to: null, hidden: true });
  }
}

const pose = (o) => ({ x: o.x, y: o.y || 0, z: o.z, rot: o.rot || 0, w: o.w, h: o.h, d: o.d });

function applyPose(node, p) {
  node.group.position.set(p.x, p.y + p.h / 2, p.z);
  node.group.scale.set(p.w, p.h, p.d);
  // `rot` is degrees CLOCKWISE as seen on the floor plan (compass-style); three.js rotates
  // the other way, hence the minus.
  node.group.rotation.y = -p.rot * DEG;
  node.label.position.set(p.x, p.y + p.h + 0.9, p.z);
}

// ───────────────────────── layout switching + tween ─────────────────────────
const TWEEN_SECONDS = 1.4;
let currentKey = null;
let lastAfterKey = LAYOUT_KEYS.find((k) => k !== BEFORE_KEY) || BEFORE_KEY;
let tweenT = 1;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Shortest way around the circle, so a 350°→10° rotation turns 20°, not 340°.
const angleDelta = (a, b) => ((b - a + 540) % 360) - 180;

function setLayout(key, instant = false) {
  if (!DATA.layouts[key]) return;
  const byId = new Map(DATA.layouts[key].objects.map((o) => [o.id, o]));
  for (const [id, node] of nodes) {
    const o = byId.get(id);
    if (!o) { node.hidden = true; node.group.visible = false; node.label.visible = false; continue; }
    const to = pose(o);
    node.from = node.cur && !node.hidden ? { ...node.cur } : { ...to }; // newly-appearing objects don't fly in from nowhere
    node.to = to;
    node.hidden = false;
    node.group.visible = true;
    if (!node.cur) node.cur = { ...to };
  }
  currentKey = key;
  if (key !== BEFORE_KEY) lastAfterKey = key;
  tweenT = instant ? 1 : 0;
  if (instant) stepTween(0);
  refreshHud();
}

function stepTween(dt) {
  if (tweenT >= 1 && dt > 0) return;
  tweenT = Math.min(1, tweenT + dt / TWEEN_SECONDS);
  const k = ease(tweenT);
  for (const node of nodes.values()) {
    if (node.hidden) continue;
    const a = node.from, b = node.to;
    node.cur = {
      x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k,
      rot: a.rot + angleDelta(a.rot, b.rot) * k,
      w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k, d: a.d + (b.d - a.d) * k,
    };
    applyPose(node, node.cur);
  }
}

// ───────────────────────── HUD + menu buttons ─────────────────────────
let topdown = false;
let labelsOn = true;

const layoutsEl = $('layouts');
LAYOUT_KEYS.forEach((key, i) => {
  const b = document.createElement('button');
  b.textContent = `${i + 1} · ${DATA.layouts[key].label || key}`;
  b.dataset.key = key;
  b.addEventListener('click', () => setLayout(key));
  layoutsEl.appendChild(b);
});

function refreshHud() {
  $('hudName').textContent = DATA.layouts[currentKey].label || currentKey;
  $('hudHint').textContent = topdown ? '· top-down' : '';
  for (const b of layoutsEl.children) b.classList.toggle('on', b.dataset.key === currentKey);
  $('cross').style.display = topdown ? 'none' : '';
}

// ───────────────────────── input ─────────────────────────
const controls = new PointerLockControls(camera, renderer.domElement);
const pause = $('pause');
controls.addEventListener('lock', () => { pause.style.display = 'none'; });
controls.addEventListener('unlock', () => { pause.style.display = 'flex'; });
document.addEventListener('pointerlockerror', () => { $('err').textContent = 'The browser refused mouse capture. Click the button again.'; });
// Phones/tablets report a coarse primary pointer. They have no pointer lock and no keyboard,
// so "playing" is just a flag there, and walking/looking come from the touch layer below.
const touchMode = window.matchMedia('(pointer: coarse)').matches;
let touchPlaying = false;
const isPlaying = () => (touchMode ? touchPlaying : controls.isLocked);

const start = () => {
  if (touchMode) { touchPlaying = true; pause.style.display = 'none'; return; }
  try { controls.lock(); } catch (e) { $('err').textContent = String(e); }
};
$('go').addEventListener('click', start);
pause.addEventListener('click', (e) => { if (e.target === pause) start(); });

// The same three actions are reachable from keys AND touch buttons, so they live in one place.
const toggleBeforeAfter = () => setLayout(currentKey === BEFORE_KEY ? lastAfterKey : BEFORE_KEY);
const toggleTopdown = () => { topdown = !topdown; refreshHud(); };
const toggleLabels = () => { labelsOn = !labelsOn; };

const held = new Set();
addEventListener('keydown', (e) => {
  held.add(e.code);
  if (e.repeat) return;
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit && LAYOUT_KEYS[digit[1] - 1]) setLayout(LAYOUT_KEYS[digit[1] - 1]);
  else if (e.code === 'KeyB') toggleBeforeAfter();
  else if (e.code === 'KeyT') toggleTopdown();
  else if (e.code === 'KeyL') toggleLabels();
});

// ───────────────────────── touch layer ─────────────────────────
// Left-bottom: a floating stick that appears under the thumb (so no one has to find a fixed
// control). Anywhere else: drag to look. Pointer events + capture keep a drag alive even if
// the finger slides over a button. Two thumbs work at once because each gesture tracks its own pointerId.
const stick = { f: 0, r: 0 }; // analog walk input, -1..1
if (touchMode) {
  document.body.classList.add('touch');
  $('howto').innerHTML = 'Hold your <b>left thumb</b> on the lower left to walk. <b>Drag</b> anywhere else to look around. ' +
    'Landscape works best. Use <b>Before / After</b> to flip layouts.';
  $('howtoSmall').textContent = 'The Menu button brings this card back.';
  $('go').textContent = 'Walk the shop';

  const STICK_R = 55; // px of thumb travel for full speed
  const base = $('joyBase'), knob = $('joyKnob');
  let joyId = null, ox = 0, oy = 0;
  const joy = $('joy');
  joy.addEventListener('pointerdown', (e) => {
    if (joyId !== null) return;
    joyId = e.pointerId; joy.setPointerCapture(joyId);
    ox = e.clientX; oy = e.clientY;
    base.style.display = 'block'; base.style.left = ox + 'px'; base.style.top = oy + 'px';
    knob.style.transform = '';
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    stick.r = dx / STICK_R; stick.f = -dy / STICK_R;      // up on screen = forward
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null; stick.f = stick.r = 0; base.style.display = 'none';
  };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);

  const look = $('look');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId; look.setPointerCapture(lookId); lx = e.clientX; ly = e.clientY;
  });
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId || !touchPlaying || topdown) return;
    const k = 0.0045; // radians per px — roughly a full screen swipe ≈ a 90° turn
    camera.rotation.y -= (e.clientX - lx) * k;
    camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x - (e.clientY - ly) * k));
    lx = e.clientX; ly = e.clientY;
  });
  const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };
  look.addEventListener('pointerup', lookEnd);
  look.addEventListener('pointercancel', lookEnd);

  $('tB').addEventListener('click', toggleBeforeAfter);
  // Cycles before → A → B → before…, so every layout is one tap away without opening the menu.
  $('tN').addEventListener('click', () => setLayout(LAYOUT_KEYS[(LAYOUT_KEYS.indexOf(currentKey) + 1) % LAYOUT_KEYS.length]));
  $('tT').addEventListener('click', toggleTopdown);
  $('tL').addEventListener('click', toggleLabels);
  $('tM').addEventListener('click', () => { touchPlaying = false; stick.f = stick.r = 0; pause.style.display = 'flex'; });
}
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear()); // alt-tab mid-stride shouldn't leave you sprinting forever

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  fitTopCam();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ───────────────────────── collision ─────────────────────────
// Player = circle on the floor; every blocker = rotated rectangle. Push the circle out of
// whichever rectangles it overlaps. Works on the live (mid-tween) pose, so a bench sliding
// into you shoves you aside instead of swallowing the camera.
function pushOut(group, p) {
  const hw = group.scale.x / 2, hd = group.scale.z / 2;
  const th = group.rotation.y, c = Math.cos(th), s = Math.sin(th);
  const dx = p.x - group.position.x, dz = p.z - group.position.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c; // world → box-local
  const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
  let nx = lx - cx, nz = lz - cz;
  const dist = Math.hypot(nx, nz);
  if (dist >= RADIUS) return;
  let px, pz;
  if (dist > 1e-6) { px = (nx / dist) * (RADIUS - dist); pz = (nz / dist) * (RADIUS - dist); }
  else { // centre is inside the box: exit through the nearest face
    const ex = hw - Math.abs(lx), ez = hd - Math.abs(lz);
    if (ex < ez) { px = Math.sign(lx || 1) * (ex + RADIUS); pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * (ez + RADIUS); }
  }
  p.x += px * c + pz * s; // box-local → world
  p.z += -px * s + pz * c;
}

function collide(p) {
  for (const g of fixedColliders) pushOut(g, p);
  for (const node of nodes.values()) {
    // Anything whose underside is above head height (6 ft) is something you walk under.
    if (node.hidden || !node.cur || node.cur.y >= 6) continue;
    pushOut(node.group, p);
  }
  p.x = Math.max(RADIUS, Math.min(W - RADIUS, p.x));
  p.z = Math.max(RADIUS, Math.min(D - RADIUS, p.z));
}

// ───────────────────────── main loop ─────────────────────────
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const pos = { x: camera.position.x, z: camera.position.z };

function update(dt) {
  stepTween(dt);

  if (isPlaying() && !topdown) {
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight') ? 12 : 6) * dt; // ft/s
    // Keyboard gives -1/0/1; the touch stick adds analog values on top of it.
    let f = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) + stick.f;
    let r = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) + stick.r;
    const len = Math.hypot(f, r);
    if (len > 0.05) {
      if (len > 1) { f /= len; r /= len; } // cap at 1 so diagonals aren't faster; analog <1 = slower walk
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      pos.x = camera.position.x + (fwd.x * f - fwd.z * r) * speed;
      pos.z = camera.position.z + (fwd.z * f + fwd.x * r) * speed;
    } else { pos.x = camera.position.x; pos.z = camera.position.z; }
  } else { pos.x = camera.position.x; pos.z = camera.position.z; }

  collide(pos); // runs even while standing still, so morphing furniture can nudge you
  camera.position.set(pos.x, EYE, pos.z);

  const active = topdown ? topCam : camera;
  ceiling.visible = !topdown;
  lights.forEach((m) => { m.visible = !topdown; });
  for (const s of labelSprites) {
    const d = s.position.distanceTo(camera.position);
    s.visible = labelsOn && (topdown || d < 22);
    // Sprites are sized in world feet, so up close they balloon over half the screen.
    // Shrink them as you approach (floor at 40%) so they stay readable but never dominate.
    const k = topdown ? 1 : Math.max(0.4, Math.min(1, d / 14));
    s.scale.set(4.2 * k, 0.79 * k, 1);
  }
  // Hidden nodes' labels must stay hidden regardless of the pass above.
  for (const node of nodes.values()) if (node.hidden) node.label.visible = false;
  return active;
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  renderer.render(scene, update(dt));
  requestAnimationFrame(frame);
}

setLayout(BEFORE_KEY, true);
window.__shopReady = true;
// Debug/test handle — also lets you poke at it from the console during rehearsal.
window.__shop = { camera, setLayout, controls, get currentKey() { return currentKey; }, nodes, pos, setTopdown: (v) => { topdown = v; refreshHud(); } };
frame();
