// scenes/overworld.ts — exploration: movement, floaty/variable jump, the
// jump→glide→brace→land anim, room transitions, the scripted cellar exit, camera,
// content reader, and enemy encounters (touch → combat). All overworld logic lives
// here; GameCanvas just runs whichever scene is current.

import { ROOMS, floorTop, solids, type Room } from "../rooms";
import { SPRITE, ANIM, sheetKey, animLen, frameCol, stepAnim } from "../anim";
import { spawnEnemy, stepEnemy, enemyMark } from "../encounter";
import { VW, VH, GRAV, MOVE_WALK, MOVE_RUN, JUMP, DRAW_H, BODY_DX, C } from "../engine/consts";
import { room, drawWorld, drawShade, drawSprite } from "../engine/render";
import { tick as dialogueTick, talking, drawNpcs, drawDialogue, closeDialogue, TALK_KEY } from "../dialogue";
import { tick as chestTick, drawChests } from "../chests";
import type { Game, Scene } from "../engine/types";

// Scripted arrival up through a hole (a105 -> a104). Derived from the gap she came
// up through, not tuned per exit: she spawns one body-height below the floor (out
// of sight), tops out one body-height above it, and drifts just far enough that her
// trailing edge clears the far lip. MARGIN is the only feel number.
function arrivalArc(gap: { x0: number; x1: number }, w: number, h: number) {
  const MARGIN = 40;                                      // px of floor past the lip before her feet touch
  const depth = h, apex = h / 2;                          // below the floor at spawn / above it at the top
  const vy = Math.sqrt(2 * GRAV * (depth + apex));        // pop that reaches that apex
  const air = (vy + Math.sqrt(2 * GRAV * apex)) / GRAV;   // frames from spawn back down to floor level
  const dist = (gap.x1 - gap.x0) / 2 + w / 2 + MARGIN;    // gap centre -> her trailing edge, clear
  return { depth, vy, vx: dist / air };
}

