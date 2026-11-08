import { build } from "/Users/zakariabennis/Karman-Prep/node_modules/vitest/node_modules/vite/dist/node/index.js";
import { createRequire } from "node:module";
import path from "node:path";
const root = "/Users/zakariabennis/Karman-Prep";
const harness = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.join(root, "package.json"));
const tailwindcss = require("tailwindcss");
const react = (await import("/Users/zakariabennis/Karman-Prep/node_modules/@vitejs/plugin-react/dist/index.js").catch(() => null))?.default;
await build({
  configFile: false,
  root: harness,
  base: "./",
  publicDir: false,
  logLevel: "info",
  plugins: react ? [react()] : [],
  esbuild: react ? undefined : { jsx: "automatic" },
  css: { postcss: { plugins: [tailwindcss({ config: path.join(root, "tailwind.config.ts") })] } },
  resolve: {
    alias: [
      { find: "@clerk/nextjs", replacement: path.join(harness, "platform.tsx") },
      { find: "@/app/appearance/actions", replacement: path.join(harness, "platform.tsx") },
      { find: "@/app/(app)/learn/quiz-actions", replacement: path.join(harness, "actions.ts") },
      { find: "@/app/learn/quiz-actions", replacement: path.join(harness, "actions.ts") },
      { find: "@/lib/sounds", replacement: path.join(harness, "platform.tsx") },
      { find: "@sentry/nextjs", replacement: path.join(harness, "platform.tsx") },
      { find: "next/navigation", replacement: path.join(harness, "platform.tsx") },
      { find: "next/link", replacement: path.join(harness, "link.tsx") },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production"), "process.env": "{}" },
  build: {
    outDir: process.env.OUT,
    emptyOutDir: true,
    assetsDir: "a",
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: true,
  },
});
