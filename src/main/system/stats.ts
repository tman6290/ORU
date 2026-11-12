// Live system numbers for ORU's System panel (Phase 3). Pull model: the
// renderer asks every ~1.5 s over IPC (`system:stats`), so nothing polls while
// the panel is paused (Windows view). Every value is real or null.
//
// - CPU %: delta of os.cpus() times between calls (what Task Manager shows).
// - RAM: os.totalmem / os.freemem.
// - GPU: `nvidia-smi` utilisation, temperature and VRAM, when present.
// - Network: bytes/s from `netstat -e` deltas (Windows), all adapters.
// Battery comes from the renderer (navigator.getBattery), not from here.

import { execFile } from "node:child_process";
import os from "node:os";

export interface SystemStats {
  cpu: number | null; // 0..100
  ramUsed: number; // bytes
  ramTotal: number; // bytes
  gpu: { util: number; tempC: number; vramUsed: number; vramTotal: number; name: string } | null;
  net: { rxPerSec: number; txPerSec: number } | null; // bytes/s
}

function run(cmd: string, args: string[], timeoutMs = 1500): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) =>
      resolve(err ? null : stdout),
    );
  });
}

// ── CPU ────────────────────────────────────────────────────────────────────
let lastCpu: { idle: number; total: number } | null = null;
function sampleCpu(): number | null {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  const prev = lastCpu;
  lastCpu = { idle, total };
  if (!prev || total === prev.total) return null;
  return Math.max(0, Math.min(100, 100 * (1 - (idle - prev.idle) / (total - prev.total))));
}

// ── GPU (NVIDIA) ───────────────────────────────────────────────────────────
let gpuMissing = false;
async function sampleGpu(): Promise<SystemStats["gpu"]> {
  if (gpuMissing) return null;
  const out = await run("nvidia-smi", [
    "--query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,name",
    "--format=csv,noheader,nounits",
  ]);
  if (!out) {
    gpuMissing = true; // not installed: stop spawning it
    return null;
  }
  const [util, temp, used, total, ...name] = out.split("\n")[0].split(",").map((s) => s.trim());
  const MiB = 1024 * 1024;
  return {
    util: Number(util),
    tempC: Number(temp),
    vramUsed: Number(used) * MiB,
    vramTotal: Number(total) * MiB,
    name: name.join(",").replace(/^NVIDIA\s+/i, ""),
  };
}

// ── Network (Windows: netstat -e) ──────────────────────────────────────────
let lastNet: { rx: number; tx: number; at: number } | null = null;
async function sampleNet(): Promise<SystemStats["net"]> {
  if (process.platform !== "win32") return null;
  const out = await run("netstat", ["-e"]);
  if (!out) return null;
  // "Bytes   <received>   <sent>" (labels are localised; take the first row of two big numbers)
  const row = out
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/))
    .find((cols) => cols.length >= 3 && /^\d+$/.test(cols.at(-1)!) && /^\d+$/.test(cols.at(-2)!));
  if (!row) return null;
  const rx = Number(row.at(-2));
  const tx = Number(row.at(-1));
  const at = Date.now();
  const prev = lastNet;
  lastNet = { rx, tx, at };
  if (!prev || at === prev.at) return null;
  const secs = (at - prev.at) / 1000;
  return {
    rxPerSec: Math.max(0, (rx - prev.rx) / secs),
    txPerSec: Math.max(0, (tx - prev.tx) / secs),
  };
}

// Overlapping calls (two windows asking at once) share one sample.
let inFlight: Promise<SystemStats> | null = null;

export function getSystemStats(): Promise<SystemStats> {
  inFlight ??= (async () => {
    const [gpu, net] = await Promise.all([sampleGpu(), sampleNet()]);
    return {
      cpu: sampleCpu(),
      ramUsed: os.totalmem() - os.freemem(),
      ramTotal: os.totalmem(),
      gpu,
      net,
    };
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
