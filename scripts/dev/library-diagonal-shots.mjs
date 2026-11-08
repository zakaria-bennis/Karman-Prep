/*
 * Headless screenshots of the Library's opening: the two paintings on their diagonal, each half
 * hovered, the box open, and short frame sequences of each hover and of the opening.
 * Needs a dev server with the dev sign-in bypass (BASE, default http://localhost:3163).
 *   node scripts/dev/library-diagonal-shots.mjs [only]
 * Writes to docs/overnight/reports/library-diagonal/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3163";
const OUT = "docs/overnight/reports/library-diagonal";
const only = process.argv[2] ?? "";
const day = new Date().toISOString().slice(0, 10);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });

async function open({ w, h, scheme = "light", time = "day", reduced = false, painted = true }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    colorScheme: scheme,
    reducedMotion: reduced ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
    hasTouch: w < 768,
  });
  await ctx.addInitScript(
    ([d, p]) => {
      try {
        localStorage.setItem("karman-challenge-closed", d);
        sessionStorage.setItem("karman:painted-in", "1");
        if (p) sessionStorage.setItem("karman:library-painted", "1");
      } catch {}
    },
    [day, painted]
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/dashboard/student/library?paint-time=${time}`, { waitUntil: "load" });
  await page.waitForSelector("[data-shown]", { timeout: 60000 });
  return { ctx, page, errors };
}

const centerOf = (page, slug) =>
  page.$eval(`button[data-slug="${slug}"] span span`, (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });

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
}

const sizes = [
  [1440, 900],
  [768, 1024],
  [390, 844],
];
const modes = [
  ["light", "day"],
  ["dark", "day"],
  ["dark", "night"],
];
const report = [];

for (const [w, h] of sizes) {
  for (const [scheme, time] of w === 768 ? modes.slice(0, 1) : modes) {
    const tag = `${w}-${scheme}${time === "night" ? "-night" : ""}`;
    if (only && !tag.includes(only)) continue;
    const { ctx, page, errors } = await open({ w, h, scheme, time });
    await page.waitForTimeout(3500);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: `${OUT}/${tag}-1-closed.jpg`, quality: 80, type: "jpeg" });
    for (const slug of ["math", "reading-writing"]) {
      const [x, y] = await centerOf(page, slug);
      if (w < 768) {
        await page.tap(`button[data-slug="${slug}"]`, { position: undefined }).catch(() => {});
        await page.evaluate(
          (s) => document.querySelector(`button[data-slug="${s}"]`)?.focus(),
          slug
        );
      } else await page.mouse.move(x, y);
      await page.waitForTimeout(1900);
      await page.screenshot({
        path: `${OUT}/${tag}-2-hover-${slug}.jpg`,
        quality: 80,
        type: "jpeg",
      });
    }
    await page.mouse.move(5, h - 5);
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(500);
    const [x, y] = await centerOf(page, "reading-writing");
    await page.mouse.click(x, y);
    if (w < 768) await page.mouse.click(x, y);
    await page.waitForTimeout(1600);
    const openScroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: `${OUT}/${tag}-3-open.jpg`, quality: 80, type: "jpeg" });
    report.push({ tag, scroll, openScroll, errors });
    await page.evaluate(() => sessionStorage.removeItem("karman-library-course"));
    await ctx.close();
  }
}

if (!only || only === "frames") {
  const { ctx, page, errors } = await open({ w: 1440, h: 900, painted: false });
  await frames(page, "frames-paint-in", 8, 3000);
  await page.waitForTimeout(1500);
  for (const slug of ["math", "reading-writing"]) {
    const [x, y] = await centerOf(page, slug);
    await frames(page, `frames-hover-${slug}`, 12, 2400, () => page.mouse.move(x, y));
    await page.mouse.move(5, 895);
    await page.waitForTimeout(900);
  }
  const [x, y] = await centerOf(page, "math");
  await frames(page, "frames-open-math", 12, 1300, () => page.mouse.click(x, y));
  await page.waitForTimeout(800);
  await page.click('button[aria-label^="Close the course"]');
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: `${OUT}/1440-light-4-closed-again.jpg`,
    quality: 80,
    type: "jpeg",
  });
  report.push({ tag: "frames", errors });
  await ctx.close();
}

if (!only || only === "keyboard") {
  const { ctx, page, errors } = await open({ w: 1440, h: 900 });
  await page.waitForTimeout(2500);
  let focused = null;
  for (let i = 0; i < 20 && !focused; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => document.activeElement?.getAttribute("data-slug"));
  }
  const lit = await page.evaluate(() => !!document.querySelector("button[data-on]"));
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `${OUT}/1440-light-keyboard-focus.jpg`,
    quality: 80,
    type: "jpeg",
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    tab: document.activeElement?.getAttribute("data-tab"),
    boxOpen: !document.querySelector("[data-view]")?.closest("[hidden]") || null,
  }));
  report.push({ tag: "keyboard", focused, lit, after, errors });
  await ctx.close();
}

if (!only || only === "reduced") {
  const { ctx, page, errors } = await open({ w: 1440, h: 900, reduced: true });
  await page.waitForTimeout(3000);
  const [x, y] = await centerOf(page, "math");
  await page.mouse.move(x, y);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `${OUT}/reduced-motion-hover-math.jpg`,
    quality: 80,
    type: "jpeg",
  });
  report.push({ tag: "reduced", errors });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
