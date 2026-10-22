// Grades and encodes every clip for the landing page, per docs/style-bible.md:
// one shared grade (lifted blacks, slightly cool shadows), no audio, plus a poster per size.
// Two versions per clip: 1440px wide for desktop, and a portrait centre crop (3:5, up to 960px tall)
// for phones held upright, where a 16:9 film shown full-screen only ever uses its middle third.
// The page picks one by screen shape. Short keyframe spacing keeps scroll scrubbing smooth.
// Run from the repo root: node .impeccable/mocks/decision/film/encode.mjs [ids...]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = ".impeccable/mocks/decision/film";
const state = JSON.parse(readFileSync("assets/generation-state.json", "utf8"));
const src = (id) => state[id]?.upscaledFile ?? state[id]?.lastFile;

// id on the page -> source file, optional trim [start, end] in seconds, extra filter
const CLIPS = [
  ["c1", src("c1")],
  ["c2", src("c2")],
  ["c3", src("c3")],
  ["c4", src("c4")],
  ["c5", src("c5")],
  ["c6", src("c6")],
  ["c7", src("c7")],
  ["c8a", src("c8a")],
  ["c8b", src("c8b")],
  ["c8c", src("c8c"), [0, 4.4]], // the last 1.6 s swing into a blur; the page's sky takes over instead
  // NOIRLab, "Star Trails Over Mauna Kea" (International Gemini Observatory/NOIRLab/NSF/AURA, CC BY 4.0): dusk to full night
  [
    "night",
    join(DIR, "raw/noirlab/maunakea.mp4"),
    [26, 47.5],
    "eq=brightness=-0.02:saturation=0.9,",
  ],
  // NASA, "ISS Airglow" (Goddard, 2018), public domain: tone down the red-violet upper band.
  // The source is only 1280 x 720, so it is never scaled up (that made it soft and blocky): a light
  // denoise takes out the sensor noise that the encoder turned into streaks, and a lower crf keeps
  // the city lights and stars crisp. A sharper version needs a 4K NASA master (not downloaded yet).
  [
    "c9",
    join(DIR, "raw/nasa/airglow.mp4"),
    [0, 14],
    "hqdn3d=1.5:1.5:4:4,huesaturation=colors=r+m:saturation=-0.55:strength=1,deband=1thr=0.02:2thr=0.02:3thr=0.02:range=22:blur=1,",
    23,
  ],
];

const GRADE =
  "eq=contrast=0.97:saturation=0.95,curves=r='0/0.035 1/0.98':g='0/0.045 1/0.98':b='0/0.06 1/0.99'";

// [file suffix, crop and scale, crf offset, keyframe spacing]
const SIZES = [
  ["", "scale='min(1440,iw)':-2:flags=lanczos", 0, 4], // never upscale a smaller source
  ["-p", "crop=trunc(ih*0.6/2)*2:ih,scale=-2:'min(960,ih)':flags=lanczos", 1, 6],
];
const only = process.argv.slice(2); // optional: encode only these ids
for (const [id, file, trim, extra = "", crf = 27] of CLIPS) {
  if (only.length && !only.includes(id)) continue;
  if (!file || !existsSync(file)) {
    console.log(`${id}: no source yet, skipped`);
    continue;
  }
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  for (const [sfx, size, crfUp, gop] of SIZES) {
    const out = join(DIR, `${id}${sfx}.mp4`);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      ...cut,
      "-i",
      file,
      "-an",
      "-vf",
      `${extra}${size},${GRADE},format=yuv420p`,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(crf + crfUp),
      "-g",
      String(gop),
      "-keyint_min",
      String(gop),
      "-sc_threshold",
      "0",
      "-movflags",
      "+faststart",
      out,
    ]);
    execFileSync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-i",
      out,
      "-frames:v",
      "1",
      "-q:v",
      sfx ? "5" : "4",
      join(DIR, `${id}${sfx}.jpg`),
    ]);
    const mb = (Number(execFileSync("stat", ["-f", "%z", out]).toString()) / 1e6).toFixed(1);
    console.log(`${id}${sfx}: ${mb} MB`);
  }
}
