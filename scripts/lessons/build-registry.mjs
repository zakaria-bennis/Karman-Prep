#!/usr/bin/env node
// Writes src/lib/lessons/registry.ts: one loader per lesson file in src/lib/lessons/skills/ and per
// video file in src/lib/lessons/videos/, in the Library's order (src/lib/skills/ids72.ts). Each loader is
// a dynamic import, so a skill's page loads only its own lesson. Run after adding a lesson or a video:
//   node scripts/lessons/build-registry.mjs          (write)
//   node scripts/lessons/build-registry.mjs --check  (fail if the file is out of date)
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as prettier from "prettier";

const root = new URL("../../", import.meta.url).pathname;
const lessons = join(root, "src/lib/lessons");
const ids = [
  ...readFileSync(join(root, "src/lib/skills/ids72.ts"), "utf8").matchAll(/id: "([a-z0-9-]+)"/g),
].map((m) => m[1]);
const present = (dir) =>
  existsSync(join(lessons, dir))
    ? new Set(
        readdirSync(join(lessons, dir))
          .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
          .map((f) => f.slice(0, -3))
      )
    : new Set();
const skills = present("skills");
const videos = present("videos");
const entry = (dir) => (id) => `  "${id}": () => import("./${dir}/${id}"),`;

const raw = `// Made by scripts/lessons/build-registry.mjs from the files in skills/ and videos/. Do not edit by hand.
import type { Lesson, LessonVideo } from "./types";

export const LESSON_LOADERS: Record<string, () => Promise<{ default: Lesson }>> = {
${ids
  .filter((id) => skills.has(id))
  .map(entry("skills"))
  .join("\n")}
};

export const VIDEO_LOADERS: Record<string, () => Promise<{ default: LessonVideo }>> = {
${ids
  .filter((id) => videos.has(id))
  .map(entry("videos"))
  .join("\n")}
};
`;

const file = join(lessons, "registry.ts");
const out = await prettier.format(raw, { ...(await prettier.resolveConfig(file)), filepath: file });
if (process.argv.includes("--check")) {
  const now = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (now !== out) {
    console.error(
      "src/lib/lessons/registry.ts is out of date: run node scripts/lessons/build-registry.mjs"
    );
    process.exit(1);
  }
  console.log(`registry ok: ${skills.size} lessons, ${videos.size} videos`);
} else {
  writeFileSync(file, out);
  console.log(`wrote registry: ${skills.size} lessons, ${videos.size} videos`);
}
