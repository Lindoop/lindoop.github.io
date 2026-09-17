// dialogue.ts — overworld NPC conversations. A ▼ marker bobs over an NPC when
// you're close; press E to talk. A box shows one line plus choices; ← → picks,
// E or Enter confirms. Canvas-drawn (no DOM), so it slots straight into the
// overworld draw pass. NPC placement + idle animation live here too, so
// scenes/overworld.ts only has to call four functions.

import { VW, VH, DRAW_H, C } from "./engine/consts";
import { drawSprite } from "./engine/render";
import { recruit, isRecruited } from "./roster";
import { ROOMS } from "./rooms";
import { campSpots } from "./camp";
import type { Game } from "./engine/types";

export const TALK_KEY = "e";     // norm() lowercases in GameCanvas, so 'E' works too
const REACH_X = 130;             // horizontal px within which the ▼ appears
const REACH_Y = 60;              // and she has to be on roughly the same level

export type Choice = { label: string; run?: (g: Game) => void };

export type Npc = {
  id: string;
  name: string;
  room: string;                  // which room id she stands in
  x: number;                     // world x of the sprite centre
  y?: number;                    // feet row — where she actually stands. omit for the room floor.
  z?: number;                    // layer override for draw order only. omit and it follows y
                                 // (standing lower = nearer the camera = drawn in front).
  cellW: number;                 // sheet cell size (940 square for most; Candy is 1505×977)
  cellH: number;
  sheetR: string;                // IMG key, facing right
  sheetL: string;                // IMG key, facing left
  fps: number;
  scale?: number;                // draw-height multiplier — corrects cell-size mismatch between characters
  line: string;
  choices: Choice[];
  gone?: () => boolean;          // once true: not drawn, not talkable
};

// ---------------------------------------------------------------- the cast --
export const NPCS: Npc[] = [
  {
    id: "candy",
    name: "Candy",
    room: "a101",
    x: 1000,
    cellW: 1505, cellH: 977,
    sheetR: "candyIdleRight",
    sheetL: "candyIdleLeft",
    fps: 6,
    scale: 1.039,                  // 1:1 now; only the 977 vs 884 cell height remains
    line: "Hiya! I'm Candy, short for Candle. Can I join your party?",
    choices: [
      { label: "Yes", run: () => recruit("candy") },
      { label: "No" },
    ],
    gone: () => isRecruited("candy"),   // she joins you, so she leaves the hall
  },
  {
    id: "queenie",
    name: "Queenie",
    room: "a104",
    x: 1350,
    cellW: 940, cellH: 940,
    sheetR: "queenieIdleRight",
    sheetL: "queenieIdleLeft",
    fps: 5,
    scale: 1.062,                  // packs 1:1, but her cell is 940 tall vs Mags's 884
    line: "Careful — that's still cooling. You're heading somewhere, aren't you? I'll bring the pot.",
    choices: [
      { label: "Yes", run: () => recruit("queenie") },
      { label: "No" },
    ],
    gone: () => isRecruited("queenie"),
  },
];

// -------------------------------------------------------------- the runtime --
let active: Npc | null = null;
let sel = 0;
const idle: Record<string, { i: number; acc: number }> = {};
let bob = 0;

export const talking = () => active !== null;
export const closeDialogue = () => { active = null; sel = 0; };

const CAMP_LINES: Record<string, string> = {
  candy: "I got the spot by the fire! Is that okay? I can move.",
  queenie: "Someone has to feed you lot. Sit down, I'll bring it over.",
};

let campKey = "\u0000";
let campVal: Npc[] = [];

function campNpcs(roomId: string): Npc[] {
  const spots = campSpots();
  const key = `${roomId}|${spots.map((s) => `${s.id}@${s.x},${s.feetY}`).join(",")}`;
  if (key === campKey) return campVal;
  campVal = spots.flatMap((s) => {
    const base = NPCS.find((n) => n.id === s.id);
    if (!base) return [];
    return [{ ...base, room: roomId, x: s.x, y: s.feetY, gone: undefined, line: CAMP_LINES[s.id] ?? base.line, choices: [{ label: "Bye" }] }];
  });
  campKey = key;
  return campVal;
}

const onstage = (g: Game) => {
  const here = NPCS.filter((n) => n.room === g.roomId && !n.gone?.());
  return ROOMS[g.roomId]?.camp ? here.concat(campNpcs(g.roomId)) : here;
};

