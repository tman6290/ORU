# Phase 6: Brain

## Goal

A local model served by Ollama answers Tofa and calls tools, at zero cost per command, with ORU's persona.

## Read first

- `docs/PROGRESS.md` (VRAM total, Whisper model chosen in Phase 5)
- `docs/ARCHITECTURE.md`: "Brain" and "Request flow"
- `docs/VISION.md`: "Persona"
- `docs/DECISIONS.md` (D2, D4)
- `AGENTS.md`: section "LLM providers"
- `src/main/config/llm-providers.ts`, `src/main/agent/llm/resolve-model.ts`, `src/main/agent/system-prompt.ts`, `src/main/agent/chat.ts`

## Tasks

1. **Ollama provider.** Add `ollama` to `LlmProvider` and `LLM_PROVIDERS` (kind local, auth none, tools supported). Resolve it in `resolve-model.ts` with the AI SDK's OpenAI-compatible client pointed at a configurable base URL (default `http://localhost:11434/v1`). Check the AI SDK's current docs for the right package and options. Make `ollama` the default provider.
2. **Health and guidance.** Detect whether Ollama is installed, running, and has the chosen model. When something is missing, ORU says what to do in one sentence and Settings shows the same with a retry button. List installed models in the picker by querying Ollama.
3. **Pick the model with data.** Write `scripts/eval-brain.ts`: twenty commands covering small talk, tool calls with arguments (open an app, set volume, switch view), a two-step task, and three requests that belong to the Claude handoff. Check Ollama's library for current small models that support tool calling. Run three candidates that fit beside Whisper and the 3D scene in the VRAM recorded in Phase 1. Report tool-call accuracy, time to first token, and VRAM in use. Recommend one and let Tofa choose.
4. **Keep it fast.** Small context window, a low step limit for local turns, and a keep-alive setting so the model stays loaded during a session and unloads after idle time. Make each one a config value.
5. **Persona.** Write ORU's system prompt from `VISION.md`: name, character, short spoken replies, say-then-do for sensitive actions, honest limits. Include the routing rule: research, email, calendar, long writing and coding go to the Claude handoff (the tool arrives in Phase 8, so until then ORU says the task needs Claude).
6. **Leave the other providers working.** Anthropic, OpenAI and gateway stay as optional API-key providers, off by default.

## Constraints

- Hard rule 1 applies. No Agent SDK, no Claude Code headless, no plan login.
- The model choice must leave VRAM headroom. If the three workloads do not fit, say so and propose the trade (smaller Whisper, smaller chat model, or CPU for one of them).
- Do not name a model in code as a fixed constant. It is a config default.

## Acceptance checks

- With the network off, Tofa asks three questions and gets spoken answers.
- "Open the calculator" calls the `open` tool and the permission prompt appears.
- Transcript to first spoken word for a simple command: under 2.5 seconds with the model warm. Log the number.
- Stop Ollama, then speak: ORU explains the problem in one sentence and recovers after Ollama restarts.
- `pnpm tsx scripts/eval-brain.ts` prints a results table.
- A search for `claude-agent-sdk` in the repo returns nothing.

## Stop and ask Tofa

- No candidate reaches useful tool-call accuracy. Offer the options: a larger model with slower replies, or an optional API-key provider for hard commands.

## Close out

Update `docs/PROGRESS.md` with the eval table and timings, record the model choice in `docs/DECISIONS.md`, and commit.
