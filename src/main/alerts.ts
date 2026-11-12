// Alert bus (D19). Anything in ORU can raise an alert; the theme shows it.
//   error    → the interface turns neon red, ORU says what went wrong.
//              Clears itself after ERROR_TTL_MS unless re-raised.
//   critical → red, blinking, alarm sound, ORU repeats "Warning! Warning! …"
//              until Tofa acknowledges it.
// Sources today: the renderer (voice errors, debug keys). Later phases add a
// security monitor (attacks), system health and skills. Alerts live in main so
// every window sees the same list and they survive a renderer reload.

import { randomUUID } from "node:crypto";

export type AlertLevel = "error" | "critical";

export interface OruAlert {
  id: string;
  level: AlertLevel;
  /** Short headline, shown in the top bar: "Unknown device on the network". */
  title: string;
  /** Optional longer detail for the Actions/alerts panel. */
  detail?: string;
  /** What ORU says. Defaults to the title ("Warning! Warning! <title>" when critical). */
  speech?: string;
  /** Who raised it: "voice", "security", "debug", a skill name … */
  source: string;
  /** Epoch ms. */
  at: number;
}

export type AlertInput = Omit<OruAlert, "id" | "at"> & { id?: string };

const ERROR_TTL_MS = 10_000;

const active = new Map<string, OruAlert>();
const timers = new Map<string, NodeJS.Timeout>();
let broadcast: (alerts: OruAlert[]) => void = () => {};

export function initAlerts(onChange: (alerts: OruAlert[]) => void) {
  broadcast = onChange;
}

export function listAlerts(): OruAlert[] {
  return [...active.values()].sort((a, b) => a.at - b.at);
}

function changed() {
  broadcast(listAlerts());
}

/** Raise (or refresh, when `id` matches) an alert. Returns its id. */
export function raiseAlert(input: AlertInput): string {
  const id = input.id ?? randomUUID();
  const speech =
    input.speech ?? (input.level === "critical" ? `Warning! Warning! ${input.title}.` : `${input.title}.`);
  active.set(id, { ...input, id, speech, at: Date.now() });
  clearTimeout(timers.get(id));
  if (input.level === "error") {
    timers.set(
      id,
      setTimeout(() => clearAlert(id), ERROR_TTL_MS),
    );
  }
  changed();
  return id;
}

/** Acknowledge / resolve an alert. */
export function clearAlert(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (active.delete(id)) changed();
}
