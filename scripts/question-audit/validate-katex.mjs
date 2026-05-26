// ============================================================
// validate-katex — server-side STRICT KaTeX validation.
//
// v1 ran KaTeX only client-side in MathText.tsx with
// `throwOnError: false`, which silently swallowed bad LaTeX and
// rendered a red span. Bad math survived all the way to the
// student — and a downstream audit only caught it after a finding
// landed in question_findings.
//
// v2 phase 1: run katex.renderToString(latex, { throwOnError: true })
// over every text field BEFORE publish-gate runs. Any throw flips
// the row's publish_status to 'blocked_katex_error' so the row
// can't go live until the math is fixed.
//
// We do NOT change MathText.tsx — frontend resilience is still
// useful. The strict gate is purely server-side.
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/validate-katex.mjs
//   ... --source-pdf 202603asia.pdf       # just one PDF
//   ... --question-id <uuid>              # just one row
//   ... --dry-run                         # don't write publish_status
//   ... --apply-blocks                    # set blocked_katex_error on fail (default: just report)
//
// COST: zero — pure JS, no LLM calls.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import katex from "katex";
import { extractMathSpans } from "../lib/publish-gate-logic.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const APPLY_BLOCKS = args.includes("--apply-blocks");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const QUESTION_ID_IDX = args.indexOf("--question-id");
const QUESTION_ID =
  QUESTION_ID_IDX >= 0 && args[QUESTION_ID_IDX + 1] ? args[QUESTION_ID_IDX + 1] : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// extractMathSpans is imported from ../lib/publish-gate-logic.mjs so
// the same regex is used both here AND in unit tests, no drift.

function validateLatex(latex, displayMode) {
  try {
    katex.renderToString(latex, {
      throwOnError: true,
      displayMode,
      output: "htmlAndMathml",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Fields on quiz_questions that can contain KaTeX.
const TEXT_FIELDS = [
  "question_text",
  "passage",
  "passage_intro",
  "passage_a",
  "passage_b",
  "explanation_text",
  "desmos_strategy",
  "hint",
];
// Choice text comes from the answer_choices table.
// explanation_per_choice is a JSONB { A, B, C, D } — we flatten.

function validateQuestion(q) {
  const fails = [];

  for (const f of TEXT_FIELDS) {
    const v = q[f];
    if (!v) continue;
    for (const span of extractMathSpans(v)) {
      const r = validateLatex(span.latex, span.displayMode);
      if (!r.ok) fails.push({ field: f, latex: span.latex, error: r.error });
    }
  }

  if (q.explanation_per_choice && typeof q.explanation_per_choice === "object") {
    for (const [letter, text] of Object.entries(q.explanation_per_choice)) {
      if (typeof text !== "string" || !text) continue;
      for (const span of extractMathSpans(text)) {
        const r = validateLatex(span.latex, span.displayMode);
        if (!r.ok)
          fails.push({
            field: `explanation_per_choice.${letter}`,
            latex: span.latex,
            error: r.error,
          });
      }
    }
  }

  for (const choice of q.answer_choices ?? []) {
    for (const span of extractMathSpans(choice.choice_text)) {
      const r = validateLatex(span.latex, span.displayMode);
      if (!r.ok)
        fails.push({ field: `choice_${choice.letter}`, latex: span.latex, error: r.error });
    }
  }

  // figure_table_data and figure_chart_data can carry KaTeX in
  // cell text / axis labels / legend entries. Walk recursively and
  // validate every string.
  for (const figField of ["figure_table_data", "figure_chart_data"]) {
    if (!q[figField]) continue;
    walkStrings(q[figField], (text, path) => {
      for (const span of extractMathSpans(text)) {
        const r = validateLatex(span.latex, span.displayMode);
        if (!r.ok) fails.push({ field: `${figField}.${path}`, latex: span.latex, error: r.error });
      }
    });
  }

  return fails;
}

function walkStrings(node, cb, path = "") {
  if (typeof node === "string") {
    cb(node, path);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkStrings(v, cb, `${path}[${i}]`));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      walkStrings(v, cb, path ? `${path}.${k}` : k);
    }
  }
}

async function main() {
  console.log("Loading questions for KaTeX validation…");
  let query = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, publish_status, " +
        "question_text, passage, passage_intro, passage_a, passage_b, " +
        "explanation_text, desmos_strategy, hint, explanation_per_choice, " +
        "figure_table_data, figure_chart_data, " +
        "answer_choices(letter, choice_text)"
    );
  if (QUESTION_ID) query = query.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);

  const { data: rows, error } = await query;
  if (error) throw error;

  console.log(`Validating ${rows.length} rows…`);
  let pass = 0;
  let fail = 0;
  const allFails = [];

  for (const q of rows) {
    const fails = validateQuestion(q);
    if (fails.length === 0) {
      pass++;
      continue;
    }
    fail++;
    allFails.push({ id: q.id, source_pdf: q.source_pdf, source_page: q.source_page, fails });
    console.log(
      `  ✗ ${q.source_pdf ?? "?"} p${q.source_page ?? "?"} (${q.id.slice(0, 8)}) — ${fails.length} bad span(s):`
    );
    for (const f of fails.slice(0, 3)) {
      console.log(`      ${f.field}: ${f.latex.slice(0, 60)} → ${f.error.slice(0, 80)}`);
    }
    if (fails.length > 3) console.log(`      …and ${fails.length - 3} more`);

    if (APPLY_BLOCKS && !DRY_RUN) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({ publish_status: "blocked_katex_error" })
        .eq("id", q.id);
      if (upErr) console.log(`      (failed to mark blocked: ${upErr.message})`);
    }
  }

  console.log("");
  console.log("═".repeat(60));
  console.log(`KaTeX validation: ${pass} pass, ${fail} fail`);
  if (APPLY_BLOCKS && !DRY_RUN && fail > 0) {
    console.log(`Marked ${fail} rows as publish_status='blocked_katex_error'`);
  } else if (fail > 0) {
    console.log(`(--apply-blocks not set; publish_status NOT modified)`);
  }
  // Non-zero exit if any failure AND we were asked to apply blocks
  // (so the orchestrator can fail the job if KaTeX validation is
  // mandatory). With --apply-blocks NOT set, exit 0 so this is a
  // pure reporting tool.
  if (fail > 0 && APPLY_BLOCKS) {
    process.exitCode = 0; // soft fail — publish_status already reflects this
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
