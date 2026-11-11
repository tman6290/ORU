# Phase 9: Memory

## Goal

ORU remembers facts, preferences and past conversations across sessions, on this machine, and Tofa can see and delete what is stored.

## Read first

- `docs/PROGRESS.md`
- `docs/ARCHITECTURE.md`: "Memory"
- `src/main/config/store.ts` (how ORU stores files in `userData`), `src/main/agent/system-prompt.ts`, `src/main/agent/chat.ts`

## Tasks

1. **Storage choice.** Check which Node version this Electron build bundles and whether its built-in SQLite module is usable. Compare it with one pure JS or WASM option. Avoid a native module that needs a rebuild per Electron version. Recommend one and wait for Tofa's approval.
2. **Schema.** Tables for facts (subject, statement, source turn, timestamps), preferences, conversation summaries, and a full-text index for recall. Move contacts and workspaces into the same store if that simplifies Settings.
3. **Memory module.** `src/main/memory/` with `remember`, `recall`, `forget`, `summariseSession`. Write the code from scratch for this repo.
4. **`memory` skill.** Tools for the model: remember a fact Tofa states, recall by query, forget by id or query. `forget` is a sensitive tool.
5. **Recall in the loop.** Before each model turn, fetch the few memories most relevant to the transcript and add them to the system prompt, capped near 300 tokens. Start with full-text search. Note embedding search through Ollama as a later upgrade.
6. **Session summaries.** At session end or after idle time, the local model writes a three-line summary of the conversation and stores it.
7. **What not to store.** Passwords, keys, card numbers, and anything Tofa says after "don't remember this". Add a filter and a test for it.
8. **Memory viewer.** A Settings section that lists stored items with search, edit and delete, and a "wipe everything" button behind a confirmation.
9. **Mind graph.** Light a path in the theme's mind graph when a memory is recalled.

## Constraints

- All memory stays on the machine. No sync.
- The handoff prompt writer from Phase 8 may include relevant memories. Show Tofa which ones went into a prompt.

## Acceptance checks

- "Remember that my dev workspace uses VS Code and Chrome." Quit ORU, relaunch, ask "what's in my dev workspace?": ORU answers from memory.
- "Forget that": a permission prompt appears, and the item is gone from the viewer after approval.
- Tell ORU a fake password: nothing lands in the store.
- The memory viewer lists, edits and deletes entries.
- Recall adds under 100 ms to a turn. Log the number.

## Stop and ask Tofa

- The storage choice needs a native module after all.

## Close out

Update `docs/PROGRESS.md` and `docs/DECISIONS.md`, then commit.
