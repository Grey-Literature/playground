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
 *           INSIDE the main floor). {id:{door:{side:'n|s|e|w', w:ft, at:ftOffFromMiddle}, skip:['n',..]}},
 *           rot 0 only. `skip` omits sides that are already shop walls (avoids z-fighting).
 *   planRooms  optional: room ids that share one plan view (shop + tool room). Standing in a room outside
 *           the list (a far-off yard) frames just that room. Rooms may set outdoor:true (no ceiling).
 *   planLabels  optional: fixed ids whose labels also show in plan view (structure, e.g. classrooms).
 *   note    optional: caveat text shown in the menu (what the model guessed, what we added).
 * Models are shown as they described the shop — never merged or normalized — so each has its own
 * "before" (its reading of the photos) and "after".
 *
 * The one exception is `real`, listed first so it loads by default: not a model's answer but the
 * reference shop, built by hand from the weld_shop_reorg photos and the measured room sizes, with a
 * drafted "after". Each booth is its own fixed item (decor count 1). Its items also carry `src` (the
 * photo numbers they came from) and `est` (position or size read off photos, not measured); the viewer
 * ignores both.
 *
 * COORDINATES (feet): x/z are an object's CENTER on the floor plan; w runs along x and d along z
 * before rotation; h is height; y is the bottom edge off the floor (0 unless wall-mounted);
 * rot is degrees CLOCKWISE seen from above. Every layout in a model lists the same ids.
 */
