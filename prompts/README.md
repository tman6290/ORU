# ORU build prompts

One prompt per phase. Run them in order, one Claude Code session each.

## Running a phase

1. Open the Code tab in Claude Desktop and pick the `ORU` folder on your Desktop.
2. Choose Opus 5.5.
3. Start a new session and send this line, with the right file name:

   ```
   Read prompts/01-baseline.md and carry it out. Plan first and wait for my approval before you edit files.
   ```

   Shortcut: from PowerShell in the ORU folder, run `.\prompts\start-phase.ps1 1`. It opens Claude Code on this folder with that line typed in. You press send.
4. Approve the plan or correct it.
5. Run `pnpm dev` in your own terminal when Claude asks, and tell it what you see and hear.
6. Work through the manual tests Claude lists at the end.
7. Push when you're happy: `git push -u origin main`.

## The phases

| File | Result you can see |
| --- | --- |
| `01-baseline.md` | The app runs on your Legion, named ORU, with tracking and auto-update removed |
| `02-shell.md` | ORU fills the screen behind your apps, the taskbar hides, a hotkey returns you to Windows |
| `03-face.md` | The neon green interface: orb, gears, mind, Odù glyphs, live system panels |
| `04-voice-out.md` | ORU greets you in a natural local voice and the orb moves with his speech |
| `05-voice-in.md` | You talk to ORU by hotkey and by "Hey Oru" |
| `06-brain.md` | A free local model answers and uses tools |
| `07-skills.md` | ORU opens apps and workspaces, manages windows, switches views, shows the typing panel |
| `08-claude-handoff.md` | "ORU, research..." opens Claude Desktop with the prompt loaded |
| `09-memory.md` | ORU remembers facts and preferences across sessions |
| `10-polish-ship.md` | Boot sequence, sound, launch at login, installer |
| `90-resume.md` | Continue a phase in a fresh session |
| `91-bugfix.md` | Fix one bug with a small context |

## Running a task with Qwen instead

Claude says at the start of each phase whether it should build it or Qwen should. For a Qwen task:

1. In Ollama, give Qwen a large context window: `num_ctx` of 32768 or more. The default is too small for a coding agent.
2. Open Oh My Pi in the ORU folder and send:

   ```
   Read docs/QWEN.md, then docs/PROGRESS.md, then <the task or prompt file>. Plan first and wait for my go before you edit files.
   ```

3. Next Claude session: say "Qwen did <task>". Claude reviews the commits before building on them.

Qwen cannot see images, so anything that depends on `reference/` stays with Claude.

## Keeping sessions fast and cheap

- **One phase, one session.** Start a new session for each phase. `docs/PROGRESS.md` carries the state across, so a fresh session loses nothing.
- **Long session?** Tell Claude "close out", then start fresh with `90-resume.md`.
- **Add your reference images before Phase 3.** Put them in `reference/` and write one line per image in `reference/README.md`.
- **Report results in plain words.** "Orb renders, taskbar still visible, hotkey works" beats a pasted log. Paste the error text when something fails.
- **Bugs get their own session.** Use `91-bugfix.md` so a bug hunt doesn't drag a whole phase's context along.
- **Usage limits.** Opus 5.5 earns its cost in phases 2, 3, 5 and 6. Phases 1, 7 and 9 are routine enough for a Sonnet model if you run low.
- **Edit the docs yourself.** Changed your mind about the look or a rule? Edit `docs/DESIGN.md` or `docs/DECISIONS.md` and the next session picks it up.

## Before Phase 1

Install these on the Legion:

- Git (done), Node.js 20 or newer, pnpm (`npm install -g pnpm`)
- Ollama, before Phase 6: https://ollama.com/download
- Claude Desktop, signed in to your plan (you have this)
