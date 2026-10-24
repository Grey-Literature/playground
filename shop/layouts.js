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
 *   enclosures  optional: draw a fixed block as hollow walls with a doorway (a room the model put
 *           INSIDE the main floor). {id:{door:{side:'n|s|e|w', w:ft, at:ftOffFromMiddle}}}, rot 0 only.
 *   note    optional: caveat text shown in the menu (what the model guessed, what we added).
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
     "note": "Opus worked from two photo collages only. The shell, doors, panel wall, tool-room annex and every size are estimates. Yard not covered.",
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
    },
    gemini: {
     "label": "Gemini",
     "frame": "Origin (0,0) is the North-West corner of the 100x50 ft main shop floor. x runs East from 0 to 100 ft along the long axis; z runs South from 0 to 50 ft along the short axis (y is height off the floor). The North wall (z=0) contains the electrical panels, tool room enclosure, and student storage alcove; the South wall (z=50) contains the roll-up bay doors.",
     "note": "Gemini put the tool room and side box inside the main floor, along the north wall, and gave them no doors. The doorway on the shop-facing side of each is added by Claude so you can walk in. All positions are Gemini's estimates from photos.",
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
        "x": 6,
        "z": 25,
        "yaw": 90
       }
      }
     ],
     "doors": [
      "exit-door-north",
      "rollup-door-1",
      "rollup-door-2"
     ],
     "hide": [],
     "decor": {
      "booth-row-north": {
       "type": "booths",
       "count": 12,
       "open": "+z"
      },
      "booth-row-south": {
       "type": "booths",
       "count": 12,
       "open": "-z"
      },
      "booth-row-east": {
       "type": "booths",
       "count": 3,
       "open": "+z"
      }
     },
     "enclosures": {
      "tool-room-main": {
       "door": {
        "side": "s",
        "w": 3.5,
        "at": 0
       }
      },
      "tool-room-sidebox": {
       "door": {
        "side": "s",
        "w": 3.5,
        "at": 0
       }
      }
     },
     "fixed": [
      {
       "id": "booth-row-north",
       "name": "North fixed row of 12 welding booths (blue steel frames, orange curtains, plumbed gas/power, Miller welders)",
       "x": 55.0,
       "z": 17.5,
       "w": 60.0,
       "d": 5.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "booth-row-south",
       "name": "South fixed row of 12 welding booths (blue steel frames, orange curtains, plumbed gas/power, Miller welders)",
       "x": 55.0,
       "z": 32.5,
       "w": 60.0,
       "d": 5.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "booth-row-east",
       "name": "Auxiliary 3-booth training bank (#9898)",
       "x": 12.0,
       "z": 17.5,
       "w": 15.0,
       "d": 5.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-room-main",
       "name": "Main enclosed tool room (14x10 ft)",
       "x": 45.0,
       "z": 5.0,
       "w": 14.0,
       "d": 10.0,
       "h": 9.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-room-sidebox",
       "name": "Tool room side box enclosure (7.5x10 ft)",
       "x": 55.75,
       "z": 5.0,
       "w": 7.5,
       "d": 10.0,
       "h": 9.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-shelf-north",
       "name": "Tool room built-in shelving & parts bins (North wall #9906/#9912)",
       "x": 45.0,
       "z": 1.0,
       "w": 12.0,
       "d": 2.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-shelf-west",
       "name": "Tool room built-in blue parts bin rack (West wall #9906)",
       "x": 39.0,
       "z": 5.0,
       "w": 2.0,
       "d": 6.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-shelf-east",
       "name": "Tool room built-in hose & regulator rack (East wall #9906)",
       "x": 51.0,
       "z": 5.0,
       "w": 2.0,
       "d": 6.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "elec-panels-alcove",
       "name": "Main electrical panels & switchgear bank (#9883, fixed/conduit)",
       "x": 80.5,
       "z": 0.5,
       "w": 12.0,
       "d": 1.0,
       "h": 6.5,
       "y": 1.0,
       "rot": 0,
       "est": true
      },
      {
       "id": "elec-panel-mid",
       "name": "Secondary electrical disconnect & panel (#9886)",
       "x": 65.0,
       "z": 0.5,
       "w": 4.0,
       "d": 1.0,
       "h": 5.0,
       "y": 2.0,
       "rot": 0,
       "est": true
      },
      {
       "id": "fire-ext-1",
       "name": "Wall-mounted fire extinguisher by electrical panels (#9883/#9886)",
       "x": 73.0,
       "z": 0.3,
       "w": 1.0,
       "d": 0.6,
       "h": 2.0,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "fire-ext-2",
       "name": "Wall-mounted fire extinguisher by lockers (#9888)",
       "x": 30.5,
       "z": 0.3,
       "w": 1.0,
       "d": 0.6,
       "h": 2.0,
       "y": 3.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "exit-door-north",
       "name": "Personnel exit door (#9888/#9894)",
       "x": 28.0,
       "z": 0.25,
       "w": 3.5,
       "d": 0.5,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "rollup-door-1",
       "name": "South wall roll-up bay door 1 (#9896)",
       "x": 30.0,
       "z": 49.75,
       "w": 12.0,
       "d": 0.5,
       "h": 12.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "rollup-door-2",
       "name": "South wall roll-up bay door 2 (#9896)",
       "x": 46.0,
       "z": 49.75,
       "w": 12.0,
       "d": 0.5,
       "h": 12.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "hose-reel-overhead",
       "name": "Fixed overhead red hose reel on booth frame (#9875)",
       "x": 40.0,
       "z": 17.5,
       "w": 2.0,
       "d": 1.5,
       "h": 2.0,
       "y": 7.5,
       "rot": 0,
       "est": true
      },
      {
       "id": "overhead-duct-north",
       "name": "Fixed overhead HVAC/exhaust ducting (#9883/#9886)",
       "x": 65.0,
       "z": 2.0,
       "w": 60.0,
       "d": 2.0,
       "h": 2.0,
       "y": 11.0,
       "rot": 0,
       "est": true
      }
     ],
     "layouts": {
      "before": {
       "label": "Before (current shop)",
       "objects": [
        {
         "id": "engine-stand-fixture",
         "name": "Heavy weld fixture / engine stand in center aisle (#9875)",
         "x": 30.0,
         "z": 25.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-1",
         "name": "Rolling dual-cylinder oxy-fuel/shielding gas cart 1 (#9875)",
         "x": 38.0,
         "z": 25.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-2",
         "name": "Rolling dual-cylinder gas cart 2 (#9875)",
         "x": 45.0,
         "z": 25.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-3",
         "name": "Rolling dual-cylinder gas cart 3 (#9875)",
         "x": 52.0,
         "z": 25.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-4",
         "name": "Rolling dual-cylinder gas cart 4 (#9875)",
         "x": 60.0,
         "z": 25.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "center-aisle-bench",
         "name": "Small steel welding bench in center aisle (#9875)",
         "x": 68.0,
         "z": 25.0,
         "w": 4.0,
         "d": 2.5,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spool-rack-cart",
         "name": "Red rolling wire-spool rack cart (#9879)",
         "x": 18.0,
         "z": 26.0,
         "w": 5.0,
         "d": 3.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "open-steel-table-1",
         "name": "Square steel worktable with trash can (#9879)",
         "x": 10.0,
         "z": 32.0,
         "w": 4.0,
         "d": 4.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "open-steel-table-2",
         "name": "Yellow-leg steel worktable (#9879)",
         "x": 10.0,
         "z": 40.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "student-toolbox-group-1",
         "name": "Cluster of rolling black student toolboxes A (#9883)",
         "x": 85.0,
         "z": 6.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "student-toolbox-group-2",
         "name": "Cluster of rolling black student toolboxes B (#9883)",
         "x": 90.0,
         "z": 6.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "helmet-cubby-rack",
         "name": "Large steel cubby rack for student helmets/gear (#9883/#9888)",
         "x": 96.0,
         "z": 5.0,
         "w": 6.0,
         "d": 2.0,
         "h": 7.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "wire-mesh-shelf-1",
         "name": "Expanded-metal storage shelf 1 (#9883)",
         "x": 98.0,
         "z": 11.0,
         "w": 4.0,
         "d": 2.0,
         "h": 6.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "wire-mesh-shelf-2",
         "name": "Expanded-metal storage shelf 2 (#9886)",
         "x": 69.0,
         "z": 2.0,
         "w": 4.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-1",
         "name": "Metal shopping cart 1 (#9886)",
         "x": 65.0,
         "z": 4.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-2",
         "name": "Metal shopping cart 2 (#9888)",
         "x": 76.0,
         "z": 6.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "blue-locker-bank",
         "name": "Blue ventilated metal locker unit (#9888)",
         "x": 33.5,
         "z": 2.0,
         "w": 5.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-grinder-1",
         "name": "Bench grinder on pedestal stand 1 (#9888)",
         "x": 60.5,
         "z": 2.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-grinder-2",
         "name": "Bench grinder on pedestal stand 2 (#9888)",
         "x": 63.0,
         "z": 2.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-vise-3",
         "name": "Red pedestal vise/grinder stand 3 (#9888)",
         "x": 65.5,
         "z": 2.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "metal-cabinet-black",
         "name": "Black mesh storage cabinet (#9888)",
         "x": 71.5,
         "z": 2.0,
         "w": 3.0,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-drum-1",
         "name": "Black drum floor fan blocking panel (#9883/#9886)",
         "x": 74.5,
         "z": 2.0,
         "w": 2.5,
         "d": 1.5,
         "h": 2.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-pedestal-1",
         "name": "Tall pedestal fan 1 (#9886)",
         "x": 63.0,
         "z": 5.5,
         "w": 2.5,
         "d": 2.5,
         "h": 5.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-pedestal-2",
         "name": "Tall pedestal fan 2 (#9888)",
         "x": 34.0,
         "z": 5.0,
         "w": 2.5,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-drum-2",
         "name": "Large wheeled drum fan (#9888)",
         "x": 36.5,
         "z": 7.5,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-orange",
         "name": "Large orange barrel fan (#9894)",
         "x": 24.5,
         "z": 12.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drill-press",
         "name": "Floor drill press near exit (#9894)",
         "x": 23.0,
         "z": 3.0,
         "w": 2.0,
         "d": 2.5,
         "h": 5.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "broom-shovel-rack",
         "name": "Mobile broom, shovel & squeegee rack (#9894)",
         "x": 25.5,
         "z": 2.0,
         "w": 3.5,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "heavy-press-bench",
         "name": "Heavy steel table with vise & hydraulic press blocking roll-up door (#9896)",
         "x": 38.0,
         "z": 47.0,
         "w": 8.0,
         "d": 3.5,
         "h": 4.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spare-welders-rack",
         "name": "Low rack with boxed/spare welders (#9898)",
         "x": 3.0,
         "z": 10.0,
         "w": 8.0,
         "d": 2.5,
         "h": 3.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "loose-cylinder-red",
         "name": "Unsecured red compressed gas cylinder (#9896)",
         "x": 25.0,
         "z": 42.0,
         "w": 1.0,
         "d": 1.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "toolroom-floor-totes",
         "name": "Mobile tool cases & floor bin stack in tool room (#9912)",
         "x": 45.0,
         "z": 5.0,
         "w": 3.0,
         "d": 2.0,
         "h": 2.5,
         "y": 0,
         "rot": 0,
         "est": true
        }
       ]
      },
      "after": {
       "label": "After (Gemini)",
       "objects": [
        {
         "id": "engine-stand-fixture",
         "name": "Heavy weld fixture / engine stand in center aisle (#9875)",
         "x": 76.0,
         "z": 46.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-1",
         "name": "Rolling dual-cylinder oxy-fuel/shielding gas cart 1 (#9875)",
         "x": 2.0,
         "z": 26.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "gas-cart-2",
         "name": "Rolling dual-cylinder gas cart 2 (#9875)",
         "x": 2.0,
         "z": 30.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "gas-cart-3",
         "name": "Rolling dual-cylinder gas cart 3 (#9875)",
         "x": 2.0,
         "z": 34.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "gas-cart-4",
         "name": "Rolling dual-cylinder gas cart 4 (#9875)",
         "x": 2.0,
         "z": 38.0,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "center-aisle-bench",
         "name": "Small steel welding bench in center aisle (#9875)",
         "x": 22.0,
         "z": 32.5,
         "w": 4.0,
         "d": 2.5,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spool-rack-cart",
         "name": "Red rolling wire-spool rack cart (#9879)",
         "x": 22.0,
         "z": 17.5,
         "w": 5.0,
         "d": 3.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "open-steel-table-1",
         "name": "Square steel worktable with trash can (#9879)",
         "x": 15.0,
         "z": 32.5,
         "w": 4.0,
         "d": 4.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "open-steel-table-2",
         "name": "Yellow-leg steel worktable (#9879)",
         "x": 9.0,
         "z": 32.5,
         "w": 4.0,
         "d": 3.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "student-toolbox-group-1",
         "name": "Cluster of rolling black student toolboxes A (#9883)",
         "x": 10.0,
         "z": 2.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "student-toolbox-group-2",
         "name": "Cluster of rolling black student toolboxes B (#9883)",
         "x": 15.0,
         "z": 2.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "helmet-cubby-rack",
         "name": "Large steel cubby rack for student helmets/gear (#9883/#9888)",
         "x": 21.0,
         "z": 1.5,
         "w": 6.0,
         "d": 2.0,
         "h": 7.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "wire-mesh-shelf-1",
         "name": "Expanded-metal storage shelf 1 (#9883)",
         "x": 63.0,
         "z": 48.0,
         "w": 4.0,
         "d": 2.0,
         "h": 6.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "wire-mesh-shelf-2",
         "name": "Expanded-metal storage shelf 2 (#9886)",
         "x": 68.0,
         "z": 48.0,
         "w": 4.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-1",
         "name": "Metal shopping cart 1 (#9886)",
         "x": 36.0,
         "z": 8.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-2",
         "name": "Metal shopping cart 2 (#9888)",
         "x": 36.0,
         "z": 11.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "blue-locker-bank",
         "name": "Blue ventilated metal locker unit (#9888)",
         "x": 34.5,
         "z": 1.5,
         "w": 5.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "pedestal-grinder-1",
         "name": "Bench grinder on pedestal stand 1 (#9888)",
         "x": 98.0,
         "z": 4.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "pedestal-grinder-2",
         "name": "Bench grinder on pedestal stand 2 (#9888)",
         "x": 98.0,
         "z": 8.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "pedestal-vise-3",
         "name": "Red pedestal vise/grinder stand 3 (#9888)",
         "x": 98.0,
         "z": 12.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "metal-cabinet-black",
         "name": "Black mesh storage cabinet (#9888)",
         "x": 72.0,
         "z": 48.0,
         "w": 3.0,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-drum-1",
         "name": "Black drum floor fan blocking panel (#9883/#9886)",
         "x": 86.5,
         "z": 17.5,
         "w": 2.5,
         "d": 1.5,
         "h": 2.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "floor-fan-pedestal-1",
         "name": "Tall pedestal fan 1 (#9886)",
         "x": 86.5,
         "z": 32.5,
         "w": 2.5,
         "d": 2.5,
         "h": 5.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "floor-fan-pedestal-2",
         "name": "Tall pedestal fan 2 (#9888)",
         "x": 23.5,
         "z": 13.5,
         "w": 2.5,
         "d": 2.5,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-drum-2",
         "name": "Large wheeled drum fan (#9888)",
         "x": 23.5,
         "z": 28.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-orange",
         "name": "Large orange barrel fan (#9894)",
         "x": 86.5,
         "z": 25.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "drill-press",
         "name": "Floor drill press near exit (#9894)",
         "x": 98.0,
         "z": 16.0,
         "w": 2.0,
         "d": 2.5,
         "h": 5.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "broom-shovel-rack",
         "name": "Mobile broom, shovel & squeegee rack (#9894)",
         "x": 61.0,
         "z": 2.0,
         "w": 3.5,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "heavy-press-bench",
         "name": "Heavy steel table with vise & hydraulic press blocking roll-up door (#9896)",
         "x": 91.0,
         "z": 10.0,
         "w": 8.0,
         "d": 3.5,
         "h": 4.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "spare-welders-rack",
         "name": "Low rack with boxed/spare welders (#9898)",
         "x": 2.0,
         "z": 10.0,
         "w": 8.0,
         "d": 2.5,
         "h": 3.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "loose-cylinder-red",
         "name": "Unsecured red compressed gas cylinder (#9896)",
         "x": 2.0,
         "z": 42.0,
         "w": 1.0,
         "d": 1.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "toolroom-floor-totes",
         "name": "Mobile tool cases & floor bin stack in tool room (#9912)",
         "x": 55.5,
         "z": 3.0,
         "w": 3.0,
         "d": 2.0,
         "h": 2.5,
         "y": 0,
         "rot": 0,
         "est": true
        }
       ]
      }
     }
    }
  },
};
