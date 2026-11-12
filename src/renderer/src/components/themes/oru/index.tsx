import "./oru.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DexThemeDef, DexThemeProps } from "../types";
import type { DexStatus } from "@/lib/dex/state";
import { PTT_HINT } from "@/lib/hotkeys";
import { setBudget, useFrame } from "./frame-clock";
import {
  fireToolTick,
  orbStateOf,
  setAlertLevel,
  setOrbState,
  stepMotion,
  type OrbState,
} from "./motion";
import { Orb } from "./orb";
import { OponRing } from "./ring";
import { OrbitRings, Platform } from "./gears";
import { MindLattice } from "./lattice";
import { GlyphStreams } from "./glyph-streams";
import { ActionsPanel, Controls, SystemPanel, TopBar, TranscriptPanel, TypingPanel } from "./panels";
import { useBattery, useSystemStats } from "./use-system-stats";
import { mix } from "./palette";
import { AlertBanner, alertLevelOf, useAlerts, useAlertVoice } from "./alerts";

// The ORU theme (Phase 3, D16). Back to front:
//   background grid → glyph streams → platform (gears) → mind lattice →
//   ring (far half) → orb + orbit rings → ring (near half) → panels → controls.

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

/** Shell mode state from main (Phase 2): is it on, and which view is showing. */
function useShellView() {
  const [shell, setShell] = useState<{ active: boolean; view: "oru" | "windows" }>({
    active: false,
    view: "oru",
  });
  useEffect(() => {
    let alive = true;
    void window.opendex.getShellView().then((s) => alive && setShell(s));
    const off = window.opendex.onShellView((view) => setShell((s) => ({ ...s, view })));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return shell;
}

function useWindowFocus() {
  const [focused, setFocused] = useState(() => document.hasFocus());
  useEffect(() => {
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    window.addEventListener("focus", on);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("focus", on);
      window.removeEventListener("blur", off);
    };
  }, []);
  return focused;
}

// Debug: F8 cycles the orb through every state (with a synthetic voice level),
// so each look can be checked before a model exists (Phase 6). F8 past the last
// state, or Esc, returns to the real status. F9 raises a test critical alert
// (press again to resolve it), F10 a test error alert.
const DEBUG_STATES: OrbState[] = ["idle", "listening", "thinking", "speaking", "muted", "error"];

function useDebugState() {
  const [debug, setDebug] = useState<OrbState | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        setDebug((d) => {
          const i = d ? DEBUG_STATES.indexOf(d) + 1 : 0;
          return i < DEBUG_STATES.length ? DEBUG_STATES[i] : null;
        });
        fireToolTick();
      } else if (e.key === "F9") {
        // Press once to raise a test alarm, again to "solve" it (the source
        // clears it, so ORU turns green by itself).
        e.preventDefault();
        void window.opendex.getAlerts().then((list) => {
          if (list.some((a) => a.id === "debug-critical")) {
            window.opendex.ackAlert("debug-critical");
          } else {
            window.opendex.raiseAlert({
              id: "debug-critical",
              level: "critical",
              title: "Test alarm: unknown device tried to connect",
              source: "debug",
            });
          }
        });
      } else if (e.key === "F10") {
        e.preventDefault();
        window.opendex.raiseAlert({
          id: "debug-error",
          level: "error",
          title: "Test error: I couldn't reach the language model",
          source: "debug",
        });
      } else if (e.key === "Escape") {
        setDebug(null);
        window.opendex.silenceAlerts(); // Esc silences a sounding alarm
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return debug;
}

/** Measured frame rate, refreshed every second (frame budget checks). */
function DebugFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(window.oruFps?.() ?? 0), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{fps}</>;
}

/** Speech-like level for debug: syllable bursts at ~4 Hz. */
function fakeLevel(t: number) {
  const syll = Math.max(0, Math.sin(t * 25)) * (0.5 + 0.5 * Math.sin(t * 3.1));
  return 0.15 + 0.7 * syll * (Math.sin(t * 0.9) > -0.6 ? 1 : 0.1);
}

/** Panel column widths (px), shared by the panels and the stage geometry. */
const PANEL = { margin: 32, left: 248, right: 280 };

