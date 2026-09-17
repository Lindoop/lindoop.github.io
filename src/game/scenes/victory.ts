// scenes/victory.ts — the WIN scene. Enemy blinks out, "You won the battle!"
// banner holds, then the player slides back to where they stood and we return to
// the overworld (with the beaten enemy removed).

import { COMBAT_SPRITE, SPRITE, ANIM, sheetKey } from "../anim";
import { VW, VH, DRAW_H, COMBAT_DRAW_H, BODY_DX, PARTY_GAP, PARTY_LEFT, C, ease } from "../engine/consts";
import { room, drawWorld, drawSprite, drawEffectsLayer } from "../engine/render";
import { clearEffects } from "../combat/effects";
import { partyIds } from "../roster";
import { getCharacter } from "../characters/characters";
import type { Game, Scene } from "../engine/types";

const ENEMY_FADE_MS = 640;   // enemy has blinked out by here
const BANNER_MS = 1400;      // banner holds until here, then slide home
const SLIDE_MS = 500;        // mirrors combat.ts's slidein, so the trip home matches the trip out

export function makeVictory(g: Game): Scene {
  const p = g.p;
  let t = 0, idleIndex = 0, idleAcc = 0, sliding = false, sc = 0, from = { x: 0, y: 0 };

  return {
    enter() { t = 0; sliding = false; sc = 0; },

    update(dt: number) {
      t += dt;
      idleAcc += dt; if (idleAcc > 1000 / 6) { idleAcc = 0; idleIndex++; }
      if (g.foe && t > ENEMY_FADE_MS) g.foe.alive = false;   // enemy gone
      if (!sliding && t > BANNER_MS) { sliding = true; sc = 0; from = { x: p.x, y: p.y }; p.face = g.ret.x < p.x ? -1 : 1; }
      if (sliding) {
        sc = Math.min(1, sc + dt / SLIDE_MS); const k = ease(sc);
        p.x = from.x + (g.ret.x - from.x) * k; p.y = from.y + (g.ret.y - from.y) * k;
        if (sc >= 1) {
          g.enemies = g.enemies.filter((en) => en.alive);   // drop the beaten foe
          g.foe = null; g.combat = null; clearEffects();
          g.setScene("overworld");
        }
      }
    },

    draw() {
      const ctx = g.ctx, e = g.foe;
      ctx.clearRect(0, 0, VW, VH);
      const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, "#d8c9b4"); grad.addColorStop(1, "#a89684"); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(-g.cam.x, -g.cam.y);
      drawWorld(g);
      ctx.fillStyle = "rgba(6,4,4,.45)"; ctx.fillRect(g.cam.x, g.cam.y, VW, VH);

      // enemy blinking out (there/gone/there) until faded
      const blink = Math.floor(t / 90) % 2 === 0;
      if (e && e.alive && blink) {
        const ew = e.w * 1.25, eh = e.h * 1.25, ex = e.x + e.w / 2 - ew / 2, ey = e.y + e.h - eh;
        ctx.fillStyle = C.enemy; ctx.fillRect(ex, ey, ew, eh);
        ctx.fillStyle = C.coal; ctx.fillRect(ex + 7, ey + 12, 6, 6);
      }
      drawEffectsLayer(g, "behind");
      // party holds formation through the banner; the extras cut the moment Mags slides home
      const roster = partyIds();
      const gap = Math.min(PARTY_GAP, (p.x - g.cam.x - PARTY_LEFT) / Math.max(1, roster.length - 1));
      for (let i = roster.length - 1; i >= 0; i--) {
        if (i > 0 && sliding) continue;                  // <- extras cut exactly when the slide starts
        if (i === 0 && sliding) {
          // The exact reverse of combat.ts's slidein: shrink COMBAT_DRAW_H -> DRAW_H on
          // the overworld walk sheet, and drift the body offset from combat's bodyDx to
          // overworld's BODY_DX, so the frame we hand to overworld.draw is identical to
          // the last frame drawn here. Without this the scale snaps at the scene switch
          // and reads as her dropping.
          const sk = ease(sc);
          const h = COMBAT_DRAW_H + (DRAW_H - COMBAT_DRAW_H) * sk;
          const off = (getCharacter("mags").bodyDx ?? 0) * COMBAT_DRAW_H * (1 - sk) + BODY_DX * p.face * sk;
          drawSprite(g, g.IMG[sheetKey(ANIM.stand, p.face)], SPRITE.fw, SPRITE.fh, 0, p.x + p.w / 2 - off, p.y + p.h, h);
          continue;
        }
        const ch = getCharacter(roster[i]), sheet = g.IMG[ch.sheets.idle];
        const cw = ch.cellW ?? COMBAT_SPRITE.fw, chh = ch.cellH ?? COMBAT_SPRITE.fh;
        const n = sheet?.ok ? Math.max(1, Math.round(sheet.el.width / cw)) : 1;
        const cx = (i === 0 ? p.x + p.w / 2 : p.x + p.w / 2 - i * gap) - (ch.bodyDx ?? 0) * COMBAT_DRAW_H;
        drawSprite(g, sheet, cw, chh, idleIndex % n, cx, p.y + p.h, COMBAT_DRAW_H);
      }
      drawEffectsLayer(g, "front");

      if (t > ENEMY_FADE_MS && !sliding) {
        const fade = Math.min(1, (t - ENEMY_FADE_MS) / 220);
        ctx.globalAlpha = fade; ctx.textAlign = "center";
        ctx.fillStyle = C.spark; ctx.font = "600 32px Cinzel, serif";
        ctx.fillText("You won the battle!", g.cam.x + VW / 2, g.cam.y + VH / 2 - 30);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.fillStyle = C.hot; ctx.font = "600 22px Cinzel, serif"; ctx.textAlign = "right"; ctx.fillText(room(g).name ?? room(g).area, VW - 20, 38);
    },
  };
}