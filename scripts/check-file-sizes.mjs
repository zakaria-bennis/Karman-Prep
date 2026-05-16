#!/usr/bin/env node
// ============================================================
// scripts/check-file-sizes.mjs — CI guard against new oversize files.
//
// CLAUDE.md ("Repo defaults") says no file should exceed ~700 lines.
// This script enforces that for NEW files only — pre-existing
// offenders are listed in KNOWN_OFFENDERS below as a TODO list.
// Each is allowed to stay at its current size, but if it grows
// past the next 50-line band the script flags it.
//
// To shrink the offender list: split the file by concern (see
// audit M1) and remove the entry. The script will fail any later
// regrowth past 700 once the entry is gone.
//
// Usage: npm run check:sizes (also runs on every CI push/PR).
// ============================================================

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const HARD_LIMIT = 700;
const NEW_FILE_SOFT_LIMIT = 700;

/** Files already over the limit when this rule was introduced.
 *  Value is the LINE COUNT AT INTRODUCTION TIME — the file can
 *  stay at or under that, plus a 50-line grace band. Goal: never
 *  let a known offender grow uncontrollably while we plan a split. */
const KNOWN_OFFENDERS = {
  "src/app/admin/cohorts/[id]/CohortDetailClient.tsx": 701,
  "src/app/admin/revenue/RevenueClient.tsx": 850,
  "src/app/onboarding/OnboardingClient.tsx": 812,
  "src/app/onboarding/questionnaire/QuestionnaireClient.tsx": 784,
  "src/components/diagnostic/DiagnosticClient.tsx": 717,
  "src/lib/supabase/queries/quiz.ts": 712,
};

/** Files exempt because they're machine-generated. */
const GENERATED = ["src/types/supabase.ts"];

const GROWTH_GRACE = 50;

function listTrackedSourceFiles() {
  const out = execSync("git ls-files src/", { encoding: "utf8" });
  return out
    .split("\n")
    .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f))
    .filter((f) => !GENERATED.includes(f));
}

function countLines(file) {
  try {
    return readFileSync(file, "utf8").split("\n").length;
  } catch {
    return 0;
  }
}

const failures = [];
const warnings = [];

for (const file of listTrackedSourceFiles()) {
  const lines = countLines(file);
  if (lines === 0) continue;

  if (file in KNOWN_OFFENDERS) {
    const ceiling = KNOWN_OFFENDERS[file] + GROWTH_GRACE;
    if (lines > ceiling) {
      failures.push(
        `${file}: ${lines} lines (was ${KNOWN_OFFENDERS[file]} when grandfathered; current ceiling ${ceiling})`
      );
    } else if (lines > KNOWN_OFFENDERS[file]) {
      warnings.push(
        `${file}: ${lines} lines (was ${KNOWN_OFFENDERS[file]}; +${lines - KNOWN_OFFENDERS[file]} since grandfathering — split soon)`
      );
    }
    continue;
  }

  if (lines > HARD_LIMIT) {
    failures.push(
      `${file}: ${lines} lines exceeds the ${HARD_LIMIT}-line hard limit — split by concern (see CLAUDE.md "Repo defaults")`
    );
  } else if (lines > NEW_FILE_SOFT_LIMIT - 50) {
    warnings.push(`${file}: ${lines} lines (approaching ${HARD_LIMIT} limit)`);
  }
}

if (warnings.length > 0) {
  console.warn("\n⚠  File-size warnings:");
  for (const w of warnings) console.warn(`  ${w}`);
}

if (failures.length > 0) {
  console.error("\n✗ File-size violations:");
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    "\nFix: split the file by concern, or update scripts/check-file-sizes.mjs if the split is in flight."
  );
  process.exit(1);
}

console.log(
  `\n✓ File sizes OK (${listTrackedSourceFiles().length} files checked, ${Object.keys(KNOWN_OFFENDERS).length} grandfathered).`
);
