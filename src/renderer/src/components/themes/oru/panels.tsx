import { useEffect, useRef, useState } from "react";
import { AppWindow, Keyboard, Mic, MicOff, Settings } from "lucide-react";
import type { TranscriptTurn } from "@/lib/dex/state";
import type { ToolInvocation } from "@skills/tool-view";
import { getToolView } from "@skills/tool-registry";
import { ToolCardLayer } from "@skills/tool-card-layer";
import { TextComposer } from "../shared/text-composer";
import { OduGlyph, oduFromString } from "./odu";
import type { OrbState } from "./motion";
import { NET_HISTORY, type LiveStats } from "./use-system-stats";
import { mix } from "./palette";

// Every panel shows real data and has one job you can explain (D16):
//   Top bar     who is running, what ORU is doing right now, the time
//   System      how hard the laptop is working (CPU, GPU, memory, network, power)
//   Transcript  what was said, newest at the bottom
//   Actions     what ORU did on the machine, one row per tool call
//   Controls    type, mute, switch to Windows, settings

const GB = 1024 ** 3;

function fmtRate(bps: number) {
  if (bps >= 1024 ** 2) return `${(bps / 1024 ** 2).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
}

// ── Top bar ────────────────────────────────────────────────────────────────

const STATUS_WORD: Record<OrbState, string> = {
  idle: "Standing by",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  muted: "Muted",
  error: "Error",
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function TopBar({
  name,
  state,
  alertSlot,
}: {
  name: string;
  state: OrbState;
  /** Shown in place of the status pill while an alert is active. */
  alertSlot?: React.ReactNode;
}) {
  const now = useClock();
  const tone =
    state === "muted" ? "var(--oru-text-muted)" : "var(--oru-primary)";
  return (
    <div className="pointer-events-none flex items-start justify-between px-8 pt-6">
      <div data-oru="brand" className="flex items-center gap-3" title="ORU">
        <div
          className="grid h-10 w-10 place-items-center"
          style={{
            color: "var(--oru-primary)",
            border: `1px solid ${mix("primary", 45)}`,
            transform: "rotate(45deg)",
            boxShadow: `0 0 12px ${mix("primary", 20)}`,
          }}
        >
          <div style={{ transform: "rotate(-45deg)" }}>
            <OduGlyph byte={0x00} size={18} />
          </div>
        </div>
        <div
          style={{ fontFamily: "var(--oru-font-display)", letterSpacing: "0.35em" }}
          className="text-xl font-semibold text-[var(--oru-text)]"
        >
          {(name || "ORU").toUpperCase()}
        </div>
      </div>

      {alertSlot ?? (
        <div data-oru="status" className="oru-panel flex items-center gap-3 !px-6 !py-2" title="What ORU is doing right now">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
          />
          <span className="oru-label" style={{ color: tone }}>
            {STATUS_WORD[state]}
          </span>
        </div>
      )}

      <div data-oru="clock" className="text-right" title="Local time">
        <div className="oru-value text-2xl" style={{ fontFamily: "var(--oru-font-display)" }}>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <div className="oru-label">
          {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ── System panel ───────────────────────────────────────────────────────────

function Gauge({ label, value, sub, title }: { label: string; value: number | null; sub?: string; title: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = value == null ? 0 : Math.max(0, Math.min(1, value / 100));
  // 270° gauge with the gap at the bottom.
  const sweep = 0.75;
  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      <svg viewBox="0 0 64 64" className="h-[72px] w-[72px]">
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="var(--oru-primary-faint)" strokeWidth="4"
          strokeDasharray={`${c * sweep} ${c}`} transform="rotate(135 32 32)" strokeLinecap="round"
        />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="var(--oru-primary)" strokeWidth="4"
          strokeDasharray={`${c * sweep * frac} ${c}`} transform="rotate(135 32 32)" strokeLinecap="round"
          style={{ transition: "stroke-dasharray 600ms ease", filter: "drop-shadow(0 0 3px var(--oru-glow))" }}
        />
        <text x="32" y="36" textAnchor="middle" className="oru-value" fill="var(--oru-text)" fontSize="13">
          {value == null ? "--" : `${Math.round(value)}%`}
        </text>
      </svg>
      <div className="oru-label !text-[10px]">{label}</div>
      {sub && <div className="oru-value text-[10px] text-[var(--oru-text-muted)]">{sub}</div>}
    </div>
  );
}

function Bar({ label, used, total, title }: { label: string; used: number; total: number; title: string }) {
  const frac = total ? used / total : 0;
  return (
    <div title={title}>
      <div className="mb-1 flex justify-between">
        <span className="oru-label !text-[10px]">{label}</span>
        <span className="oru-value text-[11px]">
          {(used / GB).toFixed(1)} / {(total / GB).toFixed(0)} GB · {Math.round(frac * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-[var(--oru-primary-faint)]">
        <div
          className="h-full bg-[var(--oru-primary)]"
          style={{ width: `${frac * 100}%`, transition: "width 600ms ease", boxShadow: "0 0 6px var(--oru-glow)" }}
        />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 200;
  const h = 34;
  const max = Math.max(64 * 1024, ...values);
  const pts = values
    .map((v, i) => `${((i + NET_HISTORY - values.length) / (NET_HISTORY - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[34px] w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--oru-primary)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function SystemPanel({ live }: { live: LiveStats }) {
  const { stats, rxHistory, battery } = live;
  const gpu = stats?.gpu;
  return (
    <div data-oru="system" className="oru-panel w-[300px]">
      <div className="oru-panel-title">
        <span className="oru-label">System</span>
      </div>
      <div className="mb-3 flex justify-around">
        <Gauge label="CPU" value={stats?.cpu ?? null} title="Processor load across all cores" />
        <Gauge
          label="GPU"
          value={gpu ? gpu.util : null}
          sub={gpu ? `${gpu.tempC}°C` : "n/a"}
          title={gpu ? `${gpu.name}: load and temperature` : "No NVIDIA GPU found"}
        />
      </div>
      <div className="flex flex-col gap-3">
        {stats && <Bar label="Memory" used={stats.ramUsed} total={stats.ramTotal} title="RAM in use" />}
        {gpu && <Bar label="VRAM" used={gpu.vramUsed} total={gpu.vramTotal} title="Graphics memory in use (local AI models live here)" />}
        <div title="Network traffic, all adapters">
          <div className="mb-1 flex justify-between">
            <span className="oru-label !text-[10px]">Network</span>
            <span className="oru-value text-[11px]">
              {stats?.net ? `↓ ${fmtRate(stats.net.rxPerSec)}  ↑ ${fmtRate(stats.net.txPerSec)}` : "--"}
            </span>
          </div>
          <Sparkline values={rxHistory} />
        </div>
        {battery && (
          <div className="flex justify-between" title="Battery">
            <span className="oru-label !text-[10px]">Power</span>
            <span className="oru-value text-[11px]">
              {Math.round(battery.level * 100)}% · {battery.charging ? "charging" : "on battery"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Transcript ─────────────────────────────────────────────────────────────

export function TranscriptPanel({
  turns,
  liveCaption,
  wakeWord,
}: {
  turns: TranscriptTurn[];
  liveCaption: string;
  wakeWord: string;
}) {
  const recent = turns.slice(-6);
  return (
    <div data-oru="transcript" className="oru-panel flex min-h-0 w-[340px] flex-col">
      <div className="oru-panel-title">
        <span className="oru-label">Transcript</span>
      </div>
      <div className="oru-fade-top flex min-h-[120px] flex-1 flex-col justify-end gap-2 overflow-hidden text-[12.5px] leading-relaxed">
        {recent.length === 0 && !liveCaption ? (
          <div className="text-[var(--oru-text-muted)]">Say “{wakeWord}” or press Type.</div>
        ) : (
          <>
            {recent.map((t) => (
              <div key={t.id} className="flex gap-2">
                <span className="oru-label !text-[10px] shrink-0 pt-0.5" style={{ color: t.role === "user" ? "var(--oru-text-muted)" : "var(--oru-primary)" }}>
                  {t.role === "user" ? "You" : "ORU"}
                </span>
                <span style={{ color: t.role === "user" ? "var(--oru-text)" : mix("text", 82) }}>
                  {t.content || "…"}
                </span>
              </div>
            ))}
            {liveCaption && (
              <div className="flex gap-2 italic text-[var(--oru-text-muted)]">
                <span className="oru-label !text-[10px] shrink-0 pt-0.5">You</span>
                <span>{liveCaption}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Actions ────────────────────────────────────────────────────────────────

export function ActionsPanel({ invocations }: { invocations: ToolInvocation[] }) {
  const recent = invocations.slice(-5);
  return (
    <div data-oru="actions" className="oru-panel w-[340px]">
      <div className="oru-panel-title">
        <span className="oru-label">Actions</span>
      </div>
      {recent.length === 0 ? (
        <div className="text-[12px] text-[var(--oru-text-muted)]">Nothing yet this session.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((inv) => {
            const { label } = getToolView(inv.name).label(inv.input);
            const color =
              inv.status === "error" ? "var(--oru-danger)" : inv.status === "running" ? "var(--oru-warn)" : "var(--oru-primary)";
            return (
              <div key={inv.id} className="oru-card-in flex items-center gap-3 text-[12px]" title={inv.name}>
                <span style={{ color: "var(--oru-primary-dim)" }}>
                  <OduGlyph byte={oduFromString(inv.id)} size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="oru-label !text-[9px]" style={{ color }}>
                  {inv.status === "running" ? "Running" : inv.status === "error" ? "Failed" : "Done"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {/* The latest result card (weather, search results, ...), when the tool has one. */}
      <ToolCardLayer invocations={invocations} surface="main" className="mt-3" />
    </div>
  );
}

// ── Controls + typing panel ────────────────────────────────────────────────

export function Controls({
  typing,
  onType,
  isMuted,
  onMute,
  onWindowsView,
  windowsViewAvailable,
  onSettings,
}: {
  typing: boolean;
  onType: () => void;
  isMuted: boolean;
  onMute?: () => void;
  onWindowsView: () => void;
  windowsViewAvailable: boolean;
  onSettings: () => void;
}) {
  return (
    <div data-oru="controls" className="flex gap-2">
      <button type="button" className="oru-control" data-on={typing} onClick={onType} title="Type a message">
        <Keyboard className="size-[18px]" />
      </button>
      {onMute && (
        <button type="button" className="oru-control" data-on={isMuted} onClick={onMute} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
        </button>
      )}
      {windowsViewAvailable && (
        <button type="button" className="oru-control" onClick={onWindowsView} title="Switch to Windows view (Ctrl+Alt+W)">
          <AppWindow className="size-[18px]" />
        </button>
      )}
      <button type="button" className="oru-control" onClick={onSettings} title="Settings">
        <Settings className="size-[18px]" />
      </button>
    </div>
  );
}

export function TypingPanel({
  open,
  onSubmit,
  onClose,
}: {
  open: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus the field each time the panel opens.
  useEffect(() => {
    const input = ref.current?.querySelector("input");
    if (open) input?.focus();
    else input?.blur();
  }, [open]);
  return (
    <div ref={ref} data-oru="typing" className="oru-typing w-[min(640px,60vw)]" data-open={open} inert={!open}>
      {/* Always mounted so it can slide; inert while closed. */}
      <TextComposer
        onSubmit={onSubmit}
        onClose={onClose}
        className="!max-w-none border-[color-mix(in_srgb,var(--oru-primary)_35%,transparent)] !bg-[color-mix(in_srgb,var(--oru-well)_90%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,var(--oru-primary)_12%,transparent)]"
      />
    </div>
  );
}
