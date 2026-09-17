// inventory.ts — what Mags is carrying, plus which world containers are already
// empty. Module state behind functions, same pattern as roster.ts: rooms.ts is
// read-only data, so "this chest is open" can't live there.

export type ItemUse = { heal?: number };
export type Item = {
  id: string; name: string; blurb: string;
  stack?: number;     // max per slot; default STACK_MAX
  battle?: boolean;   // may sit in a belt slot and be used in a fight
  icon?: string;      // ASSETS key, drawn by the battle menu
  use?: ItemUse;      // what it does when used — no `use` means it's inert in combat
};

export const STACK_MAX = 9;

export const ITEMS: Record<string, Item> = {
  potion: { id: "potion", name: "Potion",      blurb: "Restores a little HP.",        battle: true, use: { heal: 12 } },
  scrap:  { id: "scrap",  name: "Scrap Metal", blurb: "Heavy. Truck-shaped, almost." },
};

// The bag is a GRID now, not a tally: 9 columns, rows bought as upgrades. The
// belt is the 7 slots the battle menu shows. Same stack shape in both, so one
// move() covers bag→bag, bag→belt and belt→bag.
export type Stack = { id: string; n: number };
export type Area = "bag" | "belt";
export type Ref = { area: Area; i: number };

export const BAG_COLS = 9;
export const BAG_ROWS_MAX = 3;
export const BELT_SLOTS = 7;

let bagRowCount = 1;
let bag: (Stack | null)[] = new Array(BAG_COLS).fill(null);
const belt: (Stack | null)[] = new Array(BELT_SLOTS).fill(null);
const opened = new Set<string>();

const stackMax = (id: string) => ITEMS[id]?.stack ?? STACK_MAX;
const listOf = (a: Area) => (a === "bag" ? bag : belt);

export const bagRows = () => bagRowCount;
export const bagSlots = () => bag as ReadonlyArray<Stack | null>;
export const beltSlots = () => belt as ReadonlyArray<Stack | null>;
export const slotAt = (r: Ref) => listOf(r.area)[r.i] ?? null;

export const count = (itemId: string) =>
  [...bag, ...belt].reduce((t, s) => t + (s?.id === itemId ? s.n : 0), 0);
export const has = (itemId: string) => count(itemId) > 0;
export const bagIds = () => [...new Set([...bag, ...belt].filter(Boolean).map((s) => s!.id))];

// the bag upgrade. False at the cap.
export function growBag(): boolean {
  if (bagRowCount >= BAG_ROWS_MAX) return false;
  bagRowCount++;
  bag = bag.concat(new Array(BAG_COLS).fill(null));
  return true;
}

// belt slots only take battle-usable items — that's the whole point of the split
export const canHold = (a: Area, id: string) => a === "bag" || ITEMS[id]?.battle === true;

// Same signature and same return as before, so chests.ts is untouched. Tops up
// existing stacks first, then takes empty bag slots. A FULL BAG DROPS THE REST —
// compare the return against what you expected if that matters.
export function give(itemId: string, n = 1): number {
  if (!ITEMS[itemId]) throw new Error(`inventory: unknown item "${itemId}"`);
  const max = stackMax(itemId);
  let left = n;
  for (const s of [...belt, ...bag]) {
    if (left <= 0) break;
    if (!s || s.id !== itemId || s.n >= max) continue;
    const take = Math.min(max - s.n, left); s.n += take; left -= take;
  }
  for (let i = 0; i < bag.length && left > 0; i++) {
    if (bag[i]) continue;
    const take = Math.min(max, left); bag[i] = { id: itemId, n: take }; left -= take;
  }
  return count(itemId);
}

// take one from a named slot — what the battle menu calls
export function consume(r: Ref): string | null {
  const list = listOf(r.area), s = list[r.i];
  if (!s) return null;
  s.n--;
  if (s.n <= 0) list[r.i] = null;
  return s.id;
}

// move / swap / merge. False and NO change if the destination refuses it.
export function moveSlot(from: Ref, to: Ref): boolean {
  if (from.area === to.area && from.i === to.i) return false;
  const A = listOf(from.area), B = listOf(to.area);
  const a = A[from.i], b = B[to.i];
  if (!a) return false;
  if (!canHold(to.area, a.id)) return false;
  if (b && !canHold(from.area, b.id)) return false;   // the swap-back leg
  if (b && b.id === a.id) {
    const take = Math.min(stackMax(a.id) - b.n, a.n);
    if (take <= 0) return false;
    b.n += take; a.n -= take;
    if (a.n <= 0) A[from.i] = null;
    return true;
  }
  A[from.i] = b; B[to.i] = a;
  return true;
}

// container ids are roomId@x, so reordering a room's chests[] can't shuffle a save
export const chestId = (roomId: string, x: number) => `${roomId}@${x}`;
export const isOpened = (id: string) => opened.has(id);
export const markOpened = (id: string) => opened.add(id);

export type InventorySave = {
  bagRows: number;
  bag: (Stack | null)[];
  belt: (Stack | null)[];
  opened: string[];
};

export const serializeInventory = (): InventorySave => ({
  bagRows: bagRowCount,
  bag: bag.map((s) => (s ? { ...s } : null)),
  belt: belt.map((s) => (s ? { ...s } : null)),
  opened: [...opened],
});

// Accepts the OLD shape too (bag as a Record of tallies) so nothing saved before
// the grid existed is lost — it just gets re-given into slots.
export function hydrateInventory(
  s: Omit<Partial<InventorySave>, "bag"> & { bag?: Record<string, number> | (Stack | null)[] },
) {
  bagRowCount = Math.min(Math.max(s.bagRows ?? 1, 1), BAG_ROWS_MAX);
  bag = new Array(bagRowCount * BAG_COLS).fill(null);
  belt.fill(null);
  if (Array.isArray(s.bag)) {
    s.bag.forEach((x, i) => { if (i < bag.length) bag[i] = x ? { ...x } : null; });
    s.belt?.forEach((x, i) => { if (i < BELT_SLOTS) belt[i] = x ? { ...x } : null; });
  } else if (s.bag) {
    for (const id in s.bag) if (ITEMS[id]) give(id, s.bag[id]);
  }
  opened.clear();
  (s.opened ?? []).forEach((id) => opened.add(id));
}