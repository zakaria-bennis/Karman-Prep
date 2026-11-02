// Clicks every control on every school screen with Playwright, as the admin
// and as the teacher, on desktop and on the phone, and records what each did:
// a hash change (which screen it opened), a sheet, a toast, a state change
// (checked, selected, pressed), or nothing. Follows scripts/click-check.mjs.
// The dev server must be up.  node src/portals/school/checks/clicks.mjs [--only keys,class]
import { chromium } from "playwright";
import { open } from "./open.mjs";
import { schoolRoutes } from "../routes.ts";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const ids = arg("only", schoolRoutes.map((r) => r.id).filter((id) => id !== "portal"));
const browser = await chromium.launch();
const errors = [];
let failed = 0;
let total = 0;
const url = (id, role, device) => `${BASE}/#/screen/school/${id}?portal=school&screen=${id}&role=${role}&device=${device}&mode=dark&bare=1`;
const SEL = "button, a[href], [role=switch], [role=tab], [role=radio], [role=checkbox], select";
for (const device of ["desktop", "phone"]) {
  const page = await browser.newPage({ viewport: device === "desktop" ? { width: 1440, height: 900 } : { width: 440, height: 956 }, colorScheme: "dark", hasTouch: device !== "desktop" });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(`${m.type()}: ${m.text().slice(0, 120)}`); });
  for (const r of schoolRoutes.filter((x) => ids.includes(x.id))) for (const role of ["admin", "teacher"].filter((x) => r.roles.includes(x))) {
    const id = r.id;
    await open(page, url(id, role, device));
    await page.waitForTimeout(500);
    const seen = new Set();
    const listCounts = new Map();
    console.log(`\n# ${id} as ${role} (${device})`);
    for (let i = 0; i < 90; i++) {
      const controls = page.locator(SEL);
      const count = await controls.count();
      if (i >= count) break;
      const c = controls.nth(i);
      const name = ((await c.getAttribute("aria-label")) || (await c.innerText().catch(() => "")) || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const role2 = (await c.getAttribute("role")) || (await c.evaluate((e) => e.tagName.toLowerCase()));
      const key = `${role2}:${name}`;
      if (!name || seen.has(key) || !(await c.isVisible().catch(() => false))) continue;
      // A roster's rows and a list's rows are one control repeated: click the first two of each list and record the rest as the same.
      const listKey = await c.evaluate((e) => { const l = e.closest("table tbody, .divide-y"); if (!l) return ""; const all = [...document.querySelectorAll("table tbody, .divide-y")]; return `list-${all.indexOf(l)}`; }).catch(() => "");
      if (listKey) { const n = (listCounts.get(listKey) ?? 0) + 1; listCounts.set(listKey, n); if (n > 2) continue; }
      seen.add(key);
      total++;
      const before = await page.evaluate(() => location.hash);
      const dialogsBefore = await page.locator("[role=dialog]").count();
      try {
        const box = await c.boundingBox();
        if (box && (box.width < 44 || box.height < 44) && role2 !== "tab" && role2 !== "select") console.log(`  small target ${key}: ${Math.round(box.width)}x${Math.round(box.height)}`);
        const disabled = (await c.getAttribute("aria-disabled")) === "true";
        await c.scrollIntoViewIfNeeded();
        if (role2 === "select") { await c.focus(); console.log(`  ${key} -> focused (native select)`); continue; }
        await c.click({ timeout: 2500, force: disabled });
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => location.hash);
        const state = await c.evaluate((e) => e.getAttribute("aria-pressed") ?? e.getAttribute("aria-checked") ?? e.getAttribute("aria-selected") ?? e.getAttribute("aria-current") ?? "").catch(() => "");
        const dialogs = await page.locator("[role=dialog]").count();
        const toasts = await page.locator("[class*=z-toast] [role=status], [class*=z-toast] p").count();
        const screen = after.match(/screen=([a-z]+)/)?.[1];
        console.log(`  ${key} -> ${disabled ? "disabled, ignored" : after !== before ? `opens ${screen}${/id=/.test(after) ? ` (${after.match(/id=([a-z0-9-]+)/)[1]})` : ""}` : dialogs > dialogsBefore ? "opens a sheet" : toasts ? "toast" : state ? `state ${state}` : "clicked"}`);
        if (toasts) { await page.waitForFunction(() => !document.querySelector("[class*=z-toast] > *"), null, { timeout: 9000 }).catch(() => {}); }
        if (dialogs > dialogsBefore) { await page.keyboard.press("Escape"); await page.waitForTimeout(450); console.log(`    Escape -> sheet ${(await page.locator("[role=dialog]").count()) ? "still open" : "closed"}`); }
        if (after !== before) { await open(page, url(id, role, device)); await page.waitForTimeout(400); }
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
