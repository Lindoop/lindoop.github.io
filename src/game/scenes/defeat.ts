// scenes/defeat.ts — the LOSS scene. "You were defeated…" holds, then the player
// is sent back to the start of the map (respawn) and we return to the overworld.

import { VW, VH, C } from "../engine/consts";
import { drawWorld } from "../engine/render";
import { clearEffects } from "../combat/effects";
import { restParty } from "../roster";
import type { Game, Scene } from "../engine/types";

const HOLD_MS = 1900;
const RESPAWN = { room: "a101", entry: "left" };

export function makeDefeat(g: Game): Scene {
  let t = 0;
  return {
    enter() { t = 0; g.dom.ui.style.display = "none"; },

    update(dt: number) {
      t += dt;
      if (t > HOLD_MS) {
        clearEffects(); g.combat = null; g.foe = null;
        restParty();                    // a wipe sends you home whole — respawn IS the rest
        g.setScene("overworld", { respawn: RESPAWN });   // overworld.enter loads the room
      }
    },

    draw() {
      const ctx = g.ctx;
      ctx.clearRect(0, 0, VW, VH);
      const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, "#d8c9b4"); grad.addColorStop(1, "#a89684"); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(-g.cam.x, -g.cam.y);
      drawWorld(g);
      const fade = Math.min(1, t / 350);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * fade})`; ctx.fillRect(g.cam.x, g.cam.y, VW, VH);
      ctx.globalAlpha = fade; ctx.textAlign = "center";
      ctx.fillStyle = "#b23a48"; ctx.font = "600 32px Cinzel, serif";
      ctx.fillText("You were defeated\u2026", g.cam.x + VW / 2, g.cam.y + VH / 2 - 20);
      ctx.fillStyle = C.dim; ctx.font = '14px "Zilla Slab",serif';
      ctx.fillText("sent back to the start", g.cam.x + VW / 2, g.cam.y + VH / 2 + 14);
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
}