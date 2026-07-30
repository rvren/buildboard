import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
        output: { entryFileNames: "[name].js" },
      },
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
        "@main": resolve(__dirname, "src/main"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { "@shared": resolve(__dirname, "src/shared") },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html"),
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            motion: ["framer-motion"],
            mermaid: ["mermaid"],
          },
        },
      },
    },
  },
});
