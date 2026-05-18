// ============================================================
// apply-grader-fixes — patch CSV rows flagged `likely_wrong`
// by the LLM grader.
//
// Reads audit-out/grader-report.json (output of llm-grader.mjs).
// For every row with verdict="likely_wrong", patches the matching
// CSV row in-place:
//
//   · correct_answer  ← grader's verified answer (pro, or flash if
//                       pro missing)
//   · explanation_text ← Pro's reasoning (clean step-by-step)
//   · explanation_a/b/c/d ← BLANKED. The stored per-choice
//     explanations were tied to the wrong answer; leaving them
//     would actively mislead students. Empty is honest.
//   · import_flag_reason ← appends "auto-fix-by-grader: stored=X,
//                          corrected to Y" for audit trail.
//
// Match strategy: by source_file + question_text snippet (first
// 60 chars). Robust to row-index shifts.
//
// USAGE
//   # Dry run (default) — show what would change, don't write.
//   node scripts/question-audit/apply-grader-fixes.mjs
//
//   # Apply for real.
//   node scripts/question-audit/apply-grader-fixes.mjs --apply
//
//   # Limit to a specific source CSV.
//   node scripts/question-audit/apply-grader-fixes.mjs --apply \
//     --only=questions_needs_review.csv
//
// SAFETY
//   · Always copies each CSV to .bak before writing.
//   · Refuses to overwrite if .bak already exists (manual cleanup
//     forces explicit acknowledgement of the prior fix).
//   · Logs every change to audit-out/applied-fixes.json.
// ============================================================

import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY_FILE = onlyArg ? onlyArg.split("=")[1] : null;

const reportPath = "audit-out/grader-report.json";
if (!existsSync(reportPath)) {
  console.error(`Run llm-grader.mjs first — no ${reportPath} found.`);
  process.exit(1);
}

const report = JSON.parse(await readFile(reportPath, "utf-8"));
const targets = report.filter(
  (r) =>
    r.verdict === "likely_wrong" &&
    r.flash_answer &&
    r.pro_answer &&
    (!ONLY_FILE || (r.source && r.source.endsWith(ONLY_FILE)))
);

if (targets.length === 0) {
  console.log("No likely_wrong rows in grader-report.json. Nothing to do.");
  process.exit(0);
}

console.log(
  `Plan: patch ${targets.length} row${targets.length === 1 ? "" : "s"} from grader-report.`
);
console.log(APPLY ? "Mode: APPLY (will write to disk)" : "Mode: DRY-RUN (no writes)");
console.log("");

// ── CSV utils (round-trip preserving quoting) ──
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return { headers: [], data: [] };
  const headers = rows[0].map((h) => h.trim());
  return { headers, data: rows.slice(1) };
}

function csvEscape(s) {
  if (s == null) return "";
  const v = String(s);
  if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function writeCsv(headers, data) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of data) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n") + "\n";
}

// ── Find target row by (source_page, snippet) match ──
// Snippet match alone is too lax — multiple "The solution to the
// given system of equations is..." stems exist across pages, and
// they share the first 60+ chars. Require source_page agreement too,
// and match on a longer (160-char) prefix.
function findRowIdx(data, headers, snippet, sourcePage) {
  const qtIdx = headers.indexOf("question_text");
  const spIdx = headers.indexOf("source_page");
  if (qtIdx === -1) return -1;
  const longKey = snippet.slice(0, 160).trim();
  const shortKey = snippet.slice(0, 60).trim();
  if (!longKey) return -1;
  const candidates = [];
  for (let i = 0; i < data.length; i++) {
    const qt = (data[i][qtIdx] || "").trim();
    if (qt.startsWith(longKey)) candidates.push(i);
  }
  // If long match found nothing, fall back to short match — but only
  // accept if EXACTLY ONE candidate AND source_page matches.
  if (candidates.length === 0) {
    for (let i = 0; i < data.length; i++) {
      const qt = (data[i][qtIdx] || "").trim();
      if (qt.startsWith(shortKey)) candidates.push(i);
    }
  }
  if (candidates.length === 0) return -1;
  if (sourcePage && spIdx >= 0) {
    const filtered = candidates.filter((i) => String(data[i][spIdx]).trim() === String(sourcePage));
    if (filtered.length === 1) return filtered[0];
    if (filtered.length > 1) return -2; // ambiguous even with page
    // No page match — caller will see -1 and report ambiguity
    return candidates.length === 1 ? candidates[0] : -3;
  }
  if (candidates.length === 1) return candidates[0];
  return -4; // ambiguous, no page filter possible
}

// ── Group targets by file ──
const byFile = new Map();
for (const t of targets) {
  byFile.set(t.source, byFile.get(t.source) || []);
  byFile.get(t.source).push(t);
}

const appliedLog = [];
let totalApplied = 0;
let totalFailed = 0;

