# Phase 10: Polish and ship

## Goal

ORU feels finished: a boot sequence, sound, sensible power use, launch at login, and an installer. The repo reads well as a Wolban Tech case study.

## Read first

- `docs/PROGRESS.md` (known issues and measurements)
- `docs/DESIGN.md`: "Motion", "Sound", "Boot sequence", "Performance budget"
- `package.json` build config and `AGENTS.md` "Conventions" (build and packaging lines)

## Tasks

1. **Known issues first.** Go through "Known issues" in `docs/PROGRESS.md` with Tofa and fix the ones he picks.
2. **Boot sequence.** Build the five steps in `DESIGN.md`. Under six seconds, skippable with any key, ending in the greeting.
3. **Sound.** Original cues for wake, listening, done, error, view switch and boot, synthesised with the Web Audio API or taken from sources with a clear open license (record each source in `NOTICE.md`). Volume control and an off switch in Settings.
4. **Power modes.** Detect battery power and apply the reduced-effects profile. Add a manual "quiet mode" for meetings: no wake word, no sound, low frame rate.
5. **Performance pass.** Measure idle GPU, CPU and memory in ORU view and Windows view over ten minutes. Fix the largest cost. Update the Measurements table.
6. **Launch at login.** Turn on the Phase 2 setting by default and check boot-to-greeting time.
7. **Resilience.** Renderer crash recovery (reload the window, keep the session where possible), taskbar restore on each exit path, and a plain error screen in place of a blank one.
8. **Installer.** Configure the Windows build (icon from Tofa, product name, per-user install) and run `pnpm dist`. Tofa installs it on the Legion and runs a full day on it.
9. **Docs.** Finish `README.md`: what ORU is, a feature list, screenshots Tofa takes, setup steps, the architecture in a paragraph with a link to `docs/ARCHITECTURE.md`, and credits. Write `docs/DEMO-SCRIPT.md`: a 60-second sequence for the Wolban Tech demo video that shows boot, a voice command, a workspace opening, a Claude handoff and a view switch.
10. **Upstream check.** Fetch `upstream` and list any commits since the fork point. Recommend which to merge.

## Constraints

- No film audio, logos or interface replicas.
- The installer is unsigned unless Tofa provides a certificate. Say so in the README.

## Acceptance checks

- Cold start after login: boot sequence, then greeting, within the target in `docs/PROGRESS.md`.
- Unplug the charger: effects reduce within a few seconds.
- Kill the renderer process: ORU recovers without a restart and the taskbar state stays correct.
- The installed build runs for a working day with no crash and no taskbar left hidden.
- A new reader can set up and run ORU from the README alone.

## Stop and ask Tofa

- Icon, screenshots and the final say on sound.

## Close out

Update `docs/PROGRESS.md`, tag the commit `v1.0.0` after Tofa approves, and remind him to push the tag.
