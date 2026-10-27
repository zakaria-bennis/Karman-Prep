import { defineConfig, devices } from "@playwright/test";

// The quiz shell fixture: real shell components with local grading; nothing here ships in Next.
const PORT = Number(process.env.QUIZ_FIXTURE_PORT ?? 4319);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/quiz-shell",
  testMatch: /.*\.spec\.ts/,
  timeout: 45_000,
  outputDir: "tmp/quiz-shell/results",
  webServer: {
    command: "node tests/quiz-shell/fixture/server.mjs",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
  workers: 2,
  use: { baseURL: BASE_URL, launchOptions: { timeout: 20_000 } },
  reporter: [["list"]],
  projects: [
    { name: "quiz-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "quiz-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "quiz-safari", use: { ...devices["Desktop Safari"] } },
    { name: "quiz-iphone", use: { ...devices["iPhone 15 Pro Max"] } },
    { name: "quiz-ipad", use: { ...devices["iPad Pro 11"] } },
  ],
});
