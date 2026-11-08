// Quiz shell fixture: the real shell with local grading; only server actions and platform
// modules are replaced. No test route ships in Next. QUIZ_FIXTURE_HOST=0.0.0.0 serves it on the
// local network so a real iPhone or iPad can open it.
import { createViteServer as createServer } from "vitest/node";
import path from "node:path";
const root = process.cwd();
const fixture = path.join(root, "tests/quiz-shell/fixture");
const calculatorFixture = path.join(root, "tests/calculator/fixture");
const server = await createServer({
  configFile: false,
  root: fixture,
  publicDir: path.join(root, "public"),
  server: {
    host: process.env.QUIZ_FIXTURE_HOST ?? "127.0.0.1",
    port: Number(process.env.QUIZ_FIXTURE_PORT ?? 4319),
    strictPort: true,
    fs: { allow: [root] },
  },
  resolve: {
    alias: [
      { find: "@/app/learn/saved-question-actions", replacement: path.join(fixture, "actions.ts") },
      { find: "@clerk/nextjs", replacement: path.join(calculatorFixture, "platform.tsx") },
      {
        find: "@/app/appearance/actions",
        replacement: path.join(calculatorFixture, "platform.tsx"),
      },
      { find: "@/lib/sounds", replacement: path.join(fixture, "sounds.ts") },
      { find: "@sentry/nextjs", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "next/navigation", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "next/link", replacement: path.join(calculatorFixture, "link.tsx") },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
});
await server.listen();
server.printUrls();
