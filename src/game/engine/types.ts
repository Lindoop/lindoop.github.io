// engine/types.ts — the Scene contract + the shared Game context every scene reads.

import type { OwEnemy } from "../encounter";
import type { CombatState } from "../combat/combatState";

export type Img = { el: HTMLImageElement; ok: boolean };
export type Player = { x: number; y: number; w: number; h: number; vx: number; vy: number; grounded: boolean; face: number };
export type SceneName = "overworld" | "combat" | "victory" | "defeat";

export interface Scene {
  enter?(opts?: any): void;
  exit?(): void;
  update(dt: number): void;
  draw(): void;
}

export type Game = {
  ctx: CanvasRenderingContext2D;
  IMG: Record<string, Img>;
  keys: Record<string, boolean>;
  mouse: { x: number; y: number };
  clicked: () => boolean;
  took: (k: string) => boolean;

  p: Player;
  cam: { x: number; y: number };
  roomId: string;
  enemies: OwEnemy[];

  combat: CombatState | null;
  foe: OwEnemy | null;
  ret: { x: number; y: number };

  dom: { reader: HTMLDivElement; ui: HTMLDivElement };
  setScene: (name: SceneName, opts?: any) => void;
};
