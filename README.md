# ORU

ORU (short for Ọ̀rúnmìlà) is a personal voice assistant with a fullscreen
desktop interface for Windows 11. Speech recognition, the everyday model and
speech output run locally by default. ORU sends no usage data (see
[PRIVACY.md](PRIVACY.md)).

ORU is a work in progress. [docs/PROGRESS.md](docs/PROGRESS.md) tracks the
build phases, and [docs/VISION.md](docs/VISION.md) describes where it is going.

## Run it

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

| Command | Use |
| --- | --- |
| `pnpm typecheck` | Type-check the project |
| `pnpm build` | Production build into `out/` |
| `pnpm smoke:chat` | Test the agent loop without Electron |
| `pnpm dist` | Package the Windows installer |

## Hotkeys (Windows)

| Action | Keys |
| --- | --- |
| Push to talk | Ctrl+Shift+Space |
| Stop the current command | Ctrl+Alt+Backspace |
| Show or hide ORU | Ctrl+Alt+Space |

## Credits

ORU is a fork of [OpenDex](https://github.com/wassgha/opendex) by wassgha,
released under the MIT license. See [NOTICE.md](NOTICE.md) and
[LICENSE](LICENSE).
