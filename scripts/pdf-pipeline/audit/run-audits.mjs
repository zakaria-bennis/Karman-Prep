#!/usr/bin/env node

// ============================================================
// run-audits — Phase 8.3 Stage 13 wrapper.
//
// Single orchestrator entry point that runs the four typed audit
// modules in sequence per user policy:
//
//   1. check-well-formedness    (broad, runs on every row)
//   2. check-slug-alignment     (runs when concept_slug exists)
//   3. check-figure-coherence   (runs when image_url or required visual)
//   4. check-explanation-consistency (runs when explanation_v2 exists)
//
// Each module writes findings to question_findings via the shared
// scripts/lib/findings.mjs helpers. The orchestrator's publish-gate
// (Stage 14) reads unresolved BLOCKING findings and routes affected
// rows to needs_human_review.
//
// Passes through --source-pdf, --question-id, --limit, --dry-run,
// --no-llm to each module.
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);

const MODULES = [
  ["check-well-formedness", "scripts/pdf-pipeline/audit/check-well-formedness.mjs"],
  ["check-slug-alignment", "scripts/pdf-pipeline/audit/check-slug-alignment.mjs"],
  ["check-figure-coherence", "scripts/pdf-pipeline/audit/check-figure-coherence.mjs"],
  ["check-explanation-consistency", "scripts/pdf-pipeline/audit/check-explanation-consistency.mjs"],
];

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
    // Audit module failures should NOT abort the whole pipeline —
    // a single module that errors (e.g. quota exhausted) shouldn't
    // prevent the others from running and shouldn't block publish.
    // The publish-gate reads finding rows, not stage exit codes.
    console.warn(`  ⚠ ${name} exited ${result.status}; continuing with next module.`);
  }
}

console.log("Phase 8.3 — audit explanations & alignment");
console.log(`  args: ${args.join(" ") || "<none>"}`);
for (const [name, script] of MODULES) {
  runModule(name, script);
}
console.log("");
console.log("Audit stage complete. See question_findings for results.");
