// src/game/ui/Credits.tsx — static text. Update by hand; it's not worth a data file.

const CSS = `
.cr-block{margin-bottom:16px;}
.cr-block:last-child{margin-bottom:0;}
.cr-role{font-size:9px;letter-spacing:2px;text-transform:uppercase;opacity:.45;}
.cr-who{font-size:13px;letter-spacing:1px;margin-top:2px;}
.cr-note{font-size:10px;letter-spacing:.5px;opacity:.5;margin-top:2px;}
`;

export default function Credits() {
  return (
    <>
      <style>{CSS}</style>
      <div className="cr-block">
        <div className="cr-role">Art, design, code</div>
        <div className="cr-who">Linda Chen</div>
      </div>
      <div className="cr-block">
        <div className="cr-role">Characters</div>
        <div className="cr-who">Mags · Candy · Queenie</div>
        <div className="cr-note">Companion robot by Linda's roommate.</div>
      </div>
      <div className="cr-block">
        <div className="cr-role">Type</div>
        <div className="cr-who">Pixel</div>
      </div>
    </>
  );
}