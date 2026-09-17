// camp.ts — recruits get sent to a102: each pitches a tent and stands outside it.
// Slot is recruit ORDER, except tents with a `pin` which always claim theirs.
// campLayers() feeds render.ts, campSpots() feeds dialogue.ts.

import { partyIds } from "./roster";
import type { Layer } from "./rooms";

export const TENTS: Record<string, { img: string; w: number; h: number; door: number; sink: number; pin?: number }> = {
  candy: { img: "tentCandy", w: 280, h: 150, door: 0.72, sink: 7 },
  queenie: { img: "tentQueenie", w: 280, h: 210, door: 0.36, sink: 0, pin: 0 },
  // robot: { img: "tentRobot", w: 0, h: 0, door: 0.5, sink: 0 },
};

export const SLOTS: { x: number; standY: number; flip?: boolean }[] = [
  { x: 41, standY: 495 },
  { x: 15, standY: 245 },
  { x: 450, standY: 207, flip: true },
];

export const MAX_TENTS = SLOTS.length;

const campers = () => partyIds().filter((id) => id !== "mags");

function assign(): (string | undefined)[] {
  const slots: (string | undefined)[] = new Array(SLOTS.length);
  const rest: string[] = [];
  for (const id of campers()) {
    const p = TENTS[id]?.pin;
    if (p !== undefined && p < slots.length && !slots[p]) slots[p] = id;
    else rest.push(id);
  }
  let i = 0;
  for (const id of rest) {
    while (i < slots.length && slots[i]) i++;
    if (i >= slots.length) break;
    slots[i] = id;
  }
  return slots;
}

export const slotOf = (id: string) => assign().indexOf(id);

let layerKey = "\u0000";
let layerVal: Layer[] = [];

export function campLayers(): Layer[] {
  const ids = campers();
  const key = ids.join(",");
  if (key === layerKey) return layerVal;

  const out: Layer[] = [];
  const slots = assign();
  for (let i = 0; i < SLOTS.length; i++) {
    const t = slots[i] ? TENTS[slots[i]!] : undefined;
    if (!t) continue;
    const s = SLOTS[i];
    out.push({ img: t.img, f: 1, x: s.x, y: s.standY + t.sink - t.h, w: t.w, h: t.h, flip: s.flip });
  }
  layerKey = key;
  layerVal = out;
  return out;
}

export type CampSpot = { id: string; x: number; feetY: number };

let spotKey = "\u0000";
let spotVal: CampSpot[] = [];

export function campSpots(): CampSpot[] {
  const ids = campers();
  const key = ids.join(",");
  if (key === spotKey) return spotVal;

  const out: CampSpot[] = [];
  const slots = assign();
  for (let i = 0; i < SLOTS.length; i++) {
    const id = slots[i];
    if (!id) continue;
    const t = TENTS[id];
    if (!t) continue;
    const s = SLOTS[i];
    out.push({ id, x: Math.round(s.x + (s.flip ? t.w * (1 - t.door) : t.w * t.door)), feetY: s.standY });
  }
  spotKey = key;
  spotVal = out;
  return out;
}

export const invalidateCamp = () => { layerKey = "\u0000"; spotKey = "\u0000"; };