# Phase 5: Voice in

## Goal

Tofa talks to ORU. Push-to-talk works every time, local Whisper transcribes on the GPU, and "Hey Oru" wakes him hands-free.

## Read first

- `docs/PROGRESS.md`
- `docs/ARCHITECTURE.md`: "Voice"
- `AGENTS.md`: sections "Wake/STT" and "Free offline engines"
- `src/renderer/src/lib/dex/engines/` (`whisper-stt.ts`, `vosk-wake.ts`, `frame-capture.ts`) and the wake and capture paths in `lib/dex/use-dex.ts`

## Tasks

1. **Push-to-talk first.** Confirm the hotkey chosen in Phase 1 starts and ends capture from any app without errors, in both views. Fix what fails. This path is the fallback for everything below.
2. **Whisper on GPU.** Confirm `whisper-local` runs on WebGPU on the RTX card and log which backend is active. Test two or three model sizes with Tofa reading the same ten commands. Record speed and errors per model in `docs/PROGRESS.md`. Pick the default with him. Prefer a model that handles Nigerian English and Yorùbá names well.
3. **Correction table.** Apply a small map to transcripts before they reach the brain: "or you", "aura", "oro" at the start of a command become "Oru", plus entries Tofa adds. Editable in Settings.
4. **Wake word "Hey Oru".** Test in this order and stop at the first that works well:
   - Vosk grammar wake with "oru" and "hey oru".
   - Vosk grammar wake with phonetic stand-ins that the model knows.
   - A custom wake model run through the ONNX runtime the app already ships.
   Measure false wakes over ten minutes of background speech or music, and misses over twenty tries. Report the numbers and recommend one.
5. **Barge-in.** Confirm that saying the wake word while ORU speaks stops him and starts listening.
6. **Mic handling.** Mic picker in Settings, a clear muted state on the orb, and a plain spoken or on-screen message when no mic is found.
7. **Endpointing.** Tune the silence threshold so ORU stops listening soon after Tofa stops, without cutting him off mid-sentence.

## Constraints

- Speech recognition stays on the machine.
- No always-on recording to disk. Audio lives in memory for the current utterance and no longer.
- Ask before adding a native module or a dependency over a few megabytes.

## Acceptance checks

- Ten spoken commands through push-to-talk: at least nine transcribe well enough to act on.
- "Hey Oru" wakes ORU from normal speaking distance in at least eighteen of twenty tries, with two or fewer false wakes in ten minutes of background audio. Log the shortfall and the plan when it misses.
- End of speech to transcript on screen: under one second for a short command.
- Saying the wake word during a reply interrupts it.
- The whole loop works with the network off, using the current provider's failure message as the reply until Phase 6 adds the local brain.

## Stop and ask Tofa

- The wake word cannot hit the targets with any of the three approaches. Offer a different wake phrase.
- Model choice trades speed against accuracy and needs his call.

## Close out

Update `docs/PROGRESS.md` with the measurements, record the wake and model choices in `docs/DECISIONS.md`, and commit.
