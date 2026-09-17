// engine/render.ts — shared DRAW helpers used by multiple scenes. They take the
// game context and paint; no game logic lives here.

import { ROOMS, floorSegs, solids, type Room, type Layer } from "../rooms";
import { campLayers } from "../camp";
import { effectsOnLayer, effectsInSlot, type Effect } from "../combat/effects";
import { C, PW, PH, VW, VH, SHADE, DEBUG_SOLIDS, GRIP } from "./consts";
import { bossBeaten, questDone } from "../progress";
import type { Game, Img } from "./types";

export const room = (g: Game): Room => ROOMS[g.roomId];

export function drawSprite(g: Game, img: Img, fw: number, fh: number, frame: number, cx: number, feetY: number, drawH: number) {
  const dw = drawH * (fw / fh);
  if (img?.ok) g.ctx.drawImage(img.el, frame * fw, 0, fw, fh, cx - dw / 2, feetY - drawH, dw, drawH);
  else { g.ctx.fillStyle = C.ash; g.ctx.fillRect(cx - PW / 2, feetY - PH, PW, PH); }
}

// backdrop shared by overworld and the combat arena: bg, floor, platforms
export function drawWorld(g: Game) {
  const r = room(g), ctx = g.ctx, IMG = g.IMG;
  // Parallax: drawing at cam*(1-f) inside the camera translate lands at -cam*f on screen.
  // f=1 sticks to the world (collision geometry is always f=1); f=0.5 drifts at half speed.
  // Sub-1 layers tile horizontally so a short canvas still covers a long room.
  const base: Layer[] = r.layers ?? (r.bg ? [{ img: r.bg, f: 1 }] : []);
  const layers = r.camp ? [...base, ...campLayers()] : base;
  for (const L of layers) {
    if (L.quest && !questDone(L.quest)) continue;
    if (L.unless && questDone(L.unless)) continue;
    const im = IMG[L.img]; if (!im?.ok) continue;
    const w = im.el.width, h = im.el.height;
    if (L.x !== undefined) {
      const dw = L.w ?? w, dh = L.h ?? h;
      if (!L.flip) { ctx.drawImage(im.el, L.x, L.y ?? 0, dw, dh); continue; }
      ctx.save(); ctx.translate(L.x * 2 + dw, 0); ctx.scale(-1, 1);
      ctx.drawImage(im.el, L.x, L.y ?? 0, dw, dh);
      ctx.restore(); continue;
    }
    if (L.f === 1) { const iw = w * (r.h / h); for (let x = 0; x < r.w; x += iw) ctx.drawImage(im.el, x, 0, iw, r.h); continue; }
    const ox = g.cam.x * (1 - L.f), oy = (L.y ?? 0) + g.cam.y * (1 - L.f);
    for (let x = ox - Math.ceil(ox / w) * w; x < g.cam.x + VW; x += w) ctx.drawImage(im.el, x, oy, w, h);
  }
  // a painted layer supplies its own ground; only untextured rooms get the flat fill
  if (!layers.length) floorSegs(r).forEach((s) => { ctx.fillStyle = C.panel; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.fillStyle = C.stone; ctx.fillRect(s.x, s.y, s.w, 14); ctx.fillStyle = "rgba(232,99,42,.12)"; ctx.fillRect(s.x, s.y, s.w, 3); });
  // Legibility: one consistent cue for "you can stand here". Pixel art at this value
  // range can't say it with shading alone, and a painted edge the player can't trust
  // is worse than no edge. Dial GRIP to 0 once the art carries it on its own.
  if (GRIP > 0) r.platforms.forEach((pl) => {
    // vertical fade for the mist, horizontal fade so the ends don't read as a drawn bar
    ctx.fillStyle = `rgba(255,222,180,${GRIP})`;       ctx.fillRect(pl.x, pl.y, pl.w, 2);
    ctx.fillStyle = `rgba(255,222,180,${GRIP * 0.4})`; ctx.fillRect(pl.x, pl.y + 2, pl.w, 2);
  });

  // solids are never drawn — flip DEBUG_SOLIDS to see where they are while placing them
  if (DEBUG_SOLIDS) solids(r).forEach((s) => { ctx.strokeStyle = "rgba(0,255,190,.9)"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2); });
}

// The shadow pass. Sits on top of bg + platforms but UNDER the cast, so characters
// keep full brightness and read against a darkened world. Screen-space rect placed
// at the camera, so it covers the viewport without needing the room's full size.
export function drawShade(g: Game) {
  const r = room(g), ctx = g.ctx;
  if (!r.act || bossBeaten(r.act)) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = SHADE;
  ctx.fillRect(g.cam.x, g.cam.y, VW, VH);
  ctx.restore();
}

