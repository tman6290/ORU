# ORU

ORU (short for Ọ̀rúnmìlà) is Tofa's personal voice assistant and fullscreen desktop interface for Windows 11. This repo is a fork of OpenDex: Electron, electron-vite, React, Tailwind v4, Vercel AI SDK, pnpm. License: MIT (keep `LICENSE` and `NOTICE.md`).

Target machine: Lenovo Legion 5 Pro, Windows 11, 32 GB RAM, NVIDIA RTX 5070 laptop GPU. Run `nvidia-smi` to confirm VRAM before you pick models.

## Session protocol

1. Read `docs/PROGRESS.md` first. It records where the build stands and what the last session left open.
2. Read the prompt file Tofa names in `prompts/`. Read the docs that prompt lists and stop there.
3. Plan before you edit. Show the plan and wait for Tofa's approval.
4. Build in small commits. Run `pnpm typecheck` before each commit.
5. Before each phase, say whether Claude or Qwen (Tofa's local Qwen3 Coder 30B in Oh My Pi) should build it, and why. Qwen's brief is `docs/QWEN.md`; keep it current when a rule or a lesson changes. Review Qwen's commits before building on them.
6. Close out each session: update `docs/PROGRESS.md` (checklist, session log, open questions), commit, and give Tofa the manual test list from the prompt.

## Commands

| Command | Use |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm typecheck` | Run before each commit |
| `pnpm build` | Production build into `out/` |
| `pnpm dev` | Launch the app. Tofa runs this in his own terminal and reports what he sees |
| `pnpm smoke:chat` | Test the agent loop without Electron |
| `pnpm dist` | Package the installer (Phase 10) |

## Where things live

- `src/main/` Node main process: agent loop, config, IPC handlers, TTS, STT, windows.
- `src/preload/` the typed `window.opendex` bridge.
- `src/renderer/src/` React UI. Voice state machine: `lib/dex/use-dex.ts`. Themes: `components/themes/<id>/`.
- `src/skills/<name>/` one folder per skill: `meta.ts`, `skill.ts`, optional `view.tsx`.
- `AGENTS.md` is OpenDex's own code map. It is long and accurate. Open the one section you need (search by heading). Its "Phase" labels describe OpenDex history. ORU phases live in `docs/PROGRESS.md`.
- `docs/` ORU documents: `VISION.md`, `ARCHITECTURE.md`, `DESIGN.md`, `DECISIONS.md`, `PROGRESS.md`.
- `reference/` Tofa's GUI reference images. Use them as a base for layout and mood. Do not copy them element for element.
- `prompts/` one prompt per build phase.

## Hard rules

1. **No Claude subscription access from code.** Do not add the Claude Agent SDK, Claude Code headless calls, OAuth tokens from a Claude plan, or scripts that click or type inside Claude Desktop. ORU reaches Claude through `claude://` deep links that prefill a prompt, and Tofa presses send. API-key providers already in OpenDex may stay.
2. **Local first.** Speech recognition, the everyday brain (Ollama) and speech output run on this machine by default. Cloud engines stay optional and off by default.
3. **No telemetry.** Phase 1 removes OpenDex's analytics. Do not add tracking.
4. **Sensitive actions go through the permission gate.** Sending email, placing calls, deleting files, running shell commands and controlling the screen require Tofa's approval through `agent/permissions.ts`.
5. **Leave Windows intact.** Do not replace `explorer.exe`, edit the registry shell key, or change system settings ORU cannot restore. Each system change ORU makes (taskbar state, login item) has a restore path that runs on quit and after a crash.
6. **Keep OpenDex internal names.** `window.opendex`, `OpenDexConfig`, `useDex` and file names stay, so upstream fixes merge without conflicts. Rebrand user-facing strings.
7. **No secrets in the repo.** Keys live in the encrypted config store. Do not read or write `.env` files.
8. **Git.** Commit with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`). Do not push. Tofa pushes over SSH.
9. **Original look.** ORU's visuals are Tofa's own design. Do not reproduce film interfaces, logos or audio.

## Context budget

- Read files by section. Search first, then open the range you need.
- Hand broad codebase searches to a subagent and keep its summary.
- Do not refactor code the current prompt does not touch.
- Prefer a dependency already in `package.json`. Ask before adding a native module.
- When a session runs long, write state into `docs/PROGRESS.md` and tell Tofa to start a fresh session with `prompts/90-resume.md`.
- Record each decision that future sessions need in `docs/DECISIONS.md` in two or three lines.
