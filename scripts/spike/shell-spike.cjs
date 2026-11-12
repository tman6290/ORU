// Phase 2 spike (throwaway). Run with: pnpm spike:shell
//
// Compares two ways to keep a fullscreen Electron window at the bottom of the
// window stack while it still takes input, and two ways to hide the taskbar.
// Safety: Ctrl+Alt+R restores everything, Ctrl+Alt+Q restores and quits, and
// quitting by any route restores the taskbar.
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const koffi = require("koffi");

const user32 = koffi.load("user32.dll");
const shell32 = koffi.load("shell32.dll");
const kernel32 = koffi.load("kernel32.dll");

const FindWindowW = user32.func("intptr_t __stdcall FindWindowW(str16, str16)");
const FindWindowExW = user32.func(
  "intptr_t __stdcall FindWindowExW(intptr_t, intptr_t, str16, str16)",
);
const ShowWindow = user32.func("bool __stdcall ShowWindow(intptr_t, int)");
const IsWindowVisible = user32.func("bool __stdcall IsWindowVisible(intptr_t)");
const SetWindowPos = user32.func(
  "bool __stdcall SetWindowPos(intptr_t, intptr_t, int, int, int, int, uint32_t)",
);
const SetParent = user32.func("intptr_t __stdcall SetParent(intptr_t, intptr_t)");
const SendMessageTimeoutW = user32.func(
  "intptr_t __stdcall SendMessageTimeoutW(intptr_t, uint32_t, uintptr_t, intptr_t, uint32_t, uint32_t, _Out_ uintptr_t *)",
);
const EnumWindowsProc = koffi.proto("bool __stdcall EnumWindowsProc(intptr_t, intptr_t)");
const EnumWindows = user32.func(
  "bool __stdcall EnumWindows(EnumWindowsProc *, intptr_t)",
);
const GetWindow = user32.func("intptr_t __stdcall GetWindow(intptr_t, uint32_t)");
const GW_HWNDPREV = 3;

const RECT = koffi.struct("RECT", { left: "long", top: "long", right: "long", bottom: "long" });
const GetWindowRect = user32.func("bool __stdcall GetWindowRect(intptr_t, _Out_ RECT *)");
const POINT = koffi.struct("POINT", { x: "long", y: "long" });
const GetClientRect = user32.func("bool __stdcall GetClientRect(intptr_t, _Out_ RECT *)");
const ClientToScreen = user32.func("bool __stdcall ClientToScreen(intptr_t, _Inout_ POINT *)");
const dwmapi = koffi.load("dwmapi.dll");
const DwmGetWindowAttribute = dwmapi.func(
  "long __stdcall DwmGetWindowAttribute(intptr_t, uint32_t, _Out_ RECT *, uint32_t)",
);
const DwmSetWindowAttribute = dwmapi.func(
  "long __stdcall DwmSetWindowAttribute(intptr_t, uint32_t, const uint32_t *, uint32_t)",
);
const DWMWA_EXTENDED_FRAME_BOUNDS = 9;
const DWMWA_WINDOW_CORNER_PREFERENCE = 33;
const DWMWA_BORDER_COLOR = 34;
const DWMWCP_DONOTROUND = 1;
const DWMWA_COLOR_NONE = 0xfffffffe;
const APPBARDATA = koffi.struct("APPBARDATA", {
  cbSize: "uint32_t",
  hWnd: "intptr_t",
  uCallbackMessage: "uint32_t",
  uEdge: "uint32_t",
  rc: RECT,
  lParam: "intptr_t",
});
const SHAppBarMessage = shell32.func(
  "uintptr_t __stdcall SHAppBarMessage(uint32_t, _Inout_ APPBARDATA *)",
);

const HWND_BOTTOM = 1;
const SWP_NOSIZE = 0x1;
const SWP_NOMOVE = 0x2;
const SWP_NOZORDER = 0x4;
const SWP_NOACTIVATE = 0x10;
const WM_WINDOWPOSCHANGED = 0x47;
const ABM_GETSTATE = 4;
const ABM_SETSTATE = 10;
const ABS_AUTOHIDE = 1;
const ABS_ALWAYSONTOP = 2;

let win = null;
let hwnd = 0;
let stackMode = "none"; // none | bottom | worker
let originalAutoHide = null; // ABM state before we touched it
let trayHidden = false;

