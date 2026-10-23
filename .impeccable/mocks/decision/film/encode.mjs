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

// id on the page -> source file, optional trim [start, end] in seconds, extra filter, crf
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
  // the last 1.6 s swing into a blur; the next chapter takes over instead. A low crf: the source is soft already
  // (854 x 480, upscaled), so the encoder must not smear her face and the lettering any further
  ["c8c", src("c8c"), [0, 4.4], "", 20],
  // NOIRLab, "Star Trails Over Mauna Kea" (International Gemini Observatory/NOIRLab/NSF/AURA, CC BY 4.0): dusk to full night
  [
    "night",
    join(DIR, "raw/noirlab/maunakea.mp4"),
    [26, 47.5],
    "eq=brightness=-0.02:saturation=0.9,",
  ],
  // NASA, "ISS Airglow" (Goddard, 2018), public domain: tone down the red-violet upper band.
  // airglow-orig.mp4 is NASA's own high-bitrate master (14.7 Mb/s, against 2.3 Mb/s for the web copy
  // used before), same 1280 x 720 frames and timing, so far less of its blocking is baked in.
  // It is never scaled up: a light denoise takes out sensor noise the encoder would turn into streaks,
  // a deband smooths the dark gradient of the night side, and a low crf keeps city lights and stars crisp.
  [
    "c9",
    join(DIR, "raw/nasa/airglow-orig.mp4"),
    [0, 14],
    "hqdn3d=1.5:1.5:4:4,huesaturation=colors=r+m:saturation=-0.55:strength=1,deband=1thr=0.02:2thr=0.02:3thr=0.02:range=22:blur=1,",
    23,
  ],
];

// Phones held upright see a 3:5 slice of each film. By default it is the centre; these clips put
// the slice where the person is (the centre of the slice, as a fraction of the frame width).
const PORTRAIT_X = {
  c3: 0.36, // the mother sits left of centre behind the windshield; keep her face and her phone in
};
// The poster is the still shown before a film loads and, with reduced motion, instead of it. It is
// taken from inside the part of the clip the page plays (seconds in the source), never a dissolve.
const POSTER_AT = {
  c2: 4.2,
  c3: 1.5,
  c4: 2.4,
  c5: 2,
  c6: 2,
  c7: 4.6,
  c8a: 4,
  c8b: 5.3,
  c8c: 3.6,
  night: 40,
};

const GRADE =
  "eq=contrast=0.97:saturation=0.95,curves=r='0/0.035 1/0.98':g='0/0.045 1/0.98':b='0/0.06 1/0.99'";

// [file suffix, crop and scale, crf offset, keyframe spacing]
const portraitCrop = (id) => {
  const x = PORTRAIT_X[id];
  const at = x == null ? "" : `:x=trunc(min(max(0\\,iw*${x}-ow/2)\\,iw-ow)/2)*2`;
  return `crop=trunc(ih*0.6/2)*2:ih${at},scale=-2:'min(960,ih)':flags=lanczos`;
};
const SIZES = [
  ["", () => "scale='min(1440,iw)':-2:flags=lanczos", 0, 4], // never upscale a smaller source
  ["-p", portraitCrop, 1, 6],
];
// optional: encode only these ids; --posters only re-takes the posters from the encoded films
const args = process.argv.slice(2);
const postersOnly = args.includes("--posters");
const only = args.filter((a) => !a.startsWith("--"));
for (const [id, file, trim, extra = "", crf = 27] of CLIPS) {
  if (only.length && !only.includes(id)) continue;
  if (!file || !existsSync(file)) {
    console.log(`${id}: no source yet, skipped`);
    continue;
  }
  const cut = trim ? ["-ss", String(trim[0]), "-to", String(trim[1])] : [];
  const posterAt = Math.max(0, (POSTER_AT[id] ?? 0) - (trim?.[0] ?? 0));
  for (const [sfx, size, crfUp, gop] of SIZES) {
    const out = join(DIR, `${id}${sfx}.mp4`);
    if (!postersOnly)
      execFileSync("ffmpeg", [
        "-loglevel",
        "error",
        "-y",
        ...cut,
        "-i",
        file,
        "-an",
        "-vf",
        `${extra}${size(id)},${GRADE},format=yuv420p`,
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
      "-ss",
      String(posterAt),
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
