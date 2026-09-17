// engine/consts.ts — shared constants + tiny math. No logic, no canvas.

export const VW = 900, VH = 540, DPR = 2;
export const PW = 36, PH = 104, DRAW_H = 120;   // overworld player box (her legs only) + draw height
export const BODY_DX = 6;                       // her legs sit 6px right of the cell centre; shift the sprite so they land on the box
export const COMBAT_DRAW_H = 150;               // combat sprite draw height
export const PARTY_GAP = 88;    // horizontal spacing between party members in combat
export const PARTY_RISE = 16;   // depth stagger — further back sits higher
export const PARTY_LEFT = 90;   // the rearmost member never crosses this margin
export const GRAV = 0.9, MOVE_WALK = 4.1, MOVE_RUN = 7.6, JUMP = 20;
// scripted hole-exit (a105 -> a104): drift speed, pop strength, spawn depth below the new floor.
// landing distance = LAUNCH_VX * (LAUNCH_VY + sqrt(LAUNCH_VY^2 - 2*GRAV*LAUNCH_DEPTH)) / GRAV
export const LAUNCH_VX = 4.4, LAUNCH_VY = 20, LAUNCH_DEPTH = 140;
export const GROUND = 90;       // painted ground line sits 90px up from the bottom edge of every bg
export const SHADE = "rgba(45,49,50,.65)";   // the act shadow veil, multiplied over the backdrop
export const DEBUG_SOLIDS = false;           // outline every collision box — for placing invisible ledges
export const GRIP = 0.3;                     // warm lip on standable edges; 0 = off, art carries it alone

export const C = {
  coal: "#0a0806", panel: "#14100c", ember: "#e8632a", spark: "#f5a623",
  hot: "#fff4e6", ash: "#b7a692", dim: "#6f6355", enemy: "#7d5ba6", stone: "#2b2119",
};

export const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);