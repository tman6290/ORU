# Decisions

Locked decisions. Add new ones at the bottom with a date. Change a locked decision only when Tofa says so.

## D1. Base: fork of OpenDex (2026-11-11)
OpenDex gives ORU the voice loop, theme system, skills and permission gate. Stack matches Tofa's (TypeScript, React, Node). MIT license allows portfolio and commercial use. Upstream has been quiet since July 2026, so ORU owns its fork.

## D2. No Claude subscription access from code (2026-11-11)
Anthropic's terms reserve Free, Pro and Max logins for Claude's own apps and Claude Code. Using those logins in another tool, including through the Agent SDK, breaks the Consumer Terms. ORU does not embed the Agent SDK, call Claude Code headless, or automate Claude Desktop's window.

## D3. Claude handoff through deep links (2026-11-11)
ORU opens Claude Desktop with a prefilled prompt:
- `claude://claude.ai/new?q=<url-encoded prompt>` for chat
- `claude://cowork/new?q=<prompt>&folder=<abs path>` for Cowork
- `claude://code/new?q=<prompt>&folder=<abs path>` for Claude Code

The prompt text in `q` is truncated near 14,000 characters. Tofa reviews and presses send. ORU does not send keystrokes to Claude Desktop, and the computer-use skill refuses to act on Claude Desktop's window.
Source: https://support.claude.com/en/articles/14729294

## D4. Brain: local model through Ollama (2026-11-11)
Everyday commands run on a local tool-calling model served by Ollama at `http://localhost:11434`. Zero cost per command. The API-key providers OpenDex ships (Anthropic, OpenAI, gateway) stay available as an optional upgrade and stay off by default.

## D5. Speech stays local (2026-11-11)
Speech to text: local Whisper (OpenDex's `whisper-local`, WebGPU where available). Text to speech: a local neural voice (Kokoro is the first candidate). ElevenLabs remains an optional engine.

## D6. Shell mode sits on top of Windows (2026-11-11)
ORU runs as a fullscreen window at the bottom of the window stack with the taskbar hidden. `explorer.exe` keeps running. "Windows view" hides ORU and restores the taskbar. A main-process hotkey toggles the view even when the interface hangs.

## D7. Analytics and auto-update removed (2026-11-11)
OpenDex's Google Analytics module goes. Its auto-updater also goes, because it would replace ORU with an OpenDex release.

## D8. Look: neon green, Odù motifs, original design (2026-11-11)
Primary colour neon green on near-black. Visual language draws on the 256 Odù of Ifá as eight-bit glyphs and on the opon Ifá tray. Tofa directs the cultural details. No film interface replicas, logos or audio.

## D9. Confirm before sensitive actions (2026-11-11)
Email, calls, file deletion, shell commands and screen control pass through the permission gate. ORU states the action and waits for approval.

## D10. Reference images stay out of git (2026-11-11)
`reference/` images are ignored so third-party artwork does not land in a public repo.

## D11. Windows hotkeys (2026-11-11)
Push-to-talk stays Ctrl+Shift+Space. Interrupt is Ctrl+Alt+Backspace on Windows (Ctrl+Esc opens Start); macOS and Linux keep Cmd/Ctrl+Esc. Summon defaults to Ctrl+Alt+Space on Windows (Alt+Space opens the window menu), falling back to Ctrl+Alt+O; no fallback reuses the push-to-talk chord. UI labels come from `renderer/src/lib/hotkeys.ts`.

## D12. Package identity (2026-11-11)
appId `tech.wolban.oru`, productName `ORU`, package name `oru`. electron-builder `publish` is `null`, so packaged builds never look for updates.

## D13. ORU window sits just above the desktop (2026-11-12)
Spike on Tofa's machine: ORU is placed directly above `Progman` with `SetWindowPos` through koffi, and drops back there after every z-order change (`WM_WINDOWPOSCHANGED`, focus). Apps stay in front, clicks and typing reach ORU, no flicker. `HWND_BOTTOM` puts it *under* the desktop (invisible); parenting to `WorkerW` lost the window off-screen. The window is frameless with `thickFrame: false` and `resizable: true` (resize blocked by `will-resize`), sized in physical pixels with square corners: any resize frame left a 2–11 px gap, and `resizable: false` clamped it short.

## D14. Taskbar hides through auto-hide (2026-11-12)
ORU turns on taskbar auto-hide with `SHAppBarMessage(ABM_SETSTATE)` and restores the previous state. Hiding `Shell_TrayWnd` left an empty strip and the Windows key could not bring the taskbar back. Auto-hide is a saved Windows setting, so a crash-restore flag file (`userData/shell-state.json`) records the original state. The taskbar still slides up at the bottom edge, which keeps Start reachable.

## D15. koffi for Win32 calls (2026-11-12)
koffi (prebuilt N-API binaries, no compiler) calls user32, shell32 and dwmapi from the main process. Its install script is not needed: the binary ships in `@koromix/koffi-win32-x64`.

## D16. ORU theme layout (2026-11-12)
Tofa's picks: the mind lattice arcs above the orb as a constellation; the orb is clean glass with a noise surface and faint glyphs inside. Panels stay lean and every one shows real, explainable data (system, transcript, actions, clock); no decorative fake panels from the references. Image 03 informs panel styling only (cut-corner frames, radial gauges, line charts).

## D17. Orb in raw WebGL2 (2026-11-12)
The orb is a WebGL2 fragment shader (noise-displaced sphere, fresnel rim, glow) plus a point-sprite particle shell, with no 3D library. Keeps the bundle small and the frame budget in our hands. Everything else in the theme is SVG, canvas 2D and CSS driven by one shared frame clock.

## D18. Fonts (2026-11-12)
Oxanium (display, labels) and JetBrains Mono (data, transcript), both OFL-1.1, bundled through `@fontsource-variable` so ORU works offline.

## D19. Alerts: neon red, and a klaxon for critical (2026-11-12)
Tofa's rule: errors turn the whole interface neon red (same lightness and saturation, only the hue changes) and ORU says what went wrong; critical issues such as attacks also blink, sound an alarm and ORU repeats "Warning! Warning! …" until acknowledged. Alerts flow through one bus in main (`src/main/alerts.ts`, IPC `alert:raise` / `alerts:changed`). Every theme colour is a registered CSS token so the swap animates. Speech uses the built-in Windows voice until Phase 4.

## D20. The orb is the focus (2026-11-12)
Tofa: the panels overshadowed the orb. The orb takes the largest share of the screen; everything else is an instrument around it. Panels are narrower (248 and 280 px), more transparent and thinner-edged; the ring, lattice and platform hug the orb (ring 1.5x the orb); a halo behind the orb keeps it the brightest object. The stage fits between the panels using spans measured with `oruLayoutCheck()`.
