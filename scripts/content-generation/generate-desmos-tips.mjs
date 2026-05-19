// ============================================================
// generate-desmos-tips — populate the
// quiz_questions.desmos_strategy field for every math question
// (subject='math').
//
// Per the product owner's call: run on ALL math questions and let
// Claude decide whether Desmos is actually useful. When it's not,
// Claude writes "Not applicable — solve algebraically" (or similar
// short skip-note) rather than forcing a hint. That way the field
// is consistently populated and the student UI can show / hide
// based on the value.
//
// Powered by Claude Opus 4.7 — best at concise, helpful strategy
// advice that doesn't lecture.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/content-generation/generate-desmos-tips.mjs
//   LIMIT=10 node --env-file=.env.local ...     # cap for testing
//   node --env-file=.env.local ... --dry-run    # print, no writes
//   node --env-file=.env.local ... --force      # regenerate every
//                                                 math question's tip
//
// COST
//   ~$0.02 per math question on Opus 4.7. For ~3,000 math questions
//   that's ~$60. Budget $80 for headroom.
// ============================================================

import { callClaude, QuotaExhaustedError } from "../lib/llm-providers.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;

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

const SYSTEM_PROMPT = `You generate Desmos graphing-calculator strategy tips for SAT math questions. A tip is 1-2 sentences telling the student EXACTLY what to type into Desmos to solve the problem efficiently — the keystrokes / commands, not the math behind them.

WHEN DESMOS IS USEFUL (write a real tip):
  · System of equations → "Graph both equations; the intersection is your answer."
  · Quadratic / function root → "Plot y = f(x); the x-intercepts are the solutions."
  · Linear regression / line-of-best-fit → "Type y₁ ~ mx + b after pasting the table."
  · Inequalities → "Graph the inequality directly with the < symbol."
  · Compound interest / exponential → "Plot y = P(1+r)^x and read off the value at x = years."
  · Geometry that resolves to coordinates → "Use the regular polygon (n=…) construction."

WHEN DESMOS IS NOT USEFUL (write a short skip-note):
  · Pure algebraic manipulation that's faster by hand
  · Conceptual / definition-based questions
  · Word problems where setup is harder than the math

For the not-useful case, write: "Not applicable — <one sentence why Desmos doesn't help>."

Style rules:
  · Maximum 2 sentences, total under 200 characters.
  · Use concrete Desmos syntax when it helps (\`y = x^2 - 4x + 3\`, \`y₁ ~ a + bx\`, etc.).
  · Don't explain WHY the answer is what it is — that's the explanation field's job. Focus on the calculator-driven approach.
  · Don't include the answer itself.`;

function buildPrompt(row) {
  const lines = [
    "Generate a Desmos strategy tip for this SAT math question.",
    "",
    "QUESTION:",
    row.question_text,
  ];
  if (row.choices && row.choices.length > 0) {
    lines.push("", "CHOICES:");
    for (const letter of ["A", "B", "C", "D"]) {
      const choice = row.choices.find((c) => c.letter === letter);
      if (choice) lines.push(`${letter}) ${choice.choice_text}`);
    }
  }
  if (row.domain) lines.push("", `DOMAIN: ${row.domain}`);
  lines.push("");
  lines.push('Respond as strict JSON: { "useful": true | false, "tip": "<the tip or skip-note>" }');
  return lines.join("\n");
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log("Loading math questions…");
  let query = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, question_text, domain, subject, desmos_strategy, answer_choices(letter, choice_text)"
    )
    .eq("subject", "math")
    .order("source_pdf", { ascending: true, nullsFirst: false });
  if (!FORCE) query = query.or("desmos_strategy.is.null,desmos_strategy.eq.");
  const { data: rows, error } = await query;
  if (error) throw error;
  let candidates = (rows ?? []).map((r) => ({
    ...r,
    choices: r.answer_choices ?? [],
  }));
  if (LIMIT) candidates = candidates.slice(0, LIMIT);
  console.log(
    `Math candidates: ${candidates.length}${FORCE ? " (--force: regenerating all)" : ""}`
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let generated = 0;
  let useful = 0;
  let notApplicable = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    process.stdout.write(
      `[${i + 1}/${candidates.length}] ${row.source_pdf ?? "(?)"} p${row.source_page ?? "?"} (${row.domain ?? "math"})… `
    );

    let parsed;
    try {
      parsed = await callClaude({
        prompt: buildPrompt(row),
        systemPrompt: SYSTEM_PROMPT,
        json: true,
        maxTokens: 512,
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

    const tip = String(parsed?.tip ?? "").trim();
    const isUseful = parsed?.useful === true;
    if (!tip || tip.length < 10) {
      console.log("no tip returned");
      errors++;
      continue;
    }
    console.log(
      `${isUseful ? "USEFUL" : "skip"}: ${tip.slice(0, 60)}${tip.length > 60 ? "…" : ""}`
    );
    if (isUseful) useful++;
    else notApplicable++;
    generated++;

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({
          desmos_strategy: tip,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        console.log(`  ✗ write failed: ${upErr.message}`);
        errors++;
        continue;
      }
    }
  }

  console.log("");
  console.log("═".repeat(72));
  console.log(
    `Done. ${generated} tip${generated === 1 ? "" : "s"} generated (${useful} useful, ${notApplicable} not applicable), ${errors} error${errors === 1 ? "" : "s"}.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
