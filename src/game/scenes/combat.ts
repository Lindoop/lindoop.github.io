// scenes/combat.ts — the turn-based fight. Slides fighters into formation, plays
// the entry, then runs turns. Each party turn dispatches to the ACTING CHARACTER's
// ability. Mags's skill ("flourish") is a FRAME-DRIVEN motion here: the animation
// frames drive her position, the damage beat, and the arrow spawn/fire. Win →
// victory, lose → defeat.

import { floorTop } from "../rooms";
import { COMBAT_SPRITE, ANIM, sheetKey } from "../anim";
import { VW, VH, DRAW_H, COMBAT_DRAW_H, PARTY_GAP, PARTY_LEFT, C, ease } from "../engine/consts";
import { room, drawWorld, drawSprite, drawEffectsLayer, drawEffectsSlot, hpbar, drawSkillPoints } from "../engine/render";
import { createCombat, makeFighter, type CombatState } from "../combat/combatState";
import { enemyTurn, living, current, strike, spendSkillPoint, advance, outcome, opportunityHit } from "../combat/combatLogic";
import { stepEffects, clearEffects, clearSprite, addEffect, effectsBusy, type Effect } from "../combat/effects";
import { getCharacter, toFighter } from "../characters/characters";
import { BOW, spawnPortal } from "../combat/fx";
import { drawMenu, ROOT, type RootId, type Slot } from "./menu";
import { gainSkillPoint } from "../combat/combatLogic";
import { partyIds, currentHp, setHp } from "../roster";
import { ITEMS, beltSlots, consume } from "../inventory";
import { useItem, usable } from "../combat/useItem";
import type { Game, Scene } from "../engine/types";

