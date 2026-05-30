import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { assistantApiDevPlugin } from "./server/assistantDevPlugin.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), assistantApiDevPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
