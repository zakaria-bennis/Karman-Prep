// Quiz top bar lab: the real quiz shell (unchanged) with three restyled top bars and margins
// laid over it from options.css. Same setup as tests/quiz-shell/fixture/server.mjs.
// Run from the repo root:  node .impeccable/mocks/quiz-topbar/lab/server.mjs
// Then open http://127.0.0.1:4324/?option=a  (options: today, a, b, c; q=math|rw; set=end)
import { createViteServer as createServer } from "vitest/node";
import path from "node:path";
const root = process.cwd();
const lab = path.join(root, ".impeccable/mocks/quiz-topbar/lab");
const fixture = path.join(root, "tests/quiz-shell/fixture");
const calculatorFixture = path.join(root, "tests/calculator/fixture");
const server = await createServer({
  configFile: false,
  root: lab,
  publicDir: path.join(root, "public"),
  server: { host: "127.0.0.1", port: Number(process.env.LAB_PORT ?? 4324), strictPort: true, fs: { allow: [root] } },
  resolve: {
    alias: [
      { find: "@/app/learn/saved-question-actions", replacement: path.join(fixture, "actions.ts") },
      { find: "@clerk/nextjs", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "@/app/appearance/actions", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "@/lib/sounds", replacement: path.join(fixture, "sounds.ts") },
      { find: "@sentry/nextjs", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "next/navigation", replacement: path.join(calculatorFixture, "platform.tsx") },
      { find: "next/link", replacement: path.join(calculatorFixture, "link.tsx") },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  define: { "process.env.NODE_ENV": JSON.stringify("development") },
});
await server.listen();
server.printUrls();
