# Fix one bug

I'll describe one bug below this prompt: what I did, what I expected, what happened, and any error text.

1. Restate the bug in one sentence and name the two or three files to check first. Use `AGENTS.md` headings and a search to find them. Do not read the whole codebase.
2. Find the cause before you change code. Tell me the cause in plain words.
3. Make the smallest fix that solves it. No refactors, no extra features.
4. Run `pnpm typecheck`.
5. Tell me how to confirm the fix by hand.
6. Commit as `fix: <what changed>`. Add a line under "Known issues" in `docs/PROGRESS.md` if part of the bug remains.

Stop and ask me when the fix needs a design choice, a new dependency, or a change to a rule in `CLAUDE.md`.

The bug:
