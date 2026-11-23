// Records the narration for skill videos and writes their timing files (src/lib/lessons/videos/).
// The narration comes from VoiceStudio, running on this Mac (its local, OpenAI-style API on port 3900),
// with Kokoro 82M (Apache-2.0, commercial use allowed): stock voices, never a clone of a real person.
// Videos alternate a calm, friendly male voice and a calm, friendly female voice, one per video.
// Each scene is recorded alone, padded with a short pause, joined, and encoded as AAC at 48 kbps mono;
// with --upload the file goes to the site's R2 bucket under lessons/audio/.
//   npx tsx scripts/lessons/build-videos.ts m-circles rw-main-idea [--upload]
//   npx tsx scripts/lessons/build-videos.ts all --upload
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SKILLS72 } from "../../src/lib/skills/ids72";
import type { Lesson } from "../../src/lib/lessons/types";
import { draftScenes, narrationKey, type VideoTiming } from "../../src/lib/lessons/videoScript";

const API = "http://127.0.0.1:3900/v1/audio/speech";
const VOICES = [
  { id: "am_michael", name: "Michael", gender: "male" as const },
  { id: "af_heart", name: "Heart", gender: "female" as const },
];
const ROOT = process.cwd();
const WORK = join(process.env.TMPDIR ?? "/tmp", "karman-lesson-audio");

function env(name: string): string {
  const fromFile = readFileSync(join(ROOT, ".env.local"), "utf8").match(
    new RegExp(`^${name}=(.*)$`, "m")
  )?.[1];
  const v = process.env[name] ?? fromFile?.replace(/^["']|["']$/g, "");
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function tts(text: string, voice: string, file: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mlx-audio",
        voice,
        input: text,
        response_format: "wav",
        speed: 0.95,
      }),
    });
    if (res.ok) {
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return;
    }
    console.error(`  voice request failed (${res.status}), retrying`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`could not record: ${text.slice(0, 60)}`);
}

const seconds = (file: string) =>
  Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ])
      .toString()
      .trim()
  );

/** The pause after a scene: longer after a question is read, longest where the student tries one. */
function pauseAfter(spoken: string): number {
  if (spoken.includes("Pause the video")) return 3;
  if (/^Question (one|two)\./.test(spoken)) return 1.2;
  return 0.55;
}

async function build(id: string, upload: boolean) {
  const skill = SKILLS72.find((s) => s.id === id);
  const file = join(ROOT, "src/lib/lessons/skills", `${id}.ts`);
  if (!skill || !existsSync(file)) return console.log(`${id}: no lesson, skipped`);
  const lesson = ((await import(pathToFileURL(file).href)) as { default: Lesson }).default;
  const voice = VOICES[SKILLS72.indexOf(skill) % 2];
  const dir = join(WORK, id);
  mkdirSync(dir, { recursive: true });
  const scenes = draftScenes(lesson, skill.name);
  const parts: string[] = [];
  const durations: number[] = [];
  for (const [i, s] of scenes.entries()) {
    const raw = join(dir, `${i}.wav`);
    await tts(s.spoken, voice.id, raw);
    const pause = pauseAfter(s.spoken);
    const padded = join(dir, `${i}p.wav`);
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      raw,
      "-af",
      `apad=pad_dur=${pause}`,
      "-ar",
      "24000",
      "-ac",
      "1",
      padded,
    ]);
    durations.push(Math.round(seconds(padded) * 1000) / 1000);
    parts.push(padded);
  }
  const list = join(dir, "list.txt");
  writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
  const out = join(dir, `${id}.m4a`);
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c:a",
    "aac",
    "-b:a",
    "48k",
    "-ac",
    "1",
    "-movflags",
    "+faststart",
    out,
  ]);
  const bytes = readFileSync(out);
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 10);
  let audio: string | null = null;
  if (upload) {
    const key = `lessons/audio/${id}-${hash}.m4a`;
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: env("R2_BUCKET_NAME"),
        Key: key,
        Body: bytes,
        ContentType: "audio/mp4",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    audio = `${env("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
  }
  const timing: VideoTiming = {
    voice: {
      name: voice.name,
      gender: voice.gender,
      engine: "Kokoro 82M in VoiceStudio",
      license: "Apache-2.0",
    },
    audio,
    durations,
    narration: narrationKey(scenes),
  };
  const total = durations.reduce((a, b) => a + b, 0);
  writeFileSync(
    join(ROOT, "src/lib/lessons/videos", `${id}.ts`),
    `// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (${Math.round(total)} seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = ${JSON.stringify(timing, null, 2)};

export default timing;
`
  );
  execFileSync("npx", ["prettier", "--write", join(ROOT, "src/lib/lessons/videos", `${id}.ts`)], {
    stdio: "ignore",
  });
  console.log(
    `${id}: ${scenes.length} scenes, ${Math.round(total)} s, ${Math.round(bytes.length / 1024)} KB, ${voice.name}${audio ? ", uploaded" : ""}`
  );
}

const argv = process.argv.slice(2);
const upload = argv.includes("--upload");
const ids = argv.filter((a) => !a.startsWith("--"));
const todo = ids[0] === "all" ? SKILLS72.map((s) => s.id) : ids;
async function main() {
  for (const id of todo) await build(id, upload);
}
void main();
