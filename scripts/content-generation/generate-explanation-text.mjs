// ============================================================
// generate-explanation-text — fills the main quiz_questions.explanation_text
// field. The synthesis paragraph (R&W) or step-by-step walkthrough (math)
// that students see when they get a question wrong.
//
// PAIRS WITH (per KarmanGPT §8-9)
//   · This script fills explanation_text for BOTH R&W and Math.
//   · generate-per-choice-explanations.mjs fills explanation_a..d for R&W MC only
//     (math per-choice slots stay blank per §9).
//   · generate-desmos-tips.mjs fills desmos_strategy for math only.
//
// POLICY
//   · Fill EMPTY slots only — explanation_text NULL or "" gets generated.
//   · PRESERVE existing entries (any non-empty explanation_text stays put)
//     unless --force is passed.
//
// MODEL — Sonnet 4.6, tool-use for guaranteed structured JSON output.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/content-generation/generate-explanation-text.mjs
//   LIMIT=10 node --env-file=.env.local ...    # cap for testing
//   node --env-file=.env.local ... --dry-run   # plan only, no writes
//   node --env-file=.env.local ... --force     # regenerate every row
//
// COST
//   ~$0.02 per question on Sonnet 4.6 (longer output than per-choice
//   since math walkthroughs run 4-10 steps). For ~3000 math + ~5000 R&W
//   questions across 100 PDFs: ~$160 total.
// ============================================================

import { callClaude, QuotaExhaustedError } from "../lib/llm-providers.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
// v2 phase 1: filter to a single source_pdf so per-job runs from the
// orchestrator only touch the rows from THAT PDF, not the whole bank.
// Without this, the fill stage spent 15+ minutes re-checking ~500
// older rows on every new PDF import.
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY in .env.local.");
  process.exit(1);
}

const MATH_DOMAINS = new Set(["algebra", "advanced_math", "geometry", "data_analysis"]);

// Depth ladders mirror KarmanGPT §8 (R&W) and §9 (Math).
// Sonnet picks the right tier based on the row's difficulty field.
const SYSTEM_PROMPT_RW = `You write the explanation_text field for SAT Reading & Writing practice questions. This is the synthesis paragraph the student sees when they get a question wrong — it should TEACH them what to recognize next time, not just restate the answer.

Depth scales with difficulty (1-7):
  · Easy (1-2):    1-2 sentences. Direct, concise.
  · Medium (3-4):  2-3 sentences. Some inferential reasoning shown.
  · Hard (5-7):    3-4 sentences. Quote-anchored, walks through why this beats the close alternatives.

Style rules:
  · ALWAYS anchor reasoning to the passage. Quote specific phrases or reference a sentence ("In sentence 3..." / "The phrase 'remarkably resilient' indicates..."). Never reason in a vacuum.
  · For Cross-Text questions: state what Text 1 establishes, then Text 2, then synthesize.
  · For Command-of-Evidence-Quantitative: reference the chart/table data directly ("The 2019 row shows...").
  · Don't write "The correct answer is X because..." — synthesize the reasoning organically.
  · Don't repeat the per-choice trap labels here; that's the job of explanation_a..d.
  · KaTeX wrapping: any math notation (rare in R&W) goes in $...$ inline.`;

const SYSTEM_PROMPT_MATH = `You write the explanation_text field for SAT Math practice questions. This is the full step-by-step walkthrough — the student should be able to redo this problem on their own after reading.

Depth scales with difficulty (1-7):
  · Easy (1-2):    2-3 numbered steps with brief justification.
  · Medium (3-4):  4-6 numbered steps; name each technique used (factoring, substitution, distributing, etc.).
  · Hard (5-7):    6-10+ numbered steps; full derivation, show every intermediate step, flag where students most commonly go wrong, substitute the answer back to verify.

Format — numbered steps. Each step:
  · "Step N: <action in plain English>"
  · The math on its own line wrapped in $...$ inline or $$...$$ for display
  · Brief justification — what concept/identity it leverages, why this operation is valid
  · Don't skip "obvious" steps; the student is learning, not verifying.

End with either:
  · A CHECK: substitute the answer back into the original equation/constraint to verify.
  · OR a sanity check on units / sign / magnitude.

When relevant, name the SAT-Math trap a wrong choice would exploit (inside the walkthrough, not as a separate list):
  · Sign error: forgot to distribute a negative
  · Inverse error: used reciprocal instead of value
  · Exponent rule confusion: added when should have multiplied
  · Solved for x instead of the expression the question asks for
  · Confused slope with y-intercept
  · Used diameter instead of radius
  · Off-by-one in a sequence
  · Switched units / forgot to convert
  · Applied wrong formula

KaTeX is REQUIRED for all math notation. Wrap fractions $\\dfrac{a}{b}$, exponents $x^2$, square roots $\\sqrt{5}$, etc.`;

