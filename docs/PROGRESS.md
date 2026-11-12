# Progress

Claude Code: read this file at the start of each session and update it at the end.

## Current state

- Phase in progress: 3 (design pass). Phases 1 and 2 done.
- App runs on Tofa's machine: yes (pnpm dev opens a window titled ORU; onboarding runs)
- Last session: 2026-11-12, Phase 2

## Phases

- [x] 1. Baseline: run the fork on Windows, remove analytics and auto-update, rebrand to ORU
- [x] 2. Shell: fullscreen desktop layer, hidden taskbar, Windows view toggle, safe restore
- [ ] 3. Face: the ORU theme (orb, mind and gear visuals, Odù glyphs, live system panels)
- [ ] 4. Voice out: local neural voice, real audio driving the orb, spoken greeting
- [ ] 5. Voice in: push-to-talk, local Whisper on GPU, "Hey Oru" wake word
- [ ] 6. Brain: Ollama provider, model choice for this GPU, ORU persona
- [ ] 7. Skills: apps, workspaces, windows, system, typing panel, view switching, instant commands
- [ ] 8. Claude handoff: deep links, Claude Desktop connector setup guide, calls and email drafts
- [ ] 9. Memory: local store for facts, preferences and conversation summaries
- [ ] 10. Polish and ship: boot sequence, sound, power modes, launch at login, installer, README

## Session log

Add one entry per session, newest first.

### 2026-11-12, Phase 2
Done:
- Spike (`pnpm spike:shell`, kept in `scripts/spike/`) run by Tofa. Window stacking: placing ORU directly above `Progman` works (apps stay in front, clicks and typing reach ORU, no flicker). `HWND_BOTTOM` hid it under the desktop; `WorkerW` lost the window off-screen. Taskbar: auto-hide works and slides back at the bottom edge; hiding `Shell_TrayWnd` left an empty strip and the Windows key could not bring it back.
- Full-screen sizing needed three fixes, each confirmed on Tofa's screen: `resizable: false` clamped the window short, a resize frame left 11 px hidden and 2 px visible gaps, Windows 11 rounded the corners. Now: `thickFrame: false`, sized in physical pixels, square corners, no outline. Measured 2560x1600 at 0,0.
- `src/main/shell/`: `enterOruView`, `enterWindowsView`, `getView`, `toggleView`, `restoreSystemState`, `recoverFromCrash`, `applyLoginItem`; Win32 calls in `win32.ts` through koffi. No-op off Windows.
- Config `shell: { enabled, launchAtLogin, hideTaskbar }` (enabled on Windows, login off, hide on). Settings → Desktop.
- Taskbar flag file `userData/shell-state.json` written before auto-hide is turned on. Restored on before-quit, will-quit, process exit, uncaught exceptions (which also switch to Windows view), and at next launch if the file is still there.
- View toggle: Ctrl+Alt+W (fallback Ctrl+Alt+D), tray menu item, tray click, IPC `shell:set-view` / `shell:get-view` / `shell:view` event (preload `setShellView`, `getShellView`, `onShellView`).
- Auto notch mode is off in shell mode. Closing the ORU window (Alt+F4) goes to Windows view. ORU is hidden from Alt+Tab and the taskbar.
- koffi added to `asarUnpack` for the Phase 10 installer.
Not done:
- Nothing. Tofa ran the manual tests below on 2026-11-12 and all passed (test 8 waits for a model, Phase 6).
- Windows view shows only the tray icon, no compact bar (the default proposed in the plan; Tofa did not ask for the bar).
Decisions: D13 (window above desktop), D14 (taskbar auto-hide), D15 (koffi).
Manual tests for Tofa:
1. `pnpm dev`: ORU fills the whole screen with no gaps and the taskbar is gone.
2. Open File Explorer and a browser: both appear above ORU. Click the ORU background: both stay in front.
3. Click an ORU button: it responds.
4. Press Ctrl+Alt+W: the taskbar returns and ORU hides. Press again: ORU returns and the taskbar hides.
5. Right-click the tray icon: "Switch to Windows view (Ctrl+Alt+W)" works, then "Switch to ORU view".
6. Quit ORU from the tray: the taskbar is back.
7. Kill ORU in Task Manager (end the "Electron" task) while in ORU view: the taskbar stays hidden. Run `pnpm dev` again: the taskbar comes back as ORU starts, and hides again once the ORU view shows. Quit from the tray: taskbar back.
8. Trigger a permission prompt (ask ORU to open an app once a model exists, Phase 6; until then skip): it appears above everything.
9. Press Win+D and Alt+Tab while in ORU view. Tell me what happens (ORU should not show in Alt+Tab).
10. Settings → Desktop: turn "Hide the taskbar" off while in ORU view: the taskbar returns at once.
Next step: Tofa runs the tests; then Phase 3 (`prompts/03-face.md`).

