import { useMemo, useRef } from "react";
import { useFrame } from "./frame-clock";
import { motion } from "./motion";
import { mix } from "./palette";

// Gears and rings (DESIGN.md): concentric mechanisms at different depths and
// speeds. Two groups:
//   - Platform: a tilted disc of rings under the orb (the "pedestal"), with a
//     light beam rising to the orb. What it means: ORU's work rate. It turns
//     faster while thinking and ticks forward on every tool call.
//   - Orbit rings: thin flat rings around the orb at a different speed, so
//     depth comes from parallax.

interface RingDef {
  r: number;
  /** degrees per second at rest; sign = direction */
  speed: number;
  kind: "teeth" | "dash" | "notch" | "solid";
  width: number;
  opacity: number;
}

const PLATFORM: RingDef[] = [
  { r: 96, speed: 2, kind: "solid", width: 0.6, opacity: 0.35 },
  { r: 90, speed: -4, kind: "teeth", width: 1.6, opacity: 0.7 },
  { r: 78, speed: 6, kind: "notch", width: 2.4, opacity: 0.55 },
  { r: 66, speed: -9, kind: "dash", width: 0.8, opacity: 0.6 },
  { r: 52, speed: 12, kind: "teeth", width: 1.2, opacity: 0.75 },
  { r: 38, speed: -16, kind: "notch", width: 1.8, opacity: 0.7 },
  { r: 24, speed: 22, kind: "solid", width: 1.2, opacity: 0.9 },
];

const ORBIT: RingDef[] = [
  { r: 98, speed: -1.5, kind: "dash", width: 0.35, opacity: 0.35 },
  { r: 92, speed: 2.5, kind: "teeth", width: 0.6, opacity: 0.3 },
];

function ringPath(def: RingDef): { d: string; dash?: string } {
  const { r } = def;
  const circle = `M${100 - r} 100 a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
  if (def.kind === "solid") return { d: circle };
  if (def.kind === "dash") {
    const c = 2 * Math.PI * r;
    return { d: circle, dash: `${(c / 90).toFixed(2)} ${(c / 60).toFixed(2)}` };
  }
  if (def.kind === "notch") {
    const c = 2 * Math.PI * r;
    return { d: circle, dash: `${(c / 7).toFixed(2)} ${(c / 40).toFixed(2)}` };
  }
  // teeth: radial ticks round the circle
  const parts: string[] = [];
  const n = Math.round(r * 0.9);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const len = i % 5 === 0 ? 4 : 2;
    const x0 = 100 + Math.cos(a) * r;
    const y0 = 100 + Math.sin(a) * r;
    const x1 = 100 + Math.cos(a) * (r - len);
    const y1 = 100 + Math.sin(a) * (r - len);
    parts.push(`M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  return { d: parts.join("") };
}

function useRings(defs: RingDef[]) {
  const refs = useRef<(SVGPathElement | null)[]>([]);
  const angles = useRef(defs.map(() => 0));
  const paths = useMemo(() => defs.map(ringPath), [defs]);
  useFrame((_t, dt) => {
    // Speed scales with activity; a tool call nudges every ring forward.
    const rate = 0.6 + motion.energy * 2.2;
    defs.forEach((def, i) => {
      angles.current[i] += def.speed * rate * dt + Math.sign(def.speed) * motion.toolTick * 1.5;
      refs.current[i]?.setAttribute(
        "transform",
        `rotate(${(angles.current[i] % 360).toFixed(2)} 100 100)`,
      );
    });
  });
  const svg = (
    <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
      {defs.map((def, i) => (
        <path
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          d={paths[i].d}
          fill="none"
          stroke="var(--oru-primary)"
          strokeWidth={def.width}
          strokeDasharray={paths[i].dash}
          opacity={def.opacity}
        />
      ))}
    </svg>
  );
  return svg;
}

export function Platform({ width }: { width: number }) {
  const svg = useRings(PLATFORM);
  const beam = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (beam.current) beam.current.style.opacity = String(0.25 + motion.energy * 0.5 + motion.level * 0.3);
  });
  return (
    <div className="pointer-events-none relative" style={{ width, height: width * 0.3 }}>
      {/* Light beam from the platform up to the orb */}
      <div
        ref={beam}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "45%",
          width: width * 0.1,
          height: width * 0.4,
          background: `linear-gradient(to top, ${mix("primary", 35)}, transparent)`,
          filter: "blur(6px)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width,
          height: width,
          transform: `translate(-50%, -50%) perspective(${width * 2}px) rotateX(79deg)`,
          filter: "drop-shadow(0 0 4px var(--oru-glow))",
        }}
      >
        <div data-oru="platform" className="h-full w-full">{svg}</div>
      </div>
    </div>
  );
}

export function OrbitRings({ size }: { size: number }) {
  const svg = useRings(ORBIT);
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: size, height: size }}>
      {svg}
    </div>
  );
}
