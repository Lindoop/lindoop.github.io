import type { Game } from "../engine/types";

export type Slot = { label: string; on: () => void; ok: boolean; icon?: string; preview?: number; frame?: number; art?: string };

export const HUE = {
  attack: ["#391921", "#542a34", "#c17b8d"],
  act:    ["#193933", "#2a544b", "#7bc1b3"],
  bag:    ["#392c19", "#54422a", "#c1a47b"],
  run:    ["#192a39", "#2a4054", "#7ba0c1"],
  art:    ["#451f29", "#663340", "#eccf97"],
  off:    ["#241d18", "#31281f", "#6f6355"],
} as const;

export const ROOT = ["attack", "act", "bag", "run"] as const;
export type RootId = (typeof ROOT)[number];

const ICON = { x: 18, y0: 276, step: 65, size: 50 };
const MENU_AT = { x: 9, y: 266 };
const BAR_AT = { x: 186, y: 406 };
const ROW = { x: 9, w: 169, h: 65 };
export const DIAL = { x: 829, y: 468 };
// slots start at x 195 on the bar and draw at the art's own size, 5px apart
const CELL = { x: 195, y: 464, w: 77, h: 58 };
const GAP = 5;

const slotArt = (g: Game, s: Slot | undefined) => {
  const im = g.IMG[`${s?.art ?? "barSlot"}Off`];
  return im?.ok ? { w: im.el.width, h: im.el.height } : { w: CELL.w, h: CELL.h };
};

export const rowRect = (i: number) => ({ x: ROW.x, y: ICON.y0 + i * ICON.step - 10, w: ROW.w, h: ROW.h });

export function slotRect(g: Game, i: number, slots: Slot[]) {
  let x = CELL.x;
  for (let k = 0; k < i; k++) x += slotArt(g, slots[k]).w + GAP;
  const { w, h } = slotArt(g, slots[i]);
  return { x, y: CELL.y, w, h };
}

const inside = (r: { x: number; y: number; w: number; h: number }, mx: number, my: number) =>
  mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

function plate(g: Game, r: { x: number; y: number; w: number; h: number }, ok: boolean) {
  const c = g.ctx;
  c.fillStyle = ok ? "#676767" : "#3d372f";
  c.fillRect(r.x, r.y, r.w, r.h);
  c.fillStyle = ok ? "#000000" : "#141110";
  c.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
}

export function drawMenu(
  g: Game, ox: number, oy: number,
  open: RootId | null, slots: Slot[], enabled: boolean,
  hit: { row: number; slot: number },
): void {
  const c = g.ctx;
  const mx = g.mouse.x, my = g.mouse.y;
  c.save(); c.translate(ox, oy);

  const menu = g.IMG.battleMenu, bar = g.IMG.hotbar;
  if (menu?.ok) c.drawImage(menu.el, MENU_AT.x, MENU_AT.y);

  hit.row = -1;
  ROOT.forEach((id, i) => {
    const r = rowRect(i);
    const over = enabled && inside(r, mx, my);
    if (over) hit.row = i;
    const hov = g.IMG.menuRowHover;
    if ((over || open === id) && hov?.ok) c.drawImage(hov.el, r.x + 5, r.y + 5);
    const ic = g.IMG[`icon_${id}${(over || open === id) && g.IMG[`icon_${id}_hi`]?.ok ? "_hi" : ""}`];
    if (ic?.ok) c.drawImage(ic.el, ICON.x, ICON.y0 + i * ICON.step, ICON.size, ICON.size);
    c.globalAlpha = enabled ? 1 : 0.45;
    c.fillStyle = "#fff4e6"; c.font = '22px "Pixel",monospace'; c.textAlign = "left";
    c.fillText(id.toUpperCase(), r.x + 66, r.y + 42);
    c.globalAlpha = 1;
  });

  if (bar?.ok) c.drawImage(bar.el, BAR_AT.x, BAR_AT.y);

  hit.slot = -1;
  slots.forEach((s, i) => {
    const r = slotRect(g, i, slots);
    const over = s.ok && inside(r, mx, my);
    if (over) hit.slot = i;
    const base = s.art ?? "barSlot";
    const art = g.IMG[`${base}${over ? "On" : "Off"}`] ?? g.IMG[over ? "barSlotOn" : "barSlotOff"];
    if (art?.ok) c.drawImage(art.el, r.x, r.y);
    else plate(g, r, s.ok);

    c.globalAlpha = s.ok ? 1 : 0.4;
    const ic = s.icon ? g.IMG[s.icon] : undefined;
    const d = r.h - 16, ix = r.x + 12;
    // Cell size comes from the image HEIGHT, so a single 190px icon and a 950px
    // 5-frame strip both work — no per-icon frame count to keep in sync (§3d).
    if (ic?.ok) {
      const cell = ic.el.height;
      c.drawImage(ic.el, Math.min(s.frame ?? 0, Math.round(ic.el.width / cell) - 1) * cell,
                  0, cell, cell, ix, r.y + (r.h - d) / 2, d, d);
    }
    c.fillStyle = "#fff4e6";
    c.font = '17px "Pixel",monospace'; c.textAlign = "left";
    c.fillText(s.label, ix + (ic?.ok ? d + 12 : 0), r.y + r.h / 2 + 6);
    c.globalAlpha = 1;
  });

  c.restore();
}