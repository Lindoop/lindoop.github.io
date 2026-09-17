// rooms.ts — world data + pure geometry. No canvas, no React.
// GameCanvas imports ROOMS to draw, and the helpers for collision.

import { GROUND } from "./engine/consts";
import { CAVE_VOID, at } from "./backdrops";

export type Solid = { x: number; y: number; w: number; h: number };
export type Chest = { x: number; y?: number; item: string; n?: number; img?: string };
export type VExit = { to: string; x0: number; x1: number };
export type HExit = { to: string; y0: number; y1: number };
export type Layer = { img: string; f: number; x?: number; y?: number; w?: number; h?: number; flip?: boolean; quest?: string; unless?: string };
export type Room = {
  area: string;
  name?: string;
  w: number; h: number;
  bg?: string;
  layers?: Layer[];
  act?: number;
  ground?: number;
  camp?: boolean;
  platforms: Solid[];
  exits: { left?: HExit[]; right?: HExit[]; up?: VExit; down?: VExit };
  doors?: { x0: number; x1: number; y?: number; to: string; entry: string }[];   // stand in range, press E. y = the floor row the door sits on
  spawn?: Record<string, number>;   // entry name -> world x to arrive at, on the floor
  chests?: Chest[];                 // stand in range, press E, get the named item
  enemies?: { x: number }[];
  fg?: { x: number; y: number; w?: number; h?: number; img: string }[];   // props drawn AFTER the player; omit w/h for natural size
};

