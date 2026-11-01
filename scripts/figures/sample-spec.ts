#!/usr/bin/env tsx
/**
 * Fills the `samples` of every function and region part in a FigureSpec JSON
 * file (one spec, or a list of them) and writes the filled spec or list to
 * stdout. The input file is not changed.
 *
 *   npx tsx scripts/figures/sample-spec.ts path/to/spec.json > filled.json
 *
 * Exits 1 with the reasons on stderr when the file is not a valid FigureSpec,
 * before or after sampling.
 */
import { readFileSync } from "node:fs";
import { parseFigureSpecs } from "@/lib/figures/engine/spec";
import { sampleSpecs } from "./sample-functions";

function fail(lines: string[]): never {
  for (const line of lines) process.stderr.write(`${line}\n`);
  process.exit(1);
}

const file = process.argv[2];
if (!file) fail(["usage: npx tsx scripts/figures/sample-spec.ts <spec.json>"]);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  fail([`${file}: ${error instanceof Error ? error.message : String(error)}`]);
}

const input = parseFigureSpecs(raw);
if (!input.ok) fail(input.errors.map((e) => `${file}: ${e}`));

const filled = parseFigureSpecs(sampleSpecs(input.specs));
if (!filled.ok) fail(filled.errors.map((e) => `${file} after sampling: ${e}`));

const out = Array.isArray(raw) ? filled.specs : filled.specs[0];
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
