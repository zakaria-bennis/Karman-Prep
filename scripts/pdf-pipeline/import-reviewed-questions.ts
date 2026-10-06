#!/usr/bin/env -S npx tsx
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [jsonPath, sourcePath, ...flags] = process.argv.slice(2);
if (!jsonPath || !sourcePath || flags.some((flag) => flag !== "--dry-run")) {
  console.error("usage: questions:import-reviewed <reviewed.json> <source.pdf> [--dry-run]");
  process.exit(2);
}
const importer = fileURLToPath(new URL("./import-json-direct.ts", import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    importer,
    jsonPath,
    sourcePath,
    "--reviewed-difficulty",
    "--require-source-identity",
    ...flags,
  ],
  { stdio: "inherit", shell: false }
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 2);