for (const [filePath, items] of byFile.entries()) {
  console.log("═".repeat(72));
  console.log(`File: ${filePath}  (${items.length} fix${items.length === 1 ? "" : "es"})`);
  console.log("═".repeat(72));

  const csvText = await readFile(filePath, "utf-8");
  const { headers, data } = parseCsv(csvText);
  const COL = (name) => headers.indexOf(name);
  const idxQT = COL("question_text");
  const idxCA = COL("correct_answer");
  const idxET = COL("explanation_text");
  const idxEA = COL("explanation_a");
  const idxEB = COL("explanation_b");
  const idxEC = COL("explanation_c");
  const idxED = COL("explanation_d");
  const idxIFR = COL("import_flag_reason");
  const idxIS = COL("import_status");
  const idxIFT = COL("import_flag_type");
  if ([idxQT, idxCA, idxET, idxIFR, idxIS].some((i) => i < 0)) {
    console.error(`  ✗ Missing required column in ${filePath}; skipping.`);
    totalFailed += items.length;
    continue;
  }

  // Mutate data in-memory.
  let dirty = false;
  for (const t of items) {
    const rowIdx = findRowIdx(data, headers, t.question_text_snippet || "", t.source_page);
    if (rowIdx < 0) {
      const reason =
        {
          "-1": "no match",
          "-2": "ambiguous (multiple rows on same page match)",
          "-3": "snippet matched but on a different page",
          "-4": "ambiguous, no page filter",
        }[String(rowIdx)] || "lookup failed";
      console.log(
        `  ✗ Could not locate row: ${reason} (global #${t.row_idx}, expected p${t.source_page}).\n      Snippet: ${(t.question_text_snippet || "").slice(0, 80)}…`
      );
      totalFailed++;
      continue;
    }
    const correctedAnswer = t.pro_answer || t.flash_answer;
    const oldAnswer = data[rowIdx][idxCA];
    const oldExplLen = (data[rowIdx][idxET] || "").length;

    // Build the new explanation_text from Pro's reasoning (clean
    // step-by-step). Keep Pro verbatim — it represents the verified
    // solution path, which is the most defensible thing we can show
    // a student until a human SME rewrites.
    const newExplanation = (t.pro_reasoning || t.flash_reasoning || "").trim();

    // Audit-trail flag — always added, even if row was already
    // flagged.
    const oldFlag = data[rowIdx][idxIFR] || "";
    const flagNote = `auto-fix-by-grader: stored=${oldAnswer || "(empty)"} → ${correctedAnswer}; per-choice explanations cleared`;
    const newFlag = oldFlag ? `${oldFlag} | ${flagNote}` : flagNote;

    console.log(`  → row ${rowIdx + 1} (p${t.source_page}, ${t.domain})`);
    console.log(`      correct_answer: ${oldAnswer} → ${correctedAnswer}`);
    console.log(
      `      explanation_text: ${oldExplLen} chars → ${newExplanation.length} chars (Pro's reasoning)`
    );
    console.log(`      explanation_a/b/c/d: ${idxEA >= 0 ? "cleared" : "(no columns)"}`);
    console.log(`      flag: ${newFlag.slice(0, 100)}`);

    if (APPLY) {
      data[rowIdx][idxCA] = correctedAnswer;
      data[rowIdx][idxET] = newExplanation;
      if (idxEA >= 0) data[rowIdx][idxEA] = "";
      if (idxEB >= 0) data[rowIdx][idxEB] = "";
      if (idxEC >= 0) data[rowIdx][idxEC] = "";
      if (idxED >= 0) data[rowIdx][idxED] = "";
      data[rowIdx][idxIFR] = newFlag;
      // Force this row to needs_review since the fix replaces auto-
      // generated content; a human should still review before live.
      if (idxIS >= 0) data[rowIdx][idxIS] = "needs_review";
      if (idxIFT >= 0 && !data[rowIdx][idxIFT]) data[rowIdx][idxIFT] = "partial_emit";
      dirty = true;
    }

    appliedLog.push({
      file: filePath,
      row_idx: rowIdx + 1,
      source_pdf: t.source_pdf,
      source_page: t.source_page,
      domain: t.domain,
      old_answer: oldAnswer,
      new_answer: correctedAnswer,
      pro_reasoning_used: !!t.pro_reasoning,
      applied: APPLY,
    });
    totalApplied++;
  }

  if (APPLY && dirty) {
    const bakPath = filePath + ".bak";
    try {
      await access(bakPath);
      console.error(
        `\n  ✗ Refusing to overwrite — backup already exists at ${bakPath}. Remove it manually first if you're sure.`
      );
      totalFailed += items.length;
      continue;
    } catch {
      /* no .bak — proceed */
    }
    await copyFile(filePath, bakPath);
    const newCsv = writeCsv(headers, data);
    await writeFile(filePath, newCsv);
    console.log(`\n  ✓ Wrote ${filePath} (backup at ${bakPath})`);
  }
}

console.log("");
console.log("═".repeat(72));
console.log(`Plan size: ${targets.length}`);
console.log(`Successfully ${APPLY ? "applied" : "planned"}: ${totalApplied}`);
if (totalFailed) console.log(`Failed: ${totalFailed}`);
if (!APPLY) console.log("\nRe-run with --apply to write changes.");

if (APPLY) {
  const outPath = "audit-out/applied-fixes.json";
  await writeFile(
    outPath,
    JSON.stringify(
      {
        applied_at: new Date().toISOString(),
        count: totalApplied,
        fixes: appliedLog,
      },
      null,
      2
    )
  );
  console.log(`\n  audit log: ${outPath}`);
}
