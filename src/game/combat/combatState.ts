// combat/combatState.ts — the shape of a fight. Turn order is HSR-style: each
// fighter has an ACTION VALUE (av = 10000/speed) that counts down; whoever hits 0
// acts next, then their av resets. Fast fighters refill quicker → act more often.
// Skill points are a SHARED team pool. No turn logic here (combatLogic.ts), no drawing.

import type { Status } from "./status";

export type Side = "party" | "enemy";

export type Fighter = {
  id: string;
  name: string;
  side: Side;
  hp: number; maxhp: number;
  atk: number;
  def: number;
  speed: number;          // higher = smaller action value = acts more often
  element?: string;
  av: number;             // action value — lower = acts sooner. Refilled on advance().
  statuses: Status[];     // greasy / burning / bleeding …
  alive: boolean;
};

export type CombatPhase = "intro" | "choose" | "resolve" | "win" | "lose";

export type CombatState = {
  fighters: Fighter[];
  activeId: string;       // whose turn it is right now (replaces the old fixed order/turn)
  phase: CombatPhase;
  log: string[];
  skillPoints: number;    // SHARED across the party
  maxSkillPoints: number;
};

export const START_SP = 3;
export const MAX_SP = 5;

// action value from speed. Lower speed → bigger av → waits longer between turns.
export const baseAV = (speed: number) => 10000 / Math.max(1, speed);

export function makeFighter(
  id: string, name: string, side: Side,
  stats: Partial<Pick<Fighter, "hp" | "atk" | "def" | "speed" | "element">> = {}
): Fighter {
  const hp = stats.hp ?? 30;
  const speed = stats.speed ?? 10;
  return {
    id, name, side,
    hp, maxhp: hp,
    atk: stats.atk ?? 8,
    def: stats.def ?? 3,
    speed,
    element: stats.element,
    av: baseAV(speed),
    statuses: [],
    alive: true,
  };
}

export function createCombat(party: Fighter[], enemies: Fighter[]): CombatState {
  const fighters = [...party, ...enemies].map((f) => ({ ...f, av: baseAV(f.speed) }));
  // advance time to the first actor: subtract the smallest av from everyone
  const min = Math.min(...fighters.map((f) => f.av));
  fighters.forEach((f) => (f.av -= min));
  const actor = fighters.reduce((a, b) => (a.av <= b.av ? a : b));
  return {
    fighters,
    activeId: actor.id,
    phase: actor.side === "party" ? "choose" : "resolve",
    log: [],
    skillPoints: START_SP,
    maxSkillPoints: MAX_SP,
  };
}