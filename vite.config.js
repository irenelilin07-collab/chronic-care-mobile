import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { apiDevPlugin } from "./server/apiDevPlugin.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
