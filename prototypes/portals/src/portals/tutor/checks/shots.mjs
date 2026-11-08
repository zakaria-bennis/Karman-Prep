// Screenshots of every tutor screen in every gallery state, at phone 440x956,
// narrow 375x812, iPad 834x1194 and desktop 1440x900, light and dark, into
// prototypes/portals/shots/tutor/ (gitignored), with a sideways-scroll check
// and the page's console errors. A copy of scripts/shots.mjs filtered to this
// portal; the dev server must be up on 127.0.0.1:5174. Run from prototypes/portals:
//   node src/portals/tutor/checks/shots.mjs [--only today,student] [--states long-time] [--devices phone] [--modes dark]
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tutorRoutes } from "../routes.ts";

const OUT = fileURLToPath(new URL("../../../../shots/tutor/", import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const only = arg("only", tutorRoutes.map((r) => r.id).filter((id) => id !== "portal"));
const states = arg("states", ["long-time", "first-day", "empty", "loading", "error", "locked"]);
const devices = arg("devices", ["phone", "narrow", "ipad", "desktop"]);
const modes = arg("modes", ["light", "dark"]);
const DEVICES = {
  phone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ipad: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const targets = [];
for (const id of only) for (const state of states) for (const device of devices) for (const mode of modes)
  targets.push({ id, state, device, mode, url: `${BASE}/#/screen/tutor/${id}?portal=tutor&screen=${id}&role=tutor&device=${device}&mode=${mode}&state=${state}&bare=1` });

const browser = await chromium.launch();
const results = [];
let bad = 0;
async function shoot(t) {
  const page = await browser.newPage({ ...DEVICES[t.device], colorScheme: t.mode });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  await page.goto(t.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const file = path.join(OUT, t.id, `${t.state}-${t.device}-${t.mode}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  const [sw, iw, h1s] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.querySelectorAll("h1").length]);
  const sideways = sw > iw;
  if (sideways) bad++;
  results.push({ ...t, file, sideways, h1s, errors });
  console.log(`${t.id}/${t.state}-${t.device}-${t.mode} ${sideways ? `SIDEWAYS ${sw}>${iw}` : "ok"} h1=${h1s}${errors.length ? ` errors ${errors.length}: ${errors[0]}` : ""}`);
  await page.close();
}
for (let i = 0; i < targets.length; i += 4) await Promise.all(targets.slice(i, i + 4).map(shoot));
await browser.close();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "summary.json"), JSON.stringify(results, null, 1));
console.log(`${targets.length} shots in ${OUT}${bad ? `, ${bad} with sideways scroll` : ", no sideways scroll"}, ${results.filter((r) => r.errors.length).length} pages with console errors`);
process.exit(bad ? 1 : 0);