window.SHOP_DATA = {
  models: {
    real: {
     "label": "Real shop (from photos)",
     "frame": "Built by hand from the 67 weld_shop_reorg photos (9875-9941) plus measured room sizes. x runs west to east along the 100 ft main hall; z runs north to south across its 50 ft. North of the hall (z<0): Rooms 1-4 (windows face the street) and the dust-booth bay (A bay) at the east end. West of the hall (x<0): tool room, with the side box (electrical room) opening off it. East of the hall (x>100): the yard, reached through the roll-up door. Every item lists the photos it came from in `src`; `est:true` marks a position or size read off photos rather than measured.",
     "note": "Measured: every room size. Inferred from photos (please confirm): where the classrooms, dust bay, tool room and yard sit relative to the hall; booth numbering order (1-25 north row, 26-51 south row, A1-A19 in the dust bay); every equipment position and size. Yard layout is approximate. The \"after\" is a draft reorg: 8 ft clear center lane, 4 ft clear in front of every booth, work tables in bands between them, grinders grouped away from the gas carts, the electrical room cleared in front of its panels, yard steel on the stock rack.",
     "rooms": [
      {
       "id": "main",
       "name": "Main booth hall",
       "x0": 0,
       "z0": 0,
       "w": 100,
       "d": 50,
       "h": 16,
       "spawn": {
        "x": 4,
        "z": 30,
        "yaw": 90
       }
      },
      {
       "id": "toolroom",
       "name": "Tool room",
       "x0": -10,
       "z0": 0,
       "w": 10,
       "d": 14,
       "h": 9,
       "spawn": {
        "x": -2,
        "z": 7,
        "yaw": -90
       }
      },
      {
       "id": "sidebox",
       "name": "TR side box (electrical room)",
       "x0": -10,
       "z0": 14,
       "w": 10,
       "d": 7.5,
       "h": 9,
       "spawn": {
        "x": -2,
        "z": 17.75,
        "yaw": -90
       }
      },
      {
       "id": "room1",
       "name": "Room 1",
       "x0": -1,
       "z0": -23,
       "w": 23,
       "d": 23,
       "h": 9,
       "spawn": {
        "x": 18,
        "z": -3,
        "yaw": 0
       }
      },
      {
       "id": "room2",
       "name": "Room 2",
       "x0": 22,
       "z0": -23,
       "w": 18.5,
       "d": 23,
       "h": 9,
       "spawn": {
        "x": 37,
        "z": -3,
        "yaw": 0
       }
      },
      {
       "id": "room3",
       "name": "Room 3",
       "x0": 40.5,
       "z0": -23,
       "w": 19.5,
       "d": 23,
       "h": 9,
       "spawn": {
        "x": 56,
        "z": -3,
        "yaw": 0
       }
      },
      {
       "id": "room4",
       "name": "Room 4",
       "x0": 60,
       "z0": -23,
       "w": 18,
       "d": 23,
       "h": 9,
       "spawn": {
        "x": 74,
        "z": -3,
        "yaw": 0
       }
      },
      {
       "id": "dust",
       "name": "Dust booths (A bay)",
       "x0": 78,
       "z0": -27,
       "w": 22,
       "d": 27,
       "h": 12,
       "spawn": {
        "x": 84,
        "z": -3,
        "yaw": 0
       }
      },
      {
       "id": "yard",
       "name": "Yard",
       "x0": 100,
       "z0": -110,
       "w": 98,
       "d": 253,
       "h": 4,
       "outdoor": true,
       "spawn": {
        "x": 104,
        "z": 25,
        "yaw": 90
       }
      }
     ],
     "doors": [
      "door-toolroom",
      "door-sidebox",
      "door-room1",
      "door-room2",
      "door-room3",
      "door-room4",
      "door-dust",
      "rollup-main",
      "door-storage-ext",
      "rollup-dust",
      "exit-dust",
      "yard-gate"
     ],
     "decor": {
      "booth-01": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-02": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-03": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-04": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-05": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-06": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-07": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-08": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-09": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-10": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-11": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-12": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-13": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-14": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-15": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-16": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-17": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-18": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-19": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-20": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-21": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-22": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-23": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-24": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-25": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-26": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-27": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-28": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-29": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-30": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-31": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-32": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-33": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-34": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-35": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-36": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-37": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-38": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-39": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-40": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-41": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-42": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-43": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-44": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-45": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-46": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-47": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-48": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-49": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-50": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-51": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a1": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a2": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a3": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a4": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a5": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a6": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a7": {
       "type": "booths",
       "count": 1,
       "open": "+x"
      },
      "booth-a8": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-a9": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-a10": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-a11": {
       "type": "booths",
       "count": 1,
       "open": "+z"
      },
      "booth-a12": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a13": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a14": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a15": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a16": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a17": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a18": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      },
      "booth-a19": {
       "type": "booths",
       "count": 1,
       "open": "-z"
      }
     },
     "planRooms": [
      "main",
      "toolroom",
      "sidebox",
      "room1",
      "room2",
      "room3",
      "room4",
      "dust"
     ],
     "planLabels": [
      "fire-riser-room",
      "red-curtain",
      "room1-tables",
      "room2-tables",
      "room3-tables",
      "room4-tables",
      "toolroom-shelving-w",
      "elec-panels"
     ],
     "fixed": [
      {
       "id": "booth-01",
       "name": "Booth 1",
       "x": 13.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-02",
       "name": "Booth 2",
       "x": 17.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-03",
       "name": "Booth 3",
       "x": 20.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-04",
       "name": "Booth 4",
       "x": 24.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-05",
       "name": "Booth 5",
       "x": 27.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-06",
       "name": "Booth 6",
       "x": 31.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-07",
       "name": "Booth 7",
       "x": 34.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-08",
       "name": "Booth 8",
       "x": 38.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-09",
       "name": "Booth 9",
       "x": 41.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-10",
       "name": "Booth 10",
       "x": 45.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-11",
       "name": "Booth 11",
       "x": 48.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-12",
       "name": "Booth 12",
       "x": 52.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-13",
       "name": "Booth 13",
       "x": 55.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-14",
       "name": "Booth 14",
       "x": 59.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-15",
       "name": "Booth 15",
       "x": 62.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-16",
       "name": "Booth 16",
       "x": 66.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-17",
       "name": "Booth 17",
       "x": 69.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-18",
       "name": "Booth 18",
       "x": 73.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-19",
       "name": "Booth 19",
       "x": 76.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-20",
       "name": "Booth 20",
       "x": 80.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-21",
       "name": "Booth 21",
       "x": 83.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-22",
       "name": "Booth 22",
       "x": 87.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-23",
       "name": "Booth 23",
       "x": 90.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-24",
       "name": "Booth 24",
       "x": 94.25,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-25",
       "name": "Booth 25",
       "x": 97.75,
       "z": 10,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9878",
        "9881"
       ]
      },
      {
       "id": "booth-26",
       "name": "Booth 26",
       "x": 10.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-27",
       "name": "Booth 27",
       "x": 13.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-28",
       "name": "Booth 28",
       "x": 17.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-29",
       "name": "Booth 29",
       "x": 20.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-30",
       "name": "Booth 30",
       "x": 24.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-31",
       "name": "Booth 31",
       "x": 27.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-32",
       "name": "Booth 32",
       "x": 31.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-33",
       "name": "Booth 33",
       "x": 34.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-34",
       "name": "Booth 34",
       "x": 38.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-35",
       "name": "Booth 35",
       "x": 41.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-36",
       "name": "Booth 36",
       "x": 45.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-37",
       "name": "Booth 37",
       "x": 48.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-38",
       "name": "Booth 38",
       "x": 52.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-39",
       "name": "Booth 39",
       "x": 55.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-40",
       "name": "Booth 40",
       "x": 59.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-41",
       "name": "Booth 41",
       "x": 62.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-42",
       "name": "Booth 42",
       "x": 66.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-43",
       "name": "Booth 43",
       "x": 69.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-44",
       "name": "Booth 44",
       "x": 73.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-45",
       "name": "Booth 45",
       "x": 76.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-46",
       "name": "Booth 46",
       "x": 80.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-47",
       "name": "Booth 47",
       "x": 83.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-48",
       "name": "Booth 48",
       "x": 87.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-49",
       "name": "Booth 49",
       "x": 90.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-50",
       "name": "Booth 50",
       "x": 94.25,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-51",
       "name": "Booth 51",
       "x": 97.75,
       "z": 40,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9876",
        "9880"
       ]
      },
      {
       "id": "booth-a1",
       "name": "Booth A1",
       "x": 79.72,
       "z": -1.75,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a2",
       "name": "Booth A2",
       "x": 79.72,
       "z": -5.25,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a3",
       "name": "Booth A3",
       "x": 79.72,
       "z": -8.75,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a4",
       "name": "Booth A4",
       "x": 79.72,
       "z": -12.25,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a5",
       "name": "Booth A5",
       "x": 79.72,
       "z": -15.75,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a6",
       "name": "Booth A6",
       "x": 79.72,
       "z": -19.25,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a7",
       "name": "Booth A7",
       "x": 79.72,
       "z": -22.75,
       "w": 3.45,
       "d": 3.5,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9889",
        "9890"
       ]
      },
      {
       "id": "booth-a8",
       "name": "Booth A8",
       "x": 83.75,
       "z": -25.27,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9890",
        "9893"
       ]
      },
      {
       "id": "booth-a9",
       "name": "Booth A9",
       "x": 87.25,
       "z": -25.27,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9890",
        "9893"
       ]
      },
      {
       "id": "booth-a10",
       "name": "Booth A10",
       "x": 90.75,
       "z": -25.27,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9890",
        "9893"
       ]
      },
      {
       "id": "booth-a11",
       "name": "Booth A11",
       "x": 94.25,
       "z": -25.27,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9890",
        "9893"
       ]
      },
      {
       "id": "booth-a12",
       "name": "Booth A12",
       "x": 87.75,
       "z": -1.72,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9891",
        "9892"
       ]
      },
      {
       "id": "booth-a13",
       "name": "Booth A13",
       "x": 91.25,
       "z": -1.72,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9891",
        "9892"
       ]
      },
      {
       "id": "booth-a14",
       "name": "Booth A14",
       "x": 94.75,
       "z": -1.72,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9891",
        "9892"
       ]
      },
      {
       "id": "booth-a15",
       "name": "Booth A15",
       "x": 98.25,
       "z": -1.72,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9891",
        "9892"
       ]
      },
      {
       "id": "booth-a16",
       "name": "Booth A16 (on casters)",
       "x": 85.75,
       "z": -13,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9892",
        "9893"
       ]
      },
      {
       "id": "booth-a17",
       "name": "Booth A17 (on casters)",
       "x": 89.25,
       "z": -13,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9892",
        "9893"
       ]
      },
      {
       "id": "booth-a18",
       "name": "Booth A18 (on casters)",
       "x": 92.75,
       "z": -13,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9892",
        "9893"
       ]
      },
      {
       "id": "booth-a19",
       "name": "Booth A19 (on casters)",
       "x": 96.25,
       "z": -13,
       "w": 3.5,
       "d": 3.45,
       "h": 7,
       "y": 0,
       "est": true,
       "src": [
        "9892",
        "9893"
       ]
      },
      {
       "id": "door-toolroom",
       "name": "Tool room door",
       "x": 0,
       "z": 7,
       "w": 0.3,
       "d": 3,
       "h": 7,
       "src": [
        "9887",
        "9913"
       ]
      },
      {
       "id": "door-sidebox",
       "name": "Side box door",
       "x": -1.5,
       "z": 14,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "src": [
        "9910",
        "9911"
       ]
      },
      {
       "id": "door-room1",
       "name": "Room 1 door",
       "x": 18,
       "z": 0,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9925",
        "9928"
       ]
      },
      {
       "id": "door-room2",
       "name": "Room 2 door",
       "x": 37,
       "z": 0,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9925"
       ]
      },
      {
       "id": "door-room3",
       "name": "Room 3 door",
       "x": 56,
       "z": 0,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9925"
       ]
      },
      {
       "id": "door-room4",
       "name": "Room 4 door",
       "x": 74,
       "z": 0,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9928"
       ]
      },
      {
       "id": "door-dust",
       "name": "Door to dust booths",
       "x": 84,
       "z": 0,
       "w": 4,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9889"
       ]
      },
      {
       "id": "rollup-main",
       "name": "Roll-up door to yard",
       "x": 100,
       "z": 25,
       "w": 0.3,
       "d": 12,
       "h": 12,
       "est": true,
       "src": [
        "9882",
        "9935"
       ]
      },
      {
       "id": "door-storage-ext",
       "name": "Blue exterior door (storage)",
       "x": 100,
       "z": 45,
       "w": 0.3,
       "d": 3,
       "h": 7,
       "color": "#2f5fb5",
       "est": true,
       "src": [
        "9901",
        "9937"
       ]
      },
      {
       "id": "rollup-dust",
       "name": "Dust bay roll-up door",
       "x": 100,
       "z": -18,
       "w": 0.3,
       "d": 10,
       "h": 10,
       "est": true,
       "src": [
        "9895"
       ]
      },
      {
       "id": "exit-dust",
       "name": "EXIT door",
       "x": 92,
       "z": -27,
       "w": 3,
       "d": 0.3,
       "h": 7,
       "est": true,
       "src": [
        "9893"
       ]
      },
      {
       "id": "yard-gate",
       "name": "Sliding gate (blue)",
       "x": 198,
       "z": -60,
       "w": 0.3,
       "d": 20,
       "h": 6,
       "color": "#2f5fb5",
       "est": true,
       "src": [
        "9930",
        "9931"
       ]
      },
      {
       "id": "fire-riser-room",
       "name": "Fire riser room",
       "x": 3,
       "z": 3,
       "w": 6,
       "d": 6,
       "h": 9,
       "color": "#9a9ea6",
       "est": true,
       "src": [
        "9884"
       ]
      },
      {
       "id": "elec-disconnects",
       "name": "Electrical disconnects",
       "x": 6.4,
       "z": 3,
       "w": 0.6,
       "d": 4,
       "h": 3,
       "y": 3,
       "est": true,
       "src": [
        "9883"
       ]
      },
      {
       "id": "lockers",
       "name": "Locker bank (helmet cage)",
       "x": 27,
       "z": 0.9,
       "w": 12,
       "d": 1.6,
       "h": 6.5,
       "est": true,
       "src": [
        "9883"
       ]
      },
      {
       "id": "instructor-whiteboards",
       "name": "Instructor wall (whiteboards, clipboards)",
       "x": 0.25,
       "z": 36,
       "w": 0.3,
       "d": 20,
       "h": 4,
       "y": 3,
       "color": "#e8e8e8",
       "est": true,
       "src": [
        "9875",
        "9879"
       ]
      },
      {
       "id": "drinking-fountain",
       "name": "Drinking fountain",
       "x": 0.8,
       "z": 24,
       "w": 1.5,
       "d": 1.5,
       "h": 3,
       "color": "#b8bcc4",
       "est": true,
       "src": [
        "9879"
       ]
      },
      {
       "id": "gas-air-drops-n",
       "name": "Overhead gas/air drops (north row)",
       "x": 55.75,
       "z": 8.9,
       "w": 87.5,
       "d": 0.5,
       "h": 0.5,
       "y": 8,
       "est": true,
       "src": [
        "9885"
       ]
      },
      {
       "id": "gas-air-drops-s",
       "name": "Overhead gas/air drops (south row)",
       "x": 54,
       "z": 41.1,
       "w": 91,
       "d": 0.5,
       "h": 0.5,
       "y": 8,
       "est": true,
       "src": [
        "9885"
       ]
      },
      {
       "id": "drape-n",
       "name": "Black plastic drape over north row",
       "x": 55.75,
       "z": 10,
       "w": 87.5,
       "d": 3.5,
       "h": 2.5,
       "y": 7.4,
       "color": "#222",
       "est": true,
       "src": [
        "9876"
       ]
      },
      {
       "id": "hose-reel-1",
       "name": "Hose reel (red)",
       "x": 30,
       "z": 25,
       "w": 2,
       "d": 2,
       "h": 1.2,
       "y": 10,
       "est": true,
       "src": [
        "9877"
       ]
      },
      {
       "id": "hose-reel-2",
       "name": "Hose reel (red)",
       "x": 70,
       "z": 25,
       "w": 2,
       "d": 2,
       "h": 1.2,
       "y": 10,
       "est": true,
       "src": [
        "9877"
       ]
      },
      {
       "id": "red-curtain",
       "name": "Red weld curtain (storage screen)",
       "x": 82,
       "z": 47,
       "w": 0.15,
       "d": 6,
       "h": 8,
       "color": "#b03030",
       "est": true,
       "src": [
        "9897",
        "9899"
       ]
      },
      {
       "id": "toolroom-shelving-w",
       "name": "Steel shelving w/ hose & stinger hooks",
       "x": -9.25,
       "z": 7,
       "w": 1.5,
       "d": 14,
       "h": 8,
       "est": false,
       "src": [
        "9902",
        "9908",
        "9909"
       ]
      },
      {
       "id": "toolroom-shelving-n",
       "name": "Shelving (fittings, PLASMA CUTTER drawers, discs)",
       "x": -4.5,
       "z": 0.75,
       "w": 8,
       "d": 1.5,
       "h": 8,
       "est": false,
       "src": [
        "9903",
        "9905"
       ]
      },
      {
       "id": "toolroom-bench",
       "name": "Workbench w/ pegboard, vise, cubby bins",
       "x": -6.5,
       "z": 13,
       "w": 6,
       "d": 2,
       "h": 3.2,
       "est": true,
       "src": [
        "9903",
        "9904",
        "9913"
       ]
      },
      {
       "id": "elec-panels",
       "name": "Electrical panels A, B, A1",
       "x": -9.6,
       "z": 17.75,
       "w": 0.8,
       "d": 6,
       "h": 6,
       "y": 0.5,
       "est": false,
       "src": [
        "9914",
        "9917"
       ]
      },
      {
       "id": "helmet-rack",
       "name": "Helmet / face-shield wall rack",
       "x": -0.45,
       "z": 18.5,
       "w": 0.6,
       "d": 3,
       "h": 3,
       "y": 3,
       "est": true,
       "src": [
        "9915"
       ]
      },
      {
       "id": "room1-tables",
       "name": "Room 1: student tables",
       "x": 10.5,
       "z": -12,
       "w": 17,
       "d": 11,
       "h": 2.5,
       "color": "#6b5a4a",
       "est": true,
       "src": [
        "9919",
        "9921",
        "9924"
       ]
      },
      {
       "id": "room1-window",
       "name": "Window",
       "x": 10.5,
       "z": -22.9,
       "w": 8,
       "d": 0.2,
       "h": 3.5,
       "y": 3.5,
       "color": "#7fb6d9",
       "collide": false,
       "est": true,
       "src": [
        "9923",
        "9924"
       ]
      },
      {
       "id": "room1-logo-wall",
       "name": "Logo wall + red accent wall",
       "x": 10.5,
       "z": -22.75,
       "w": 14,
       "d": 0.3,
       "h": 3,
       "y": 4,
       "color": "#c0392b",
       "collide": false,
       "est": true,
       "src": [
        "9919",
        "9920"
       ]
      },
      {
       "id": "room2-tables",
       "name": "Room 2: student tables",
       "x": 31.25,
       "z": -12,
       "w": 12.5,
       "d": 11,
       "h": 2.5,
       "color": "#6b5a4a",
       "est": true,
       "src": [
        "9919",
        "9921",
        "9924"
       ]
      },
      {
       "id": "room2-window",
       "name": "Window",
       "x": 31.25,
       "z": -22.9,
       "w": 8,
       "d": 0.2,
       "h": 3.5,
       "y": 3.5,
       "color": "#7fb6d9",
       "collide": false,
       "est": true,
       "src": [
        "9923",
        "9924"
       ]
      },
      {
       "id": "room2-cnc",
       "name": "CNC plasma table",
       "x": 26,
       "z": -19.5,
       "w": 5,
       "d": 5,
       "h": 3.5,
       "color": "#9a3030",
       "est": true,
       "src": [
        "9921",
        "9922"
       ]
      },
      {
       "id": "room3-tables",
       "name": "Room 3: student tables",
       "x": 50.25,
       "z": -12,
       "w": 13.5,
       "d": 11,
       "h": 2.5,
       "color": "#6b5a4a",
       "est": true,
       "src": [
        "9919",
        "9921",
        "9924"
       ]
      },
      {
       "id": "room3-window",
       "name": "Window",
       "x": 50.25,
       "z": -22.9,
       "w": 8,
       "d": 0.2,
       "h": 3.5,
       "y": 3.5,
       "color": "#7fb6d9",
       "collide": false,
       "est": true,
       "src": [
        "9923",
        "9924"
       ]
      },
      {
       "id": "room4-tables",
       "name": "Room 4: student tables",
       "x": 69,
       "z": -12,
       "w": 12,
       "d": 11,
       "h": 2.5,
       "color": "#6b5a4a",
       "est": true,
       "src": [
        "9919",
        "9921",
        "9924"
       ]
      },
      {
       "id": "room4-window",
       "name": "Window",
       "x": 69,
       "z": -22.9,
       "w": 8,
       "d": 0.2,
       "h": 3.5,
       "y": 3.5,
       "color": "#7fb6d9",
       "collide": false,
       "est": true,
       "src": [
        "9923",
        "9924"
       ]
      },
      {
       "id": "dust-wall-fans",
       "name": "Wall fans",
       "x": 90,
       "z": -26.6,
       "w": 6,
       "d": 0.6,
       "h": 2,
       "y": 8,
       "est": true,
       "src": [
        "9893"
       ]
      },
      {
       "id": "canopy-roof",
       "name": "Break canopy roof",
       "x": 120,
       "z": 46.5,
       "w": 40,
       "d": 25,
       "h": 0.4,
       "y": 9,
       "color": "#9a9ea6",
       "est": true,
       "src": [
        "9934",
        "9935",
        "9941"
       ]
      },
      {
       "id": "canopy-post-1",
       "name": "Canopy post",
       "x": 113,
       "z": 34.5,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "canopy-post-2",
       "name": "Canopy post",
       "x": 126.5,
       "z": 34.5,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "canopy-post-3",
       "name": "Canopy post",
       "x": 139.5,
       "z": 34.5,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "canopy-post-4",
       "name": "Canopy post",
       "x": 113,
       "z": 58.75,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "canopy-post-5",
       "name": "Canopy post",
       "x": 126.5,
       "z": 58.75,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "canopy-post-6",
       "name": "Canopy post",
       "x": 139.5,
       "z": 58.75,
       "w": 0.5,
       "d": 0.5,
       "h": 9,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "yard-container",
       "name": "Old shipping container (storage)",
       "x": 128,
       "z": 54,
       "w": 20,
       "d": 8,
       "h": 8.5,
       "color": "#d8c9a3",
       "est": true,
       "src": [
        "9935",
        "9941"
       ]
      },
      {
       "id": "rolling-canopy",
       "name": "Rolling shade canopy",
       "x": 106,
       "z": 64,
       "w": 12,
       "d": 10,
       "h": 0.3,
       "y": 8,
       "color": "#8a6a4a",
       "est": true,
       "src": [
        "9940"
       ]
      },
      {
       "id": "vise-bench",
       "name": "Vise bench + scrap hopper",
       "x": 101.5,
       "z": 64,
       "w": 2.5,
       "d": 8,
       "h": 3.5,
       "est": true,
       "src": [
        "9940"
       ]
      },
      {
       "id": "linde-dewar",
       "name": "Bulk liquid gas tank",
       "x": 101.8,
       "z": 33,
       "w": 2.5,
       "d": 2.5,
       "h": 7,
       "color": "#c8d0d8",
       "est": true,
       "src": [
        "9936"
       ]
      },
      {
       "id": "cylinder-rack-1",
       "name": "Cylinder rack (~20 cylinders)",
       "x": 106,
       "z": 80,
       "w": 10,
       "d": 2.5,
       "h": 5,
       "color": "#8a3a3a",
       "est": true,
       "src": [
        "9932"
       ]
      },
      {
       "id": "cylinder-rack-2",
       "name": "Cylinder rack (small)",
       "x": 114,
       "z": 80,
       "w": 4,
       "d": 2.5,
       "h": 5,
       "color": "#8a3a3a",
       "est": true,
       "src": [
        "9932"
       ]
      },
      {
       "id": "pods",
       "name": "Portable storage container",
       "x": 124,
       "z": 84,
       "w": 16,
       "d": 8,
       "h": 8,
       "color": "#eeeeee",
       "est": true,
       "src": [
        "9932",
        "9933"
       ]
      },
      {
       "id": "dumpster-17",
       "name": "Roll-off scrap dumpster",
       "x": 142,
       "z": 84,
       "w": 22,
       "d": 8,
       "h": 6,
       "color": "#a33",
       "est": true,
       "src": [
        "9933"
       ]
      },
      {
       "id": "yard-shed",
       "name": "Open-front metal shed",
       "x": 112,
       "z": 96,
       "w": 20,
       "d": 8,
       "h": 8,
       "color": "#c9ccd1",
       "est": true,
       "src": [
        "9934"
       ]
      },
      {
       "id": "utility-pole",
       "name": "Utility pole (PA speaker)",
       "x": 141,
       "z": 33,
       "w": 1,
       "d": 1,
       "h": 30,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9934",
        "9936"
       ]
      },
      {
       "id": "stock-rack",
       "name": "Cantilever steel-stock rack",
       "x": 192,
       "z": -45,
       "w": 4,
       "d": 24,
       "h": 8,
       "color": "#6b4a2f",
       "est": true,
       "src": [
        "9930"
       ]
      },
      {
       "id": "gantry-leg-w",
       "name": "A-frame gantry crane",
       "x": 179.5,
       "z": -85,
       "w": 1,
       "d": 6,
       "h": 12,
       "color": "#5a4030",
       "est": true,
       "src": [
        "9931"
       ]
      },
      {
       "id": "gantry-leg-e",
       "name": "Gantry leg",
       "x": 190.5,
       "z": -85,
       "w": 1,
       "d": 6,
       "h": 12,
       "color": "#5a4030",
       "est": true,
       "src": [
        "9931"
       ]
      },
      {
       "id": "gantry-beam",
       "name": "Gantry beam + chain hoist",
       "x": 185,
       "z": -85,
       "w": 12,
       "d": 0.6,
       "h": 0.6,
       "y": 11.4,
       "color": "#5a4030",
       "est": true,
       "src": [
        "9931"
       ]
      }
     ],
     "layouts": {
      "before": {
       "label": "Before (current shop)",
       "objects": [
        {
         "id": "cutting-table",
         "name": "Track-torch cutting table (yellow legs)",
         "x": 46,
         "z": 24,
         "w": 8,
         "d": 4,
         "h": 3,
         "rot": 15,
         "est": true,
         "src": [
          "9877",
          "9878"
         ]
        },
        {
         "id": "spool-rack-1",
         "name": "Wire spool rack (red)",
         "x": 30,
         "z": 20,
         "w": 3,
         "d": 2,
         "h": 5,
         "rot": 30,
         "est": true,
         "src": [
          "9877",
          "9878"
         ]
        },
        {
         "id": "spool-rack-2",
         "name": "Wire spool rack (red)",
         "x": 62,
         "z": 30,
         "w": 3,
         "d": 2,
         "h": 5,
         "rot": -20,
         "est": true,
         "src": [
          "9878",
          "9882"
         ]
        },
        {
         "id": "work-table-1",
         "name": "Blue steel work table (coupons)",
         "x": 24,
         "z": 27,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 10,
         "est": true,
         "src": [
          "9880",
          "9881"
         ]
        },
        {
         "id": "work-table-2",
         "name": "Blue steel work table (coupons)",
         "x": 52,
         "z": 15.5,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 40,
         "est": true,
         "src": [
          "9881",
          "9882"
         ]
        },
        {
         "id": "work-table-3",
         "name": "Blue steel work table (coupons)",
         "x": 74,
         "z": 22,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": -15,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "perf-bench",
         "name": "Yellow perforated bench",
         "x": 86,
         "z": 33,
         "w": 5,
         "d": 2.5,
         "h": 3,
         "rot": 70,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "utility-cart",
         "name": "Black utility cart",
         "x": 90,
         "z": 20,
         "w": 3,
         "d": 2,
         "h": 3,
         "rot": 30,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "forklift",
         "name": "Forklift",
         "x": 94,
         "z": 25,
         "w": 4,
         "d": 7,
         "h": 7,
         "rot": 90,
         "color": "#d6a31f",
         "est": true,
         "src": [
          "9882",
          "9931"
         ]
        },
        {
         "id": "drum-fan-1",
         "name": "Drum fan",
         "x": 36,
         "z": 14,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9876",
          "9887"
         ]
        },
        {
         "id": "drum-fan-2",
         "name": "Drum fan",
         "x": 70,
         "z": 36,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 20,
         "est": true,
         "src": [
          "9880"
         ]
        },
        {
         "id": "drum-fan-3",
         "name": "Drum fan",
         "x": 18,
         "z": 35.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": -30,
         "est": true,
         "src": [
          "9880"
         ]
        },
        {
         "id": "pedestal-fan-1",
         "name": "Pedestal fan",
         "x": 4,
         "z": 11.5,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "pedestal-fan-2",
         "name": "Pedestal fan",
         "x": 58,
         "z": 13.5,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9876"
         ]
        },
        {
         "id": "shopping-cart-1",
         "name": "Shopping cart (scrap)",
         "x": 5,
         "z": 15,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "rot": 20,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "shopping-cart-2",
         "name": "Shopping cart (scrap)",
         "x": 44,
         "z": 35.5,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "rot": 60,
         "est": true,
         "src": [
          "9876"
         ]
        },
        {
         "id": "water-cooler-table",
         "name": "Folding table w/ 2 water coolers",
         "x": 1.8,
         "z": 42,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 90,
         "est": true,
         "src": [
          "9879"
         ]
        },
        {
         "id": "water-jugs",
         "name": "Water jug pallets (x2)",
         "x": 11,
         "z": 4,
         "w": 8,
         "d": 4,
         "h": 3.5,
         "rot": 0,
         "est": true,
         "src": [
          "9884",
          "9885"
         ]
        },
        {
         "id": "rusty-shelf",
         "name": "Rusty open shelf (bags, helmets)",
         "x": 15.5,
         "z": 1,
         "w": 4,
         "d": 1.5,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9884"
         ]
        },
        {
         "id": "flammables-cabinet",
         "name": "Flammables cabinet (yellow)",
         "x": 9,
         "z": 7,
         "w": 3.5,
         "d": 1.5,
         "h": 5.5,
         "rot": 0,
         "color": "#d6b11f",
         "est": true,
         "src": [
          "9884"
         ]
        },
        {
         "id": "keter-boxes",
         "name": "Rolling toolboxes (x8)",
         "x": 34,
         "z": 5,
         "w": 10,
         "d": 2,
         "h": 3,
         "rot": 10,
         "est": true,
         "src": [
          "9884",
          "9885"
         ]
        },
        {
         "id": "ppe-cage",
         "name": "PPE mesh cabinet (earplugs)",
         "x": 1.2,
         "z": 11,
         "w": 3,
         "d": 2,
         "h": 6,
         "rot": 90,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "project-shelf",
         "name": "Student project shelf",
         "x": 1,
         "z": 15,
         "w": 4,
         "d": 1.5,
         "h": 5,
         "rot": 90,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "grinder-1",
         "name": "Pedestal grinder",
         "x": 22,
         "z": 6.5,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "grinder-2",
         "name": "Pedestal grinder",
         "x": 24.5,
         "z": 6.5,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "grinder-3",
         "name": "Pedestal grinder",
         "x": 60,
         "z": 46,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "drill-press",
         "name": "Drill press",
         "x": 46,
         "z": 46,
         "w": 2,
         "d": 2,
         "h": 5.5,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "broom-rack",
         "name": "Broom / shovel rack",
         "x": 34,
         "z": 44.5,
         "w": 3,
         "d": 1,
         "h": 5,
         "rot": 30,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "gas-cart-3",
         "name": "Oxy-fuel cart",
         "x": 70,
         "z": 26,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "loose-cylinder",
         "name": "Loose cylinder (unchained)",
         "x": 56,
         "z": 36.2,
         "w": 1,
         "d": 1,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "bobcat-welder",
         "name": "Engine-drive welder",
         "x": 85,
         "z": 47,
         "w": 3,
         "d": 5,
         "h": 3.5,
         "rot": 0,
         "color": "#c87533",
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "blue-totes",
         "name": "Big rolling totes (x4)",
         "x": 90.3,
         "z": 45.2,
         "w": 4,
         "d": 4,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "gas-cart-1",
         "name": "Oxy-fuel cart",
         "x": 93.5,
         "z": 43.6,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "gas-cart-2",
         "name": "Oxy-fuel cart",
         "x": 95.9,
         "z": 43.7,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 25,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "jobox",
         "name": "Jobsite box (spools, chop saw)",
         "x": 98.5,
         "z": 46.5,
         "w": 4,
         "d": 2.5,
         "h": 4,
         "rot": 90,
         "est": true,
         "src": [
          "9900"
         ]
        },
        {
         "id": "inverter-shelf",
         "name": "Steel shelf: ~10 spare inverters + rod oven",
         "x": 91,
         "z": 48.6,
         "w": 8,
         "d": 2.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9900",
          "9901"
         ]
        },
        {
         "id": "bender-bench",
         "name": "Bench w/ pipe benders + chop saw",
         "x": 85.2,
         "z": 43.25,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9901"
         ]
        },
        {
         "id": "toolroom-chair-1",
         "name": "Shop stool",
         "x": -4,
         "z": 8,
         "w": 1.5,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9902",
          "9903"
         ]
        },
        {
         "id": "toolroom-chair-2",
         "name": "Shop stool",
         "x": -6,
         "z": 9.5,
         "w": 1.5,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9902"
         ]
        },
        {
         "id": "hose-pile",
         "name": "Hoses & leads piled on the floor",
         "x": -6,
         "z": 5,
         "w": 4,
         "d": 3,
         "h": 1,
         "rot": 25,
         "est": true,
         "src": [
          "9902",
          "9903"
         ]
        },
        {
         "id": "tool-cart-red",
         "name": "Red rolling tool cart",
         "x": -3.5,
         "z": 19.5,
         "w": 3,
         "d": 2,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9917"
         ]
        },
        {
         "id": "air-mover",
         "name": "Blue air mover",
         "x": -7,
         "z": 18,
         "w": 2,
         "d": 2,
         "h": 2,
         "rot": 0,
         "est": true,
         "src": [
          "9914",
          "9910"
         ]
        },
        {
         "id": "ladder",
         "name": "Step ladder",
         "x": -7,
         "z": 20.8,
         "w": 2.5,
         "d": 1,
         "h": 7,
         "rot": 0,
         "est": true,
         "src": [
          "9915"
         ]
        },
        {
         "id": "cord-pile",
         "name": "Extension cords on the floor",
         "x": -3.5,
         "z": 16.5,
         "w": 3,
         "d": 3,
         "h": 1,
         "rot": 0,
         "est": true,
         "src": [
          "9914",
          "9917"
         ]
        },
        {
         "id": "coupon-cabinet",
         "name": "Steel cabinet: coupons + grinders",
         "x": -7,
         "z": 15.5,
         "w": 4,
         "d": 1.5,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9916"
         ]
        },
        {
         "id": "chalk-panel",
         "name": "Steel chalkboard panel",
         "x": -1,
         "z": 17,
         "w": 0.4,
         "d": 5,
         "h": 7,
         "rot": 0,
         "est": true,
         "src": [
          "9914"
         ]
        },
        {
         "id": "dust-table",
         "name": "Blue work table",
         "x": 89,
         "z": -8,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 20,
         "est": true,
         "src": [
          "9890",
          "9891"
         ]
        },
        {
         "id": "rod-stand-cart",
         "name": "Rod / pipe stand cart",
         "x": 83.5,
         "z": -19,
         "w": 3,
         "d": 2,
         "h": 4,
         "rot": 40,
         "est": true,
         "src": [
          "9890",
          "9891"
         ]
        },
        {
         "id": "orange-drum-fan",
         "name": "Orange drum fan",
         "x": 96.6,
         "z": -16.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 30,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "rolling-whiteboard",
         "name": "Rolling whiteboard",
         "x": 88.5,
         "z": -20.5,
         "w": 6,
         "d": 2,
         "h": 6,
         "rot": 15,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "wire-feeder-cart",
         "name": "Wire-feeder cart",
         "x": 95.5,
         "z": -8,
         "w": 2.5,
         "d": 2,
         "h": 4,
         "rot": 60,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "dust-cylinder-cart",
         "name": "Cylinder cart",
         "x": 93.5,
         "z": -17.8,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9890"
         ]
        },
        {
         "id": "rusty-fab-bench",
         "name": "Old fab bench w/ vise",
         "x": 95,
         "z": -21.5,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 10,
         "est": true,
         "src": [
          "9895",
          "9896"
         ]
        },
        {
         "id": "picnic-blue",
         "name": "Blue picnic tables (x10)",
         "x": 114,
         "z": 43,
         "w": 16,
         "d": 14,
         "h": 2.5,
         "rot": 0,
         "est": true,
         "src": [
          "9934",
          "9941"
         ]
        },
        {
         "id": "picnic-wood",
         "name": "Wood picnic tables (x2)",
         "x": 134,
         "z": 70,
         "w": 6,
         "d": 6,
         "h": 2.5,
         "rot": 10,
         "est": true,
         "src": [
          "9932",
          "9933"
         ]
        },
        {
         "id": "scrap-cart",
         "name": "Steel scrap cage cart",
         "x": 122,
         "z": 72,
         "w": 6,
         "d": 3,
         "h": 4,
         "rot": 20,
         "est": true,
         "src": [
          "9932"
         ]
        },
        {
         "id": "orange-cage-cart",
         "name": "Orange cage cart",
         "x": 158,
         "z": 86,
         "w": 4,
         "d": 2.5,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9933"
         ]
        },
        {
         "id": "truck-1",
         "name": "Training semi tractor",
         "x": 165,
         "z": 0,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 80,
         "color": "#e8e8e8",
         "est": true,
         "src": [
          "9929",
          "9938"
         ]
        },
        {
         "id": "truck-2",
         "name": "Training semi tractor",
         "x": 178,
         "z": 22,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 95,
         "color": "#e8e8e8",
         "est": true,
         "src": [
          "9929",
          "9938"
         ]
        },
        {
         "id": "truck-3",
         "name": "Training semi tractor (black)",
         "x": 156,
         "z": 38,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 70,
         "color": "#2a2a2a",
         "est": true,
         "src": [
          "9929",
          "9937"
         ]
        },
        {
         "id": "truck-chassis",
         "name": "Stripped cab-chassis",
         "x": 172,
         "z": -70,
         "w": 8,
         "d": 20,
         "h": 8,
         "rot": 20,
         "est": true,
         "src": [
          "9931"
         ]
        },
        {
         "id": "smoker-trailer",
         "name": "BBQ smoker trailer",
         "x": 176,
         "z": -100,
         "w": 6,
         "d": 12,
         "h": 6,
         "rot": 70,
         "est": true,
         "src": [
          "9931"
         ]
        },
        {
         "id": "stock-pipe",
         "name": "Pipe & tube bundles",
         "x": 176,
         "z": -52,
         "w": 20,
         "d": 6,
         "h": 2,
         "rot": 10,
         "est": true,
         "src": [
          "9930"
         ]
        },
        {
         "id": "stock-plate",
         "name": "Plate stack",
         "x": 168,
         "z": -42,
         "w": 10,
         "d": 6,
         "h": 1,
         "rot": 5,
         "est": true,
         "src": [
          "9930"
         ]
        },
        {
         "id": "stock-alu",
         "name": "Aluminum conduit bundle",
         "x": 156,
         "z": -50,
         "w": 12,
         "d": 3,
         "h": 1.5,
         "rot": -25,
         "est": true,
         "src": [
          "9930"
         ]
        }
       ]
      },
      "after": {
       "label": "After (draft reorg)",
       "objects": [
        {
         "id": "cutting-table",
         "name": "Track-torch cutting table (yellow legs)",
         "x": 6,
         "z": 30,
         "w": 8,
         "d": 4,
         "h": 3,
         "rot": 90,
         "est": true,
         "src": [
          "9877",
          "9878"
         ]
        },
        {
         "id": "spool-rack-1",
         "name": "Wire spool rack (red)",
         "x": 1.2,
         "z": 18.5,
         "w": 3,
         "d": 2,
         "h": 5,
         "rot": 90,
         "est": true,
         "src": [
          "9877",
          "9878"
         ]
        },
        {
         "id": "spool-rack-2",
         "name": "Wire spool rack (red)",
         "x": 1.2,
         "z": 21.7,
         "w": 3,
         "d": 2,
         "h": 5,
         "rot": 90,
         "est": true,
         "src": [
          "9878",
          "9882"
         ]
        },
        {
         "id": "work-table-1",
         "name": "Blue steel work table (coupons)",
         "x": 20,
         "z": 18.5,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9880",
          "9881"
         ]
        },
        {
         "id": "work-table-2",
         "name": "Blue steel work table (coupons)",
         "x": 40,
         "z": 18.5,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9881",
          "9882"
         ]
        },
        {
         "id": "work-table-3",
         "name": "Blue steel work table (coupons)",
         "x": 60,
         "z": 31.5,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "perf-bench",
         "name": "Yellow perforated bench",
         "x": 80,
         "z": 18.5,
         "w": 5,
         "d": 2.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "utility-cart",
         "name": "Black utility cart",
         "x": 93,
         "z": 31.5,
         "w": 3,
         "d": 2,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9882"
         ]
        },
        {
         "id": "forklift",
         "name": "Forklift",
         "x": 175,
         "z": -30,
         "w": 4,
         "d": 7,
         "h": 7,
         "rot": 0,
         "color": "#d6a31f",
         "est": true,
         "src": [
          "9882",
          "9931"
         ]
        },
        {
         "id": "drum-fan-1",
         "name": "Drum fan",
         "x": 30,
         "z": 18.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9876",
          "9887"
         ]
        },
        {
         "id": "drum-fan-2",
         "name": "Drum fan",
         "x": 50,
         "z": 31.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9880"
         ]
        },
        {
         "id": "drum-fan-3",
         "name": "Drum fan",
         "x": 80,
         "z": 31.5,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9880"
         ]
        },
        {
         "id": "pedestal-fan-1",
         "name": "Pedestal fan",
         "x": 70,
         "z": 18.5,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "pedestal-fan-2",
         "name": "Pedestal fan",
         "x": 10,
         "z": 18.5,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9876"
         ]
        },
        {
         "id": "shopping-cart-1",
         "name": "Shopping cart (scrap)",
         "x": 152,
         "z": 76,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "rot": 0,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "shopping-cart-2",
         "name": "Shopping cart (scrap)",
         "x": 155,
         "z": 76,
         "w": 2,
         "d": 3,
         "h": 3.5,
         "rot": 0,
         "est": true,
         "src": [
          "9876"
         ]
        },
        {
         "id": "water-cooler-table",
         "name": "Folding table w/ 2 water coolers",
         "x": 1.8,
         "z": 42,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 90,
         "est": true,
         "src": [
          "9879"
         ]
        },
        {
         "id": "water-jugs",
         "name": "Water jug pallets (x2)",
         "x": 4.5,
         "z": 47.5,
         "w": 8,
         "d": 4,
         "h": 3.5,
         "rot": 0,
         "est": true,
         "src": [
          "9884",
          "9885"
         ]
        },
        {
         "id": "rusty-shelf",
         "name": "Rusty open shelf (bags, helmets)",
         "x": 41,
         "z": 49,
         "w": 4,
         "d": 1.5,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9884"
         ]
        },
        {
         "id": "flammables-cabinet",
         "name": "Flammables cabinet (yellow)",
         "x": 30,
         "z": 49,
         "w": 3.5,
         "d": 1.5,
         "h": 5.5,
         "rot": 0,
         "color": "#d6b11f",
         "est": true,
         "src": [
          "9884"
         ]
        },
        {
         "id": "keter-boxes",
         "name": "Rolling toolboxes (x8)",
         "x": 20,
         "z": 48.5,
         "w": 10,
         "d": 2,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9884",
          "9885"
         ]
        },
        {
         "id": "ppe-cage",
         "name": "PPE mesh cabinet (earplugs)",
         "x": 1.2,
         "z": 11,
         "w": 3,
         "d": 2,
         "h": 6,
         "rot": 90,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "project-shelf",
         "name": "Student project shelf",
         "x": 1,
         "z": 14.6,
         "w": 4,
         "d": 1.5,
         "h": 5,
         "rot": 90,
         "est": true,
         "src": [
          "9887"
         ]
        },
        {
         "id": "grinder-1",
         "name": "Pedestal grinder",
         "x": 72,
         "z": 47,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "grinder-2",
         "name": "Pedestal grinder",
         "x": 74.5,
         "z": 47,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "grinder-3",
         "name": "Pedestal grinder",
         "x": 77,
         "z": 47,
         "w": 1.5,
         "d": 1.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "drill-press",
         "name": "Drill press",
         "x": 66,
         "z": 47,
         "w": 2,
         "d": 2,
         "h": 5.5,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "broom-rack",
         "name": "Broom / shovel rack",
         "x": 12,
         "z": 49.4,
         "w": 3,
         "d": 1,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9883"
         ]
        },
        {
         "id": "gas-cart-3",
         "name": "Oxy-fuel cart",
         "x": 88,
         "z": 43.6,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "loose-cylinder",
         "name": "Loose cylinder (unchained)",
         "x": 117,
         "z": 78.2,
         "w": 1,
         "d": 1,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "bobcat-welder",
         "name": "Engine-drive welder",
         "x": 146,
         "z": 66,
         "w": 3,
         "d": 5,
         "h": 3.5,
         "rot": 0,
         "color": "#c87533",
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "blue-totes",
         "name": "Big rolling totes (x4)",
         "x": 84.5,
         "z": 47.5,
         "w": 4,
         "d": 4,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9897"
         ]
        },
        {
         "id": "gas-cart-1",
         "name": "Oxy-fuel cart",
         "x": 90.5,
         "z": 43.6,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "gas-cart-2",
         "name": "Oxy-fuel cart",
         "x": 93,
         "z": 43.6,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9897",
          "9899"
         ]
        },
        {
         "id": "jobox",
         "name": "Jobsite box (spools, chop saw)",
         "x": 96.6,
         "z": 48.6,
         "w": 4,
         "d": 2.5,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9900"
         ]
        },
        {
         "id": "inverter-shelf",
         "name": "Steel shelf: ~10 spare inverters + rod oven",
         "x": 90.5,
         "z": 48.6,
         "w": 8,
         "d": 2.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9900",
          "9901"
         ]
        },
        {
         "id": "bender-bench",
         "name": "Bench w/ pipe benders + chop saw",
         "x": 55,
         "z": 48.6,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9901"
         ]
        },
        {
         "id": "toolroom-chair-1",
         "name": "Shop stool",
         "x": -3,
         "z": 11,
         "w": 1.5,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9902",
          "9903"
         ]
        },
        {
         "id": "toolroom-chair-2",
         "name": "Shop stool",
         "x": -6,
         "z": 4,
         "w": 1.5,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9902"
         ]
        },
        {
         "id": "hose-pile",
         "name": "Hoses & leads piled on the floor",
         "x": -8,
         "z": 6,
         "w": 4,
         "d": 3,
         "h": 1,
         "rot": 0,
         "y": 3,
         "est": true,
         "src": [
          "9902",
          "9903"
         ]
        },
        {
         "id": "tool-cart-red",
         "name": "Red rolling tool cart",
         "x": -2,
         "z": 4.5,
         "w": 3,
         "d": 2,
         "h": 4,
         "rot": 90,
         "est": true,
         "src": [
          "9917"
         ]
        },
        {
         "id": "air-mover",
         "name": "Blue air mover",
         "x": 34,
         "z": 48.5,
         "w": 2,
         "d": 2,
         "h": 2,
         "rot": 0,
         "est": true,
         "src": [
          "9914",
          "9910"
         ]
        },
        {
         "id": "ladder",
         "name": "Step ladder",
         "x": -2,
         "z": 20.6,
         "w": 2.5,
         "d": 1,
         "h": 7,
         "rot": 0,
         "est": true,
         "src": [
          "9915"
         ]
        },
        {
         "id": "cord-pile",
         "name": "Extension cords on the floor",
         "x": -8,
         "z": 10,
         "w": 3,
         "d": 3,
         "h": 1,
         "rot": 0,
         "y": 3,
         "est": true,
         "src": [
          "9914",
          "9917"
         ]
        },
        {
         "id": "coupon-cabinet",
         "name": "Steel cabinet: coupons + grinders",
         "x": 47,
         "z": 49,
         "w": 4,
         "d": 1.5,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9916"
         ]
        },
        {
         "id": "chalk-panel",
         "name": "Steel chalkboard panel",
         "x": 0.65,
         "z": 30,
         "w": 0.4,
         "d": 5,
         "h": 7,
         "rot": 0,
         "est": true,
         "src": [
          "9914"
         ]
        },
        {
         "id": "dust-table",
         "name": "Blue work table",
         "x": 92,
         "z": -7.5,
         "w": 6,
         "d": 3,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9890",
          "9891"
         ]
        },
        {
         "id": "rod-stand-cart",
         "name": "Rod / pipe stand cart",
         "x": 84,
         "z": -21,
         "w": 3,
         "d": 2,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9890",
          "9891"
         ]
        },
        {
         "id": "orange-drum-fan",
         "name": "Orange drum fan",
         "x": 86.5,
         "z": -9,
         "w": 3,
         "d": 1.5,
         "h": 3,
         "rot": 0,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "rolling-whiteboard",
         "name": "Rolling whiteboard",
         "x": 91,
         "z": -20.5,
         "w": 6,
         "d": 2,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "wire-feeder-cart",
         "name": "Wire-feeder cart",
         "x": 83.8,
         "z": -7,
         "w": 2.5,
         "d": 2,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9893"
         ]
        },
        {
         "id": "dust-cylinder-cart",
         "name": "Cylinder cart",
         "x": 98.9,
         "z": -25.5,
         "w": 2,
         "d": 2,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9890"
         ]
        },
        {
         "id": "rusty-fab-bench",
         "name": "Old fab bench w/ vise",
         "x": 98.6,
         "z": -8,
         "w": 6,
         "d": 2.5,
         "h": 3,
         "rot": 90,
         "est": true,
         "src": [
          "9895",
          "9896"
         ]
        },
        {
         "id": "picnic-blue",
         "name": "Blue picnic tables (x10)",
         "x": 114,
         "z": 43,
         "w": 16,
         "d": 14,
         "h": 2.5,
         "rot": 0,
         "est": true,
         "src": [
          "9934",
          "9941"
         ]
        },
        {
         "id": "picnic-wood",
         "name": "Wood picnic tables (x2)",
         "x": 106,
         "z": 71,
         "w": 6,
         "d": 6,
         "h": 2.5,
         "rot": 0,
         "est": true,
         "src": [
          "9932",
          "9933"
         ]
        },
        {
         "id": "scrap-cart",
         "name": "Steel scrap cage cart",
         "x": 131,
         "z": 77,
         "w": 6,
         "d": 3,
         "h": 4,
         "rot": 0,
         "est": true,
         "src": [
          "9932"
         ]
        },
        {
         "id": "orange-cage-cart",
         "name": "Orange cage cart",
         "x": 156,
         "z": 86,
         "w": 4,
         "d": 2.5,
         "h": 5,
         "rot": 0,
         "est": true,
         "src": [
          "9933"
         ]
        },
        {
         "id": "truck-1",
         "name": "Training semi tractor",
         "x": 165,
         "z": 20,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 0,
         "color": "#e8e8e8",
         "est": true,
         "src": [
          "9929",
          "9938"
         ]
        },
        {
         "id": "truck-2",
         "name": "Training semi tractor",
         "x": 176,
         "z": 20,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 0,
         "color": "#e8e8e8",
         "est": true,
         "src": [
          "9929",
          "9938"
         ]
        },
        {
         "id": "truck-3",
         "name": "Training semi tractor (black)",
         "x": 187,
         "z": 20,
         "w": 8,
         "d": 24,
         "h": 11,
         "rot": 0,
         "color": "#2a2a2a",
         "est": true,
         "src": [
          "9929",
          "9937"
         ]
        },
        {
         "id": "truck-chassis",
         "name": "Stripped cab-chassis",
         "x": 185,
         "z": -95,
         "w": 8,
         "d": 20,
         "h": 8,
         "rot": 0,
         "est": true,
         "src": [
          "9931"
         ]
        },
        {
         "id": "smoker-trailer",
         "name": "BBQ smoker trailer",
         "x": 160,
         "z": -100,
         "w": 6,
         "d": 12,
         "h": 6,
         "rot": 0,
         "est": true,
         "src": [
          "9931"
         ]
        },
        {
         "id": "stock-pipe",
         "name": "Pipe & tube bundles",
         "x": 186,
         "z": -45,
         "w": 20,
         "d": 6,
         "h": 2,
         "rot": 90,
         "est": true,
         "src": [
          "9930"
         ]
        },
        {
         "id": "stock-plate",
         "name": "Plate stack",
         "x": 186,
         "z": -28,
         "w": 10,
         "d": 6,
         "h": 1,
         "rot": 0,
         "est": true,
         "src": [
          "9930"
         ]
        },
        {
         "id": "stock-alu",
         "name": "Aluminum conduit bundle",
         "x": 186,
         "z": -62,
         "w": 12,
         "d": 3,
         "h": 1.5,
         "rot": 90,
         "est": true,
         "src": [
          "9930"
         ]
        }
       ]
      }
     }
    },
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
     "label": "Gemini · run 1",
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
       "label": "After (Gemini run 1)",
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
    },
    gemini2: {
     "label": "Gemini \u00b7 run 2 (dimensions)",
     "frame": "Origin (0,0) is the North-West corner of the 100x50 ft MAIN shop floor (x: 0..100 East, z: 0..50 South). North of the z=0 wall (z: -23..0) sit Rooms 1-4 (widths 23 + 18.5 + 19.5 + 18 = 79 ft from x=0 to x=79, depth 23 ft) and the DUST BOOTHS bay (x: 78..100, z: -27..0, 22x27 ft). The Tool Room (14x10 ft) and TR Sidebox (7.5x10 ft) sit along the North-West wall inside the main footprint, and the YARD (253x98 ft) lies South of the z=50 roll-up doors.",
     "note": "Gemini rerun with the real dimensions. Claude's additions: a doorway into the tool room and side box (Gemini gave none), the dust-booth bay drawn 21 ft wide instead of 22 (Gemini's frame overlaps Room 4 by 1 ft), and Rooms 1-4 as solid blocks since no doors were given. Everything is still Gemini's estimate.",
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
      },
      {
       "id": "dust",
       "name": "Dust booths bay",
       "x0": 79,
       "z0": -27,
       "w": 21,
       "d": 27,
       "h": 12,
       "spawn": {
        "x": 89,
        "z": -4,
        "yaw": 0
       }
      }
     ],
     "doors": [
      "exit-door-north",
      "dust-booth-opening",
      "rollup-door-1",
      "rollup-door-2"
     ],
     "hide": [
      "dust-booths-bay"
     ],
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
      "booth-row-aux": {
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
       },
       "skip": [
        "n",
        "w"
       ]
      },
      "tool-room-sidebox": {
       "door": {
        "side": "s",
        "w": 3.5,
        "at": 0
       },
       "skip": [
        "n"
       ]
      }
     },
     "planLabels": ["room-1","room-2","room-3","room-4","tool-room-main","tool-room-sidebox"],
     "fixed": [
      {
       "id": "room-1",
       "name": "Room 1 (Classroom/Office, 23x23 ft)",
       "x": 11.5,
       "z": -11.5,
       "w": 23.0,
       "d": 23.0,
       "h": 10.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "room-2",
       "name": "Room 2 (Classroom/Office, 18.5x23 ft)",
       "x": 32.25,
       "z": -11.5,
       "w": 18.5,
       "d": 23.0,
       "h": 10.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "room-3",
       "name": "Room 3 (Classroom/Office, 19.5x23 ft)",
       "x": 51.25,
       "z": -11.5,
       "w": 19.5,
       "d": 23.0,
       "h": 10.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "room-4",
       "name": "Room 4 (Classroom/Office, 18x23 ft)",
       "x": 70.0,
       "z": -11.5,
       "w": 18.0,
       "d": 23.0,
       "h": 10.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "dust-booths-bay",
       "name": "Dedicated Dust Booths / Grinding & Fab Bay (22x27 ft)",
       "x": 89.0,
       "z": -13.5,
       "w": 22.0,
       "d": 27.0,
       "h": 12.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-room-main",
       "name": "Main Tool Room enclosure (14x10 ft)",
       "x": 7.0,
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
       "name": "TR Sidebox enclosure (7.5x10 ft)",
       "x": 17.75,
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
       "x": 7.0,
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
       "x": 1.0,
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
       "x": 13.0,
       "z": 5.0,
       "w": 2.0,
       "d": 6.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "booth-row-north",
       "name": "North fixed row of 12 welding booths (blue frames, orange curtains, plumbed gas/power)",
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
       "name": "South fixed row of 12 welding booths (blue frames, orange curtains, plumbed gas/power)",
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
       "id": "booth-row-aux",
       "name": "Auxiliary 3-booth training bank (#9898)",
       "x": 92.0,
       "z": 17.5,
       "w": 12.0,
       "d": 5.0,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "elec-panels-alcove",
       "name": "Main electrical panels & switchgear bank (#9883, fixed conduit)",
       "x": 72.0,
       "z": 0.5,
       "w": 10.0,
       "d": 1.0,
       "h": 6.5,
       "y": 1.0,
       "rot": 0,
       "est": true
      },
      {
       "id": "elec-panel-mid",
       "name": "Secondary electrical disconnect & panel (#9886)",
       "x": 60.0,
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
       "x": 65.5,
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
       "name": "North corridor/exit door (#9888/#9894)",
       "x": 27.5,
       "z": 0.25,
       "w": 3.5,
       "d": 0.5,
       "h": 7.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "dust-booth-opening",
       "name": "Access opening into Dust Booths bay (22x27 ft)",
       "x": 89.0,
       "z": 0.0,
       "w": 10.0,
       "d": 0.5,
       "h": 10.0,
       "y": 0,
       "rot": 0,
       "est": true
      },
      {
       "id": "rollup-door-1",
       "name": "South wall roll-up bay door 1 to Yard (#9896)",
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
       "name": "South wall roll-up bay door 2 to Yard (#9896)",
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
         "z": -10.0,
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
         "x": 91.0,
         "z": -10.0,
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
         "x": 98.0,
         "z": -12.0,
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
         "z": -4.0,
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
         "x": 54.0,
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
         "x": 58.0,
         "z": 4.5,
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
         "z": 4.5,
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
         "x": 34.0,
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
         "x": 41.0,
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
         "x": 44.0,
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
         "x": 47.0,
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
         "x": 50.5,
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
         "x": 67.5,
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
         "x": 54.0,
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
         "x": 23.5,
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
         "x": 26.5,
         "z": 2.5,
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
         "x": 96.0,
         "z": 8.0,
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
         "x": 7.0,
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
       "label": "After (Gemini run 2)",
       "objects": [
        {
         "id": "pedestal-grinder-1",
         "name": "Bench grinder on pedestal stand 1 (#9888)",
         "x": 80.5,
         "z": -24.0,
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
         "x": 85.0,
         "z": -24.0,
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
         "x": 89.5,
         "z": -24.0,
         "w": 2.0,
         "d": 2.0,
         "h": 4.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "drill-press",
         "name": "Floor drill press near exit (#9894)",
         "x": 94.5,
         "z": -24.0,
         "w": 2.0,
         "d": 2.5,
         "h": 5.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "heavy-press-bench",
         "name": "Heavy steel table with vise & hydraulic press blocking roll-up door (#9896)",
         "x": 97.5,
         "z": -14.0,
         "w": 8.0,
         "d": 3.5,
         "h": 4.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "engine-stand-fixture",
         "name": "Heavy weld fixture / engine stand in center aisle (#9875)",
         "x": 81.0,
         "z": -14.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 90,
         "est": true
        },
        {
         "id": "open-steel-table-1",
         "name": "Square steel worktable with trash can (#9879)",
         "x": 89.0,
         "z": -14.0,
         "w": 4.0,
         "d": 4.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-1",
         "name": "Rolling dual-cylinder oxy-fuel/shielding gas cart 1 (#9875)",
         "x": 2.0,
         "z": 24.0,
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
         "z": 28.5,
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
         "z": 33.0,
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
         "z": 37.5,
         "w": 3.0,
         "d": 2.5,
         "h": 5.0,
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
         "id": "spool-rack-cart",
         "name": "Red rolling wire-spool rack cart (#9879)",
         "x": 21.0,
         "z": 17.5,
         "w": 5.0,
         "d": 3.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "center-aisle-bench",
         "name": "Small steel welding bench in center aisle (#9875)",
         "x": 21.0,
         "z": 32.5,
         "w": 4.0,
         "d": 2.5,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "open-steel-table-2",
         "name": "Yellow-leg steel worktable (#9879)",
         "x": 15.0,
         "z": 32.5,
         "w": 4.0,
         "d": 3.0,
         "h": 3.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "blue-locker-bank",
         "name": "Blue ventilated metal locker unit (#9888)",
         "x": 35.5,
         "z": 1.5,
         "w": 5.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "helmet-cubby-rack",
         "name": "Large steel cubby rack for student helmets/gear (#9883/#9888)",
         "x": 42.0,
         "z": 1.5,
         "w": 6.0,
         "d": 2.0,
         "h": 7.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "student-toolbox-group-1",
         "name": "Cluster of rolling black student toolboxes A (#9883)",
         "x": 48.0,
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
         "x": 53.0,
         "z": 2.0,
         "w": 4.0,
         "d": 3.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "wire-mesh-shelf-1",
         "name": "Expanded-metal storage shelf 1 (#9883)",
         "x": 62.0,
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
         "x": 67.0,
         "z": 48.0,
         "w": 4.0,
         "d": 2.0,
         "h": 6.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "metal-cabinet-black",
         "name": "Black mesh storage cabinet (#9888)",
         "x": 71.5,
         "z": 48.0,
         "w": 3.0,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "broom-shovel-rack",
         "name": "Mobile broom, shovel & squeegee rack (#9894)",
         "x": 76.0,
         "z": 48.0,
         "w": 3.5,
         "d": 2.0,
         "h": 5.0,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "shopping-cart-1",
         "name": "Metal shopping cart 1 (#9886)",
         "x": 80.5,
         "z": 48.0,
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
         "x": 84.5,
         "z": 48.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "spare-welders-rack",
         "name": "Low rack with boxed/spare welders (#9898)",
         "x": 92.0,
         "z": 48.0,
         "w": 8.0,
         "d": 2.5,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-drum-1",
         "name": "Black drum floor fan blocking panel (#9883/#9886)",
         "x": 86.5,
         "z": 25.0,
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
         "z": 12.0,
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
         "x": 81.0,
         "z": -5.0,
         "w": 3.0,
         "d": 2.0,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "toolroom-floor-totes",
         "name": "Mobile tool cases & floor bin stack in tool room (#9912)",
         "x": 17.75,
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
    },
    gpt: {
     "label": "ChatGPT",
     "frame": {
      "units": "feet",
      "coordinate_system": "right-handed XZ ground plane, Y vertical",
      "rotation_convention": "degrees clockwise viewed from above",
      "object_anchor": "center of ground footprint",
      "height_anchor": "bottom edge measured from floor",
      "main_shop": {
       "x_zero_wall": "west end wall, estimated",
       "x_positive": "east along the 100-foot shop length",
       "z_zero_wall": "south long wall, estimated",
       "z_positive": "north across the 50-foot shop width",
       "bounds": {
        "x_min": 0,
        "x_max": 100,
        "z_min": 0,
        "z_max": 50
       },
       "width": 100,
       "depth": 50
      },
      "tool_room": {
       "coordinate_system": "same XZ axes as main shop",
       "bounds": {
        "x_min": 110,
        "x_max": 120,
        "z_min": 0,
        "z_max": 14
       },
       "width": 10,
       "depth": 14,
       "est": true,
       "note": "Represented as a separate room east of the main shop for walkthrough purposes. Actual physical adjacency is unverified."
      },
      "tool_room_sidebox": {
       "coordinate_system": "same XZ axes as main shop",
       "bounds": {
        "x_min": 122,
        "x_max": 129.5,
        "z_min": 0,
        "z_max": 10
       },
       "width": 7.5,
       "depth": 10,
       "est": true,
       "note": "Represented separately. Actual entrance and adjacency require confirmation."
      },
      "yard": {
       "coordinate_system": "same XZ axes",
       "bounds": {
        "x_min": 0,
        "x_max": 253,
        "z_min": 100,
        "z_max": 198
       },
       "width": 253,
       "depth": 98,
       "est": true,
       "note": "Conceptual exterior scene, not geographically registered to the building."
      },
      "model_notes": [
       "All coordinates and footprints marked est are visual approximations.",
       "The source photographs do not establish a surveyed floor plan.",
       "The booth rows are represented as continuous fixed rectangular envelopes rather than individually modeled cubicles.",
       "Rows are assumed to contain approximately 12 to 16 booths each; the exact count is not asserted.",
       "The clear central area is modeled between z=18 and z=32.",
       "The primary circulation paths are approximately z=18 to 23 and z=27 to 32.",
       "Movable equipment in the central zone is restricted to z=23 through z=27 in the after layout.",
       "Before and after objects use identical dimensions and identifiers.",
       "Aisle widths refer to modeled floor footprints, not verified existing conditions.",
       "Cylinder locations and grinding operations remain conditional on safety review.",
       "Fixed equipment and utility positions are illustrative, not approved installation coordinates.",
       "No intentional modeled object footprint overlaps are present."
      ]
     },
     "note": "ChatGPT's reorg with coordinates. Its z axis ran north and the viewer's runs south, so z is flipped (z becomes 50 - z) to keep left and right as ChatGPT described them. It put the tool room, side box and yard as separate spaces with no connection to the shop: use Next room to visit them. Booths are drawn as 16 per row (ChatGPT said 12 to 16 and did not pick). All estimates.",
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
       "x0": 110,
       "z0": 36,
       "w": 10,
       "d": 14,
       "h": 9,
       "spawn": {
        "x": 115,
        "z": 47.5,
        "yaw": 0
       }
      },
      {
       "id": "sidebox",
       "name": "Side box",
       "x0": 122,
       "z0": 40,
       "w": 7.5,
       "d": 10,
       "h": 9,
       "spawn": {
        "x": 125.75,
        "z": 47.5,
        "yaw": 0
       }
      },
      {
       "id": "yard",
       "name": "Yard",
       "x0": 0,
       "z0": -148,
       "w": 253,
       "d": 98,
       "h": 4,
       "outdoor": true,
       "spawn": {
        "x": 50,
        "z": -58,
        "yaw": 0
       }
      }
     ],
     "planRooms": [
      "main",
      "toolroom",
      "sidebox"
     ],
     "doors": [
      "roll-up-door",
      "pedestrian-exit",
      "tool-room-door",
      "sidebox-door"
     ],
     "hide": [],
     "decor": {
      "booth-row-north": {
       "type": "booths",
       "count": 16,
       "open": "+z"
      },
      "booth-row-south": {
       "type": "booths",
       "count": 16,
       "open": "-z"
      }
     },
     "fixed": [
      {
       "id": "booth-row-south",
       "name": "Fixed South Welding Booth Row",
       "space": "main_shop",
       "x": 50,
       "z": 38,
       "w": 80,
       "d": 12,
       "h": 8,
       "y": 0,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875",
        "9879",
        "9886"
       ],
       "notes": "Blue steel booth frames, orange curtains, fixed welding infrastructure. Existing booth row retained."
      },
      {
       "id": "booth-row-north",
       "name": "Fixed North Welding Booth Row",
       "space": "main_shop",
       "x": 50,
       "z": 12,
       "w": 80,
       "d": 12,
       "h": 8,
       "y": 0,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875",
        "9879",
        "9886"
       ],
       "notes": "Second fixed booth row retained."
      },
      {
       "id": "electrical-panel-bank-west",
       "name": "West Electrical Panel Bank",
       "space": "main_shop",
       "x": 5,
       "z": 0.25,
       "w": 4,
       "d": 0.5,
       "h": 6,
       "y": 1,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9883"
       ],
       "notes": "Location estimated. Reserve a minimum 3-foot clear working depth, plus other required working-space dimensions."
      },
      {
       "id": "electrical-panel-bank-east",
       "name": "East Electrical Distribution",
       "space": "main_shop",
       "x": 95,
       "z": 0.25,
       "w": 4,
       "d": 0.5,
       "h": 6,
       "y": 1,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9883"
       ],
       "notes": "Illustrative position; actual panel count and placement must be verified."
      },
      {
       "id": "roll-up-door",
       "name": "Main Roll-Up Door",
       "space": "main_shop",
       "x": 5,
       "z": 50,
       "w": 9,
       "d": 0,
       "h": 12,
       "y": 0,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9896"
       ],
       "notes": "Wall assignment and opening width estimated. Maintain clear approach and full operation."
      },
      {
       "id": "pedestrian-exit",
       "name": "Pedestrian Exit",
       "space": "main_shop",
       "x": 96,
       "z": 50,
       "w": 3,
       "d": 0,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9894"
       ],
       "notes": "Exit position estimated from imagery. All actual exits require field verification."
      },
      {
       "id": "overhead-gas-line-south",
       "name": "South Booth Gas and Air Distribution",
       "space": "main_shop",
       "x": 50,
       "z": 38,
       "w": 80,
       "d": 0.5,
       "h": 0.5,
       "y": 11,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875",
        "9879"
       ],
       "notes": "Elevated fixed utility representation. Not to be relocated."
      },
      {
       "id": "overhead-gas-line-north",
       "name": "North Booth Gas and Air Distribution",
       "space": "main_shop",
       "x": 50,
       "z": 12,
       "w": 80,
       "d": 0.5,
       "h": 0.5,
       "y": 11,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875",
        "9879"
       ],
       "notes": "Elevated fixed utility representation."
      },
      {
       "id": "overhead-ducting",
       "name": "Overhead Ventilation Duct",
       "space": "main_shop",
       "x": 50,
       "z": 4,
       "w": 75,
       "d": 2,
       "h": 2,
       "y": 13,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9883",
        "9886"
       ],
       "notes": "Conceptual elevated duct envelope."
      },
      {
       "id": "fixed-hose-reel-south",
       "name": "Fixed Hose Reel South",
       "space": "main_shop",
       "x": 8,
       "z": 44,
       "w": 2,
       "d": 1,
       "h": 2,
       "y": 8,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875"
       ]
      },
      {
       "id": "fixed-hose-reel-north",
       "name": "Fixed Hose Reel North",
       "space": "main_shop",
       "x": 8,
       "z": 6,
       "w": 2,
       "d": 1,
       "h": 2,
       "y": 8,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9875"
       ]
      },
      {
       "id": "ceiling-light-south",
       "name": "South Row Overhead Lighting",
       "space": "main_shop",
       "x": 50,
       "z": 38,
       "w": 70,
       "d": 1,
       "h": 0.5,
       "y": 15,
       "rot": 0,
       "est": true
      },
      {
       "id": "ceiling-light-north",
       "name": "North Row Overhead Lighting",
       "space": "main_shop",
       "x": 50,
       "z": 12,
       "w": 70,
       "d": 1,
       "h": 0.5,
       "y": 15,
       "rot": 0,
       "est": true
      },
      {
       "id": "fire-extinguisher-west",
       "name": "Wall-Mounted Fire Extinguisher West",
       "space": "main_shop",
       "x": 2,
       "z": 4,
       "w": 0.75,
       "d": 0.75,
       "h": 2,
       "y": 2,
       "rot": 0,
       "est": true,
       "source_photos": [
        "9883"
       ],
       "notes": "Illustrative position. Preserve accessible mounting and clear approach."
      },
      {
       "id": "fire-extinguisher-east",
       "name": "Wall-Mounted Fire Extinguisher East",
       "space": "main_shop",
       "x": 98,
       "z": 4,
       "w": 0.75,
       "d": 0.75,
       "h": 2,
       "y": 2,
       "rot": 0,
       "est": true
      },
      {
       "id": "tool-room-door",
       "name": "Tool Room Entrance",
       "space": "tool_room",
       "x": 115,
       "z": 50,
       "w": 3,
       "d": 0,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true,
       "notes": "Invented doorway placement for navigation; not photo-verified."
      },
      {
       "id": "sidebox-door",
       "name": "Tool Room Sidebox Entrance",
       "space": "tool_room_sidebox",
       "x": 125.75,
       "z": 50,
       "w": 3,
       "d": 0,
       "h": 7,
       "y": 0,
       "rot": 0,
       "est": true,
       "notes": "Invented doorway placement for navigation."
      }
     ],
     "layouts": {
      "before": {
       "label": "Before (current shop)",
       "objects": [
        {
         "id": "fabrication-bench-01",
         "name": "Heavy Fabrication Workbench",
         "space": "main_shop",
         "x": 22,
         "z": 25,
         "w": 6,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "fabrication-bench-02",
         "name": "Secondary Fabrication Bench",
         "space": "main_shop",
         "x": 34,
         "z": 25,
         "w": 5,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "instructor-station",
         "name": "Instructor Standing Station",
         "space": "main_shop",
         "x": 48,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "wire-spool-rack",
         "name": "Rolling Wire Spool Rack",
         "space": "main_shop",
         "x": 60,
         "z": 25,
         "w": 4,
         "d": 3,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "utility-cart-01",
         "name": "Rolling Utility Cart 1",
         "space": "main_shop",
         "x": 70,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "utility-cart-02",
         "name": "Rolling Utility Cart 2",
         "space": "main_shop",
         "x": 79,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-01",
         "name": "Portable Gas Cylinder Cart 1",
         "space": "main_shop",
         "x": 6,
         "z": 28,
         "w": 2,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-02",
         "name": "Portable Gas Cylinder Cart 2",
         "space": "main_shop",
         "x": 94,
         "z": 25,
         "w": 2,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-01",
         "name": "Pedestal Grinder 1",
         "space": "main_shop",
         "x": 18,
         "z": 4,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-02",
         "name": "Pedestal Grinder 2",
         "space": "main_shop",
         "x": 29,
         "z": 4,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-03",
         "name": "Pedestal Grinder 3",
         "space": "main_shop",
         "x": 40,
         "z": 4,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "lockers-01",
         "name": "Blue Steel Student Lockers",
         "space": "main_shop",
         "x": 54,
         "z": 3,
         "w": 5,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-01",
         "name": "Industrial Floor Fan 1",
         "space": "main_shop",
         "x": 64,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-02",
         "name": "Industrial Floor Fan 2",
         "space": "main_shop",
         "x": 74,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-03",
         "name": "Industrial Floor Fan 3",
         "space": "main_shop",
         "x": 84,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "equipment-cart-01",
         "name": "Welding Equipment Transport Cart",
         "space": "main_shop",
         "x": 95,
         "z": 13,
         "w": 3,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "consumable-cabinet",
         "name": "Freestanding Consumable Cabinet",
         "space": "main_shop",
         "x": 95,
         "z": 38,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "material-rack-01",
         "name": "Small Material Storage Rack",
         "space": "main_shop",
         "x": 95,
         "z": 32,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf-01",
         "name": "Tool Room Steel Shelf 1",
         "space": "tool_room",
         "x": 112,
         "z": 39,
         "w": 2,
         "d": 4,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf-02",
         "name": "Tool Room Steel Shelf 2",
         "space": "tool_room",
         "x": 118,
         "z": 39,
         "w": 2,
         "d": 4,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "parts-bin-rack",
         "name": "Small Parts Bin Rack",
         "space": "tool_room",
         "x": 115,
         "z": 37.5,
         "w": 3,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-worktable",
         "name": "Tool Room Worktable",
         "space": "tool_room",
         "x": 115,
         "z": 44,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "hose-rack",
         "name": "Freestanding Hose Storage Rack",
         "space": "tool_room_sidebox",
         "x": 124,
         "z": 43,
         "w": 2,
         "d": 3,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "regulator-cabinet",
         "name": "Regulator and Fittings Cabinet",
         "space": "tool_room_sidebox",
         "x": 127.5,
         "z": 43,
         "w": 2,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "steel-stock-rack",
         "name": "Steel Stock Ground Rack",
         "space": "yard",
         "x": 60,
         "z": -75,
         "w": 20,
         "d": 4,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "yard-scrap-bin",
         "name": "Steel Scrap Collection Bin",
         "space": "yard",
         "x": 95,
         "z": -75,
         "w": 8,
         "d": 6,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        }
       ]
      },
      "after": {
       "label": "After (ChatGPT)",
       "objects": [
        {
         "id": "fabrication-bench-01",
         "name": "Heavy Fabrication Workbench",
         "space": "main_shop",
         "x": 22,
         "z": 25,
         "w": 6,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "fabrication-bench-02",
         "name": "Secondary Fabrication Bench",
         "space": "main_shop",
         "x": 34,
         "z": 25,
         "w": 5,
         "d": 3,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "instructor-station",
         "name": "Instructor Standing Station",
         "space": "main_shop",
         "x": 50,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3.5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "wire-spool-rack",
         "name": "Rolling Wire Spool Rack",
         "space": "main_shop",
         "x": 65,
         "z": 25,
         "w": 4,
         "d": 3,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "utility-cart-01",
         "name": "Rolling Utility Cart 1",
         "space": "main_shop",
         "x": 75,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "utility-cart-02",
         "name": "Rolling Utility Cart 2",
         "space": "main_shop",
         "x": 84,
         "z": 25,
         "w": 3,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "gas-cart-01",
         "name": "Portable Gas Cylinder Cart 1",
         "space": "main_shop",
         "x": 5,
         "z": 33,
         "w": 2,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true,
         "placement_notes": "Conditional secured cylinder location; verify gas type, protection, ventilation, and safe access."
        },
        {
         "id": "gas-cart-02",
         "name": "Portable Gas Cylinder Cart 2",
         "space": "main_shop",
         "x": 5,
         "z": 17,
         "w": 2,
         "d": 2,
         "h": 5,
         "y": 0,
         "rot": 0,
         "est": true,
         "placement_notes": "Conditional secured location for cylinders in use; not designated bulk cylinder storage."
        },
        {
         "id": "grinder-01",
         "name": "Pedestal Grinder 1",
         "space": "main_shop",
         "x": 20,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true,
         "placement_notes": "Conditional grinding zone. Relocate only if not anchored or after qualified disconnection and reinstallation."
        },
        {
         "id": "grinder-02",
         "name": "Pedestal Grinder 2",
         "space": "main_shop",
         "x": 29,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "grinder-03",
         "name": "Pedestal Grinder 3",
         "space": "main_shop",
         "x": 38,
         "z": 3,
         "w": 2,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "lockers-01",
         "name": "Blue Steel Student Lockers",
         "space": "main_shop",
         "x": 56,
         "z": 3,
         "w": 5,
         "d": 2,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-01",
         "name": "Industrial Floor Fan 1",
         "space": "main_shop",
         "x": 68,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-02",
         "name": "Industrial Floor Fan 2",
         "space": "main_shop",
         "x": 79,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "floor-fan-03",
         "name": "Industrial Floor Fan 3",
         "space": "main_shop",
         "x": 89,
         "z": 3,
         "w": 3,
         "d": 3,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "equipment-cart-01",
         "name": "Welding Equipment Transport Cart",
         "space": "main_shop",
         "x": 95,
         "z": 12,
         "w": 3,
         "d": 2,
         "h": 4,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "consumable-cabinet",
         "name": "Freestanding Consumable Cabinet",
         "space": "main_shop",
         "x": 95,
         "z": 38,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "material-rack-01",
         "name": "Small Material Storage Rack",
         "space": "main_shop",
         "x": 95,
         "z": 31,
         "w": 4,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf-01",
         "name": "Tool Room Steel Shelf 1",
         "space": "tool_room",
         "x": 112,
         "z": 39,
         "w": 2,
         "d": 4,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-shelf-02",
         "name": "Tool Room Steel Shelf 2",
         "space": "tool_room",
         "x": 118,
         "z": 39,
         "w": 2,
         "d": 4,
         "h": 7,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "parts-bin-rack",
         "name": "Small Parts Bin Rack",
         "space": "tool_room",
         "x": 115,
         "z": 37.5,
         "w": 3,
         "d": 1.5,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "tool-worktable",
         "name": "Tool Room Worktable",
         "space": "tool_room",
         "x": 115,
         "z": 44,
         "w": 4,
         "d": 2,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "hose-rack",
         "name": "Freestanding Hose Storage Rack",
         "space": "tool_room_sidebox",
         "x": 124,
         "z": 43,
         "w": 2,
         "d": 3,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "regulator-cabinet",
         "name": "Regulator and Fittings Cabinet",
         "space": "tool_room_sidebox",
         "x": 127.5,
         "z": 43,
         "w": 2,
         "d": 2,
         "h": 6,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "steel-stock-rack",
         "name": "Steel Stock Ground Rack",
         "space": "yard",
         "x": 45,
         "z": -75,
         "w": 20,
         "d": 4,
         "h": 3,
         "y": 0,
         "rot": 0,
         "est": true
        },
        {
         "id": "yard-scrap-bin",
         "name": "Steel Scrap Collection Bin",
         "space": "yard",
         "x": 80,
         "z": -75,
         "w": 8,
         "d": 6,
         "h": 4,
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
