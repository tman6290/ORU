import { useEffect, useRef } from "react";
import { getBudget, useFrame } from "./frame-clock";
import { motion } from "./motion";
import { drawOdu } from "./odu";
import { PRIMARY, PRIMARY_DIM, lerpRgb, rgba } from "./palette";

// Background data streams (DESIGN.md "Odù glyphs"): columns of Odù glyphs
// drifting down behind the centre. What it means: ORU's activity level. They
// drift slowly at rest, run faster while he works, and while he thinks glyphs
// peel off and stream inward into the orb. Canvas 2D, one path per frame.

interface Column {
  x: number;
  y: number;
  speed: number;
  bytes: number[];
}

interface Inflow {
  x: number;
  y: number;
  byte: number;
  life: number;
}

const GLYPH = 14; // px
const GAP = 24; // vertical spacing

export function GlyphStreams({ orbCenter }: { orbCenter: () => { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cols = useRef<Column[]>([]);
  const inflow = useRef<Inflow[]>([]);
  const acc = useRef(0);
  const skip = useRef(false);
  const pending = useRef(0);

  // Lay out columns across the centre band whenever the canvas resizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layout = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w;
      canvas.height = h;
      const count = Math.max(6, Math.round(w / 70));
      cols.current = Array.from({ length: count }, (_, i) => {
        const len = Math.ceil(h / GAP) + 2;
        return {
          x: (w * (i + 0.5)) / count + (((i * 53) % 17) - 8),
          y: -((i * 97) % GAP),
          speed: 10 + ((i * 31) % 14),
          bytes: Array.from({ length: len }, (_, k) => (i * 59 + k * 23) & 0xff),
        };
      });
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useFrame((t, frameDt) => {
    // Streams are background: draw at most ~30 fps (every other 60 fps frame),
    // advancing by all the time since the last drawn frame.
    pending.current += frameDt;
    skip.current = !skip.current;
    if (skip.current && getBudget().fps > 30) return;
    const dt = pending.current;
    pending.current = 0;
    const step = dt;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";

    const flow = 0.4 + motion.energy * 2.2;
    const head = lerpRgb(PRIMARY, motion.alert);
    const tail = lerpRgb(PRIMARY_DIM, motion.alert);
    const blink = 1 + motion.alarm * 0.8;
    const orb = orbCenter();
    for (const c of cols.current) {
      c.y += c.speed * flow * step;
      if (c.y >= GAP) {
        c.y -= GAP;
        c.bytes.unshift(c.bytes.pop()!);
        // Mutate one glyph now and then so streams read as live data.
        c.bytes[0] = (c.bytes[0] * 7 + Math.floor(t * 10)) & 0xff;
      }
      // Fade near the orb (keeps the centre clean) and near the edges.
      const dx = Math.abs(c.x - orb.x) / (w / 2);
      const colAlpha = 0.18 + 0.5 * Math.min(1, dx * 1.6);
      for (let k = 0; k < c.bytes.length; k++) {
        const y = c.y + (k - 1) * GAP;
        if (y < -GAP || y > h) continue;
        const isHead = k === 1;
        const edge = Math.min(1, y / 120, (h - y) / 160);
        const a = Math.min(1, Math.max(0, colAlpha * edge * blink * (isHead ? 0.9 : 0.35 + 0.25 * motion.energy)));
        if (a < 0.02) continue;
        ctx.strokeStyle = rgba(isHead ? head : tail, a);
        drawOdu(ctx, c.bytes[k], c.x - GLYPH * 0.3, y, GLYPH);
      }
    }

    // Thinking: glyphs peel off the streams and fall inward to the orb.
    acc.current += dt * motion.w.thinking * 10;
    while (acc.current >= 1 && cols.current.length) {
      acc.current -= 1;
      const c = cols.current[Math.floor(Math.random() * cols.current.length)];
      inflow.current.push({ x: c.x, y: c.y + GAP * (1 + Math.floor(Math.random() * 8)), byte: c.bytes[2], life: 1 });
    }
    inflow.current = inflow.current.filter((g) => {
      g.life -= dt * 0.9;
      g.x += (orb.x - g.x) * Math.min(1, dt * 2.4);
      g.y += (orb.y - g.y) * Math.min(1, dt * 2.4);
      if (g.life <= 0) return false;
      ctx.strokeStyle = rgba(head, g.life * 0.8);
      drawOdu(ctx, g.byte, g.x - GLYPH * 0.3, g.y, GLYPH * (0.6 + g.life * 0.4));
      return true;
    });
  });

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
