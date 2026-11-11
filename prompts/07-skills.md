# Phase 7: Skills

## Goal

ORU does things on the laptop: opens apps and workspaces, manages windows, controls the system, brings up the typing panel, and switches views. Common commands run at once with no model call.

## Read first

- `docs/PROGRESS.md`
- `docs/ARCHITECTURE.md`: "Request flow" and "Skills ORU adds"
- `AGENTS.md`: section "Skills + permission gate"
- `CONTRIBUTING.md`: the part on adding a skill
- `src/skills/open/` as the pattern, `src/skills/registry.ts`, `src/main/agent/permissions.ts`

## Tasks

1. **Instant commands.** Add a deterministic matcher that runs on each transcript before the model. Start with: switch to Windows view, switch to ORU view, "I want to type" and variants, close the typing panel, mute, unmute, stop, and "open workspace <name>". Keep the phrases in one data file. A match runs the action, gives a short spoken or sound acknowledgement, and skips the model.
2. **`shell` skill.** Tools for switching views and showing or hiding the typing panel, wired to the Phase 2 IPC and the theme's typing panel. The model can call these when a request is phrased in a way the matcher misses.
3. **Extend `open`.** Open an installed app by its common name (build an index from the Start menu apps list and refresh it on launch), open a URL, open a folder.
4. **Workspaces.** A named set of apps, URLs and folders that opens together, with an optional window layout. Store them in config, edit them in Settings, and create them by voice ("save this as my dev workspace" can come later; a Settings editor is enough now). Seed two examples and ask Tofa what his should contain.
5. **`windows` skill.** List open windows, focus one by app name, minimise, close, and snap left, right or full. Check what `@nut-tree-fork/nut-js` already offers before adding anything. Closing a window is a sensitive tool.
6. **`system` skill.** Volume, brightness, lock, sleep, and battery and network status. Lock and sleep are sensitive tools.
7. **Tool views.** Give each new tool a label and a compact card through the existing `view.tsx` mechanism, styled with the ORU tokens.
8. **Update the eval.** Add the new tools to `scripts/eval-brain.ts` and re-run it. Report any drop in accuracy.

## Constraints

- Each skill is one folder under `src/skills/` with `meta.ts`, `skill.ts` and an optional `view.tsx`.
- Sensitive tools set `sensitive: true` so the permission gate handles them. No private bypass.
- No shell-command tool that runs arbitrary text from the model.
- Windows first. Other platforms return a clear "not supported here" result.

## Acceptance checks

Tofa says each of these:

- "Switch to Windows view" and "switch to ORU view": the view changes in well under a second.
- "I want to type": the typing panel opens with the cursor in it.
- "Open Chrome", "open my Documents folder", "open github.com".
- "Open my dev workspace": each item in it opens.
- "Snap this window left", "minimise Chrome".
- "Set volume to thirty percent", "how's my battery?"
- "Close this window" and "lock the laptop": a permission prompt appears first.

## Stop and ask Tofa

- What his workspaces should contain.
- Any action that could lose his work.

## Close out

Update `docs/PROGRESS.md`, list the instant command phrases there so Tofa knows them, and commit one skill per commit.
