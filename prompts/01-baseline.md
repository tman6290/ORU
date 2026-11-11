# Phase 1: Baseline

## Goal

The OpenDex fork runs on Tofa's Windows 11 laptop under the name ORU, with tracking and auto-update removed. No new features in this phase.

## Read first

- `docs/PROGRESS.md`
- `docs/DECISIONS.md` (D1, D2, D6, D7)
- `AGENTS.md`: sections "Process model", "Conventions", "Config"
- `package.json`

## Tasks

1. **Environment check.** Confirm Node and pnpm versions meet the repo's needs. Run `nvidia-smi` and record total VRAM in the Measurements table in `docs/PROGRESS.md`.
2. **Install and build.** Run `pnpm install`, `pnpm typecheck` and `pnpm build`. Fix Windows-specific failures with the smallest change. Then ask Tofa to run `pnpm dev` and report what he sees.
3. **Remove analytics.** Delete `src/main/analytics/` and each call site (`src/main/index.ts`, `src/main/updater.ts`, `src/main/agent/briefing-data.ts`), the `analytics` block in `src/main/config/schema.ts`, the onboarding checkbox, and the privacy toggle in `components/settings/sections.tsx`. Rewrite `PRIVACY.md` to state that ORU sends no usage data.
4. **Remove auto-update.** Take out `src/main/updater.ts`, its wiring, the `electron-updater` dependency and the `publish` settings in the build config. The updater would replace ORU with an OpenDex release.
5. **Rebrand user-facing strings.** Product name `ORU`, a new `appId` (suggest `tech.wolban.oru` and confirm with Tofa), window titles, tray labels, onboarding copy. Set `DEFAULT_CONFIG.assistant` to name `ORU` and wake word `oru`. Keep internal identifiers (`window.opendex`, `OpenDexConfig`, `useDex`, file names) per Hard rule 6.
6. **Hotkey audit for Windows.** Check each global shortcut in `src/main/index.ts`. `CommandOrControl+Escape` (interrupt) opens the Start menu on Windows, and `Alt+Space` (summon) opens the window menu. Propose replacements, confirm with Tofa, and record them in `docs/DECISIONS.md`.
7. **Trim.** Propose a list of folders ORU does not need (the `site/` marketing site, `RELEASING.md`, the release workflows in `.github/`, release-note scripts, sponsor or screenshot assets). Delete the ones Tofa approves.
8. **README.** Replace `README.md` with a short ORU readme: what it is, how to run it, and credit to OpenDex with a link to `NOTICE.md`.

## Constraints

- Keep the macOS and Linux code paths compiling. Do not delete them.
- Do not change the theme, voice or model code yet.
- Ask before you add a dependency.

## Acceptance checks

- `pnpm typecheck` and `pnpm build` pass.
- `pnpm dev` opens a window titled ORU. Onboarding completes with no analytics step.
- A search for `google-analytics`, `electron-updater` and `autoUpdater` in `src/` returns nothing.
- The push-to-talk, interrupt and summon hotkeys work on Windows without triggering a system shortcut.
- `LICENSE` and `NOTICE.md` are present and unchanged.

## Stop and ask Tofa

- The app fails to launch after two fix attempts.
- A removal breaks a feature ORU needs later (voice, skills, permissions, overlay).

## Close out

Update `docs/PROGRESS.md`, note any place where `AGENTS.md` no longer matches the code, and commit. Suggested commits: `chore: remove analytics`, `chore: remove auto-update`, `chore: rebrand to ORU`, `fix: windows hotkeys`.
