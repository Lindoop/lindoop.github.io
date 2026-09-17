// src/game/ui/Phone.tsx
//
// The phone: map, records, and calls. Tabs are local state — the popup remounts on
// every open, so it always lands on MAP rather than remembering where you were.
// That's deliberate; change the useState default if you'd rather it stick.
//
// The CALL list reads recruitedIds() rather than partyIds() — you can ring anyone
// you've saved, whether or not they're currently in the four.
//
// PLACEHOLDER: no map art, no records data, and the call buttons don't do anything.

import { useState } from "react";
import { recruitedIds, inParty } from "../roster";

type Tab = "map" | "records" | "call";
const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "MAP" },
  { id: "records", label: "RECORDS" },
  { id: "call", label: "CALL" },
];

const CSS = `
.ph-tabs{display:flex;gap:8px;margin-bottom:14px;}
.ph-tab{flex:1;padding:8px 0;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:1.5px;
  background:#101010;border:2px solid rgba(116,0,39,.7);color:var(--bone);opacity:.55;
  transition:opacity .12s,background .12s;}
.ph-tab:hover{opacity:.85;}
.ph-tab.on{opacity:1;background:var(--maroon);border-color:var(--bone);}
.ph-tab:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.ph-screen{aspect-ratio:4/3;background:#0b0f10;border:1px dashed rgba(232,220,200,.28);
  display:grid;place-items:center;text-align:center;padding:16px;
  font-size:10px;letter-spacing:2px;opacity:.4;}
.ph-list{display:flex;flex-direction:column;gap:8px;}
.ph-entry{display:flex;align-items:center;gap:10px;padding:8px 10px;
  background:#101010;border:2px solid rgba(116,0,39,.7);}
.ph-face{width:30px;height:30px;flex:none;background:#0b0b0b;
  border:1px dashed rgba(232,220,200,.28);}
.ph-who{flex:1;min-width:0;}
.ph-name{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;}
.ph-where{font-size:9px;letter-spacing:1px;opacity:.45;}
.ph-call{padding:6px 10px;cursor:pointer;font-family:inherit;font-size:9px;letter-spacing:1.5px;
  background:transparent;border:2px solid var(--maroon);color:var(--bone);
  transition:background .12s,border-color .12s;}
.ph-call:hover{background:var(--maroon);border-color:var(--bone);}
.ph-call:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
`;

export default function Phone() {
  const [tab, setTab] = useState<Tab>("map");
  const saved = recruitedIds().filter((id) => id !== "mags");   // you don't call yourself
  const label = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

  return (
    <>
      <style>{CSS}</style>
      <div className="ph-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ph-tab${tab === t.id ? " on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* MAP ART GOES HERE */}
      {tab === "map" && <div className="ph-screen">NO SIGNAL DOWN HERE</div>}

      {tab === "records" && <div className="ph-screen">NOTHING FILED YET</div>}

      {tab === "call" && (
        saved.length === 0
          ? <div className="ph-screen">NO NUMBERS SAVED</div>
          : <div className="ph-list">
              {saved.map((id) => (
                <div key={id} className="ph-entry">
                  {/* PORTRAIT GOES HERE */}
                  <div className="ph-face" />
                  <div className="ph-who">
                    <div className="ph-name">{label(id)}</div>
                    <div className="ph-where">{inParty(id) ? "With you" : "Somewhere else"}</div>
                  </div>
                  <button type="button" className="ph-call" aria-label={`Call ${label(id)}`}>CALL</button>
                </div>
              ))}
            </div>
      )}
    </>
  );
}