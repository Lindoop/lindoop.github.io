// src/game/ui/SystemMenu.tsx
//
// The ESC menu. BG3-shaped: a short vertical list that's a jumping-off point, not a
// settings screen itself. Picking Settings or Credits STACKS that panel on top of
// this one, so the menu stays behind it — and behind that, whatever was already open.
//
// "Return to game" closes this layer only. If the bag was open underneath, it stays
// open, which is the point of the stack.

import type { PanelBodyProps } from "./panels";

const CSS = `
.sys-list{display:flex;flex-direction:column;gap:8px;}
.sys-row{width:100%;padding:12px 14px;cursor:pointer;text-align:left;font-family:inherit;
  font-size:12px;letter-spacing:2px;text-transform:uppercase;
  background:#101010;border:2px solid rgba(116,0,39,.7);color:var(--bone);
  transition:background .12s,border-color .12s,padding-left .12s;}
.sys-row:hover{background:var(--maroon);border-color:var(--bone);padding-left:20px;}
.sys-row:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.sys-row.quiet{opacity:.55;}
.sys-rule{height:2px;background:rgba(116,0,39,.6);margin:6px 0;}
@media (prefers-reduced-motion:reduce){.sys-row{transition:background .12s,border-color .12s;}}
`;

export default function SystemMenu({ open, close }: PanelBodyProps) {
  return (
    <>
      <style>{CSS}</style>
      <div className="sys-list">
        <button type="button" className="sys-row" onClick={() => open("settings")}>Settings</button>
        <button type="button" className="sys-row" onClick={() => open("credits")}>Credits</button>
        <div className="sys-rule" />
        <button type="button" className="sys-row quiet" onClick={close}>Return to game</button>
      </div>
    </>
  );
}