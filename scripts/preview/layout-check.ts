// Layout check for the ORU theme: finds overlaps between HUD pieces and
// anything cut off by the screen edge. Run `oruLayoutCheck()` in the preview's
// console (or from a test) at each target size: 1280x800 (Tofa's Legion at
// 200%) and 1920x1080. Run it before calling any layout change done.

type Box = { name: string; x0: number; y0: number; x1: number; y1: number };

/** Union of the drawn children (paths, lines, circles), so 3D-tilted SVGs
 *  report what is actually painted, not their square box. */
function drawnBox(name: string, root: Element): Box | null {
  const parts = root.querySelectorAll("path, line, circle, polyline");
  const rects = (parts.length ? [...parts] : [root]).map((e) => e.getBoundingClientRect());
  const live = rects.filter((r) => r.width || r.height);
  if (!live.length) return null;
  return {
    name,
    x0: Math.min(...live.map((r) => r.left)),
    y0: Math.min(...live.map((r) => r.top)),
    x1: Math.max(...live.map((r) => r.right)),
    y1: Math.max(...live.map((r) => r.bottom)),
  };
}

function boxOf(name: string, el: Element, inset = 0): Box {
  const r = el.getBoundingClientRect();
  const dx = r.width * inset;
  const dy = r.height * inset;
  return { name, x0: r.left + dx, y0: r.top + dy, x1: r.right - dx, y1: r.bottom - dy };
}

// Pairs that are meant to overlap: the ring wraps the orb, the platform sits
// under it, and the lattice arches over its top half.
const ALLOWED = new Set(["orb|ring", "orb|platform", "lattice|orb"]);

export function oruLayoutCheck() {
  const boxes: Box[] = [];
  for (const el of document.querySelectorAll("[data-oru]")) {
    const name = (el as HTMLElement).dataset.oru!;
    if (boxes.some((b) => b.name === name)) continue;
    if (name === "ring" || name === "lattice" || name === "platform") {
      const b = drawnBox(name, el);
      if (b) boxes.push(b);
    } else if (name === "orb") {
      // The canvas is square; the sphere + particle shell use the middle ~80%.
      boxes.push(boxOf(name, el, 0.1));
    } else if (name === "typing" && el.getAttribute("data-open") === "false") {
      continue;
    } else {
      boxes.push(boxOf(name, el));
    }
  }
  const pad = 8; // minimum breathing room between pieces
  const overlaps: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const key = [a.name, b.name].sort().join("|");
      if (ALLOWED.has(key)) continue;
      const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + pad;
      const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + pad;
      if (w > 0 && h > 0) overlaps.push(`${key} (${Math.round(w - pad)}x${Math.round(h - pad)} px)`);
    }
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutOff = boxes
    .filter((b) => b.x0 < 0 || b.y0 < 0 || b.x1 > vw || b.y1 > vh)
    .map((b) => b.name);
  return { size: `${vw}x${vh}`, overlaps, cutOff, boxes };
}

declare global {
  interface Window {
    oruLayoutCheck?: typeof oruLayoutCheck;
  }
}
window.oruLayoutCheck = oruLayoutCheck;