function OruTheme(props: DexThemeProps) {
  const {
    name,
    wakeWord,
    status,
    transcript,
    liveCaption,
    toolInvocations,
    getAmplitude,
    isMuted,
    unsupported,
    canPushToTalk,
    onPushToTalk,
    onSubmitText,
    toggleMute,
    onOpenSettings,
  } = props;

  const vp = useViewport();
  const shell = useShellView();
  const focused = useWindowFocus();
  const battery = useBattery();
  const [typing, setTyping] = useState(false);
  const debug = useDebugState();

  // ── Frame budget (DESIGN.md): 60 focused, 30 behind other apps, paused in
  //    Windows view or when hidden, reduced effects on battery.
  // Paused by the shell view only: Chromium already stops frames for a hidden
  // page, and waiting for its "visible" event would delay the first frame when
  // switching back to ORU (the switch must be instant).
  const paused = shell.active && shell.view === "windows";
  const lowPower = Boolean(battery && !battery.charging);
  useEffect(() => {
    setBudget({ fps: paused ? 0 : focused ? 60 : 30, lowPower });
  }, [paused, focused, lowPower]);

  const live = useSystemStats(!paused);

  // ── Motion: one step per frame from status + voice level.
  const state = debug ?? orbStateOf(status, isMuted);
  const ampRef = useRef(getAmplitude);
  ampRef.current = getAmplitude;
  const debugRef = useRef(debug);
  debugRef.current = debug;
  useEffect(() => setOrbState(state), [state]);

  // ── Alerts (D19): red for errors; red + blink + klaxon for critical.
  const alerts = useAlerts();
  const alertLevel = alertLevelOf(alerts, state === "error");
  useEffect(() => setAlertLevel(alertLevel), [alertLevel]);
  useAlertVoice(alerts, isMuted);
  useFrame((t, dt) => {
    const d = debugRef.current;
    const level = d === "speaking" || d === "listening" ? fakeLevel(t) : d ? 0 : ampRef.current();
    stepMotion(t, dt, level);
  });

  // A gear tick + lattice burst each time a new tool call starts.
  const toolCount = useRef(toolInvocations.length);
  useEffect(() => {
    if (toolInvocations.length > toolCount.current) fireToolTick();
    toolCount.current = toolInvocations.length;
  }, [toolInvocations.length]);

  // The summon hotkey opens the typing panel (TextComposer focuses itself).
  useEffect(() => {
    const open = () => setTyping(true);
    window.addEventListener("opendex:summon", open);
    return () => window.removeEventListener("opendex:summon", open);
  }, []);

  const submit = useCallback(
    (text: string) => {
      onSubmitText(text);
    },
    [onSubmitText],
  );

  // ── Geometry. The centre stage fits the space the panels leave free, so
  // nothing overlaps (check with oruLayoutCheck() in `pnpm preview:oru`).
  // Measured spans (oruLayoutCheck, sampled over a full turn while thinking,
  // when the segments spread): the ring reaches 0.75 orb either side;
  // lattice top 0.63 above the orb centre; platform bottom 0.64 below it.
  // The sphere itself is 0.8 of the orb box.
  // The orb is the focus (D20): it takes all the space these allow.
  const GAP = 16;
  const leftEdge = PANEL.margin + PANEL.left + GAP;
  const rightEdge = vp.w - PANEL.margin - PANEL.right - GAP;
  const stageX = Math.round((leftEdge + rightEdge) / 2);
  const stageTop = 96; // below the top bar (and the taller alert banner)
  const stageBottom = vp.h - 104; // above the typing panel and controls
  const orb = Math.max(
    160,
    Math.round(
      Math.min((rightEdge - leftEdge) / 1.52, (stageBottom - stageTop) / 1.3, vp.h * 0.62),
    ),
  );
  const ringSize = Math.round(orb * 1.3);
  const slack = stageBottom - stageTop - 1.3 * orb;
  const orbCenterY = Math.round(stageTop + 0.65 * orb + Math.max(0, slack) / 2);
  const orbCenter = useRef({ x: 0, y: 0 });
  orbCenter.current = { x: stageX, y: orbCenterY };
  const getOrbCenter = useCallback(() => orbCenter.current, []);

  const orbNode = (
    <div className="relative" style={{ width: orb, height: orb }}>
      <OrbitRings size={orb * 1.18} />
      <Orb size={orb} isMuted={state === "muted"} />
    </div>
  );

  return (
    <div
      data-dex-theme="oru"
      data-alert={alertLevel}
      className="relative flex flex-1 select-none overflow-hidden"
      style={{ minHeight: "100vh" }}
    >
      {/* Background: faint grid + vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            `linear-gradient(${mix("primary-faint", 55)} 1px, transparent 1px), linear-gradient(90deg, ${mix("primary-faint", 55)} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 52%, black 20%, transparent 75%)",
          opacity: 0.5,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 52%, ${mix("primary", 7)}, transparent 55%)` }}
      />

      <GlyphStreams orbCenter={getOrbCenter} />

      {/* Halo: the orb is the brightest thing on screen (D20). */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: stageX,
          top: orbCenterY,
          width: orb * 2,
          height: orb * 2,
          background: `radial-gradient(circle, ${mix("primary", 16)} 0%, ${mix("primary", 6)} 35%, transparent 65%)`,
          zIndex: 1,
        }}
      />

      {/* Centre stage */}
      <div
        className="pointer-events-none absolute -translate-x-1/2"
        style={{ left: stageX, top: orbCenterY + orb * 0.36, zIndex: 1 }}
      >
        <Platform width={ringSize * 0.75} />
      </div>
      <div
        className="pointer-events-none absolute -translate-x-1/2"
        style={{ left: stageX, top: orbCenterY - orb * 0.3 - ringSize * 0.26, zIndex: 1 }}
      >
        <MindLattice width={ringSize * 0.85} />
      </div>
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: stageX, top: orbCenterY, width: ringSize, height: ringSize, zIndex: 2 }}
      >
        <OponRing size={ringSize} />
        <div className="absolute inset-0 grid place-items-center" style={{ zIndex: 2 }}>
          {canPushToTalk ? (
            <button
              type="button"
              onClick={onPushToTalk}
              className="rounded-full outline-none"
              title={`Tap to talk (or press ${PTT_HINT})`}
            >
              {orbNode}
            </button>
          ) : (
            orbNode
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="absolute inset-x-0 top-0" style={{ zIndex: 5 }}>
        <TopBar
          name={name}
          state={state}
          alertSlot={alerts.length ? <AlertBanner alerts={alerts} /> : undefined}
        />
      </div>
      <div className="absolute left-8 top-[112px]" style={{ zIndex: 5 }}>
        <SystemPanel live={live} />
      </div>
      <div
        className="absolute right-8 top-[112px] flex flex-col gap-4 overflow-hidden"
        style={{ zIndex: 5, maxHeight: "calc(100vh - 210px)" }}
      >
        <TranscriptPanel turns={transcript} liveCaption={liveCaption} wakeWord={wakeWord} />
        <ActionsPanel invocations={toolInvocations} />
        {unsupported && (
          <div className="oru-panel w-[280px] text-[11px] text-[var(--oru-warn)]">
            Voice input is unavailable. Settings → Voice input → choose local Whisper, or use push-to-talk.
          </div>
        )}
      </div>

      {alertLevel === "critical" && <div className="oru-alarm-overlay" style={{ zIndex: 7 }} />}
      {debug && (
        <div className="oru-label absolute bottom-24 left-8 !text-[var(--oru-warn)]" style={{ zIndex: 6 }}>
          Debug: {debug} · <DebugFps /> fps · F8 next · Esc exit
        </div>
      )}
      <div className="absolute inset-x-0 bottom-8 flex justify-center" style={{ zIndex: 6 }}>
        <TypingPanel open={typing} onSubmit={submit} onClose={() => setTyping(false)} />
      </div>
      <div className="absolute bottom-8 right-8" style={{ zIndex: 6 }}>
        <Controls
          typing={typing}
          onType={() => setTyping((v) => !v)}
          isMuted={isMuted}
          onMute={unsupported || status === "error" ? undefined : toggleMute}
          windowsViewAvailable={shell.active}
          onWindowsView={() => window.opendex.setShellView("windows")}
          onSettings={onOpenSettings}
        />
      </div>
    </div>
  );
}

