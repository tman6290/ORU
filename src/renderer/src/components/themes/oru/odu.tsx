// Odù glyphs (DESIGN.md "Odù glyphs"). Any of the 256 from one byte:
// - two legs of four marks; each mark is single (I, bit 0) or double (II, bit 1)
// - the right leg holds the high nibble, the left leg the low nibble
// - each leg reads top to bottom from the nibble's most significant bit
// So 0x00 is Ogbè (all single marks). The glyphs are a visual motif only;
// ORU never presents them as readings.

/** Mark at `row` (0 = top) of a leg: true = double. */
export function oduMark(byte: number, leg: "left" | "right", row: number): boolean {
  const nibble = leg === "right" ? (byte >> 4) & 0xf : byte & 0xf;
  return ((nibble >> (3 - row)) & 1) === 1;
}

/** Stable byte for any string (tool cards get a marker glyph from their id). */
export function oduFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 0xff;
}

// Geometry in a 12×20 box: legs at x=2 and x=10 (left, right); a single mark is
// one short bar, a double mark two bars side by side.
const LEG_X = { left: 3, right: 9 } as const;
const ROW_Y = [2, 7, 12, 17];
const BAR = 3; // bar height

export function OduGlyph({
  byte,
  size = 20,
  className,
  strokeWidth = 1.4,
}: {
  byte: number;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const bars: { x: number; y: number }[] = [];
  for (const leg of ["left", "right"] as const) {
    for (let row = 0; row < 4; row++) {
      const y = ROW_Y[row];
      if (oduMark(byte, leg, row)) {
        bars.push({ x: LEG_X[leg] - 1.2, y }, { x: LEG_X[leg] + 1.2, y });
      } else {
        bars.push({ x: LEG_X[leg], y });
      }
    }
  }
  return (
    <svg
      viewBox="0 0 12 20"
      width={(size * 12) / 20}
      height={size}
      className={className}
      aria-hidden
    >
      {bars.map((b, i) => (
        <line
          key={i}
          x1={b.x}
          x2={b.x}
          y1={b.y - BAR / 2}
          y2={b.y + BAR / 2}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Canvas version for the background streams (hundreds per frame). */
export function drawOdu(
  ctx: CanvasRenderingContext2D,
  byte: number,
  x: number,
  y: number,
  size: number,
) {
  const s = size / 20;
  ctx.beginPath();
  for (const leg of ["left", "right"] as const) {
    for (let row = 0; row < 4; row++) {
      const cy = y + ROW_Y[row] * s;
      const xs = oduMark(byte, leg, row) ? [LEG_X[leg] - 1.2, LEG_X[leg] + 1.2] : [LEG_X[leg]];
      for (const bx of xs) {
        ctx.moveTo(x + bx * s, cy - (BAR / 2) * s);
        ctx.lineTo(x + bx * s, cy + (BAR / 2) * s);
      }
    }
  }
  ctx.stroke();
}
