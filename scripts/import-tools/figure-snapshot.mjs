// Renders figure review snapshots: LEFT original.png, RIGHT the real student quiz render
// (/dev/figure-review/render, dark, 1280 wide), as one JPEG per figure.
// Called by `k figures snapshot` with a jobs JSON file; prints one JSON line per result.
// usage: node figure-snapshot.mjs <jobs.json> <base-url>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");

const [jobsFile, base] = process.argv.slice(2);
const jobs = JSON.parse(readFileSync(jobsFile, "utf8"));
const MAX_H = 900;
const MAX_W = 2000;
const GAP = 6;
const TARGET = 400 * 1024;

async function compose(leftPath, shot) {
  const left = sharp(leftPath).flatten({ background: "#ffffff" });
  const lm = await left.metadata();
  const rm = await sharp(shot).metadata();
  // Same height for both, at most MAX_H, and the pair no wider than MAX_W.
  const ratio = lm.width / lm.height + rm.width / rm.height;
  const h = Math.floor(Math.min(MAX_H, (MAX_W - GAP) / ratio));
  const lw = Math.round((lm.width / lm.height) * h);
  const rw = Math.round((rm.width / rm.height) * h);
  const lbuf = await sharp(leftPath)
    .flatten({ background: "#ffffff" })
    .resize(lw, h)
    .png()
    .toBuffer();
  const rbuf = await sharp(shot).resize(rw, h).png().toBuffer();
  const base = sharp({
    create: { width: lw + GAP + rw, height: h, channels: 3, background: "#808080" },
  }).composite([
    { input: lbuf, left: 0, top: 0 },
    { input: rbuf, left: lw + GAP, top: 0 },
  ]);
  const raw = await base.png().toBuffer();
  let out;
  for (const q of [82, 74, 66, 58, 50]) {
    out = await sharp(raw).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (out.length <= TARGET) break;
  }
  return out;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
});
let page;
async function freshPage() {
  if (page) await page.close().catch(() => undefined);
  page = await context.newPage();
  // Not part of the quiz render: the analytics consent banner and Next's dev indicator.
  await page.addInitScript(() => {
    const css = document.createElement("style");
    css.textContent =
      "[aria-labelledby='replay-consent-title'], nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(css));
  });
}
await freshPage();
const { writeFileSync } = await import("node:fs");
let n = 0;
for (const job of jobs) {
  // A long-lived tab leaks memory and eventually crashes: use a new one every 40 items.
  if (n++ % 40 === 39) await freshPage();
  try {
    const res = await page.goto(
      `${base}/dev/figure-review/render?id=${encodeURIComponent(job.id)}`,
      {
        waitUntil: "load",
        timeout: 90000,
      }
    );
    if (!res || !res.ok()) throw new Error(`render route ${res ? res.status() : "no response"}`);
    await page.waitForSelector("#figure-render [class*='origin-top-left']", { timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((i) =>
          i.complete
            ? null
            : new Promise((r) => {
                i.onload = i.onerror = r;
              })
        )
      );
    });
    const broken = await page.evaluate(
      () => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length
    );
    if (broken) throw new Error(`${broken} image(s) failed to load`);
    await page.waitForTimeout(300);
    const shot = await page.locator("#figure-render").screenshot({ type: "png" });
    const jpg = await compose(job.original, shot);
    writeFileSync(job.out, jpg);
    console.log(JSON.stringify({ id: job.id, ok: true, bytes: jpg.length }));
  } catch (e) {
    await freshPage();
    console.log(
      JSON.stringify({ id: job.id, ok: false, error: String(e.message || e).split("\n")[0] })
    );
  }
}
await browser.close();