function inReach(g: Game, groundY: number): Npc | null {
  const cx = g.p.x + g.p.w / 2, feet = g.p.y + g.p.h;
  let best: Npc | null = null, bd = REACH_X;
  for (const n of onstage(g)) {
    if (Math.abs(feet - (n.y ?? groundY)) > REACH_Y) continue;   // must share her level, not just her column
    const d = Math.abs(cx - n.x);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

function cellCount(g: Game, n: Npc): number {
  const im = g.IMG[n.sheetR];
  return im?.ok ? Math.max(1, Math.round(im.el.width / n.cellW)) : 1;
}

// call once per frame from overworld.update, AFTER movement
export function tick(g: Game, dt: number, groundY: number): void {
  bob += dt;
  for (const n of onstage(g)) {
    const a = (idle[n.id] ||= { i: 0, acc: 0 });
    a.acc += dt;
    if (a.acc > 1000 / n.fps) { a.acc = 0; a.i = (a.i + 1) % cellCount(g, n); }
  }

  if (active) {
    const last = active.choices.length - 1;
    if (last > 0) {
      if (g.took("ArrowLeft") || g.took("a")) sel = sel === 0 ? last : sel - 1;
      if (g.took("ArrowRight") || g.took("d")) sel = sel === last ? 0 : sel + 1;
    }
    if (g.took(TALK_KEY) || g.took("Enter")) {
      const choice = active.choices[sel];
      closeDialogue();
      choice?.run?.(g);            // run AFTER closing so effects can't be clobbered
    }
    return;
  }

  const near = inReach(g, groundY);
  if (near && g.p.grounded && g.took(TALK_KEY)) { active = near; sel = 0; }
}

// ----------------------------------------------------------------- drawing --
// world space — call inside the camera translate, TWICE: "behind" then "front",
// bracketing the player draw. Feet Y is the depth axis: higher feet = further
// back, so an NPC level with or above the player draws behind them.
export function drawNpcs(g: Game, groundY: number, pass: "behind" | "front" = "behind", playerZ = -Infinity): void {
  const cx = g.p.x + g.p.w / 2;
  for (const n of onstage(g)) {
    const y = n.y ?? groundY;                         // vertical placement
    const z = n.z ?? y;                               // draw order, decoupled but height-derived by default
    if ((z <= playerZ) !== (pass === "behind")) continue;
    const faceRight = cx > n.x;                       // she turns to look at you
    drawSprite(g, g.IMG[faceRight ? n.sheetR : n.sheetL], n.cellW, n.cellH, idle[n.id]?.i ?? 0, n.x, y, DRAW_H * (n.scale ?? 1));
  }
  if (pass === "front" && !active) { const near = inReach(g, groundY); if (near) marker(g, near, near.y ?? groundY); }
}

// the ▼ — pointy side down, hovering over her head
function marker(g: Game, n: Npc, groundY: number): void {
  const ctx = g.ctx;
  const y = groundY - DRAW_H - 18 + Math.sin(bob / 260) * 5;
  const w = 11, h = 14;
  ctx.beginPath();
  ctx.moveTo(n.x - w, y - h);
  ctx.lineTo(n.x + w, y - h);
  ctx.lineTo(n.x, y);
  ctx.closePath();
  ctx.fillStyle = C.hot;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.stroke();
}

// screen space — call AFTER ctx.restore()
export function drawDialogue(g: Game, groundY: number): void {
  const ctx = g.ctx;

  if (!active) {
    const near = inReach(g, groundY);
    if (near) {
      ctx.textAlign = "center";
      ctx.fillStyle = C.hot;
      ctx.font = '13px "Zilla Slab",serif';
      ctx.fillText(`E — talk to ${near.name}`, VW / 2, VH - 44);
    }
    return;
  }

  const BW = Math.min(620, VW - 80), BH = 138;
  const bx = Math.round((VW - BW) / 2), by = VH - BH - 26;

  ctx.fillStyle = "rgba(16,11,7,.94)";
  ctx.fillRect(bx, by, BW, BH);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ember;
  ctx.strokeRect(bx + 1, by + 1, BW - 2, BH - 2);

  ctx.textAlign = "left";
  ctx.fillStyle = C.hot;
  ctx.font = "600 15px Cinzel, serif";
  ctx.fillText(active.name, bx + 20, by + 30);

  ctx.fillStyle = "#e6d8c4";
  ctx.font = '15px "Zilla Slab",serif';
  wrap(ctx, active.line, bx + 20, by + 58, BW - 40, 22);

  // choices as pills along the bottom of the box
  ctx.font = '14px "Zilla Slab",serif';
  ctx.textAlign = "center";
  let px = bx + 20;
  const py = by + BH - 38;
  active.choices.forEach((c, i) => {
    const w = Math.max(78, ctx.measureText(c.label).width + 34);
    const on = i === sel;
    ctx.fillStyle = on ? "rgba(232,99,42,.22)" : "rgba(0,0,0,.35)";
    ctx.fillRect(px, py, w, 30);
    ctx.lineWidth = 1;
    ctx.strokeStyle = on ? C.hot : "rgba(230,216,196,.28)";
    ctx.strokeRect(px + 0.5, py + 0.5, w - 1, 29);
    ctx.fillStyle = on ? C.hot : C.dim;
    ctx.fillText(c.label, px + w / 2, py + 20);
    px += w + 12;
  });

  ctx.textAlign = "right";
  ctx.fillStyle = C.dim;
  ctx.font = '11px "Zilla Slab",serif';
  ctx.fillText("\u2190 \u2192 choose \u00b7 E confirm", bx + BW - 20, py + 20);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): void {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) { ctx.fillText(line, x, y); y += lh; line = word; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}