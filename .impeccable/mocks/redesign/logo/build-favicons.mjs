// Writes favicon-<id>.svg for each mark from marks.js (one source of truth). Run: node build-favicons.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ORDER, favicon } from "./marks.js";
const here = dirname(fileURLToPath(import.meta.url));
for (const id of ORDER) {
  writeFileSync(join(here, `favicon-${id}.svg`), favicon(id));
  console.log(`favicon-${id}.svg`);
}