function buildPrompt(row) {
  const lines = [
    `Generate explanation_text for this SAT question. Difficulty: ${row.difficulty ?? "?"}.`,
    "",
    "QUESTION:",
    row.question_text,
  ];
  if (row.passage) lines.push("", "PASSAGE:", row.passage);
  if (row.passage_a)
    lines.push("", "PASSAGE A:", row.passage_a, "", "PASSAGE B:", row.passage_b || "");
  if (row.choices && row.choices.length) {
    lines.push("", "CHOICES:");
    for (const letter of ["A", "B", "C", "D"]) {
      const choice = row.choices.find((c) => c.letter === letter);
      if (choice) lines.push(`${letter}) ${choice.choice_text}`);
    }
  }
  lines.push("", `CORRECT ANSWER: ${row.correct_answer}`);
  if (row.image_alt) lines.push("", `FIGURE: ${row.image_alt}`);
  return lines.join("\n");
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log("Loading candidate questions…");
  let query = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, question_text, correct_answer, difficulty, domain, subject, answer_format, explanation_text, passage, passage_a, passage_b, image_alt, answer_choices(letter, choice_text)"
    )
    .order("source_pdf", { ascending: true, nullsFirst: false });
  if (!FORCE) query = query.or("explanation_text.is.null,explanation_text.eq.");
  if (SOURCE_PDF) {
    query = query.eq("source_pdf", SOURCE_PDF);
    console.log(`Filtering to source_pdf="${SOURCE_PDF}"`);
  }
  const { data: rows, error } = await query;
  if (error) throw error;

  let candidates = (rows ?? []).map((r) => ({
    ...r,
    choices: r.answer_choices ?? [],
    is_math: MATH_DOMAINS.has(r.domain) || r.subject === "math",
  }));
  if (LIMIT) candidates = candidates.slice(0, LIMIT);

  console.log(
    `Candidates: ${candidates.length}${FORCE ? " (--force: regenerating all)" : " (empty explanation_text only)"}`
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const counts = { generated: 0, updated: 0, errors: 0, math: 0, rw: 0 };

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    const isMath = row.is_math;
    process.stdout.write(
      `[${i + 1}/${candidates.length}] ${row.source_pdf ?? "(?)"} p${row.source_page ?? "?"} (${isMath ? "math" : "R&W"} d${row.difficulty ?? "?"})… `
    );

    let parsed;
    try {
      parsed = await callClaude({
        prompt: buildPrompt(row),
        systemPrompt: isMath ? SYSTEM_PROMPT_MATH : SYSTEM_PROMPT_RW,
        model: "claude-sonnet-4-6",
        // Tool-use ensures the structured response shape even when
        // the walkthrough contains heavy LaTeX (math) or block quotes
        // (R&W) — both of which break naive JSON parsing.
        toolSchema: {
          type: "object",
          properties: {
            explanation_text: {
              type: "string",
              description:
                "The full explanation. R&W: synthesis paragraph anchored to the passage. Math: numbered step-by-step walkthrough with KaTeX.",
            },
          },
          required: ["explanation_text"],
        },
        maxTokens: isMath ? 2048 : 1024,
      });
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log("QUOTA EXHAUSTED — stopping.");
        break;
      }
      console.log(`API ERROR: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
      counts.errors++;
      continue;
    }

    const text = String(parsed?.explanation_text ?? "").trim();
    if (text.length < 30) {
      console.log(`Claude returned too-short explanation (${text.length} chars)`);
      counts.errors++;
      continue;
    }
    counts.generated++;
    if (isMath) counts.math++;
    else counts.rw++;
    console.log(`generated (${text.length} chars)`);

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({
          explanation_text: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.log(`  ✗ write failed: ${upErr.message}`);
        counts.errors++;
        continue;
      }
      counts.updated++;
    }
  }

  console.log("");
  console.log("═".repeat(72));
  console.log(
    `Done. ${counts.generated} explanation_text${counts.generated === 1 ? "" : "s"} generated (${counts.math} math, ${counts.rw} R&W), ${counts.updated} updated in DB, ${counts.errors} error${counts.errors === 1 ? "" : "s"}.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
