/* Quick headless look at one intro: node scripts/dev/library-intros-quick.mjs <id> <w> <h> <time> <subject> */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const [id = "4", w = "1440", h = "900", time = "day", sub = "math"] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3164";
const OUT = process.env.OUT ?? "/tmp/intros-quick";
await mkdir(OUT, { recursive: true });
const day = new Date().toISOString().slice(0, 10);
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 768 });
await ctx.addInitScript((d) => {
  try {
    localStorage.setItem("karman-challenge-closed", d);
    sessionStorage.setItem("karman:painted-in", "1");
    sessionStorage.setItem("karman:library-painted", "1");
  } catch {}
}, day);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e)));
page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await page.goto(`${BASE}/dashboard/student/library?intro=${id}&paint-time=${time}`, { waitUntil: "load", timeout: 240000 });
await page.waitForSelector(`[data-intro="${id}"][data-shown]`, { timeout: 90000 });
const tag = `${id}-${w}-${time}`;
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/${tag}-1-start.jpg`, type: "jpeg", quality: 80 });
for (const s of ["math", "rw"]) {
  const b = await page.$(`[data-intro="${id}"] button[data-s="${s}"]`);
  const box = await b.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${tag}-2-hover-${s}.jpg`, type: "jpeg", quality: 80 });
}
const b = await page.$(`[data-intro="${id}"] button[data-s="${sub}"]`);
const box = await b.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
await page.waitForTimeout(300);
await page.mouse.down();
await page.mouse.up();
for (const t of [700, 1500, 2400, 3300]) {
  await page.waitForTimeout(t === 700 ? 700 : 800);
  await page.screenshot({ path: `${OUT}/${tag}-3-mid-${t}.jpg`, type: "jpeg", quality: 80 });
}
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/${tag}-4-end.jpg`, type: "jpeg", quality: 80 });
await browser.close();
