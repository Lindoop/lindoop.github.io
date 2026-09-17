// combat/useItem.ts — using an item on a turn. Pure: state in, state out, same
// shape as combatLogic's actions. The SCENE pulls the item out of the belt; this
// file only applies the effect and hands the turn on.

import { ITEMS } from "../inventory";
import { current, byId, advance } from "./combatLogic";
import { clearOnHeal } from "./status";
import type { CombatState } from "./combatState";

const clone = (s: CombatState): CombatState => ({
  ...s,
  fighters: s.fighters.map((f) => ({ ...f, statuses: f.statuses.map((x) => ({ ...x })) })),
  log: [...s.log],
});

export const usable = (itemId: string) => !!ITEMS[itemId]?.use;

// targetId defaults to the actor. Returns the state UNCHANGED for an inert item,
// so a misfire can't silently eat a turn.
export function useItem(state: CombatState, itemId: string, targetId?: string): CombatState {
  const def = ITEMS[itemId];
  if (!def?.use) return state;
  const s = clone(state);
  const me = current(s);
  const t = targetId ? byId(s, targetId) : me;

  if (def.use.heal) {
    const before = t.hp;
    t.hp = Math.min(t.maxhp, t.hp + def.use.heal);
    t.statuses = clearOnHeal(t.statuses);   // healing washes out the bleed-style effects
    s.log.unshift(`${me.name} used ${def.name} — ${t.name} +${t.hp - before} HP`);
  }
  return advance(s);
}