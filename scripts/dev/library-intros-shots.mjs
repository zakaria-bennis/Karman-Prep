/*
 * Headless screenshots of the Library's opening animations (`?intro=N`): the start, each choice
 * hovered, the middle of the closing animation and the end state (the box open over the ground),
 * at 1440 and 390 wide, by day and by night; plus the Challenge banner. (Motion is in the clips:
 * library-intros-clips.mjs.)
 * Intros mark their two choices with `data-slug="math"` and `data-slug="reading-writing"`.
 * Uses the dev preview /dev/library-intros (no database, no sign-in). Needs a dev server
 * (BASE, default http://localhost:3163).
 *   node scripts/dev/library-intros-shots.mjs [ids, e.g. 1,2,3] [only]
 * Writes to docs/overnight/reports/library-intros/. Uses the installed Chrome (PW_BUNDLED=1 for
 * Playwright's own).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3163";
const OUT = "docs/overnight/reports/library-intros";
const ids = (process.argv[2] ?? "1,2,3").split(",").map(Number);
const only = process.argv[3] ?? "";
const day = new Date().toISOString().slice(0, 10);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const want = (tag) => !only || tag.includes(only);
const report = [];

async function open({
  w,
  h,
  scheme = "light",
  time = "day",
  intro,
  reduced = false,
  challenge = false,
}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    reducedMotion: reduced ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
    hasTouch: w < 768,
  });
  /* Decline the session-replay consent bar, so it does not cover the bottom of the picture. */
  await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: BASE }]);
  await ctx.addInitScript(
    ([d, c]) => {
      try {
        if (!c) localStorage.setItem("karman-challenge-closed", d);
        sessionStorage.setItem("karman:painted-in", "1");
        sessionStorage.setItem("karman:library-painted", "1");
      } catch {}
    },
    [day, challenge]
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const q = intro ? `intro=${intro}&` : "";
  await page.goto(
    `${BASE}/dev/library-intros?${q}${challenge ? "challenge=1&" : ""}paint-time=${time}`,
    {
      waitUntil: "load",
    }
  );
  return { ctx, page, errors };
}

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 78, type: "jpeg" });

const choice = (slug) => `[data-intro] button[data-slug="${slug}"]`;

/** The middle of a choice's name (or of the choice itself). */
async function centerOf(page, slug) {
  const r = await page.$eval(choice(slug), (el) => {
    const n = el.querySelector("[data-name]") ?? el;
    const b = n.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  });
  return r;
}

for (const id of ids) {
  for (const [w, h, scheme, time] of [
    [1440, 900, "light", "day"],
    [1440, 900, "dark", "night"],
    [390, 844, "light", "day"],
    [390, 844, "dark", "night"],
  ]) {
    const tag = `${id}-${w}-${time}`;
    if (!want(tag)) continue;
    const { ctx, page, errors } = await open({ w, h, scheme, time, intro: id });
    await page.waitForSelector(choice("math"), { timeout: 60000 });
    await page.waitForTimeout(3500);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await shot(page, `${tag}-1-start`);
    for (const slug of ["math", "reading-writing"]) {
      if (w < 768) await page.focus(choice(slug));
      else {
        const [x, y] = await centerOf(page, slug);
        await page.mouse.move(x, y);
      }
      await page.waitForTimeout(2000);
      await shot(page, `${tag}-2-hover-${slug}`);
    }
    await page.evaluate(() => document.activeElement?.blur());
    await page.mouse.move(2, h - 2);
    await page.waitForTimeout(500);
    const [x, y] = await centerOf(page, "math");
    await page.mouse.click(x, y);
    if (w < 768) await page.mouse.click(x, y);
    await page.waitForTimeout(800);
    await shot(page, `${tag}-3-mid`);
    await page
      .waitForSelector('[data-view="math"]:not([hidden])', { timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
    const openScroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await shot(page, `${tag}-4-end`);
    report.push({ tag, scroll, openScroll, errors });
    await ctx.close();
  }
  if (want(`${id}-reduced`)) {
    const { ctx, page, errors } = await open({ w: 1440, h: 900, intro: id, reduced: true });
    await page.waitForSelector(choice("math"), { timeout: 60000 });
    await page.waitForTimeout(2500);
    const [x, y] = await centerOf(page, "math");
    await page.mouse.move(x, y);
    await page.waitForTimeout(600);
    await shot(page, `${id}-reduced-hover`);
    report.push({ tag: `${id}-reduced`, errors });
    await ctx.close();
  }
}

if (want("challenge")) {
  for (const [scheme, time] of [
    ["light", "day"],
    ["dark", "night"],
  ]) {
    const { ctx, page, errors } = await open({ w: 1440, h: 900, scheme, time, challenge: true });
    await page.waitForSelector('[role="dialog"]', { timeout: 60000 });
    await page.waitForTimeout(3000);
    await shot(page, `challenge-${time}`);
    report.push({ tag: `challenge-${time}`, errors });
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(report));
