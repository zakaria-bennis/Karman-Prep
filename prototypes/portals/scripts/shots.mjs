// Screenshots of the gallery, the kitchen sink and every registered screen at
// the four device sizes in light and dark, into shots/ (gitignored), and a
// sideways-scroll check on each. The dev server must be up on 127.0.0.1:5174.
//   node scripts/shots.mjs [--only start,system,screens] [--themes observatory,ivory] [--devices phone,desktop]
import { chromium } from "playwright"; // resolved from the repo root's node_modules
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ROUTES, SWITCHES } from "../src/gallery/routes.ts";

const OUT = fileURLToPath(new URL("../shots/", import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const only = arg("only", ["start", "system", "screens"]);
const themes = arg("themes", []);
const devices = arg("devices", SWITCHES.device);

const DEVICES = {
  phone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ipad: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const targets = [];
const q = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
for (const device of devices) for (const mode of ["light", "dark"]) {
  const themeList = themes.length ? themes : [""];
  for (const theme of themeList) {
    const tag = theme || mode;
    if (only.includes("start")) targets.push({ name: `start/${device}-${tag}`, device, mode, url: `${BASE}/#/?${q({ device, mode, theme })}` });
    if (only.includes("system")) targets.push({ name: `system/${device}-${tag}`, device, mode, url: `${BASE}/#/system?${q({ mode, theme })}`, full: true });
    if (only.includes("screens")) for (const r of ROUTES) targets.push({ name: `${r.portal}/${r.id}/${device}-${tag}`, device, mode, url: `${BASE}/#/screen/${r.portal}/${r.id}?${q({ device, mode, theme, portal: r.portal, screen: r.id, bare: 1 })}` });
  }
}

const browser = await chromium.launch();
let bad = 0;
for (const t of targets) {
  const page = await browser.newPage({ ...DEVICES[t.device], colorScheme: t.mode });
  await page.goto(t.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const file = path.join(OUT, `${t.name}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: Boolean(t.full) });
  const [sw, iw, errors] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, window.__errors ?? []]);
  if (sw > iw) { bad++; console.error(`sideways scroll: ${t.name} ${sw} > ${iw}`); }
  console.log(`${t.name} ${sw > iw ? "SIDEWAYS" : "ok"}${errors.length ? ` errors ${errors.length}` : ""}`);
  await page.close();
}
await browser.close();
console.log(`${targets.length} shots in ${OUT}${bad ? `, ${bad} with sideways scroll` : ""}`);
process.exit(bad ? 1 : 0);
