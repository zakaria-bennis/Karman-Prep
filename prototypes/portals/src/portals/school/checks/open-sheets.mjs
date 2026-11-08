// Screenshots of every sheet open (issue a key, add a class, add a teacher,
// put students in a class, assign practice, add seats, settings), desktop and
// phone, dark and light, into shots/school/_open/. The dev server must be up.
//   node src/portals/school/checks/open-sheets.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = fileURLToPath(new URL("../../../../shots/school/_open/", import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const url = (id, role, device, mode, state = "long-time") =>
  `${BASE}/#/screen/school/${id}?portal=school&screen=${id}&role=${role}&device=${device}&mode=${mode}&state=${state}&bare=1`;
const SHEETS = [
  ["keys", "admin", "Issue a key"],
  ["classes", "admin", "Add a class"],
  ["teachers", "admin", "Add a teacher"],
  ["overview", "admin", /Put 25 students/],
  ["class", "teacher", "Assign practice"],
  ["seats", "admin", "Add seats"],
  ["overview", "admin", "Settings"],
];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const device of ["desktop", "phone"]) for (const mode of ["dark", "light"]) {
  const page = await browser.newPage({ viewport: device === "desktop" ? { width: 1440, height: 900 } : { width: 440, height: 956 }, deviceScaleFactor: device === "desktop" ? 1 : 2, colorScheme: mode, hasTouch: device === "phone" });
  for (const [id, role, name] of SHEETS) {
    await page.goto(url(id, role, device, mode), { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    if (name === "Settings" && device === "phone") { await page.getByRole("button", { name: "More" }).click(); await page.waitForTimeout(500); await page.getByRole("button", { name: "Settings" }).click(); }
    else await page.getByRole("button", { name }).first().click();
    await page.waitForTimeout(700);
    const file = path.join(OUT, `${id}-${typeof name === "string" ? name.toLowerCase().replace(/\s+/g, "-") : "place"}-${device}-${mode}.png`);
    await page.screenshot({ path: file });
    console.log(path.basename(file));
  }
  await page.close();
}
await browser.close();
