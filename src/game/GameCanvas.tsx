import { useRef, useEffect, useState, useCallback } from "react";
import { ASSETS } from "./assets";
import HUD from "./ui/HUD";
import Popup from "./ui/Popup";
import { PANELS, type PanelId } from "./ui/panels";
import { useParty } from "./ui/useParty";
import { VW, VH, DPR, PW, PH } from "./engine/consts";
import type { Game, Img, Scene, SceneName } from "./engine/types";
import { makeOverworld } from "./scenes/overworld";
import { makeCombat } from "./scenes/combat";
import { makeVictory } from "./scenes/victory";
import { makeDefeat } from "./scenes/defeat";

// GameCanvas is JUST the host: it owns the canvas, loads images, forwards input,
// runs the loop, and calls the current scene's update/draw. No game logic here.
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const stackRef = useRef<PanelId[]>([]);
  const [stack, setStack] = useState<PanelId[]>([]);
  const party = useParty();

  const closePanel = useCallback((p: PanelId) => {
    stackRef.current = stackRef.current.filter((x) => x !== p);
    setStack(stackRef.current);
  }, []);

  const togglePanel = useCallback((p: PanelId) => {
    const open = stackRef.current;
    if (open.includes(p)) { stackRef.current = open.filter((x) => x !== p); setStack(stackRef.current); return; }
    for (const k in keysRef.current) keysRef.current[k] = false;    // release held keys or she keeps walking
    const rule = PANELS[p].stacksOn;
    const kept = rule === "all"  ? open
               : rule === "menu" ? open.filter((x) => PANELS[x].stacksOn !== "none")
               : [];
    stackRef.current = [...kept, p];
    setStack(stackRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = VW * DPR; canvas.height = VH * DPR; ctx.scale(DPR, DPR);

    const fontProp = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "font")!;
    Object.defineProperty(ctx, "font", {
      configurable: true,
      get: () => fontProp.get!.call(ctx),
      set: (v: string) => {
        const px = String(v).match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "12";
        fontProp.set!.call(ctx, `${px}px "Pixel", monospace`);
      },
    });
    document.fonts.load('16px "Pixel"');   // avoid a one-frame fallback flash

    // images
    const IMG: Record<string, Img> = {};
    for (const key in ASSETS) { const el = new Image(); const o: Img = { el, ok: false }; el.onload = () => (o.ok = true); el.onerror = () => (o.ok = false); el.src = ASSETS[key]; IMG[key] = o; }

    // input
    const keys = keysRef.current, pressed: Record<string, boolean> = {};
    const norm = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);   // 'D' and 'd' → 'd' (Shift-safe)
    const onKeyDown = (e: KeyboardEvent) => {
      const k = norm(e);
      if (k === "Escape") { e.preventDefault(); return togglePanel("system"); }
      if (k === "b") return togglePanel("bag");
      if (k === "f") return togglePanel("phone");
      if (stackRef.current.length) return;
      if (["ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
      if (!keys[k]) pressed[k] = true; keys[k] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => { if (stackRef.current.length) return; keys[norm(e)] = false; };
    const took = (k: string) => { if (pressed[k]) { pressed[k] = false; return true; } return false; };
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);

    // Canvas is displayed scaled, so client px must be converted back into the
    // 900x540 logical space every scene draws in.
    const mouse = { x: -1, y: -1 };
    let clickPending = false;
    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (VW / r.width);
      mouse.y = (e.clientY - r.top) * (VH / r.height);
    };
    const onMove = (e: PointerEvent) => toLocal(e);
    const onDown = (e: PointerEvent) => { toLocal(e); clickPending = true; };
    const onLeave = () => { mouse.x = -1; mouse.y = -1; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerleave", onLeave);
    const clicked = () => { if (clickPending) { clickPending = false; return true; } return false; };

    const game: Game = {
      ctx, IMG, keys, took, mouse, clicked,
      p: { x: 120, y: 0, w: PW, h: PH, vx: 0, vy: 0, grounded: false, face: 1 },
      cam: { x: 0, y: 0 },
      roomId: "a101",
      enemies: [],
      combat: null, foe: null, ret: { x: 0, y: 0 },
      dom: { reader: readerRef.current!, ui: uiRef.current! },
      setScene: () => {},
    };

    const scenes: Record<SceneName, Scene> = {
      overworld: makeOverworld(game),
      combat: makeCombat(game),
      victory: makeVictory(game),
      defeat: makeDefeat(game),
    };
    let current: Scene = scenes.overworld;
    game.setScene = (name, opts) => { current.exit?.(); current = scenes[name]; current.enter?.(opts); };

    current.enter?.();   // start in the overworld

    let raf = 0, last = performance.now();
    const loop = (t: number) => { const dt = Math.min(50, t - last); last = t; current.update(dt); current.draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", gap: "0.75rem", padding: "1rem", fontFamily: '"Pixel", monospace' }}>
      <div style={{ position: "relative", aspectRatio: "900/540", height: "min(85vh, 60vw)" }}>
        <canvas ref={canvasRef} width={900} height={540} style={{ width: "100%", height: "100%", border: "1px solid rgba(232,99,42,.3)", boxShadow: "0 0 80px rgba(232,99,42,.15)" }} />
        <div ref={readerRef} style={{ position: "absolute", left: "1rem", right: "1rem", bottom: "3.5rem", margin: "0 auto", maxWidth: "34rem", padding: "1rem", borderRadius: "8px", background: "rgba(16,11,7,.94)", border: "1px solid rgba(232,99,42,.4)", opacity: 0, transition: "opacity .35s", fontFamily: "'Zilla Slab',serif", pointerEvents: "none" }} />
        <div ref={uiRef} style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "none", gap: 12, padding: "14px 20px", background: "rgba(10,7,6,.92)", borderTop: "3px solid #a31d3e" }} />
        <HUD party={party} open={stack} onToggle={togglePanel} />
        {stack.map((id, i) => {
          const P = PANELS[id];
          return (
            <Popup key={id} title={P.title} size={P.size} depth={i} onClose={() => closePanel(id)}>
              <P.Body open={togglePanel} close={() => closePanel(id)} />
            </Popup>
          );
        })}
      </div>
    </div>
  );
}