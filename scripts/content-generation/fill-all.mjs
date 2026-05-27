// ============================================================
// fill-all — post-import orchestrator. Runs all three explanation/tip
// generators in series after the bulk-importer has placed rows in
// the DB.
//
// ⚠ DEPRECATED (v2 phase 7, kept as fallback)
//   This script is the legacy fill path. v2 phase 7 replaces it
//   with the eligibility-gated + QA'd flow in
//   scripts/pdf-pipeline/fill-explanations-v2.mjs (which the
//   orchestrator now calls instead). Differences in v2:
//     · explanation_v2 JSONB is the canonical bundle; legacy fields
//       (explanation_text, explanation_per_choice, desmos_strategy)
//       are mirrored from it but no longer the source of truth.
//     · Pre-fill eligibility gate skips broken / disputed rows.
//     · Schema + LLM critic QA loop with one bounded retry.
//     · Tiered Sonnet → Opus generator + critic.
//   This file remains for one-off backfills against rows we
//   explicitly DO NOT want passed through Phase 7's new schema.
//
// PIPELINE (in order)
//   1. generate-explanation-text.mjs        — Sonnet 4.6, all subjects
//      Fills the main explanation_text field. R&W gets a synthesis
//      paragraph; Math gets a numbered step-by-step walkthrough.
//      Skips rows where explanation_text is already non-empty.
//
//   2. generate-per-choice-explanations.mjs — Sonnet 4.6, R&W MC only
//      Fills explanation_a..d. Identifies the trap behind each wrong
//      choice. Math MC rows are intentionally NOT filled (per
//      KarmanGPT §9 — math per-choice slots stay blank; the math
//      walkthrough alone is the explanation).
//
//   3. generate-desmos-tips.mjs             — Haiku 4.5, math only
//      Fills desmos_strategy. 1-2 sentences telling the student
//      exactly what to type into Desmos. Marks "Not applicable" when
//      the calculator doesn't help.
//
// Each script is independently idempotent — re-running this whole
// orchestrator is safe (it just no-ops on rows that already have
// the relevant field filled).
//
// USAGE
//   node --env-file=.env.local \
//     scripts/content-generation/fill-all.mjs
//
//   LIMIT=10 node --env-file=.env.local ...     # cap each stage at 10
//   node --env-file=.env.local ... --dry-run    # plan only, no writes
//   node --env-file=.env.local ... --force      # regenerate everything
//
// FLAGS pass through to each sub-script unchanged.
//
// COST per PDF (~98 questions, ~44 math, ~54 R&W)
//   · explanation_text: ~$1.50/PDF (Sonnet, longer outputs for math)
//   · per-choice:       ~$0.60/PDF (R&W only, ~50 questions)
//   · desmos_strategy:  ~$0.10/PDF (Haiku, math only)
//   · ─────────────────────────────────
//   · Total:            ~$2.20/PDF
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PASS_THROUGH = process.argv.slice(2);

// On a local Mac the user has `.env.local` next to package.json and
// passes its contents via `node --env-file=.env.local`. On GitHub
// Actions there's no `.env.local` file — env vars come from secrets
// and are already in process.env. Conditionally include the flag so
// the same orchestrator works both places.
const ENV_FILE_ARGS = existsSync(".env.local") ? ["--env-file=.env.local"] : [];

const STAGES = [
  {
    label: "Stage 1/3 — explanation_text (Sonnet 4.6)",
    script: "scripts/content-generation/generate-explanation-text.mjs",
  },
  {
    label: "Stage 2/3 — per-choice explanations (Sonnet 4.6, R&W MC only)",
    script: "scripts/content-generation/generate-per-choice-explanations.mjs",
  },
  {
    label: "Stage 3/3 — Desmos tips (Haiku 4.5, math only)",
    script: "scripts/content-generation/generate-desmos-tips.mjs",
  },
];

const t0 = Date.now();
for (const stage of STAGES) {
  console.log("");
  console.log("─".repeat(72));
  console.log(`▶ ${stage.label}`);
  console.log("─".repeat(72));
  const result = spawnSync("node", [...ENV_FILE_ARGS, stage.script, ...PASS_THROUGH], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${stage.label} failed (exit ${result.status}). Stopping orchestrator.`);
    process.exit(result.status ?? 1);
  }
}

const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
console.log("");
console.log("═".repeat(72));
console.log(`✓ All post-import generators complete in ${elapsed} min`);
console.log("═".repeat(72));
