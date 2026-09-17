// src/game/ui/Popup.tsx
//
// The popup shell. Scrim + centred card + close affordances. Knows nothing about
// what's inside it — panel bodies are their own files, wired up in panels.ts.
//
// The scrim is absolute inside the canvas wrapper, so it darkens the viewport ONLY.
// The HUD rails sit outside that box and stay lit, which keeps the popup feeling
// like it opened in the world rather than over the website.
//
// CLOSES ON: the ✕, or a click on the scrim. NOT on Escape — Escape is reserved for
// opening the system menu, which layers on top of whatever's already open.
//
// `depth` is the layer's index in the stack. It drives z-index, so each new layer's
// scrim covers the cards below it and only the top card is clickable.

import { useEffect, useRef, type ReactNode } from "react";

const CSS = `
.pop-root{position:absolute;inset:0;display:grid;place-items:center;
  font-family:"Pixel",monospace;
  --coal:#191919;--shade:#2d3132;--maroon:#740027;--bone:#e8dcc8;--lip:rgba(255,222,180,.55);}
.pop-scrim{position:absolute;inset:0;background:rgba(6,8,9,.72);cursor:pointer;
  animation:pop-fade .14s ease-out;}
.pop-card{position:relative;max-height:80%;display:flex;flex-direction:column;
  background:var(--coal);border:2px solid var(--maroon);box-shadow:0 12px 0 rgba(0,0,0,.45);
  animation:pop-rise .16s ease-out;}
.pop-card.normal{width:min(560px,74%);}
.pop-card.narrow{width:min(340px,58%);}
/* bare — no card. For a panel whose CONTENT is already a framed image; a second
   frame around it is chrome on chrome. Must come AFTER .pop-card::before or the
   lip line wins on source order. */
.pop-card.bare{width:min(650px,88%);background:none;border:0;box-shadow:none;}
.pop-card.bare .pop-bar{background:none;border:0;padding:0 0 8px;}
.pop-card.bare .pop-body{padding:0;overflow:visible;}
.pop-card.bare .pop-x{border:0;font-size:14px;opacity:.55;transition:opacity .12s;}
.pop-card.bare .pop-x:hover{background:none;opacity:1;}
.pop-card::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--lip);}
.pop-card.bare::before{display:none;}
.pop-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:11px 12px 10px;border-bottom:2px solid var(--maroon);background:var(--shade);}
.pop-title{font-size:13px;letter-spacing:2px;color:var(--bone);text-transform:uppercase;}
.pop-x{width:24px;height:24px;flex:none;display:grid;place-items:center;padding:0;cursor:pointer;
  background:transparent;border:2px solid var(--maroon);color:var(--bone);font-size:12px;line-height:1;
  font-family:inherit;transition:background .12s,border-color .12s;}
.pop-x:hover{background:var(--maroon);border-color:var(--bone);}
.pop-x:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.pop-body{padding:16px;overflow:auto;color:var(--bone);font-size:12px;line-height:1.7;}
.pop-hint{padding:8px 12px 10px;border-top:2px solid rgba(116,0,39,.6);
  font-size:9px;letter-spacing:1.5px;color:var(--bone);opacity:.45;text-align:right;}
@keyframes pop-fade{from{opacity:0}to{opacity:1}}
@keyframes pop-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pop-scrim,.pop-card{animation:none;}}
`;

export default function Popup({
  title,
  onClose,
  size = "normal",
  depth = 0,
  children,
}: {
  title: string;
  onClose: () => void;
  size?: "narrow" | "normal" | "bare";
  depth?: number;
  children: ReactNode;
}) {
  const xRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { xRef.current?.focus(); }, []);

  return (
    <div className="pop-root" style={{ zIndex: 2 + depth }} role="dialog" aria-modal="true" aria-label={title}>
      <style>{CSS}</style>
      <div className="pop-scrim" onClick={onClose} aria-hidden="true" />
      <div className={`pop-card ${size}`}>
        <div className="pop-bar">
          <span className="pop-title">{title}</span>
          <button ref={xRef} type="button" className="pop-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="pop-body">{children}</div>
        {size !== "bare" && <div className="pop-hint">CLICK OUTSIDE OR ✕ TO CLOSE</div>}
      </div>
    </div>
  );
}