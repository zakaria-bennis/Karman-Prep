#!/usr/bin/env node
// Device composites for the site's people photos (2026-11-08).
//
// In every people photo the person's own phone or laptop faces them, so the screen is never seen. Each photo
// gets one of Karman's own code-drawn devices in the foreground, showing a real Karman screen:
// the iPhone 17 Pro in Cosmic Orange (the site's phone.css) or a Space Black MacBook Pro, both drawn in
// HTML/CSS. The screens are screenshots of Karman's product screens on the live site (page loads only,
// nothing is clicked or submitted, never the pricing page).
//
// The founder kept these versions (8 November), so the site's files are the composites and the original
// photos and clips are no longer in the tree. The script reads them from git at SOURCE (the commit every
// overnight branch starts from), so it can always start again from the clean photos.
//
// Writes, per photo in PHOTOS below:
//   public/site/photos/p-<name>.webp (1400x1750) and p-<name>-800.webp (800x1000)
//   public/site/clips/c-<name>.mp4 when the photo has a clip (the same device over the clip)
//   docs/overnight/reports/site-audit/photos/<name>.jpg (before/after sheet: original left, composite right)
//
// Run:  node scripts/site/device-photos.mjs [base-url] [--only=daily,bus] [--no-clips] [--no-sheets]
//       base-url defaults to https://karmanprep.com. Re-run whenever the product screens change.
//       --screens=<dir> keeps the captured screens there and reuses them on the next run (for tuning PHOTOS).
// Needs: Playwright's Chromium and sharp (both in the repo), ffmpeg on PATH for the clips.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(join(ROOT, "package.json"));
const sharp = require("sharp");
const { chromium } = require("playwright");

/* ---------- one row per photo ----------
   device  phone (iPhone 17 Pro, Cosmic Orange) or laptop (MacBook Pro, Space Black)
   screen  which Karman screen it shows (SCREENS below)
   x, y    the device's centre, in % of the photo's width and height
   w       the device's width, in % of the photo's width
   ry, rx, rz  the lean in degrees: turn about the vertical axis, tilt back, roll
   shadow  the direction the shadow falls in degrees (0 right, 90 down, 180 left), following the photo's light
   Keep every device inside x 9-91% and y 18-86% (the site's 4:5, 5:6 and 1:1 crops) and off faces and hands. */
const PHOTOS = {
  daily: {
    device: "phone",
    screen: "daily10",
    x: 75.6,
    y: 42.6,
    w: 28,
    ry: -12,
    rx: 2,
    rz: 2,
    shadow: 120,
    clip: true,
  },
  bus: {
    device: "phone",
    screen: "daily10",
    x: 24.6,
    y: 41.6,
    w: 27.5,
    ry: 12,
    rx: 2,
    rz: -2,
    shadow: 60,
  },
  about: {
    device: "phone",
    screen: "daily10",
    x: 79.3,
    y: 68.2,
    w: 20,
    ry: -12,
    rx: 2,
    rz: 3,
    shadow: 110,
  },
  guarantee: {
    device: "phone",
    screen: "parent",
    x: 75.4,
    y: 43.2,
    w: 28,
    ry: -12,
    rx: 2,
    rz: 2,
    shadow: 120,
  },
  program: {
    device: "laptop",
    screen: "zoom",
    x: 67.7,
    y: 72.2,
    w: 46,
    ry: -10,
    rx: 3,
    rz: 0,
    shadow: 70,
  },
  lin: {
    device: "laptop",
    screen: "zoom",
    x: 31.3,
    y: 72.6,
    w: 44,
    ry: 10,
    rx: 3,
    rz: 0,
    shadow: 110,
  },
  private: {
    device: "laptop",
    screen: "review",
    x: 69,
    y: 72.6,
    w: 43,
    ry: -10,
    rx: 3,
    rz: 0,
    shadow: 70,
  },
  call: {
    device: "laptop",
    screen: "zoom",
    x: 32.2,
    y: 72.4,
    w: 46,
    ry: 10,
    rx: 3,
    rz: 0,
    shadow: 110,
    clip: true,
  },
  test: {
    device: "laptop",
    screen: "review",
    x: 67.7,
    y: 72.4,
    w: 46,
    ry: -10,
    rx: 3,
    rz: 0,
    shadow: 70,
  },
  start: {
    device: "laptop",
    screen: "review",
    x: 71.9,
    y: 31.2,
    w: 37.5,
    ry: -10,
    rx: 2,
    rz: 0,
    shadow: 80,
  },
  pricing: {
    device: "laptop",
    screen: "review",
    x: 70.9,
    y: 74.8,
    w: 40,
    ry: -10,
    rx: 3,
    rz: 0,
    shadow: 70,
  },
};

