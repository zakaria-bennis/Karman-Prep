/*
 * Headless screenshots of the Library's three painted course-choice options (?hero=a, b, c),
 * for the founder's comparison. Needs a dev server: BASE=http://localhost:3157 by default.
 *
 *   node scripts/dev/hero-options-shots.mjs [out-dir]
 *
 * Saves <option>-<width>-<mode>.png for 1440 and 390 wide, light and dark (and night light at
 * 1440), then compare.png with the three side by side at 1440.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3157";
const OUT = process.argv[2] ?? "docs/overnight/reports/hero-options";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
mkdirSync(OUT, { recursive: true });

const OPTIONS = ["a", "b", "c"];
const RUNS = [
  { w: 1440, h: 900, mode: "light" },
  { w: 1440, h: 900, mode: "dark" },
  { w: 1440, h: 900, mode: "light", time: "night", name: "night" },
  { w: 390, h: 844, mode: "light" },
  { w: 390, h: 844, mode: "dark" },
];

/* The installed Chrome, run headless (no Playwright browser download needed). */
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? "chrome",
  headless: true,
});
const problems = [];

async function shoot(opt, run) {
  const ctx = await browser.newContext({
    viewport: { width: run.w, height: run.h },
    deviceScaleFactor: run.w < 500 ? 2 : 1,
    colorScheme: run.mode,
    reducedMotion: "no-preference",
  });
  /* The Challenge banner was closed today, so the choice shows straight away. */
  await ctx.addInitScript(() => {
    try {
      const d = new Date();
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      localStorage.setItem("karman-challenge-closed", day);
      sessionStorage.setItem("karman:painted-in", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${opt} ${run.w} ${run.mode}: ${e.message}`));
  const q = new URLSearchParams({ hero: opt });
  if (run.time) q.set("paint-time", run.time);
  await page.goto(`${BASE}/dashboard/student/library?${q}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#course-choice", { timeout: 30000 });
  /* Let the painting finish, the pictures paint in and their life begin. */
  await page.waitForTimeout(7000);
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (sideways > 0) problems.push(`${opt} ${run.w} ${run.mode}: ${sideways}px sideways scroll`);
  const file = path.join(OUT, `${opt}-${run.w}-${run.name ?? run.mode}.png`);
  await page.screenshot({ path: file });
  await ctx.close();
  return file;
}

for (const opt of OPTIONS) {
  for (const run of RUNS) {
    if (ONLY && !ONLY.includes(`${opt}-${run.w}-${run.name ?? run.mode}`)) continue;
    console.log("shot", await shoot(opt, run));
  }
}

if (!ONLY) {
  /* The comparison: the three 1440 light shots side by side, each labeled. */
  const ctx = await browser.newContext({ viewport: { width: 2160, height: 520 } });
  const page = await ctx.newPage();
  const { readFileSync } = await import("node:fs");
  const img = (o) =>
    `data:image/png;base64,${readFileSync(path.join(OUT, `${o}-1440-light.png`)).toString("base64")}`;
  const names = {
    a: "A. Two painted windows",
    b: "B. One split canvas",
    c: "C. Objects on a shelf",
  };
  await page.setContent(`<!doctype html><body style="margin:0;background:#16181d;font:600 22px system-ui;color:#fff">
    <div style="display:flex;gap:12px;padding:12px">${OPTIONS.map(
      (
        o
      ) => `<figure style="margin:0;flex:1"><figcaption style="padding:4px 2px 10px">${names[o]}</figcaption>
      <img src="${img(o)}" style="width:100%;display:block;border-radius:4px"></figure>`
    ).join("")}</div></body>`);
  await page.screenshot({ path: path.join(OUT, "compare.png"), fullPage: true });
  await ctx.close();
}

await browser.close();
if (problems.length) {
  console.log("PROBLEMS\n" + problems.join("\n"));
  process.exitCode = 1;
}
