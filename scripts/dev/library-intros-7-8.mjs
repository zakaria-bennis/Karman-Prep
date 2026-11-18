/*
 * Headless pictures and clips of Library intros 7 (folded map) and 8 (lanterns).
 * Needs a dev server with the dev sign-in bypass (BASE, default http://localhost:3178).
 *   node scripts/dev/library-intros-7-8.mjs shots [filter]   stills at 1440 and 390 wide
 *   node scripts/dev/library-intros-7-8.mjs clips [filter]   real-time clips at 1440 x 900
 * Writes to docs/overnight/reports/library-intros/. Uses the installed Chrome.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3178";
const OUT = "docs/overnight/reports/library-intros";
const CLIPS = `${OUT}/clips`;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const [mode = "shots", only = ""] = process.argv.slice(2);
const day = new Date().toISOString().slice(0, 10);
const NAME = { math: "Math", rw: "Reading and Writing" };
await mkdir(CLIPS, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

async function open({ intro, w, h, time = "day", reduced = false, video = null }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
    hasTouch: w < 768,
    ...(video ? { recordVideo: { dir: video, size: { width: w, height: h } } } : {}),
  });
  await ctx.addInitScript((d) => {
    try {
      localStorage.setItem("karman-challenge-closed", d);
      sessionStorage.setItem("karman:painted-in", "1");
      sessionStorage.removeItem("karman:library-course");
    } catch {}
  }, day);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const t0 = Date.now();
  await page.goto(`${BASE}/dashboard/student/library?intro=${intro}&paint-time=${time}`, {
    waitUntil: "load",
  });
  /* Ready: the intro's paint-in is done and its choices are enabled. */
  await page.waitForFunction(
    () => {
      const b = document.querySelectorAll("button[data-subject], button[aria-label$='done']");
      return b.length >= 2 && [...b].every((x) => !x.disabled);
    },
    null,
    { timeout: 90000 }
  );
  return { ctx, page, errors, readyAt: (Date.now() - t0) / 1000 };
}

/** The point to hover or click for a subject. */
async function target(page, intro, sub) {
  if (intro === 7)
    return page.$eval(`button[data-subject="${sub}"] span[class*="name"]`, (el) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
  return page.$eval(`[data-lantern="${sub}"]`, (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
}

const boxOpen = (page) =>
  page.waitForFunction(
    () => {
      const tab = document.querySelector("button[data-tab]");
      return (
        tab &&
        tab.getBoundingClientRect().width > 0 &&
        !document.querySelector("button[data-subject], [data-lantern]")
      );
    },
    null,
    { timeout: 20000 }
  );

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 80, type: "jpeg" });

async function shots() {
  for (const intro of [7, 8])
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ])
      for (const time of ["day", "night"]) {
        const tag = `intro${intro}-${w}-${time}`;
        if (only && !tag.includes(only)) continue;
        const { ctx, page, errors } = await open({ intro, w, h, time });
        await page.waitForTimeout(600);
        await shot(page, `${tag}-1-start`);
        for (const sub of ["math", "rw"]) {
          const [x, y] = await target(page, intro, sub);
          if (w < 768) {
            await page.tap?.("body").catch(() => {});
            await page.touchscreen.tap(x, y);
          } else await page.mouse.move(x, y, { steps: 6 });
          await page.waitForTimeout(900);
          await shot(page, `${tag}-2-hover-${sub}`);
        }
        const sub = time === "day" ? "math" : "rw";
        const [x, y] = await target(page, intro, sub);
        if (w < 768) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
        if (w < 768) {
          /* The first tap on rw (after hovering rw last) already chose it on the night pass;
             tap twice only when needed. */
          await page.waitForTimeout(150);
          const still = await page.$(
            `button[data-subject="${sub}"]:not([disabled]), button:not([disabled]) [data-lantern="${sub}"]`
          );
          if (still) await page.touchscreen.tap(x, y);
        }
        await page.waitForTimeout(1300);
        await shot(page, `${tag}-3-mid`);
        await boxOpen(page).catch(() => errors.push("box did not open"));
        await page.waitForTimeout(900);
        await shot(page, `${tag}-4-end-${sub}`);
        const sideways = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        );
        console.log(tag, errors.length ? errors : "ok", sideways ? "SIDEWAYS SCROLL" : "");
        await ctx.close();
      }
}