/* Karman's product screens on the live site (src/components/site/live/screens.ts, home/DailyTenDemo.tsx).
   The Daily 10 is captured in its question state, before any choice is picked. */
const SCREENS = {
  daily10: { path: "/", sel: "#m-4 .turn .scr", kind: "phone" },
  // design rule 47: no screen held by a person shows a score, so the parent view drops its score card here
  parent: { path: "/", sel: "#m-5 .turn .scr", kind: "phone", hide: ".est" },
  zoom: { path: "/program", sel: "#m-2 figure.wide .scr", kind: "wide" },
  review: { path: "/private-tutoring", sel: "#m-3 figure.wide .scr", kind: "wide" },
};

const W = 1400,
  H = 1750,
  SAFE = { x0: 9, x1: 91, y0: 18, y1: 86 };
const CLIP = { w: 720, h: 900 };
const SUPER = 2; // the device layer is drawn at 2x and scaled down, for clean edges

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith("--")) ?? "https://karmanprep.com").replace(/\/$/, "");
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const CLIPS = !args.includes("--no-clips");
const SHEETS = !args.includes("--no-sheets");
const CACHE = args.find((a) => a.startsWith("--screens="))?.slice(10);

/** A commit whose public/site/photos and public/site/clips are the original photos, without devices. */
const SOURCE = "bbe7e094bc0d96d4eee7c8cced9d2d602049d11e";
const original = (rel) =>
  execFileSync("git", ["show", `${SOURCE}:${rel}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const PHOTO_DIR = join(ROOT, "public/site/photos");
const CLIP_DIR = join(ROOT, "public/site/clips");
const SHEET_DIR = join(ROOT, "docs/overnight/reports/site-audit/photos");

/* Flatten the site's lean and reveal motion so each screen is captured square and settled, and hide what the
   site's own frame draws over it (island, home indicator, reflection): the composite draws its own. */
const FLATTEN = `
  .turn, .turn .iphone, .media, .rv, .wide { transform: none !important; translate: none !important; rotate: none !important; scale: none !important; transition: none !important; animation: none !important; }
  .rv { opacity: 1 !important; }
  .iphone .glass::after, .iphone .island, .iphone .home { display: none !important; }
  .scr, .scr-host { border-radius: 0 !important; }
  .wide { width: 640px !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; }
`;

async function captureScreens(browser, keys) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  const out = {};
  for (const key of keys) {
    const s = SCREENS[key];
    const cached = CACHE && join(CACHE, `${key}.png`);
    if (cached && existsSync(cached)) {
      out[key] = await describe(readFileSync(cached));
      continue;
    }
    await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 90000 });
    await page.addStyleTag({ content: FLATTEN });
    if (s.hide)
      await page.addStyleTag({ content: `${s.sel} ${s.hide} { display: none !important; }` });
    const el = page.locator(s.sel).first();
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    // lazy images (the Zoom tiles) and web fonts must be in before the shot
    await el.evaluate(async (e) => {
      await document.fonts.ready;
      const imgs = [...e.querySelectorAll("img")];
      imgs.forEach((i) => (i.loading = "eager"));
      await Promise.all(
        imgs.map((i) =>
          i.complete && i.naturalWidth
            ? null
            : new Promise((r) => {
                i.addEventListener("load", r, { once: true });
                i.addEventListener("error", r, { once: true });
                setTimeout(r, 15000);
              })
        )
      );
    });
    await page.waitForTimeout(600);
    const png = await el.screenshot({ animations: "disabled" });
    if (CACHE)
      (mkdirSync(CACHE, { recursive: true }), writeFileSync(join(CACHE, `${key}.png`), png));
    out[key] = await describe(png);
    console.log(`screen ${key}: ${out[key].w}x${out[key].h} from ${BASE + s.path}`);
  }
  await ctx.close();
  return out;
}

/** A captured screen's size, and whether its bottom edge is dark (the home indicator is then light). */
async function describe(png) {
  const meta = await sharp(png).metadata();
  const { channels } = await sharp(png)
    .extract({ left: 0, top: meta.height - 12, width: meta.width, height: 12 })
    .stats();
  const lum = 0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean;
  return { png, w: meta.width, h: meta.height, dark: lum < 128 };
}

/* ---------- the devices, drawn in CSS ---------- */

// The iPhone 17 Pro in Cosmic Orange: src/app/(site)/styles/phone.css without the .ks scope.
const PHONE_CSS = `
.iphone { --band: calc(var(--pw) * 0.014); --bez: calc(var(--pw) * 0.03); --r: calc(var(--pw) * 0.19);
  position: relative; flex: none; width: var(--pw); aspect-ratio: 71.9 / 150; border-radius: var(--r);
  background: linear-gradient(145deg, #f4a56c 0%, #d9692c 30%, #c35a22 62%, #e88a4c 100%);
  box-shadow: inset 0 0 0 calc(var(--pw) * 0.003) rgba(255, 226, 200, .55); }
.iphone .glass { position: absolute; inset: var(--band); border-radius: calc(var(--r) - var(--band)); background: #050506; padding: var(--bez); overflow: hidden; }
.iphone .glass::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(120deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 72%, rgba(255,255,255,.04) 100%); }
.iphone .scr-host { display: block; width: 100%; height: 100%; border-radius: calc(var(--r) - var(--band) - var(--bez)); overflow: hidden; background-size: 100% 100%; }
.iphone .island { position: absolute; left: 50%; top: calc(var(--bez) + var(--pw) * 0.026); width: calc(var(--pw) * 0.3); height: calc(var(--pw) * 0.088); transform: translateX(-50%); border-radius: 999px; background: #000; z-index: 2; }
.iphone .island::after { content: ""; position: absolute; right: 18%; top: 50%; width: calc(var(--pw) * 0.03); aspect-ratio: 1; transform: translateY(-50%); border-radius: 50%; background: radial-gradient(circle at 35% 35%, #2a3550, #07080c 70%); }
.iphone .btns { position: absolute; inset: 0; pointer-events: none; }
.iphone .btns::before, .iphone .btns::after { content: ""; position: absolute; width: calc(var(--pw) * 0.012); border-radius: 99px; background: #c25a22; }
.iphone .btns::before { left: calc(var(--pw) * -0.009); top: 19%; height: 5%; box-shadow: 0 calc(var(--pw) * 0.12) 0 #c25a22, 0 calc(var(--pw) * 0.24) 0 #c25a22; }
.iphone .btns::after { right: calc(var(--pw) * -0.009); top: 27%; height: 10%; }
.iphone .home { position: absolute; left: 50%; bottom: calc(var(--bez) + var(--pw) * 0.022); width: 34%; height: calc(var(--pw) * 0.013); transform: translateX(-50%); border-radius: 99px; background: rgba(10,10,10,.82); z-index: 2; }
.iphone .home.on-dark { background: rgba(255,255,255,.8); }
.iphone .glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 3;
  background: linear-gradient(116deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.11) 41%, rgba(255,255,255,.04) 52%, rgba(255,255,255,0) 58%); }
`;

// A MacBook Pro in Space Black, seen nearly front-on: dark anodised lid lit along the top, a thin black glass
// bezel with the camera notch, rounded top corners, and the base's front edge below the hinge.
const LAPTOP_CSS = `
.mbp { position: relative; width: var(--w); }
.mbp .lid { position: relative; margin: 0 auto; width: calc(var(--w) * 0.966); box-sizing: border-box; padding: calc(var(--w) * 0.0042);
  border-radius: calc(var(--w) * 0.030) calc(var(--w) * 0.030) calc(var(--w) * 0.006) calc(var(--w) * 0.006);
  background: linear-gradient(180deg, #5b5c61 0%, #3d3e42 1.1%, #313236 12%, #2b2c2f 60%, #28292c 100%);
  box-shadow: inset 0 calc(var(--w) * 0.0011) 0 rgba(255,255,255,.28), inset 0 0 0 calc(var(--w) * 0.0007) rgba(255,255,255,.07); }
.mbp .glass { position: relative; overflow: hidden; background: #060607; padding: calc(var(--w) * 0.021) calc(var(--w) * 0.016) calc(var(--w) * 0.027);
  border-radius: calc(var(--w) * 0.026) calc(var(--w) * 0.026) calc(var(--w) * 0.0035) calc(var(--w) * 0.0035);
  box-shadow: inset 0 0 0 calc(var(--w) * 0.0008) rgba(0,0,0,.9); }
.mbp .disp { width: 100%; aspect-ratio: var(--ar); background-size: 100% 100%; border-radius: calc(var(--w) * 0.0075) calc(var(--w) * 0.0075) 0 0; }
.mbp .notch { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: calc(var(--w) * 0.068); height: calc(var(--w) * 0.0275);
  background: #060607; border-radius: 0 0 calc(var(--w) * 0.0065) calc(var(--w) * 0.0065); z-index: 2; }
.mbp .notch i { position: absolute; left: 50%; top: calc(var(--w) * 0.0085); width: calc(var(--w) * 0.0068); aspect-ratio: 1; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #33405e, #0a0b10 62%); box-shadow: 0 0 0 calc(var(--w) * 0.0012) #141518; }
.mbp .glare { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: linear-gradient(112deg, rgba(255,255,255,0) 34%, rgba(255,255,255,.085) 44%, rgba(255,255,255,.03) 53%, rgba(255,255,255,0) 58%); }
.mbp .hinge { width: calc(var(--w) * 0.90); height: calc(var(--w) * 0.0055); margin: 0 auto; background: linear-gradient(180deg, #08080a, #1d1e21);
  border-radius: 0 0 calc(var(--w) * 0.002) calc(var(--w) * 0.002); }
.mbp .base { position: relative; width: 100%; height: calc(var(--w) * 0.021);
  border-radius: calc(var(--w) * 0.003) calc(var(--w) * 0.003) calc(var(--w) * 0.022) calc(var(--w) * 0.022) / calc(var(--w) * 0.003) calc(var(--w) * 0.003) calc(var(--w) * 0.013) calc(var(--w) * 0.013);
  background: linear-gradient(180deg, #77787d 0%, #4b4c51 12%, #36373b 34%, #2a2b2e 70%, #1f2023 100%); }
.mbp .base i { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: calc(var(--w) * 0.15); height: calc(var(--w) * 0.0065);
  border-radius: 0 0 calc(var(--w) * 0.012) calc(var(--w) * 0.012); background: linear-gradient(180deg, #1b1c1f, #2f3034); }
`;

function deviceHtml(p, scr) {
  const pw = (p.w / 100) * W;
  const url = `data:image/png;base64,${scr.png.toString("base64")}`;
  if (p.device === "phone") {
    return `<div class="iphone dev" style="--pw:${pw}px">
      <span class="btns"></span>
      <div class="glass">
        <div class="scr-host" style="background-image:url(${url})"></div>
        <span class="island"></span><span class="home${scr.dark ? " on-dark" : ""}"></span><span class="glare"></span>
      </div>
    </div>`;
  }
  return `<div class="mbp dev" style="--w:${pw}px; --ar:${scr.w} / ${scr.h}">
    <div class="lid"><div class="glass">
      <div class="disp" style="background-image:url(${url})"></div>
      <div class="notch"><i></i></div><div class="glare"></div>
    </div></div>
    <div class="hinge"></div>
    <div class="base"><i></i></div>
  </div>`;
}

/* The device layer alone, on a transparent page: the device, its lean, and its shadow on the photo. */
function layerHtml(p, scr) {
  const pw = (p.w / 100) * W;
  const a = (p.shadow * Math.PI) / 180;
  const off = (d) => `${(Math.cos(a) * d).toFixed(1)}px, ${(Math.sin(a) * d).toFixed(1)}px`;
  const radius =
    p.device === "phone"
      ? `${pw * 0.19}px`
      : `${pw * 0.03}px ${pw * 0.03}px ${pw * 0.02}px ${pw * 0.02}px`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: transparent; }
    * { box-sizing: border-box; }
    .stage { position: absolute; left: ${(p.x / 100) * W}px; top: ${(p.y / 100) * H}px; width: 0; height: 0; perspective: ${Math.round(pw * 5)}px; }
    .tilt { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%) rotateZ(${p.rz}deg) rotateY(${p.ry}deg) rotateX(${p.rx}deg); }
    .amb, .contact { position: absolute; pointer-events: none; }
    .amb { inset: 2% 3% 0 3%; border-radius: ${radius}; background: rgba(12, 10, 8, .42); filter: blur(${(pw * 0.07).toFixed(1)}px); transform: translate(${off(pw * 0.06)}); }
    .contact { inset: 1% 1.5% -0.5% 1.5%; border-radius: ${radius}; background: rgba(8, 6, 4, .5); filter: blur(${(pw * 0.018).toFixed(1)}px); transform: translate(${off(pw * 0.016)}); }
    .mbp ~ .floor, .floor { position: absolute; left: 6%; right: 6%; bottom: ${-pw * 0.014}px; height: ${pw * 0.03}px; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(6,5,4,.62), rgba(6,5,4,0)); filter: blur(${(pw * 0.006).toFixed(1)}px); transform: translate(${off(pw * 0.01)}); }
    ${PHONE_CSS}
    ${LAPTOP_CSS}
  </style></head><body>
    <div class="stage"><div class="tilt">
      <div class="amb"></div><div class="contact"></div>
      ${p.device === "laptop" ? '<div class="floor"></div>' : ""}
      ${deviceHtml(p, scr)}
    </div></div>
  </body></html>`;
}

async function renderLayer(page, p, scr) {
  await page.setContent(layerHtml(p, scr), { waitUntil: "load" });
  const box = await page.evaluate(() => {
    const r = document.querySelector(".dev").getBoundingClientRect();
    return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
  });
  const png = await page.screenshot({ omitBackground: true, type: "png" });
  return { png, box };
}

function kb(file) {
  return Math.round(statSync(file).size / 1024);
}

async function main() {
  const names = Object.keys(PHOTOS).filter((n) => !ONLY || ONLY.includes(n));
  mkdirSync(SHEET_DIR, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "karman-device-photos-"));
  const browser = await chromium.launch();
  try {
    const screens = await captureScreens(browser, [...new Set(names.map((n) => PHOTOS[n].screen))]);
    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: SUPER,
    });
    const page = await ctx.newPage();
    for (const name of names) {
      const p = PHOTOS[name];
      const { png, box } = await renderLayer(page, p, screens[p.screen]);
      const pct = {
        x0: (box.x0 / W) * 100,
        x1: (box.x1 / W) * 100,
        y0: (box.y0 / H) * 100,
        y1: (box.y1 / H) * 100,
      };
      const inside =
        pct.x0 >= SAFE.x0 && pct.x1 <= SAFE.x1 && pct.y0 >= SAFE.y0 && pct.y1 <= SAFE.y1;
      const layer = await sharp(png).resize(W, H, { kernel: "lanczos3" }).png().toBuffer();
      const src = original(`public/site/photos/p-${name}.webp`);
      const full = await sharp(src)
        .composite([{ input: layer }])
        .png()
        .toBuffer();
      const out = join(PHOTO_DIR, `p-${name}.webp`);
      const out800 = join(PHOTO_DIR, `p-${name}-800.webp`);
      await sharp(full).webp({ quality: 82, effort: 6 }).toFile(out);
      await sharp(full)
        .resize(800, 1000, { kernel: "lanczos3" })
        .webp({ quality: 82, effort: 6 })
        .toFile(out800);
      console.log(
        `${name}: ${p.device} / ${p.screen}, box x ${pct.x0.toFixed(1)}-${pct.x1.toFixed(1)}% y ${pct.y0.toFixed(1)}-${pct.y1.toFixed(1)}%` +
          `${inside ? "" : "  OUTSIDE THE SAFE AREA"} | ${Math.round(src.length / 1024)} KB -> ${kb(out)} KB, 800: ${Math.round(original(`public/site/photos/p-${name}-800.webp`).length / 1024)} KB -> ${kb(out800)} KB`
      );

      if (SHEETS) {
        const half = (input) => sharp(input).resize(600, 750, { kernel: "lanczos3" }).toBuffer();
        await sharp({ create: { width: 1200, height: 750, channels: 3, background: "#ffffff" } })
          .composite([
            { input: await half(src), left: 0, top: 0 },
            { input: await half(full), left: 600, top: 0 },
          ])
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(join(SHEET_DIR, `${name}.jpg`));
      }

      if (CLIPS && p.clip) {
        const clipIn = join(tmp, `${name}-original.mp4`);
        writeFileSync(clipIn, original(`public/site/clips/c-${name}.mp4`));
        const clipOut = join(CLIP_DIR, `c-${name}.mp4`);
        const overlay = join(tmp, `${name}-overlay.png`);
        writeFileSync(
          overlay,
          await sharp(png).resize(CLIP.w, CLIP.h, { kernel: "lanczos3" }).png().toBuffer()
        );
        // the original's bitrate, plus a little for the device's detail; two passes to land on it
        const rate = Number(
          execFileSync("ffprobe", [
            "-v",
            "error",
            "-show_entries",
            "format=bit_rate",
            "-of",
            "csv=p=0",
            clipIn,
          ])
            .toString()
            .trim()
        );
        const kbps = Math.round((rate / 1000) * 1.15);
        const common = [
          "-filter_complex",
          "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
          "-map",
          "[v]",
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-profile:v",
          "high",
          "-pix_fmt",
          "yuv420p",
          "-b:v",
          `${kbps}k`,
          "-maxrate",
          `${kbps * 2}k`,
          "-bufsize",
          `${kbps * 4}k`,
          "-t",
          "10",
          "-passlogfile",
          join(tmp, name),
        ];
        const inputs = ["-v", "error", "-y", "-i", clipIn, "-loop", "1", "-i", overlay];
        execFileSync("ffmpeg", [...inputs, ...common, "-pass", "1", "-f", "mp4", "/dev/null"]);
        execFileSync("ffmpeg", [
          ...inputs,
          ...common,
          "-pass",
          "2",
          "-movflags",
          "+faststart",
          clipOut,
        ]);
        console.log(`  clip: ${kb(clipIn)} KB -> ${kb(clipOut)} KB (${kbps} kbps)`);
      }
    }
    await ctx.close();
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
