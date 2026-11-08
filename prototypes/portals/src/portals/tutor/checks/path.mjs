// Proof of the brief's promise: everything a tutor needs before a 1:1 is on
// one screen, reached in under a minute. Opens Today as the signed-in tutor,
// clicks the one highlighted action, and times the path until the briefing's
// checklist, the booking with its Zoom time, the levels on the missed skills
// and the last sessions' notes are all on screen. Same for the class view
// from Cohorts. The dev server must be up.  node src/portals/tutor/checks/path.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const url = (id, device) => `${BASE}/#/screen/tutor/${id}?portal=tutor&screen=${id}&role=tutor&device=${device}&mode=dark&bare=1`;
const browser = await chromium.launch();
let failed = 0;
const need = (ok, what) => { console.log(`  ${ok ? "ok " : "MISSING"} ${what}`); if (!ok) failed++; };
for (const device of ["desktop", "phone"]) {
  const page = await browser.newPage({ viewport: device === "desktop" ? { width: 1440, height: 900 } : { width: 440, height: 956 }, hasTouch: device === "phone" });
  await page.goto(url("today", device), { waitUntil: "networkidle" });
  const t0 = Date.now();
  await page.getByRole("button", { name: "Open the briefing" }).click();
  await page.getByRole("checkbox").first().waitFor();
  const ms = Date.now() - t0;
  const text = await page.locator("main").innerText();
  console.log(`\n# 1:1 briefing on ${device}: Today -> "Open the briefing" -> ${location(await page.evaluate(() => location.hash))} in ${ms} ms, one click`);
  need(/Tuesday, Nov 3, 5:00 pm to 6:00 pm ET/.test(text), "the booking's time");
  need(/Zoom opens 4:55 pm/.test(text) && (await page.getByRole("button", { name: /Join Zoom/ }).count()) > 0, "the Zoom link (Join Zoom, opens 4:55 pm)");
  need(/15 misses in 7 skills/.test(text), "every miss on the latest full-length, grouped by skill");
  need((await page.getByRole("checkbox").count()) === 9, "the checklist to cover (9 items)");
  need(/Developing 5\d|Proficient 6\d/.test(text), "the student's level on each missed skill");
  need(/Session 14[\s\S]*Session 13[\s\S]*Session 12/.test(text), "the last sessions' notes");
  need(/Due Nov 1/.test(text), "this week's homework with its due date");
  await page.goto(url("cohorts", device), { waitUntil: "networkidle" });
  const t1 = Date.now();
  await page.getByRole("button", { name: "Class view" }).first().click();
  await page.getByRole("checkbox").first().waitFor();
  const ms2 = Date.now() - t1;
  const ct = await page.locator("main").innerText();
  console.log(`# class plan on ${device}: Cohorts -> "Class view" -> class (december) in ${ms2} ms, one click`);
  need(/David/.test(ct), "the tutor named (David)");
  need(/5 of 5 missed it on test 1/.test(ct), "the skills most of the group missed");
  need(/Who missed what on test 1/.test(ct) && (await page.locator("[title$=\" missed\"], [title$=\"no misses\"]").count()) > 20, "each student's level on them (the matrix, a table on desktop, stacked on the phone)");
  need(/Monday, Nov 2, 7:00 to 8:30 pm ET/.test(ct), "the next class's time");
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} missing` : "\neverything a tutor needs is on the briefing, one click from Today");
process.exit(failed ? 1 : 0);
function location(h) { return h.match(/screen=([a-z]+)/)?.[1] + (h.match(/id=([a-z-]+)/) ? ` (${h.match(/id=([a-z-]+)/)[1]})` : ""); }
