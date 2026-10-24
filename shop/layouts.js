/*
 * layouts.js — the ONLY file you edit to swap in real shop data.
 *
 * Why a classic <script> (not a module): it just sets window.SHOP_DATA, so
 * pasting new JSON here never touches viewer logic, and it loads without
 * CORS fuss if the folder is ever served locally.
 *
 * UNITS + COORDINATES (feet, because that's how people measure a shop)
 *   Origin (0,0) = the room's top-left corner on the floor plan.
 *   x runs left→right along room.width, z runs top→bottom along room.depth.
 *   y is up. Every object's x/z is its CENTER; y is the height of its BOTTOM
 *   edge off the floor (0 = on the floor; 3 = a wall-mounted shelf at 3 ft).
 *   rot is degrees CLOCKWISE as seen on the floor plan (0 = width runs along x,
 *   90 = width runs along z, i.e. top-to-bottom on the plan).
 *
 * RULES THAT MAKE THE BEFORE/AFTER MORPH WORK
 *   1. Every layout lists the SAME object ids. Layouts only move things.
 *      The viewer tweens each id from its old pose to its new one.
 *   2. "before" is required — it's the current messy shop, loaded first.
 *   3. Layout keys become buttons and number keys (1, 2, 3…) in file order.
 *
 * PLACEHOLDER: everything below is a made-up 32×24 ft shop so the viewer can
 * be built and tested before David's photos exist. Replace room, fixed and
 * layouts with the real thing.
 */
