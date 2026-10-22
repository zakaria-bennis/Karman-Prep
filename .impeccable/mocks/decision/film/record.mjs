// Records a smooth scroll-through of the landing page, one frame at a time.
// Needs the preview server on :8765. Usage: node record.mjs width height seconds out.mp4
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [w, h, secs, out] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const FPS = 24,
  n = secs * FPS,
  dir = mkdtempSync(join(tmpdir(), "rec-"));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://localhost:8765/film/index.html?rec=1");
await p.waitForTimeout(2500);
const max = await p.evaluate(() => window.__max());
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // gentle start and stop
for (let i = 0; i < n; i++) {
  const t = i / (n - 1),
    y = Math.round(max * (0.04 * t + 0.96 * ease(t)));
  await p.evaluate(
    ([y, ms]) => {
      window.__clock(ms);
      return window.__go(y);
    },
    [y, (i * 1000) / FPS]
  );
  await p.screenshot({
    path: join(dir, `f${String(i).padStart(5, "0")}.jpg`),
    type: "jpeg",
    quality: 82,
  });
}
await b.close();
execFileSync("ffmpeg", [
  "-loglevel",
  "error",
  "-y",
  "-framerate",
  String(FPS),
  "-i",
  join(dir, "f%05d.jpg"),
  "-c:v",
  "libx264",
  "-crf",
  "22",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  out,
]);
rmSync(dir, { recursive: true });
console.log(`saved ${out}`);
