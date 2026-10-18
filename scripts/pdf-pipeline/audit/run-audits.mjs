#!/usr/bin/env node

// ============================================================
// Run the retained deterministic well-formedness audit. Paid semantic
// audits are retired; figures, categorization, and keys need explicit
// review before import. This command never clears publication holds.
// Pass through --source-pdf, --question-id, --limit, and --dry-run.
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);

const MODULES = [["check-well-formedness", "scripts/pdf-pipeline/audit/check-well-formedness.mjs"]];

function runModule(name, scriptPath) {
  console.log("");
  console.log("─".repeat(56));
  console.log(`▶ Audit module: ${name}`);
  console.log("─".repeat(56));
  const cmdArgs = [
    ...(existsSync(".env.local") ? ["--env-file=.env.local"] : []),
    scriptPath,
    ...args,
  ];
  const result = spawnSync("node", cmdArgs, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    console.error(`  ${name} failed: ${result.error?.message ?? result.status ?? result.signal}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("Deterministic well-formedness audit only. Semantic, figure and key review is manual.");
console.log(`  args: ${args.join(" ") || "<none>"}`);
for (const [name, script] of MODULES) {
  runModule(name, script);
}
console.log("");
console.log(
  "Well-formedness audit complete. This does not clear manual review or publication gates."
);
