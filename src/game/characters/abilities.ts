// characters/abilities.ts — the BEHAVIOR half of characters. JSON can't hold
// functions, so each ability is registered here by the string "key" the JSON
// references (e.g. "arrowShot"). An ability spawns its effects and calls
// c.resolve(...) with the combat result when it lands.

import { launchProjectile } from "../combat/effects";
import { castFx } from "../combat/fx";
import { basicAttack, useSkill, applyStatusAll, strike } from "../combat/combatLogic";
import type { AbilityCtx } from "./types";

export const ABILITIES: Record<string, (c: AbilityCtx) => void> = {
  // --- Mags ---
  arrowShot: (c) => {
    launchProjectile({
      sprite: "arrow", fw: 300, fh: 100, frames: 3,
      fromX: c.from.x, fromY: c.from.y, toX: c.to.x,
      onHit: () => c.resolve(basicAttack(c.state, c.targetId, c.move)),
    });
  },
  flourish: (c) => {                        
    launchProjectile({
      sprite: "arrow", fw: 300, fh: 100, frames: 3, speed: 22,
      fromX: c.from.x, fromY: c.from.y, toX: c.to.x,
      onHit: () => c.resolve(useSkill(c.state, c.targetId, c.move)),
    });
  },

  // --- Queenie ---
  causticBrew: (c) => castFx("oilWave", c, () => c.resolve(basicAttack(c.state, c.targetId, c.move))),
  grease:      (c) => castFx("oilPot",  c, () => c.resolve(applyStatusAll(c.state, "enemy", "greasy", 0, 0))),

  // --- Candy ---
  fireBolt: (c) => castFx("fireball", c, () => c.resolve(basicAttack(c.state, c.targetId, c.move))),
  scorchingRay: (c) => castFx("scorchingRay", c, () => c.resolve(strike(c.state, c.targetId, 1, c.move))),
};