async function clips() {
  const made = {};
  for (const intro of [7, 8])
    for (const time of ["day", "sunset", "night"])
      for (const sub of ["math", "rw"]) {
        const tag = `intro${intro}-${sub}-${time}`;
        if (only && !tag.includes(only)) continue;
        const dir = `${CLIPS}/tmp-${tag}`;
        await rm(dir, { recursive: true, force: true });
        const { ctx, page, errors, readyAt } = await open({
          intro,
          w: 1440,
          h: 900,
          time,
          video: dir,
        });
        await page.mouse.move(720, 880);
        await page.waitForTimeout(1500);
        for (const s of ["math", "rw"]) {
          const [x, y] = await target(page, intro, s);
          await page.mouse.move(x, y, { steps: 12 });
          await page.waitForTimeout(1000);
        }
        const [x, y] = await target(page, intro, sub);
        await page.mouse.move(x, y, { steps: 10 });
        await page.waitForTimeout(250);
        await page.mouse.click(x, y);
        await boxOpen(page).catch(() => errors.push("box did not open"));
        await page.waitForTimeout(1600);
        await ctx.close();
        const [raw] = (await readdir(dir)).filter((f) => f.endsWith(".webm"));
        const out = `${CLIPS}/${tag}.mp4`;
        /* Trim the load and paint-in before the opening screen is ready. */
        execFileSync(FFMPEG, [
          "-y",
          "-loglevel",
          "error",
          "-ss",
          String(Math.max(0, readyAt + 0.25)),
          "-i",
          `${dir}/${raw}`,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "26",
          "-movflags",
          "+faststart",
          "-r",
          "30",
          out,
        ]);
        await rm(dir, { recursive: true, force: true });
        made[tag] = out;
        console.log(tag, errors.length ? errors : "ok");
      }
  /* One clip per intro: the six in a row, each with a small caption. */
  for (const intro of [7, 8]) {
    const parts = ["day", "sunset", "night"].flatMap((t) => ["math", "rw"].map((s) => [s, t]));
    const files = parts.map(([s, t]) => `${CLIPS}/intro${intro}-${s}-${t}.mp4`);
    const args = ["-y", "-loglevel", "error"];
    files.forEach((f) => args.push("-i", f));
    const font = "/System/Library/Fonts/Supplemental/Arial.ttf";
    const chains = parts.map(
      ([s, t], i) =>
        `[${i}:v]scale=1280:800,setsar=1,drawtext=fontfile=${font}:text='${NAME[s]} · ${t}':x=28:y=h-56:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=10[v${i}]`
    );
    const cat = parts.map((_, i) => `[v${i}]`).join("") + `concat=n=${parts.length}:v=1:a=0[out]`;
    args.push("-filter_complex", [...chains, cat].join(";"), "-map", "[out]");
    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "30",
      "-movflags",
      "+faststart",
      `${CLIPS}/intro${intro}-all.mp4`
    );
    try {
      execFileSync(FFMPEG, args);
      console.log(`intro${intro}-all ok`);
    } catch (e) {
      console.log(`intro${intro}-all failed`, String(e).slice(0, 300));
    }
  }
}

async function frames() {
  const [intro, sub, time] = only.split(",");
  const { ctx, page } = await open({ intro: Number(intro), w: 1440, h: 900, time });
  const [x, y] = await target(page, Number(intro), sub);
  await page.mouse.click(x, y);
  for (let i = 0; i < 16; i++) {
    await shot(page, `frames-intro${intro}-${sub}-${time}-${String(i).padStart(2, "0")}`);
    await page.waitForTimeout(120);
  }
  await ctx.close();
}

if (mode === "frames") await frames();
else if (mode === "clips") await clips();
else await shots();
await browser.close();
