// Shell mode: ORU as the Windows desktop (D6, D13, D14).
//
// Two views:
// - "oru": the main window covers the primary display, sits just above the
//   desktop window (below every app) and the taskbar auto-hides.
// - "windows": the main window hides (the voice session keeps running in it)
//   and the taskbar returns to how Tofa had it.
//
// Every taskbar change is preceded by a flag file in userData that records the
// original taskbar state. A clean exit restores it and deletes the file; if the
// file is still there at launch, the last run crashed and we restore first.
// Other platforms get a no-op.

import { app, screen, type BrowserWindow } from "electron";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "../config/store";
import * as w32 from "./win32";

export type ShellView = "oru" | "windows";

const WM_WINDOWPOSCHANGED = 0x47;

interface ShellHooks {
  getMainWindow: () => BrowserWindow | null;
  /** Fired after the view changes (tray relabel, renderer broadcast). */
  onViewChanged: (view: ShellView) => void;
}

interface SavedState {
  /** Taskbar ABS_* bits before ORU touched them. */
  taskbarState: number;
}

let hooks: ShellHooks | null = null;
let view: ShellView = "windows";
let attachedHwnd = 0;

const flagPath = () => join(app.getPath("userData"), "shell-state.json");

/** Shell mode runs only on Windows, when enabled in config. */
export function isShellActive(): boolean {
  return process.platform === "win32" && getConfig().shell.enabled;
}

export function initShell(h: ShellHooks): void {
  hooks = h;
}

export function getView(): ShellView {
  return view;
}

/**
 * At launch: a leftover flag file means the last run ended without restoring
 * (crash, Task Manager kill, power loss). Put the taskbar back first.
 */
export function recoverFromCrash(): void {
  if (process.platform !== "win32" || !existsSync(flagPath())) return;
  try {
    const saved = JSON.parse(readFileSync(flagPath(), "utf8")) as SavedState;
    w32.setTaskbarState(saved.taskbarState);
    console.log("[oru] shell: restored taskbar after an unclean exit");
  } catch (err) {
    console.error("[oru] shell: crash restore failed", err);
  }
  clearFlag();
}

function clearFlag(): void {
  try {
    rmSync(flagPath(), { force: true });
  } catch (err) {
    console.error("[oru] shell: could not delete flag file", err);
  }
}

function hideTaskbar(): void {
  if (existsSync(flagPath())) return; // already hidden by us; keep the original state
  const original = w32.getTaskbarState();
  if (original & w32.TASKBAR_AUTOHIDE) return; // Tofa already auto-hides it
  // Flag first, so a crash between these two lines still restores.
  writeFileSync(flagPath(), JSON.stringify({ taskbarState: original } satisfies SavedState));
  w32.setTaskbarState(original | w32.TASKBAR_AUTOHIDE);
}

/** Put the taskbar back as ORU found it. Safe to call any number of times. */
export function restoreSystemState(): void {
  if (process.platform !== "win32" || !existsSync(flagPath())) return;
  try {
    const saved = JSON.parse(readFileSync(flagPath(), "utf8")) as SavedState;
    w32.setTaskbarState(saved.taskbarState);
  } catch (err) {
    console.error("[oru] shell: restore failed", err);
  }
  clearFlag();
}

/** Window options for the main window when shell mode is on (see D13). */
export function shellWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const { bounds } = screen.getPrimaryDisplay();
  return {
    ...bounds,
    frame: false,
    // Any resize frame leaves a 2-11 px gap at the edges; resizable:false gets
    // clamped short of the screen. So: resizable with no frame, resize blocked.
    thickFrame: false,
    resizable: true,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    movable: false,
    skipTaskbar: true,
  };
}

function fitToPrimaryDisplay(): void {
  if (!attachedHwnd) return;
  const { bounds } = screen.getPrimaryDisplay();
  w32.coverRect(attachedHwnd, screen.dipToScreenRect(null, bounds));
}

function settle(): void {
  if (view !== "oru" || !attachedHwnd) return;
  if (!w32.isAboveDesktop(attachedHwnd)) w32.placeAboveDesktop(attachedHwnd);
}

/** Wire the main window for shell mode. Call once after creating it. */
export function attachShellWindow(win: BrowserWindow): void {
  if (!isShellActive()) return;
  attachedHwnd = w32.hwndOf(win);
  w32.hideFromAltTab(attachedHwnd);
  win.on("will-resize", (e) => e.preventDefault());
  // A click raises the window; drop it straight back above the desktop.
  win.hookWindowMessage(WM_WINDOWPOSCHANGED, () => setImmediate(settle));
  win.on("focus", settle);
  const refit = () => {
    if (!win.isDestroyed()) fitToPrimaryDisplay();
  };
  screen.on("display-metrics-changed", refit);
  screen.on("display-added", refit);
  screen.on("display-removed", refit);
  win.on("closed", () => {
    screen.off("display-metrics-changed", refit);
    screen.off("display-added", refit);
    screen.off("display-removed", refit);
    attachedHwnd = 0;
  });
}

export function enterOruView(): void {
  if (!isShellActive()) return;
  const win = hooks?.getMainWindow();
  if (!win || win.isDestroyed()) return;
  view = "oru";
  if (getConfig().shell.hideTaskbar) hideTaskbar();
  else restoreSystemState();
  fitToPrimaryDisplay();
  win.show();
  win.focus();
  settle();
  hooks?.onViewChanged(view);
}

export function enterWindowsView(): void {
  if (!isShellActive()) return;
  view = "windows";
  restoreSystemState();
  // Hide, never destroy: the voice session lives in this window.
  hooks?.getMainWindow()?.hide();
  hooks?.onViewChanged(view);
}

export function toggleView(): void {
  if (view === "oru") enterWindowsView();
  else enterOruView();
}

/** Apply the launch-at-login setting (D6; off by default). */
export function applyLoginItem(): void {
  if (process.platform !== "win32" && process.platform !== "darwin") return;
  const openAtLogin = getConfig().shell.launchAtLogin;
  if (app.getLoginItemSettings().openAtLogin !== openAtLogin) {
    app.setLoginItemSettings({ openAtLogin });
  }
}
