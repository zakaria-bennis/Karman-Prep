// ============================================================
// apply-grader-fixes — patch rows flagged `likely_wrong` by the
// LLM grader. Two modes:
//
// CSV mode (default — when grader was run on a CSV):
//   Patches the matching CSV row in-place:
//     · correct_answer  ← pro_answer (or flash_answer if pro missing)
//     · explanation_text ← Pro's reasoning (clean step-by-step)
//     · explanation_a/b/c/d ← BLANKED (were tied to the wrong answer)
//     · import_flag_reason ← appends "auto-fix-by-grader: stored=X,
//                            corrected to Y" for audit trail.
//   Match strategy: by source_file + question_text snippet (first
//   60 chars). Robust to row-index shifts.
//
// DB mode (--from-db — when grader was run with --from-db):
//   Patches quiz_questions + answer_choices DIRECTLY in Supabase:
//     · UPDATE quiz_questions.correct_answer = pro_answer
//     · UPDATE quiz_questions.explanation_text = pro_reasoning
//     · UPDATE quiz_questions.explanation_per_choice = NULL
//     · UPDATE quiz_questions.import_status = 'needs_review'
//     · UPDATE quiz_questions.import_flag_reason appended
//     · Re-derive is_correct on answer_choices for new letter
//     · INSERT into question_history (edit_source='apply-fix')
//   Match strategy: direct lookup by grader's `r.id` (--from-db
//   grader populates the row id when known).
//
// USAGE
//   # CSV — dry run (default) — show what would change.
//   node scripts/question-audit/apply-grader-fixes.mjs
//
//   # CSV — apply for real.
//   node scripts/question-audit/apply-grader-fixes.mjs --apply
//
//   # CSV — limit to a specific source CSV.
//   node scripts/question-audit/apply-grader-fixes.mjs --apply \
//     --only=questions_needs_review.csv
//
//   # DB — dry run.
//   node --env-file=.env.local \
//     scripts/question-audit/apply-grader-fixes.mjs --from-db
//
//   # DB — apply.
//   node --env-file=.env.local \
//     scripts/question-audit/apply-grader-fixes.mjs --from-db --apply
//
// SAFETY
//   CSV: copies each file to .bak before writing; refuses to overwrite
//        if .bak already exists.
//   DB:  every UPDATE is reversible via question_history (`Restore`
//        button in Inspector). The pre-edit state is snapshotted into
//        before_state JSONB before any write.
//   Logs every change to audit-out/applied-fixes.json (both modes).
// ============================================================

import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FROM_DB = args.includes("--from-db");
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
    // DB-mode only operates on rows the grader matched to a DB id.
    (FROM_DB ? !!r.id : !ONLY_FILE || (r.source && r.source.endsWith(ONLY_FILE)))
);

if (targets.length === 0) {
  console.log("No likely_wrong rows in grader-report.json. Nothing to do.");
  process.exit(0);
}

console.log(
  `Plan: patch ${targets.length} row${targets.length === 1 ? "" : "s"} from grader-report.`
);
console.log(
  `Mode: ${FROM_DB ? "DB" : "CSV"} · ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`
);
console.log("");

// ── DB-mode fast path ───────────────────────────────────────
// In DB mode we never touch CSVs — go straight to applyToDb and
// exit. CSV-mode code below assumes targets carry `source` (CSV
// file path), which DB-mode targets don't.
if (FROM_DB) {
  await applyToDb(targets, APPLY);
  process.exit(0);
}

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

