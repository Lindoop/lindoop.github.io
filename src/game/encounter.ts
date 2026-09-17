// encounter.ts — overworld enemy behavior + the combat trigger. Pure logic.
// GameCanvas calls stepEnemy() each frame per enemy and starts combat if it
// returns true. Nothing here draws.

import type { Solid } from "./rooms";

export type OwEnemy = {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; grounded: boolean;
  home: number; face: number;
  hostile: boolean; alive: boolean;
  confused: number; stall: number; cool: number; target: number;
};

export type ActorBox = { x: number; y: number; w: number; h: number; grounded: boolean };

export const VISION_X = 250;    // horizontal "eye view" radius that flips the enemy hostile
export const VISION_Y = 140;    // and it has to be roughly on your level to notice you
export const FALL_OUT = 2000;   // past the tallest room — an enemy this low has fallen out and despawns

export function spawnEnemy(x: number, floorY: number): OwEnemy {
  return {
    x, y: floorY - 46, w: 40, h: 46, vx: -1.2, vy: 0, grounded: false,
    home: x, face: -1,
    hostile: false, alive: true, confused: 0, stall: 0, cool: 0, target: x,
  };
}

const box = (a: ActorBox, b: OwEnemy) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Advance one enemy for this frame. Returns true if it TOUCHED the player
// (→ GameCanvas should start combat). Full-box test means jumping over dodges it.
export function stepEnemy(e: OwEnemy, player: ActorBox, dt: number, solids: Solid[], grav: number, k: number): boolean {
  if (!e.alive) return false;

  // brief calm after a fled fight so it doesn't instantly re-grab you
  if (e.cool > 0) { e.cool -= dt; e.hostile = false; }

  const distX = Math.abs((e.x + e.w / 2) - (player.x + player.w / 2));
  const distY = Math.abs((e.y + e.h) - (player.y + player.h));   // feet to feet

  if (!e.hostile) {
    if (e.cool <= 0 && distX < VISION_X && distY < VISION_Y) { e.hostile = true; fall(e, solids, grav, k); return false; }
    // patrol around home, but never off the edge of whatever it's standing on
    const nx = e.x + e.vx * k;
    if (nx < e.home - 80 || nx > e.home + 80 || !footing(e, nx, solids)) e.vx *= -1;
    else e.x = nx;
    e.face = e.vx >= 0 ? 1 : -1;
    fall(e, solids, grav, k);
    return false;
  }

  // lose interest if the player gets well out of sight — in either axis
  if (distX > VISION_X * 1.6 || distY > VISION_Y * 1.6) { e.hostile = false; e.stall = 0; e.confused = 0; fall(e, solids, grav, k); return false; }

  // hostile: lock onto the player ONLY while they're grounded; jumping breaks it
  if (player.grounded) { e.target = player.x; e.confused = 0; }
  else e.confused += dt;

  if (e.confused > 250) e.stall = 500;          // gave up on the air → confused

  if (e.stall > 0) {
    e.stall -= dt;                               // frozen, "where'd they go"
  } else {
    const dir = Math.sign(e.target - e.x);       // chase last grounded spot
    if (Math.abs(e.target - e.x) > 4) {
      e.x += dir * 2.6 * k;                      // hostile: commits, walks off ledges, falls
      e.face = dir >= 0 ? 1 : -1;
    }
  }
  fall(e, solids, grav, k);
  if (e.y > FALL_OUT) { e.alive = false; return false; }   // fell out of the world — gone, no transition

  return box(player, e);   // instant-on-touch → combat
}

// is there ground under the enemy if it moves to nx? keeps it off thin air.
function footing(e: OwEnemy, nx: number, solids: Solid[]): boolean {
  const feet = e.y + e.h;
  return solids.some((s) => nx + e.w > s.x && nx < s.x + s.w && Math.abs(s.y - feet) < 6);
}

// same landing rule the player uses: resolve only when falling onto a surface
function fall(e: OwEnemy, solids: Solid[], grav: number, k: number): void {
  e.vy += grav * k;
  e.y += e.vy * k;
  e.grounded = false;
  for (const s of solids) {
    if (e.x + e.w > s.x && e.x < s.x + s.w && e.y + e.h > s.y && e.y + e.h - e.vy * k <= s.y + 1) {
      e.y = s.y - e.h; e.vy = 0; e.grounded = true;
    }
  }
}

// convenience for drawing the state indicator: "!" hunting, "?" confused, "" otherwise
export const enemyMark = (e: OwEnemy) => (!e.hostile ? "" : e.stall > 0 ? "?" : "!");