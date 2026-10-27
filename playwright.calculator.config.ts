import { defineConfig, devices } from "@playwright/test";

// The fixture server's port (tests/calculator/fixture/server.mjs reads the same variable).
const PORT = Number(process.env.CALCULATOR_FIXTURE_PORT ?? 4318);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/calculator",
  timeout: 45_000,
  outputDir: "tmp/calculator/results",
  webServer: {
    command: "node tests/calculator/fixture/server.mjs",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
  workers: 1,
  use: { baseURL: BASE_URL, launchOptions: { timeout: 20_000 } },
  reporter: [["list"], ["html", { outputFolder: "tmp/calculator/report", open: "never" }]],
  projects: [
    { name: "calculator-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "calculator-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "calculator-safari", use: { ...devices["Desktop Safari"] } },
    { name: "calculator-android", use: { ...devices["Pixel 7"] } },
    { name: "calculator-ios", use: { ...devices["iPhone 14"] } },
  ],
});
