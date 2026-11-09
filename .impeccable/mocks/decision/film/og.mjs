// Draws the Open Graph image of every page (1200 x 630) from the page's own title and description, in code:
// paper, the K mark, the title in Hanken Grotesk. Usage, from this folder with the preview server on :8766:
//   node og.mjs [port]   -> og/<page>.png
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/@playwright/test/index.mjs";
import { readFileSync, mkdirSync } from "node:fs";
const PORT = process.argv[2] || "8766";
const PAGES = ["index", "program", "private", "pricing", "free-test", "guarantee", "about", "faq", "map"];
mkdirSync("og", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const p of PAGES) {
  const html = readFileSync(`${p}.html`, "utf8");
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "Karman Prep";
  const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || "";
  const line = title.replace(/^Karman Prep: /, "");
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;800&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; width: 1200px; height: 630px; background: #f5f5f2; color: #12110f; font-family: "Hanken Grotesk", system-ui, sans-serif; display: grid; grid-template-rows: auto 1fr auto; padding: 64px 72px; box-sizing: border-box; }
      .mark { display: flex; align-items: center; gap: 18px; font-weight: 800; font-size: 34px; letter-spacing: -0.035em; }
      .mark svg { width: 52px; height: 52px; }
      h1 { margin: 0; align-self: center; font-size: ${line.length > 26 ? 78 : 92}px; font-weight: 800; letter-spacing: -0.045em; line-height: .96; max-width: 14ch; }
      p { margin: 0; font-size: 26px; font-weight: 600; color: #57534b; max-width: 40ch; line-height: 1.35; }
      .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 14px; background: #eba21f; }
    </style></head><body>
    <div class="mark"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#12110f"/><path d="M17 13h10v17.5L42.5 13h12L37 35l19 16H43.5L27 37v14H17z" fill="#eba21f"/></svg>Karman Prep</div>
    <h1>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h1>
    <p>${desc.replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 150)}${desc.length > 150 ? "…" : ""}</p>
    <div class="bar"></div></body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `og/${p}.png` });
  console.log(`og/${p}.png  ${line}`);
}
await browser.close();
