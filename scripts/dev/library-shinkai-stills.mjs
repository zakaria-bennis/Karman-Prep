/*
 * Still frames of the Shinkai-style Library opening, for the founder to approve (2026-11-08).
 * Renders /dev/library-shinkai (no database, no sign-in) at 1440x900 and saves PNGs to
 * docs/overnight/reports/library-shinkai/. One browser, one page at a time.
 *   node scripts/dev/library-shinkai-stills.mjs     (dev server on BASE, default :3163)
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3163";
const OUT = "docs/overnight/reports/library-shinkai";
const FRAMES = [
  ["01-sky-day", "frame=sky&time=day"],
  ["02-sky-sunset", "frame=sky&time=sunset"],
  ["03-sky-night", "frame=sky&time=night"],
  ["04-sky-day-hover-math", "frame=sky&time=day&hover=math"],
  ["05-sky-day-hover-reading", "frame=sky&time=day&hover=rw"],
  ["06-descent-sunset", "frame=descent&time=sunset"],
  ["07-observatory-day", "frame=observatory&time=day"],
  ["08-observatory-night", "frame=observatory&time=night"],
  ["09-library-day", "frame=library&time=day"],
  ["10-library-night", "frame=library&time=night"],
  ["11-box-observatory-day", "frame=box&time=day"],
];
const only = process.argv[2] ?? "";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const report = [];
for (const [name, q] of FRAMES) {
  if (only && !name.includes(only)) continue;
  const night = q.includes("night");
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: night ? "dark" : "light",
  });
  /* Decline the session-replay consent bar so it doesn't cover the picture. */
  await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: BASE }]);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("karman:painted-in", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const time = /time=(\w+)/.exec(q)?.[1] ?? "day";
  await page.goto(`${BASE}/dev/library-shinkai?${q}&paint-time=${time}`, {
    waitUntil: "load",
    timeout: 120000,
  });
  await page.waitForSelector("[data-ready]", { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  report.push({ name, errors });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report));