export function makeCombat(g: Game): Scene {
  const p = g.p;
  type Phase = "slidein" | "entry" | "battle";
  let phase: Phase = "slidein";
  let ct = 0, entryIndex = 0, entryAcc = 0, idleIndex = 0, idleAcc = 0, enemyDelay = 0;
  const idles: Record<string, { i: number; acc: number }> = {};
  let attacking = false, atkIndex = 0, atkAcc = 0, atkSheet = "basicAtk", releaseFrame = 6, fired = false;
  let pendingTid: string | undefined, actingId = "mags", chosenKind: "basic" | "skill" = "basic";

  let charge = 0, bowsLeft = 0, bowLo = 0, bowHi = 0, bowWait = 0, chargeDone = false;
  let portalAt: { x: number; y: number }[] = [];
  let fromP = { x: 0, y: 0 }, fromE = { x: 0, y: 0 };
  const ATK_FPS = 16;
  let pendingEnd: "win" | "lose" | null = null, killT = 0;
  const SKILL_N = 28, ARC_H = 150, FRAME_MS = 100;
  const FRAME_DUR: Record<number, number> = { 12: 200, 14: 60, 15: 60, 16: 60, 20: 60, 21: 60, 22: 60, 23: 60 };
  const F_MOVE = 5, F_REACH = 8, F_LEAP = 13, F_LAND = 24;
  const HIT = 10, ARROW_SPAWN = 17, ARROW_FIRE = 18;
  const SLASH_MULT = 0.9, ARROW_MULT = 0.9;
  const durOf = (f: number) => FRAME_DUR[f] ?? FRAME_MS;
  const START: number[] = []; START[1] = 0;
  for (let f = 2; f <= SKILL_N + 1; f++) START[f] = START[f - 1] + durOf(f - 1);
  const SKILL_TOTAL = START[SKILL_N + 1];
  let motion: { e: number; frame: number; ox: number; oy: number; tx: number; damaged: boolean; up: boolean; shot: boolean } | null = null;
  let motSheet = "flourish";
  let skillArrow: Effect | null = null;


  const slot = () => ({ px: g.cam.x + 300, ex: g.cam.x + 610, fy: floorTop(room(g)) });
  const gapFor = (n: number) => Math.min(PARTY_GAP, (slot().px - g.cam.x - PARTY_LEFT) / Math.max(1, n - 1));
  let lineup: string[] = partyIds();
  let lastActive = "";
  const at: Record<string, number> = {};

  function relineup() {
    const cb = g.combat, ids = partyIds();
    if (!cb) { lineup = [...ids].sort((a, b) => getCharacter(b).stats.speed - getCharacter(a).stats.speed || a.localeCompare(b)); return; }
    const avOf = (id: string) => { const f = cb.fighters.find((x) => x.id === id); return f?.alive ? f.av : Infinity; };
    lineup = [...ids].sort((a, b) => avOf(a) - avOf(b) || a.localeCompare(b));
  }

  const SLIDE = 0.11;
  function stepLineup(k: number) {
    lineup.forEach((id, i) => {
      const cur = at[id] ?? i, d = i - cur;
      at[id] = Math.abs(d) < 0.005 ? i : cur + Math.sign(d) * Math.min(Math.abs(d), SLIDE * k);
    });
  }
  const slotOf = (id: string) => at[id] ?? lineup.indexOf(id);
  const backToFront = () => [...lineup].sort((a, b) => slotOf(b) - slotOf(a));
  // Whoever is nearest slot 0 RIGHT NOW, animation included. Differs from
  // cb.activeId during the shuffle, which is the whole point.
  const front = () => lineup.reduce((a, b) => (slotOf(a) <= slotOf(b) ? a : b), lineup[0]);
  const sliding = () => lineup.some((id, i) => Math.abs(slotOf(id) - i) > 0.01);
  const anchor = (s: number, id?: string, n = lineup.length) =>
    id === "mags" && (phase === "slidein" || motion)
      ? { cx: p.x + p.w / 2, by: p.y + p.h }
      : { cx: slot().px + p.w / 2 - s * gapFor(n), by: slot().fy };
  const cellOf = (id: string) => { const c = getCharacter(id); return { w: c.cellW ?? COMBAT_SPRITE.fw, h: c.cellH ?? COMBAT_SPRITE.fh }; };
  const bodyX = (id: string, cx: number) => cx - (getCharacter(id).bodyDx ?? 0) * COMBAT_DRAW_H;
  const frames = (key: string, fallback: number, cw = COMBAT_SPRITE.fw) => (g.IMG[key]?.ok ? Math.max(1, Math.round(g.IMG[key].el.width / cw)) : fallback);
  const framesOf = (id: string, key: string, fallback: number) => frames(key, fallback, cellOf(id).w);
  const firstFoeId = () => (g.combat ? living(g.combat, "enemy")[0]?.id : undefined);
  let inFlight = false;
  let wasBusy = false;
  const BLINK = { flash: 360, pause: 280 };
  let flash = 0, hold = 0;
  const busy = () => attacking || !!motion || inFlight || effectsBusy() || flash > 0 || hold > 0 || sliding();
  const partyDisplay = () => {
    const cb = g.combat; if (!cb) return getCharacter("mags");
    const a = current(cb);
    const pid = a.side === "party" ? a.id : (living(cb, "party")[0]?.id ?? "mags");
    return getCharacter(pid);
  };

  const FLEE_DC = 15, FLEE_BONUS = 0;
  const syncUI = () => {};                       // canvas menu redraws every frame
  const hit = { row: -1, slot: -1 };
  let uiT = 0;
  const TOAST = { life: 2600, fade: 700, step: 18 };
  let toasts: { text: string; t: number }[] = [];
  let logLen = 0;
  let open: RootId | null = null;
  const slots = (): Slot[] => {
    const cb = g.combat; if (!cb) return [];
    const can = cb.phase === "choose" && !busy();
    if (open === "attack") {
      if (charge > 0) {
        const ch = getCharacter(front());
        return [
          { label: ch.skill.name, on: () => act("skill"), ok: can && charge < cb.skillPoints,
            icon: `icon_${ch.skill.key}`, frame: charge - 1, art: "chargeBar" },
          { label: "FIRE", on: fireCharge, ok: can, art: "releaseBtn" },
        ];
      }
      const me = getCharacter(front());
      return [
        { label: me.basic.name, on: () => act("basic"), ok: can, icon: `icon_${me.basic.key}`, preview: +1 },
        { label: me.skill.name, on: () => act("skill"), ok: can && cb.skillPoints >= 1, icon: `icon_${me.skill.key}`, preview: -1, frame: 0 },
      ];
    }
    if (open === "act") return [
      { label: "CHECK", on: () => { cb.log.unshift(checkLine()); }, ok: can },
      { label: "SPARE", on: () => { cb.log.unshift("They aren't ready to be spared."); }, ok: can },
    ];
    if (open === "bag") return beltSlots().map((s, i) => ({
      label: s ? (s.n > 1 ? `${ITEMS[s.id].name} x${s.n}` : ITEMS[s.id].name) : "\u2014",
      on: () => useItemAction(i),
      ok: can && !!s && usable(s.id),
      icon: s ? ITEMS[s.id].icon : undefined,
      art: "inventorySlot",
    }));
    if (open === "run") return [{ label: "ROLL d20", on: fleeAttempt, ok: can }];
    return [];
  };

  function checkLine() {
    const cb = g.combat!, f = cb.fighters.find((x) => x.side === "enemy" && x.alive);
    return f ? `${f.name}  HP ${f.hp}/${f.maxhp}  ATK ${f.atk}  DEF ${f.def}  SPD ${f.speed}` : "Nothing to check.";
  }

  function menuClick() {
    if (!g.clicked()) return;
    if (hit.slot >= 0) { const s = slots()[hit.slot]; if (s?.ok) s.on(); return; }
    if (hit.row >= 0) open = ROOT[hit.row];
  }

  function useItemAction(i: number) {
    const cb = g.combat; if (!cb || busy() || cb.phase !== "choose") return;
    const s = beltSlots()[i];
    if (!s || !usable(s.id)) { cb.log.unshift("Nothing to use there."); return; }
    const id = consume({ area: "belt", i });
    if (!id) return;
    open = null;
    resolve(useItem(cb, id));      // resolve() handles enemyDelay, pendingEnd and syncUI
  }

  function fleeAttempt() {
    const cb = g.combat; if (!cb || busy() || cb.phase !== "choose") return;
    open = null;
    const roll = 1 + Math.floor(Math.random() * 20) + FLEE_BONUS;
    cb.log.unshift(`Flee (DEX): rolled ${roll}`);
    if (roll >= FLEE_DC) { cb.log.unshift("Slipped away clean."); return endFlee(); }
    if (roll >= 10) { 
      const foeId = living(cb, "enemy")[0]?.id, meId = current(cb).id;
      if (foeId) g.combat = opportunityHit(cb, foeId, meId, 0.7);
      (g.combat ?? cb).log.unshift("Got away, but took a parting hit.");
      if (g.combat && outcome(g.combat) === "lose") { g.combat.phase = "lose"; return g.setScene("defeat"); }
      return endFlee();
    }
    cb.log.unshift("Couldn't break away! Turn lost.");
    g.combat = advance(cb);
    if (g.combat.phase === "resolve") enemyDelay = 650;
    syncUI();
  }

  function endFlee() {
    clearEffects();
    if (g.foe) g.foe.cool = 1600;
    p.x = g.ret.x; p.y = g.ret.y;
    g.combat = null; g.foe = null;
    g.setScene("overworld");
  }

  function resolve(next: CombatState) {
    const foeHp = (s: CombatState | null) => s?.fighters.find((f) => f.side === "enemy")?.hp ?? 0;
    if (foeHp(next) < foeHp(g.combat)) flash = BLINK.flash;
    hold = BLINK.pause;
    inFlight = false;
    g.combat = next;
    if (next.phase === "win" || next.phase === "lose") { pendingEnd = next.phase; killT = 0; syncUI(); return; }
    if (next.phase === "resolve") enemyDelay = 650;
    syncUI();
  }

  function act(kind: "basic" | "skill") {
    const cb = g.combat; if (!cb || phase !== "battle" || cb.phase !== "choose" || busy()) return;
    const tid = firstFoeId(); if (!tid) return;
    const ch = getCharacter(current(cb).id);
    const ability = kind === "basic" ? ch.basic : ch.skill;

    if (ability.charge) {
      pendingTid = tid; actingId = ch.id; chosenKind = "skill";
      if (charge < cb.skillPoints) {
        const a = anchor(slotOf(ch.id), ch.id);
        portalAt.push(spawnPortal(charge, a.cx, a.by - 60 - COMBAT_DRAW_H * 0.95, Math.max(0, lineup.indexOf(ch.id))));
        charge++;
      }
      open = "attack"; syncUI(); return;
    }

    pendingTid = tid; actingId = ch.id; chosenKind = kind; open = null;

    if (ability.motion) {
      const ox = p.x, oy = p.y;
      const tx = g.foe ? g.foe.x - 70 : ox + 260;
      motSheet = ability.sheet;
      motion = { e: 0, frame: 1, ox, oy, tx, damaged: false, up: false, shot: false };
      g.combat = spendSkillPoint(cb);          // movement path skips the line below
      skillArrow = null; syncUI(); return;
    }
    attacking = true; atkIndex = 0; atkAcc = 0; fired = false;
    atkSheet = ability.sheet; releaseFrame = ability.releaseFrame;
    g.combat = kind === "basic" ? gainSkillPoint(cb) : spendSkillPoint(cb);
    syncUI();
  }

  function fireCharge() {
    const cb = g.combat; if (!cb || busy() || charge < 1) return;
    const ch = getCharacter(actingId);
    const n = framesOf(actingId, ch.skill.sheet, BOW.hi + 1);
    bowHi = Math.min(BOW.hi, n - 1); bowLo = Math.min(BOW.lo, bowHi);
    bowsLeft = charge;
    attacking = true; atkIndex = 0; atkAcc = 0; fired = false;
    atkSheet = ch.skill.sheet; releaseFrame = bowLo;
    open = null; syncUI();
  }

  function endCharge() {
    const cb = g.combat, n = charge;
    charge = 0; bowsLeft = 0; portalAt = []; clearSprite("candyPortal");
    if (!cb) return;
    let s = cb;
    for (let i = 0; i < n; i++) s = spendSkillPoint(s);
    resolve(advance(s));
  }

  function fireAbility() {
    const cb = g.combat; if (!cb || !pendingTid) return;
    if (!firstFoeId()) return;
    const ch = getCharacter(actingId);
    const ability = chosenKind === "skill" ? ch.skill : ch.basic;
    const slotIdx = Math.max(0, lineup.indexOf(ch.id));
    const a = anchor(slotOf(ch.id), ch.id);
    inFlight = true;
    ability.perform({
      get state() { return g.combat ?? cb; }, actorId: ch.id, targetId: pendingTid, z: slotIdx, move: ability.name,
      from: bowsLeft > 0 ? portalAt[Math.min(charge - bowsLeft, portalAt.length - 1)] : { x: a.cx + 60, y: a.by - 60 },
      to: { x: g.foe ? g.foe.x + g.foe.w / 2 : a.cx + 400, y: a.by - 60 },
      resolve,
    });
  }

  return {
    enter(opts: { foe: any }) {
      g.foe = opts.foe; const e = opts.foe;
      p.face = 1; e.face = -1;
      fromP = { x: p.x, y: p.y }; fromE = { x: e.x, y: e.y };
      phase = "slidein"; ct = 0; g.combat = null; motion = null; attacking = false; pendingEnd = null; skillArrow = null; inFlight = false; wasBusy = false;
      charge = 0; bowsLeft = 0; bowWait = 0; chargeDone = false; portalAt = [];
      toasts = []; logLen = 0;
      lastActive = ""; for (const k in at) delete at[k];
      relineup(); lineup.forEach((id, i) => { at[id] = i; });
      open = null;
      clearEffects();
    },
    exit() { g.dom.ui.style.display = "none"; },

    update(dt: number) {
      const s = slot(), e = g.foe;
      if (phase === "slidein") {
        ct = Math.min(1, ct + dt / 500); const k = ease(ct);
        p.x = fromP.x + (s.px - fromP.x) * k; p.y = fromP.y + ((s.fy - p.h) - fromP.y) * k;
        if (e) { e.x = fromE.x + (s.ex - fromE.x) * k; e.y = fromE.y + ((s.fy - e.h) - fromE.y) * k; }
        if (ct >= 1) { phase = "entry"; entryIndex = 0; entryAcc = 0; }
        return;
      }
      if (phase === "entry") {
        const n = frames(partyDisplay().sheets.entry, 11); entryAcc += dt;
        if (entryAcc > 1000 / 10) { entryAcc = 0; if (entryIndex < n - 1) entryIndex++; }
        if (!g.combat && entryIndex >= Math.floor(n / 2)) {
          const party = partyIds().map((id) => {
            const f = toFighter(id, "party");
            f.hp = currentHp(id, f.maxhp);
            f.alive = f.hp > 0;
            return f;
          });
          const foes = [makeFighter("foe", "Enemy", "enemy", { hp: 300, atk: 7, def: 2, speed: 8 })];
          g.combat = createCombat(party, foes);
          g.combat.phase = current(g.combat).side === "party" ? "choose" : "resolve";
          if (g.combat.phase === "resolve") enemyDelay = 650;
          lastActive = g.combat.activeId; relineup();
          lineup.forEach((id, i) => { at[id] = i; });
          open = current(g.combat).side === "party" ? "attack" : null;
          syncUI();
        }
        if (entryIndex >= n - 1) phase = "battle";
        return;
      }

      const cb = g.combat; if (!cb) return;
      for (const f of cb.fighters) if (f.side === "party") setHp(f.id, f.hp);
      idleAcc += dt; const idleN = framesOf(partyDisplay().id, partyDisplay().sheets.idle, 1);
      if (idleAcc > 1000 / 6) { idleAcc = 0; idleIndex = (idleIndex + 1) % idleN; }
      for (const id of partyIds()) {
        const ch = getCharacter(id), st = (idles[id] ||= { i: 0, acc: 0 });
        st.acc += dt;
        const fps = ch.idleFps ?? 6;
        if (st.acc > 1000 / fps) { st.acc = 0; st.i = (st.i + 1) % framesOf(id, ch.sheets.idle, 1); }
      }

      if (attacking) {
        const atkN = framesOf(actingId, atkSheet, 17);
        if (bowWait > 0) {
          bowWait -= dt;
          if (bowWait <= 0) { atkIndex = bowLo; fired = false; atkAcc = 0; }
        } else {
          atkAcc += dt;
          if (atkAcc > 1000 / ATK_FPS) {
            atkAcc = 0;
            if (bowsLeft > 0 && atkIndex >= bowHi) {
              bowsLeft--;
              if (bowsLeft > 0) bowWait = BOW.gap;
              else atkIndex = Math.min(atkIndex + 1, atkN - 1);
            }
            else if (atkIndex < atkN - 1) atkIndex++;
            else { attacking = false; if (charge > 0) chargeDone = true; else syncUI(); }
          }
          if (!fired && atkIndex >= releaseFrame) { fired = true; fireAbility(); }
        }
      }

      if (motion) {
        const m = motion; m.e += dt;
        let f = m.frame; while (f < SKILL_N && m.e >= START[f + 1]) f++; m.frame = f;
        const ff = f + (m.e - START[f]) / durOf(f);
        if (ff < F_MOVE) { p.x = m.ox; p.y = m.oy; }
        else if (ff < F_REACH) { const k = ease((ff - F_MOVE) / (F_REACH - F_MOVE)); p.x = m.ox + (m.tx - m.ox) * k; p.y = m.oy; }
        else if (ff < F_LEAP) { p.x = m.tx; p.y = m.oy; }
        else if (ff < F_LAND) { const k = (ff - F_LEAP) / (F_LAND - F_LEAP); p.x = m.tx + (m.ox - m.tx) * ease(k); p.y = m.oy - ARC_H * Math.sin(Math.PI * k); }  // 13-24 arc home
        else { p.x = m.ox; p.y = m.oy; }

        if (!m.damaged && f >= HIT && pendingTid && g.combat) {
          m.damaged = true;
          let s = g.combat;
          s = strike(s, pendingTid, SLASH_MULT, "Flourish");
          g.combat = s;
          if (outcome(s) === "win") { pendingEnd = "win"; killT = 0; }
          syncUI();
        }
        if (!m.up && f >= ARROW_SPAWN) { 
          m.up = true;
          const bx = p.x + p.w / 2 + 30, by = p.y + p.h - 60;
          const ex = g.foe ? g.foe.x + g.foe.w / 2 : bx + 400, ey = g.foe ? g.foe.y + g.foe.h / 2 : by;
          const ang = Math.atan2(ey - by, ex - bx);
          skillArrow = addEffect({ sprite: "arrow", fw: 300, fh: 100, frames: 3, x: bx, y: by, layer: "behind", drawW: 60, fps: 12, alpha: 1, angle: ang });
        }
        if (!m.shot && f >= ARROW_FIRE && skillArrow) {
          m.shot = true;
          const ang = skillArrow.angle ?? 0, sp = 18, tid = pendingTid;
          skillArrow.vx = Math.cos(ang) * sp; skillArrow.vy = Math.sin(ang) * sp;
          skillArrow.targetX = g.foe ? g.foe.x + g.foe.w / 2 : skillArrow.x + 400;
          skillArrow.onDone = () => {
            const s0 = g.combat; if (!s0 || !tid) return;
            resolve(advance(strike(s0, tid, ARROW_MULT, "Flourish")));
          };
          skillArrow = null;
        }
        if (m.e >= SKILL_TOTAL) { p.x = m.ox; p.y = m.oy; motion = null; skillArrow = null; syncUI(); }
      }

      stepEffects(dt);
      if (flash > 0) flash = Math.max(0, flash - dt);
      else if (hold > 0) hold = Math.max(0, hold - dt);
      if (chargeDone && !inFlight && !effectsBusy()) { chargeDone = false; endCharge(); }
      menuClick();
      uiT += dt;

      if (cb.log.length > logLen) {
        for (let i = cb.log.length - logLen - 1; i >= 0; i--) toasts.push({ text: cb.log[i], t: 0 });
        if (toasts.length > 8) toasts = toasts.slice(-8);
      }
      logLen = cb.log.length;
      for (const t of toasts) t.t += dt;
      toasts = toasts.filter((t) => t.t < TOAST.life);
      if (wasBusy && !busy()) syncUI();
      wasBusy = busy();

      if (!busy() && cb.activeId !== lastActive) { lastActive = cb.activeId; relineup(); }
      if (!busy() && cb.phase === "choose" && !open && current(cb).side === "party") open = "attack";
      stepLineup(dt / 16.667);

      if (!motion) { const s = slotOf("mags"); p.x = slot().px - s * gapFor(lineup.length); p.y = slot().fy - p.h; }

      if (pendingEnd) { killT += dt; if (!busy()) { const end = pendingEnd; pendingEnd = null; return g.setScene(end === "win" ? "victory" : "defeat"); } }
      
      if (!busy() && cb.phase === "resolve") { enemyDelay -= dt; if (enemyDelay <= 0) { g.combat = enemyTurn(cb); if (g.combat.phase === "resolve") enemyDelay = 650; if (g.combat.phase === "lose") { pendingEnd = "lose"; killT = 0; } syncUI(); } }
    },

    draw() {
      const ctx = g.ctx, e = g.foe;
      ctx.clearRect(0, 0, VW, VH);
      const grad = ctx.createLinearGradient(0, 0, 0, VH); grad.addColorStop(0, "#d8c9b4"); grad.addColorStop(1, "#a89684"); ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.translate(-g.cam.x, -g.cam.y);
      drawWorld(g);
      ctx.fillStyle = "rgba(6,4,4,.45)"; ctx.fillRect(g.cam.x, g.cam.y, VW, VH);

      const dyingBlink = pendingEnd === "win" ? Math.floor(killT / 90) % 2 === 0 : true;
      if (e && e.alive && dyingBlink) {
        const es = phase === "slidein" ? 1 + 0.25 * ease(ct) : 1.25;
        const ew = e.w * es, eh = e.h * es, ex = e.x + e.w / 2 - ew / 2, ey = e.y + e.h - eh;
        const lit = flash > 0 && Math.floor(flash / (BLINK.flash / 6)) % 2 === 1;
        ctx.fillStyle = lit ? "#fff" : C.enemy; ctx.fillRect(ex, ey, ew, eh);
        if (!lit) { ctx.fillStyle = C.coal; ctx.fillRect(ex + 7, ey + 12, 6, 6); }
      }
      drawEffectsLayer(g, "behind");

      for (const id of backToFront()) {
        const s = slotOf(id);
        if (phase === "slidein" && id !== "mags") continue;
        const ch = getCharacter(id), a = anchor(s, id), cel = cellOf(id), bx = bodyX(id, a.cx);
        if (id === "mags" && phase === "slidein") { const grow = DRAW_H + (COMBAT_DRAW_H - DRAW_H) * ease(ct); drawSprite(g, g.IMG[sheetKey(ANIM.walk, p.face)], 934, 884, idleIndex % 4, a.cx, a.by, grow); }
        else if (phase === "entry") drawSprite(g, g.IMG[ch.sheets.entry], cel.w, cel.h, Math.min(entryIndex, framesOf(id, ch.sheets.entry, 1) - 1), bx, a.by, COMBAT_DRAW_H);
        else if (id === "mags" && motion) drawSprite(g, g.IMG[motSheet], cel.w, cel.h, Math.min(motion.frame - 1, framesOf("mags", motSheet, SKILL_N) - 1), bx, a.by, COMBAT_DRAW_H);
        else if (attacking && id === actingId) drawSprite(g, g.IMG[atkSheet], cel.w, cel.h, atkIndex, bx, a.by, COMBAT_DRAW_H);
        else drawSprite(g, g.IMG[ch.sheets.idle], cel.w, cel.h, idles[id]?.i ?? 0, bx, a.by, COMBAT_DRAW_H);
        drawEffectsSlot(g, lineup.indexOf(id));
      }

      drawEffectsLayer(g, "front");

      const cb = g.combat;
      if (phase === "battle" && cb) {
        const en = cb.fighters.find((f) => f.side === "enemy")!;
        for (const id of lineup) {
          const f = cb.fighters.find((x) => x.id === id); if (!f) continue;
          const a = anchor(slotOf(id), id);
          hpbar(g, a.cx, a.by - p.h - 24, f);
        }
        if (e) hpbar(g, e.x + e.w / 2, e.y - 24, en);
        const list = slots();
        drawMenu(g, g.cam.x, g.cam.y, open, list, cb.phase === "choose" && !busy(), hit);
        const hov = hit.slot >= 0 ? list[hit.slot] : undefined;
        const pa = hov?.preview ? (1 - Math.cos(uiT / 300)) / 2 : 0;
        drawSkillPoints(g, g.cam.x + 834, g.cam.y + 468, cb.skillPoints - charge,
                        cb.maxSkillPoints, front(), hov?.preview ?? 0, pa);
        ctx.fillStyle = cb.phase === "choose" && !busy() ? C.spark : C.dim; ctx.font = '13px "Zilla Slab",serif'; ctx.textAlign = "center";
        ctx.fillText(cb.phase === "choose" && !busy() ? "Your move" : "\u2026", g.cam.x + VW / 2, g.cam.y + 40);
        ctx.font = '12px "Zilla Slab",serif'; ctx.textAlign = "center";
        toasts.forEach((t, i) => {
          const y = g.cam.y + 60 + (toasts.length - 1 - i) * TOAST.step;
          const left = TOAST.life - t.t;
          ctx.globalAlpha = Math.min(1, Math.min(t.t / 120, left / TOAST.fade));
          ctx.fillStyle = C.hot;
          ctx.fillText(t.text, g.cam.x + VW / 2, y);
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.fillStyle = C.hot; ctx.font = "600 22px Cinzel, serif"; ctx.textAlign = "right"; ctx.fillText(room(g).name ?? room(g).area, VW - 20, 38);
    },
  };
}