const log = (...a) => {
  console.log("[spike]", ...a);
  win?.webContents.send("log", a.join(" "));
};

function hwndOf(w) {
  const buf = w.getNativeWindowHandle();
  return Number(buf.readBigUInt64LE(0));
}

// Approach A: sit directly above the desktop window (Progman), below every app.
// HWND_BOTTOM itself would go *under* Progman, i.e. behind the wallpaper.
// SetWindowPos(X, after) puts X just below `after`, so we insert below the
// window that currently sits just above Progman.
let settling = false;
function pushToBottom() {
  if (stackMode !== "bottom" || settling) return;
  const progman = FindWindowW("Progman", null);
  const above = GetWindow(progman, GW_HWNDPREV);
  if (!progman || above === hwnd) return; // already in place
  settling = true;
  try {
    SetWindowPos(
      hwnd,
      above || HWND_BOTTOM,
      0, 0, 0, 0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
    );
  } finally {
    settling = false;
  }
}

function enterBottom() {
  leaveWorker();
  refit();
  stackMode = "bottom";
  pushToBottom();
  const progman = FindWindowW("Progman", null);
  log(`stack: just above desktop (in place: ${GetWindow(progman, GW_HWNDPREV) === hwnd})`);
}

// Approach B: parent to the desktop WorkerW (wallpaper-engine technique).
function findWorkerW() {
  const progman = FindWindowW("Progman", null);
  SendMessageTimeoutW(progman, 0x052c, 0xd, 0x1, 0, 1000, [0]);
  // Windows 11 24H2+: the WorkerW is a child of Progman.
  let worker = FindWindowExW(progman, 0, "WorkerW", null);
  if (worker) return worker;
  // Older builds: the WorkerW after the one holding SHELLDLL_DefView.
  const cb = koffi.register((top) => {
    const view = FindWindowExW(top, 0, "SHELLDLL_DefView", null);
    if (view) worker = FindWindowExW(0, top, "WorkerW", null);
    return true;
  }, koffi.pointer(EnumWindowsProc));
  EnumWindows(cb, 0);
  koffi.unregister(cb);
  return worker;
}

function enterWorker() {
  stackMode = "worker";
  const worker = findWorkerW();
  if (!worker) {
    log("stack: WorkerW not found");
    return;
  }
  SetParent(hwnd, worker);
  refit();
  log(`stack: parented to WorkerW ${worker}`);
}

function leaveWorker() {
  if (stackMode === "worker") {
    SetParent(hwnd, 0);
    refit();
  }
}

// Put the window back over the primary display and log where it ended up.
// Size in physical pixels with SetWindowPos: Electron's setBounds on a
// non-resizable frameless window comes out a few pixels short on Windows.
function refit() {
  const { bounds } = screen.getPrimaryDisplay();
  const px = screen.dipToScreenRect(null, bounds);
  // Square corners and no 1px outline (Windows 11 draws both on top-level windows).
  DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, [DWMWCP_DONOTROUND], 4);
  DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, [DWMWA_COLOR_NONE], 4);
  // A resizable window has an invisible border outside what you see. Measure
  // the visible rect against the full rect and grow the window to cancel it.
  SetWindowPos(hwnd, 0, px.x, px.y, px.width, px.height, SWP_NOZORDER | SWP_NOACTIVATE);
  const full = {};
  const vis = {};
  GetWindowRect(hwnd, full);
  DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, vis, koffi.sizeof(RECT));
  const l = vis.left - full.left;
  const t = vis.top - full.top;
  const r = full.right - vis.right;
  const b = full.bottom - vis.bottom;
  SetWindowPos(hwnd, 0, px.x - l, px.y - t, px.width + l + r, px.height + t + b, SWP_NOZORDER | SWP_NOACTIVATE);
  DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, vis, koffi.sizeof(RECT));
  const cr = {};
  GetClientRect(hwnd, cr);
  const o = { x: 0, y: 0 };
  ClientToScreen(hwnd, o);
  log(`client px ${o.x},${o.y} ${cr.right}x${cr.bottom}`);
  log(`visible px ${vis.left},${vis.top} ${vis.right - vis.left}x${vis.bottom - vis.top} (screen px ${px.width}x${px.height}; hidden border ${l},${t},${r},${b})`);
}

function stackNone() {
  leaveWorker();
  stackMode = "none";
  log("stack: normal window");
}

