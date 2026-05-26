// ============================================================
// generate-per-choice-explanations — fill the
// quiz_questions.explanation_per_choice JSONB for MC rows whose
// per-choice text is missing OR looks truncated.
//
// Powered by Claude Sonnet 4.6 — strong enough at structured
// pedagogical writing (specifically the trap-naming nuance we
// want) that Opus 4.7 is overkill at ~5x the price. We pass the
// question, all four choices, and the correct answer; Sonnet
// returns ~50-word explanations for each letter explaining why
// it's right or wrong.
//
// Policy (per the product owner's design call):
//   · Fill in EMPTY slots — every NULL or "" entry gets a fresh
//     explanation.
//   · REPLACE "truncated" slots — entries shorter than 30 chars
//     that don't end in punctuation are treated as OCR truncations
//     and overwritten.
//   · PRESERVE longer human-written entries — anything 30+ chars
//     stays untouched unless --force is passed.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/content-generation/generate-per-choice-explanations.mjs
//   LIMIT=10 node --env-file=.env.local ...     # cap for testing
//   node --env-file=.env.local ... --dry-run    # print plan, no writes
//   node --env-file=.env.local ... --force      # overwrite EVERY slot
//
// COST
//   ~$0.013 per question on Sonnet 4.6 ($3/M input + $15/M output).
//   For 1,500 questions missing per-choice explanations that's ~$20.
//   Budget $30 for headroom + retries.
// ============================================================

import { callClaude, QuotaExhaustedError } from "../lib/llm-providers.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
// v2 phase 1: filter to a single source_pdf (see generate-explanation-text.mjs).
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

const SYSTEM_PROMPT = `You write per-choice explanations for SAT practice questions. For each of the four answer choices (A, B, C, D), produce a 1-2 sentence explanation:

  · For the CORRECT choice: explain the reasoning that arrives at this answer. Be concise and direct.
  · For each WRONG choice: name the trap or misconception that produces it ("sign error", "off-by-one", "swapped units", "misread the question", "common partial-completion"). Explicitly say why it's wrong.

Style rules:
  · Each explanation must be 50-150 characters. Long enough to be useful, short enough to scan.
  · Use the same math notation conventions as the question. Wrap inline math in $…$ (e.g. $x^2$, $\\frac{1}{2}$).
  · Don't lecture. Don't say "Choice A is wrong because…" — just explain the trap.
  · Don't repeat the choice text inside your explanation.`;

function buildPrompt(row) {
  const lines = [
    "Generate per-choice explanations for this SAT question.",
    "",
    "QUESTION:",
    row.question_text,
  ];
  if (row.passage) {
    lines.push("", "PASSAGE:", row.passage);
  }
  if (row.passage_a) {
    lines.push("", "PASSAGE A:", row.passage_a, "", "PASSAGE B:", row.passage_b || "");
  }
  lines.push("", "CHOICES:");
  for (const letter of ["A", "B", "C", "D"]) {
    const choice = row.choices.find((c) => c.letter === letter);
    lines.push(`${letter}) ${choice?.choice_text ?? ""}`);
  }
  lines.push("", `CORRECT ANSWER: ${row.correct_answer}`);
  lines.push("");
  lines.push('Respond as strict JSON: { "A": "...", "B": "...", "C": "...", "D": "..." }');
  return lines.join("\n");
}

// Decide which letters need a new explanation. Returns the set
// of letters to overwrite based on the policy.
function lettersNeedingExplanation(existing, force) {
  if (force) return new Set(["A", "B", "C", "D"]);
  const need = new Set();
  for (const letter of ["A", "B", "C", "D"]) {
    const v = (existing && existing[letter]) || "";
    const trimmed = v.trim();
    if (!trimmed) {
      need.add(letter);
      continue;
    }
    // Heuristic for OCR truncation: < 30 chars AND doesn't end
    // in sentence-ending punctuation. Real (human-written) one-
    // word answers are rare; truncated OCR is common.
    if (trimmed.length < 30 && !/[.!?]$/.test(trimmed)) {
      need.add(letter);
    }
  }
  return need;
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log("Loading candidate MC questions…");
  // Pull only multiple_choice rows (per-choice doesn't apply to
  // numeric_entry). Filter out empty question_text. Join choices.
  let query = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, question_text, correct_answer, passage, passage_a, passage_b, explanation_per_choice, answer_format, answer_choices(letter, choice_text)"
    )
    .eq("answer_format", "multiple_choice")
    .order("source_pdf", { ascending: true, nullsFirst: false });
  if (SOURCE_PDF) {
    query = query.eq("source_pdf", SOURCE_PDF);
    console.log(`Filtering to source_pdf="${SOURCE_PDF}"`);
  }
  const { data: rows, error } = await query;
  if (error) throw error;
  let candidates = (rows ?? []).map((r) => ({
    ...r,
    choices: r.answer_choices ?? [],
  }));

  // Filter to rows that actually need work — saves API calls on
  // questions whose per-choice is already complete.
  candidates = candidates.filter((r) => {
    const need = lettersNeedingExplanation(r.explanation_per_choice, FORCE);
    return need.size > 0;
  });
  if (LIMIT) candidates = candidates.slice(0, LIMIT);
  console.log(
    `Candidates: ${candidates.length}${FORCE ? " (--force: regenerating all 4 per row)" : ""}`
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let generated = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    const need = lettersNeedingExplanation(row.explanation_per_choice, FORCE);
    process.stdout.write(
      `[${i + 1}/${candidates.length}] ${row.source_pdf ?? "(?)"} p${row.source_page ?? "?"} need=${[...need].join("")}… `
    );

    let parsed;
    try {
      parsed = await callClaude({
        prompt: buildPrompt(row),
        systemPrompt: SYSTEM_PROMPT,
        model: "claude-sonnet-4-6",
        // Tool-use forces Anthropic to validate the response against the
        // schema, so LaTeX-in-strings (`$\Delta x$`) can't break parsing.
        toolSchema: {
          type: "object",
          properties: {
            A: { type: "string", description: "Explanation for choice A." },
            B: { type: "string", description: "Explanation for choice B." },
            C: { type: "string", description: "Explanation for choice C." },
            D: { type: "string", description: "Explanation for choice D." },
          },
          required: ["A", "B", "C", "D"],
        },
      });
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log("QUOTA EXHAUSTED — stopping.");
        break;
      }
      console.log(`API ERROR: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
      errors++;
      continue;
    }

    // Merge: keep human-written longer entries, overwrite only
    // the ones in `need`.
    const existing = row.explanation_per_choice || {};
    const merged = { ...existing };
    let touched = 0;
    for (const letter of ["A", "B", "C", "D"]) {
      if (need.has(letter)) {
        const text = String(parsed?.[letter] ?? "").trim();
        if (text.length >= 20) {
          merged[letter] = text;
          touched++;
        }
      }
    }
    if (touched === 0) {
      console.log("Claude returned no usable explanations");
      errors++;
      continue;
    }
    console.log(`generated ${touched} explanation${touched === 1 ? "" : "s"}`);
    generated += touched;

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({
          explanation_per_choice: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.log(`  ✗ write failed: ${upErr.message}`);
        errors++;
        continue;
      }
      updated++;
    }
  }

  console.log("");
  console.log("═".repeat(72));
  console.log(
    `Done. ${generated} per-choice explanation${generated === 1 ? "" : "s"} generated across ${updated} question${updated === 1 ? "" : "s"}, ${errors} error${errors === 1 ? "" : "s"}.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
