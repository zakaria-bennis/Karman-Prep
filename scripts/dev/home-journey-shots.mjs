// Screenshots of the home page, one per section, at phone, iPad and desktop sizes in light and dark.
// Also reports sideways scroll and page errors. Usage:
//   node scripts/dev/home-journey-shots.mjs <outDir> [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "tmp/home-journey";
const base = process.argv[3] ?? "http://localhost:3320";
const only = process.argv[4];
mkdirSync(out, { recursive: true });
const SIZES = { desk: [1440, 900], ipad: [820, 1180], phone: [440, 956] };
const STOPS = ["#claim", "#proof", "#offer", "#who", "#how", "#ask", "#price"];

// The installed Chrome by default; PW_BUNDLED=1 uses Playwright's own browser.
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
for (const [name, [width, height]] of Object.entries(SIZES)) {
  for (const scheme of ["light", "dark"]) {
    if (only && only !== `${name}-${scheme}`) continue;
    const ctx = await browser.newContext({
      viewport: { width, height },
      colorScheme: scheme,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}-${scheme}-0-opening.jpg`, quality: 70 });
    await page
      .waitForSelector(".flight[data-painted]", { timeout: 30000 })
      .catch(() => errors.push("the landscape was not drawn in 30 s"));
    await page.waitForTimeout(1500);
    let i = 1;
    for (const sel of STOPS) {
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        const r = el.getBoundingClientRect();
        const y =
          r.height > innerHeight
            ? r.top + scrollY - 40
            : r.top + scrollY - (innerHeight - r.height) / 2;
        scrollTo(0, Math.max(0, y));
      }, sel);
      await page.waitForTimeout(1300);
      await page.screenshot({
        path: `${out}/${name}-${scheme}-${i++}-${sel.replace(/\W/g, "")}.jpg`,
        quality: 70,
      });
    }
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(
      `${name} ${scheme}: sideways ${wide}px, errors ${errors.length}`,
      errors.slice(0, 3)
    );
    await ctx.close();
  }
}
await browser.close();
