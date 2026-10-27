// Synthesizes Karman's three reward jingles (quiz engine spec, Small wins: Sound) as WAV, then
// encodes MP3 with ffmpeg. Our own tones: soft bell partials with a gentle attack, no samples.
// Run: node scripts/sounds/make-quiz-sounds.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RATE = 44100;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** A warm bell: fundamental, a soft octave and a faint fifth above, exponential decay. */
function bell(buf, start, note, length, gain) {
  const f = midi(note);
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(length * RATE);
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.008);
    const env = attack * Math.exp(-t * (3.2 / length));
    const v =
      Math.sin(2 * Math.PI * f * t) +
      0.32 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 6) +
      0.12 * Math.sin(2 * Math.PI * 3 * f * t) * Math.exp(-t * 9);
    buf[s0 + i] += gain * env * v;
  }
}

function render(seconds, notes) {
  const buf = new Float32Array(Math.ceil(seconds * RATE));
  for (const [start, note, length, gain] of notes) bell(buf, start, note, length, gain);
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const scale = peak ? 0.5 / peak : 1; // quiet: peaks at -6 dBFS before the player volume
  const pcm = Buffer.alloc(buf.length * 2);
  buf.forEach((v, i) =>
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * scale)) * 32767), i * 2)
  );
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const SOUNDS = {
  // Three rising notes, about 0.6 s.
  "quiz-correct": render(0.7, [
    [0, 72, 0.5, 0.8],
    [0.09, 76, 0.5, 0.8],
    [0.18, 79, 0.5, 0.9],
  ]),
  // A longer run with a high answer note, about 1 s.
  "quiz-streak": render(1.1, [
    [0, 72, 0.6, 0.7],
    [0.08, 76, 0.6, 0.7],
    [0.16, 79, 0.6, 0.75],
    [0.24, 84, 0.7, 0.8],
    [0.42, 88, 0.6, 0.6],
    [0.42, 84, 0.6, 0.4],
  ]),
  // A small fanfare that lands on a full chord, about 1.5 s.
  "quiz-level-up": render(1.6, [
    [0, 67, 0.4, 0.6],
    [0.12, 72, 0.4, 0.6],
    [0.24, 76, 0.4, 0.6],
    [0.46, 79, 1.0, 0.7],
    [0.46, 84, 1.0, 0.6],
    [0.46, 76, 1.0, 0.5],
    [0.46, 72, 1.0, 0.4],
  ]),
};

const out = path.resolve("public/sounds");
const tmp = mkdtempSync(path.join(tmpdir(), "karman-sounds-"));
for (const [name, wav] of Object.entries(SOUNDS)) {
  const wavPath = path.join(tmp, `${name}.wav`);
  writeFileSync(wavPath, wav);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    wavPath,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "96k",
    path.join(out, `${name}.mp3`),
  ]);
  console.log(`wrote public/sounds/${name}.mp3`);
}
