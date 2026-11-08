// Samples the primary glass button's rendered pixels under its label in both
// modes and every theme, over the current background world, and reports the
// contrast between the label ink and the darkest and lightest pixel behind it.
// The filter bends a live backdrop, so this is measured in the browser, not
// computed. node scripts/glass-contrast.mjs [--bg contour]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const data = JSON.parse(readFileSync(fileURLToPath(new URL("../src/design-system/themes.json", import.meta.url)), "utf8"));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const i = process.argv.indexOf("--bg");
const bg = i > 0 ? process.argv[i + 1] : "contour";
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
let worst = 99;
for (const t of data.themes) {
  for (const recipe of ["refract", "frost"]) {
    await page.goto(`${BASE}/#/system?theme=${t.id}&glass=${recipe}&bg=${bg}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const btn = page.locator(`button[data-recipe="${recipe}"]`, { hasText: "Start Your Daily 10" }).first();
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await btn.boundingBox();
    // Hide the label so the sampled pixels are the glass alone, then restore it.
    await btn.evaluate((b) => (b.querySelector("span:last-child").style.visibility = "hidden"));
    const png = await page.screenshot({ clip: { x: box.x + 12, y: box.y + 8, width: box.width - 24, height: box.height - 16 } });
    await btn.evaluate((b) => (b.querySelector("span:last-child").style.visibility = ""));
    const stats = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let dark = [255, 255, 255], light = [0, 0, 0], sum = [0, 0, 0], n = 0;
      const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
      for (let k = 0; k < d.length; k += 4) {
        const p = [d[k], d[k + 1], d[k + 2]];
        if (lum(p) < lum(dark)) dark = p;
        if (lum(p) > lum(light)) light = p;
        sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
      }
      return { dark, light, mean: sum.map((x) => Math.round(x / n)) };
    }, png.toString("base64"));
    const ink = rgb(t.accentInk);
    const r = Math.min(ratio(ink, stats.dark), ratio(ink, stats.light));
    worst = Math.min(worst, r);
    console.log(`${t.id.padEnd(12)} ${recipe.padEnd(8)} ink ${t.accentInk} mean rgb(${stats.mean}) darkest ${ratio(ink, stats.dark).toFixed(2)} lightest ${ratio(ink, stats.light).toFixed(2)} ${r < 4.5 ? "UNDER 4.5" : "ok"}`);
  }
}
await browser.close();
console.log(`worst ${worst.toFixed(2)}:1 over ${bg}`);
process.exit(worst < 4.5 ? 1 : 0);
