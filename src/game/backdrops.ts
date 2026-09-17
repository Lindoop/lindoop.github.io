// backdrops.ts — reusable multi-layer backdrops. A backdrop owns its own depth
// ordering and parallax factors; rooms just name one and pick the vertical window.
import type { Room } from "./rooms";

type Layer = NonNullable<Room["layers"]>[number];

// the act-1 undercity cavern, painted as six depth slices at 1350x1080
export const CAVE_VOID: Layer[] = [
  { img: "cave1", f: 0.32 },   // gradient base + light shafts
  { img: "cave2", f: 0.40 },   // cave mouth + foreground rocks
  { img: "cave3", f: 0.48 },   // pillars, bridge, waterfall
];

// same backdrop, shifted vertically. y only picks the visible window in rooms with
// no vertical camera travel; in tall rooms the layers drift on their own.
export const at = (layers: Layer[], y: number): Layer[] => layers.map((L) => ({ ...L, y }));