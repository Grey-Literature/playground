/*
 * layouts.js — the ONLY file that changes when a new model's layout arrives.
 *
 * Why a classic <script> (not a module): it just sets window.SHOP_DATA, so pasting a new
 * model in never touches viewer logic.
 *
 * One entry per model under SHOP_DATA.models. Each is that model's JSON VERBATIM ("fixed" and
 * "layouts") plus a thin wrapper we author:
 *   label   name shown in the HUD/menu
 *   frame   the model's own note on its coordinate frame (kept for reference; not used by the viewer)
 *   rooms   rectangles the viewer draws and lets you walk in, in THAT model's coordinates.
 *           {id,name,x0,z0,w,d,h,spawn:{x,z,yaw}} — yaw 0 faces -z (up the plan), 90 faces +x.
 *   doors   ids from "fixed" that are doors. A door joining two rooms becomes a walk-through gap;
 *           a door to the outside is drawn as a colored panel in the wall.
 *   hide    ids from "fixed" not to draw (e.g. a room-sized "light grid" slab).
 *   decor   optional: draw a fixed block as N booths instead of one slab.
 * Models are shown as they described the shop — never merged or normalized — so each has its own
 * "before" (its reading of the photos) and "after".
 *
 * COORDINATES (feet): x/z are an object's CENTER on the floor plan; w runs along x and d along z
 * before rotation; h is height; y is the bottom edge off the floor (0 unless wall-mounted);
 * rot is degrees CLOCKWISE seen from above. Every layout in a model lists the same ids.
 */
