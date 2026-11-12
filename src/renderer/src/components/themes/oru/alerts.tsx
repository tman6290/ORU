import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { OruAlert } from "../../../../../main/alerts";
import type { AlertLevel } from "./motion";

// Alerts in the theme (D19):
//   error    → neon red, ORU says what went wrong once.
//   critical → red + blinking + klaxon, ORU says "Warning! Warning! …" and
//              repeats it every 20 s until silenced.
// Silence (button, Esc, Ctrl+Alt+Backspace, or typing/saying "silence") stops
// the klaxon, blinking and repeats; the screen stays a steady red until the
// issue is solved (its source clears the alert) or Tofa dismisses it.
// Speech here uses the built-in Windows voices (offline) as a stop-gap;
// Phase 4 routes alert speech through ORU's own voice.

/** Subscribe to main's alert list. */
export function useAlerts(): OruAlert[] {
  const [alerts, setAlerts] = useState<OruAlert[]>([]);
  useEffect(() => {
    let alive = true;
    void window.opendex.getAlerts().then((a) => alive && setAlerts(a));
    const off = window.opendex.onAlerts(setAlerts);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return alerts;
}

export function alertLevelOf(alerts: OruAlert[], voiceError: boolean): AlertLevel {
  if (alerts.some((a) => a.level === "critical" && !a.silenced)) return "critical";
  if (voiceError || alerts.length) return "error";
  return "none";
}

// ── Klaxon ─────────────────────────────────────────────────────────────────
// Two-tone alarm synthesised with Web Audio (original, no samples): a filtered
// sawtooth alternating 880 / 660 Hz every half second.

class Klaxon {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private timer = 0;

  start(volume = 0.12) {
    if (this.osc) return;
    const ctx = (this.ctx ??= new AudioContext());
    void ctx.resume();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    let high = true;
    const flip = () => {
      osc.frequency.setTargetAtTime(high ? 880 : 660, ctx.currentTime, 0.01);
      high = !high;
    };
    flip();
    this.timer = window.setInterval(flip, 500);
    osc.start();
    this.osc = osc;
    this.gain = gain;
  }

  stop() {
    window.clearInterval(this.timer);
    if (this.osc && this.ctx && this.gain) {
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setTargetAtTime(0, t, 0.03);
      this.osc.stop(t + 0.2);
    }
    this.osc = null;
    this.gain = null;
  }
}

function say(text: string) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  synth.speak(u);
}

/**
 * Sound + speech for alerts. Errors speak once (not while muted). Critical
 * alerts sound the klaxon and repeat their warning every 20 s, even when muted.
 */
export function useAlertVoice(alerts: OruAlert[], isMuted: boolean) {
  const klaxon = useRef(new Klaxon());
  const spoken = useRef(new Set<string>());
  const critical = alerts.filter((a) => a.level === "critical" && !a.silenced);

  // Speak each new alert once.
  useEffect(() => {
    for (const a of alerts) {
      if (spoken.current.has(a.id + a.at)) continue;
      spoken.current.add(a.id + a.at);
      if (a.silenced || (a.level === "error" && isMuted)) continue;
      say(a.speech ?? a.title);
    }
  }, [alerts, isMuted]);

  // Klaxon + repeated warning while anything critical is unacknowledged.
  const criticalKey = critical.map((a) => a.id).join(",");
  useEffect(() => {
    if (!criticalKey) {
      klaxon.current.stop();
      // Cut off a warning mid-sentence when silenced or resolved.
      window.speechSynthesis?.cancel();
      return;
    }
    klaxon.current.start();
    const repeat = window.setInterval(() => {
      const latest = critical[critical.length - 1];
      if (latest) say(latest.speech ?? latest.title);
    }, 20_000);
    return () => window.clearInterval(repeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalKey]);

  useEffect(() => () => klaxon.current.stop(), []);
}

/** Replaces the status pill while an alert is active. */
export function AlertBanner({ alerts }: { alerts: OruAlert[] }) {
  const top =
    [...alerts].reverse().find((a) => a.level === "critical") ?? alerts[alerts.length - 1];
  if (!top) return null;
  const critical = top.level === "critical";
  const sounding = critical && !top.silenced;
  const btn =
    "oru-label shrink-0 border px-2 py-1 !text-[10px] hover:bg-[var(--oru-primary-faint)]";
  return (
    <div
      data-oru="status"
      className="oru-panel pointer-events-auto flex max-w-[min(560px,42vw)] items-center gap-3 !px-5 !py-2"
      title={top.detail ?? top.title}
    >
      <TriangleAlert
        className={sounding ? "oru-blink size-4 shrink-0" : "size-4 shrink-0"}
        style={{ color: "var(--oru-primary)" }}
      />
      <span className={sounding ? "oru-label oru-blink shrink-0" : "oru-label shrink-0"} style={{ color: "var(--oru-primary)" }}>
        {critical ? (top.silenced ? "Silenced" : "Warning") : "Error"}
      </span>
      <span className="min-w-0 truncate text-[12px] text-[var(--oru-text)]">{top.title}</span>
      {sounding && (
        <button
          type="button"
          onClick={() => window.opendex.silenceAlerts()}
          className={btn}
          style={{ borderColor: "var(--oru-primary)", color: "var(--oru-text)", background: "var(--oru-primary-faint)" }}
          title="Stop the alarm (Esc, Ctrl+Alt+Backspace, or say “silence”)"
        >
          Silence
        </button>
      )}
      <button
        type="button"
        onClick={() => window.opendex.ackAlert(top.id)}
        className={btn}
        style={{ borderColor: "var(--oru-primary)", color: "var(--oru-text)" }}
        title="Clear this alert"
      >
        Dismiss
      </button>
    </div>
  );
}
