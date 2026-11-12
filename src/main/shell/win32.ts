// Win32 calls for shell mode, through koffi (D15). Loaded lazily and only on
// Windows; nothing here runs on other platforms.
//
// Approaches were picked by a spike on Tofa's machine (D13, D14):
// - ORU's window sits directly above the desktop window (Progman), below every
//   app. HWND_BOTTOM would put it under the desktop, i.e. invisible.
// - The taskbar hides through auto-hide (SHAppBarMessage), not by hiding
//   Shell_TrayWnd, which left an empty strip and blocked the Windows key.

import type { BrowserWindow, Rectangle } from "electron";
import koffi from "koffi";

const HWND_BOTTOM = 1;
const SWP_NOSIZE = 0x1;
const SWP_NOMOVE = 0x2;
const SWP_NOZORDER = 0x4;
const SWP_NOACTIVATE = 0x10;
const GW_HWNDPREV = 3;
const GWL_EXSTYLE = -20;
const WS_EX_TOOLWINDOW = 0x80;
const WS_EX_APPWINDOW = 0x40000;
const ABM_GETSTATE = 4;
const ABM_SETSTATE = 10;
const DWMWA_TRANSITIONS_FORCEDISABLED = 3;
const DWMWA_EXTENDED_FRAME_BOUNDS = 9;
const DWMWA_WINDOW_CORNER_PREFERENCE = 33;
const DWMWA_BORDER_COLOR = 34;
const DWMWCP_DONOTROUND = 1;
const DWMWA_COLOR_NONE = 0xfffffffe;

/** Auto-hide bit of the taskbar state (ABS_AUTOHIDE). */
export const TASKBAR_AUTOHIDE = 0x1;
/** Always-on-top bit of the taskbar state (ABS_ALWAYSONTOP). */
export const TASKBAR_ALWAYSONTOP = 0x2;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function bind() {
  const user32 = koffi.load("user32.dll");
  const shell32 = koffi.load("shell32.dll");
  const dwmapi = koffi.load("dwmapi.dll");
  const RECT = koffi.struct("ORU_RECT", {
    left: "long",
    top: "long",
    right: "long",
    bottom: "long",
  });
  const APPBARDATA = koffi.struct("ORU_APPBARDATA", {
    cbSize: "uint32_t",
    hWnd: "intptr_t",
    uCallbackMessage: "uint32_t",
    uEdge: "uint32_t",
    rc: RECT,
    lParam: "intptr_t",
  });
  return {
    RECT,
    APPBARDATA,
    FindWindowW: user32.func("intptr_t __stdcall FindWindowW(str16, str16)"),
    GetWindow: user32.func("intptr_t __stdcall GetWindow(intptr_t, uint32_t)"),
    SetWindowPos: user32.func(
      "bool __stdcall SetWindowPos(intptr_t, intptr_t, int, int, int, int, uint32_t)",
    ),
    GetWindowRect: user32.func("bool __stdcall GetWindowRect(intptr_t, _Out_ ORU_RECT *)"),
    GetWindowLongPtrW: user32.func("intptr_t __stdcall GetWindowLongPtrW(intptr_t, int)"),
    SetWindowLongPtrW: user32.func(
      "intptr_t __stdcall SetWindowLongPtrW(intptr_t, int, intptr_t)",
    ),
    SHAppBarMessage: shell32.func(
      "uintptr_t __stdcall SHAppBarMessage(uint32_t, _Inout_ ORU_APPBARDATA *)",
    ),
    DwmGetWindowAttribute: dwmapi.func(
      "long __stdcall DwmGetWindowAttribute(intptr_t, uint32_t, _Out_ ORU_RECT *, uint32_t)",
    ),
    DwmSetWindowAttribute: dwmapi.func(
      "long __stdcall DwmSetWindowAttribute(intptr_t, uint32_t, const uint32_t *, uint32_t)",
    ),
  };
}

let api: ReturnType<typeof bind> | null = null;
function w32() {
  if (process.platform !== "win32") throw new Error("shell/win32 is Windows-only");
  api ??= bind();
  return api;
}

export function hwndOf(win: BrowserWindow): number {
  return Number(win.getNativeWindowHandle().readBigUInt64LE(0));
}

/** True when `hwnd` already sits directly above the desktop window. */
export function isAboveDesktop(hwnd: number): boolean {
  const { FindWindowW, GetWindow } = w32();
  const progman = Number(FindWindowW("Progman", null));
  return !progman || Number(GetWindow(progman, GW_HWNDPREV)) === hwnd;
}

/** Move `hwnd` to directly above the desktop window: below every app. */
export function placeAboveDesktop(hwnd: number): void {
  const { FindWindowW, GetWindow, SetWindowPos } = w32();
  const progman = Number(FindWindowW("Progman", null));
  if (!progman) return;
  const above = Number(GetWindow(progman, GW_HWNDPREV));
  if (above === hwnd) return;
  // SetWindowPos(X, after) puts X just below `after`.
  SetWindowPos(
    hwnd,
    above || HWND_BOTTOM,
    0,
    0,
    0,
    0,
    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
  );
}

/**
 * Cover `px` (physical pixels) exactly: square corners, no outline, and any
 * hidden frame cancelled out by measuring the visible rect.
 */
export function coverRect(hwnd: number, px: Rectangle): void {
  const { RECT, SetWindowPos, GetWindowRect, DwmGetWindowAttribute, DwmSetWindowAttribute } =
    w32();
  DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, [DWMWCP_DONOTROUND], 4);
  DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, [DWMWA_COLOR_NONE], 4);
  const flags = SWP_NOZORDER | SWP_NOACTIVATE;
  SetWindowPos(hwnd, 0, px.x, px.y, px.width, px.height, flags);
  const full: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  const vis: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  GetWindowRect(hwnd, full);
  if (DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, vis, koffi.sizeof(RECT)) !== 0) {
    return;
  }
  const l = vis.left - full.left;
  const t = vis.top - full.top;
  const r = full.right - vis.right;
  const b = full.bottom - vis.bottom;
  if (l || t || r || b) {
    SetWindowPos(hwnd, 0, px.x - l, px.y - t, px.width + l + r, px.height + t + b, flags);
  }
}

/** Turn off Windows' show/hide animation for this window, so switching
 *  between ORU and Windows view is instant. */
export function disableTransitions(hwnd: number): void {
  w32().DwmSetWindowAttribute(hwnd, DWMWA_TRANSITIONS_FORCEDISABLED, [1], 4);
}

/** Keep the window out of Alt+Tab (tool window) while it stays focusable. */
export function hideFromAltTab(hwnd: number): void {
  const { GetWindowLongPtrW, SetWindowLongPtrW } = w32();
  const ex = Number(GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
  SetWindowLongPtrW(hwnd, GWL_EXSTYLE, (ex | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW);
}

function appBar(msg: number, lParam = 0): number {
  const { APPBARDATA, FindWindowW, SHAppBarMessage } = w32();
  const data = {
    cbSize: koffi.sizeof(APPBARDATA),
    hWnd: FindWindowW("Shell_TrayWnd", null),
    uCallbackMessage: 0,
    uEdge: 0,
    rc: { left: 0, top: 0, right: 0, bottom: 0 },
    lParam,
  };
  return Number(SHAppBarMessage(msg, data));
}

/** The taskbar's ABS_* state bits. */
export function getTaskbarState(): number {
  return appBar(ABM_GETSTATE);
}

export function setTaskbarState(state: number): void {
  appBar(ABM_SETSTATE, state);
}
