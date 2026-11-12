// Shared, per-frame motion state. The theme root updates it once per frame
// from the voice status and audio level; every layer (orb, ring, gears,
// lattice, glyph streams) reads it in its own frame callback. Plain mutable
// object, no React state, so 60 fps costs no re-renders.

import type { DexStatus } from "@/lib/dex/state";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "muted" | "error";

export function orbStateOf(status: DexStatus, isMuted: boolean): OrbState {
  if (isMuted || status === "muted") return "muted";
  switch (status) {
    case "active_listening":
    case "follow_up_listening":
      return "listening";
    case "thinking":
      return "thinking";
    case "speaking":
      return "speaking";
    case "error":
      return "error";
    default:
      // idle, listening_wake (standing by for the wake word), unsupported
      return "idle";
  }
}

const STATES: OrbState[] = ["idle", "listening", "thinking", "speaking", "muted", "error"];

export const motion = {
  /** Blend weight per state, 0..1, summing to ~1. Eased over ~400 ms. */
  w: { idle: 1, listening: 0, thinking: 0, speaking: 0, muted: 0, error: 0 } as Record<
    OrbState,
    number
  >,
  /** Current target state. */
  state: "idle" as OrbState,
  /** Voice level 0..1 (mic while listening, ORU's voice while speaking), lightly smoothed. */
  level: 0,
  /** Overall activity 0..1: drives gear speed, lattice brightness, glyph flow. */
  energy: 0,
  /** Decaying accent fired on each tool call (1 → 0 over ~300 ms). */
  toolTick: 0,
  /** Decaying accent fired when ORU starts listening (wake word). */
  wake: 0,
  /** Seconds since the theme mounted. */
  time: 0,
};

const ENERGY: Record<OrbState, number> = {
  idle: 0.15,
  listening: 0.45,
  thinking: 1,
  speaking: 0.7,
  muted: 0.05,
  error: 0.3,
};

/** Error flickers briefly, then the orb returns to idle (DESIGN.md). */
let errorSince = -1;

export function setOrbState(next: OrbState) {
  if (next === motion.state) return;
  if (next === "listening" && motion.state !== "listening") motion.wake = 1;
  if (next === "error") errorSince = motion.time;
  motion.state = next;
}

export function fireToolTick() {
  motion.toolTick = 1;
}

/** Advance blends. Call once per frame from the theme root. */
export function stepMotion(t: number, dt: number, rawLevel: number) {
  motion.time = t;
  let target = motion.state;
  if (target === "error" && errorSince >= 0 && t - errorSince > 1.2) target = "idle";

  // Exponential approach: ~95% of the way in 400 ms (DESIGN: 300–500 ms blends).
  const k = 1 - Math.exp(-dt / 0.133);
  for (const s of STATES) {
    const goal = s === target ? 1 : 0;
    motion.w[s] += (goal - motion.w[s]) * k;
  }

  // Level: smooth a little and no more, so speech still tracks syllables.
  const rise = 1 - Math.exp(-dt / 0.03);
  const fall = 1 - Math.exp(-dt / 0.09);
  motion.level += (rawLevel - motion.level) * (rawLevel > motion.level ? rise : fall);

  let energy = 0;
  for (const s of STATES) energy += ENERGY[s] * motion.w[s];
  motion.energy = energy + motion.level * 0.3;

  motion.toolTick = Math.max(0, motion.toolTick - dt / 0.3);
  motion.wake = Math.max(0, motion.wake - dt / 0.3);
}
