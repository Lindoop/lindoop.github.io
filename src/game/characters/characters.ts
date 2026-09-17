// characters/characters.ts — the EXECUTOR. Reads the numbers from
// characters.json, attaches the real ability functions from abilities.ts by key,
// and hands back ready-to-use Characters / combat Fighters. This is the only
// place JSON data and ability code get stitched together.

import data from "./characters.json";
import { ABILITIES } from "./abilities";
import type { Character, CharacterData, AbilityMeta, Ability } from "./types";
import { makeFighter, type Fighter, type Side } from "../combat/combatState";

const DB = data as Record<string, CharacterData>;

function buildAbility(meta: AbilityMeta): Ability {
  const perform = ABILITIES[meta.key];
  if (!perform) throw new Error(`characters.json references unknown ability "${meta.key}"`);
  return { ...meta, perform };
}

const cache: Record<string, Character> = {};

// full runtime character (stats + abilities with functions attached)
export function getCharacter(id: string): Character {
  if (cache[id]) return cache[id];
  const d = DB[id];
  if (!d) throw new Error(`no character "${id}" in characters.json`);
  const c: Character = {
    id, name: d.name,
    stats: { hp: d.hp, atk: d.atk, def: d.def, speed: d.speed },
    element: d.element,
    idleFps: d.idleFps,
    bodyDx: d.bodyDx,
    cellW: d.cellW,
    cellH: d.cellH,
    sheets: d.sheets,
    basic: buildAbility(d.basic),
    skill: buildAbility(d.skill),
  };
  cache[id] = c;
  return c;
}

// turn a character id into a combat Fighter (stats only; abilities are looked up
// via getCharacter when it's their turn)
export function toFighter(id: string, side: Side): Fighter {
  const c = getCharacter(id);
  return makeFighter(id, c.name, side, { hp: c.stats.hp, atk: c.stats.atk, def: c.stats.def, speed: c.stats.speed, element: c.element });
}

export const allCharacterIds = () => Object.keys(DB);