// Contact sheets of the tutor screenshots: one sheet per screen with every
// state, device and mode, so every file gets looked at. Reads shots/tutor/,
// writes shots/tutor/_sheets/<screen>.png (via an html file beside it, so file:// images load). node src/portals/tutor/checks/sheets.mjs
import { chromium } from "playwright";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("../../../../shots/tutor/", import.meta.url));
const OUT = path.join(ROOT, "_sheets");
await mkdir(OUT, { recursive: true });
const screens = (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name);
const STATES = ["long-time", "first-day", "empty", "loading", "error", "locked"];
const COLS = ["desktop-dark", "desktop-light", "ipad-dark", "ipad-light", "phone-dark", "phone-light", "narrow-dark", "narrow-light"];
const W = { desktop: 320, ipad: 150, phone: 100, narrow: 90 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1 });
for (const screen of screens) {
  const cells = STATES.map((state) => `<tr><th>${state}</th>${COLS.map((c) => { const f = pathToFileURL(path.join(ROOT, screen, `${state}-${c}.png`)).href; const w = W[c.split("-")[0]]; return `<td><img src="${f}" style="width:${w}px" alt=""><div>${c}</div></td>`; }).join("")}</tr>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;font:11px system-ui;color:#000}table{border-collapse:collapse}td,th{padding:4px;vertical-align:top;text-align:left}img{display:block;border:1px solid #333}h1{margin:6px;font-size:14px}</style><h1>${screen}</h1><table>${cells}</table>`;
  const htmlFile = path.join(OUT, `${screen}.html`);
  await writeFile(htmlFile, html);
  await page.goto(pathToFileURL(htmlFile).href);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${screen}.png`), fullPage: true });
  console.log(`sheet ${screen}`);
}
await browser.close();
