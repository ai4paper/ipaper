import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api/langgraph": {
        target: "http://localhost:2024",
        rewrite: (path) => path.replace(/^\/api\/langgraph/, ""),
        changeOrigin: true,
      },
    },
  },
});