function OruPreview() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center">
      <span
        className="absolute inset-0 rounded-full border animate-dex-spin-slow"
        style={{ borderColor: "rgba(57,255,20,0.5)", borderStyle: "dashed" }}
      />
      <span className="absolute inset-[7px] rotate-[-12deg] scale-y-[0.35] rounded-full border" style={{ borderColor: "rgba(57,255,20,0.6)" }} />
      <span
        className="h-3.5 w-3.5 rounded-full"
        style={{ background: "#39ff14", boxShadow: "0 0 12px rgba(57,255,20,0.9)" }}
      />
    </span>
  );
}

/** Notch status: a small green orb that dims when idle and pulses when busy. */
function OruStatusIndicator({ status }: { status: DexStatus }) {
  const s = orbStateOf(status, false);
  const color = s === "error" ? "#ff3b3b" : s === "muted" ? "#1e8f0e" : "#39ff14";
  const busy = s === "thinking" || s === "speaking" || s === "listening";
  return (
    <span
      className={busy ? "h-2.5 w-2.5 animate-pulse rounded-full" : "h-2.5 w-2.5 rounded-full"}
      style={{ background: color, boxShadow: `0 0 ${busy ? 10 : 5}px ${color}`, opacity: s === "idle" ? 0.7 : 1 }}
    />
  );
}

const theme: DexThemeDef = {
  id: "oru",
  label: "ORU",
  description: "ORU's own interface: the orb, the opon ring, gears, the mind and live system panels.",
  order: -1,
  Component: OruTheme,
  Preview: OruPreview,
  StatusIndicator: OruStatusIndicator,
};

export default theme;
