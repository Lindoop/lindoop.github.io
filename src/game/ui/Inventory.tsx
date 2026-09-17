// src/game/ui/Inventory.tsx
//
// The bag: a 9-wide grid that grows by rows, plus the 7 BELT slots underneath —
// the ones the battle menu shows. Click a slot, click another, it moves. The belt
// refuses anything without `battle: true`.
//
// Colour vars (--bone, --maroon, --coal) are inherited from Popup's .pop-root.
//
// ALIGNMENT: belt slot i sits under bag column i+1, and that falls out of the
// geometry rather than being nudged — the belt panel is exactly 7 bag-columns plus
// 6 gaps wide. At a 640 wrap that's 500, which is the number off Linda's mockup.
// The width formula in .inv-belt is what holds it at any card size.
//
// Presentation only: all state lives in ../inventory.

import { useReducer, useState } from "react";
import { ASSETS } from "../assets";
import {
  ITEMS, BAG_COLS, BELT_SLOTS, bagRows, bagSlots, beltSlots, moveSlot, canHold,
  type Area, type Ref,
} from "../inventory";

// Frame geometry, straight off the PNGs. 650 x (70*rows + 100) outer; the bag
// slot block always starts at (15,15) and the belt block at (85, H-73) because
// the belt is pinned to the bottom edge and the bag grows upward off it. The
// grids are absolutely positioned in PERCENT of the frame, so the whole thing
// scales as one piece and the columns can't drift out of their sockets.
const FRAME_W = 650;
const frameH = (r: number) => 70 * r + 100;
const FRAMES: Record<number, string> = { 1: ASSETS.bagFrame1, 2: ASSETS.bagFrame2, 3: ASSETS.bagFrame3 };
const pc = (n: number, of: number) => `${(n / of) * 100}%`;

const CSS = `
.inv-wrap{position:relative;max-width:${FRAME_W}px;margin:0 auto;
  background-size:100% 100%;background-repeat:no-repeat;image-rendering:pixelated;}
.inv-grid{position:absolute;display:grid;gap:1.612903%;}
.inv-grid.bag{grid-template-columns:repeat(${BAG_COLS},1fr);}
.inv-grid.belt{grid-template-columns:repeat(${BELT_SLOTS},1fr);gap:2.083333%;}
.inv-cell{position:relative;aspect-ratio:1;padding:0;cursor:pointer;background:none;border:0;
  background-image:url(${ASSETS.bagSlotOff});background-size:100% 100%;background-repeat:no-repeat;
  image-rendering:pixelated;transition:filter .12s;}
.inv-cell:hover{background-image:url(${ASSETS.bagSlotOn});}
.inv-cell.on{background-image:url(${ASSETS.bagSlotOn});filter:drop-shadow(0 0 5px rgba(232,220,200,.5));}
.inv-cell.no{cursor:not-allowed;filter:brightness(.55);}
.inv-cell:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.inv-icon{position:absolute;inset:18%;width:64%;height:64%;object-fit:contain;image-rendering:pixelated;}
.inv-glyph{position:absolute;inset:0;display:grid;place-items:center;font-size:15px;color:var(--bone);opacity:.75;}
.inv-n{position:absolute;right:4px;bottom:2px;font-size:10px;color:var(--bone);text-shadow:0 1px 0 #000,1px 0 0 #000;}
.inv-detail{max-width:650px;margin:14px auto 0;min-height:44px;}
.inv-name{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;}
.inv-desc{font-size:10px;letter-spacing:.5px;opacity:.5;margin-top:4px;}
.inv-deny{font-size:10px;letter-spacing:.5px;color:#e8632a;margin-top:4px;}
`;

export default function Inventory() {
  // inventory.ts is plain module state, so nothing tells React it changed
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [sel, setSel] = useState<Ref | null>(null);
  const [deny, setDeny] = useState("");

  const bag = bagSlots(), belt = beltSlots();
  const rows = bagRows(), H = frameH(rows);
  const stackAt = (r: Ref) => (r.area === "bag" ? bag[r.i] : belt[r.i]);
  const held = sel ? stackAt(sel) : null;
  const shown = held ? ITEMS[held.id] : null;

  function click(area: Area, i: number) {
    setDeny("");
    const here = area === "bag" ? bag[i] : belt[i];
    if (!sel) { if (here) setSel({ area, i }); return; }
    if (sel.area === area && sel.i === i) { setSel(null); return; }
    const moving = stackAt(sel);
    if (moving && !canHold(area, moving.id)) {
      setDeny(`${ITEMS[moving.id].name} can't go on the belt — battle items only.`);
      return;                                   // keep the selection so she can retry
    }
    if (moveSlot(sel, { area, i })) { setSel(null); bump(); return; }
    setSel(here ? { area, i } : null);          // nothing moved: treat it as a re-pick
  }

  const cell = (area: Area, i: number) => {
    const s = area === "bag" ? bag[i] : belt[i];
    const def = s ? ITEMS[s.id] : null;
    const on = sel?.area === area && sel.i === i;
    const blocked = !!held && area === "belt" && !canHold("belt", held.id);
    const art = def?.icon ? ASSETS[def.icon] : undefined;
    return (
      <button
        key={`${area}${i}`}
        type="button"
        className={`inv-cell${on ? " on" : ""}${blocked ? " no" : ""}`}
        aria-label={def ? `${area} slot ${i + 1}, ${def.name}${s!.n > 1 ? ` x${s!.n}` : ""}` : `${area} slot ${i + 1}, empty`}
        onClick={() => click(area, i)}
      >
        {def && (art
          ? <img className="inv-icon" src={art} alt="" />
          : <span className="inv-glyph">{def.name[0]}</span>)}
        {s && s.n > 1 && <span className="inv-n">{s.n}</span>}
      </button>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div
        className="inv-wrap"
        style={{
          backgroundImage: `url(${FRAMES[rows]})`,
          aspectRatio: `${FRAME_W} / ${H}`,
        }}
      >
        <div
          className="inv-grid bag"
          style={{ left: pc(15, FRAME_W), top: pc(15, H), width: pc(620, FRAME_W), height: pc(70 * rows - 10, H) }}
        >
          {bag.map((_, i) => cell("bag", i))}
        </div>
        <div
          className="inv-grid belt"
          style={{ left: pc(85, FRAME_W), top: pc(H - 73, H), width: pc(480, FRAME_W), height: pc(60, H) }}
        >
          {belt.map((_, i) => cell("belt", i))}
        </div>
      </div>

      <div className="inv-detail">
        {shown && (
          <>
            <div className="inv-name">{shown.name}</div>
            <div className="inv-desc">{shown.blurb}</div>
          </>
        )}
        {deny && <div className="inv-deny">{deny}</div>}
      </div>
    </>
  );
}