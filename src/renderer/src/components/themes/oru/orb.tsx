import { useEffect, useRef, useState } from "react";
import { MicOff } from "lucide-react";
import { OrbRenderer } from "./orb-gl";
import { getBudget, useFrame } from "./frame-clock";
import { motion } from "./motion";
import { OduGlyph } from "./odu";

// Glyphs that drift faintly inside the glass (Tofa's pick: orb surface (a)).
// Fixed bytes so the layout is stable; positions are % of the orb box.
const INNER_GLYPHS = [
  { byte: 0x00, x: 38, y: 30, d: 0 },
  { byte: 0xa5, x: 58, y: 42, d: 3 },
  { byte: 0x3c, x: 44, y: 58, d: 6 },
  { byte: 0xf0, x: 62, y: 64, d: 9 },
  { byte: 0x5a, x: 32, y: 50, d: 12 },
];

/**
 * The orb: ORU's being, centre of the screen. A WebGL2 canvas (orb-gl.ts)
 * driven every frame from motion.ts. Falls back to a CSS glow if WebGL2 is
 * unavailable.
 */
export function Orb({ size, isMuted }: { size: number; isMuted: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OrbRenderer | null>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const init = () => {
      try {
        rendererRef.current = new OrbRenderer(canvas);
        setFailed(false);
      } catch (err) {
        console.error("[oru] orb renderer failed", err);
        rendererRef.current = null;
        setFailed(true);
      }
    };
    const onLost = (e: Event) => {
      e.preventDefault(); // allow restore
      rendererRef.current = null;
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", init);
    init();
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", init);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useFrame((time) => {
    const r = rendererRef.current;
    const { lowPower } = getBudget();
    if (r) {
      // Pixel ratio cap (DESIGN.md): 1.25 normally, 1 on battery.
      r.resize(lowPower ? 1 : 1.25);
      r.render({ time, level: motion.level, w: motion.w, lowPower });
    }
    // Inner glyphs: brighter and faster while thinking.
    const g = glyphRef.current;
    if (g) {
      g.style.opacity = String(0.1 + motion.w.thinking * 0.25 + motion.w.speaking * 0.08);
      g.style.transform = `rotate(${(time * (4 + motion.w.thinking * 30)) % 360}deg)`;
    }
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {failed && (
        <div
          className="absolute inset-[20%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(57,255,20,0.35), rgba(57,255,20,0.05) 60%, transparent 70%)",
            boxShadow: "0 0 80px var(--oru-glow)",
          }}
        />
      )}
      {/* Faint glyphs "inside" the glass, clipped to the sphere. */}
      <div
        className="pointer-events-none absolute inset-[22%] overflow-hidden rounded-full"
        style={{ color: "var(--oru-primary)" }}
      >
        <div ref={glyphRef} className="absolute inset-0" style={{ opacity: 0.1 }}>
          {INNER_GLYPHS.map((g) => (
            <div
              key={g.byte}
              className="absolute"
              style={{ left: `${g.x}%`, top: `${g.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <OduGlyph byte={g.byte} size={size * 0.07} />
            </div>
          ))}
        </div>
      </div>
      {isMuted && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="grid place-items-center rounded-full border"
            style={{
              width: size * 0.16,
              height: size * 0.16,
              borderColor: "rgba(214,255,208,0.35)",
              background: "rgba(2,5,3,0.6)",
              color: "var(--oru-text)",
            }}
            title="Muted"
          >
            <MicOff style={{ width: size * 0.07, height: size * 0.07 }} />
          </div>
        </div>
      )}
    </div>
  );
}
