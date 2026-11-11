# Phase 8: Claude handoff

## Goal

ORU passes heavy tasks to Claude Desktop on Tofa's plan. Tofa says the task, ORU writes a full prompt and opens Claude with it loaded, and Tofa presses send. ORU also starts calls and email drafts through the system's own handlers.

## Read first

- `docs/PROGRESS.md`
- `docs/DECISIONS.md` (D2, D3, D9). These are the rules for this phase.
- `docs/ARCHITECTURE.md`: "Claude handoff"
- The deep link reference: https://support.claude.com/en/articles/14729294 (fetch it and confirm the URL formats and limits still match D3)
- `src/skills/open/` as the pattern, `src/skills/computer/skill.ts`

## Tasks

1. **`claude` skill.** One tool, `handToClaude`, with inputs: the task in Tofa's words, the surface (`chat`, `cowork` or `code`), and an optional folder or file path. It builds the prompt, URL-encodes it, keeps it under the documented length limit, and opens the matching `claude://` link with `shell.openExternal`.
2. **Prompt writer.** The local model expands a short spoken request into a complete prompt: the task, the context ORU has (names, dates, file paths, relevant memories once Phase 9 lands), the output Tofa wants, and for actions such as email the instruction to show a draft before sending. Keep a few templates for common cases (research, email, calendar, writing, code) in one data file.
3. **Spoken confirmation.** After the link opens, ORU says one short line telling Tofa the prompt is loaded and that he sends it.
4. **Guard.** ORU sends no keystrokes or clicks to Claude Desktop. Add a check in the `computer` skill that refuses input actions while Claude Desktop is the foreground window, and state the rule in the skill's system prompt.
5. **Routing.** Update ORU's system prompt and the instant-command list so research, email, calendar, long writing and coding route to `handToClaude`, and device control stays local. Add the handoff cases to `scripts/eval-brain.ts`.
6. **Setup guide.** Write `docs/CLAUDE-DESKTOP-SETUP.md`: the connectors and MCP servers Tofa should enable in Claude Desktop for mail, calendar, web research and local files, with the steps he carries out himself. Check Anthropic's current help pages before you write it and link each source. Do not guess at menu paths.
7. **`comms` skill.** Start a call by opening a `tel:` link (Windows Phone Link handles it when a phone is paired) or a WhatsApp link, and start an email by opening a `mailto:` link with the fields filled. Both are sensitive tools. ORU reads back the name and number or the recipient and subject before the prompt. Add a local contacts list (name, number, email) in Settings.

## Constraints

- No Claude Agent SDK, no headless Claude Code, no plan tokens, no API use of Tofa's subscription. See D2.
- No auto-send. Tofa presses send in Claude Desktop, and he presses call or send in the phone and mail apps.
- Do not put secrets, passwords or keys into a deep link.
- Contacts stay on the machine.

## Acceptance checks

- "ORU, research the best solar inverters for a Lagos flat": Claude Desktop opens a new chat with a full prompt in the box, unsent.
- "ORU, ask Claude to review this project": Claude Code opens on the folder Tofa names, prompt loaded.
- With Claude Desktop in front, ask ORU to click or type there through computer use: ORU refuses and explains.
- "Call <a saved contact>": ORU reads back the name and number, the permission prompt appears, and the call app opens after approval.
- "Email <a saved contact> about Friday's meeting": the mail app opens a draft with recipient and subject filled.
- `docs/CLAUDE-DESKTOP-SETUP.md` exists and each step links to a source.

## Stop and ask Tofa

- The deep link formats have changed from D3.
- Which phone setup he uses for calls (Phone Link, WhatsApp, or both).

## Close out

Update `docs/PROGRESS.md` and `docs/DECISIONS.md`, then commit.
