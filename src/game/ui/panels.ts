// src/game/ui/panels.ts — registry only. Maps a panel id to its popup title, card
// width, and body component. Adding a panel = one file + one entry here (+ one entry
// in HUD's RIGHT array if it needs a rail button). Nothing else changes.

import type { ReactNode } from "react";
import Inventory from "./Inventory";
import Phone from "./Phone";
import Settings from "./Settings";
import SystemMenu from "./SystemMenu";
import Credits from "./Credits";

export type PanelId = "bag" | "phone" | "system" | "settings" | "credits";

export type PanelBodyProps = { open: (id: PanelId) => void; close: () => void };

export const PANELS: Record<PanelId, {
  title: string;
  size?: "narrow" | "normal" | "bare";
  stacksOn: "all" | "menu" | "none";
  Body: (p: PanelBodyProps) => ReactNode;
}> = {
  bag:      { title: "Bag",      stacksOn: "none", size: "bare", Body: Inventory },
  phone:    { title: "Phone",    stacksOn: "none", Body: Phone },
  system:   { title: "Menu",     stacksOn: "all",  size: "narrow", Body: SystemMenu },
  settings: { title: "Settings", stacksOn: "menu", Body: Settings },
  credits:  { title: "Credits",  stacksOn: "menu", size: "narrow", Body: Credits },
};