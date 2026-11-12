import { useEffect, useState } from "react";
import type { SystemStats } from "../../../../../main/system/stats";

export interface Battery {
  level: number; // 0..1
  charging: boolean;
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

/** Network history length for the sparkline (samples, ~1.5 s apart). */
export const NET_HISTORY = 40;

export interface LiveStats {
  stats: SystemStats | null;
  /** Download bytes/s history, oldest first. */
  rxHistory: number[];
  battery: Battery | null;
}

/**
 * Poll main's system:stats every 1.5 s while `active` (paused in Windows view),
 * and read the battery from Chromium's Battery API.
 */
export function useSystemStats(active: boolean): LiveStats {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [rxHistory, setRx] = useState<number[]>([]);
  const battery = useBattery();

  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer = 0;
    const tick = async () => {
      try {
        const s = await window.opendex.getSystemStats();
        if (!alive) return;
        setStats(s);
        if (s.net) setRx((h) => [...h, s.net!.rxPerSec].slice(-NET_HISTORY));
      } catch (err) {
        console.error("[oru] system stats failed", err);
      }
      if (alive) timer = window.setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [active]);

  return { stats, rxHistory, battery };
}

export function useBattery(): Battery | null {
  const [battery, setBattery] = useState<Battery | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;
    let mgr: BatteryManagerLike | null = null;
    const update = () => mgr && setBattery({ level: mgr.level, charging: mgr.charging });
    void nav.getBattery().then((m) => {
      mgr = m;
      update();
      m.addEventListener("levelchange", update);
      m.addEventListener("chargingchange", update);
    });
    return () => {
      mgr?.removeEventListener("levelchange", update);
      mgr?.removeEventListener("chargingchange", update);
    };
  }, []);
  return battery;
}
