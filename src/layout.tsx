import { useState } from "react";
import Portfolio from "./components/Portfolio";
import GameCanvas from "./game/GameCanvas";

function Layout() {
  const [mode, setMode] = useState<"site" | "game">("site");

  return (
    <div>
      {mode === "site" ? <Portfolio /> : <GameCanvas />}

      <button
        onClick={() => setMode((m) => (m === "site" ? "game" : "site"))}
        style={{
          position: "fixed",
          right: "18px",
          bottom: "18px",
          zIndex: 9999,
          padding: "10px 18px",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          background: "var(--jade-bright, #a31d3e)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          fontSize: "0.85rem",
          fontWeight: 600,
          letterSpacing: "0.03em",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        }}
      >
        {mode === "site" ? "\u25B6  Play the game" : "\u2190  Back to site"}
      </button>
    </div>
  );
}

export default Layout;