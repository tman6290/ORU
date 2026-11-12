import { useMemo, useRef } from "react";
import { useFrame } from "./frame-clock";
import { motion } from "./motion";
import { oduMark } from "./odu";

// The opon Ifá ring (DESIGN.md): a wide band around the orb, patterned after
// the carved border of the divination tray, drawn as line work. It lies tilted
// like a planet's ring. The back half renders behind the orb and the front half
// in front (two copies, each clipped), so the orb sits inside it. It turns
// slowly and splits into segments while ORU thinks.

const SEGMENTS = 16;
const R_IN = 80; // band inner radius (viewBox units, centre at 100,100)
const R_OUT = 96;
const TILT = 74; // degrees around X

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const;
}

function arc(r: number, a0: number, a1: number) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** One carved segment: border arcs, a zigzag, and an Odù glyph laid along the band. */
function segmentPaths(i: number) {
  const span = 360 / SEGMENTS;
  const a0 = i * span + 1.2;
  const a1 = (i + 1) * span - 1.2;
  const lines: string[] = [arc(R_OUT, a0, a1), arc(R_IN, a0, a1), arc(R_OUT - 3.5, a0, a1)];
  // Zigzag carving between the inner border and the glyph track.
  const zig: string[] = [];
  const steps = 8;
  for (let k = 0; k <= steps; k++) {
    const a = a0 + ((a1 - a0) * k) / steps;
    const [x, y] = polar(k % 2 ? R_IN + 2 : R_IN + 5.5, a);
    zig.push(`${k ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  lines.push(zig.join(" "));
  // End caps.
  for (const a of [a0, a1]) {
    const [x0, y0] = polar(R_IN, a);
    const [x1, y1] = polar(R_OUT, a);
    lines.push(`M${x0.toFixed(2)} ${y0.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  // Odù glyph marks laid radially on the outer track (each segment its own byte).
  const byte = (i * 37 + 11) & 0xff;
  const mid = (a0 + a1) / 2;
  for (const [leg, off] of [["left", -2.2], ["right", 2.2]] as const) {
    for (let row = 0; row < 4; row++) {
      const r = R_OUT - 6 - row * 1.9;
      const offs = oduMark(byte, leg, row) ? [off - 0.7, off + 0.7] : [off];
      for (const o of offs) {
        const [x0, y0] = polar(r - 0.5, mid + o);
        const [x1, y1] = polar(r + 0.5, mid + o);
        lines.push(`M${x0.toFixed(2)} ${y0.toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)}`);
      }
    }
  }
  return { d: lines.join(" "), mid };
}

function RingSvg({ groupRefs }: { groupRefs: React.MutableRefObject<(SVGGElement | null)[]> }) {
  const segs = useMemo(() => Array.from({ length: SEGMENTS }, (_, i) => segmentPaths(i)), []);
  return (
    <svg data-oru="ring" viewBox="0 0 200 200" className="h-full w-full overflow-visible">
      <g data-spin>
        {segs.map((s, i) => (
          <g
            key={i}
            ref={(el) => {
              groupRefs.current[i] = el;
            }}
          >
            <path
              d={s.d}
              fill="none"
              stroke="var(--oru-primary)"
              strokeWidth={0.55}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function OponRing({ size }: { size: number }) {
  const backRefs = useRef<(SVGGElement | null)[]>([]);
  const frontRefs = useRef<(SVGGElement | null)[]>([]);
  const backRoot = useRef<HTMLDivElement>(null);
  const frontRoot = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const mids = useMemo(() => Array.from({ length: SEGMENTS }, (_, i) => segmentPaths(i).mid), []);

  useFrame((_t, dt) => {
    // Slow turn; faster while thinking; a small kick on each tool call.
    angle.current += dt * (3 + 14 * motion.w.thinking + 4 * motion.w.speaking) + motion.toolTick * 0.6;
    const split = motion.w.thinking * 7; // segments drift apart while thinking
    const rot = `rotate(${angle.current.toFixed(2)} 100 100)`;
    for (const refs of [backRefs.current, frontRefs.current]) {
      refs.forEach((g, i) => {
        if (!g) return;
        // Offsets live inside the spinning group, so the un-rotated mid angle is right.
        const m = (mids[i] * Math.PI) / 180;
        g.setAttribute(
          "transform",
          `translate(${(Math.cos(m) * split).toFixed(2)} ${(Math.sin(m) * split).toFixed(2)})`,
        );
      });
      const spin = refs[0]?.parentElement;
      spin?.setAttribute("transform", rot);
    }
    const glow = 0.45 + motion.energy * 0.45;
    for (const root of [backRoot.current, frontRoot.current]) {
      if (root) root.style.opacity = String(glow);
    }
  });

  const layer = (clip: string, refs: typeof backRefs, rootRef: typeof backRoot, z: number) => (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0"
      style={{ clipPath: clip, zIndex: z, filter: "drop-shadow(0 0 3px var(--oru-glow))" }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: size,
          height: size,
          transform: `translate(-50%, -50%) perspective(${size * 3}px) rotateZ(-6deg) rotateX(${TILT}deg)`,
        }}
      >
        <RingSvg groupRefs={refs} />
      </div>
    </div>
  );

  return (
    <>
      {/* Far side (top half after the tilt) behind the orb; near side in front. */}
      {layer("inset(0 0 50% 0)", backRefs, backRoot, 0)}
      {layer("inset(50% 0 0 0)", frontRefs, frontRoot, 3)}
    </>
  );
}
