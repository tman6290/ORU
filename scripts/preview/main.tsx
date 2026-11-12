// Fake window.opendex + props so the ORU theme renders in a plain browser.
// Keys: F8 cycles orb states (built into the theme). T adds a transcript line,
// A adds a tool action.
import "./preview.css";
import "./layout-check";

const fakeStats = () => ({
  cpu: 10 + Math.random() * 25,
  ramUsed: 11.6 * 1024 ** 3 + Math.random() * 1024 ** 3,
  ramTotal: 31.6 * 1024 ** 3,
  gpu: { util: Math.round(Math.random() * 20), tempC: 46, vramUsed: 1.2 * 1024 ** 3, vramTotal: 8 * 1024 ** 3, name: "GeForce RTX 5070 Laptop GPU" },
  net: { rxPerSec: Math.random() * 3 * 1024 ** 2, txPerSec: Math.random() * 300 * 1024 },
});

// Minimal stand-in for main's alert bus (src/main/alerts.ts).
type FakeAlert = { id: string; level: string; title: string; speech?: string; source: string; at: number; silenced?: boolean };
let alerts: FakeAlert[] = [];
const alertListeners = new Set<(a: FakeAlert[]) => void>();
const emitAlerts = () => alertListeners.forEach((l) => l([...alerts]));

(window as unknown as { opendex: unknown }).opendex = {
  raiseAlert: (a: Omit<FakeAlert, "at" | "id"> & { id?: string }) => {
    const id = a.id ?? String(Date.now());
    const speech = a.speech ?? (a.level === "critical" ? `Warning! Warning! ${a.title}.` : `${a.title}.`);
    alerts = [...alerts.filter((x) => x.id !== id), { ...a, id, speech, at: Date.now() }];
    emitAlerts();
    if (a.level === "error") setTimeout(() => { alerts = alerts.filter((x) => x.id !== id); emitAlerts(); }, 10_000);
  },
  silenceAlerts: () => {
    alerts = alerts.map((a) => ({ ...a, silenced: true }));
    emitAlerts();
  },
  ackAlert: (id: string) => {
    alerts = alerts.filter((x) => x.id !== id);
    emitAlerts();
  },
  getAlerts: async () => [...alerts],
  onAlerts: (fn: (a: FakeAlert[]) => void) => {
    alertListeners.add(fn);
    return () => alertListeners.delete(fn);
  },
  platform: "win32",
  getSystemStats: async () => fakeStats(),
  getShellView: async () => ({ active: true, view: "oru" }),
  onShellView: () => () => {},
  setShellView: (v: string) => console.log("[preview] setShellView", v),
};

const { createRoot } = await import("react-dom/client");
const { useEffect, useState, createElement } = await import("react");
const theme = (await import("../../src/renderer/src/components/themes/oru/index")).default;

function Preview() {
  const [transcript, setTranscript] = useState([
    { id: "1", role: "user" as const, content: "Open my coding workspace." },
    { id: "2", role: "assistant" as const, content: "Opening VS Code, Chrome and the terminal on the left screen." },
  ]);
  const [tools, setTools] = useState<{ id: string; name: string; input: unknown; result: unknown; status: "running" | "done" | "error" }[]>([
    { id: "t1", name: "open", input: { target: "Visual Studio Code" }, result: null, status: "done" },
  ]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "t") setTranscript((t) => [...t, { id: String(Date.now()), role: t.length % 2 ? "user" : "assistant", content: "Line " + t.length + ": the quick brown fox." }]);
      if (e.key === "a") setTools((t) => [...t, { id: String(Date.now()), name: "open", input: { target: "Chrome" }, result: null, status: "running" }]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return createElement(theme.Component, {
    name: "ORU",
    wakeWord: "oru",
    status: "listening_wake",
    transcript,
    liveCaption: "",
    spokenCaption: "",
    getAmplitude: () => 0,
    toolInvocations: tools,
    isMuted: false,
    briefingActive: false,
    unsupported: false,
    canPushToTalk: false,
    onPushToTalk: () => {},
    onSubmitText: (t: string) => console.log("[preview] submit", t),
    toggleMute: () => {},
    onOpenSettings: () => console.log("[preview] settings"),
    onMinimize: () => {},
    onNewConversation: () => {},
  });
}

createRoot(document.getElementById("root")!).render(createElement(Preview));