// ------- rooms (edit freely) -------
// keys are ids only — `area`/`name` hold the display text. Numbered in the order
// the player reaches them, matching the background asset key of the same name.
export const ROOMS: Record<string, Room> = {
  // ---- a101 HALL 1800×540 — Hermitage ----
  a101: {
    area: "The Slums", name: "Hermitage", w: 1800, h: 540, act: 1,
    layers: [
      ...at(CAVE_VOID, -380),
      { img: "a101", f: 1 },
      { img: "truckBroken", f: 1, x: 1180, y: 260, unless: "truckFixed" },
      { img: "truckMerchant", f: 1, x: 1180, y: 260, quest: "truckFixed" },
    ],
    doors: [
      { x0: 140, x1: 380, y: 450, to: "a102", entry: "door" },   // left cave mouth -> Mags's place
      { x0: 700, x1: 860, y: 450, to: "a103", entry: "door" },   // right building door -> the shop
    ],
    spawn: { fromHome: 260, fromShop: 780 },
    platforms: [
      { x: 0, y: 145, w: 470, h: 40 },      // vine-covered roof ledge, left building
      { x: 500, y: 245, w: 560, h: 20 },    // metal sill band on the brick building
      { x: 880, y: 355, w: 175, h: 20 },    // dark wood beam right of the door
      { x: 1180, y: 260, w: 350, h: 20 },   // food truck roof
    ],
    exits: { right: [{ to: "a104", y0: 346, y1: 450 }] },   // ground-level band only
  },
  // ---- a102 SMALL INTERIOR 900×540 — Mags's place ----
  a102: {
    area: "The Slums", name: "Home", w: 900, h: 540, act: 1, ground: 45, camp: true,
    layers: [{ img: "a102", f: 1 }],
    platforms: [
      { x: 0, y: 245, w: 315, h: 25 },      // left ledge
      { x: 430, y: 207, w: 330, h: 30 },    // right ledge
      { x: 370, y: 415, w: 95, h: 80 },    // crate
    ],
    exits: {},
    doors: [{ x0: 560, x1: 800, y: 495, to: "a101", entry: "fromHome" }],   // the pale opening, right side
    spawn: { door: 679 },
  },
  // ---- a103 CHAMBER 1800×1620 — the shop ----
  a103: {
    area: "The Slums", w: 1800, h: 1620, act: 1,
    platforms: [],
    exits: {},
    doors: [{ x0: 830, x1: 970, to: "a101", entry: "fromShop" }],
    spawn: { door: 900 },
  },
  // ---- a104 CHAMBER 1800×1620 — the climb ----
  a104: {
    area: "The Slums", w: 1800, h: 1620, act: 1,
    layers: [...CAVE_VOID, { img: "a104", f: 1 }],
    platforms: [
      { x: 1405, y: 150, w: 365, h: 20 },    // roof eave
      { x: 1410, y: 200, w: 160, h: 20 },    // upper window — lintel
      { x: 1430, y: 360, w: 110, h: 20 },    // upper window — sill
      { x: 1005, y: 420, w: 340, h: 20 },    // maroon bar
      { x: 1590, y: 550, w: 150, h: 20 },    // lower window sill
      { x: 1400, y: 690, w: 140, h: 20 },    // navy awning, upper
      { x: 1330, y: 775, w: 470, h: 30 },    // pale grey shelf
      { x: 1040, y: 950, w: 380, h: 30 },    // stone shelf
      { x: 1530, y: 1020, w: 270, h: 30 },   // maroon awning
      { x: 1155, y: 1070, w: 155, h: 20 },   // blue awning
      { x: 1345, y: 1190, w: 75, h: 20 },    // purple awning
      { x: 1540, y: 1235, w: 260, h: 40 },   // dark beam
      { x: 1000, y: 1355, w: 420, h: 30 },   // concrete slab
      { x: 1720, y: 1450, w: 70, h: 20 },    // AC unit
      { x: 95, y: 85, w: 355, h: 20 },       // window top frame
      { x: 70, y: 225, w: 375, h: 20 },      // window bottom frame
      { x: 0, y: 430, w: 720, h: 20 },       // pale roof cap — the wide one
      { x: 95, y: 520, w: 265, h: 20 },      // grey AC panel top
      { x: 400, y: 690, w: 225, h: 20 },      // brown crossbar
      { x: 565, y: 815, w: 290, h: 20 },     // small shelf arm
    ],
    exits: { left: [{ to: "a101", y0: 1426, y1: 1530 }], down: { to: "a105", x0: 640, x1: 820 } },
    chests: [{ x: 60, y: 430, item: "potion" }],
    enemies: [{ x: 950 }],
  },
  // ---- a105 SHAFT 900×1620 ----
  a105: {
    area: "The Slums", w: 900, h: 1620, act: 1,
    layers: [...CAVE_VOID, { img: "a105", f: 1 }],
        platforms: [
      { x: 120, y: 200, w: 170, h: 30 },     // landing bracket where the ladder meets the gangway
      { x: 15, y: 290, w: 105, h: 10 },     // ladder rungs, top to bottom
      { x: 15, y: 385, w: 105, h: 10 },
      { x: 15, y: 490, w: 105, h: 10 },
      { x: 15, y: 585, w: 105, h: 10 },
      { x: 15, y: 685, w: 105, h: 10 },
      { x: 15, y: 780, w: 105, h: 10 },
      { x: 15, y: 880, w: 105, h: 10 },
      { x: 15, y: 975, w: 105, h: 10 },
      { x: 15, y: 1075, w: 105, h: 10 },
      { x: 15, y: 1170, w: 105, h: 10 },
      { x: 15, y: 1270, w: 105, h: 10 },
      { x: 15, y: 1370, w: 105, h: 10 },
      { x: 15, y: 1470, w: 105, h: 10 },
    ],
    exits: { up: { to: "a104", x0: 165, x1: 330 } },
    chests: [{ x: 750, item: "potion" }],
  },
};

// ------- pure geometry helpers -------
export const floorTop = (r: Room) => r.h - (r.ground ?? GROUND);

// the floor, split around any down-exit gap
export function floorSegs(r: Room): Solid[] {
  const ft = floorTop(r), gaps: { x0: number; x1: number }[] = [];
  if (r.exits.down) gaps.push({ x0: r.exits.down.x0, x1: r.exits.down.x1 });
  const segs: Solid[] = [];
  let prev = 0;
  for (const g of gaps.sort((a, b) => a.x0 - b.x0)) {
    if (g.x0 > prev) segs.push({ x: prev, y: ft, w: g.x0 - prev, h: GROUND });
    prev = g.x1;
  }
  if (prev < r.w) segs.push({ x: prev, y: ft, w: r.w - prev, h: GROUND });
  return segs;
}

// everything the player can stand on: floor segments + platforms
export const solids = (r: Room) => [...floorSegs(r), ...r.platforms];