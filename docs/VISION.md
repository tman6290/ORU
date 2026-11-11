# ORU: vision

## The idea

ORU is short for Ọ̀rúnmìlà, the Yorùbá deity of knowledge, divination and wisdom. ORU turns Tofa's laptop into a living workspace: an animated interface that fills the screen, greets him by voice, listens, talks back, opens his apps, and hands heavy work to Claude.

Tofa sees the standard Windows desktop when he asks for it ("switch to Windows view"). The rest of the time, ORU is the desktop.

## The experience, in Tofa's terms

1. **A constant animated interface.** A floating tech orb at the centre represents ORU's being. Around it sit a "mind" visual, rotating gear and ring mechanisms, and live system panels. The main colour is neon green.
2. **The orb is alive.** It pulses with ORU's voice while he speaks, and shows distinct idle, listening and thinking states.
3. **A greeting on arrival.** ORU greets Tofa in a natural voice when the laptop starts.
4. **Voice first, typing on request.** Tofa talks to ORU. A visible button brings up a text box, and so does saying "I want to type".
5. **ORU is the desktop.** Apps and windows open above the ORU interface, which keeps running behind them. The taskbar and desktop icons stay out of sight until Tofa says "switch to Windows view".
6. **ORU acts.** He opens apps and groups of apps, arranges windows, and controls the system.
7. **ORU delegates to Claude.** For email, calls, research and long writing, ORU prepares the request and passes it to Claude Desktop, which runs on Tofa's existing plan with its connectors and MCP servers. Tofa presses send.
8. **Spectacular.** The whole thing should feel like stepping into a command centre: boot sequence, sound, motion, depth.

## Persona

- Name: ORU. Say it "OH-roo". Full name Ọ̀rúnmìlà, said "aw-ROON-mee-lah".
- Character: calm, wise, precise, with dry wit. A counsellor more than a servant.
- Address: calls the user "Tofa".
- Spoken replies run one or two sentences. Detail goes on screen.
- ORU says what he is about to do before a sensitive action, and reports the result after.
- ORU admits what he cannot do and offers the Claude handoff when a task exceeds the local model.

## Who it serves

One user (Tofa) on one machine: Lenovo Legion 5 Pro, Windows 11, 32 GB RAM, NVIDIA RTX 5070 laptop GPU. The finished build also serves as a Wolban Tech portfolio case study, so the code stays clean and the look stays original.

## Out of scope for now

- macOS and Linux shell mode (the app should still compile there).
- Multiple monitors beyond the primary display.
- Mobile companion app.
- Any hosted or multi-user service.
