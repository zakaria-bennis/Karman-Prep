/*
 * Headless screenshots of the Library's opening: the sky split on its diagonal, each half
 * hovered, the fall to the ground, the box open after landing, the climb back up, and the
 * Challenge banner. Also measures how dark each ground scene is at night.
 * Needs a dev server with the dev sign-in bypass (BASE, default http://localhost:3163).
 *   node scripts/dev/library-diagonal-shots.mjs [only]
 * Writes to docs/overnight/reports/library-diagonal/. Uses the installed Chrome (set
 * PW_BUNDLED=1 to use Playwright's own).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3163";
const OUT = "docs/overnight/reports/library-diagonal";
const only = process.argv[2] ?? "";
const day = new Date().toISOString().slice(0, 10);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const want = (tag) => !only || tag.includes(only);

async function open({
  w,
  h,
  scheme = "light",
  time = "day",
  reduced = false,
  painted = true,
  challenge = false,
}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    reducedMotion: reduced ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
    hasTouch: w < 768,
  });
  await ctx.addInitScript(
    ([d, p, c]) => {
      try {
        if (!c) localStorage.setItem("karman-challenge-closed", d);
        sessionStorage.setItem("karman:painted-in", "1");
        if (p) sessionStorage.setItem("karman:library-painted", "1");
      } catch {}
    },
    [day, painted, challenge]
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/dashboard/student/library?paint-time=${time}`, { waitUntil: "load" });
  if (!challenge) await page.waitForSelector("[data-shown]", { timeout: 60000 });
  return { ctx, page, errors };
}

const centerOf = (page, slug) =>
  page.$eval(`button[data-slug="${slug}"] span span`, (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 80, type: "jpeg" });

/* Records the screen for `ms` with Chrome's screencast, then keeps `n` evenly spaced frames. */
async function frames(page, name, n, ms, act) {
  const cdp = await page.context().newCDPSession(page);
  const got = [];
  cdp.on("Page.screencastFrame", (f) => {
    got.push({ t: f.metadata.timestamp, data: f.data });
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 72, everyNthFrame: 1 });
  await page.waitForTimeout(120);
  const t0 = Date.now() / 1000;
  if (act) await act();
  await page.waitForTimeout(ms);
  await cdp.send("Page.stopScreencast");
  const kept = got.filter((f) => f.t >= t0 - 0.05);
  for (let i = 0; i < n && kept.length; i++) {
    const f = kept[Math.min(kept.length - 1, Math.round((i / (n - 1)) * (kept.length - 1)))];
    await writeFile(
      `${OUT}/${name}-${String(i).padStart(2, "0")}.jpg`,
      Buffer.from(f.data, "base64")
    );
  }
  await cdp.detach();
  return kept.length;
}

const report = [];
const cases = [
  [1440, 900, "light", "day"],
  [1440, 900, "dark", "day"],
  [1440, 900, "dark", "night"],
  [768, 1024, "light", "day"],
  [390, 844, "light", "day"],
  [390, 844, "dark", "night"],
];

for (const [w, h, scheme, time] of cases) {
  const tag = `${w}-${scheme}-${time}`;
  if (!want(tag)) continue;
  const { ctx, page, errors } = await open({ w, h, scheme, time });
  await page.waitForTimeout(3500);
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot(page, `${tag}-1-sky`);
  for (const slug of ["math", "reading-writing"]) {
    if (w < 768) {
      await page.evaluate((s) => document.querySelector(`button[data-slug="${s}"]`)?.focus(), slug);
    } else {
      const [x, y] = await centerOf(page, slug);
      await page.mouse.move(x, y);
    }
    await page.waitForTimeout(2200);
    await shot(page, `${tag}-2-hover-${slug}`);
  }
  await page.mouse.move(5, h - 5);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(600);
  const [x, y] = await centerOf(page, "math");
  await page.mouse.click(x, y);
  if (w < 768) await page.mouse.click(x, y);
  await page.waitForTimeout(3200);
  const openScroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot(page, `${tag}-3-landed-math`);
  /* Night check: how bright is the land in each ground scene (lower 45% of the picture). */
  const land = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("canvas")]
        .filter(
          (c) =>
            /ground/.test(c.parentElement?.className ?? "") &&
            !/Layer/.test(c.parentElement?.className ?? "")
        )
        .map((c, i) => {
          const g = c.getContext("2d");
          const y0 = Math.round(c.height * 0.55);
          const d = g.getImageData(0, y0, c.width, c.height - y0).data;
          let sum = 0;
          for (let j = 0; j < d.length; j += 16)
            sum += 0.3 * d[j] + 0.59 * d[j + 1] + 0.11 * d[j + 2];
          return [i ? "reading" : "math", Math.round(sum / (d.length / 16))];
        })
    )
  );
  await page.click('button[data-tab="reading-writing"]');
  await page.waitForTimeout(900);
  await shot(page, `${tag}-4-switched-reading`);
  report.push({ tag, scroll, openScroll, land, errors });
  await page.evaluate(() => sessionStorage.removeItem("karman-library-course"));
  await ctx.close();
}

