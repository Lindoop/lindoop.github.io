// src/game/ui/useParty.ts
//
// Bridges roster.ts (plain mutable module state) to React for the HUD rail.
// roster has no change events, so this polls at 5 Hz and only sets state when the
// derived list actually differs — a recruit is a once-per-room event, not a
// per-frame one, so polling is cheaper and less invasive than adding a subscriber
// layer to roster.ts.
//
// ⚠️ HP IS A PLACEHOLDER. Nothing outside CombatState tracks hp today, so the rail
// shows full bars. Wire it by either (a) reading maxhp from characters.json here
// and live hp from a persistent store, or (b) adding hp to roster.ts alongside the
// serialize/hydrate hooks. Not doing either without a decision.

import { useEffect, useState } from "react";
import { partyIds, currentHp } from "../roster";
import { toFighter } from "../characters/characters";
import type { HudMember } from "./HUD";

// maxhp comes from toFighter, the same call combat.ts uses, so the rail can never
// disagree with the fight. Names come from there too instead of capitalising the id.
const build = (): HudMember[] =>
  partyIds().map((id) => {
    const f = toFighter(id, "party");
    return { id, name: f.name, hp: currentHp(id, f.maxhp), maxHp: f.maxhp };
  });

const sig = (ms: HudMember[]) => ms.map((m) => `${m.id}:${m.hp}/${m.maxHp}`).join(",");

export function useParty(ms = 200): HudMember[] {
  const [party, setParty] = useState<HudMember[]>(build);

  useEffect(() => {
    let last = sig(party);
    const t = setInterval(() => {
      const next = build(), s = sig(next);
      if (s !== last) { last = s; setParty(next); }
    }, ms);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);

  return party;
}