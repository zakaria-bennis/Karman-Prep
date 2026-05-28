#!/usr/bin/env node

// ============================================================
// resume-from-stage — invoke the remaining pipeline stages
// against an existing source_pdf without re-uploading the PDF
// or re-running stages 1-5.
//
// Used when a workflow crashes mid-pipeline (e.g. tonight's
// Supabase fetch-failed at Stage 6) — we already have the
// extraction + crops in the DB, just need to drive the rest.
//
// Runs each stage's script with --source-pdf <name> in order.
// If any stage exits non-zero, logs the failure and continues
// (mirrors the audit-stage wrapper's tolerance).
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase8/resume-from-stage.mjs <source-pdf> <start-stage>
//
//   e.g. resume from Stage 6 after Stage 5 succeeded:
//     node scripts/v2-phase8/resume-from-stage.mjs 202406asiav2.pdf 6
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// ── Build a child env that overrides empty-string parent vars with
//    .env.local values.
//
// Why this exists: Node's --env-file flag is documented to NOT
// override existing process.env entries — even if the parent has
// them set to empty string. Claude Code's bash sandbox pre-sets
// ANTHROPIC_API_KEY="" for safety, which silently broke every
// Anthropic call in tonight's smoke #1 resume. The pipeline scripts
// can't tell apart "key missing" from "key empty" without explicit
// pre-loading. So we read .env.local ourselves and override.
function buildChildEnv() {
  const env = { ...process.env };
  if (!existsSync(".env.local")) return env;
  const text = readFileSync(".env.local", "utf-8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    // Strip surrounding double or single quotes so .env values like
    // KEY="value" land as `value`, not `"value"`.
    const stripped = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    // Override empty-string parent vars; leave already-populated
    // parent vars alone (caller's choice wins over .env.local).
    if (!env[key] && stripped) env[key] = stripped;
  }
  return env;
}

const sourcePdf = process.argv[2];
const startStage = parseInt(process.argv[3] ?? "1", 10);
if (!sourcePdf || !Number.isFinite(startStage)) {
  console.error("usage: resume-from-stage.mjs <source-pdf> <start-stage>");
  process.exit(1);
}

// Mirror the orchestrator's stage list (without the PDF-bound
// stages 1-5 which need the PDF file on disk).
const STAGES = [
  {
    n: 6,
    name: "classify visual relevance (Phase 4)",
    script: "scripts/pdf-pipeline/classify-visual-relevance.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 7,
    name: "repair math notation (Phase 5)",
    script: "scripts/pdf-pipeline/repair-math-notation.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 8,
    name: "verify answers (Phase 6)",
    script: "scripts/question-audit/verify-answers.mjs",
    args: ["--from-db", "--source-pdf", sourcePdf],
  },
  {
    n: 9,
    name: "check fill eligibility (Phase 7)",
    script: "scripts/pdf-pipeline/check-fill-eligibility.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 10,
    name: "fill explanations v2 (Phase 7)",
    script: "scripts/pdf-pipeline/fill-explanations-v2.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 11,
    name: "qa explanations (Phase 7)",
    script: "scripts/pdf-pipeline/qa-explanations.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 12,
    name: "audit modules (Phase 8.3) — THE PARITY SIGNAL",
    script: "scripts/pdf-pipeline/audit/run-audits.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    n: 13,
    name: "validate KaTeX",
    script: "scripts/question-audit/validate-katex.mjs",
    args: ["--source-pdf", sourcePdf, "--apply-blocks"],
  },
  {
    n: 14,
    name: "publish-gate",
    script: "scripts/pdf-pipeline/publish-gate.mjs",
    args: ["--source-pdf", sourcePdf],
  },
];

const childEnv = buildChildEnv();
// Print diagnostic so the operator sees whether we recovered any keys.
const recoveredKeys = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]
  .filter((k) => childEnv[k] && (!process.env[k] || process.env[k] === ""))
  .map((k) => k);
if (recoveredKeys.length > 0) {
  console.log(`(env: recovered empty/missing keys from .env.local: ${recoveredKeys.join(", ")})`);
}

const t0 = Date.now();
console.log(`Resuming pipeline for ${sourcePdf} from Stage ${startStage}…`);

for (const stage of STAGES) {
  if (stage.n < startStage) continue;
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ Stage ${stage.n}/14 — ${stage.name}`);
  console.log("─".repeat(72));
  const cmdArgs = [
    ...(existsSync(".env.local") ? ["--env-file=.env.local"] : []),
    stage.script,
    ...stage.args,
  ];
  const stageT0 = Date.now();
  const result = spawnSync("node", cmdArgs, { stdio: "inherit", env: childEnv });
  const stageDur = ((Date.now() - stageT0) / 1000).toFixed(1);
  if (result.status !== 0) {
    console.warn(
      `  ⚠ Stage ${stage.n} exited ${result.status} after ${stageDur}s; continuing to next stage.`
    );
  } else {
    console.log(`  ✓ Stage ${stage.n} done in ${stageDur}s`);
  }
}

const totalDur = ((Date.now() - t0) / 1000 / 60).toFixed(1);
console.log("");
console.log("═".repeat(72));
console.log(`Resume complete in ${totalDur} min.`);
console.log("Run scripts/v2-phase8/verify-smoke-pdf.mjs <job-uuid> to check results.");
