# ORU: architecture

ORU extends OpenDex. Read the matching section of `AGENTS.md` for the code that exists today. This file describes what ORU adds and how the parts connect.

## Layers

```
+-------------------------------------------------------------+
|  FACE (renderer)   theme "oru": orb, panels, glyphs, typing |
|  src/renderer/src/components/themes/oru/                    |
+-------------------------------------------------------------+
|  VOICE (renderer + main)                                    |
|  wake word -> Whisper (local) -> brain -> TTS (local)       |
|  lib/dex/use-dex.ts, lib/dex/engines/, src/main/tts/        |
+-------------------------------------------------------------+
|  BRAIN (main)                                               |
|  instant commands -> Ollama model with tools -> handoff     |
|  src/main/agent/, src/main/agent/llm/                       |
+-------------------------------------------------------------+
|  SKILLS (main + renderer views)   behind the permission gate|
|  src/skills/<name>/                                         |
+-------------------------------------------------------------+
|  SHELL (main, Windows)                                      |
|  fullscreen desktop layer, taskbar, view switching          |
|  src/main/shell/  (new)                                     |
+-------------------------------------------------------------+
|  MEMORY (main)   local database in userData                 |
|  src/main/memory/  (new)                                    |
+-------------------------------------------------------------+
```

## Request flow

1. Tofa says "Hey Oru" or presses the push-to-talk hotkey.
2. The renderer captures speech and local Whisper returns a transcript.
3. **Instant commands.** A deterministic matcher checks the transcript against a short list (switch view, show typing, mute, stop, open a named workspace). A match runs at once with no model call.
4. **Local brain.** Other requests go to the Ollama model with the enabled skills as tools. Sensitive tools pause at the permission gate.
5. **Claude handoff.** Requests that need research, email, calendar, long writing or coding go to the `claude` skill, which builds a complete prompt and opens Claude Desktop through a `claude://` deep link. Tofa presses send.
6. ORU speaks a short reply through local TTS. The TTS audio feeds an analyser, and the analyser level drives the orb.

## Shell mode (Windows)

State lives in the main process: `view: "oru" | "windows"`.

**ORU view**
- The main window is frameless, sized to the primary display's bounds, and kept at the bottom of the window stack. App windows open above it and stay above it when Tofa clicks the ORU background.
- ORU still receives mouse and keyboard input.
- The taskbar is hidden. The ORU window covers the desktop icons.
- OpenDex's automatic notch mode (which hides the main window on blur) is off while shell mode is on. The overlay HUD and the permission popup keep working above other apps.

**Windows view**
- The ORU main window hides. The voice session keeps running, as in OpenDex's hide-not-destroy model.
- The taskbar returns.
- A compact bar or tray icon remains so Tofa can see ORU is listening.

**Safety**
- A global hotkey registered in the main process toggles the view. It works when the renderer is frozen.
- ORU writes a flag to disk before it changes the taskbar. On quit it restores the taskbar and clears the flag. On launch, a set flag means the last run crashed, so ORU restores the taskbar first.
- ORU does not replace `explorer.exe` and does not edit the registry shell key.

**Candidate techniques** (Phase 2 picks one after a short spike and records it in `DECISIONS.md`)
- Bottom of stack: call `SetWindowPos` with `HWND_BOTTOM` through an FFI library on show and on focus, or parent the window to the desktop's `WorkerW`. The first keeps input working with less effort. The second is how wallpaper engines work and often blocks input.
- Taskbar: toggle auto-hide with `SHAppBarMessage(ABM_SETSTATE)`, or hide `Shell_TrayWnd` with `ShowWindow`. Pick the one that restores without side effects.

## Voice

- **Wake.** OpenDex ships a Vosk grammar wake engine and a push-to-talk hotkey. "Oru" is not an English dictionary word, so Phase 5 tests whether Vosk can spot it and falls back to phonetic stand-ins or a custom wake model. Push-to-talk must work first.
- **Speech to text.** `whisper-local` (transformers.js). Confirm it runs on WebGPU on the RTX card. Add a correction table for words Whisper gets wrong ("or you" and "aura" for "Oru").
- **Text to speech.** Add a local neural engine next to the existing `elevenlabs` and `system` engines. Sentences stream to TTS as the model produces them.
- **Amplitude.** OpenDex uses a synthetic envelope while speaking in pipeline mode. ORU routes TTS playback through an `AnalyserNode` so `getAmplitude()` returns the real level. The realtime `pcm-player.ts` already shows the pattern.

## Brain

- New provider `ollama` in `src/main/config/llm-providers.ts` and `src/main/agent/llm/resolve-model.ts`, using the AI SDK's OpenAI-compatible client against `http://localhost:11434/v1`.
- Small context window and a low step limit keep replies fast.
- Whisper, the chat model and the 3D scene share one GPU. Phase 6 measures VRAM and picks a model that leaves headroom.
- The system prompt comes from `agent/system-prompt.ts`, with the persona from `VISION.md`.

## Skills ORU adds

| Skill | Tools | Sensitive |
| --- | --- | --- |
| `shell` | switch view, show or hide typing panel, mute, stop | no |
| `open` (extend) | open app by name, open URL or folder, open a named workspace | ask |
| `windows` | list, focus, minimise, close, snap | close: yes |
| `system` | volume, brightness, lock, sleep, battery and network status | lock, sleep: yes |
| `claude` | hand a task to Claude Desktop chat, Cowork or Code | no (Tofa presses send) |
| `comms` | start a call through `tel:` or WhatsApp, draft an email through `mailto:` | yes |
| `memory` | remember, recall, forget | forget: yes |

## Claude handoff

- `shell.openExternal("claude://claude.ai/new?q=" + encodeURIComponent(prompt))`.
- The local model writes the prompt: the task, the context ORU knows (names, dates, files), and the output Tofa wants.
- ORU then says a short line such as "Loaded in Claude. Press Enter to send."
- No keystroke injection into Claude Desktop, by any path.
- Claude Desktop's connectors and MCP servers (mail, calendar, search, files) do the work under Tofa's plan. Phase 8 writes a setup guide for them.

## Memory

- Local database in the app's `userData` folder. Prefer a built-in or pure JS SQLite option over a native module. Check what the bundled Node version offers before adding a dependency.
- Tables: facts, preferences, conversation summaries, workspaces, contacts.
- The brain receives a small set of relevant memories per turn, capped near 300 tokens.
- Tofa can view and delete entries in Settings.

## Performance rules

- The orb and panels animate through `requestAnimationFrame` with direct DOM or WebGL writes. No React re-render per frame.
- Full frame rate while ORU has focus. Half rate or lower while another app has focus. Paused in Windows view.
- Reduced effects on battery power.
- Heavy engines load on demand, as OpenDex already does.
