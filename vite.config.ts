import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Tableau-Extension-Calander-Demo02/",
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser"
  }
});
