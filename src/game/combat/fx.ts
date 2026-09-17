// combat/fx.ts — the effect CATALOGUE. One row per effect sheet holding every
// number that fell out of the packing script: cell size, frame count, the frame
// it connects on. abilities.ts says WHICH effect and WHAT it does; this file
// owns WHERE it goes and HOW BIG it is, so no ability carries geometry.

import { COMBAT_DRAW_H } from "../engine/consts";
import { COMBAT_SPRITE } from "../anim";
import { spawnCast } from "./effects";
import type { AbilityCtx } from "../characters/types";

type Fx = {
  sprite: string;
  fw: number; fh: number;
  frames: number;
  fps: number;
  hitAt?: number;
  loop?: boolean;
  from?: number;
  travelMs?: number;
  block?: number;
  at?: "floor" | "body";
  rise?: number;
  spin?: boolean;
  tip?: number;
  grow?: number;
  fade?: number;
  clip?: boolean;
};

const FX = {
  oilWave:  { sprite: "queenieWave",   fw: 764, fh: 383, frames: 10, fps: 10, hitAt: 7, from: 0.45, travelMs: 700, block: 15 },
  oilPot:   { sprite: "queeniePot",    fw: 960, fh: 961, frames: 33, fps: 16, hitAt: 18 },
  fireball: { sprite: "candyFireball", fw: 450, fh: 300, frames:  5, fps: 14, loop: true, from: 0.29, travelMs: 280, at: "body" },
  scorchingRay: { sprite: "candyRay",  fw: 430, fh:  60, frames: 6, fps: 10, loop: true, from: 0.42, travelMs: 260, block: 10, at: "body", spin: true, tip: 0.83, clip: true },
  portal:       { sprite: "candyPortal", fw: 360, fh: 560, frames: 7, fps: 10, loop: true, grow: 220 },
} satisfies Record<string, Fx>;

export type FxName = keyof typeof FX;

export const BOW = { lo: 6, hi: 8, gap: 125 };

const PORTAL_OFF: [number, number][] = [[0, 0], [-1, 0.5], [1, 0.5], [-1.9, 1], [1.9, 1]];

export function spawnPortal(i: number, x: number, y: number, z: number) {
  const f: Fx = FX.portal, { w, h } = sizeOf(f);
  const [dx, dy] = PORTAL_OFF[Math.min(i, PORTAL_OFF.length - 1)];
  const spot = { x: x + dx * w * 0.85, y: y + dy * h * 0.6 };
  spawnCast({
    sprite: f.sprite, fw: f.fw, fh: f.fh, frames: f.frames, fps: f.fps,
    loop: true, grow: f.grow, x: spot.x, y: spot.y, drawW: w, z, onHit: () => {},
  });
  return spot;
}

const sizeOf = (f: Fx) => {
  const s = (COMBAT_DRAW_H / COMBAT_SPRITE.fh) * (30 / (f.block ?? 30));
  return { w: f.fw * s, h: f.fh * s };
};

const onFloor = (bodyY: number, h: number) => bodyY + 60 - h / 2;

export function castFx(name: FxName, c: AbilityCtx, onHit: () => void) {
  const f: Fx = FX[name];
  const { w, h } = sizeOf(f);
  const travels = f.from !== undefined;
  const src = travels ? c.from : c.to;
  const originY = f.at === "body" ? src.y - (f.rise ?? 0) * COMBAT_DRAW_H : onFloor(src.y, h);
  const targetY = f.at === "body" ? (travels ? c.to.y : src.y) : onFloor(src.y, h);
  const ang = f.spin && travels ? Math.atan2(targetY - originY, c.to.x - src.x) : 0;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const back = w * (f.from ?? 0), tipOff = ((f.tip ?? 0.5) - 0.5) * w;

  return spawnCast({
    sprite: f.sprite, fw: f.fw, fh: f.fh, frames: f.frames, hitAt: f.hitAt, loop: f.loop,
    z: c.z,
    x: c.to.x - ca * tipOff, y: targetY - sa * tipOff,
    fromX: travels ? src.x - ca * back : undefined,
    fromY: travels ? originY - sa * back : undefined,
    angle: f.spin && travels ? ang : undefined,
    travelMs: f.travelMs,
    clipX: f.clip && travels ? src.x : undefined,
    drawW: w, fps: f.fps, grow: f.grow, fade: f.fade, onHit,
  });
}