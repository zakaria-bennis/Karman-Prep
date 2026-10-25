// Joins the scene clips into one continuous film for the page background: each clip trimmed to its
// clean stretch, joined by slow dissolves (most clips open on a reflection and end lifting into sky,
// so the joins read as one camera move). The ending (orbit) stays its own clip, c9.mp4: the page
// crossfades to it when the reader reaches the close.
// Run from this folder: node continuous.mjs   (needs the encoded clips: node encode.mjs first)
import { execFileSync } from "node:child_process";

// [clip, in, out] in seconds of the encoded clip
const CUTS = [
  ["c1", 0, 11.2],
  ["c2", 3.0, 9.4],
  ["c3", 0.3, 8.0],
  ["c4", 0.5, 8.0],
  ["c5", 1.0, 8.0],
  ["c6", 1.2, 8.0],
  ["night", 9.5, 21.4],
  ["c7", 0.0, 5.85],
  ["c8a", 1.6, 6.0],
  ["c8b", 3.2, 6.0],
  ["c8c", 2.4, 6.0],
];
const X = 1.2; // dissolve length

function build(suffix, w, h, crf, out) {
  const inputs = CUTS.flatMap(([id]) => ["-i", `${id}${suffix}.mp4`]);
  const parts = CUTS.map(
    ([, a, b], i) =>
      `[${i}:v]trim=${a}:${b},setpts=PTS-STARTPTS,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=24,setsar=1,format=yuv420p[v${i}]`
  );
  let last = "v0",
    t = CUTS[0][2] - CUTS[0][1];
  const joins = [];
  for (let i = 1; i < CUTS.length; i++) {
    const offset = (t - X).toFixed(3);
    joins.push(`[${last}][v${i}]xfade=transition=fade:duration=${X}:offset=${offset}[x${i}]`);
    last = `x${i}`;
    t = t - X + (CUTS[i][2] - CUTS[i][1]);
  }
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    ...inputs,
    "-filter_complex",
    [...parts, ...joins].join(";"),
    "-map",
    `[${last}]`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(crf),
    "-g",
    "48",
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
    out.replace(".mp4", ".jpg"),
  ]);
  console.log(out, t.toFixed(1) + " s");
}
build("", 1440, 810, 26, "day.mp4");
build("-p", 576, 960, 27, "day-p.mp4");
// the three results, portrait, trimmed past the opening reflection; each plays once and rests on its last
// frame (the school on the sweater); -r0.jpg is the first frame (poster before it plays), -r.jpg the last
// (the still for readers who asked for less motion)
for (const [id, a] of [
  ["c8a", 1.5],
  ["c8b", 3.0],
  ["c8c", 3.0],
]) {
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(a),
    "-i",
    `${id}-p.mp4`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "25",
    "-g",
    "48",
    "-movflags",
    "+faststart",
    `${id}-r.mp4`,
  ]);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-sseof",
    "-0.08",
    "-i",
    `${id}-r.mp4`,
    "-frames:v",
    "1",
    "-q:v",
    "4",
    `${id}-r.jpg`,
  ]);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${id}-r.mp4`,
    "-frames:v",
    "1",
    "-q:v",
    "4",
    `${id}-r0.jpg`,
  ]);
  console.log(`${id}-r.mp4`);
}
