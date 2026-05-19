// ============================================================
// ingest-findings — load audit + grader JSON reports into the
// question_findings table.
//
// Reads:
//   audit-out/audit-report.json    (output of audit-csv.mjs)
//   audit-out/grader-report.json   (output of llm-grader.mjs)
//
// For every finding, matches to a quiz_questions row and upserts
// one row into question_findings. Re-running is idempotent because
// of the (question_id, source, code) unique constraint.
//
// MATCH STRATEGY
//   1. If the finding has a `question_id` (set when audit was run
//      with --from-db), use it directly.
//   2. Otherwise match by (source_pdf, source_page, question_text
//      snippet first 120 chars). This is how CSV-mode findings get
//      linked to their DB rows once they're imported.
//
// Findings whose source row is NOT yet in the DB are recorded in
// audit-out/unmatched-findings.json so we know what's pending.
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/ingest-findings.mjs
//
//   # Only ingest one source:
//   node --env-file=.env.local scripts/question-audit/ingest-findings.mjs \
//     --only=auditor
//   node --env-file=.env.local scripts/question-audit/ingest-findings.mjs \
//     --only=grader
//
//   # Dry-run (default: no, actually writes). Add --dry-run to skip
//   # the actual INSERT and just print what would happen.
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1] : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Load all quiz_questions for matching ────────────────────
async function loadQuestionIndex() {
  console.log("Loading quiz_questions for matching…");
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, source_pdf, source_page, question_text");
  if (error) throw error;
  // Two indexes: by_id (direct), by_pdf_page (matchers)
  const byId = new Map();
  const byPdfPage = new Map();
  for (const row of data ?? []) {
    byId.set(row.id, row);
    const key = `${row.source_pdf ?? ""}|${row.source_page ?? ""}`;
    if (!byPdfPage.has(key)) byPdfPage.set(key, []);
    byPdfPage.get(key).push(row);
  }
  console.log(`  ${byId.size} questions loaded`);
  return { byId, byPdfPage };
}

function matchQuestionId(finding, idx) {
  // 1. Direct id match
  if (finding.question_id && idx.byId.has(finding.question_id)) {
    return finding.question_id;
  }
  // 2. Snippet match by (source_pdf, source_page)
  const pdf = finding.source_pdf;
  const page = finding.source_page;
  const snippet = (finding.question_text_snippet || "").slice(0, 120).trim();
  if (!pdf || !page || !snippet) return null;
  const candidates = idx.byPdfPage.get(`${pdf}|${page}`) || [];
  for (const c of candidates) {
    const qt = (c.question_text || "").slice(0, 200);
    if (qt.startsWith(snippet.slice(0, 60))) return c.id;
  }
  return null;
}

// ── Translate audit-csv finding → question_findings row ────
function auditFindingToRow(f) {
  // Direct mapping — audit-csv findings already have the right shape.
  return {
    source: "auditor",
    severity: f.severity,
    category: f.category,
    code: f.code,
    message: f.message,
    value: f.value || null,
    detail: null,
  };
}

