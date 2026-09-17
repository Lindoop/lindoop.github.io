// chests.ts — overworld containers. rooms.ts names the item and the spot,
// inventory.ts remembers the loot and which ones are spent; this file only does
// reach, the E prompt, and the draw. No ▼ marker — the prompt is enough for a
// prop that doesn't move.

import { ROOMS, type Chest } from "./rooms";
import { give, chestId, isOpened, markOpened } from "./inventory";
import { C } from "./engine/consts";
import type { Game } from "./engine/types";

export const REACH = 70;        // px between her centre and the chest centre
const SCALE = 1.5;
const LIFT = 14;                // gap between the lid and the E prompt

type Placed = Chest & { id: string; base: number };

const placed = (g: Game, ft: number): Placed[] =>
  (ROOMS[g.roomId].chests ?? []).map((c) => ({
    ...c, id: chestId(g.roomId, c.x), base: c.y ?? ft,
  }));

const box = (g: Game, c: Placed) => {
  const im = g.IMG[c.img ?? "treasure"];
  const w = (im?.ok ? im.el.width : 29) * SCALE, h = (im?.ok ? im.el.height : 21) * SCALE;
  return { im, w, h, x: c.x - w / 2, y: c.base - h };
};

// the one she can open right now: unopened, on foot, standing at its base row
function reachable(g: Game, ft: number): Placed | null {
  const p = g.p, cx = p.x + p.w / 2;
  if (!p.grounded) return null;
  let best: Placed | null = null, bd = REACH;
  for (const c of placed(g, ft)) {
    if (isOpened(c.id)) continue;
    if (Math.abs(p.y + p.h - c.base) > 40) continue;   // same floor row, like doors
    const d = Math.abs(cx - c.x);
    if (d <= bd) { bd = d; best = c; }
  }
  return best;
}

// returns true if it ate the E press, so the door check downstream stands down
export function tick(g: Game, ft: number, locked: boolean): boolean {
  if (locked) return false;
  const c = reachable(g, ft);
  if (!c || !g.took("e")) return false;
  markOpened(c.id);
  give(c.item, c.n ?? 1);
  return true;
}

// world-space, split around the player exactly like drawNpcs
export function drawChests(g: Game, ft: number, layer: "behind" | "front", z: number) {
  const ctx = g.ctx, near = reachable(g, ft);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;                 // pixel art: never let drawImage blur it
  for (const c of placed(g, ft)) {
    if ((c.base <= z) !== (layer === "behind")) continue;
    const b = box(g, c);
    if (b.im?.ok) {
      ctx.globalAlpha = isOpened(c.id) ? 0.45 : 1;
      ctx.drawImage(b.im.el, Math.round(b.x), Math.round(b.y), b.w, b.h);
      ctx.globalAlpha = 1;
    }
    if (near && near.id === c.id) {
      ctx.fillStyle = C.hot; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("E", c.x, b.y - LIFT);
    }
  }
  ctx.imageSmoothingEnabled = sm;
}