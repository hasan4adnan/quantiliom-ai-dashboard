import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dashboard must run on http://localhost:5173 to stay distinct from the
// website (5500) and backend (5050). strictPort is left off so a stray
// process holding 5173 doesn't crash startup — Vite will pick the next free
// port and log it. Re-enable strictPort if exact-port-or-bust is required.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
  },
  preview: {
    host: "localhost",
    port: 5173,
  },
});
