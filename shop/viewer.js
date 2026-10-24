/*
 * viewer.js — first-person (WASD / touch) walkthrough of the shop, driven entirely by
 * window.SHOP_DATA from layouts.js. It should not need edits when a new model's JSON
 * arrives; only layouts.js changes (see the format notes at the top of that file).
 *
 * Design bias throughout: boring + robust beats pretty. This runs live in front of people,
 * so every choice favors "can't visibly break" over fidelity.
 *
 * Shape of the data: SHOP_DATA.models[key] = one model's complete world — its own coordinate
 * frame, fixed features, and before/after layouts. Models are NOT merged or normalized; each
 * one is shown exactly as it described the shop, which keeps the comparison honest.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = (id) => document.getElementById(id);
const DEG = Math.PI / 180;

// ───────────────────────── data + validation ─────────────────────────
// Fail loudly in the menu card, not silently in a blank canvas. A typo in pasted JSON
// at 11pm Sunday should name itself.
const DATA = window.SHOP_DATA;
function fail(msg) { $('err').textContent = msg; throw new Error(msg); }

if (!DATA || !DATA.models) fail('layouts.js is missing SHOP_DATA.models.');
const MODEL_KEYS = Object.keys(DATA.models);
if (!MODEL_KEYS.length) fail('SHOP_DATA.models is empty.');

const NUM_FIELDS = ['x', 'z', 'w', 'd', 'h'];
function checkItems(where, list) {
  const seen = new Set();
  for (const o of list || []) {
    for (const f of NUM_FIELDS) {
      if (!Number.isFinite(o[f])) fail(`${where}, object "${o.id}": "${f}" must be a number (got ${o[f]}).`);
    }
    if (seen.has(o.id)) fail(`${where} lists id "${o.id}" twice.`);
    seen.add(o.id);
  }
}
for (const key of MODEL_KEYS) {
  const m = DATA.models[key];
  if (!Array.isArray(m.rooms) || !m.rooms.length) fail(`Model "${key}" needs a rooms array.`);
  for (const r of m.rooms) for (const f of ['x0', 'z0', 'w', 'd', 'h']) {
    if (!Number.isFinite(r[f])) fail(`Model "${key}", room "${r.id}": "${f}" must be a number.`);
  }
  if (!m.layouts || !Object.keys(m.layouts).length) fail(`Model "${key}" has no layouts.`);
  checkItems(`Model "${key}" fixed`, m.fixed);
  for (const id of Object.keys(m.enclosures || {})) {
    const f = (m.fixed || []).find((x) => x.id === id);
    if (!f) fail(`Model "${key}": enclosure "${id}" is not an id in "fixed".`);
    if (f.rot) fail(`Model "${key}": enclosure "${id}" has rot ${f.rot}; enclosures must be axis-aligned (rot 0).`);
  }
  for (const lk of Object.keys(m.layouts)) checkItems(`Model "${key}", layout "${lk}"`, m.layouts[lk].objects);
}

// ───────────────────────── renderer / scene / cameras ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#14161a');

const EYE = 5.5;       // ft, eye height
const RADIUS = 0.9;    // ft, player collision circle. Small enough to fit through a 3 ft door
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
camera.rotation.order = 'YXZ';

// Plan-view camera for the T key. Orthographic so the floor plan isn't distorted — that's
// the view people will compare against their own mental map of the shop.
const topCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
function fitTopCam(bounds) {
  const aspect = window.innerWidth / window.innerHeight;
  const m = 2; // ft of margin around everything
  const w = bounds.maxX - bounds.minX + 2 * m, d = bounds.maxZ - bounds.minZ + 2 * m;
  const halfH = Math.max(d / 2, w / 2 / aspect);
  const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
  topCam.left = -halfH * aspect; topCam.right = halfH * aspect;
  topCam.top = halfH; topCam.bottom = -halfH;
  topCam.position.set(cx, 80, cz);
  topCam.up.set(0, 0, -1);            // north (z=0) is the top of the screen, like a floor plan
  topCam.lookAt(cx, 0, cz);
  topCam.updateProjectionMatrix();
}

// Flat-ish lighting on purpose: no shadows keeps it fast on any presentation laptop.
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f48, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(30, 60, 20);
scene.add(sun);

// ───────────────────────── shared geometry + color rules ─────────────────────────
// Everything is a unit cube scaled to size. That's what makes the before→after morph trivial:
// tween position/rotation/scale and the same mesh is reused for every layout.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitEdges = new THREE.EdgesGeometry(unitBox);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x0b0c0f });

// Models don't send colors, so we infer one from the item's id/name. First match wins.
// Why: a walkthrough of identical gray boxes is unreadable; color is the cheapest legend.
const COLOR_RULES = [
  [/panel/, '#8a3a3a'], [/^ext|extinguisher/, '#c0392b'], [/rollup|roll-up/, '#8a8f94'],
  [/door|opening/, '#7a5230'], [/duct/, '#9aa0a8'], [/gas-air|gas\/air/, '#4a90a4'], [/hose/, '#c0392b'],
  [/welder/, '#3d6fd0'], [/grinder/, '#d6a31f'], [/fan|air-mover/, '#6b7280'],
  [/locker|cabinet|shelf|shelving|rack|cubby/, '#4d6b8a'], [/bench|table|station/, '#a0743c'],
  [/chest|tool/, '#b22'], [/cart|stand/, '#888'], [/drill|broom/, '#3d8a5a'], [/box|stock/, '#8a7a5a'],
];
function colorFor(o) {
  if (o.color) return o.color;
  const s = `${o.id} ${o.name || ''}`.toLowerCase();
  for (const [re, c] of COLOR_RULES) if (re.test(s)) return c;
  return '#8b8f97';
}

// ───────────────────────── labels ─────────────────────────
// Canvas-text sprites. They face the camera for free, and depthTest stays on so a label
// behind a bench doesn't float through it.
function makeLabel(text, dim) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = dim ? '#1d2026d9' : '#0b0c0fd9';
  g.beginPath(); g.roundRect(4, 4, 504, 88, 18); g.fill();
  g.font = '600 44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = dim ? '#9aa0a8' : '#ffffff';
  g.fillText(text, 256, 50, 480);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(4.2, 0.79, 1);
  return s;
}

// ───────────────────────── the loaded model ("world") ─────────────────────────
// Everything model-specific lives under `world`, so switching models is: remove the group, build a new one.
let world = null;
let M = null;                       // current model's data
let modelKey = null;
let rects = [];                     // walkable room rectangles
let passages = [];                  // little walkable rects that bridge two rooms through a door gap
let fixedColliders = [];            // invisible box proxies for solid fixed features
let nodes = new Map();              // movable id → { group, label, cur, from, to, moved }
let labelSprites = [];              // { sprite, maxDist, hidden }
let overheadMeshes = [];            // things above head height; hidden in plan view
let ceilings = [];
let layoutKeys = [];
let beforeKey = 'before';
let currentKey = null;
let lastAfterKey = null;
let roomIdx = 0;
let tweenT = 1;

function disposeWorld() {
  if (!world) return;
  scene.remove(world);
  world.traverse((o) => {
    if (o.material) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
  world = null;
}

function inAnyRoom(x, z) {
  return M.rooms.some((r) => x > r.x0 && x < r.x0 + r.w && z > r.z0 && z < r.z0 + r.d);
}

// Door classification. Which fixed items are doors is declared per model (`doors`), not guessed from
// names — "Extinguisher by side door" must not become a doorway.
// A door that joins two rooms becomes a gap in the wall you can walk through; a door to the outside
// is just a colored panel set into the wall (opening it onto black void would look broken).
function doorInfo(f) {
  const vertical = f.d > f.w;                    // thin in x → sits in a wall running along z
  const axis = vertical ? 'z' : 'x';
  const c = vertical ? f.x : f.z;                // the wall line it sits on
  const mid = vertical ? f.z : f.x;
  const half = (vertical ? f.d : f.w) / 2;
  const probe = (s) => (vertical ? inAnyRoom(c + s * 1.2, mid) : inAnyRoom(mid, c + s * 1.2));
  return { axis, c, lo: mid - half, hi: mid + half, connects: probe(-1) && probe(1), vertical };
}

function addBox(parent, cx, cy, cz, sx, sy, sz, mat) {
  const m = new THREE.Mesh(unitBox, mat);
  m.position.set(cx, cy, cz); m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

// Walls are boxes centered ON each room edge (not outside it), so two rooms that share an edge draw
// the identical wall in the identical spot — no double thickness, no visible seam.
const WT = 0.3;
function addWalls(parent, r, gaps, mat) {
  const edges = [
    { axis: 'x', c: r.z0,       a0: r.x0, a1: r.x0 + r.w },   // north
    { axis: 'x', c: r.z0 + r.d, a0: r.x0, a1: r.x0 + r.w },   // south
    { axis: 'z', c: r.x0,       a0: r.z0, a1: r.z0 + r.d },   // west
    { axis: 'z', c: r.x0 + r.w, a0: r.z0, a1: r.z0 + r.d },   // east
  ];
  for (const e of edges) {
    let segs = [[e.a0 - WT / 2, e.a1 + WT / 2]];
    for (const g of gaps) {
      if (g.axis !== e.axis || Math.abs(g.c - e.c) > 0.6) continue;
      segs = segs.flatMap(([s0, s1]) => {
        if (g.hi <= s0 || g.lo >= s1) return [[s0, s1]];
        const out = [];
        if (g.lo > s0) out.push([s0, g.lo]);
        if (g.hi < s1) out.push([g.hi, s1]);
        return out;
      });
    }
    for (const [s0, s1] of segs) {
      const len = s1 - s0; if (len < 0.01) continue;
      const mid = (s0 + s1) / 2;
      if (e.axis === 'x') addBox(parent, mid, r.h / 2, e.c, len, r.h, WT, mat);
      else addBox(parent, e.c, r.h / 2, mid, WT, r.h, len, mat);
    }
  }
}

// Booth rows arrive as one long box ("Booth row A (16 booths)"). A solid slab reads as a wall, not a
// welding school, so `decor` lets the model wrapper say "draw this as N blue booths with orange curtains
// opening toward +z". The collision proxy stays the single box — decor is purely visual.
function buildBooths(parent, f, dec, mats) {
  const alongX = f.w >= f.d;
  const L = alongX ? f.w : f.d, T = alongX ? f.d : f.w;
  const n = Math.max(1, dec.count | 0), mod = L / n;
  const openAxis = dec.open.endsWith('x') ? 'x' : 'z';
  const sign = dec.open.startsWith('-') ? -1 : 1;
  const bodyT = T * 0.86;                                   // booth body, leaving the front sliver open
  for (let i = 0; i < n; i++) {
    const along = -L / 2 + mod * (i + 0.5);
    // body sits against the back (opposite the open side); curtain hangs at the open face
    const bodyOff = -sign * (T - bodyT) / 2, curtOff = sign * (T / 2 - 0.05);
    const place = (a, across) => (alongX ? [f.x + a, f.z + across] : [f.x + across, f.z + a]);
    const [bx, bz] = place(along, bodyOff);
    const body = addBox(parent, bx, f.h / 2, bz,
      alongX ? mod * 0.9 : bodyT, f.h, alongX ? bodyT : mod * 0.9, mats.blue);
    const [cx, cz] = place(along, curtOff);
    const curtain = addBox(parent, cx, f.h * 0.5, cz,
      alongX ? mod * 0.55 : 0.08, f.h * 0.7, alongX ? 0.08 : mod * 0.55, mats.orange);
    body.add(new THREE.LineSegments(unitEdges, edgeMat));
    if ((f.y || 0) >= 6) overheadMeshes.push(body);   // "overhead" = starts above head height, NOT merely tall
    void curtain; void openAxis;
  }
}

// Some models put a room INSIDE the main floor as a single box (Gemini's tool room). A solid box can't be
// walked into and hides the shelving it describes, so the wrapper's `enclosures` asks for hollow walls
// with a doorway instead:   enclosures: { 'tool-room-main': { door: { side: 's', w: 3.5, at: 0 } } }
//   side  n | s | e | w (n = z-min, s = z-max, w = x-min, e = x-max)     at  ft off the wall's middle
// Axis-aligned only (rot 0). If the model didn't give a door, the wrapper's `note` must say it was added.
function buildEnclosure(parent, f, enc, mat) {
  const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, z0 = f.z - f.d / 2, z1 = f.z + f.d / 2;
  const sides = {
    n: { axis: 'x', c: z0, a0: x0, a1: x1 }, s: { axis: 'x', c: z1, a0: x0, a1: x1 },
    w: { axis: 'z', c: x0, a0: z0, a1: z1 }, e: { axis: 'z', c: x1, a0: z0, a1: z1 },
  };
  const door = enc.door || null, LINTEL = 7;                 // ft: wall above this closes the doorway top
  for (const [name, e] of Object.entries(sides)) {
    if ((enc.skip || []).includes(name)) continue;           // side already is a shop wall: drawing it again would z-fight
    let segs = [[e.a0 - WT / 2, e.a1 + WT / 2]];
    let gap = null;
    if (door && door.side === name) {
      const mid = (e.a0 + e.a1) / 2 + (door.at || 0);
      gap = [mid - door.w / 2, mid + door.w / 2];
      segs = [[e.a0 - WT / 2, gap[0]], [gap[1], e.a1 + WT / 2]];
    }
    const put = (s0, s1, y0, y1, solid) => {
      const len = s1 - s0; if (len < 0.01 || y1 - y0 < 0.01) return;
      const m = (s0 + s1) / 2, cy = (y0 + y1) / 2, hh = y1 - y0;
      const cx = e.axis === 'x' ? m : e.c, cz = e.axis === 'x' ? e.c : m;
      const sx = e.axis === 'x' ? len : WT, sz = e.axis === 'x' ? WT : len;
      addBox(parent, cx, cy, cz, sx, hh, sz, mat);
      if (solid) { const p = new THREE.Group(); p.position.set(cx, cy, cz); p.scale.set(sx, hh, sz); fixedColliders.push(p); }
    };
    for (const [s0, s1] of segs) put(s0, s1, 0, f.h, true);
    if (gap) put(gap[0], gap[1], LINTEL, f.h, false);        // lintel: visual only, it's above head height
  }
  const roof = addBox(parent, f.x, f.h - 0.1, f.z, f.w + WT, 0.2, f.d + WT, mat);
  overheadMeshes.push(roof);                                  // plan view lifts it off so you can see inside
}

function loadModel(key) {
  disposeWorld();
  modelKey = key; M = DATA.models[key];
  world = new THREE.Group(); scene.add(world);
  rects = []; passages = []; fixedColliders = []; nodes = new Map();
  labelSprites = []; overheadMeshes = []; ceilings = [];

  const addLabel = (text, pos, dim, maxDist) => {
    const s = makeLabel(text, dim); s.position.copy(pos); world.add(s);
    const rec = { sprite: s, maxDist, hidden: false, fixed: dim }; labelSprites.push(rec); return rec;
  };

  // — rooms: floor, ceiling, light strips —
  const gridCanvas = document.createElement('canvas'); gridCanvas.width = gridCanvas.height = 256;
  { const g = gridCanvas.getContext('2d'); g.fillStyle = '#5a5e66'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#4a4e56'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256); }
  const lightMat = new THREE.MeshBasicMaterial({ color: '#fffbe8' });
  const ceilMat = new THREE.MeshLambertMaterial({ color: '#3b3f47' });
  const wallMat = new THREE.MeshLambertMaterial({ color: '#8d9199' });
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

  // doors → gaps (only where two rooms meet)
  const doorIds = new Set(M.doors || []);
  const doors = (M.fixed || []).filter((f) => doorIds.has(f.id)).map((f) => ({ f, ...doorInfo(f) }));
  const gaps = doors.filter((d) => d.connects).map((d) => ({ axis: d.axis, c: d.c, lo: d.lo, hi: d.hi }));
  for (const d of doors.filter((x) => x.connects)) {
    // A passage rect lets the walker's circle cross the wall line through the gap. 0.3 ft of slack on each
    // side of the opening lets you clip a door frame slightly instead of needing a pixel-perfect line-up.
    passages.push(d.vertical
      ? { a: d.c - RADIUS, b: d.c + RADIUS, c: d.lo + 0.3, d: d.hi - 0.3 }
      : { a: d.lo + 0.3, b: d.hi - 0.3, c: d.c - RADIUS, d: d.c + RADIUS });
  }

  for (const r of M.rooms) {
    const tex = new THREE.CanvasTexture(gridCanvas); // one texture object per room (each has its own repeat)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(r.w / 4, r.d / 4);                // one cell = 4 ft, so you can eyeball distances
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), new THREE.MeshLambertMaterial({ map: tex }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(r.x0 + r.w / 2, 0, r.z0 + r.d / 2); world.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(r.x0 + r.w / 2, r.h, r.z0 + r.d / 2); world.add(ceil);
    ceilings.push(ceil);
    // light strips: a grid on big rooms, one strip on small ones
    const nx = Math.max(1, Math.round(r.w / 30)), nz = Math.max(1, Math.round(r.d / 25));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const m = addBox(world, r.x0 + r.w * (i + 0.5) / nx, r.h - 0.1, r.z0 + r.d * (j + 0.5) / nz,
        Math.min(6, r.w * 0.6), 0.15, 0.6, lightMat);
      ceilings.push(m);
    }
    addWalls(world, r, gaps, wallMat);
    rects.push({ x0: r.x0 + RADIUS, x1: r.x0 + r.w - RADIUS, z0: r.z0 + RADIUS, z1: r.z0 + r.d - RADIUS });
    bounds.minX = Math.min(bounds.minX, r.x0); bounds.maxX = Math.max(bounds.maxX, r.x0 + r.w);
    bounds.minZ = Math.min(bounds.minZ, r.z0); bounds.maxZ = Math.max(bounds.maxZ, r.z0 + r.d);
  }
  fitTopCam(bounds);

  // — fixed features —
  const hide = new Set(M.hide || []);
  const decor = M.decor || {};
  const mats = { blue: new THREE.MeshLambertMaterial({ color: '#2f6fb5' }), orange: new THREE.MeshLambertMaterial({ color: '#e8962e', transparent: true, opacity: 0.88 }) };
  const encMat = new THREE.MeshLambertMaterial({ color: '#a89f8c' });
  const enclosures = M.enclosures || {};
  const doorById = new Map(doors.map((d) => [d.f.id, d]));
  for (const f of M.fixed || []) {
    if (hide.has(f.id)) continue;                       // e.g. a "light grid" slab that would blanket the whole room
    const y = f.y || 0;
    const dInfo = doorById.get(f.id);
    const isGap = dInfo && dInfo.connects;
    const enc = enclosures[f.id];
    // collision: solid unless it's a door, or it's overhead (you walk under anything starting above 6 ft).
    // An enclosure adds its own wall colliders instead of one solid block.
    const solid = !enc && (f.collide ?? (!dInfo && y < 6));
    if (solid) {
      const proxy = new THREE.Group();
      proxy.position.set(f.x, y + f.h / 2, f.z); proxy.scale.set(f.w, f.h, f.d); proxy.rotation.y = -(f.rot || 0) * DEG;
      fixedColliders.push(proxy);
    }
    if (!isGap) {                                       // a walk-through gap draws nothing; the gap IS the door
      if (enc) buildEnclosure(world, f, enc, encMat);
      else if (decor[f.id]?.type === 'booths') buildBooths(world, f, decor[f.id], mats);
      else {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: colorFor(f) })));
        g.add(new THREE.LineSegments(unitEdges, edgeMat));
        g.position.set(f.x, y + f.h / 2, f.z); g.scale.set(f.w, f.h, f.d); g.rotation.y = -(f.rot || 0) * DEG;
        world.add(g);
        if (y >= 6) overheadMeshes.push(g);
      }
    }
    if (y < 6) {
      const rec = addLabel(f.name || f.id, new THREE.Vector3(f.x, y + f.h + 0.8, f.z), true, 14);
      // Plan view normally shows only the movable items' labels. `planLabels` opts structural blocks in
      // (e.g. classrooms that would otherwise be an unlabeled grey slab).
      if ((M.planLabels || []).includes(f.id)) rec.fixed = false;
    }
  }

  // — movable objects: one node per id across ALL layouts (union), so a model that forgets one
  //   object in a layout doesn't crash us —
  layoutKeys = Object.keys(M.layouts);
  beforeKey = M.layouts.before ? 'before' : layoutKeys[0];
  lastAfterKey = layoutKeys.find((k) => k !== beforeKey) || beforeKey;
  for (const lk of layoutKeys) for (const o of M.layouts[lk].objects) {
    if (nodes.has(o.id)) continue;
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: colorFor(o) });
    group.add(new THREE.Mesh(unitBox, mat)); group.add(new THREE.LineSegments(unitEdges, edgeMat));
    world.add(group);
    nodes.set(o.id, { group, mat, label: addLabel(o.name || o.id, new THREE.Vector3(), false, 22), cur: null, from: null, to: null, hidden: true, moved: false });
  }

  currentKey = null; tweenT = 1;
  roomIdx = 0; setRoom(0);
  setLayout(beforeKey, true);
  renderMenu();
}

// ───────────────────────── layout switching + tween ─────────────────────────
const pose = (o) => ({ x: o.x, y: o.y || 0, z: o.z, rot: o.rot || 0, w: o.w, h: o.h, d: o.d });
const TWEEN_SECONDS = 1.4;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Shortest way around the circle, so a 350°→10° rotation turns 20°, not 340°.
const angleDelta = (a, b) => ((b - a + 540) % 360) - 180;

function applyPose(node, p) {
  node.group.position.set(p.x, p.y + p.h / 2, p.z);
  node.group.scale.set(p.w, p.h, p.d);
  // `rot` is degrees CLOCKWISE as seen on the floor plan (compass-style); three.js rotates the other way.
  node.group.rotation.y = -p.rot * DEG;
  node.label.sprite.position.set(p.x, p.y + p.h + 0.9, p.z);
}

function setLayout(key, instant = false) {
  if (!M.layouts[key]) return;
  const byId = new Map(M.layouts[key].objects.map((o) => [o.id, o]));
  const before = new Map((M.layouts[beforeKey]?.objects || []).map((o) => [o.id, o]));
  for (const [id, node] of nodes) {
    const o = byId.get(id);
    if (!o) { node.hidden = true; node.group.visible = false; node.label.hidden = true; continue; }
    const to = pose(o);
    node.from = node.cur && !node.hidden ? { ...node.cur } : { ...to };   // newly-appearing objects don't fly in from nowhere
    node.to = to; node.hidden = false; node.label.hidden = false; node.group.visible = true;
    if (!node.cur) node.cur = { ...to };
    // "moved" = differs from the before layout; moved things glow amber in any non-before layout
    const b = before.get(id);
    node.moved = key !== beforeKey && (!b || Math.hypot(b.x - o.x, b.z - o.z) > 0.5 || Math.abs(angleDelta(b.rot || 0, o.rot || 0)) > 1);
    node.mat.emissive.set(node.moved ? '#6b4300' : '#000000');
  }
  currentKey = key;
  if (key !== beforeKey) lastAfterKey = key;
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

// ───────────────────────── HUD + menu ─────────────────────────
let topdown = false;
let labelsOn = true;

function refreshHud() {
  const movedCount = [...nodes.values()].filter((n) => n.moved && !n.hidden).length;
  $('hudName').textContent = `${M.label || modelKey} · ${M.layouts[currentKey].label || currentKey}`;
  $('hudHint').textContent = [M.rooms[roomIdx]?.name, topdown ? 'plan view' : '', movedCount ? `${movedCount} moved` : ''].filter(Boolean).join(' · ');
  for (const b of document.querySelectorAll('#layouts button')) b.classList.toggle('on', b.dataset.key === currentKey);
  for (const b of document.querySelectorAll('#models button')) b.classList.toggle('on', b.dataset.key === modelKey);
  for (const b of document.querySelectorAll('#rooms button')) b.classList.toggle('on', +b.dataset.i === roomIdx);
  $('cross').style.display = topdown ? 'none' : '';
}

function renderMenu() {
  const fill = (id, items, onClick, datasetKey) => {
    const el = $(id); el.textContent = '';
    items.forEach(([key, text]) => {
      const b = document.createElement('button'); b.textContent = text; b.dataset[datasetKey] = key;
      b.addEventListener('click', () => onClick(key)); el.appendChild(b);
    });
    el.style.display = items.length > 1 ? '' : 'none';
  };
  fill('models', MODEL_KEYS.map((k) => [k, DATA.models[k].label || k]), (k) => loadModel(k), 'key');
  fill('layouts', layoutKeys.map((k, i) => [k, `${i + 1} · ${M.layouts[k].label || k}`]), (k) => setLayout(k), 'key');
  fill('rooms', M.rooms.map((r, i) => [i, r.name || r.id]), (i) => setRoom(+i), 'i');
  // Per-model caveats (what the model guessed, what we added). Shown in the menu so nobody has to ask.
  $('note').textContent = M.note || ''; $('note').style.display = M.note ? '' : 'none';
  refreshHud();
}

// ───────────────────────── movement helpers ─────────────────────────
const pos = { x: 0, z: 0 };
function setRoom(i) {
  roomIdx = ((i % M.rooms.length) + M.rooms.length) % M.rooms.length;
  const r = M.rooms[roomIdx];
  const s = r.spawn || { x: r.x0 + r.w / 2, z: r.z0 + r.d / 2, yaw: 0 };
  pos.x = s.x; pos.z = s.z;
  camera.position.set(pos.x, EYE, pos.z);
  camera.rotation.y = -(s.yaw || 0) * DEG;     // yaw 0 faces -z ("up" the plan), 90 faces +x
  camera.rotation.x = 0;
  if (currentKey) refreshHud(); // during initial load no layout is chosen yet; setLayout refreshes the HUD itself
}

// ───────────────────────── input ─────────────────────────
const controls = new PointerLockControls(camera, renderer.domElement);
const pause = $('pause');
controls.addEventListener('lock', () => { pause.style.display = 'none'; });
controls.addEventListener('unlock', () => { pause.style.display = 'flex'; });
document.addEventListener('pointerlockerror', () => { $('err').textContent = 'The browser refused mouse capture. Click the button again.'; });

// Phones/tablets report a coarse primary pointer. They have no pointer lock and no keyboard, so
// "playing" is just a flag there, and walking/looking come from the touch layer below.
const touchMode = window.matchMedia('(pointer: coarse)').matches;
let touchPlaying = false;
const isPlaying = () => (touchMode ? touchPlaying : controls.isLocked);

const start = () => {
  if (touchMode) { touchPlaying = true; pause.style.display = 'none'; return; }
  try { controls.lock(); } catch (e) { $('err').textContent = String(e); }
};
$('go').addEventListener('click', start);
pause.addEventListener('click', (e) => { if (e.target === pause) start(); });

// The same actions are reachable from keys AND touch buttons, so they live in one place.
const toggleBeforeAfter = () => setLayout(currentKey === beforeKey ? lastAfterKey : beforeKey);
const nextLayout = () => setLayout(layoutKeys[(layoutKeys.indexOf(currentKey) + 1) % layoutKeys.length]);
const nextModel = () => loadModel(MODEL_KEYS[(MODEL_KEYS.indexOf(modelKey) + 1) % MODEL_KEYS.length]);
const nextRoom = () => setRoom(roomIdx + 1);
const toggleTopdown = () => { topdown = !topdown; refreshHud(); };
const toggleLabels = () => { labelsOn = !labelsOn; };

const held = new Set();
addEventListener('keydown', (e) => {
  held.add(e.code);
  if (e.repeat) return;
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit && layoutKeys[digit[1] - 1]) setLayout(layoutKeys[digit[1] - 1]);
  else if (e.code === 'KeyB') toggleBeforeAfter();
  else if (e.code === 'KeyN') nextModel();
  else if (e.code === 'KeyR') nextRoom();
  else if (e.code === 'KeyT') toggleTopdown();
  else if (e.code === 'KeyL') toggleLabels();
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear()); // alt-tab mid-stride shouldn't leave you sprinting forever

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (M) loadBoundsFit();
});
function loadBoundsFit() {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const r of M.rooms) { b.minX = Math.min(b.minX, r.x0); b.maxX = Math.max(b.maxX, r.x0 + r.w); b.minZ = Math.min(b.minZ, r.z0); b.maxZ = Math.max(b.maxZ, r.z0 + r.d); }
  fitTopCam(b);
}

// ───────────────────────── touch layer ─────────────────────────
// Left-bottom: a floating stick that appears under the thumb (so no one has to find a fixed control).
// Anywhere else: drag to look. Pointer events + capture keep a drag alive even if the finger slides over
// a button, and each gesture tracks its own pointerId so two thumbs work at once.
const stick = { f: 0, r: 0 }; // analog walk input, -1..1
if (touchMode) {
  document.body.classList.add('touch');
  $('howto').innerHTML = 'Hold your <b>left thumb</b> on the lower left to walk. <b>Drag</b> anywhere else to look around. ' +
    'Landscape works best. Use <b>Before / After</b> to flip layouts.';
  $('howtoSmall').textContent = 'The Menu button brings this card back.';

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
  const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; stick.f = stick.r = 0; base.style.display = 'none'; };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);

  const look = $('look');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => { if (lookId !== null) return; lookId = e.pointerId; look.setPointerCapture(lookId); lx = e.clientX; ly = e.clientY; });
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
  $('tN').addEventListener('click', nextLayout);
  $('tModel').addEventListener('click', nextModel);
  $('tRoom').addEventListener('click', nextRoom);
  $('tT').addEventListener('click', toggleTopdown);
  $('tL').addEventListener('click', toggleLabels);
  $('tM').addEventListener('click', () => { touchPlaying = false; stick.f = stick.r = 0; pause.style.display = 'flex'; });
  if (MODEL_KEYS.length < 2) $('tModel').style.display = 'none';
}

// ───────────────────────── collision ─────────────────────────
// Player = circle on the floor; every blocker = rotated rectangle. Push the circle out of whichever
// rectangles it overlaps. Works on the live (mid-tween) pose, so a bench sliding into you shoves you
// aside instead of swallowing the camera.
function pushOut(group, p) {
  const hw = group.scale.x / 2, hd = group.scale.z / 2;
  const th = group.rotation.y, c = Math.cos(th), s = Math.sin(th);
  const dx = p.x - group.position.x, dz = p.z - group.position.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c; // world → box-local
  const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
  const nx = lx - cx, nz = lz - cz;
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

// Walkable = inside some room (shrunk by the player radius) or inside a door passage between rooms.
function walkable(x, z) {
  for (const r of rects) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
  for (const q of passages) if (x >= q.a && x <= q.b && z >= q.c && z <= q.d) return true;
  return false;
}

function resolve(prev, next) {
  const p = { x: next.x, z: next.z };
  for (const g of fixedColliders) pushOut(g, p);
  for (const node of nodes.values()) {
    // Anything whose underside is above head height (6 ft) is something you walk under.
    if (node.hidden || !node.cur || node.cur.y >= 6) continue;
    pushOut(node.group, p);
  }
  if (walkable(p.x, p.z)) return p;
  // Slide along walls: keep whichever axis is still legal instead of stopping dead.
  if (walkable(p.x, prev.z)) return { x: p.x, z: prev.z };
  if (walkable(prev.x, p.z)) return { x: prev.x, z: p.z };
  return { x: prev.x, z: prev.z };
}

// ───────────────────────── main loop ─────────────────────────
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();

function update(dt) {
  stepTween(dt);

  let next = { x: pos.x, z: pos.z };
  if (isPlaying() && !topdown) {
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight') ? 12 : 6) * dt; // ft/s
    // Keyboard gives -1/0/1; the touch stick adds analog values on top of it.
    let f = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) + stick.f;
    let r = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) + stick.r;
    const len = Math.hypot(f, r);
    if (len > 0.05) {
      if (len > 1) { f /= len; r /= len; } // cap at 1 so diagonals aren't faster; analog <1 = slower walk
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      next = { x: pos.x + (fwd.x * f - fwd.z * r) * speed, z: pos.z + (fwd.z * f + fwd.x * r) * speed };
    }
  }
  const p = resolve(pos, next); // runs even while standing still, so morphing furniture can nudge you
  pos.x = p.x; pos.z = p.z;
  camera.position.set(pos.x, EYE, pos.z);

  const active = topdown ? topCam : camera;
  for (const c of ceilings) c.visible = !topdown;
  for (const m of overheadMeshes) m.visible = !topdown;
  for (const L of labelSprites) {
    const s = L.sprite, d = s.position.distanceTo(camera.position);
    // Plan view: only movable items get labels (the walls/doors/panels are already visible as shapes, and
    // ~25 fixed labels buried the map), and at 2x size because a 100 ft room on a phone is ~10 px per foot.
    s.visible = labelsOn && !L.hidden && (topdown ? !L.fixed : d < L.maxDist);
    // Sprites are sized in world feet, so up close they balloon over half the screen. Shrink them as you
    // approach (floor at 40%) so they stay readable but never dominate.
    const k = topdown ? 2 : Math.max(0.4, Math.min(1, d / 14));
    s.scale.set(4.2 * k, 0.79 * k, 1);
  }
  return active;
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  renderer.render(scene, update(dt));
  requestAnimationFrame(frame);
}

loadModel(MODEL_KEYS[0]);
window.__shopReady = true;
// Debug/test handle — also lets you poke at it from the console during rehearsal.
window.__shop = {
  camera, pos, controls,
  setLayout, loadModel, setRoom, setTopdown: (v) => { topdown = v; refreshHud(); },
  get currentKey() { return currentKey; }, get modelKey() { return modelKey; }, get nodes() { return nodes; },
  get passages() { return passages; }, get rects() { return rects; },
};
frame();
