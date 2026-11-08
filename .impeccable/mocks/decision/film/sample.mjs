// Screenshots the landing page at n evenly spaced scroll positions (frame-exact ?rec=1 mode).
// Needs the preview server on :8765. Usage: node sample.mjs <width> <height> <n> <outprefix>
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
const [w, h, n, out] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://localhost:8765/film/index.html?rec=1");
await p.waitForTimeout(2500);
const max = await p.evaluate(() => window.__max());
for (let i = 0; i < n; i++) {
  const y = Math.round((max * i) / (n - 1));
  await p.evaluate((y) => window.__go(y), y);
  await p.waitForTimeout(350);
  await p.screenshot({
    path: `${out}-${String(i).padStart(2, "0")}.jpg`,
    type: "jpeg",
    quality: 70,
  });
}
console.log("max", max);
await b.close();
