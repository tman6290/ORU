# Phase 2: Shell

## Goal

ORU becomes the desktop. Its window fills the primary display behind Tofa's apps, the taskbar hides, and one hotkey returns him to plain Windows. Each system change has a working restore path.

## Read first

- `docs/PROGRESS.md`
- `docs/ARCHITECTURE.md`: "Shell mode (Windows)"
- `docs/DECISIONS.md` (D6)
- `AGENTS.md`: section "Window model + always-on visibility"
- In `src/main/index.ts`: main window creation, `attachAutoModeListeners`, `applyWindowMode`, the global shortcut registration, the tray menu

## Tasks

1. **Spike first (time-box it).** Build the smallest proof for each open question and show Tofa the result before the full build:
   - Keeping an Electron window at the bottom of the window stack on Windows 11 while it still takes mouse and keyboard input. Compare `SetWindowPos(HWND_BOTTOM)` through an FFI library against parenting to `WorkerW`.
   - Hiding and restoring the taskbar. Compare auto-hide through `SHAppBarMessage(ABM_SETSTATE)` against hiding `Shell_TrayWnd`.
   Record the chosen approach and the reason in `docs/DECISIONS.md`.
2. **Shell module.** Create `src/main/shell/` with a small interface: `enterOruView()`, `enterWindowsView()`, `getView()`, `restoreSystemState()`. Put the Windows implementation behind a platform check. Other platforms get a no-op.
3. **Config.** Add `shell: { enabled, launchAtLogin, hideTaskbar }` to the config schema with `enabled: true` on Windows and `launchAtLogin: false`. Add a Settings section for it.
4. **ORU view.** Frameless main window sized to the primary display's bounds, not movable, not resizable, absent from the taskbar and Alt+Tab where the platform allows, held at the bottom of the stack. App windows open above it and stay above it when Tofa clicks the ORU background.
5. **Turn off auto notch mode** while shell mode is enabled. The overlay HUD and the permission popup must keep working above other apps.
6. **Windows view.** Hide the ORU window, restore the taskbar, keep the voice session alive. Leave a tray icon and decide with Tofa whether the compact bar shows in this view.
7. **Toggle paths.** A global hotkey in the main process (propose one, confirm with Tofa), tray menu items, and an IPC channel the renderer and later skills can call. Follow the IPC convention in `AGENTS.md`.
8. **Crash safety.** Write a flag file in `userData` before changing the taskbar. Restore and clear it on quit, on `before-quit`, on uncaught exceptions, and at next launch when the flag is still set.
9. **Launch at login.** Wire `app.setLoginItemSettings` to the config value. Leave it off.

## Constraints

- Do not replace `explorer.exe`. Do not write to the registry shell key.
- Primary display only.
- Ask before adding a native module. Prefer an FFI library that ships prebuilt binaries.
- No visual design work here. The current theme stays until Phase 3.

## Acceptance checks

Tofa tests by hand:

- Launch ORU: the interface fills the screen and the taskbar is gone.
- Open File Explorer and a browser: both appear above ORU. Click the ORU background: both stay in front.
- Click an ORU button: it responds.
- Press the view hotkey: the taskbar returns and ORU hides. Press again: ORU returns.
- Quit ORU from the tray: the taskbar is back.
- Kill ORU from Task Manager while in ORU view, then relaunch: ORU restores the taskbar state on start.
- Trigger a permission prompt: it appears above everything.

## Stop and ask Tofa

- Neither bottom-of-stack approach keeps input working.
- Taskbar hiding misbehaves on his Windows build.

## Close out

Update `docs/PROGRESS.md` and `docs/DECISIONS.md`, then commit. Suggested commits: `feat(shell): desktop-level window`, `feat(shell): taskbar control with crash restore`, `feat(shell): view toggle`.
