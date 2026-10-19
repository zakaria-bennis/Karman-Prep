import { chromium, webkit, devices, expect } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const root = path.resolve("karman-calculator/src");
fs.mkdirSync("tmp/calculator", { recursive: true });
const server = http.createServer((req, res) => {
  const file = req.url === "/" ? "index.html" : path.basename(req.url);
  if (!["index.html", "calculator.js", "style.css"].includes(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  res.setHeader(
    "Content-Type",
    { html: "text/html", js: "text/javascript", css: "text/css" }[file.split(".").pop()] +
      "; charset=utf-8"
  );
  res.end(fs.readFileSync(path.join(root, file)));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  for (const [name, type, options] of [
    ["desktop", chromium, { viewport: { width: 1200, height: 800 } }],
    ["iphone", webkit, devices["iPhone 14"]],
  ]) {
    const browser = await type.launch();
    try {
      const page = await browser.newPage(options);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const url of [
        pathToFileURL(path.join(root, "index.html")).href,
        `http://127.0.0.1:${server.address().port}/`,
      ]) {
        await page.goto(url);
        const input = page.getByRole("textbox", { name: "Expression 1", exact: true });
        await input.fill("sin(30)+2^3");
        await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("8.5");
        await expect(page.locator("#karman-virtual-keypad")).toHaveAttribute("aria-hidden", "true");
        await input.fill("x^2+y^2=25");
        await expect(page.locator("canvas")).toHaveAttribute("aria-label", /1 plots/);
        await page.evaluate(() => window.KarmanEngineInstance.setTheme("dark"));
        await page.getByRole("button", { name: "Recenter graph", exact: true }).click();
        // Include the exact grid vertex at (5,0) to catch disconnected contours.
        for (const point of [
          [3, 4],
          [5, 0],
        ])
          await expect
            .poll(() =>
              page.evaluate((point) => {
                const e = window.KarmanEngineInstance;
                const p = e.project(...point),
                  scale = e.canvas.width / e.width;
                const pixels = e.context.getImageData(
                  Math.round(p.x * scale) - 5,
                  Math.round(p.y * scale) - 5,
                  11,
                  11
                ).data;
                for (let i = 0; i < pixels.length; i += 4)
                  if (pixels[i + 2] > pixels[i] + 30 && pixels[i + 2] > 100) return true;
                return false;
              }, point)
            )
            .toBe(true);
        await page.evaluate(() => window.KarmanEngineInstance.clearGraphExpressionsData());
        await expect(input).toHaveValue("");
      }
      await page.getByRole("textbox", { name: "Expression 1", exact: true }).fill("x^2+y^2=25");
      await page.screenshot({ path: `tmp/calculator/current-standalone-${name}.png` });
      assert.deepEqual(errors, []);
      console.log(
        `${name}: file URL, strict CSP, arithmetic, implicit painted curve, theme and cleanup passed`
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
