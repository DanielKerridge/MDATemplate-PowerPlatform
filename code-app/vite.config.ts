import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react(), powerApps()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@generated": path.resolve(__dirname, "./src/generated"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-fluent": ["@fluentui/react-components", "@fluentui/react-icons"],
          "vendor-data": ["@tanstack/react-query", "zustand"],
        },
      },
    },
  },
});
