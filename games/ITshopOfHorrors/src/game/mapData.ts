// Tile legend:
// '#' wall   '.' floor   '=' desk (solid)   'S' server rack (solid, decorative)
// 'T' ticket-queue terminal   'P' printer   'U' undead server   'D' server room door
// 'C' E.S.C.A.L.A.T.E. core   'K' coffee machine   'W' whiteboard
// '~' cable tendril floor (walkable, decorative)

export const TILE = 40;
export const MAP_W = 44;
export const MAP_H = 31;

function buildMap(): string[][] {
  const g: string[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => "#"),
  );

  const carve = (x1: number, y1: number, x2: number, y2: number, ch = ".") => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++) g[y][x] = ch;
  };
  const put = (x: number, y: number, ch: string) => {
    g[y][x] = ch;
  };

  // ---- Central server room (top middle) ----
  carve(15, 2, 29, 8);
  // racks lining the walls
  for (let x = 16; x <= 28; x += 2) put(x, 2, "S");
  put(16, 3, "S");
  put(28, 3, "S");
  // the core
  put(22, 4, "C");
  // door (south wall of server room) — double door
  put(21, 9, "D");
  put(22, 9, "D");

  // ---- Main hallway ----
  carve(2, 10, 41, 12);
  // cable tendrils creeping along the hallway
  for (let x = 14; x <= 30; x += 3) put(x, 11, "~");
  put(40, 11, "~");
  put(41, 12, "~");
  // abandoned triage carts
  put(9, 10, "=");
  put(37, 10, "=");

  // ---- Office (left wing) ----
  carve(2, 14, 12, 28);
  carve(5, 13, 7, 13); // doorway from hallway
  // desk clusters
  carve(4, 17, 6, 17, "=");
  carve(4, 21, 6, 21, "=");
  carve(9, 17, 10, 17, "=");
  carve(9, 21, 10, 21, "=");
  put(10, 16, "T"); // ticket queue terminal on a desk
  put(2, 14, "W"); // whiteboard
  put(2, 25, "K"); // coffee machine
  put(7, 25, "~");

  // ---- Print room (middle) ----
  carve(16, 15, 24, 21);
  carve(18, 13, 19, 14); // doorway
  put(20, 18, "P"); // THE PRINTER
  put(16, 21, "~");
  put(24, 15, "~");
  carve(16, 15, 16, 16, "=");
  carve(24, 18, 24, 19, "="); // paper-supply shelf

  // ---- Security wing / Min Pin den (right top) ----
  carve(28, 14, 41, 19);
  carve(33, 13, 34, 13); // doorway
  for (let x = 37; x <= 41; x += 2) put(x, 14, "S");
  put(28, 14, "S");
  put(29, 19, "~");

  // ---- Server annex / undead server (right bottom) ----
  carve(28, 21, 41, 28);
  carve(34, 20, 35, 20); // doorway from den
  for (let y = 22; y <= 27; y += 2) put(41, y, "S");
  for (let y = 22; y <= 27; y += 2) put(28, y, "S");
  put(35, 24, "U"); // THE UNDEAD SERVER
  put(31, 26, "~");
  put(38, 22, "~");

  return g;
}

export const MAP: string[][] = buildMap();

export const SPAWN = { x: 4.5, y: 23.5 }; // office, tile coords

export const MINPIN_SPAWN = { x: 36.5, y: 16.5 };
export const MINPIN_PATROL: { x: number; y: number }[] = [
  { x: 30.5, y: 16.5 },
  { x: 39.5, y: 16.5 },
  { x: 33.5, y: 13.5 },
  { x: 33.5, y: 11.0 },
  { x: 25.5, y: 11.0 },
  { x: 33.5, y: 11.0 },
  { x: 33.5, y: 14.5 },
];

export const T3_POS = { x: 24.5, y: 5.5 }; // standing beside the core

export function tileAt(x: number, y: number): string {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return "#";
  return MAP[Math.floor(y)][Math.floor(x)];
}

export function isSolid(ch: string, doorOpen: boolean): boolean {
  if (ch === "." || ch === "~") return false;
  if (ch === "D") return !doorOpen;
  return true;
}

// Interactable tiles discovered from map
export interface TilePoint {
  x: number;
  y: number;
  ch: string;
}

export function findTiles(ch: string): TilePoint[] {
  const out: TilePoint[] = [];
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      if (MAP[y][x] === ch) out.push({ x, y, ch });
  return out;
}
