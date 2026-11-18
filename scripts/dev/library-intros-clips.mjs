/*
 * Real-time MP4 clips of the Library's opening animations, for the founder to compare
 * (2026-11-08). For each intro, subject (Math or Reading and Writing) and light (day, sunset,
 * night): the opening screen held about 1.5 s, the pointer resting on each side about 1 s, the
 * click, the whole animation to the open Library box, and about 1 s held at the end. Recorded in
 * real time with Chrome's screencast at 1440x900 (every painted frame, with its timestamp), then
 * timed and converted with ffmpeg, so nothing is sped up or slowed down. Also one
 * combined clip per intro (the six in a row, each with a small caption) and the Challenge
 * banner twinkling.
 *   node scripts/dev/library-intros-clips.mjs [ids, e.g. 1,2,3] [skip-challenge]
 * Uses the dev preview /dev/library-intros (no database, no sign-in). Needs the dev server
 * (BASE, default http://localhost:3163) and /opt/homebrew/bin/ffmpeg.
 * Writes to docs/overnight/reports/library-intros/clips/. One browser, one recording at a time.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3163";
const OUT = "docs/overnight/reports/library-intros/clips";
const RAW = join(OUT, ".raw");
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const ids = (process.argv[2] ?? "1,2,3").split(",").map(Number);
const skipChallenge = process.argv[3] === "skip-challenge";
const SIZE = { width: 1440, height: 900 };
const day = new Date().toISOString().slice(0, 10);
const SUBJECTS = [
  ["math", "math", "Math"],
  ["rw", "reading-writing", "Reading and Writing"],
];
const TIMES = ["day", "sunset", "night"];
await mkdir(RAW, { recursive: true });
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const report = [];

const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args]);

let clipNo = 0;

/**
 * Records one page in real time: every frame Chrome paints, with its timestamp, from the moment
 * `act` says the clip begins until it returns. Returns an ffmpeg concat list that holds each frame
 * for exactly as long as it was on screen.
 */
async function record(url, { challenge = false }, act) {
  const ctx = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    colorScheme: url.includes("night") ? "dark" : "light",
  });
  /* Decline the session-replay consent bar, so it does not cover the bottom of the picture. */
  await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: BASE }]);
  await ctx.addInitScript(
    ([d, c]) => {
      try {
        if (!c) localStorage.setItem("karman-challenge-closed", d);
        else localStorage.removeItem("karman-challenge-closed");
        sessionStorage.setItem("karman:painted-in", "1");
        sessionStorage.setItem("karman:library-painted", "1");
      } catch {}
    },
    [day, challenge]
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: SIZE.width,
    maxHeight: SIZE.height,
    everyNthFrame: 1,
  });
  const begin = (await act(page)) / 1000;
  const end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await ctx.close();
  /* Keep the frame on screen at the start, then every frame after. */
  const before = frames.filter((f) => f.t < begin).pop();
  const kept = [
    ...(before ? [{ ...before, t: begin }] : []),
    ...frames.filter((f) => f.t >= begin),
  ];
  const n = clipNo++;
  const lines = [];
  for (const [i, f] of kept.entries()) {
    const name = `c${n}-${String(i).padStart(5, "0")}.jpg`;
    await writeFile(join(RAW, name), Buffer.from(f.data, "base64"));
    const next = i + 1 < kept.length ? kept[i + 1].t : end;
    lines.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  }
  if (kept.length) lines.push(`file 'c${n}-${String(kept.length - 1).padStart(5, "0")}.jpg'`);
  const list = join(RAW, `c${n}.txt`);
  await writeFile(list, lines.join("\n"));
  return { list, frames: kept.length, seconds: +(end - begin).toFixed(2), errors };
}

const button = (slug) => `[data-intro] button[data-slug="${slug}"]`;
async function centerOf(page, slug) {
  return page.$eval(button(slug), (el) => {
    const n = el.querySelector("[data-name]") ?? el;
    const b = n.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  });
}

