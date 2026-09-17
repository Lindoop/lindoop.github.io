// src/game/ui/HUD.tsx
//
// DOM overlay for the two HUD rails that hug the canvas.
// PRESENTATION ONLY — no game state, no rAF, no canvas access.
//
// Mount requirement: the immediate parent must be `position: relative` and
// exactly the canvas's CSS size (VW x VH), because both rails are positioned
// off the parent's edges. See GameCanvas.tsx.
//
// Assets are placeholders: every art slot is a dashed box. Drop an <img> into
// the marked spots and delete the dashed class — nothing else moves.

import type { PanelId } from "./panels";
import { ASSETS, PORTRAITS } from "../assets";

export type HudMember = {
  id: string;      // character id, e.g. "mags"
  name: string;    // for the tooltip / aria-label
  hp: number;
  maxHp: number;
};

/* ── tunables ──────────────────────────────────────────────────────────── */
const UI = {
  GUTTER: 12,
  SLOTS: 4,
  PORTRAIT: 96,
  HP_H: 18,
  BAG: 112,
  PHONE_W: 52,
  RIGHT_GAP: 22,
  LOW_HP: 0.3,
} as const;

// Settings is deliberately absent — it lives behind ESC → Menu → Settings.
const RIGHT: { panel: PanelId; label: string; key: string; w: number; icon?: string }[] = [
  { panel: "bag",   label: "BAG",   key: "B", w: UI.BAG,     icon: ASSETS.backpack },
  { panel: "phone", label: "PHONE", key: "F", w: UI.PHONE_W, icon: ASSETS.phone },
];

/* ── styles ────────────────────────────────────────────────────────────────
   Scoped by the `hud-` prefix. Colours are pulled from the art: coal #191919,
   shade #2d3132, cape maroon #740027, and the warm platform-lip bone that
   drawWorld already uses for GRIP — so every panel gets the same top-edge
   light line as a standable surface. That lip is the signature; everything
   else stays flat and quiet.                                                */
const CSS = `
.hud-root{position:absolute;inset:0;pointer-events:none;font-family:"Pixel",monospace;
  --coal:#191919;--shade:#2d3132;--maroon:#740027;--bone:#e8dcc8;--lip:rgba(255,222,180,.55);}
.hud-rail{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;}
.hud-left{right:100%;margin-right:${UI.GUTTER}px;align-items:flex-end;}
.hud-right{left:100%;margin-left:${UI.GUTTER}px;align-items:center;gap:${UI.RIGHT_GAP}px;}

.hud-slot{position:relative;width:${UI.PORTRAIT}px;background:var(--coal);
  border:2px solid var(--maroon);border-bottom-width:0;}
.hud-slot:last-child{border-bottom-width:2px;}
.hud-slot::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--lip);}
.hud-art{width:100%;height:${UI.PORTRAIT}px;display:grid;place-items:center;overflow:hidden;}
.hud-art img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.84) saturate(.92);}
.hud-initial{font-size:26px;color:var(--bone);opacity:.5;letter-spacing:1px;}
.hud-empty{background:#0d0d0d;}
.hud-empty .hud-initial{color:var(--maroon);opacity:.35;}

.hud-hp{height:${UI.HP_H}px;background:#0b0b0b;border-top:2px solid #000;
  display:grid;place-items:center;font-size:11px;letter-spacing:1px;color:var(--bone);}
.hud-hp b{font-weight:inherit;}
.hud-hp s{text-decoration:none;opacity:.45;}
.hud-hp.low{color:#e8632a;}
.hud-hp.low b{color:#ff7a45;}

.hud-btn{pointer-events:auto;position:relative;background:none;border:0;color:var(--bone);cursor:pointer;
  padding:0 0 12px;display:flex;flex-direction:column;align-items:center;
  transition:filter .12s,transform .08s;}
.hud-btn:hover{filter:brightness(1.2);}
.hud-btn:active{transform:translateY(1px);}
.hud-btn[aria-pressed="true"]{filter:brightness(1.3) drop-shadow(0 0 6px rgba(255,222,180,.45));}
.hud-btn:focus-visible{outline:2px solid var(--bone);outline-offset:4px;}
.hud-label{font-size:11px;letter-spacing:1.5px;opacity:.8;text-shadow:0 1px 2px #000;}
.hud-key{position:absolute;right:0;bottom:0;font-size:10px;letter-spacing:.5px;opacity:.55;text-shadow:0 1px 2px #000;}
.hud-icon{width:100%;display:block;}

.hud-ph{border:1px dashed rgba(232,220,200,.28);}
.hud-ph.hud-art{border-width:0 0 1px 0;}

@media (max-width:1500px){
  .hud-left{right:auto;left:0;margin:0 0 0 ${UI.GUTTER}px;}
  .hud-right{left:auto;right:0;margin:0 ${UI.GUTTER}px 0 0;}
}
@media (prefers-reduced-motion:reduce){.hud-btn{transition:none;}}
`;

export default function HUD({
  party,
  open = [],
  onToggle,
}: {
  party: HudMember[];
  open?: PanelId[];              // every layer on the stack, so BAG stays lit under the ESC menu
  onToggle?: (p: PanelId) => void;   // clicking a lit button closes it again
}) {
  const slots = Array.from({ length: UI.SLOTS }, (_, i) => party[i] ?? null);

  return (
    <div className="hud-root">
      <style>{CSS}</style>

      {/* LEFT — party. Mags is always slot 0 (caller's ordering). */}
      <div className="hud-rail hud-left">
        {slots.map((m, i) => {
          const frac = m ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
          const src = m ? PORTRAITS[m.id]?.neutral : undefined;   // rail is always neutral
          return (
            <div
              key={m?.id ?? `empty-${i}`}
              className={`hud-slot${m ? "" : " hud-empty"}`}
              title={m ? `${m.name} — ${m.hp}/${m.maxHp}` : "Empty slot"}
              aria-label={m ? `${m.name}, ${m.hp} of ${m.maxHp} health` : "Empty party slot"}
            >
              <div className={`hud-art${src ? "" : " hud-ph"}`}>
                {src
                  ? <img src={src} alt="" />
                  : <span className="hud-initial">{m ? m.name[0].toUpperCase() : "–"}</span>}
              </div>
              <div className={`hud-hp${m && frac <= UI.LOW_HP ? " low" : ""}`}>
                {m && <><b>{m.hp}</b><s>{" / "}{m.maxHp}</s></>}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT — bag / phone / settings */}
      <div className="hud-rail hud-right">
        {RIGHT.map((b) => (
          <button
            key={b.panel}
            type="button"
            className="hud-btn"
            style={{ width: b.w }}
            aria-pressed={open.includes(b.panel)}
            aria-label={b.label}
            onClick={() => onToggle?.(b.panel)}
          >
            {b.icon
              ? <img className="hud-icon" src={b.icon} alt="" />
              : <span className="hud-label">{b.label}</span>}
            <span className="hud-key">{b.key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}