// Browser integration fixture: real quiz components + the local math engine; only server
// persistence/navigation are replaced. No test route or backdoor ships in Next.
import { createViteServer as createServer } from "vitest/node";
import path from "node:path";
const root = process.cwd();
const fixture = path.join(root, "tests/calculator/fixture");
const server = await createServer({
  configFile: false,
  root: fixture,
  publicDir: path.join(root, "public"),
  server: {
    host: process.env.CALCULATOR_FIXTURE_HOST ?? "127.0.0.1",
    port: Number(process.env.CALCULATOR_FIXTURE_PORT ?? 4318),
    strictPort: true,
    fs: { allow: [root] },
  },
  resolve: {
    alias: [
      {
        find: "@/app/learn/catalog-quiz-actions",
        replacement: path.join(fixture, "catalog-actions.ts"),
      },
      { find: "@clerk/nextjs", replacement: path.join(fixture, "platform.tsx") },
      { find: "@/app/appearance/actions", replacement: path.join(fixture, "platform.tsx") },
      { find: "@/app/learn/quiz-actions", replacement: path.join(fixture, "actions.ts") },
      { find: "@/lib/sounds", replacement: path.join(fixture, "platform.tsx") },
      { find: "@sentry/nextjs", replacement: path.join(fixture, "platform.tsx") },
      { find: "next/navigation", replacement: path.join(fixture, "platform.tsx") },
      { find: "next/link", replacement: path.join(fixture, "link.tsx") },
      {
        find: "@/app/learn/daily-challenge-actions",
        replacement: path.join(fixture, "daily-actions.ts"),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
});
await server.listen();
