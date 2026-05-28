#!/usr/bin/env node

// ============================================================
// refill-and-audit — re-run Stages 10/11/12/14 against an
// existing source_pdf with --force on Stage 10.
//
// Used when a prior pipeline run left explanation_v2_status at
// qa_failed (often due to a transient infra issue like the
// 2026-05-28 sandbox ANTHROPIC_API_KEY="" quirk). Default Stage 10
// eligibility skips qa_failed rows; --force re-fills them.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase8/refill-and-audit.mjs <source_pdf>
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const sourcePdf = process.argv[2];
if (!sourcePdf) {
  console.error("usage: refill-and-audit.mjs <source-pdf>");
  process.exit(1);
}

// Reusable env override (same pattern as resume-from-stage.mjs).
// Needed because Claude Code's bash sandbox sets ANTHROPIC_API_KEY=""
// and Node's --env-file won't override existing entries.
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
    const stripped = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!env[key] && stripped) env[key] = stripped;
  }
  return env;
}

const STAGES = [
  {
    label: "Stage 10/14 — fill explanations v2 (FORCE)",
    script: "scripts/pdf-pipeline/fill-explanations-v2.mjs",
    args: ["--source-pdf", sourcePdf, "--force"],
  },
  {
    label: "Stage 11/14 — qa explanations",
    script: "scripts/pdf-pipeline/qa-explanations.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    label: "Stage 12/14 — audit modules (Phase 8.3) — THE PARITY SIGNAL",
    script: "scripts/pdf-pipeline/audit/run-audits.mjs",
    args: ["--source-pdf", sourcePdf],
  },
  {
    label: "Stage 14/14 — publish-gate",
    script: "scripts/pdf-pipeline/publish-gate.mjs",
    args: ["--source-pdf", sourcePdf],
  },
];

const childEnv = buildChildEnv();
const recovered = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"]
  .filter((k) => childEnv[k] && (!process.env[k] || process.env[k] === ""))
  .map((k) => k);
if (recovered.length > 0) {
  console.log(`(env: recovered empty/missing keys from .env.local: ${recovered.join(", ")})`);
}

const t0 = Date.now();
console.log(`Refilling + auditing ${sourcePdf}…`);

for (const stage of STAGES) {
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ ${stage.label}`);
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
    console.warn(`  ⚠ ${stage.label} exited ${result.status} after ${stageDur}s; continuing.`);
  } else {
    console.log(`  ✓ ${stage.label} done in ${stageDur}s`);
  }
}

const totalDur = ((Date.now() - t0) / 1000 / 60).toFixed(1);
console.log("");
console.log("═".repeat(72));
console.log(`Refill + audit complete in ${totalDur} min.`);
console.log(
  `Run scripts/v2-phase8/verify-smoke-pdf.mjs <job-uuid> + deep-inspect-smoke.mjs to check.`
);