export function makeOverworld(g: Game): Scene {
  const p = g.p;
  let animState = "stand", animIndex = 0, animAcc = 0, wasGrounded = true, landing = false;
  let launching = false, launchT = 0, landLock = 0, scriptFace = 1, arriving = false, arriveVx = 0;
  let fade = 0, fadeState: "none" | "out" | "in" = "none", pending: { to: string; entry: string } | null = null;
  let loaded = false;
  // NPC placement + idle anim now live in dialogue.ts

  const cx0 = () => p.x + p.w / 2;
  const curSheet = () => g.IMG[sheetKey(ANIM[animState], p.face)];
  const groundNear = (d: number) => { const r = room(g), feet = p.y + p.h; return solids(r).some((s) => p.x + p.w > s.x && p.x < s.x + s.w && s.y >= feet && s.y - feet <= d); };

  function clampCam(r: Room) { g.cam.x = Math.max(0, Math.min(r.w - VW, p.x + p.w / 2 - VW / 2)); g.cam.y = Math.max(0, Math.min(r.h - VH, p.y + p.h / 2 - VH / 2)); }

  function loadRoom(id: string, entry: string) {
    g.roomId = id; const r = ROOMS[id], ft = floorTop(r);
    if (entry === "left") { p.x = 30; p.y = (r.exits.left?.[0]?.y1 ?? ft) - p.h; p.face = 1; }
    else if (entry === "right") { p.x = r.w - p.w - 30; p.y = (r.exits.right?.[0]?.y1 ?? ft) - p.h; p.face = -1; }
    else if (entry === "top") { const o = r.exits.up!; p.x = (o.x0 + o.x1) / 2 - p.w / 2; p.y = 30; }
    else if (entry === "upExit") {
      const o = r.exits.down!;
      const arc = arrivalArc(o, p.w, p.h);
      p.x = (o.x0 + o.x1) / 2 - p.w / 2; p.y = ft - p.h + arc.depth; p.vy = -arc.vy;
      arriveVx = arc.vx;
      p.face = scriptFace; p.grounded = false; arriving = true;
    }
    else if (r.spawn?.[entry] !== undefined) { p.x = r.spawn[entry] - p.w / 2; p.y = ft - p.h; p.face = 1; }
    else { const o = r.exits.down!; p.x = (o.x0 + o.x1) / 2 - p.w / 2; p.y = ft - p.h; }
    if (entry !== "upExit") { p.vx = 0; p.vy = 0; }
    g.enemies = (r.enemies ?? []).map((e) => spawnEnemy(e.x, ft));
    clampCam(r);
  }
  const startT = (to: string, entry: string) => { fadeState = "out"; pending = { to, entry }; };

  return {
    enter(opts?: { respawn?: { room: string; entry: string } }) {
      closeDialogue();
      if (opts?.respawn) loadRoom(opts.respawn.room, opts.respawn.entry);
      else if (!loaded) loadRoom("a101", "left");
      loaded = true;
    },

    update(dt: number) {
      const { keys, took } = g;
      const k = dt / 16.667;   // frames-worth of time this tick; all the tuning below is per-frame at 60Hz
      if (took("Escape")) { loadRoom("a101", "left"); return; }
      if (fadeState === "out") { fade = Math.min(1, fade + 0.16 * k); if (fade >= 1 && pending) { loadRoom(pending.to, pending.entry); pending = null; fadeState = "in"; } return; }
      if (fadeState === "in") { fade = Math.max(0, fade - 0.16 * k); if (fade <= 0) fadeState = "none"; return; }
      const r = room(g), ft = floorTop(r);

      if (landLock > 0) landLock -= dt;
      const locked = launching || arriving || landLock > 0 || talking();

      p.vx = 0;
      const jumpPressed = keys[" "];   // held space keeps bouncing — auto-jump on landing
      const holding = arriving ? true : keys[" "];
      if (arriving) p.vx = scriptFace * arriveVx;
      if (!locked) {
        const spd = keys["Shift"] ? MOVE_RUN : MOVE_WALK;
        if (keys["ArrowLeft"] || keys["a"]) { p.vx = -spd; p.face = -1; }
        if (keys["ArrowRight"] || keys["d"]) { p.vx = spd; p.face = 1; }
        if (jumpPressed && p.grounded && r.exits.up) {
          const nearHole = cx0() > r.exits.up.x0 - 60 && cx0() < r.exits.up.x1 + 60 && p.y < 340;
          if (nearHole) { launching = true; launchT = 0; scriptFace = p.face; p.vy = -36; p.grounded = false; }
        }
        if (jumpPressed && p.grounded && !launching) { p.vy = -JUMP; p.grounded = false; }
      }
      if (!holding && p.vy < 0) p.vy *= 0.45;
      if (launching) { launchT += dt; if (p.y < 40 || launchT > 500) { launching = false; return startT(r.exits.up!.to, "upExit"); } }
      p.vy += GRAV * k; p.x += p.vx * k; p.y += p.vy * k;

      p.grounded = false;
      for (const s of solids(r)) { if (p.x + p.w > s.x && p.x < s.x + s.w && p.y + p.h > s.y && p.y + p.h - p.vy * k <= s.y + 1) { p.y = s.y - p.h; p.vy = 0; p.grounded = true; } }
      if (arriving && p.grounded) { arriving = false; landLock = 120; }

      if (p.x < 0) { const e = (r.exits.left ?? []).find((o) => p.y + p.h > o.y0 && p.y < o.y1); if (e) return startT(e.to, "right"); p.x = 0; }
      if (p.x + p.w > r.w) { const e = (r.exits.right ?? []).find((o) => p.y + p.h > o.y0 && p.y < o.y1); if (e) return startT(e.to, "left"); p.x = r.w - p.w; }
      const cx = p.x + p.w / 2;
      if (p.y < 0) { if (r.exits.up && cx > r.exits.up.x0 && cx < r.exits.up.x1) return startT(r.exits.up.to, "bottom"); p.y = 0; p.vy = 0; }
      if (p.y > r.h) { if (r.exits.down && !arriving) return startT(r.exits.down.to, "top"); p.y = ft - p.h; p.vy = 0; }

      const pbox = { x: p.x, y: p.y, w: p.w, h: p.h, grounded: p.grounded };
      const sol = solids(r);
      for (const e of g.enemies) { if (stepEnemy(e, pbox, dt, sol, GRAV, k)) { g.foe = e; g.ret = { x: p.x, y: p.y }; g.setScene("combat", { foe: e }); break; } }
      
      clampCam(r);
      dialogueTick(g, dt, ft);

      // E priority: NPCs, then chests, then doors — a chest parked in a doorway
      // shouldn't strand her, and talking always outranks looting.
      const looted = chestTick(g, ft, locked);

      // doors — checked AFTER dialogueTick so an NPC standing by a door still wins the E press
      if (!locked && !looted && p.grounded) {
        const d = (r.doors ?? []).find((o) => cx > o.x0 && cx < o.x1 && Math.abs(p.y + p.h - (o.y ?? ft)) < 40);
        if (d && took(TALK_KEY)) return startT(d.to, d.entry);
      }

      const moving = Math.abs(p.vx) > 0.1;
      const running = keys["Shift"];
      if (running) landing = false;
      if (p.grounded && !wasGrounded && !running) { landing = true; animState = "land"; animIndex = 0; animAcc = 0; }
      wasGrounded = p.grounded;
      let st: string;
      if (!p.grounded) st = p.vy < 0 ? "jump" : (groundNear(130) ? "brace" : "glide");
      else if (landing) st = "land";
      else st = moving ? (running ? "run" : "walk") : "stand";
      if (st !== animState) { animState = st; animIndex = 0; animAcc = 0; }
      const a = ANIM[animState], sh = curSheet();
      const len = animLen(a, sh?.ok ? sh.el.width : SPRITE.fw);
      const airborne = animState === "jump" || animState === "brace" || animState === "land";
      const res = stepAnim(a, animIndex, animAcc, dt, len, (animState === "land" && moving) || (running && airborne));
      animIndex = res.index; animAcc = res.acc;
      if (animState === "land" && res.done) landing = false;
    },

    draw() {
      const r = room(g), ft = floorTop(r), ctx = g.ctx;
      ctx.clearRect(0, 0, VW, VH);
      const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, "#d8c9b4"); grad.addColorStop(1, "#a89684"); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(-g.cam.x, -g.cam.y);

      drawWorld(g);
      drawShade(g);
      if (!r.bg && !r.layers) { ctx.fillStyle = "rgba(255,248,238,.72)"; ctx.fillRect(g.cam.x, g.cam.y, VW, VH); }   // TEMP: lighten only the untextured rooms
      ctx.fillStyle = "rgba(245,166,35,.55)"; ctx.font = '16px "Zilla Slab",serif'; ctx.textAlign = "center";
      r.exits.right?.forEach((o) => ctx.fillText("\u2192", r.w - 24, (o.y0 + o.y1) / 2));
      r.exits.left?.forEach((o) => ctx.fillText("\u2190", 24, (o.y0 + o.y1) / 2));
      if (r.exits.down) ctx.fillText("\u2193", (r.exits.down.x0 + r.exits.down.x1) / 2, ft + 44);
      if (r.exits.up) ctx.fillText("\u2191", (r.exits.up.x0 + r.exits.up.x1) / 2, 28);
      if (p.grounded) { const d = (r.doors ?? []).find((o) => cx0() > o.x0 && cx0() < o.x1 && Math.abs(p.y + p.h - (o.y ?? ft)) < 40); if (d) { ctx.fillStyle = C.hot; ctx.font = "14px sans-serif"; ctx.fillText("E", (d.x0 + d.x1) / 2, (d.y ?? ft) - 140); } }

      g.enemies.forEach((en) => { if (!en.alive) return; ctx.fillStyle = en.hostile ? C.ember : C.enemy; ctx.fillRect(en.x, en.y, en.w, en.h); ctx.fillStyle = C.coal; ctx.fillRect(en.face > 0 ? en.x + en.w - 12 : en.x + 7, en.y + 12, 6, 6); const m = enemyMark(en); if (m) { ctx.fillStyle = m === "?" ? C.hot : C.ember; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.fillText(m, en.x + en.w / 2, en.y - 12); } });
      const z = p.y + p.h;              // the player's own depth = the row their feet are on
      drawChests(g, ft, "behind", z);
      drawNpcs(g, ft, "behind", z);
      const sh = curSheet(), cfg = ANIM[animState];
      drawSprite(g, sh, SPRITE.fw, SPRITE.fh, frameCol(cfg, animIndex), p.x + p.w / 2 - BODY_DX * p.face, p.y + p.h, DRAW_H);
      drawNpcs(g, ft, "front", z);
      drawChests(g, ft, "front", z);

      r.fg?.forEach((o) => { const im = g.IMG[o.img]; if (im?.ok) ctx.drawImage(im.el, o.x, o.y, o.w ?? im.el.width, o.h ?? im.el.height); });
      ctx.restore();

      drawDialogue(g, ft)
      ctx.fillStyle = C.hot; ctx.font = "600 22px Cinzel, serif"; ctx.textAlign = "right"; ctx.fillText(r.name ?? r.area, VW - 20, 38);
      if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, VW, VH); }
    },
  };
}