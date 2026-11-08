// Clicks every control on every parent screen with Playwright, on a phone in
// dark and on desktop in light, and records what each did: the rail, the
// bottom bar, the student switcher, rows, tabs, toggles, sheets (opened and
// closed with Escape), the locked panels' one action, the pinned primary.
// A copy of scripts/click-check.mjs filtered to the parent routes.
//   node src/portals/parent/click-check.mjs
import { chromium } from "playwright";
import { parentRoutes } from "./routes.ts";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const browser = await chromium.launch();
const errors = [];
const log = [];
const note = (s) => { log.push(s); console.log(s); };
const SEL = "main button, main a[href], main [role=switch], main [role=tab], main [role=radio], nav button, nav a[href], header button";
const url = (id, o) => `${BASE}/#/screen/parent/${id}?portal=parent&screen=${id}&role=parent&bare=1&` + Object.entries(o).map(([k, v]) => `${k}=${v}`).join("&");

for (const [device, mode, size] of [["phone", "dark", { width: 440, height: 956 }], ["desktop", "light", { width: 1440, height: 900 }]]) {
  for (const r of parentRoutes) {
    for (const plan of r.id === "plan" ? ["plus", "cohort", "private20", "free"] : r.id === "home" ? ["plus", "free"] : ["plus"]) {
      const page = await browser.newPage({ viewport: size, colorScheme: mode, isMobile: device === "phone", hasTouch: device === "phone" });
      page.on("pageerror", (e) => errors.push(`${r.id}/${device}: ${e.message}`));
      page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(`${r.id}/${device}: ${m.text()}`); });
      const start = url(r.id, { device, mode, plan });
      await page.goto(start, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const count = await page.locator(SEL).count();
      note(`${r.id} (${plan}, ${device}): ${count} controls`);
      const seen = new Set();
      for (let i = 0; i < count; i++) {
        await page.goto(start);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        const c = page.locator(SEL).nth(i);
        if (!(await c.count())) continue;
        const name = ((await c.getAttribute("aria-label")) || (await c.innerText().catch(() => "")) || "").trim().replace(/\s+/g, " ").slice(0, 44);
        const role = (await c.getAttribute("role")) || (await c.evaluate((e) => e.tagName.toLowerCase()));
        const key = `${role}:${name}`;
        if (!name || seen.has(key)) continue;
        seen.add(key);
        try {
          if (await c.evaluate((e) => Boolean(e.closest("[data-locked] [aria-hidden=true]")))) { note(`  ${key} -> inert under the lock`); continue; }
          if (role === "a") { const href = await c.getAttribute("href"); note(`  ${key} -> link ${href}`); continue; }
          await c.scrollIntoViewIfNeeded();
          const box = await c.boundingBox();
          if (box && (box.width < 44 || box.height < 44) && role !== "tab") note(`  small target ${key}: ${Math.round(box.width)}x${Math.round(box.height)}`);
          const before = await page.evaluate(() => location.hash);
          await c.click({ timeout: 2500 });
          await page.waitForTimeout(450);
          const after = await page.evaluate(() => location.hash);
          const state = await c.evaluate((e) => e.getAttribute("aria-checked") ?? e.getAttribute("aria-selected") ?? e.getAttribute("aria-current") ?? "").catch(() => "");
          const dialog = await page.locator("[role=dialog]").count();
          const toast = await page.locator("[role=status][aria-live]").innerText().catch(() => "");
          const h1 = await page.locator("h1").first().innerText().catch(() => "");
          note(`  ${key} -> ${after !== before ? `hash ${after.replace(/^.*#\/screen\/parent\//, "").split("?")[0]} (h1 "${h1}")` : state ? `state ${state}` : "clicked"}${dialog ? " dialog open" : ""}${toast ? ` toast "${toast.slice(0, 50)}"` : ""}`);
          if (dialog) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); note(`  Escape -> dialog ${(await page.locator("[role=dialog]").count()) ? "still open" : "closed"}`); }
        } catch (e) {
          note(`  ${key} -> FAILED ${String(e.message).split("\n")[0].slice(0, 90)}`);
        }
      }
      await page.close();
    }
  }
}
note(`page errors: ${errors.length}${errors.length ? "\n" + errors.join("\n") : ""}`);
await browser.close();
process.exit(errors.length ? 1 : 0);
