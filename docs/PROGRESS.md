# Progress

Claude Code: read this file at the start of each session and update it at the end.

## Current state

- Phase in progress: 1 (not started)
- App runs on Tofa's machine: unknown
- Last session: none

## Phases

- [ ] 1. Baseline: run the fork on Windows, remove analytics and auto-update, rebrand to ORU
- [ ] 2. Shell: fullscreen desktop layer, hidden taskbar, Windows view toggle, safe restore
- [ ] 3. Face: the ORU theme (orb, mind and gear visuals, Odù glyphs, live system panels)
- [ ] 4. Voice out: local neural voice, real audio driving the orb, spoken greeting
- [ ] 5. Voice in: push-to-talk, local Whisper on GPU, "Hey Oru" wake word
- [ ] 6. Brain: Ollama provider, model choice for this GPU, ORU persona
- [ ] 7. Skills: apps, workspaces, windows, system, typing panel, view switching, instant commands
- [ ] 8. Claude handoff: deep links, Claude Desktop connector setup guide, calls and email drafts
- [ ] 9. Memory: local store for facts, preferences and conversation summaries
- [ ] 10. Polish and ship: boot sequence, sound, power modes, launch at login, installer, README

## Session log

Add one entry per session, newest first.

```
### YYYY-MM-DD, Phase N
Done:
Not done:
Decisions: (also add to DECISIONS.md)
Manual tests for Tofa:
Next step:
```

## Open questions for Tofa

- (none yet)

## Known issues

- (none yet)

## Measurements

Record numbers here as phases produce them.

| Metric | Target | Measured |
| --- | --- | --- |
| VRAM total (nvidia-smi) | n/a | |
| Idle GPU use, ORU view | under 15% | |
| Frame rate, ORU focused | 60 fps | |
| Wake to listening | under 0.5 s | |
| End of speech to transcript | under 1.0 s | |
| Transcript to first spoken word (simple command) | under 2.5 s | |
| Boot to greeting | under 8 s after login | |