window.SHOP_DATA = {
  models: {
    opus: {
     "label": "Claude Opus",
     "frame": "Main floor: x=0 is the west end wall (front door; office/bulletin end seen at far end of 9875/9879), x runs east 0->100 along the booth rows. z=0 is the north long wall (main panels, lockers, grinders, ducting: 9883/9886/9888), z runs south 0->50 to the wall with the EXIT (9894) and roll-up door (9896). Rows A and B are assumed to open onto the center aisle (z16-34). Tool room is modeled as an annex west of the main floor: x -14..0, z 0..10, side box x -7.5..0, z 10..20, door at x=0 z=5. Based on the two collages only; wall assignments and sizes are estimates. Yard not covered.",
     "rooms": [
      {
       "id": "main",
       "name": "Main floor",
       "x0": 0,
       "z0": 0,
       "w": 100,
       "d": 50,
       "h": 16,
       "spawn": {
        "x": 4,
        "z": 25,
        "yaw": 90
       }
      },
      {
       "id": "toolroom",
       "name": "Tool room",
       "x0": -14,
       "z0": 0,
       "w": 14,
       "d": 10,
       "h": 9,
       "spawn": {
        "x": -2.5,
        "z": 5,
        "yaw": -90
       }
      },
      {
       "id": "sidebox",
       "name": "Side box",
       "x0": -7.5,
       "z0": 10,
       "w": 7.5,
       "d": 10,
       "h": 9,
       "spawn": {
        "x": -3.75,
        "z": 15,
        "yaw": 180
       }
      }
     ],
     "doors": [
      "front-door",
      "side-door",
      "exit-door",
      "rollup-door",
      "toolroom-door",
      "sidebox-door"
     ],
     "hide": [
      "lighting"
     ],
     "decor": {
      "booth-row-a": {
       "type": "booths",
       "count": 16,
       "open": "+z"
      },
      "booth-row-b": {
       "type": "booths",
       "count": 16,
       "open": "-z"
      },
      "booth-row-c": {
       "type": "booths",
       "count": 3,
       "open": "-x"
      }
     },
     "fixed": [
      {
       "id": "booth-row-a",
       "name": "Booth row A (16 booths, blue steel, curtains)",
       "x": 48,
       "z": 12,
       "w": 72,
       "d": 8,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "booth-row-b",
       "name": "Booth row B (16 booths)",
       "x": 48,
       "z": 38,
       "w": 72,
       "d": 8,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "booth-row-c",
       "name": "Booth row C (3 booths, 9898)",
       "x": 97,
       "z": 25.5,
       "w": 6,
       "d": 15,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "gas-air-drops-a",
       "name": "Overhead gas/air lines row A",
       "x": 48,
       "z": 12,
       "w": 72,
       "d": 1,
       "h": 0.5,
       "y": 9,
       "rot": 0,
       "est": true
      },
      {
       "id": "gas-air-drops-b",
       "name": "Overhead gas/air lines row B",
       "x": 48,
       "z": 38,
       "w": 72,
       "d": 1,
       "h": 0.5,
       "y": 9,
       "rot": 0,
       "est": true
      },
      {
       "id": "exhaust-duct",
       "name": "Overhead duct along north wall",
       "x": 50,
       "z": 3,
       "w": 100,
       "d": 3,
       "h": 2,
       "y": 12,
       "rot": 0,
       "est": true
      },
      {
       "id": "lighting",
       "name": "Overhead light grid",
       "x": 50,
       "z": 25,
       "w": 100,
       "d": 50,
       "h": 0.5,
       "y": 14,
       "rot": 0,
       "est": true
      },
      {
       "id": "hose-reel",
       "name": "Red hose reel on row A frame (9875)",
       "x": 12.5,
       "z": 16.5,
       "w": 1.5,
       "d": 1,
       "h": 2,
       "y": 7.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "electrical-panels",
       "name": "Main panel bank (9883)",
       "x": 76,
       "z": 0.75,
       "w": 12,
       "d": 1.5,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "sub-panel",
       "name": "Wall sub-panel (9886)",
       "x": 26,
       "z": 0.4,
       "w": 2.5,
       "d": 0.8,
       "h": 3,
       "y": 3,
       "rot": 0,
       "est": true
      },
      {
       "id": "ext-panels",
       "name": "Extinguisher by panels",
       "x": 68,
       "z": 0.3,
       "w": 0.8,
       "d": 0.6,
       "h": 2,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "ext-wall",
       "name": "Extinguisher by cabinet (9886)",
       "x": 32.5,
       "z": 0.3,
       "w": 0.8,
       "d": 0.6,
       "h": 2,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "ext-door",
       "name": "Extinguisher by side door (9888)",
       "x": 36.5,
       "z": 0.3,
       "w": 0.8,
       "d": 0.6,
       "h": 2,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "ext-exit",
       "name": "Extinguisher near EXIT",
       "x": 10,
       "z": 49.7,
       "w": 0.8,
       "d": 0.6,
       "h": 2,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "ext-rollup",
       "name": "Floor extinguisher by roll-up (9896)",
       "x": 86,
       "z": 49.7,
       "w": 0.8,
       "d": 0.6,
       "h": 2.5,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "front-door",
       "name": "Front personnel door",
       "x": 0,
       "z": 25,
       "w": 0.5,
       "d": 3,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "side-door",
       "name": "Side man door (9888)",
       "x": 40,
       "z": 0.25,
       "w": 3,
       "d": 0.5,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "exit-door",
       "name": "EXIT door (9894)",
       "x": 6,
       "z": 49.75,
       "w": 3,
       "d": 0.5,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "rollup-door",
       "name": "Roll-up door (9896)",
       "x": 94,
       "z": 49.75,
       "w": 12,
       "d": 0.5,
       "h": 12,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "drill-press",
       "name": "Floor drill press (likely anchored, 9894)",
       "x": 14,
       "z": 48,
       "w": 2,
       "d": 2,
       "h": 5.5,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "broom-rack",
       "name": "Wall broom rack (9894)",
       "x": 19,
       "z": 49.5,
       "w": 6,
       "d": 1,
       "h": 6,
       "y": 0.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "toolroom-door",
       "name": "Tool room door",
       "x": 0,
       "z": 5,
       "w": 0.5,
       "d": 3,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "sidebox-door",
       "name": "Side box opening",
       "x": -3.75,
       "z": 10,
       "w": 3,
       "d": 0.5,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "hose-hooks",
       "name": "Wall hose hangers (9906)",
       "x": -1.5,
       "z": 0.4,
       "w": 3,
       "d": 0.8,
       "h": 3,
       "y": 3,
       "rot": 0,
       "est": true
      }
     ],
     "layouts": {
      "before": {
       "objects": [
        {
         "id": "steel-bench",
         "name": "Steel work table (9879)",
         "x": 48,
         "z": 27,
         "w": 6,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "work-table-2",
         "name": "Small steel table",
         "x": 70,
         "z": 28,
         "w": 5,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "fixture-table",
         "name": "Heavy fixturing table (9875)",
         "x": 16,
         "z": 25,
         "w": 4,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spool-rack",
         "name": "Rolling wire-spool rack (9879)",
         "x": 40,
         "z": 22,
         "w": 6,
         "d": 3,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-1",
         "name": "Oxy-fuel cylinder cart",
         "x": 22,
         "z": 24,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-2",
         "name": "Oxy-fuel cylinder cart",
         "x": 27,
         "z": 26,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-3",
         "name": "Oxy-fuel cylinder cart",
         "x": 60,
         "z": 24,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "portable-welder-1",
         "name": "Portable welder (9879)",
         "x": 34,
         "z": 19,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "portable-welder-2",
         "name": "Portable welder (9894)",
         "x": 13,
         "z": 44,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-chests",
         "name": "Rolling modular tool chests (9883)",
         "x": 78,
         "z": 5,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "cubby-rack",
         "name": "Cubby/bag shelving (9883)",
         "x": 88,
         "z": 1,
         "w": 8,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "bin-shelf",
         "name": "Parts shelf (9888)",
         "x": 65,
         "z": 1,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "lockers",
         "name": "Blue lockers (9888)",
         "x": 47,
         "z": 0.75,
         "w": 6,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "rusty-cabinet",
         "name": "Mesh-door cabinet (9886)",
         "x": 30,
         "z": 1,
         "w": 3,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "caged-cabinet",
         "name": "Caged grinder cabinet (9888)",
         "x": 61.5,
         "z": 1.5,
         "w": 3,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-1",
         "name": "Pedestal grinder",
         "x": 52,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-2",
         "name": "Pedestal grinder",
         "x": 55,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-3",
         "name": "Grinder on red stand",
         "x": 58,
         "z": 3.5,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-4",
         "name": "Pedestal grinder (9886)",
         "x": 30,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-1",
         "name": "Drum fan",
         "x": 49,
         "z": 4.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-2",
         "name": "Drum fan at panels (9883)",
         "x": 73,
         "z": 2.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-3",
         "name": "Drum fan (9886)",
         "x": 33,
         "z": 5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "orange-drum-fan",
         "name": "Orange drum fan (9894)",
         "x": 7,
         "z": 47,
         "w": 3,
         "d": 1.5,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-fan-1",
         "name": "Pedestal fan (9888)",
         "x": 46,
         "z": 4,
         "w": 2.5,
         "d": 2.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-fan-2",
         "name": "Pedestal fan (9886)",
         "x": 24,
         "z": 4,
         "w": 2.5,
         "d": 2.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "air-mover",
         "name": "Blue air mover (9886)",
         "x": 27,
         "z": 6,
         "w": 1.5,
         "d": 1.5,
         "h": 1.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-1",
         "name": "Scrap/coupon cart",
         "x": 64,
         "z": 5,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-2",
         "name": "Scrap/coupon cart",
         "x": 20,
         "z": 4,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "hydration-table",
         "name": "Water cooler table (9879)",
         "x": 6,
         "z": 40,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "workbench-vise",
         "name": "Long fab bench w/ vise (9896)",
         "x": 90,
         "z": 44,
         "w": 10,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pipe-stand",
         "name": "Tripod pipe stand (9896)",
         "x": 86.5,
         "z": 40,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf",
         "name": "Power tool/stock shelving (9898)",
         "x": 98.5,
         "z": 8,
         "w": 3,
         "d": 12,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "parts-bin-shelf",
         "name": "Blue parts-bin shelving (9906)",
         "x": -10,
         "z": 1,
         "w": 6,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "regulator-shelf",
         "name": "Steel shelving: regulators, plasma (9912)",
         "x": -13,
         "z": 6,
         "w": 2,
         "d": 6,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "small-bench",
         "name": "Tool room bench",
         "x": -9,
         "z": 8.5,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-boxes",
         "name": "Floor boxes and cords (9912)",
         "x": -6,
         "z": 5,
         "w": 3,
         "d": 2,
         "h": 1.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "side-box-shelf",
         "name": "Side box overflow shelving",
         "x": -3.75,
         "z": 15,
         "w": 2,
         "d": 8,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        }
       ],
       "label": "Before (current shop)"
      },
      "after": {
       "objects": [
        {
         "id": "steel-bench",
         "name": "Steel work table (instructor station)",
         "x": 9,
         "z": 25,
         "w": 6,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "work-table-2",
         "name": "Small steel table (consumables)",
         "x": 32,
         "z": 25,
         "w": 5,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "fixture-table",
         "name": "Heavy fixturing table",
         "x": 52,
         "z": 25,
         "w": 4,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spool-rack",
         "name": "Rolling wire-spool rack",
         "x": 6,
         "z": 19,
         "w": 6,
         "d": 3,
         "h": 6,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "gas-cart-1",
         "name": "Oxy-fuel cylinder cart",
         "x": 2,
         "z": 34,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-2",
         "name": "Oxy-fuel cylinder cart",
         "x": 2,
         "z": 37,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-3",
         "name": "Oxy-fuel cylinder cart",
         "x": 2,
         "z": 40,
         "w": 2.5,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "portable-welder-1",
         "name": "Portable welder",
         "x": 64,
         "z": 25,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "portable-welder-2",
         "name": "Portable welder",
         "x": 68,
         "z": 25,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-chests",
         "name": "Rolling modular tool chests",
         "x": 89,
         "z": 25,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "cubby-rack",
         "name": "Cubby/bag shelving",
         "x": 56,
         "z": 1,
         "w": 8,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "bin-shelf",
         "name": "Parts shelf",
         "x": 65,
         "z": 1,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "lockers",
         "name": "Blue lockers",
         "x": 47,
         "z": 0.75,
         "w": 6,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "rusty-cabinet",
         "name": "Mesh-door cabinet",
         "x": 30,
         "z": 1,
         "w": 3,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "caged-cabinet",
         "name": "Caged grinder cabinet (spark barrier to row C)",
         "x": 98.5,
         "z": 16,
         "w": 3,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-1",
         "name": "Pedestal grinder",
         "x": 98.5,
         "z": 4,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-2",
         "name": "Pedestal grinder",
         "x": 98.5,
         "z": 7,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-3",
         "name": "Grinder on red stand",
         "x": 98.5,
         "z": 10,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-4",
         "name": "Pedestal grinder",
         "x": 98.5,
         "z": 13,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-1",
         "name": "Drum fan",
         "x": 17,
         "z": 1,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-2",
         "name": "Drum fan",
         "x": 40,
         "z": 49,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drum-fan-3",
         "name": "Drum fan",
         "x": 44,
         "z": 49,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "orange-drum-fan",
         "name": "Orange drum fan",
         "x": 48,
         "z": 49,
         "w": 3,
         "d": 1.5,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-fan-1",
         "name": "Pedestal fan",
         "x": 21,
         "z": 1.5,
         "w": 2.5,
         "d": 2.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-fan-2",
         "name": "Pedestal fan",
         "x": 34.5,
         "z": 1.5,
         "w": 2.5,
         "d": 2.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "air-mover",
         "name": "Blue air mover",
         "x": 52,
         "z": 49,
         "w": 1.5,
         "d": 1.5,
         "h": 1.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-1",
         "name": "Scrap/coupon cart",
         "x": 26,
         "z": 48.5,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-2",
         "name": "Scrap/coupon cart",
         "x": 30,
         "z": 48.5,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "hydration-table",
         "name": "Water cooler table",
         "x": 2,
         "z": 12,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "workbench-vise",
         "name": "Long fab bench w/ vise",
         "x": 89,
         "z": 12,
         "w": 10,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pipe-stand",
         "name": "Tripod pipe stand",
         "x": 85.5,
         "z": 16,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf",
         "name": "Power tool/stock shelving",
         "x": 89,
         "z": 1.5,
         "w": 3,
         "d": 12,
         "h": 6,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "parts-bin-shelf",
         "name": "Blue parts-bin shelving",
         "x": -10,
         "z": 1,
         "w": 6,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "regulator-shelf",
         "name": "Steel shelving: regulators, plasma",
         "x": -13,
         "z": 6,
         "w": 2,
         "d": 6,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "small-bench",
         "name": "Tool room bench",
         "x": -9,
         "z": 8.5,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-boxes",
         "name": "Boxed stock (now in side box)",
         "x": -1.5,
         "z": 15,
         "w": 3,
         "d": 2,
         "h": 1.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "side-box-shelf",
         "name": "Side box shelving",
         "x": -6.5,
         "z": 15,
         "w": 2,
         "d": 8,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        }
       ],
       "label": "After (Claude Opus)"
      }
     }
    }
  },
};