// ── Translate grader record → 0..N question_findings rows ──
// One grader record represents the result for one question across
// multiple checks. We emit a separate finding per detected issue.
function graderRecordToRows(r) {
  const rows = [];

  // Pass 2 — likely wrong answer (BLOCKING)
  if (r.verdict === "likely_wrong") {
    rows.push({
      source: "grader",
      severity: "BLOCKING",
      category: "llm_grader",
      code: "likely_wrong",
      message: `Stored answer "${r.stored}" disagrees with both Flash and Pro (both say "${r.pro_answer}")`,
      value: `stored=${r.stored} suggested=${r.pro_answer}`,
      detail: {
        flash_answer: r.flash_answer,
        flash_reasoning: r.flash_reasoning,
        flash_confidence: r.flash_confidence,
        flash_concerns: r.flash_concerns,
        pro_answer: r.pro_answer,
        pro_reasoning: r.pro_reasoning,
      },
    });
  }

  // Pass 2 — uncertain (Flash disagreed, Pro didn't verify)
  if (r.verdict === "uncertain" || r.verdict === "flash_disagree") {
    rows.push({
      source: "grader",
      severity: "WARNING",
      category: "llm_grader",
      code: "flash_disagree_uncertain",
      message: `Flash disagrees with stored answer (Pro tiebreak unavailable)`,
      value: `stored=${r.stored} flash=${r.flash_answer}`,
      detail: {
        flash_answer: r.flash_answer,
        flash_reasoning: r.flash_reasoning,
        flash_confidence: r.flash_confidence,
        flash_concerns: r.flash_concerns,
      },
    });
  }

  // Pass 1 concerns on verified rows
  if (r.verdict === "verified" && r.flash_concerns && r.flash_concerns.length > 4) {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "llm_grader",
      code: "concern_on_verified",
      message: r.flash_concerns.slice(0, 200),
      value: null,
      detail: { flash_reasoning: r.flash_reasoning },
    });
  }

  // Pass 3 — figure coherence
  if (r.figure_matches === "no" || r.figure_crop_quality === "poor") {
    rows.push({
      source: "grader",
      severity: "WARNING",
      category: "figure",
      code: r.figure_matches === "no" ? "figure_mismatch" : "figure_poor_crop",
      message:
        r.figure_matches === "no"
          ? "Figure doesn't match the question text"
          : "Figure crop quality is poor",
      value: r.figure_issues ? r.figure_issues.slice(0, 300) : null,
      detail: {
        figure_matches: r.figure_matches,
        figure_crop_quality: r.figure_crop_quality,
        figure_issues: r.figure_issues,
      },
    });
  }
  if (r.figure_matches === "partial") {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "figure",
      code: "figure_partial",
      message: "Figure partially matches the question",
      value: r.figure_issues ? r.figure_issues.slice(0, 300) : null,
      detail: { figure_issues: r.figure_issues },
    });
  }

  // Pass 4 — explanation consistency (Pro-confirmed)
  if (r.pro_explanation_supports === "no") {
    rows.push({
      source: "grader",
      severity: "WARNING",
      category: "explanation",
      code: "explanation_broken",
      message: "Stored explanation does not support stored answer (Pro confirmed)",
      value: r.pro_explanation_issues ? r.pro_explanation_issues.slice(0, 300) : null,
      detail: {
        flash_supports: r.flash_explanation_supports,
        pro_supports: r.pro_explanation_supports,
        flash_issues: r.flash_explanation_issues,
        pro_issues: r.pro_explanation_issues,
      },
    });
  } else if (r.flash_explanation_supports === "no") {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "explanation",
      code: "explanation_flash_disagree",
      message:
        "Flash thinks the stored explanation may not support the answer (Pro not yet verified)",
      value: r.flash_explanation_issues ? r.flash_explanation_issues.slice(0, 300) : null,
      detail: { flash_issues: r.flash_explanation_issues },
    });
  }

  // Pass 5 — well-formedness
  if (r.well_formed === "no") {
    rows.push({
      source: "grader",
      severity: "BLOCKING",
      category: "well_formed",
      code: "ill_formed",
      message: "Question is ill-formed (OCR/transcription error makes it ambiguous or unsolvable)",
      value: r.well_formed_issues ? r.well_formed_issues.slice(0, 300) : null,
      detail: { well_formed_issues: r.well_formed_issues },
    });
  } else if (r.well_formed === "partial") {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "well_formed",
      code: "ill_formed_partial",
      message: "Question has minor formatting issues worth checking",
      value: r.well_formed_issues ? r.well_formed_issues.slice(0, 300) : null,
      detail: { well_formed_issues: r.well_formed_issues },
    });
  }

  // Pass 7 — vision cross-check
  if (r.vision_transcription_matches === "no") {
    rows.push({
      source: "grader",
      severity: "BLOCKING",
      category: "ocr_mismatch",
      code: "ocr_mismatch",
      message: "Extracted CSV text differs from source PDF page (transcription error)",
      value: r.vision_transcription_diffs ? r.vision_transcription_diffs.slice(0, 300) : null,
      detail: { vision_diffs: r.vision_transcription_diffs },
    });
  }

  // Pass 1 fallback — Llama-solved rows tagged for transparency
  if (r.pass1_solver === "llama") {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "llm_grader",
      code: "llama_fallback_used",
      message: "Gemini Flash refused or parse-failed; Llama (Groq) solved this row instead",
      value: null,
      detail: null,
    });
  }

  // Pass 8 — concept_slug verification.
  // The Inspector "Apply suggested slug" button (Batch 3a follow-up)
  // can use detail.suggested_concept_slug to one-click swap.
  if (r.concept_slug_matches === "no") {
    rows.push({
      source: "grader",
      severity: "WARNING",
      category: "taxonomy",
      code: "concept_slug_mismatch",
      message: r.suggested_concept_slug
        ? `Stored slug doesn't fit; suggested replacement: ${r.suggested_concept_slug}`
        : "Stored concept_slug doesn't match what this question is testing",
      value: r.concept_slug_reasoning ? r.concept_slug_reasoning.slice(0, 300) : null,
      detail: {
        stored_slug: r.concept_slug || null,
        suggested_concept_slug: r.suggested_concept_slug || null,
        reasoning: r.concept_slug_reasoning || null,
      },
    });
  } else if (r.concept_slug_matches === "partial") {
    rows.push({
      source: "grader",
      severity: "NOTICE",
      category: "taxonomy",
      code: "concept_slug_partial",
      message: r.suggested_concept_slug
        ? `Stored slug is borderline; consider: ${r.suggested_concept_slug}`
        : "Stored concept_slug is borderline for this question",
      value: r.concept_slug_reasoning ? r.concept_slug_reasoning.slice(0, 300) : null,
      detail: {
        stored_slug: r.concept_slug || null,
        suggested_concept_slug: r.suggested_concept_slug || null,
        reasoning: r.concept_slug_reasoning || null,
      },
    });
  }

  return rows;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  await mkdir("audit-out", { recursive: true });
  const idx = await loadQuestionIndex();

  const matched = [];
  const unmatched = [];
  let auditFindings = [];
  let graderFindings = [];

  // --- Audit findings -----------------------------------------
  if (!ONLY || ONLY === "auditor") {
    const auditPath = "audit-out/audit-report.json";
    if (existsSync(auditPath)) {
      const report = JSON.parse(await readFile(auditPath, "utf-8"));
      console.log(`Audit report: ${report.findings?.length ?? 0} findings`);
      for (const f of report.findings ?? []) {
        const qid = matchQuestionId(f, idx);
        const row = { ...auditFindingToRow(f), question_id: qid, _src: f };
        if (qid) matched.push(row);
        else unmatched.push({ ...row, reason: "no matching question in DB" });
      }
      auditFindings = report.findings ?? [];
    } else {
      console.log("(skip) no audit-report.json found");
    }
  }

  // --- Grader findings ----------------------------------------
  if (!ONLY || ONLY === "grader") {
    const graderPath = "audit-out/grader-report.json";
    if (existsSync(graderPath)) {
      const report = JSON.parse(await readFile(graderPath, "utf-8"));
      console.log(`Grader report: ${report.length} records`);
      for (const rec of report) {
        const fs = graderRecordToRows(rec);
        if (fs.length === 0) continue;
        const qid = matchQuestionId(rec, idx);
        for (const f of fs) {
          const row = { ...f, question_id: qid, _src: rec };
          if (qid) matched.push(row);
          else unmatched.push({ ...row, reason: "no matching question in DB" });
        }
      }
      graderFindings = report;
    } else {
      console.log("(skip) no grader-report.json found");
    }
  }

  console.log("");
  console.log(`Matched to DB rows  : ${matched.length}`);
  console.log(`Unmatched (deferred): ${unmatched.length}`);
  console.log("");

  // Persist unmatched for visibility
  if (unmatched.length > 0) {
    await writeFile(
      "audit-out/unmatched-findings.json",
      JSON.stringify(
        unmatched.map((u) => ({
          source: u.source,
          severity: u.severity,
          category: u.category,
          code: u.code,
          message: u.message,
          source_pdf: u._src?.source_pdf,
          source_page: u._src?.source_page,
          question_text_snippet: u._src?.question_text_snippet || u._src?.value,
          reason: u.reason,
        })),
        null,
        2
      )
    );
    console.log(`  audit-out/unmatched-findings.json written`);
  }

  if (DRY_RUN) {
    console.log("");
    console.log("DRY RUN — no UPSERT performed.");
    console.log(`Would have upserted ${matched.length} rows to question_findings.`);
    return;
  }

  // --- UPSERT to question_findings ----------------------------
  if (matched.length === 0) {
    console.log("Nothing to upsert.");
    return;
  }
  // Dedupe by (question_id, source, code) — the table's unique
  // constraint. Multiple findings of the same code on one row
  // (e.g. F1 firing on question_text AND on choice_b) collapse
  // into the first occurrence; remaining values get merged into
  // `detail.also_seen_in` so we don't lose them.
  const seen = new Map();
  for (const r of matched) {
    const k = `${r.question_id}|${r.source}|${r.code}`;
    if (seen.has(k)) {
      const existing = seen.get(k);
      existing.detail = existing.detail || {};
      existing.detail.also_seen_in = existing.detail.also_seen_in || [];
      existing.detail.also_seen_in.push({ message: r.message, value: r.value });
    } else {
      seen.set(k, { ...r });
    }
  }
  const payload = [...seen.values()].map((r) => ({
    question_id: r.question_id,
    source: r.source,
    severity: r.severity,
    category: r.category,
    code: r.code,
    message: r.message,
    value: r.value,
    detail: r.detail,
  }));
  console.log(`Deduped: ${matched.length} → ${payload.length} unique findings`);

  // ── Triage-memory auto-reopen ────────────────────────────
  // Default upsert behavior preserves resolved_at on conflict (since
  // we don't include it in the payload). That's the right call for
  // findings the admin RESOLVED MANUALLY — those represent a human
  // decision and shouldn't churn.
  //
  // But for findings AUTO-RESOLVED by the system (e.g. "Auto-resolved
  // on Accept Live" — written by actionAcceptInspectedQuestion when
  // the admin flips a question live, or "Auto-resolved on re-audit"
  // when audit-rules stops producing the code), the implicit promise
  // was "we don't think this issue exists anymore." If the auditor
  // OR grader re-emits the same code on a fresh run, that promise is
  // broken — the issue is back and the admin should see it again.
  //
  // Heuristic for auto-resolved: resolved_note starts with
  // "Auto-resolved" (matches every system-resolution string the
  // server actions write). Human resolutions use messages like
  // "Resolved via Inspector" or admin-typed text → safe to leave.
  //
  // Lookup is one query: fetch all currently-resolved findings whose
  // (question_id, source, code) is in our incoming set. Re-opening
  // is a separate UPDATE before the upsert, so the upsert path
  // doesn't have to special-case anything.
  console.log("Checking for auto-resolved findings to re-open…");
  const keysByQuestion = new Map(); // qid → [{source, code}]
  for (const p of payload) {
    if (!keysByQuestion.has(p.question_id)) keysByQuestion.set(p.question_id, []);
    keysByQuestion.get(p.question_id).push({ source: p.source, code: p.code });
  }
  const qids = [...keysByQuestion.keys()];
  // Supabase doesn't support OR over compound keys gracefully, so
  // we fetch ALL resolved findings for the affected questions (cheap;
  // there's only ever a small handful of resolved per question) and
  // intersect locally.
  const { data: existingResolved, error: erErr } =
    qids.length > 0
      ? await supabase
          .from("question_findings")
          .select("id, question_id, source, code, resolved_note")
          .in("question_id", qids)
          .not("resolved_at", "is", null)
      : { data: [], error: null };
  if (erErr) {
    console.error("Resolved-finding lookup failed:", erErr.message);
    process.exit(1);
  }
  const incomingKeys = new Set(payload.map((p) => `${p.question_id}|${p.source}|${p.code}`));
  const toReopen = (existingResolved ?? []).filter(
    (r) =>
      incomingKeys.has(`${r.question_id}|${r.source}|${r.code}`) &&
      typeof r.resolved_note === "string" &&
      r.resolved_note.startsWith("Auto-resolved")
  );
  if (toReopen.length > 0) {
    console.log(
      `  Re-opening ${toReopen.length} previously auto-resolved finding${toReopen.length === 1 ? "" : "s"} whose code re-fired…`
    );
    const ids = toReopen.map((r) => r.id);
    const BATCH_REOPEN = 200;
    for (let i = 0; i < ids.length; i += BATCH_REOPEN) {
      const slice = ids.slice(i, i + BATCH_REOPEN);
      const { error: roErr } = await supabase
        .from("question_findings")
        .update({
          resolved_at: null,
          resolved_by: null,
          resolved_note: null,
        })
        .in("id", slice);
      if (roErr) {
        console.error(`Re-open batch failed:`, roErr.message);
        process.exit(1);
      }
    }
  } else {
    console.log("  No auto-resolved findings to re-open.");
  }

  console.log(`Upserting ${payload.length} rows…`);
  // Batch in groups of 500 to keep payloads manageable.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH);
    const { error } = await supabase
      .from("question_findings")
      .upsert(slice, { onConflict: "question_id,source,code" });
    if (error) {
      console.error(`Batch ${i}-${i + slice.length} failed:`, error.message);
      process.exit(1);
    }
    inserted += slice.length;
    process.stdout.write(`\r  ${inserted}/${payload.length}`);
  }
  process.stdout.write("\n");

  console.log("");
  console.log(`✓ Upserted ${inserted} findings.`);
  console.log(`  Audit: ${auditFindings.length} input findings`);
  console.log(`  Grader: ${graderFindings.length} input records`);
  console.log(`  Matched to DB: ${matched.length}`);
  console.log(`  Unmatched: ${unmatched.length}`);
  if (toReopen.length > 0) {
    console.log(`  Re-opened (auto-resolved → now firing again): ${toReopen.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
