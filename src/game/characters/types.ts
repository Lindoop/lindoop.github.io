// characters/types.ts — shapes for the data-driven character system.
// characters.json matches CharacterData/AbilityMeta; characters.ts turns that
// into a runtime Character with real ability functions attached.

import type { CombatState } from "../combat/combatState";

export type AbilityCtx = {
  state: CombatState;
  actorId: string;
  targetId: string;
  z: number;
  move: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  resolve: (next: CombatState) => void;
};

export type AbilityMeta = {
  name: string;
  key: string;
  sheet: string;
  releaseFrame: number;
  spCost: number;
  motion?: boolean;
  charge?: boolean;
};

export type CharacterData = {
  name: string;
  hp: number; atk: number; def: number; speed: number;
  element?: string;
  idleFps?: number;
  bodyDx?: number;
  cellW?: number;
  cellH?: number;
  sheets: { idle: string; entry: string };
  basic: AbilityMeta;
  skill: AbilityMeta;
};

export type Ability = AbilityMeta & { perform: (c: AbilityCtx) => void };

export type Character = {
  id: string;
  name: string;
  stats: { hp: number; atk: number; def: number; speed: number };
  element?: string;
  idleFps?: number;
  bodyDx?: number;
  cellW?: number;
  cellH?: number;
  sheets: { idle: string; entry: string };
  basic: Ability;
  skill: Ability;
};