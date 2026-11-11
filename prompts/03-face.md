# Phase 3: Face

## Goal

ORU gets his own interface: a new theme named `oru` with the orb, the opon Ifá ring, gears, the mind graph, Odù glyphs, live system panels, transcript and typing panel, in neon green.

## Read first

- `docs/PROGRESS.md`
- `docs/DESIGN.md` (all of it)
- `docs/VISION.md`: "The experience"
- `reference/README.md` and each image in `reference/`. View the images. They are the base for layout and mood.
- `AGENTS.md`: section "Themes"
- `src/renderer/src/components/themes/types.ts`, `themes/registry.ts`, `themes/shared/`, and the `jarvis/` theme as a working example of a HUD theme

## Tasks

1. **Design pass before code.** Describe the layout in words and a simple ASCII sketch: where the orb, ring, gears, mind graph, panels, transcript and controls sit, and how the reference images shaped it. Wait for Tofa's approval.
2. **Theme folder.** Create `components/themes/oru/` with an `index.tsx` that default-exports a `DexThemeDef` (Component, Preview, StatusIndicator). Split the pieces into their own files. Make `oru` the default theme in `DEFAULT_CONFIG`.
3. **Tokens and fonts.** Define the colour tokens from `DESIGN.md` in the theme stylesheet. Bundle the chosen open-license fonts in the app.
4. **Orb.** A shader-driven orb with the six states in `DESIGN.md`, mapped from `DexStatus`. Drive it from `getAmplitude()` through the pattern in `themes/shared/use-amplitude.ts`: animation frame loop, direct writes, no React re-render per frame. Check `package.json` first. Use raw WebGL or add `three` (ask Tofa before adding it).
5. **Ring, gears, mind graph.** Build each as its own layer with its own speed and depth. Tie their activity to status and to tool-call events.
6. **Odù glyphs.** One component that draws any of the 256 Odù from a byte value, following the encoding in `DESIGN.md`. Use it for the background streams and the thinking indicator.
7. **System panels.** Add a main-process stats service (CPU, RAM, battery, network from Node and Electron APIs, GPU from `nvidia-smi` when present), polled every one to two seconds and exposed through a new IPC channel. Render real values.
8. **Transcript, tool cards, typing panel, controls.** Reuse the shared transcript and `text-composer.tsx`. Add visible controls for Type, Mute, Windows view (call the Phase 2 IPC) and Settings.
9. **Frame budget.** Full rate when ORU has focus, half rate or lower when another app has focus, paused in Windows view, reduced effects on battery. Record measured frame rate and idle GPU use in `docs/PROGRESS.md`.

## Constraints

- Tofa's design is original. Do not reproduce a film interface, a logo or a branded HUD. The existing `jarvis/` theme is a code example, not a visual target.
- Glyphs are a motif. No text that presents them as readings.
- The theme must work at 1920x1080 and at the Legion's native resolution.
- Leave the other themes in place.

## Acceptance checks

- ORU launches into the new theme with no layout breaks at both resolutions.
- The orb shows a distinct look for idle, listening, thinking and speaking. Tofa can trigger each with the existing voice loop or the debug controls you add.
- System panels show numbers that match Task Manager within a few percent.
- The Type button opens the typing panel and Enter sends the text.
- Idle GPU use and frame rate meet the budget in `DESIGN.md`, or the shortfall is logged with a plan.

## Stop and ask Tofa

- A reference image conflicts with `DESIGN.md`.
- A visual choice is a matter of taste (glyph size, ring detail, panel density). Offer two options with a one-line description each.

## Close out

Update `docs/PROGRESS.md`, add any design decision to `docs/DECISIONS.md`, and commit in layers: tokens, orb, ring and gears, glyphs, panels, controls.
