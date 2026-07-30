import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plain Vite build of the SAME renderer for the browser (no Electron). Deployed
// at rvren.github.io/buildboard/app/. Persistence falls back to localStorage
// because window.api (the preload bridge) doesn't exist in a browser.
export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  base: "/buildboard/app/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist-web"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          mermaid: ["mermaid"],
        },
      },
    },
  },
});
