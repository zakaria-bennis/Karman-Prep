// Proof of the brief's promises, driven with Playwright on desktop and phone:
//  1. A brand-new school: Add a class (its key comes with it), add a teacher,
//     and the setup steps tick off as facts; the key is on the Seat keys screen.
//  2. Mid-year: Issue a key and get its code to share; copy it; revoke one
//     (asks once); put the 25 students with no class into a class, and the
//     ledger and the finding change.
//  3. The teacher assigns practice from a class and it appears, due date shown.
// The dev server must be up.  node src/portals/school/checks/flows.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const url = (id, role, state, device) =>
  `${BASE}/#/screen/school/${id}?portal=school&screen=${id}&role=${role}&device=${device}&mode=dark&state=${state}&bare=1`;
const browser = await chromium.launch();
let failed = 0;
const need = (ok, what) => { console.log(`  ${ok ? "ok " : "MISSING"} ${what}`); if (!ok) failed++; };
for (const device of ["desktop", "phone"]) {
  const page = await browser.newPage({ viewport: device === "desktop" ? { width: 1440, height: 900 } : { width: 440, height: 956 }, hasTouch: device === "phone" });
  page.on("pageerror", (e) => { console.log(`  pageerror ${e.message}`); failed++; });

  console.log(`\n# a new school on ${device}`);
  await page.goto(url("overview", "admin", "first-day", device), { waitUntil: "networkidle" });
  const t0 = Date.now();
  await page.getByRole("button", { name: "Add a class" }).first().click();
  await page.getByLabel("Class name").fill("Period 4");
  await page.getByRole("button", { name: "Add the class" }).click();
  await page.waitForTimeout(600);
  let text = await page.locator("main").innerText();
  need(/2 of 4 done/.test(text), "two setup steps done after one class (its key came with it)");
  await page.getByRole("button", { name: "Add", exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  if (!/screen=teachers/.test(await page.evaluate(() => location.hash))) await page.goto(url("teachers", "admin", "first-day", device), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add a teacher" }).first().click();
  await page.getByLabel("Name").fill("Ms. Rivera");
  await page.getByLabel("School email").fill("m.rivera@ridgeview.k12.example");
  await page.getByRole("button", { name: "Send the invitation" }).click();
  await page.waitForTimeout(600);
  text = await page.locator("main").innerText();
  need(/Ms\. Rivera/.test(text) && /not signed in yet/.test(text), "the teacher is listed, invitation state on the row");
  await page.goto(url("keys", "admin", "first-day", device), { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  text = await page.locator("main").innerText();
  need(/Period 4/.test(text) && /RHS-PER-/.test(text), "the class's key is on the Seat keys screen");
  await page.goto(url("overview", "admin", "first-day", device), { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  text = await page.locator("main").innerText();
  need(/3 of 4 done/.test(text), "three of four setup steps done");
  console.log(`  ${Date.now() - t0} ms from the first morning to a class, a key and a teacher`);

  console.log(`# keys and seats mid-year on ${device}`);
  await page.goto(url("keys", "admin", "long-time", device), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Issue a key" }).first().click();
  await page.getByRole("button", { name: "Issue the key" }).click();
  await page.waitForTimeout(600);
  text = await page.locator("main").innerText();
  need(/Share this key with Period 3/.test(text) && /RHS-PER-/.test(text), "a key just issued sits at the top, ready to share");
  await page.getByRole("button", { name: /^Copy RHS-/ }).first().click();
  await page.waitForTimeout(200);
  need(/Copied/.test(await page.locator("main").innerText()), "Copy says Copied");
  await page.getByRole("button", { name: "Revoke" }).first().click();
  await page.waitForTimeout(200);
  need((await page.getByRole("button", { name: "Cancel" }).count()) > 0, "Revoke asks once (Cancel or Revoke)");
  await page.getByRole("button", { name: "Revoke" }).first().click();
  await page.waitForTimeout(500);
  need(/Revoked\s*2/.test(await page.locator("main").innerText()), "the revoked key moved to the Revoked tab (2)");
  await page.goto(url("overview", "admin", "long-time", device), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Put 25 students in a class/ }).first().click();
  await page.getByRole("button", { name: /^Put 25 in/ }).click();
  await page.waitForTimeout(800);
  text = await page.locator("main").innerText();
  need(/84 in a class/.test(text) && /0 with no class/.test(text), "the ledger shows every seat in a class");
  need(!/No class yet/.test(text), "the finding and the rank bars no longer name students with no class");

  console.log(`# the teacher assigns practice on ${device}`);
  await page.goto(url("class", "teacher", "long-time", device), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Assign practice" }).first().click();
  await page.getByRole("button", { name: /^Assign, due/ }).click();
  await page.waitForTimeout(600);
  text = await page.locator("main").innerText();
  need(/Linear functions practice/.test(text) && /Due Nov 7/.test(text), "the new practice is listed on the class with its due date");
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} missing` : "\nevery flow works: setup, keys, seats, practice");
process.exit(failed ? 1 : 0);
