// Clicks every control on every tutor screen with Playwright, on desktop and
// on the phone, and records what each did: a hash change (which screen it
// opened), a sheet, a toast, a state change (checked, selected, pressed), or
// nothing. Follows scripts/click-check.mjs. The dev server must be up.
//   node src/portals/tutor/checks/clicks.mjs [--only student,class]
import { chromium } from "playwright";
import { tutorRoutes } from "../routes.ts";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const ids = arg("only", tutorRoutes.map((r) => r.id).filter((id) => id !== "portal"));
const browser = await chromium.launch();
const errors = [];
let failed = 0;
let total = 0;
const url = (id, device) => `${BASE}/#/screen/tutor/${id}?portal=tutor&screen=${id}&role=tutor&device=${device}&mode=dark&bare=1`;
const SEL = "button, a[href], [role=switch], [role=tab], [role=radio], [role=checkbox]";
for (const device of ["desktop", "phone"]) {
  const page = await browser.newPage({ viewport: device === "desktop" ? { width: 1440, height: 900 } : { width: 440, height: 956 }, colorScheme: "dark", hasTouch: device !== "desktop" });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(`${m.type()}: ${m.text().slice(0, 120)}`); });
  for (const id of ids) {
    await page.goto(url(id, device), { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const seen = new Set();
    console.log(`\n# ${id} (${device})`);
    for (let i = 0; i < 80; i++) {
      const controls = page.locator(SEL);
      const count = await controls.count();
      if (i >= count) break;
      const c = controls.nth(i);
      const name = ((await c.getAttribute("aria-label")) || (await c.innerText().catch(() => "")) || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const role = (await c.getAttribute("role")) || (await c.evaluate((e) => e.tagName.toLowerCase()));
      const key = `${role}:${name}`;
      if (!name || seen.has(key) || !(await c.isVisible().catch(() => false))) continue;
      seen.add(key);
      total++;
      const before = await page.evaluate(() => location.hash);
      const dialogsBefore = await page.locator("[role=dialog]").count();
      try {
        const box = await c.boundingBox();
        if (box && (box.width < 44 || box.height < 44) && role !== "tab") console.log(`  small target ${key}: ${Math.round(box.width)}x${Math.round(box.height)}`);
        const disabled = (await c.getAttribute("aria-disabled")) === "true";
        await c.scrollIntoViewIfNeeded();
        await c.click({ timeout: 2500, force: disabled });
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => location.hash);
        const state = await c.evaluate((e) => e.getAttribute("aria-pressed") ?? e.getAttribute("aria-checked") ?? e.getAttribute("aria-selected") ?? e.getAttribute("aria-current") ?? "").catch(() => "");
        const dialogs = await page.locator("[role=dialog]").count();
        const toasts = await page.locator("[class*=z-toast] [role=status], [class*=z-toast] p").count();
        const screen = after.match(/screen=([a-z]+)/)?.[1];
        console.log(`  ${key} -> ${disabled ? "disabled, ignored" : after !== before ? `opens ${screen}${/id=/.test(after) ? ` (${after.match(/id=([a-z-]+)/)[1]})` : ""}` : dialogs > dialogsBefore ? "opens a sheet" : toasts ? "toast" : state ? `state ${state}` : "clicked"}`);
        if (toasts) { const t = Date.now(); await page.waitForFunction(() => !document.querySelector("[class*=z-toast] > *"), null, { timeout: 5000 }).catch(() => {}); console.log(`    waited ${Math.round((Date.now() - t) / 100) / 10}s for the toast to clear (on phones it sits over the bottom bar: shared ToastProvider, fixed bottom-4)`); }
        if (dialogs > dialogsBefore) { await page.keyboard.press("Escape"); await page.waitForTimeout(450); console.log(`    Escape -> sheet ${(await page.locator("[role=dialog]").count()) ? "still open" : "closed"}`); }
        if (after !== before) { await page.goto(url(id, device), { waitUntil: "networkidle" }); await page.waitForTimeout(400); }
      } catch (e) {
        failed++;
        console.log(`  ${key} -> FAILED ${String(e.message).split("\n")[0].slice(0, 90)}`);
      }
    }
  }
  await page.close();
}
await browser.close();
console.log(`\n${total} controls clicked, ${failed} failed, ${errors.length} page errors${errors.length ? "\n" + [...new Set(errors)].join("\n") : ""}`);
process.exit(failed || errors.length ? 1 : 0);
