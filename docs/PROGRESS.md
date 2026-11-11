# Progress

Claude Code: read this file at the start of each session and update it at the end.

## Current state

- Phase in progress: 1 (code done, waiting on Tofa's `pnpm dev` check)
- App runs on Tofa's machine: yes (pnpm dev opens a window titled ORU; onboarding runs)
- Last session: 2026-11-11, Phase 1

## Phases

- [ ] 1. Baseline: run the fork on Windows, remove analytics and auto-update, rebrand to ORU
- [ ] 2. Shell: fullscreen desktop layer, hidden taskbar, Windows view toggle, safe restore
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
- `pnpm dev` launch and hotkey checks on Tofa's machine.
Decisions: D11 (Windows hotkeys), D12 (package identity).
Manual tests for Tofa:
1. `pnpm dev`: the window is titled ORU; onboarding finishes with no analytics step; Settings → Privacy shows "ORU sends no usage data".
2. Push-to-talk: switch Voice input to push-to-talk, press Ctrl+Shift+Space. It should start listening.
3. While a command runs, press Ctrl+Alt+Backspace. The command stops and the Start menu does not open.
4. Press Ctrl+Alt+Space from another app. ORU shows and hides, and no window menu appears.
5. Tray icon tooltip and menu read "ORU", "Show ORU", "Quit ORU".
Next step: Tofa reports the `pnpm dev` result, then Phase 2 (`prompts/02-shell.md`).

```
### YYYY-MM-DD, Phase N
Done:
Not done:
Decisions: (also add to DECISIONS.md)
Manual tests for Tofa:
Next step:
```

## Open questions for Tofa

- The default wake word is now `oru`. The Vosk English model may not know that word, so wake detection could miss it. Check in Phase 5.

## Known issues

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