/** A small caption image ("Math · sunset"), drawn by the browser with a clear background. */
async function caption(text, file) {
  const page = await browser.newPage({ viewport: { width: 520, height: 64 } });
  await page.setContent(
    `<body style="margin:0;background:transparent"><div style="display:inline-block;margin:10px;padding:8px 16px;border-radius:4px;background:rgba(10,12,18,.72);color:#fff;font:600 26px/32px -apple-system,Helvetica,Arial,sans-serif">${text}</div></body>`
  );
  const el = await page.$("div");
  await el.screenshot({ path: file, omitBackground: true });
  await page.close();
}

const encode = (list, dst, extra = []) =>
  ff([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    ...extra,
    "-vf",
    "fps=30,scale=1440:900",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "26",
    "-movflags",
    "+faststart",
    "-an",
    dst,
  ]);

for (const id of ids) {
  const parts = [];
  for (const [short, slug, name] of SUBJECTS) {
    for (const time of TIMES) {
      const file = join(OUT, `intro${id}-${short}-${time}.mp4`);
      const { list, frames, seconds, errors } = await record(
        `${BASE}/dev/library-intros?intro=${id}&paint-time=${time}`,
        {},
        async (page) => {
          await page.waitForSelector(button("math"), { timeout: 90000 });
          await page.waitForTimeout(3200);
          await page.mouse.move(4, 896);
          const begin = Date.now();
          await page.waitForTimeout(1500);
          for (const s of ["math", "reading-writing"]) {
            const [x, y] = await centerOf(page, s);
            await page.mouse.move(x, y, { steps: 18 });
            await page.waitForTimeout(1000);
          }
          const [x, y] = await centerOf(page, slug);
          await page.mouse.move(x, y, { steps: 10 });
          await page.mouse.click(x, y);
          await page
            .waitForSelector(`[data-view="${slug}"]:not([hidden])`, { timeout: 10000 })
            .catch(() => {});
          await page.waitForTimeout(1900);
          return begin;
        }
      );
      encode(list, file);
      parts.push({ file, label: `${name} · ${time}` });
      report.push({
        file,
        frames,
        seconds,
        mb: +((await stat(file)).size / 1e6).toFixed(2),
        errors,
      });
    }
  }
  /* The six in a row, half size, each with its caption. */
  const scaled = [];
  for (const [i, p] of parts.entries()) {
    const cap = join(RAW, `cap-${id}-${i}.png`);
    await caption(p.label, cap);
    const out = join(RAW, `part-${id}-${i}.mp4`);
    ff([
      "-i",
      p.file,
      "-i",
      cap,
      "-filter_complex",
      "[0:v]scale=960:600[v];[v][1:v]overlay=12:12",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "27",
      "-r",
      "30",
      "-an",
      out,
    ]);
    scaled.push(out);
  }
  const list = join(RAW, `list-${id}.txt`);
  await writeFile(list, scaled.map((f) => `file '${f.split("/").pop()}'`).join("\n"));
  const all = join(OUT, `intro${id}-all.mp4`);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", all]);
  report.push({ file: all, mb: +((await stat(all)).size / 1e6).toFixed(2) });
}

if (!skipChallenge) {
  const file = join(OUT, "challenge-twinkle.mp4");
  const { list, frames, seconds, errors } = await record(
    `${BASE}/dev/library-intros?challenge=1&paint-time=night`,
    { challenge: true },
    async (page) => {
      await page.waitForSelector('[role="dialog"]', { timeout: 90000 });
      await page.waitForTimeout(3000);
      const begin = Date.now();
      await page.waitForTimeout(4200);
      return begin;
    }
  );
  encode(list, file, ["-t", "4"]);
  report.push({ file, frames, seconds, mb: +((await stat(file)).size / 1e6).toFixed(2), errors });
}

await browser.close();
for (const f of await readdir(RAW)) await rm(join(RAW, f));
await rm(RAW, { recursive: true });
console.log(JSON.stringify(report));