### 2026-11-11, Phase 1
Done:
- pnpm 10.8.1 installed globally with npm (corepack enable needed admin). `pnpm install`, `typecheck` and `build` pass on Windows with no fixes needed.
- Removed analytics (module, call sites, config block, Settings/onboarding toggle). PRIVACY.md rewritten.
- Removed auto-update (electron-updater, update banner and IPC channel, `publish` set to null, release scripts). electron-log removed too: only the updater used it.
- Rebranded: productName ORU, appId `tech.wolban.oru`, package name `oru`, titles, tray, onboarding and permission copy, assistant name ORU and wake word `oru`.
- Windows hotkeys (D11): interrupt Ctrl+Alt+Backspace, summon Ctrl+Alt+Space (fallback Ctrl+Alt+O), push-to-talk unchanged. UI hints read from `renderer/src/lib/hotkeys.ts`.
- Trimmed site/, RELEASING.md, screenshots/, assets/download/, release/pages/pr-review workflows, release-note and PR-review scripts. Kept CONTRIBUTING.md (AGENTS.md links to it for themes and skills) and ci.yml.
- New README.
- After Tofa's first launch: onboarding's Language model step blocked on Windows without a cloud key. Added "Set up later" (skip until Phase 6), hid the OpenDex subscription card, and made a missing gateway key say "no language model is set up yet".
Not done:
- Nothing. Tofa ran the manual tests below on 2026-11-11 and all passed. The interrupt hotkey could only be checked for "no Start menu" until a model exists (Phase 6).
Decisions: D11 (Windows hotkeys), D12 (package identity).
Manual tests for Tofa:
1. `pnpm dev`: the window is titled ORU; onboarding finishes with no analytics step; Settings → Privacy shows "ORU sends no usage data".
2. Push-to-talk: switch Voice input to push-to-talk, press Ctrl+Shift+Space. It should start listening.
3. While a command runs, press Ctrl+Alt+Backspace. The command stops and the Start menu does not open.
4. Press Ctrl+Alt+Space from another app. ORU shows and hides, and no window menu appears.
5. Tray icon tooltip and menu read "ORU", "Show ORU", "Quit ORU".
Next step: Phase 2 (`prompts/02-shell.md`).

```
### YYYY-MM-DD, Phase N
Done:
Not done:
Decisions: (also add to DECISIONS.md)
Manual tests for Tofa:
Next step:
```

## Open questions for Tofa

- Windows view shows only the tray icon. Should the compact bar stay visible there as a "listening" indicator?
- In ORU view, the summon hotkey (Ctrl+Alt+Space) focuses ORU's type field but does not raise ORU above open apps. Phase 7's typing panel may be the better home for typing from anywhere.

- The default wake word is now `oru`. The Vosk English model may not know that word, so wake detection could miss it. Check in Phase 5.

## Known issues

- A hard kill leaves the taskbar on auto-hide until ORU next starts (it slides up at the bottom edge meanwhile). Fix by hand: Settings → Personalization → Taskbar → Taskbar behaviors → untick "Automatically hide the taskbar".
- `shell.enabled` changes the window frame, so it only takes effect on restart.

- Phase 6: replace onboarding's "Set up later" skip with the Ollama provider and fix the step subtitle ("free on-device" is macOS-only today).
- AGENTS.md is stale in two places: the Summon hotkey bullet (Phase 7 section) still says Alt+Space with a Control+Shift+Space fallback, and there is no longer an update banner or analytics. D11 is the current behaviour.
- `pnpm install` skipped build scripts for electron-winstaller, esbuild, onnxruntime-node and protobufjs (pnpm 10 default). Build and typecheck pass anyway; revisit with `pnpm approve-builds` if packaging or local Whisper fails.
- Saved configs from an earlier run keep `hotkeys.summon = Alt+Space`. On Windows the registrar skips it and uses Ctrl+Alt+Space.

## Measurements

Record numbers here as phases produce them.

| Metric | Target | Measured |
| --- | --- | --- |
| VRAM total (nvidia-smi) | n/a | 8151 MiB (RTX 5070 Laptop) |
| Idle GPU use, ORU view | under 15% | |
| Frame rate, ORU focused | 60 fps | |
| Wake to listening | under 0.5 s | |
| End of speech to transcript | under 1.0 s | |
| Transcript to first spoken word (simple command) | under 2.5 s | |
| Boot to greeting | under 8 s after login | |