if (want("frames")) {
  const { ctx, page, errors } = await open({ w: 1440, h: 900, painted: false });
  await frames(page, "frames-paint-in", 8, 3000);
  await page.waitForTimeout(1500);
  for (const slug of ["math", "reading-writing"]) {
    const [x, y] = await centerOf(page, slug);
    await frames(page, `frames-hover-${slug}`, 10, 2600, () => page.mouse.move(x, y));
    await page.mouse.move(5, 895);
    await page.waitForTimeout(900);
  }
  const [x, y] = await centerOf(page, "reading-writing");
  const got = await frames(page, "frames-descent-reading", 16, 2900, () => page.mouse.click(x, y));
  await page.waitForTimeout(600);
  await frames(page, "frames-climb", 10, 2100, () =>
    page.click('button[aria-label^="Close the course"]')
  );
  await page.waitForTimeout(800);
  await shot(page, "1440-light-day-5-back-in-sky");
  report.push({ tag: "frames", descentFrames: got, errors });
  await ctx.close();
}

if (want("night-frames")) {
  const { ctx, page, errors } = await open({ w: 1440, h: 900, scheme: "dark", time: "night" });
  await page.waitForTimeout(3000);
  const [x, y] = await centerOf(page, "math");
  await frames(page, "frames-descent-night-math", 12, 2900, () => page.mouse.click(x, y));
  report.push({ tag: "night-frames", errors });
  await ctx.close();
}

if (want("keyboard")) {
  const { ctx, page, errors } = await open({ w: 1440, h: 900 });
  await page.waitForTimeout(2500);
  let focused = null;
  for (let i = 0; i < 20 && !focused; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => document.activeElement?.getAttribute("data-slug"));
  }
  const lit = await page.evaluate(() => !!document.querySelector("button[data-on]"));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  /* Escape on the way down turns back up. */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1800);
  const turnedBack = await page.evaluate(
    () => document.querySelector("[data-view]")?.getAttribute("data-view") === "sky"
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => document.activeElement?.getAttribute("data-tab"));
  report.push({ tag: "keyboard", focused, lit, turnedBack, focusAfterLanding: after, errors });
  await ctx.close();
}

if (want("reduced")) {
  const { ctx, page, errors } = await open({ w: 1440, h: 900, reduced: true });
  await page.waitForTimeout(3000);
  const [x, y] = await centerOf(page, "math");
  await page.mouse.move(x, y);
  await page.waitForTimeout(800);
  await shot(page, "reduced-motion-hover-math");
  await frames(page, "frames-reduced-open", 6, 900, () => page.mouse.click(x, y));
  report.push({ tag: "reduced", errors });
  await ctx.close();
}

if (want("challenge")) {
  for (const [scheme, time] of [
    ["light", "day"],
    ["dark", "night"],
  ]) {
    const { ctx, page, errors } = await open({ w: 1440, h: 900, scheme, time, challenge: true });
    await page.waitForSelector('[role="dialog"]', { timeout: 60000 });
    await page.waitForTimeout(3000);
    await shot(page, `challenge-${scheme}-${time}`);
    report.push({ tag: `challenge-${time}`, errors });
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
