import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import { fileURLToPath } from "node:url";
import tailwindConfig from "./tailwind.config";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Inline PostCSS on purpose: Vite's config search stops at this folder's
  // package.json, so nothing from the app's postcss.config.mjs is picked up,
  // and an inline object makes that explicit and cwd-independent.
  css: { postcss: { plugins: [tailwindcss(tailwindConfig)] } },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: { outDir: "dist", sourcemap: false },
});
