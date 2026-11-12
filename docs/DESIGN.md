# ORU: design

Tofa is the art director. His images in `reference/` set the base for layout and mood. This file sets the system those images plug into. Where a reference image and this file disagree, ask Tofa.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--oru-bg` | `#020503` | Screen background |
| `--oru-bg-raised` | `#07120A` | Panels |
| `--oru-primary` | `#39FF14` | Neon green: orb core, key lines, active text |
| `--oru-primary-dim` | `#1E8F0E` | Secondary lines, idle elements |
| `--oru-primary-faint` | `#0C3A08` | Grids, glyph trails |
| `--oru-glow` | `rgba(57, 255, 20, 0.35)` | Bloom and shadows |
| `--oru-text` | `#D6FFD0` | Body text |
| `--oru-text-muted` | `#6FAF68` | Labels |
| `--oru-warn` | `#FFB000` | Permission prompts, warnings |
| `--oru-danger` | `#FF3B3B` | Errors, destructive actions |

Green carries the interface. Amber appears for permission prompts. Define the tokens once in the theme's stylesheet.

**Alert palette.** During an alert the whole interface turns neon red: every token swaps to its red twin with the same lightness, saturation and opacity, only the hue changes (to 357°). `--oru-primary` `#39FF14` becomes `#FF1420`. The change eases over 400 ms. See "Alerts" below and D19.

## Type

- Display and labels: a geometric technical face such as Oxanium or Rajdhani.
- Data and transcript: a monospace face such as JetBrains Mono.
- Bundle the font files in the app so ORU works offline. Use fonts with an open license.
- Labels in uppercase with wide letter spacing. Body text in sentence case.

## The orb

The orb is ORU's being. It sits at the centre and is the brightest object on screen.

| State | Behaviour |
| --- | --- |
| Idle | Slow breathing, gentle rotation, low glow |
| Listening | Surface tightens and brightens, reacts to mic level |
| Thinking | Inner structure spins up, glyphs stream inward |
| Speaking | Radius, glow and surface displacement follow the real TTS audio level |
| Muted | Dimmed with a clear muted mark |
| Error | Brief flicker in neon red (the whole interface is red during an alert), then back to idle |

Build it with shaders (noise-displaced sphere, fresnel rim, particle shell) so it looks volumetric. State changes blend over 300 to 500 ms. The speaking response must track syllables, so smooth the audio level a little and no more.

## Surrounding elements

- **Opon Ifá ring.** A wide ring around the orb, patterned on the carved border of the divination tray, drawn as line work. It rotates at a slow pace and splits into segments during thinking.
- **Gears and rings.** Concentric mechanisms at different depths and speeds. They react to activity: faster during thinking, a tick when a tool runs.
- **The mind.** A node graph (a stylised brain or neural lattice) that lights paths while ORU reasons and when memory recalls a fact.
- **System panels.** Live CPU, GPU, RAM, battery, network, time and date. Real numbers from the machine.
- **Transcript.** The last few lines of the conversation, older lines fading.
- **Tool cards.** A card per action ORU takes, using OpenDex's tool view system.
- **Typing panel.** A text box that slides in from the bottom on the Type button, the summon hotkey, or the voice command.
- **Controls.** Type, mute, Windows view and settings. Small, in a corner, visible at a glance.

## Alerts

Two levels (D19). Anything can raise one through the alert bus in `src/main/alerts.ts`.

| Level | When | What Tofa sees and hears |
| --- | --- | --- |
| Error | Something failed: the model is unreachable, a skill errored, voice input broke | The interface turns neon red. ORU says what went wrong in a sentence. A banner replaces the status pill. Clears after 10 s or on Dismiss. |
| Critical | A serious issue: an attack or intrusion, a security product reporting a threat, a system fault Tofa must act on | Red, plus the screen edge throbbing like a klaxon light, a blinking WARNING banner, and a two-tone alarm. ORU says "Warning! Warning! <issue>" and repeats it every 20 s. Speaks even when muted. |

**Silence and resolve.** Silencing stops the alarm, the blinking and the repeated warnings; the screen stays a steady red and the banner reads "Silenced", because the issue is still there. Ways to silence: the Silence button on the banner, Esc in ORU, the emergency-stop hotkey Ctrl+Alt+Backspace from any app, or typing or saying "silence", "stop the alarm", "quiet" and similar (handled before the model, so it works without one). When the issue is solved, its source clears the alert and ORU turns green by itself; Dismiss clears it by hand.

The alarm is synthesised with Web Audio (original, no samples). Its volume joins the sound settings in Phase 10.

## Odù glyphs

The 256 Odù of Ifá map to eight bits. Each Odù has two columns ("legs") of four marks, and each mark is single (I) or double (II).

- Encoding: bit 0 is a single mark, bit 1 is a double mark. Ogbè is four single marks.
- Layout: the right leg holds the high nibble and the left leg the low nibble, each read top to bottom.
- One component draws any Odù from a byte value.

Uses: columns of glyphs drifting as background data streams, a glyph cascade in the boot sequence, glyphs as loading and thinking indicators, a glyph derived from a hash as a marker on each tool card.

The glyphs are a visual motif. ORU does not present them as divination readings. Tofa decides the names, the order and any cultural detail.

## Motion

- Idle motion is slow and continuous. Nothing sits still, nothing shouts.
- Events get short, sharp accents (150 to 300 ms): a tool call, a wake word, an error.
- Ease in and out. No bounces.
- Depth comes from parallax between layers and from bloom.

## Sound

- Short original cues: wake, listening start, task done, error, view switch, boot.
- Synthesise them with the Web Audio API or use recordings with a clear open license.
- Quiet by default, with a volume control and an off switch.

## Boot sequence (Phase 10)

1. Black screen, a single green point.
2. Odù glyphs cascade and resolve into the ring.
3. Gears and panels draw in.
4. The orb ignites.
5. ORU greets Tofa.

Target: under six seconds, skippable with any key.

## Performance budget

- 60 fps with ORU focused. 30 fps or lower with another app focused. Paused in Windows view.
- Cap device pixel ratio for the 3D canvas.
- Idle GPU use under 15% on the RTX 5070.
- On battery: fewer particles, no bloom, lower frame rate.
