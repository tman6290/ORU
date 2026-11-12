// Display labels for the global hotkeys registered in src/main/index.ts.
// Keep these in sync with registerPushToTalkHotkey / registerInterruptHotkey.
const platform = typeof window !== "undefined" ? window.opendex?.platform : undefined;

export const IS_MAC = platform === "darwin";
export const IS_WIN = platform === "win32";

/** Push-to-talk: CommandOrControl+Shift+Space. */
export const PTT_HINT = IS_MAC ? "⌘⇧Space" : "Ctrl+Shift+Space";

/** Emergency stop: Ctrl+Alt+Backspace on Windows, ⌘/Ctrl+Esc elsewhere. */
export const STOP_HINT = IS_MAC ? "⌘⎋" : IS_WIN ? "Ctrl+Alt+Backspace" : "Ctrl+Esc";

/** Shell view toggle (Windows only): Ctrl+Alt+W, falling back to Ctrl+Alt+D. */
export const VIEW_HINT = "Ctrl+Alt+W";
