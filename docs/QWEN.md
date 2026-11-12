# Brief for Qwen (Oh My Pi)

Read this first. It replaces `CLAUDE.md` for you. Then read `docs/PROGRESS.md` and the task Tofa gives you. Read nothing else unless the task names it.

## What ORU is

Tofa's voice assistant and fullscreen desktop for Windows 11. It is a fork of OpenDex: Electron, electron-vite, React, Tailwind v4, Vercel AI SDK, pnpm. TypeScript everywhere.

## Rules

1. **Plan first.** List the files you will change and what changes in each. Wait for Tofa's "go" before editing.
2. **Small edits.** Change only what the task needs. No refactors, no renames, no new dependencies without asking.
3. **Keep OpenDex names.** `window.opendex`, `OpenDexConfig`, `useDex` and file names stay. Only user-facing text says ORU.
4. **No secrets, no `.env`.** Keys live in the encrypted config store.
5. **No telemetry.** Do not add tracking or network calls that aren't the task.
6. **Sensitive actions** (email, calls, deleting files, shell commands, screen control) go through `src/main/agent/permissions.ts`.
7. **No Claude subscription access from code.** ORU reaches Claude only through `claude://` deep links.
8. **Git:** run `pnpm typecheck` before each commit. Messages: `feat:`, `fix:`, `chore:`, `docs:`. Never push.
9. If unsure, stop and ask Tofa. Do not guess at Windows APIs.

## Commands

| Command | Use |
| --- | --- |
| `pnpm typecheck` | Must pass before every commit |
| `pnpm build` | Production build |
| `pnpm dev` | Tofa runs this himself and tells you what he sees |

## Where things live

- `src/main/` Node main process. `index.ts` holds windows, IPC handlers, hotkeys, tray.
- `src/main/config/schema.ts` config type + `DEFAULT_CONFIG`. New sections need both.
- `src/main/shell/` desktop mode (Phase 2). `win32.ts` has the Win32 calls; don't change it without asking.
- `src/preload/index.ts` the `window.opendex` bridge.
- `src/renderer/src/` React UI. Settings: `components/settings/sections.tsx`.
- `src/skills/<name>/` one folder per skill: `meta.ts`, `skill.ts`, optional `view.tsx`. Copy an existing skill.
- `AGENTS.md` is a long, accurate code map. Search it by heading and read one section, never the whole file.

## Adding an IPC channel (the usual pattern)

1. Name it in `src/main/ipc/channels.ts` (`IPC.xxx`).
2. Handle it in `src/main/index.ts` inside `registerIpc()`.
3. Expose it in `src/preload/index.ts`. The renderer types come from there automatically.

## Close out

Append an entry to the session log in `docs/PROGRESS.md` (newest first): Done, Not done, manual tests for Tofa. Mark it "(Qwen)" in the heading. Commit.

## Lessons already learned (don't repeat them)

- Windows coordinates: Node scripts are not DPI-aware, so Win32 returns half-size numbers on Tofa's 200% screen. Electron's `screen` uses scaled units; convert with `screen.dipToScreenRect`.
- `pnpm install` skips build scripts; that is expected (koffi and others ship prebuilt).
- `globalShortcut`: Windows reserves Alt+Space, Ctrl+Esc and Win+ chords.
- The ORU theme lives in `src/renderer/src/components/themes/oru/`. Animated layers subscribe to `useFrame` in `frame-clock.ts`; never start another requestAnimationFrame loop. Read state from `motion.ts`.
- `pnpm preview:oru` shows the theme in a browser at http://localhost:5174 with fake data; F8 cycles the orb states.
