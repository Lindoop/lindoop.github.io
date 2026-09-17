// combat/effects.ts — combat visual effects (projectiles, impacts, bursts) as
// pure data + logic. No canvas here: GameCanvas advances these each frame with
// stepEffects(dt) and draws them by layer (looking images up in its own IMG map).

export type EffectLayer = "behind" | "front";

export type Effect = {
  id: number;
  sprite: string;
  fw: number; fh: number;
  frames: number;
  x: number; y: number;
  vx: number; vy: number;
  drawW: number;
  layer: EffectLayer;
  z?: number;
  fps: number;
  loop: boolean;
  alpha: number;
  targetX?: number;
  ttl?: number;
  onDone?: () => void;
  angle?: number;
  hitAt?: number;
  x0?: number; x1?: number;
  y0?: number; y1?: number;
  travelMs?: number;
  onEnd?: () => void;
  grow?: number;
  fade?: number;
  clipX?: number;
  idx: number; acc: number; dead: boolean; tAcc?: number; hit?: boolean; life?: number;
};

let nextId = 1;
let effects: Effect[] = [];

export function clearEffects() { effects = []; }

export function addEffect(
  o: Pick<Effect, "sprite" | "fw" | "fh" | "frames" | "x" | "y" | "layer"> & Partial<Effect>
): Effect {
  const e: Effect = {
    id: nextId++, vx: 0, vy: 0, drawW: 60, fps: 12, loop: true, alpha: 1,
    idx: 0, acc: 0, dead: false, ...o,
  };
  effects.push(e);
  return e;
}

export function stepEffects(dt: number) {
  for (const e of effects) {
    e.life = (e.life ?? 0) + dt;
    if (e.travelMs !== undefined && e.x0 !== undefined && e.x1 !== undefined) {
      e.tAcc = Math.min(e.travelMs, (e.tAcc ?? 0) + dt);
      const k = e.tAcc / e.travelMs;
      e.x = e.x0 + (e.x1 - e.x0) * k;
      if (e.y0 !== undefined && e.y1 !== undefined) e.y = e.y0 + (e.y1 - e.y0) * k;
      else e.y += e.vy;
    } else { e.x += e.vx; e.y += e.vy; }
    const inTransit = e.travelMs !== undefined && (e.tAcc ?? 0) < e.travelMs;

    const held = inTransit && e.hitAt !== undefined && e.idx >= e.hitAt;
    e.acc += dt;
    if (!held && e.acc > 1000 / e.fps) {
      e.acc = 0;
      if (e.loop) e.idx = (e.idx + 1) % e.frames;
      else if (e.idx < e.frames - 1) e.idx++;
      else if (e.ttl === undefined && e.targetX === undefined) { e.onEnd?.(); e.dead = true; }
    }

    if (!e.hit && !inTransit && e.hitAt !== undefined && e.idx >= e.hitAt) { e.hit = true; e.onDone?.(); }

    if (!e.hit && !inTransit && e.hitAt === undefined && e.travelMs !== undefined) { e.hit = true; e.onDone?.(); e.dead = true; }

    if (e.targetX !== undefined) {
      const reached = e.vx >= 0 ? e.x >= e.targetX : e.x <= e.targetX;
      if (reached) { e.onDone?.(); e.dead = true; }
    }
    if (e.ttl !== undefined) { e.ttl -= dt; if (e.ttl <= 0) { e.onDone?.(); e.dead = true; } }
  }
  effects = effects.filter((e) => !e.dead);
}

export const effectsOnLayer = (layer: EffectLayer) =>
  effects.filter((e) => e.z === undefined && e.layer === layer);

export const effectsInSlot = (z: number) => effects.filter((e) => e.z === z);

export const clearSprite = (sprite: string) => { effects = effects.filter((e) => e.sprite !== sprite); };

export const effectsBusy = () =>
  effects.some((e) => !e.loop || e.targetX !== undefined || e.ttl !== undefined);

export function launchProjectile(opts: {
  sprite: string; fw: number; fh: number; frames: number;
  fromX: number; fromY: number; toX: number;
  speed?: number; drawW?: number; fps?: number;
  layer?: EffectLayer;
  onHit: () => void;
}) {
  return addEffect({
    sprite: opts.sprite, fw: opts.fw, fh: opts.fh, frames: opts.frames,
    x: opts.fromX, y: opts.fromY, vx: opts.speed ?? 16, targetX: opts.toX,
    drawW: opts.drawW ?? 60, fps: opts.fps ?? 12, layer: opts.layer ?? "behind",
    onDone: opts.onHit,
  });
}

export function spawnCast(opts: {
  sprite: string; fw: number; fh: number; frames: number; hitAt?: number;
  x: number; y: number;
  fromX?: number; fromY?: number; travelMs?: number; loop?: boolean;
  drawW?: number; fps?: number; angle?: number; grow?: number; fade?: number; clipX?: number;
  layer?: EffectLayer; z?: number;
  onHit: () => void; onEnd?: () => void;
}) {
  const fps = opts.fps ?? 10;
  return addEffect({
    sprite: opts.sprite, fw: opts.fw, fh: opts.fh, frames: opts.frames,
    x: opts.fromX ?? opts.x, y: opts.fromY ?? opts.y,
    ...(opts.fromX !== undefined
      ? { x0: opts.fromX, x1: opts.x, y0: opts.fromY ?? opts.y, y1: opts.y,
          travelMs: opts.travelMs ?? ((opts.hitAt ?? 0) / fps) * 1000 }
      : {}),
    drawW: opts.drawW ?? 300, fps, loop: opts.loop ?? false, layer: opts.layer ?? "behind",
    z: opts.z, angle: opts.angle, grow: opts.grow, fade: opts.fade, clipX: opts.clipX,
    hitAt: opts.hitAt, onDone: opts.onHit, onEnd: opts.onEnd,
  });
}

export function spawnImpact(opts: {
  sprite: string; fw: number; fh: number; frames: number;
  x: number; y: number;
  ms?: number; drawW?: number; fps?: number;
  layer?: EffectLayer;
  onEnd?: () => void;
}) {
  return addEffect({
    sprite: opts.sprite, fw: opts.fw, fh: opts.fh, frames: opts.frames,
    x: opts.x, y: opts.y, drawW: opts.drawW ?? 90, fps: opts.fps ?? 16,
    loop: false, layer: opts.layer ?? "front", ttl: opts.ms ?? 400, onDone: opts.onEnd,
  });
}