#!/usr/bin/env -S npx tsx
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [jsonPath, sourcePath, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");
const pinIndex = flags.indexOf("--frozen-inputs");
const hashIndex = flags.indexOf("--frozen-inputs-sha256");
const frozenInputs = pinIndex >= 0 ? flags[pinIndex + 1] : undefined;
const frozenHash = hashIndex >= 0 ? flags[hashIndex + 1] : undefined;
const expectedFlags = [
  ...(dryRun ? ["--dry-run"] : []),
  ...(frozenInputs ? ["--frozen-inputs", frozenInputs] : []),
  ...(frozenHash ? ["--frozen-inputs-sha256", frozenHash] : []),
];
if (
  !jsonPath ||
  !sourcePath ||
  flags.length !== expectedFlags.length ||
  !flags.every((flag) => expectedFlags.includes(flag)) ||
  Boolean(frozenInputs) !== Boolean(frozenHash) ||
  (!dryRun && !frozenInputs)
) {
  console.error(
    "usage: questions:import-reviewed <reviewed.json> <source.pdf> [--dry-run] [--frozen-inputs <manifest.json> --frozen-inputs-sha256 <expected-manifest-sha256>]"
  );
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
    ...expectedFlags,
  ],
  { stdio: "inherit", shell: false }
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 2);
