// Grades and encodes every clip for the landing page, per docs/style-bible.md:
// one shared grade (lifted blacks, slightly cool shadows), 1440px wide (grain is a CSS overlay on the page),
// a keyframe every 4 frames so scroll scrubbing is smooth, no audio, plus a poster.
// Run from the repo root: node .impeccable/mocks/decision/film/encode.mjs
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
  // NASA, "ISS Airglow" (Goddard, 2018), public domain: tone down the red-violet upper band
  [
    "c9",
    join(DIR, "raw/nasa/airglow.mp4"),
    [0, 14],
    "huesaturation=colors=r+m:saturation=-0.55:strength=1,",
  ],
];

const GRADE =
  "eq=contrast=0.97:saturation=0.95,curves=r='0/0.035 1/0.98':g='0/0.045 1/0.98':b='0/0.06 1/0.99'";

for (const [id, file, trim, extra = ""] of CLIPS) {
  if (!file || !existsSync(file)) {
    console.log(`${id}: no source yet, skipped`);
    continue;
  }
  const out = join(DIR, `${id}.mp4`);
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    ...cut,
    "-i",
    file,
    "-an",
    "-vf",
    `${extra}scale=1440:-2:flags=lanczos,${GRADE},format=yuv420p`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "27",
    "-g",
    "4",
    "-keyint_min",
    "4",
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
    "4",
    join(DIR, `${id}.jpg`),
  ]);
  const mb = (Number(execFileSync("stat", ["-f", "%z", out]).toString()) / 1e6).toFixed(1);
  console.log(`${id}: ${mb} MB`);
}