function paintEffect(g: Game, e: Effect) {
  const img = g.IMG[e.sprite]; if (!img?.ok) return;
  const t = e.life ?? 0;
  const dw = e.drawW * (e.grow ? Math.min(1, t / e.grow) : 1), dh = dw * (e.fh / e.fw);
  if (dw < 1) return;
  g.ctx.save();
  if (e.clipX !== undefined) { g.ctx.beginPath(); g.ctx.rect(e.clipX, -1e5, 2e5, 2e5); g.ctx.clip(); }
  g.ctx.globalAlpha = e.alpha * (e.fade ? Math.min(1, t / e.fade) : 1);
  const ang = e.angle !== undefined ? e.angle : ((e.vx !== 0 || e.vy !== 0) ? Math.atan2(e.vy, e.vx) : 0);
  if (ang) g.ctx.imageSmoothingEnabled = false;
  g.ctx.translate(e.x, e.y);
  g.ctx.rotate(ang);
  g.ctx.drawImage(img.el, e.idx * e.fw, 0, e.fw, e.fh, -dw / 2, -dh / 2, dw, dh);
  g.ctx.globalAlpha = 1;
  g.ctx.restore();
}

export function drawEffectsLayer(g: Game, layer: "behind" | "front") {
  for (const e of effectsOnLayer(layer)) paintEffect(g, e);
}

export function drawEffectsSlot(g: Game, z: number) {
  for (const e of effectsInSlot(z)) paintEffect(g, e);
}

export function hpbar(g: Game, cx: number, y: number, f: { hp: number; maxhp: number; name: string }) {
  const ctx = g.ctx, w = 90, h = 7;
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(cx - w / 2, y, w, h);
  ctx.fillStyle = C.ember; ctx.fillRect(cx - w / 2, y, w * (f.hp / f.maxhp), h);
  ctx.fillStyle = C.hot; ctx.font = '11px "Zilla Slab",serif'; ctx.textAlign = "center"; ctx.fillText(f.name, cx, y - 5);
}

const SP_DRAW = 80;
const SP = { from: 276, span: 60, step: 72 };
const SP_HUB = "#171717", SP_RIM = "#666666";
const SP_FILL: Record<string, { on: string; off: string }> = {
  mags:    { on: "#d5334d", off: "#291619" },
  candy:   { on: "#ff7991", off: "#251b1c" },
  queenie: { on: "#8be8b0", off: "#1c2520" },
};

const SP_BLOCKS = 80, SP_SS = 6;
const spHi = document.createElement("canvas");
spHi.width = spHi.height = SP_BLOCKS * SP_SS;
const spBuf = document.createElement("canvas");
spBuf.width = spBuf.height = SP_BLOCKS;

export function drawSkillPoints(
  g: Game, dx: number, dy: number, sp: number, max: number, who = "mags", preview = 0, pa = 0,
) {
  const c = spHi.getContext("2d")!;
  const S = spHi.width, cx = S / 2, cy = S / 2, k = S / 209;
  c.clearRect(0, 0, S, S);
  const col = SP_FILL[who] ?? SP_FILL.mags;
  const n = Math.max(0, Math.min(max, Math.round(sp)));
  const hi = Math.max(0, Math.min(max, n + preview));
  const rad = (d: number) => (d * Math.PI) / 180;

  const ring = (r0: number, r1: number, a0: number, a1: number, style: string, alpha = 1) => {
    c.globalAlpha = alpha;
    c.fillStyle = style;
    c.beginPath();
    c.arc(cx, cy, r1, rad(a0), rad(a1));
    c.arc(cx, cy, r0, rad(a1), rad(a0), true);
    c.closePath();
    c.fill();
  };

  ring(90.5 * k, 104.5 * k, 0, 360, SP_RIM);
  c.globalAlpha = 1;
  c.fillStyle = SP_HUB;
  c.beginPath(); c.arc(cx, cy, 90.5 * k, 0, Math.PI * 2); c.fill();   // spokes = the backing

  for (let i = 0; i < max; i++) {
    const a0 = SP.from + i * SP.step, a1 = a0 + SP.span;
    const lit = i < n, ghost = i >= Math.min(n, hi) && i < Math.max(n, hi);
    ring(46.5 * k, 90.5 * k, a0, a1, col.off);
    if (lit || ghost) ring(46.5 * k, 90.5 * k, a0, a1, col.on, lit ? (ghost ? 1 - pa : 1) : pa);
  }
  c.globalAlpha = 1;
  c.fillStyle = SP_HUB;
  c.beginPath(); c.arc(cx, cy, 46.5 * k, 0, Math.PI * 2); c.fill();

  const bc = spBuf.getContext("2d")!;
  bc.imageSmoothingEnabled = false;
  bc.clearRect(0, 0, SP_BLOCKS, SP_BLOCKS);
  bc.drawImage(spHi, 0, 0, SP_BLOCKS, SP_BLOCKS);

  const gc = g.ctx;
  gc.save();
  gc.imageSmoothingEnabled = false;
  gc.drawImage(spBuf, dx - SP_DRAW / 2, dy - SP_DRAW / 2, SP_DRAW, SP_DRAW);
  gc.restore();
}