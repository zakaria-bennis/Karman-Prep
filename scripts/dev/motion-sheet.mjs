// A film strip of an animation, so motion can be judged and not guessed: opens a page, optionally scrolls
// to an element and hovers or clicks something, then captures frames at a steady rate and tiles them into
// one image, each frame stamped with its time.
//
//   node scripts/dev/motion-sheet.mjs --out strip.jpg [--url /?paint-in=1] [--sel "#m-10"]
//        [--hover ".seg button"] [--click ".seg button:nth-child(2)"] [--ms 3000] [--every 200]
//        [--width 1440] [--height 900] [--scheme light|dark] [--cols 5] [--settle 800]
//
// --sel scrolls that element to the middle of the screen and crops every frame to it. --hover and --click
// happen at time 0, so the strip shows the response. --settle waits before time 0 (for a load to finish).
import { chromium } from "playwright";
import sharp from "sharp";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "http://localhost:3320");
const url = arg("url", "/");
const sel = arg("sel");
const out = arg("out", "motion-sheet.jpg");
const ms = +arg("ms", 3000);
const every = +arg("every", 200);
const width = +arg("width", 1440);
const height = +arg("height", 900);
const cols = +arg("cols", 5);
const settle = +arg("settle", 800);

const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
const page = await (
  await browser.newContext({ viewport: { width, height }, colorScheme: arg("scheme", "light") })
).newPage();
await page.addInitScript(() => {
  /* keep the developer badge and the consent bar out of the picture */
  const style = document.createElement("style");
  style.textContent =
    'nextjs-portal,[role="dialog"][aria-labelledby="replay-consent-title"]{display:none!important}';
  document.addEventListener("DOMContentLoaded", () => document.head.append(style));
});
await page.goto(base + url, { waitUntil: "load" });
if (sel)
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), sel);
await page.waitForTimeout(settle);
const clip = sel
  ? await page
      .locator(sel)
      .first()
      .boundingBox()
      .then((b) => {
        if (!b) return undefined;
        const y = Math.max(0, b.y);
        return {
          x: Math.max(0, b.x),
          y,
          width: Math.min(width, b.width),
          height: Math.min(height - y, b.height),
        };
      })
  : undefined;
if (arg("hover")) {
  const b = await page.locator(arg("hover")).first().boundingBox();
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
}
if (arg("click"))
  await page
    .locator(arg("click"))
    .first()
    .evaluate((el) => el.click());

const frames = [];
const t0 = Date.now();
for (let t = 0; t <= ms; t += every) {
  const wait = t0 + t - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  frames.push({ at: Date.now() - t0, png: await page.screenshot({ clip, type: "png" }) });
}
await browser.close();

/* tile the frames, each at most 640 wide, with its time in the corner */
const first = await sharp(frames[0].png).metadata();
const w = Math.min(640, first.width);
const h = Math.round((first.height / first.width) * w);
const rows = Math.ceil(frames.length / cols);
const pad = 6;
const tiles = await Promise.all(
  frames.map(async (f, i) => ({
    input: await sharp(f.png)
      .resize(w, h)
      .composite([
        {
          input: Buffer.from(
            `<svg width="110" height="34"><rect width="110" height="34" rx="6" fill="#000a"/><text x="55" y="23" font-family="Helvetica" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">${(f.at / 1000).toFixed(2)} s</text></svg>`
          ),
          top: 8,
          left: 8,
        },
      ])
      .png()
      .toBuffer(),
    left: pad + (i % cols) * (w + pad),
    top: pad + Math.floor(i / cols) * (h + pad),
  }))
);
await sharp({
  create: {
    width: pad + cols * (w + pad),
    height: pad + rows * (h + pad),
    channels: 3,
    background: "#ffffff",
  },
})
  .composite(tiles)
  .jpeg({ quality: 80 })
  .toFile(out);
console.log(`${frames.length} frames over ${(frames.at(-1).at / 1000).toFixed(1)} s -> ${out}`);
