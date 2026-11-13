/*
 * Headless checks of Library intros 9 (easel) and 10 (paper boats), `?intro=N`.
 *   node scripts/dev/library-intros-9-10.mjs shots [ids]   stills: start, hover each, mid, end,
 *                                                          at 1440 and 390 wide
 *   node scripts/dev/library-intros-9-10.mjs clips [ids]   real-time clips at 1440 x 900, both
 *                                                          choices, by day, sunset and night
 * Needs a dev server with the dev sign-in bypass (BASE, default http://localhost:3191) and ffmpeg.
 * Writes to docs/overnight/reports/library-intros/.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm, rename } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3191";
const OUT = "docs/overnight/reports/library-intros";
const CLIPS = `${OUT}/clips`;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const mode = process.argv[2] ?? "shots";
const ids = (process.argv[3] ?? "9,10").split(",").map(Number);
const times = (process.argv[4] ?? "day,sunset,night").split(",");
const day = new Date().toISOString().slice(0, 10);
await mkdir(CLIPS, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const report = [];
const SLUGS = { math: "math", rw: "reading-writing" };
const choice = (slug) => `[data-intro] [data-slug="${slug}"]`;

async function open({ w, h, time, intro, reduced = false, video = null }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: reduced ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
    hasTouch: w < 768,
    ...(video ? { recordVideo: { dir: video, size: { width: w, height: h } } } : {}),
  });
  await ctx.addInitScript((d) => {
    try {
      localStorage.setItem("karman-challenge-closed", d);
      sessionStorage.setItem("karman:painted-in", "1");
      sessionStorage.setItem("karman:library-painted", "1");
    } catch {}
  }, day);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const t0 = Date.now();
  await page.goto(`${BASE}/dashboard/student/library?intro=${intro}&paint-time=${time}`, {
    waitUntil: "load",
  });
  await page.waitForSelector(choice("math"), { timeout: 90000 });
  return { ctx, page, errors, t0 };
}

async function centerOf(page, slug) {
  return page.$eval(choice(slug), (el) => {
    const n = el.querySelector("[data-name]") ?? el.querySelector("span") ?? el;
    const b = n.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  });
}

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 80, type: "jpeg" });

if (mode === "shots") {
  for (const id of ids) {
    for (const [w, h, time] of [
      [1440, 900, "day"],
      [1440, 900, "night"],
      [390, 844, "day"],
      [390, 844, "sunset"],
    ]) {
      const tag = `${id}-${w}-${time}`;
      const { ctx, page, errors } = await open({ w, h, time, intro: id });
      await page.waitForTimeout(2600);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      await shot(page, `${tag}-1-start`);
      for (const s of ["math", "rw"]) {
        if (w < 768) await page.focus(choice(SLUGS[s]));
        else await page.mouse.move(...(await centerOf(page, SLUGS[s])));
        await page.waitForTimeout(1300);
        await shot(page, `${tag}-2-hover-${s}`);
      }
      await page.evaluate(() => document.activeElement?.blur());
      const pick = time === "night" ? "rw" : "math";
      const [x, y] = await centerOf(page, SLUGS[pick]);
      await page.mouse.click(x, y);
      if (w < 768) await page.mouse.click(x, y);
      await page.waitForTimeout(id === 9 ? 1700 : 1200);
      await shot(page, `${tag}-3-mid-${pick}`);
      await page
        .waitForSelector(`[data-view="${SLUGS[pick]}"]:not([hidden])`, { timeout: 9000 })
        .catch(() => {});
      await page.waitForTimeout(1600);
      const openScroll = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth
      );
      await shot(page, `${tag}-4-end-${pick}`);
      report.push({ tag, scroll, openScroll, errors });
      await ctx.close();
    }
    /* Reduced motion: a cross-fade. */
    const { ctx, page, errors } = await open({
      w: 1440,
      h: 900,
      time: "day",
      intro: id,
      reduced: true,
    });
    await page.waitForTimeout(1500);
    await page.mouse.move(...(await centerOf(page, "math")));
    await page.waitForTimeout(500);
    await shot(page, `${id}-reduced-hover-math`);
    await page.mouse.click(...(await centerOf(page, "math")));
    await page.waitForTimeout(250);
    await shot(page, `${id}-reduced-mid`);
    report.push({ tag: `${id}-reduced`, errors });
    await ctx.close();
  }
}

if (mode === "clips") {
  const tmp = `${CLIPS}/.raw`;
  for (const id of ids) {
    for (const time of times) {
      for (const s of ["math", "rw"]) {
        await rm(tmp, { recursive: true, force: true });
        const { ctx, page, errors, t0 } = await open({
          w: 1440,
          h: 900,
          time,
          intro: id,
          video: tmp,
        });
        /* Wait for the opening to finish painting, then mark where the clip starts. */
        await page.waitForTimeout(1900);
        const start = (Date.now() - t0) / 1000;
        await page.mouse.move(720, 880);
        await page.waitForTimeout(1500);
        const other = s === "math" ? "rw" : "math";
        for (const k of [other, s]) {
          const [x, y] = await centerOf(page, SLUGS[k]);
          await page.mouse.move(x, y, { steps: 14 });
          await page.waitForTimeout(1000);
        }
        await page.mouse.click(...(await centerOf(page, SLUGS[s])));
        await page
          .waitForSelector(`[data-view="${SLUGS[s]}"]:not([hidden])`, { timeout: 9000 })
          .catch(() => {});
        await page.waitForTimeout(1500);
        await ctx.close();
        const [raw] = (await readdir(tmp)).filter((f) => f.endsWith(".webm"));
        const out = `${CLIPS}/intro${id}-${s}-${time}.mp4`;
        execFileSync(FFMPEG, [
          "-y",
          "-loglevel",
          "error",
          "-ss",
          String(Math.max(0, start - 0.3)),
          "-i",
          `${tmp}/${raw}`,
          "-r",
          "30",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "26",
          "-movflags",
          "+faststart",
          out,
        ]);
        report.push({ out, start, errors });
      }
    }
    /* One combined clip per intro: the six in a row, each captioned. */
    const parts = [];
    for (const time of ["day", "sunset", "night"])
      for (const s of ["math", "rw"]) parts.push([`${CLIPS}/intro${id}-${s}-${time}.mp4`, s, time]);
    const args = ["-y", "-loglevel", "error"];
    parts.forEach(([f]) => args.push("-i", f));
    const label = { math: "Math", rw: "Reading and Writing" };
    const filters = parts.map(([, s, time], i) => {
      const text = `${label[s]} · ${time}`;
      return `[${i}:v]scale=1280:800,setsar=1,drawtext=text='${text}':fontcolor=white:fontsize=26:box=1:boxcolor=black@0.45:boxborderw=10:x=24:y=h-th-28[v${i}]`;
    });
    const concat =
      parts.map((_, i) => `[v${i}]`).join("") + `concat=n=${parts.length}:v=1:a=0[out]`;
    args.push(
      "-filter_complex",
      [...filters, concat].join(";"),
      "-map",
      "[out]",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "29",
      "-movflags",
      "+faststart",
      `${CLIPS}/intro${id}-all.tmp.mp4`
    );
    execFileSync(FFMPEG, args);
    await rename(`${CLIPS}/intro${id}-all.tmp.mp4`, `${CLIPS}/intro${id}-all.mp4`);
  }
  await rm(tmp, { recursive: true, force: true });
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