// Escape hatch: normal window, full screen, in front.
function bringBack() {
  stackNone();
  refit();
  win.show();
  win.focus();
}

function abm(msg, lParam = 0) {
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

function taskbarAutoHide() {
  restoreTaskbar();
  originalAutoHide = abm(ABM_GETSTATE);
  abm(ABM_SETSTATE, ABS_AUTOHIDE | (originalAutoHide & ABS_ALWAYSONTOP));
  log(`taskbar: auto-hide on (was state ${originalAutoHide})`);
}

function taskbarHideWindow() {
  restoreTaskbar();
  const tray = FindWindowW("Shell_TrayWnd", null);
  ShowWindow(tray, 0);
  trayHidden = true;
  log(`taskbar: Shell_TrayWnd hidden, visible=${IsWindowVisible(tray)}`);
}

function restoreTaskbar() {
  if (originalAutoHide !== null) {
    abm(ABM_SETSTATE, originalAutoHide);
    log(`taskbar: auto-hide state restored to ${originalAutoHide}`);
    originalAutoHide = null;
  }
  if (trayHidden) {
    ShowWindow(FindWindowW("Shell_TrayWnd", null), 5);
    trayHidden = false;
    log("taskbar: Shell_TrayWnd shown");
  }
}

function restoreAll() {
  restoreTaskbar();
  stackNone();
}

const PAGE = `<!doctype html><html><body style="margin:0;background:#06140c;color:#9effc4;font:16px system-ui;padding:40px">
<h1>ORU shell spike</h1>
<p>Stack: <button data-a="bottom">A: above desktop</button> <button data-a="worker">B: WorkerW</button> <button data-a="none">Normal</button></p>
<p>Taskbar: <button data-a="autohide">1: auto-hide</button> <button data-a="hidewnd">2: hide Shell_TrayWnd</button> <button data-a="restore">Restore taskbar</button></p>
<p>Input test: <button id="c">Clicked 0 times</button> <input id="t" placeholder="type here" style="width:300px"></p>
<p>Ctrl+Alt+S brings this window back. Ctrl+Alt+R restores everything. Ctrl+Alt+Q restores and quits.</p>
<pre id="log" style="color:#5fae80"></pre>
<script>
const { ipcRenderer } = require("electron");
let n = 0;
document.getElementById("c").onclick = (e) => (e.target.textContent = "Clicked " + ++n + " times");
document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => ipcRenderer.send("act", b.dataset.a)));
ipcRenderer.on("log", (_e, m) => (document.getElementById("log").textContent = m + "\\n" + document.getElementById("log").textContent));
</script></body></html>`;

app.whenReady().then(() => {
  const { bounds } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...bounds,
    frame: false,
    movable: false,
    resizable: true, // non-resizable windows get clamped short of the screen; resizing is blocked below
    maximizable: false,
    thickFrame: false, // no resize frame, so no hidden border or inner edge
    skipTaskbar: true,
    backgroundColor: "#06140c",
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  hwnd = hwndOf(win);
  win.on("will-resize", (e) => e.preventDefault());
  // After any z-order change (a click activates and raises us), drop back down.
  win.hookWindowMessage(WM_WINDOWPOSCHANGED, () => setImmediate(pushToBottom));
  win.on("focus", pushToBottom);
  win.webContents.on("render-process-gone", (_e, d) => console.error("[spike] renderer gone", d));
  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(PAGE));
  // Start straight in approach A so the first test needs no clicks.
  win.webContents.once("did-finish-load", () => enterBottom());

  ipcMain.on("act", (_e, a) => {
    try {
      if (a === "bottom") enterBottom();
      else if (a === "worker") enterWorker();
      else if (a === "none") stackNone();
      else if (a === "autohide") taskbarAutoHide();
      else if (a === "hidewnd") taskbarHideWindow();
      else if (a === "restore") restoreTaskbar();
    } catch (err) {
      log("error: " + err.message);
    }
  });

  globalShortcut.register("Control+Alt+R", restoreAll);
  globalShortcut.register("Control+Alt+S", bringBack);
  win.on("move", () => console.log("[spike] moved to", JSON.stringify(win.getBounds())));
  globalShortcut.register("Control+Alt+Q", () => app.quit());
});

app.on("will-quit", () => {
  restoreAll();
  globalShortcut.unregisterAll();
});
process.on("uncaughtException", (err) => {
  console.error(err);
  restoreTaskbar();
  process.exit(1);
});
