// Theme preview outside Electron: `pnpm preview:oru`, then open
// http://localhost:5174. Renders the ORU theme with fake data and a stubbed
// window.opendex, for design work in a browser (Claude's browser pane included).
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repo = resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": resolve(repo, "src/renderer/src"),
      "@skills": resolve(repo, "src/skills"),
    },
  },
  server: { port: 5174, strictPort: true, fs: { allow: [repo] } },
  plugins: [react(), tailwindcss()],
});