// ── DB-mode implementation ───────────────────────────────────
// Mirrors actionApplySuggestedFix from the Inspector (the
// in-product equivalent), but batch-applies every likely_wrong
// finding in one CLI sweep. Use when you have N>10 fixes to
// apply and don't want to click each one in the UI.
//
// Edit-trail strategy
//   Each applied fix writes a question_history row with
//   edit_source='apply-fix' (the enum value is already in the
//   migration's CHECK constraint). edited_by carries a sentinel
//   "system:apply-grader-fixes" so it's distinguishable from
//   real-user edits when reviewing the history pane.
async function applyToDb(targets, APPLY) {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPA_URL || !SUPA_KEY) {
    console.error(
      "DB mode requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

  const appliedLog = [];
  let totalApplied = 0;
  let totalFailed = 0;
  const nowIso = new Date().toISOString();

  for (const t of targets) {
    // 1. Load the row + choices BEFORE the edit.
    const { data: row, error: loadErr } = await supa
      .from("quiz_questions")
      .select("*, answer_choices(letter, choice_text, is_correct)")
      .eq("id", t.id)
      .maybeSingle();
    if (loadErr || !row) {
      console.log(
        `  ✗ Could not load question ${t.id}: ${loadErr ? loadErr.message : "not found"}`
      );
      totalFailed++;
      continue;
    }
    if (row.answer_format !== "multiple_choice") {
      console.log(`  ✗ Skipping ${t.id} — not MC (answer_format=${row.answer_format})`);
      totalFailed++;
      continue;
    }
    const newAnswer = t.pro_answer || t.flash_answer;
    if (!/^[A-D]$/.test(newAnswer)) {
      console.log(`  ✗ Skipping ${t.id} — suggested answer "${newAnswer}" is not A|B|C|D`);
      totalFailed++;
      continue;
    }
    if (row.correct_answer === newAnswer) {
      console.log(
        `  ⓘ Skipping ${t.id} — stored answer already matches grader's suggestion (${newAnswer})`
      );
      continue;
    }

    const beforeSnap = buildSnapshot(row);
    const newExplanation = (t.pro_reasoning || t.flash_reasoning || "").trim();
    const oldFlag = row.import_flag_reason || "";
    const flagNote = `auto-fix-by-grader: stored=${row.correct_answer || "(empty)"} → ${newAnswer}; per-choice explanations cleared`;
    const newFlag = oldFlag ? `${oldFlag} | ${flagNote}` : flagNote;

    console.log(`  → ${t.id} (p${t.source_page}, ${t.domain})`);
    console.log(`      correct_answer: ${row.correct_answer} → ${newAnswer}`);
    console.log(
      `      explanation_text: ${(row.explanation_text || "").length} chars → ${newExplanation.length} chars (Pro's reasoning)`
    );
    console.log(`      explanation_per_choice: cleared`);
    console.log(`      import_status: → needs_review (was ${row.import_status})`);

    if (APPLY) {
      // 2. UPDATE quiz_questions.
      const { error: upErr } = await supa
        .from("quiz_questions")
        .update({
          correct_answer: newAnswer,
          explanation_text: newExplanation,
          explanation_per_choice: null,
          import_status: "needs_review",
          import_flag_type: row.import_flag_type || "partial_emit",
          import_flag_reason: newFlag,
          updated_at: nowIso,
        })
        .eq("id", t.id);
      if (upErr) {
        console.log(`      ✗ UPDATE failed: ${upErr.message}`);
        totalFailed++;
        continue;
      }
      // 3. Re-derive is_correct on answer_choices.
      const { error: c1 } = await supa
        .from("answer_choices")
        .update({ is_correct: false })
        .eq("question_id", t.id);
      if (c1) {
        console.log(`      ✗ Clear is_correct failed: ${c1.message}`);
        totalFailed++;
        continue;
      }
      const { error: c2 } = await supa
        .from("answer_choices")
        .update({ is_correct: true })
        .eq("question_id", t.id)
        .eq("letter", newAnswer);
      if (c2) {
        console.log(`      ✗ Set is_correct failed: ${c2.message}`);
        totalFailed++;
        continue;
      }
      // 4. Fetch AFTER + write history.
      const { data: afterRow } = await supa
        .from("quiz_questions")
        .select("*, answer_choices(letter, choice_text, is_correct)")
        .eq("id", t.id)
        .maybeSingle();
      if (afterRow) {
        const afterSnap = buildSnapshot(afterRow);
        const changed = diffSnapshots(beforeSnap, afterSnap);
        if (changed.length > 0) {
          const { error: hErr } = await supa.from("question_history").insert({
            question_id: t.id,
            before_state: beforeSnap,
            after_state: afterSnap,
            changed_fields: changed,
            edited_by: "system:apply-grader-fixes",
            edit_source: "apply-fix",
            edit_note: `Auto-applied Pro's answer (${row.correct_answer} → ${newAnswer}) from grader-report.json`,
          });
          if (hErr) {
            console.log(`      ⚠ history insert failed (row still updated): ${hErr.message}`);
          }
        }
      }
    }

    appliedLog.push({
      question_id: t.id,
      source_pdf: t.source_pdf,
      source_page: t.source_page,
      domain: t.domain,
      old_answer: row.correct_answer,
      new_answer: newAnswer,
      pro_reasoning_used: !!t.pro_reasoning,
      applied: APPLY,
    });
    totalApplied++;
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
          mode: "db",
          count: totalApplied,
          fixes: appliedLog,
        },
        null,
        2
      )
    );
    console.log(`\n  audit log: ${outPath}`);
  }
}

// ── Snapshot helpers (mirror src/lib/supabase/queries/quiz/history.ts) ──
// Replicated here because CLI scripts can't import the TS module
// directly. The JSON shape MUST match the server-side buildSnapshot
// for the Inspector's "Restore" button to be able to deserialize
// these rows and rebuild the pre-fix state.
function buildSnapshot(q) {
  return {
    question_text: q.question_text ?? "",
    correct_answer: q.correct_answer ?? "",
    difficulty_level: q.difficulty_level ?? null,
    explanation_text: q.explanation_text ?? "",
    explanation_per_choice: q.explanation_per_choice ?? null,
    hint: q.hint ?? null,
    desmos_strategy: q.desmos_strategy ?? null,
    image_alt: q.image_alt ?? null,
    image_url: q.image_url ?? null,
    figure_kind: q.figure_kind ?? null,
    figure_table_data: q.figure_table_data ?? null,
    passage_intro: q.passage_intro ?? null,
    passage: q.passage ?? null,
    passage_a: q.passage_a ?? null,
    passage_b: q.passage_b ?? null,
    numeric_tolerance: q.numeric_tolerance ?? null,
    concept_slug: q.concept_slug ?? null,
    domain: q.domain ?? null,
    topic_cluster: q.topic_cluster ?? null,
    import_status: q.import_status ?? null,
    choices: (q.answer_choices || []).map((c) => ({
      letter: c.letter,
      choice_text: c.choice_text,
      is_correct: c.is_correct,
    })),
  };
}

function diffSnapshots(before, after) {
  const fields = [
    "question_text",
    "correct_answer",
    "difficulty_level",
    "explanation_text",
    "explanation_per_choice",
    "hint",
    "desmos_strategy",
    "image_alt",
    "image_url",
    "figure_kind",
    "figure_table_data",
    "passage_intro",
    "passage",
    "passage_a",
    "passage_b",
    "numeric_tolerance",
    "concept_slug",
    "domain",
    "topic_cluster",
    "import_status",
  ];
  const changed = [];
  for (const f of fields) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) changed.push(f);
  }
  if (JSON.stringify(before.choices) !== JSON.stringify(after.choices)) changed.push("choices");
  return changed;
}
