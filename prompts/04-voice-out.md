# Phase 4: Voice out

## Goal

ORU speaks in a natural voice that runs on the laptop, the orb moves with the real sound of that voice, and ORU greets Tofa at startup.

## Read first

- `docs/PROGRESS.md`
- `docs/ARCHITECTURE.md`: "Voice"
- `docs/VISION.md`: "Persona"
- `docs/DECISIONS.md` (D5)
- `AGENTS.md`: "Config" (TTS engine selection) and "Themes" (the amplitude paragraph)
- `src/renderer/src/lib/dex/speech-engine.ts`, `lib/dex/tts-player.ts`, `lib/dex/realtime/pcm-player.ts` (the analyser pattern), `src/main/tts/elevenlabs.ts`

## Tasks

1. **Pick the local engine.** Kokoro is the first candidate (`@huggingface/transformers` is already a dependency). Check its current package and model options, compare one alternative, and test where it runs best: renderer with WebGPU or the main process. Measure time from text to first audio for a ten-word sentence. Report the numbers and recommend one. Wait for Tofa's approval.
2. **Add the engine.** Extend `TtsEngine` with the new value, implement it next to the existing engines, load the model on demand, cache it on disk, and stream sentence by sentence as the pipeline already does. Make it the default engine. Keep `elevenlabs` and `system` selectable.
3. **Voice choice.** Expose the engine's voices in Settings with a preview button. Shortlist three voices that fit the persona and let Tofa pick the default.
4. **Pronunciation table.** A small map applied before synthesis: "ORU" as "OH-roo", "Ọ̀rúnmìlà" as "aw-ROON-mee-lah", plus entries Tofa adds. Editable in Settings.
5. **Real amplitude.** Route TTS playback through an `AnalyserNode` and return its level from `getAmplitude()` while speaking in pipeline mode, replacing the synthetic envelope. Tune smoothing so the orb tracks syllables.
6. **Greeting.** On launch, after the interface is up, ORU greets Tofa by name with a line that fits the time of day. Use templates so the greeting needs no model call and lands fast. Add `assistant.userName` to the config (default `Tofa`) and a setting to turn the greeting off.
7. **Autoplay.** Set Electron's autoplay policy so the greeting plays without a click, and remove the audio-unlock overlay where it is no longer needed.

## Constraints

- Local by default. No text leaves the machine unless Tofa selects ElevenLabs.
- No voice cloning of real people.
- Ask before adding a native module.

## Acceptance checks

- With the network off, ORU speaks.
- Time to first audio for a short sentence is under one second after the model is warm. Log the number.
- The orb's motion follows the voice. Silence between sentences shows as stillness.
- Launch ORU: the greeting plays within a few seconds with the right name and time of day.
- "ORU" and "Ọ̀rúnmìlà" sound right to Tofa.

## Stop and ask Tofa

- No local engine meets the latency target on his hardware.
- The voice shortlist needs his ear.

## Close out

Update `docs/PROGRESS.md` (include the latency numbers), record the engine choice in `docs/DECISIONS.md`, and commit.
