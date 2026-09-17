// src/game/ui/Settings.tsx
//
// Settings. Rows are labelled by what the player controls, not by what the code
// calls it — "Show colliders" rather than DEBUG_SOLIDS.
//
// PLACEHOLDER: nothing here writes anywhere. Wiring the toggles means a settings
// module that the engine reads (consts.ts is compile-time, so DEBUG_SOLIDS and
// friends can't be flipped from here as they stand).

const CSS = `
.set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:11px 0;border-bottom:1px solid rgba(116,0,39,.5);}
.set-row:last-child{border-bottom:0;}
.set-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;}
.set-pips{display:flex;gap:4px;}
.set-pips i{width:12px;height:8px;background:rgba(232,220,200,.15);}
.set-pips i.on{background:var(--bone);}
.set-toggle{width:44px;height:20px;flex:none;padding:2px;cursor:pointer;
  background:#101010;border:2px solid var(--maroon);display:flex;align-items:center;}
.set-toggle i{width:16px;height:12px;background:rgba(232,220,200,.3);
  transition:margin-left .12s,background .12s;}
.set-toggle[aria-pressed="true"]{background:var(--maroon);}
.set-toggle[aria-pressed="true"] i{margin-left:20px;background:var(--bone);}
.set-toggle:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.set-link{padding:6px 12px;cursor:pointer;font-family:inherit;font-size:9px;letter-spacing:1.5px;
  background:transparent;border:2px solid var(--maroon);color:var(--bone);transition:background .12s;}
.set-link:hover{background:var(--maroon);}
.set-link:focus-visible{outline:2px solid var(--bone);outline-offset:2px;}
.set-note{margin-top:16px;font-size:9px;letter-spacing:1px;opacity:.4;}
`;

const Pips = ({ n, of = 5 }: { n: number; of?: number }) => (
  <div className="set-pips" role="img" aria-label={`${n} of ${of}`}>
    {Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}
  </div>
);

export default function Settings() {
  return (
    <>
      <style>{CSS}</style>
      <div className="set-row"><span className="set-label">Music</span><Pips n={3} /></div>
      <div className="set-row"><span className="set-label">Sound</span><Pips n={4} /></div>
      <div className="set-row">
        <span className="set-label">Show colliders</span>
        <button type="button" className="set-toggle" aria-pressed={false} aria-label="Show colliders"><i /></button>
      </div>
      <div className="set-row">
        <span className="set-label">Controls</span>
        <button type="button" className="set-link">VIEW</button>
      </div>
      <div className="set-note">Not wired up yet — these don't save or change anything.</div>
    </>
  );
}