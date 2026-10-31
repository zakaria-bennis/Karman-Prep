// Clicks every control on the kitchen sink and the gallery start page with
// Playwright and records what happened: buttons, segmented controls, toggles,
// sheets, tabs, the rail, the bottom bar, the theme and mode switches, selects.
// The dev server must be up. node scripts/click-check.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /assert/i.test(m.text()))) errors.push(`${m.type()}: ${m.text()}`); });
const log = [];
const note = (s) => { log.push(s); console.log(s); };

await page.goto(`${BASE}/#/system`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// Every button and link on the page, by accessible name, clicked once.
const SEL = "main button, main a[href], main [role=switch], main [role=tab], main [role=radio]";
const count = await page.locator(SEL).count();
note(`system: ${count} controls found`);
const seen = new Set();
for (let i = 0; i < count; i++) {
  const c = page.locator(SEL).nth(i);
  if (!(await c.count())) continue;
  const name = ((await c.getAttribute("aria-label")) || (await c.innerText().catch(() => "")) || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const role = (await c.getAttribute("role")) || (await c.evaluate((e) => e.tagName.toLowerCase()));
  const key = `${role}:${name}`;
  if (seen.has(key) || !name) continue;
  seen.add(key);
  const hashBefore = await page.evaluate(() => location.hash);
  if (role === "a") {
    const box = await c.boundingBox();
    note(`  ${key} -> link to ${await c.getAttribute("href")} (${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)})`);
    continue;
  }
  try {
    await c.scrollIntoViewIfNeeded();
    const box = await c.boundingBox();
    if (box && (box.width < 44 || box.height < 44) && role !== "tab") note(`  small target ${key}: ${Math.round(box.width)}x${Math.round(box.height)}`);
    const disabled = (await c.getAttribute("aria-disabled")) === "true";
    await c.click({ timeout: 2500, force: disabled });
    await page.waitForTimeout(120);
    if (disabled) { note(`  ${key} -> disabled, click ignored (aria-busy ${await c.getAttribute("aria-busy")})`); continue; }
    const state = await c.evaluate((e) => e.getAttribute("aria-pressed") ?? e.getAttribute("aria-checked") ?? e.getAttribute("aria-selected") ?? e.getAttribute("aria-current") ?? e.getAttribute("aria-busy") ?? "");
    const hashAfter = await page.evaluate(() => location.hash);
    const dialog = await page.locator("[role=dialog]").count();
    const toasts = await page.locator("[role=status][aria-live] + * , .z-toast [role=status], [class*=z-toast]").count();
    note(`  ${key} -> ${state ? `state ${state}` : "clicked"}${hashAfter !== hashBefore ? ` hash ${hashAfter.slice(0, 50)}` : ""}${dialog ? " dialog open" : ""}${toasts ? ` toasts ${toasts}` : ""}`);
    if (dialog) { await page.keyboard.press("Escape"); await page.waitForTimeout(450); note(`  Escape -> dialog ${await page.locator("[role=dialog]").count() ? "still open" : "closed"}`); }
    if (hashAfter !== hashBefore) { await page.goto(`${BASE}/#/system`); await page.waitForTimeout(400); }
  } catch (e) {
    note(`  ${key} -> FAILED ${String(e.message).split("\n")[0].slice(0, 80)}`);
  }
}

// Keyboard on the segmented control and the toggle.
const seg = page.locator("[role=radiogroup][aria-label=mode] [role=radio][aria-checked=true]").first();
await seg.focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
note(`segmented ArrowRight -> hash ${await page.evaluate(() => location.hash)}`);
const toggle = page.locator("[role=switch]").first();
await toggle.scrollIntoViewIfNeeded();
const before = await toggle.getAttribute("aria-checked");
await toggle.focus();
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(300);
note(`toggle ArrowLeft -> ${before} to ${await toggle.getAttribute("aria-checked")}`);
const tb = await toggle.boundingBox();
await page.mouse.move(tb.x + 10, tb.y + tb.height / 2);
await page.mouse.down();
await page.mouse.move(tb.x + tb.width - 6, tb.y + tb.height / 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);
note(`toggle drag right -> ${await toggle.getAttribute("aria-checked")}`);

// The sheet: open, drag down to dismiss.
await page.getByRole("button", { name: "Open the sheet" }).click();
await page.waitForTimeout(500);
const dlg = page.locator("[role=dialog]");
note(`sheet opened: ${await dlg.count()}`);
const header = dlg.locator("header");
const hb = await header.boundingBox();
await page.mouse.move(hb.x + 40, hb.y + 10);
await page.mouse.down();
await page.mouse.move(hb.x + 300, hb.y + 10, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(600);
note(`sheet after drag right: ${(await dlg.count()) ? "open" : "dismissed"}`);

// Start page switches.
await page.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
for (const [label, value] of [["Plan", "free"], ["State", "loading"], ["Theme", "rose"], ["Background", "sky"], ["Portal", "parent"]]) {
  await page.locator(`label:has(> span:text-is("${label}")) select`).selectOption(value);
  await page.waitForTimeout(250);
  note(`start select ${label}=${value} -> hash ${await page.evaluate(() => location.hash)} theme ${await page.evaluate(() => document.documentElement.dataset.theme)}`);
}
for (const name of ["Light", "Dark", "Device", "IBM Plex", "Frost (B)", "Desktop", "Phone"]) {
  await page.getByRole("radio", { name }).click();
  await page.waitForTimeout(250);
  note(`start segment ${name} -> ${await page.evaluate(() => `${document.documentElement.dataset.theme} ${document.documentElement.dataset.type} ${document.documentElement.dataset.glass} hash ${location.hash.slice(0, 60)}`)}`);
}
// The sample screen's rail and bottom bar.
const rail = page.locator("nav[aria-label=Sections] button");
note(`rail buttons: ${await rail.count()}`);
await rail.nth(2).click();
note(`rail click -> aria-current on ${await page.locator("nav[aria-label=Sections] [aria-current=page]").getAttribute("aria-label")}`);
await page.getByRole("radio", { name: "Phone" }).click();
await page.waitForTimeout(400);
const bar = page.locator("nav[aria-label=Sections] button");
await bar.nth(3).click();
note(`bottom bar click -> aria-current on ${await page.locator("nav[aria-label=Sections] [aria-current=page]").innerText()}`);
note(`page errors: ${errors.length}${errors.length ? "\n" + errors.join("\n") : ""}`);
await browser.close();
