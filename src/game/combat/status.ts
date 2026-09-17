// combat/status.ts — status effects. Pure data + pure functions: what each
// status is, how a second application behaves, what it ticks for, and how it
// bends incoming damage. Nothing here touches CombatState — combatLogic owns
// turn flow and calls in. That keeps statuses testable on their own and stops
// combatLogic growing a second job.

export type StatusId = "greasy" | "burning" | "bleeding" | "poisoned";

// one status riding on one fighter
export type Status = {
  id: StatusId;
  turns: number;     // turns remaining; -1 = until cleansed/healed
  power: number;     // the damage a tick is scaled from (0 for non-damaging)
  stacks: number;    // escalation counter — bleeding ramps on this
};

export type StatusDef = {
  name: string;
  colour: string;                          // for a status chip in the UI later
  duration: number;                        // turns on apply; -1 = until cleansed
  refresh: "reset" | "stack" | "ignore";   // what re-applying does
  tickPct?: number;                        // % of `power` dealt at the victim's turn start
  rampPct?: number;                        // added per stack (bleeding gets worse)
  vuln?: { element: string; mult: number };// incoming damage multiplier by attacker element
  note?: string;                           // one-line rules text for tooltips
};

export const STATUS: Record<StatusId, StatusDef> = {
  greasy: {
    name: "Greasy", colour: "#73c4b5",
    duration: 3, refresh: "reset",
    vuln: { element: "fire", mult: 1.5 },
    note: "Coated in oil. Fire damage is increased by 50%.",
  },
  burning: {
    name: "Burning", colour: "#e8632a",
    duration: 2, refresh: "reset",
    tickPct: 0.05,
    note: "Takes 5% of the igniting hit at the start of each turn.",
  },
  poisoned: {
    name: "Poisoned", colour: "#7fae5a",
    duration: 4, refresh: "reset",
    tickPct: 0.04,
    note: "Takes 4% of the applying hit at the start of each turn.",
  },
  bleeding: {
    name: "Bleeding", colour: "#90001f",
    duration: -1, refresh: "stack",
    tickPct: 0.05, rampPct: 0.05,
    note: "Worsens every turn — 5%, then 10%, then 15% — until healed.",
  },
};

// ------------------------------------------------------------- pure helpers --
// Every function returns NEW arrays. combatLogic clones fighters shallowly, so
// mutating a status list in place would leak across cloned states.

export const has = (list: Status[], id: StatusId) => list.some((s) => s.id === id);
export const find = (list: Status[], id: StatusId) => list.find((s) => s.id === id);

// apply (or re-apply) a status. `power` is the damage the tick scales from —
// usually the hit that caused it.
export function apply(list: Status[], id: StatusId, power = 0): Status[] {
  const def = STATUS[id];
  const existing = find(list, id);
  if (!existing) return [...list, { id, turns: def.duration, power, stacks: 0 }];

  if (def.refresh === "ignore") return list;
  return list.map((s) => {
    if (s.id !== id) return s;
    if (def.refresh === "stack") return { ...s, stacks: s.stacks + 1, power: Math.max(s.power, power) };
    return { ...s, turns: def.duration, power: Math.max(s.power, power) };   // "reset"
  });
}

export const remove = (list: Status[], id: StatusId) => list.filter((s) => s.id !== id);

// healing washes out the bleed-style effects; call from whatever heal you add
export const clearOnHeal = (list: Status[]) => list.filter((s) => STATUS[s.id].duration !== -1);

// how much a fighter's damage is multiplied by, given the ATTACKER's element
export function multiplier(list: Status[], element?: string): number {
  if (!element) return 1;
  return list.reduce((m, s) => {
    const v = STATUS[s.id].vuln;
    return v && v.element === element ? m * v.mult : m;
  }, 1);
}

// run at the start of the victim's turn. Returns the new list, the damage they
// take, and labels for the log.
export function tick(list: Status[]): { list: Status[]; damage: number; notes: string[] } {
  let damage = 0;
  const notes: string[] = [];
  const next: Status[] = [];

  for (const s of list) {
    const def = STATUS[s.id];
    if (def.tickPct !== undefined) {
      const pct = def.tickPct + (def.rampPct ?? 0) * s.stacks;
      const d = Math.max(1, Math.round(s.power * pct));
      damage += d;
      notes.push(def.name);
    }
    const stacks = def.rampPct !== undefined ? s.stacks + 1 : s.stacks;   // ramping ones worsen
    const turns = s.turns === -1 ? -1 : s.turns - 1;
    if (turns !== 0) next.push({ ...s, turns, stacks });                  // 0 = expired, drop it
  }
  return { list: next, damage, notes };
}

// "Greasy · Burning" — for a log line or a UI chip row
export const describe = (list: Status[]) => list.map((s) => STATUS[s.id].name).join(" \u00b7 ");