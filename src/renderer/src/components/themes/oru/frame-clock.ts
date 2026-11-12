// One animation loop for the whole ORU theme. Every animated layer subscribes
// here instead of running its own requestAnimationFrame, so the frame budget
// (DESIGN.md "Performance budget") is enforced in one place:
//   60 fps focused · 30 fps when another app has focus · paused in Windows view
//   · reduced effects on battery.

import { useEffect, useRef } from "react";

export type FrameFn = (time: number, dt: number) => void;

export interface Budget {
  /** Frame cap; 0 pauses the loop. */
  fps: number;
  /** Fewer particles, no bloom (battery). */
  lowPower: boolean;
}

const subscribers = new Set<FrameFn>();
const budgetListeners = new Set<(b: Budget) => void>();
let budget: Budget = { fps: 60, lowPower: false };
let raf = 0;
let last = 0;
let lastDrawn = 0;

// Measured frame rate, for PROGRESS.md (read with oruFps() in DevTools).
let frames = 0;
let fpsWindowStart = 0;
let measuredFps = 0;

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  if (budget.fps <= 0) return;
  // Cap: skip frames until a full interval has passed (small slack so 60 fps
  // on a 60 Hz display never drops to 30).
  const interval = 1000 / budget.fps;
  if (now - lastDrawn < interval - 2) return;
  lastDrawn = now;
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  const t = now / 1000;
  for (const fn of subscribers) fn(t, dt);
  frames++;
  if (now - fpsWindowStart >= 1000) {
    measuredFps = (frames * 1000) / (now - fpsWindowStart);
    frames = 0;
    fpsWindowStart = now;
  }
}

function ensureRunning() {
  if (!raf && subscribers.size) {
    last = 0;
    raf = requestAnimationFrame(loop);
  } else if (raf && !subscribers.size) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

export function setBudget(next: Budget) {
  if (next.fps === budget.fps && next.lowPower === budget.lowPower) return;
  budget = next;
  if (next.fps > 0) last = 0; // no giant dt after a pause
  for (const l of budgetListeners) l(budget);
}

export function getBudget(): Budget {
  return budget;
}

export function onBudget(fn: (b: Budget) => void): () => void {
  budgetListeners.add(fn);
  return () => budgetListeners.delete(fn);
}

/** Run `fn` every drawn frame. `fn` may change between renders. */
export function useFrame(fn: FrameFn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const call: FrameFn = (t, dt) => ref.current(t, dt);
    subscribers.add(call);
    ensureRunning();
    return () => {
      subscribers.delete(call);
      ensureRunning();
    };
  }, []);
}

declare global {
  interface Window {
    /** DevTools helper: measured ORU frame rate. */
    oruFps?: () => number;
  }
}
window.oruFps = () => Math.round(measuredFps);
