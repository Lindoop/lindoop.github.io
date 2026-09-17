// assets.ts — every image the game loads, in one place. Keys here are what
// rooms.ts, dialogue.ts and the scenes reference via game.IMG.

// -- Mags ------------------------------------------------------------------
import rightWalk from "../assets/animation/mc/right_walk_sheet.png";
import leftWalk from "../assets/animation/mc/left_walk_sheet.png";
import rightRun from "../assets/animation/mc/right_run_sheet.png";
import leftRun from "../assets/animation/mc/left_run_sheet.png";
import rightStand from "../assets/animation/mc/right_stand_sheet.png";
import leftStand from "../assets/animation/mc/left_stand_sheet.png";
import rightJump from "../assets/animation/mc/right_jump_sheet.png";
import leftJump from "../assets/animation/mc/left_jump_sheet.png";
import rightFall from "../assets/animation/mc/right_fall_sheet.png";
import leftFall from "../assets/animation/mc/left_fall_sheet.png";
import enterCombat from "../assets/animation/mc/enter_combat_sheet.png";
import combatIdle from "../assets/animation/mc/combat_idle_sheet.png";
import basicAtk from "../assets/animation/mc/basic_attack_sheet.png";
import skillSheet from "../assets/animation/mc/skill_sheet.png";

// -- party ----------------------------------------------------------------
import candyIdleRight from "../assets/animation/candy/candy_idle_right_sheet.png";
import candyIdleLeft from "../assets/animation/candy/candy_idle_left_sheet.png";
import candyBasic from "../assets/animation/candy/candy_basic_sheet.png";
import candySkill from "../assets/animation/candy/candy_skill_sheet.png";
import candyFireball from "../assets/animation/candy/candy_fireball_sheet.png";
import candyRay from "../assets/animation/candy/candy_ray_sheet.png";
import candyPortal from "../assets/animation/candy/candy_portal_sheet.png";

import queenieIdleRight from "../assets/animation/queenie/queenie_idle_right_sheet.png";
import queenieIdleLeft from "../assets/animation/queenie/queenie_idle_left_sheet.png";
import queenieBasic from "../assets/animation/queenie/queenie_basic_sheet.png";
import queenieSkill from "../assets/animation/queenie/queenie_skill_sheet.png";
import queenieWave from "../assets/animation/queenie/queenie_wave_sheet.png";
import queeniePot from "../assets/animation/queenie/queenie_pot_sheet.png";

// -- effects --------------------------------------------------------------
import arrow from "../assets/arrow_sheet.png";
import battleMenu from "../assets/ui/battle_menu.png";
import hotbar from "../assets/ui/hotbar.png";
import menuRowHover from "../assets/ui/menu_row_hover.png";
import barSlotOff from "../assets/ui/bar_slot_off.png";
import barSlotOn from "../assets/ui/bar_slot_on.png";
import chargeBarOff from "../assets/ui/charge_bar_off.png";
import chargeBarOn from "../assets/ui/charge_bar_on.png";
import releaseBtnOff from "../assets/ui/release_btn_off.png";
import releaseBtnOn from "../assets/ui/release_btn_on.png";
import iconAttack from "../assets/ui/icon_attack.png";
import iconAct from "../assets/ui/icon_act.png";
import iconBag from "../assets/ui/icon_bag.png";
import iconRun from "../assets/ui/icon_run.png";
import iconScorchingRay from "../assets/ui/icon_scorchingRay.png";
import inventorySlotOff from "../assets/ui/inventory_slot_off.png";
import inventorySlotOn from "../assets/ui/inventory_slot_on.png";

import backpack from "../assets/ui/backpack.png";
import phone from "../assets/ui/phone.png";

// -- bag panel -------------------------------------------------------------
// One frame per bag row-count; each PNG is BOTH containers, since the belt is
// pinned to the bottom and the bag grows upward off it. 650 x (70*rows + 100).
import bagFrame1 from "../assets/ui/bag_frame_1.png";
import bagFrame2 from "../assets/ui/bag_frame_2.png";
import bagFrame3 from "../assets/ui/bag_frame_3.png";
import bagSlotOff from "../assets/ui/bag_slot_off.png";
import bagSlotOn from "../assets/ui/bag_slot_on.png";

// -- portraits ------------------------------------------------------------
import candyNeutral from "../assets/portraits/candy_neutral.png";
import queenieNeutral from "../assets/portraits/queenie_neutral.png";
import magsNeutral from "../assets/portraits/mags_neutral.png";

// -- act 1 ----------------------------------------------------------------
import a101 from "../assets/bg/a1/01_hermitage.png";
import a102 from "../assets/bg/a1/02_home.png";
import a104 from "../assets/bg/a1/04_chamber.png";
import a105 from "../assets/bg/a1/05_sewers.png";

import cave1 from "../assets/bg/a1/layers/cave-1.png";
import cave2 from "../assets/bg/a1/layers/cave-2.png";
import cave3 from "../assets/bg/a1/layers/cave-3.png";
import truckBroken from "../assets/bg/a1/props/broken_truck.png";
import truckMerchant from "../assets/bg/a1/props/merchant_truck.png";
import treasure from "../assets/bg/a1/props/treasure.png";

import tentCandy from "../assets/bg/a1/props/candy_tent.png";
import tentQueenie from "../assets/bg/a1/props/queenie_tent.png";

export const ASSETS: Record<string, string> = {
  walkRight: rightWalk, walkLeft: leftWalk, standRight: rightStand, standLeft: leftStand,
  runRight: rightRun, runLeft: leftRun,
  jumpRight: rightJump, jumpLeft: leftJump, fallRight: rightFall, fallLeft: leftFall,
  enter: enterCombat, combatIdle, basicAtk, flourish: skillSheet, arrow,
  battleMenu, hotbar, menuRowHover, barSlotOff, barSlotOn,
  chargeBarOff, chargeBarOn, releaseBtnOff, releaseBtnOn,
  inventorySlotOff, inventorySlotOn,
  "icon_attack": iconAttack, "icon_act": iconAct, "icon_bag": iconBag, "icon_run": iconRun,
  "icon_scorchingRay": iconScorchingRay,
  backpack, phone,
  bagFrame1, bagFrame2, bagFrame3, bagSlotOff, bagSlotOn,
  candyIdleRight, candyIdleLeft, candyBasic, candySkill, candyFireball, candyRay, candyPortal,
  queenieIdleRight, queenieIdleLeft, queenieBasic, queenieSkill, queenieWave, queeniePot,
  a101, a102, a104, a105, cave1, cave2, cave3,
  truckBroken, truckMerchant, treasure,
  tentCandy, tentQueenie,
};

export type Expression = "neutral" | "happy" | "sad" | "angry" | "surprised";

export const PORTRAITS: Record<string, Partial<Record<Expression, string>>> = {
  candy: { neutral: candyNeutral },
  queenie: { neutral: queenieNeutral },
  mags: { neutral: magsNeutral },
};