// Colour helpers. All theme colours come from tokens in oru.css so an alert
// can turn the interface neon red by changing only the hue (D19).
//   - CSS/SVG: use `mix()` (a translucent token) or `var(--oru-…)` directly.
//   - Canvas/WebGL can't read CSS variables cheaply per frame, so they blend
//     between the green and red twins below with motion.alert.

/** A token at `pct`% opacity, e.g. mix("primary", 35). */
export function mix(token: string, pct: number): string {
  return `color-mix(in srgb, var(--oru-${token}) ${pct}%, transparent)`;
}

export type Rgb = readonly [number, number, number];

/** Green palette and its neon-red twin (same lightness and saturation, hue 357°). */
export const PRIMARY: { green: Rgb; red: Rgb } = { green: [57, 255, 20], red: [255, 20, 32] };
export const PRIMARY_DIM: { green: Rgb; red: Rgb } = { green: [30, 143, 14], red: [143, 14, 20] };

export function lerpRgb(c: { green: Rgb; red: Rgb }, t: number): Rgb {
  const mixed = [0, 1, 2].map((i) => c.green[i] + (c.red[i] - c.green[i]) * t);
  // Keep the brightest channel where it was, so the blend shifts hue without dimming.
  const peak = Math.max(...c.green);
  const scale = peak / Math.max(...mixed);
  return mixed.map((v) => Math.round(Math.min(255, v * scale))) as unknown as Rgb;
}

export function rgba(c: Rgb, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
}
