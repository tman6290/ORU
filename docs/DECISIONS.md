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