window.SHOP_DATA = {
  room: {
    width: 32,          // ft, x axis
    depth: 24,          // ft, z axis
    height: 11,         // ft, ceiling
    spawn: { x: 16, z: 21.5, yaw: 0 }, // where you start (yaw 0 = facing -z, "up" the plan)
  },

  // Things that never move: doors, windows, columns, panel boxes, drains.
  // collide:false for flat things you walk "through" (doors are just painted on the wall).
  fixed: [
    { id: 'door-front', name: 'Front door',      x: 16,   z: 23.9, w: 4,   d: 0.2, h: 7,   y: 0,   color: '#6b4a2f', collide: false },
    { id: 'door-roll',  name: 'Roll-up door',    x: 31.9, z: 12,   w: 0.2, d: 10,  h: 9,   y: 0,   color: '#8a8f94', collide: false },
    { id: 'window-n',   name: 'Window',          x: 8,    z: 0.1,  w: 6,   d: 0.2, h: 3,   y: 4,   color: '#7fb6d9', collide: false },
    { id: 'panel',      name: 'Electrical panel',x: 0.4,  z: 6,    w: 0.8, d: 2,   h: 4,   y: 3,   color: '#a33',    collide: true  },
    { id: 'column',     name: 'Support column',  x: 16,   z: 12,   w: 1,   d: 1,   h: 11,  y: 0,   color: '#777',    collide: true  },
  ],

  layouts: {
    before: {
      label: 'Before (current shop)',
      objects: [
        { id: 'bench-a',  name: 'Workbench A',      x: 6,    z: 8,    w: 8,   d: 3,   h: 3,   rot: 20,  color: '#a0743c' },
        { id: 'bench-b',  name: 'Workbench B',      x: 25,   z: 15,   w: 8,   d: 3,   h: 3,   rot: 70,  color: '#a0743c' },
        { id: 'weld',     name: 'Welding table',    x: 22,   z: 5,    w: 5,   d: 4,   h: 3,   rot: 0,   color: '#c7502e' },
        { id: 'chest',    name: 'Tool chest',       x: 4,    z: 19,   w: 2.5, d: 1.8, h: 4,   rot: 35,  color: '#b22' },
        { id: 'shelf-a',  name: 'Parts shelving',   x: 12,   z: 17,   w: 6,   d: 1.5, h: 6.5, rot: 90,  color: '#4d6b8a' },
        { id: 'shelf-b',  name: 'Stock racks',      x: 28,   z: 3,    w: 6,   d: 2,   h: 7,   rot: 10,  color: '#4d6b8a' },
        { id: 'drill',    name: 'Drill press',      x: 18,   z: 18,   w: 2,   d: 2,   h: 5.5, rot: 0,   color: '#3d8a5a' },
        { id: 'bandsaw',  name: 'Band saw',         x: 9,    z: 13,   w: 2.5, d: 2.5, h: 5.5, rot: 45,  color: '#3d8a5a' },
        { id: 'cart',     name: 'Material cart',    x: 20,   z: 11,   w: 4,   d: 2,   h: 3,   rot: 60,  color: '#888' },
        { id: 'compress', name: 'Air compressor',   x: 14,   z: 3,    w: 2.5, d: 2.5, h: 4,   rot: 15,  color: '#d6a31f' },
      ],
    },

    // Two placeholder "afters" so the toggle has something to swap between.
    // Real ones: one per model (GPT / Gemini / Arena…), ids identical to "before".
    layoutA: {
      label: 'Layout A (placeholder)',
      objects: [
        { id: 'bench-a',  name: 'Workbench A',      x: 8,    z: 1.8,  w: 8,   d: 3,   h: 3,   rot: 0,   color: '#a0743c' },
        { id: 'bench-b',  name: 'Workbench B',      x: 17,   z: 1.8,  w: 8,   d: 3,   h: 3,   rot: 0,   color: '#a0743c' },
        { id: 'weld',     name: 'Welding table',    x: 27,   z: 18,   w: 5,   d: 4,   h: 3,   rot: 0,   color: '#c7502e' },
        { id: 'chest',    name: 'Tool chest',       x: 3,    z: 4.5,  w: 2.5, d: 1.8, h: 4,   rot: 90,  color: '#b22' },
        { id: 'shelf-a',  name: 'Parts shelving',   x: 1.2,  z: 14,   w: 8,   d: 1.5, h: 6.5, rot: 90,  color: '#4d6b8a' },
        { id: 'shelf-b',  name: 'Stock racks',      x: 12,   z: 22.8, w: 8,   d: 2,   h: 7,   rot: 0,   color: '#4d6b8a' },
        { id: 'drill',    name: 'Drill press',      x: 23,   z: 2,    w: 2,   d: 2,   h: 5.5, rot: 0,   color: '#3d8a5a' },
        { id: 'bandsaw',  name: 'Band saw',         x: 27,   z: 2,    w: 2.5, d: 2.5, h: 5.5, rot: 0,   color: '#3d8a5a' },
        { id: 'cart',     name: 'Material cart',    x: 22,   z: 12,   w: 4,   d: 2,   h: 3,   rot: 0,   color: '#888' },
        { id: 'compress', name: 'Air compressor',   x: 30.2, z: 22,   w: 2.5, d: 2.5, h: 4,   rot: 0,   color: '#d6a31f' },
      ],
    },

    layoutB: {
      label: 'Layout B (placeholder)',
      objects: [
        { id: 'bench-a',  name: 'Workbench A',      x: 6,    z: 6,    w: 8,   d: 3,   h: 3,   rot: 90,  color: '#a0743c' },
        { id: 'bench-b',  name: 'Workbench B',      x: 6,    z: 17,   w: 8,   d: 3,   h: 3,   rot: 90,  color: '#a0743c' },
        { id: 'weld',     name: 'Welding table',    x: 26,   z: 5,    w: 5,   d: 4,   h: 3,   rot: 0,   color: '#c7502e' },
        { id: 'chest',    name: 'Tool chest',       x: 9.5,  z: 11.5, w: 2.5, d: 1.8, h: 4,   rot: 0,   color: '#b22' },
        { id: 'shelf-a',  name: 'Parts shelving',   x: 16,   z: 1.2,  w: 8,   d: 1.5, h: 6.5, rot: 0,   color: '#4d6b8a' },
        { id: 'shelf-b',  name: 'Stock racks',      x: 22,   z: 22.8, w: 8,   d: 2,   h: 7,   rot: 0,   color: '#4d6b8a' },
        { id: 'drill',    name: 'Drill press',      x: 19,   z: 8,    w: 2,   d: 2,   h: 5.5, rot: 0,   color: '#3d8a5a' },
        { id: 'bandsaw',  name: 'Band saw',         x: 19,   z: 16,   w: 2.5, d: 2.5, h: 5.5, rot: 0,   color: '#3d8a5a' },
        { id: 'cart',     name: 'Material cart',    x: 27,   z: 13,   w: 4,   d: 2,   h: 3,   rot: 0,   color: '#888' },
        { id: 'compress', name: 'Air compressor',   x: 30.2, z: 2,    w: 2.5, d: 2.5, h: 4,   rot: 0,   color: '#d6a31f' },
      ],
    },
  },
};
