// Screenshots of the student portal: every screen at the four device sizes in
// light and dark, Home at every plan, and every screen in every state, into
// shots/student/ (gitignored), with a sideways-scroll check on each. A copy of
// scripts/shots.mjs filtered to the student routes. The dev server must be up
// on 127.0.0.1:5174.
//   node src/portals/student/shots.mjs [--only routes,plans,states] [--screens home,test]
import { chromium } from "playwright"; // resolved from the repo root's node_modules
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { studentRoutes } from "./routes.ts";

const OUT = fileURLToPath(new URL("../../../shots/student/", import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const only = arg("only", ["routes", "plans", "states"]);
const screens = arg("screens", null);
const routes = screens ? studentRoutes.filter((r) => screens.includes(r.id)) : studentRoutes;
const PLANS = ["free", "practice", "pro", "cohort", "private10", "private20", "school"];
const STATES = ["long-time", "first-day", "empty", "loading", "error", "locked"];

const DEVICES = {
  phone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ipad: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const q = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
const url = (id, o) => `${BASE}/#/screen/student/${id}?${q({ portal: "student", screen: id, bare: 1, ...o })}`;
const targets = [];
if (only.includes("routes"))
  for (const r of routes) for (const device of Object.keys(DEVICES)) for (const mode of ["light", "dark"])
    targets.push({ name: `${r.id}/${device}-${mode}`, device, mode, url: url(r.id, { device, mode, plan: "private20" }) });
if (only.includes("plans"))
  for (const plan of PLANS) for (const device of ["phone", "desktop"]) for (const mode of ["light", "dark"])
    for (const id of ["home", "classes"].filter((x) => !screens || screens.includes(x)))
      targets.push({ name: `plans/${id}-${plan}-${device}-${mode}`, device, mode, url: url(id, { device, mode, plan }) });
if (only.includes("states"))
  for (const r of routes) for (const state of STATES) for (const [device, mode] of [["phone", "dark"], ["desktop", "light"]])
    targets.push({ name: `states/${r.id}-${state}-${device}-${mode}`, device, mode, url: url(r.id, { device, mode, state, plan: "private20" }) });

const browser = await chromium.launch();
let bad = 0;
let errorsTotal = 0;
for (const t of targets) {
  const page = await browser.newPage({ ...DEVICES[t.device], colorScheme: t.mode });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(m.text()); });
  await page.goto(t.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  const file = path.join(OUT, `${t.name}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  // Sideways scroll: the document, the screen's scroll area, and anything drawn past the right edge.
  const [sw, iw, mainOver, outside] = await page.evaluate(() => {
    const main = document.querySelector("main");
    const over = main ? main.scrollWidth - main.clientWidth : 0;
    const out = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).length;
    return [document.documentElement.scrollWidth, innerWidth, over, out];
  });
  const sideways = sw > iw || mainOver > 1 || outside > 0;
  if (sideways) { bad++; console.error(`sideways scroll: ${t.name} doc ${sw}>${iw}? main over ${mainOver} outside ${outside}`); }
  if (errors.length) { errorsTotal += errors.length; console.error(`errors on ${t.name}: ${errors.join(" | ").slice(0, 300)}`); }
  console.log(`${t.name} ${sideways ? "SIDEWAYS" : "ok"}`);
  await page.close();
}
await browser.close();
console.log(`${targets.length} shots in ${OUT}${bad ? `, ${bad} with sideways scroll` : ""}${errorsTotal ? `, ${errorsTotal} page errors` : ""}`);
process.exit(bad || errorsTotal ? 1 : 0);
