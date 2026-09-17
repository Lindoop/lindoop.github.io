// combat/combatLogic.ts — the pure RULES of a fight. State in, state out.
// Turn order is action-value based (HSR-style): advance() resets the actor's av
// and hands the turn to whoever now has the lowest av. Skill points are the
// SHARED team pool. turnOrder() previews upcoming turns for a UI sidebar.

import type { CombatState, Fighter } from "./combatState";
import { baseAV } from "./combatState";
import type { Side } from "./combatState";
import { STATUS, apply as applyStatus, tick as tickStatus, multiplier, type StatusId } from "./status";

export const byId = (s: CombatState, id: string) => s.fighters.find((f) => f.id === id)!;
export const current = (s: CombatState) => byId(s, s.activeId);
export const living = (s: CombatState, side: "party" | "enemy") =>
  s.fighters.filter((f) => f.side === side && f.alive);

export function outcome(s: CombatState): "win" | "lose" | null {
  if (living(s, "enemy").length === 0) return "win";
  if (living(s, "party").length === 0) return "lose";
  return null;
}

function hit(attacker: Fighter | null, target: Fighter, dmg: number, log: string[], move: string) {
  const mult = multiplier(target.statuses, attacker?.element);
  const dealt = Math.max(1, Math.round(dmg * mult));
  target.hp = Math.max(0, target.hp - dealt);
  if (target.hp === 0) target.alive = false;
  log.unshift(`[${move.toUpperCase()}] ${attacker?.name ?? "?"} did ${dealt} damage`
            + `${mult > 1 ? " — vulnerable!" : ""}${target.alive ? "" : " — down!"}`);
  return dealt;
}

function clone(s: CombatState): CombatState {
  return { ...s, fighters: s.fighters.map((f) => ({ ...f, statuses: f.statuses.map((x) => ({ ...x })) })), log: [...s.log] };
}

export function basicAttack(state: CombatState, targetId: string, move = "Attack"): CombatState {
  const s = clone(state);
  const me = current(s), t = byId(s, targetId);
  hit(me, t, me.atk - t.def, s.log, move);
  return advance(s);
}

export function gainSkillPoint(state: CombatState): CombatState {
  const s = clone(state);
  s.skillPoints = Math.min(s.maxSkillPoints, s.skillPoints + 1);
  return s;
}

export function useSkill(state: CombatState, targetId: string, move = "Skill"): CombatState {
  const s = clone(state);
  const me = current(s), t = byId(s, targetId);
  hit(me, t, (me.atk - t.def) * 1.8, s.log, move);
  return advance(s);
}

// a skill that applies a status to a whole side and deals NO damage (Queenie's Grease)
export function applyStatusAll(state: CombatState, side: Side, id: StatusId, power = 0, spend = 1): CombatState {
  if (state.skillPoints < spend) return state;           // caller should gate on this too
  const s = clone(state);
  const me = current(s);
  s.skillPoints = Math.max(0, s.skillPoints - spend);
  for (const f of s.fighters.filter((x) => x.side === side && x.alive)) f.statuses = applyStatus(f.statuses, id, power);
  s.log.unshift(`${me.name} coats ${side === "enemy" ? "the enemy" : "the party"} — ${STATUS[id].name}`);
  return advance(s);
}

export function strike(state: CombatState, targetId: string, mult = 1, move = "Hit"): CombatState {
  const s = clone(state);
  const me = current(s), t = byId(s, targetId);
  hit(me, t, (me.atk - t.def) * mult, s.log, move);
  return s;
}

export function spendSkillPoint(state: CombatState): CombatState {
  const s = clone(state);
  s.skillPoints = Math.max(0, s.skillPoints - 1);
  return s;
}

export function opportunityHit(state: CombatState, attackerId: string, targetId: string, mult = 0.7): CombatState {
  const s = clone(state);
  const a = byId(s, attackerId), t = byId(s, targetId);
  hit(a, t, (a.atk - t.def) * mult, s.log, "Parting Shot");
  return s;
}

export function advance(state: CombatState): CombatState {
  const s = clone(state);
  const end = outcome(s);
  if (end) { s.phase = end; return s; }
  const acted = byId(s, s.activeId);
  acted.av = baseAV(acted.speed);
  const alive = s.fighters.filter((f) => f.alive);
  const min = Math.min(...alive.map((f) => f.av));
  alive.forEach((f) => (f.av -= min));
  const actor = alive.reduce((a, b) => (a.av <= b.av ? a : b));
  s.activeId = actor.id;
  const t = tickStatus(actor.statuses);
  actor.statuses = t.list;
  if (t.damage > 0) {
    actor.hp = Math.max(0, actor.hp - t.damage);
    if (actor.hp === 0) actor.alive = false;
    s.log.unshift(`${actor.name} takes ${t.damage} from ${t.notes.join(" + ")}${actor.alive ? "" : " — down!"}`);
  }
  if (!actor.alive) return advance(s);
  s.phase = actor.side === "party" ? "choose" : "resolve";
  return s;
}

export function turnOrder(state: CombatState, n = 6): string[] {
  const q = living(state, "party").concat(living(state, "enemy")).map((f) => ({ id: f.id, av: f.av, speed: f.speed }));
  const out: string[] = [];
  for (let k = 0; k < n && q.length; k++) {
    const min = Math.min(...q.map((f) => f.av));
    q.forEach((f) => (f.av -= min));
    let bi = 0; for (let i = 1; i < q.length; i++) if (q[i].av < q[bi].av) bi = i;
    out.push(q[bi].id);
    q[bi].av = baseAV(q[bi].speed);
  }
  return out;
}

// simple enemy AI: basic-attack a random living party member
export function enemyTurn(state: CombatState): CombatState {
  const targets = living(state, "party");
  if (targets.length === 0) return { ...state, phase: "lose" };
  const pick = targets[Math.floor(Math.random() * targets.length)];
  return basicAttack(state, pick.id);
}