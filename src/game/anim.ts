// anim.ts — animation config + pure frame math.

export const SPRITE = { frames: 6, fw: 934, fh: 884, fps: 4 };
export const COMBAT_SPRITE = { fw: 940, fh: 940 };

export type AnimMode = "loop" | "once" | "hold";
export type Anim = {
  r: string; l: string;
  fps: number;
  mode: AnimMode;
  from?: number; to?: number;
};

export const ANIM: Record<string, Anim> = {
  stand: { r: "standRight", l: "standLeft", fps: 5, mode: "loop" },
  walk:  { r: "walkRight",  l: "walkLeft",  fps: 10, mode: "loop" },
  run:   { r: "runRight",   l: "runLeft",   fps: 10, mode: "loop" },
  jump:  { r: "jumpRight",  l: "jumpLeft",  fps: 12,  mode: "once" },
  glide: { r: "fallRight",  l: "fallLeft",  fps: 1,  mode: "hold", from: 0, to: 0 },
  brace: { r: "fallRight",  l: "fallLeft",  fps: 8,  mode: "loop", from: 1, to: 2 },
  land:  { r: "fallRight",  l: "fallLeft",  fps: 12, mode: "once", from: 3, to: 6 },
};

export const sheetKey = (a: Anim, face: number) => (face > 0 ? a.r : a.l);

export function animLen(a: Anim, sheetWidth: number, fw = SPRITE.fw): number {
  if (a.to !== undefined && a.from !== undefined) return a.to - a.from + 1;
  return Math.max(1, Math.round(sheetWidth / fw));
}

export const frameCol = (a: Anim, index: number) => (a.from ?? 0) + index;

export function stepAnim(
  a: Anim, index: number, acc: number, dt: number, len: number, movingFast = false
): { index: number; acc: number; done: boolean } {
  if (a.mode === "hold") return { index: 0, acc: 0, done: true };
  const fps = movingFast ? Math.max(a.fps, 18) : a.fps;
  acc += dt;
  let done = false;
  if (acc > 1000 / fps) {
    acc = 0;
    if (a.mode === "loop") index = (index + 1) % len;
    else if (index < len - 1) index++;
    else done = true;
  }
  return { index, acc, done };
}
