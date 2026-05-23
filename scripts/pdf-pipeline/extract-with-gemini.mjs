// ============================================================
// extract-with-gemini — first-pass replacement for the ChatGPT
// Custom-GPT extraction step. Takes an SAT PDF, sends it to
// Gemini 3.5 Flash with the KarmanGPT.txt schema as the system
// prompt + a structural responseSchema enforcing the 32-column
// shape, and writes the result to /tmp for inspection.
//
// SCOPE — this is a FIRST-PASS TEST script, not the final
// pipeline. It deliberately:
//   · Extracts STRUCTURE ONLY (question_text, choices, correct
//     answer, taxonomy, difficulty, passages, source metadata).
//   · SKIPS explanations entirely — those are generated downstream
//     by generate-per-choice-explanations.mjs (Sonnet) and the
//     math walkthroughs by a future script.
//   · SKIPS image extraction — figures get handled by a separate
//     PyMuPDF pass once we've validated text/structure quality.
//   · Writes JSON to /tmp, not CSV and not the database. The
//     user inspects the output and decides whether to invest in
//     building the full pipeline.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/pdf-pipeline/extract-with-gemini.mjs \
//     question-imports/done/202603asiav1.pdf
//
// COST
//   ~$0.03 per PDF on gemini-3.5-flash (PDF tokenization is 258
//   tokens/page; output is ~50K tokens for 98 questions sans
//   explanations). For 100 PDFs: ~$3 total.
// ============================================================

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { callClaude, QuotaExhaustedError, ParseError } from "../lib/llm-providers.mjs";

const pdfArg = process.argv[2];
if (!pdfArg) {
  console.error("Usage: node scripts/pdf-pipeline/extract-with-gemini.mjs <path-to-pdf>");
  process.exit(1);
}
const pdfPath = resolve(pdfArg);
const pdfName = basename(pdfPath);

const SCHEMA_PROMPT_PATH = resolve("question-imports/chatgpt/KarmanGPT.txt");
const schemaPrompt = readFileSync(SCHEMA_PROMPT_PATH, "utf-8");

console.log(`Reading PDF: ${pdfPath}`);
const pdfBuf = readFileSync(pdfPath);
const pdfSizeMB = (pdfBuf.length / 1024 / 1024).toFixed(2);
console.log(`PDF size: ${pdfSizeMB} MB`);

if (pdfBuf.length > 18 * 1024 * 1024) {
  console.error("PDF exceeds 18MB — too large for Gemini inline upload. Use Files API instead.");
  process.exit(1);
}

// Locked taxonomy enums — must match KarmanGPT.txt §6 exactly.
// Encoded as schema enums so Gemini literally cannot output a
// slug or domain that doesn't exist.
const DOMAINS = [
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];
const TOPIC_CLUSTERS = [
  "Algebra",
  "Advanced Math",
  "Geometry & Trigonometry",
  "Problem-Solving & Data Analysis",
  "Information & Ideas",
  "Craft & Structure",
  "Expression of Ideas",
  "Standard English Conventions",
];
const CONCEPT_SLUGS = [
  // algebra (6)
  "linear-equations-one-variable",
  "linear-equations-two-variables",
  "linear-inequalities",
  "systems-of-linear-equations",
  "systems-of-linear-inequalities",
  "absolute-value-equations",
  // advanced_math (17)
  "properties-of-exponents",
  "simplifying-algebraic-expressions",
  "evaluating-and-interpreting-functions",
  "introduction-to-polynomials",
  "quadratic-equations-factoring",
  "quadratic-equations-quadratic-formula",
  "quadratic-functions-vertex-form",
  "polynomial-operations",
  "rational-expressions",
  "radical-expressions",
  "exponential-growth-and-decay",
  "function-transformations",
  "linear-vs-exponential-models",
  "nonlinear-systems-of-equations",
  "algebraic-manipulation-of-complex-expressions",
  "multi-step-problem-solving",
  "full-section-strategy",
  // geometry (8)
  "area-perimeter-and-volume",
  "angle-relationships",
  "coordinate-plane-geometry",
  "triangle-congruence-and-similarity",
  "pythagorean-theorem-and-distance-formula",
  "trigonometric-ratios",
  "circle-equations-in-standard-form",
  "arc-length-and-sector-area",
  // data_analysis (9)
  "ratios-and-proportions",
  "percentages",
  "unit-rates-and-conversions",
  "scatterplots-and-lines-of-best-fit",
  "statistical-measures",
  "probability-basics",
  "two-way-tables",
  "statistical-inference-and-margin-of-error",
  "interpreting-complex-data",
  // info_ideas (15)
  "main-idea-and-central-claims",
  "supporting-details-and-evidence",
  "inference-and-implicit-meaning",
  "central-idea-vs-theme",
  "citing-textual-evidence",
  "cross-text-synthesis",
  "charts-and-data-in-passages",
  "interpreting-graphs-alongside-text",
  "command-of-evidence-textual",
  "command-of-evidence-quantitative",
  "counterclaims-and-rebuttals",
  "dual-passage-analysis",
  "statistical-claim-evaluation",
  "information-and-ideas-integration",
  "cross-disciplinary-evidence-use",
  // craft_structure (14)
  "authors-purpose-and-intent",
  "text-organization-patterns",
  "vocabulary-in-context",
  "word-choice-and-connotation",
  "rhetorical-appeals",
  "tone-and-point-of-view",
  "evaluating-argument-strength",
  "authorial-perspective-and-bias",
  "advanced-argumentation-analysis",
  "literary-authorial-purpose",
  "nuanced-vocabulary-in-context",
  "precise-word-choice-in-context",
  "structural-analysis-of-texts",
  "logical-structure-of-arguments",
  // expression_ideas (6)
  "transitional-words-and-phrases",
  "redundancy-and-conciseness",
  "sentence-variety-and-combining",
  "multi-paragraph-structure",
  "rhetorical-synthesis",
  "advanced-transitions-and-cohesion",
  // conventions (14)
  "subject-verb-agreement",
  "verb-tense",
  "pronouns-and-nouns",
  "apostrophes-plural-vs-possessive",
  "periods-and-semicolons",
  "comma-fanboys",
  "commas-and-dependent-clauses",
  "non-essential-information",
  "commas-with-names-and-titles",
  "additional-comma-uses-and-misuses",
  "colons-and-dashes",
  "parallel-structure-and-word-pairs",
  "question-marks",
  "modifier-placement",
];
if (CONCEPT_SLUGS.length !== 89) {
  throw new Error(`Expected 89 concept slugs, got ${CONCEPT_SLUGS.length}`);
}

// Structural schema — covers extraction fields only. Explanation
// fields (explanation_text, explanation_a..d, hint, desmos_strategy)
// are filled by downstream Sonnet/Haiku scripts, not Gemini.
const responseSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question_text: { type: "STRING" },
          choice_a: { type: "STRING" },
          choice_b: { type: "STRING" },
          choice_c: { type: "STRING" },
          choice_d: { type: "STRING" },
          correct_answer: { type: "STRING" },
          difficulty: { type: "INTEGER" },
          topic_cluster: { type: "STRING", enum: TOPIC_CLUSTERS },
          passage_intro: { type: "STRING" },
          passage: { type: "STRING" },
          passage_a: { type: "STRING" },
          passage_b: { type: "STRING" },
          question_format: {
            type: "STRING",
            enum: ["multiple_choice", "numeric_entry"],
          },
          numeric_tolerance: { type: "STRING" },
          domain: { type: "STRING", enum: DOMAINS },
          // Gemini 3.5 Flash rejects responseSchema enums larger than
          // ~50 items (probed empirically). Our taxonomy has 89 slugs,
          // so we cannot enforce at the schema layer. Instead we lean
          // on the system prompt to list them and post-validate after
          // extraction — any invalid slug flips import_status to
          // needs_review.
          concept_slug: { type: "STRING" },
          answer_source: {
            type: "STRING",
            enum: ["extracted", "inferred", "hand_corrected"],
          },
          source_page: { type: "INTEGER" },
          import_status: { type: "STRING", enum: ["ok", "needs_review"] },
          import_flag_reason: { type: "STRING" },
          // Figure detection — Gemini flags questions whose meaning
          // depends on a visual (chart, graph, geometry diagram, table).
          // A separate downstream pass (extract-figures.mjs) renders +
          // crops + uploads the actual image bytes. We only need a
          // boolean + alt-text seed here.
          has_figure: { type: "BOOLEAN" },
          figure_alt: { type: "STRING" },
        },
        required: [
          "question_text",
          "correct_answer",
          "difficulty",
          "topic_cluster",
          "question_format",
          "domain",
          "concept_slug",
          "source_page",
          "import_status",
          "has_figure",
        ],
      },
    },
  },
  required: ["questions"],
};

const USER_PROMPT = `TASK: EXHAUSTIVELY extract EVERY solvable question from this SAT PDF.

FILENAME: ${pdfName}

EXPECTED OUTPUT SIZE: ~98 questions total. A typical SAT PDF contains 4 modules:
  · Reading & Writing Module 1: ~27 questions
  · Reading & Writing Module 2: ~27 questions
  · Math Module 1: ~22 questions
  · Math Module 2: ~22 questions
You are NOT done until you have processed every question across all 4 modules. If your output has fewer than 80 questions, you have skipped pages — go back and extract the missed questions.

CRITICAL — DO NOT STOP EARLY:
  · This is NOT a "give me a sample" task. Extract EVERY question.
  · Process pages 1 through (last question page) in order. The answer-key pages are at the END of the PDF — those are the only pages to skip.
  · Do NOT abridge, summarize, or sample. Emit one JSON object per question.
  · You have a maxOutputTokens budget of 65536 — use what you need to be exhaustive.

EXTRACTION SCOPE — first-pass test, structure only:

  · DO extract per question: question_text, choice_a..d (for MC), correct_answer, difficulty (1-7), topic_cluster, passage fields (R&W only), question_format, numeric_tolerance, domain, concept_slug, answer_source, source_page, import_status, import_flag_reason.

  · DO NOT extract or generate: explanation_text, explanation_a..d, hint, desmos_strategy, image_url, image_alt, content_hash. Those fields are filled by separate downstream pipelines — leave them OUT of the response entirely.

R&W STRUCTURE — CRITICAL: separate the passage from the question stem.

Many R&W questions present a passage with a BLANK and a generic question stem. For these:
  · question_text = the GENERIC STEM ONLY. Examples:
      "Which choice completes the text with the most logical and precise word or phrase?"
      "Which choice completes the text so that it conforms to the conventions of Standard English?"
      "Which choice most logically completes the text?"
      "As used in the text, what does the word ___ most nearly mean?"
  · passage = the body of the passage, including any blank (use "______" for the blank if present).
  · NEVER put the passage inside question_text.
  · NEVER duplicate the passage in BOTH question_text AND passage — those fields hold different things.
  · NEVER leave passage empty for R&W questions; every R&W question has its own passage.

For R&W questions where the stem references the passage explicitly (main idea, inference, structure):
  · question_text = the SPECIFIC stem ("Which choice best states the main idea of the text?", etc.)
  · passage = the full passage the question references.

For Math questions: passage, passage_a, passage_b, passage_intro are ALL EMPTY.

For Cross-Text R&W (when the PDF shows "Text 1" + "Text 2"):
  · passage = empty, passage_a = Text 1 body, passage_b = Text 2 body.

FIGURE DETECTION — for every question, set has_figure:
  · has_figure = true if the question's MEANING DEPENDS on a visual element you can see in the PDF:
      - Math: graph, scatterplot, geometry diagram, coordinate plane, table of values, bar chart, histogram, function plot, regular polygon, circle diagram
      - R&W: any chart/table embedded in the passage (info_ideas questions asking to read data from a figure, command-of-evidence-quantitative)
      - Any question whose stem says "the figure shown", "based on the graph", "the table above", "shown in the diagram"
  · has_figure = false if the question is solvable from text alone, even if the PDF page has decorative elements around it.
  · When has_figure = true, ALSO set figure_alt to a 1-2 sentence description of what the figure shows (for accessibility + as a seed for downstream alt-text). Examples:
      - "Scatterplot of 12 data points with x-axis 0–10 and y-axis 0–50; a line of best fit slopes upward."
      - "Right triangle ABC with right angle at B, AB=3, BC=4."
      - "Table showing 4 columns (Year, Population, Births, Deaths) and 5 rows."
  · When has_figure = false, leave figure_alt empty.

  · The answer-key page is at the end of the PDF. Cross-reference each question's correct_answer against it per §11 of the spec.

  · Use the schema enums (domain, topic_cluster, question_format, answer_source, import_status) — every value MUST be one of the listed strings.

  · concept_slug: pick from the 89 slugs listed in your system instructions §6. The schema doesn't enforce this — but every slug you emit MUST match one of the 89 exactly (we validate after).

  · For each question, record the source_page (1-indexed PDF page number where the question appears).

VERIFICATION BEFORE RESPONDING: Count your questions. If under 80, you have missed pages — extract them now.

Return the result as { "questions": [ ... ] } matching the response schema.`;

// Convert the Gemini-style responseSchema (UPPERCASE OpenAPI types
// + enum on STRING) to Anthropic tool_use input_schema (lowercase
// JSON-Schema-ish types). The two are structurally identical except
// for the case convention and a slightly different keyword set.
function schemaForAnthropic(s) {
  if (s == null || typeof s !== "object") return s;
  if (Array.isArray(s)) return s.map(schemaForAnthropic);
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "type" && typeof v === "string") {
      out.type = v.toLowerCase();
    } else if (k === "items" || k === "properties") {
      out[k] = schemaForAnthropic(v);
    } else {
      out[k] = schemaForAnthropic(v);
    }
  }
  return out;
}

const toolSchema = schemaForAnthropic(responseSchema);

const t0 = Date.now();
console.log(`Calling claude-sonnet-4-6 with PDF + KarmanGPT schema prompt…`);
console.log(
  `(System prompt: ${(schemaPrompt.length / 1024).toFixed(1)} KB / ~${Math.round(schemaPrompt.length / 4)} tokens)`
);

let result;
try {
  result = await callClaude({
    prompt: USER_PROMPT,
    model: "claude-sonnet-4-6",
    systemPrompt: schemaPrompt,
    pdf: { buf: pdfBuf },
    // tool-use guarantees the response shape AND sidesteps Gemini's
    // non-deterministic RECITATION filter (confirmed on run
    // #26322250769 — finishReason:RECITATION, text_chars:0). Claude
    // has no equivalent automated filter for educational SAT content.
    toolSchema,
    maxTokens: 32_000,
  });
} catch (err) {
  if (err instanceof QuotaExhaustedError) {
    console.error(`\nAnthropic quota exhausted: ${err.message}`);
    process.exit(2);
  }
  if (err instanceof ParseError) {
    const raw = err.raw ?? "(no raw available)";
    console.error(`\nClaude returned unparseable response.`);
    console.error(`Raw response length: ${raw.length} chars`);
    console.error("─── First 1500 chars ───");
    console.error(raw.slice(0, 1500));
    console.error("─── Last 500 chars ───");
    console.error(raw.length > 1500 ? raw.slice(-500) : "(already shown above)");
    console.error("─── end ───");
    try {
      writeFileSync("./claude-raw-error.txt", raw);
      console.error("Full raw response saved to ./claude-raw-error.txt");
    } catch {}
    process.exit(3);
  }
  throw err;
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nClaude returned in ${elapsed}s`);

// Persist + summarize.
//
// Shape handling: we ASK for { questions: [...] } via responseSchema,
// but Gemini occasionally returns the bare array [...] directly (the
// schema's outer object wrapper gets dropped, observed on the
// 202405us.pdf run #26321947286 — 100 KB of valid extraction data
// silently discarded because `result?.questions` was undefined).
// Accept both shapes so the pipeline doesn't throw away good output.
const rows = Array.isArray(result)
  ? result
  : Array.isArray(result?.questions)
    ? result.questions
    : [];
const stem = pdfName.replace(/\.pdf$/i, "");
const outPath = `/tmp/${stem}-gemini-extracted.json`;

// Fast-fail: if extraction returned nothing, the pipeline should NOT
// silently continue to write an empty CSV and import zero rows. Throw
// here so the orchestrator marks the job failed with a clear stage
// name and we know to debug the extraction step specifically.
if (rows.length === 0) {
  console.error(
    `Extraction returned 0 questions. Raw response was ${
      typeof result === "object"
        ? `an object with keys [${Object.keys(result ?? {}).join(", ") || "none"}]`
        : typeof result
    }. Aborting before downstream stages.`
  );
  process.exit(4);
}

// Post-validation —
// 1) concept_slug must be one of the 89 canonical (schema can't enforce
//    because Gemini caps enums around 50 items).
// 2) For R&W rows: question_text and passage must NOT be the same text
//    (Flash sometimes duplicates the passage into question_text instead
//    of using the generic stem like "Which choice completes the text...").
const validSlugs = new Set(CONCEPT_SLUGS);
const rwDomains = new Set(["info_ideas", "craft_structure", "expression_ideas", "conventions"]);
let invalidSlugCount = 0;
const invalidSlugSamples = [];
let dupPassageCount = 0;
const dupPassageSamples = [];
for (const r of rows) {
  if (!validSlugs.has(r.concept_slug)) {
    invalidSlugCount++;
    if (invalidSlugSamples.length < 5) {
      invalidSlugSamples.push({ page: r.source_page, invalid_slug: r.concept_slug });
    }
    if (r.import_status === "ok") {
      r.import_status = "needs_review";
      r.import_flag_reason = `Invalid concept_slug "${r.concept_slug}" — not in 89-slug taxonomy`;
    }
  }
  // R&W: detect passage/question duplication
  const qt = (r.question_text ?? "").trim();
  const passage = (r.passage ?? "").trim();
  if (rwDomains.has(r.domain) && qt.length > 80 && qt.startsWith(passage.slice(0, 80))) {
    dupPassageCount++;
    if (dupPassageSamples.length < 5) {
      dupPassageSamples.push({ page: r.source_page, qt_preview: qt.slice(0, 80) });
    }
    if (r.import_status === "ok") {
      r.import_status = "needs_review";
      r.import_flag_reason =
        "question_text duplicates passage — likely R&W stem/passage split failure";
    }
  }
}

writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} questions to ${outPath}`);
if (invalidSlugCount > 0) {
  console.log(`⚠ ${invalidSlugCount} rows had invalid concept_slug (auto-flagged for review):`);
  for (const s of invalidSlugSamples) {
    console.log(`    p${s.page}: "${s.invalid_slug}"`);
  }
}
if (dupPassageCount > 0) {
  console.log(
    `⚠ ${dupPassageCount} R&W rows had question_text duplicating passage (auto-flagged):`
  );
  for (const s of dupPassageSamples) {
    console.log(`    p${s.page}: "${s.qt_preview}..."`);
  }
}

// Sanity-check distribution
const byDomain = {};
const byCluster = {};
const byDifficulty = {};
const byFormat = {};
const flagged = [];
const mathDomains = new Set(["algebra", "advanced_math", "geometry", "data_analysis"]);
let math = 0;
let rw = 0;
for (const r of rows) {
  byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
  byCluster[r.topic_cluster] = (byCluster[r.topic_cluster] ?? 0) + 1;
  byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
  byFormat[r.question_format] = (byFormat[r.question_format] ?? 0) + 1;
  if (mathDomains.has(r.domain)) math++;
  else rw++;
  if (r.import_status === "needs_review") {
    flagged.push({ page: r.source_page, reason: r.import_flag_reason ?? "(no reason given)" });
  }
}

console.log("");
console.log("═".repeat(72));
console.log(`SUMMARY — ${pdfName}`);
console.log("═".repeat(72));
console.log(`Total questions: ${rows.length}`);
console.log(`Math vs R&W: ${math} math / ${rw} R&W`);
console.log("");
console.log("By domain:");
for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${d.padEnd(20)} ${n}`);
}
console.log("");
console.log("By difficulty:");
for (const d of [1, 2, 3, 4, 5, 6, 7]) {
  if (byDifficulty[d]) console.log(`  ${d}: ${byDifficulty[d]}`);
}
console.log("");
console.log("By format:");
for (const [f, n] of Object.entries(byFormat)) {
  console.log(`  ${f}: ${n}`);
}
console.log("");
console.log(`Flagged for review: ${flagged.length}`);
for (const f of flagged.slice(0, 10)) {
  console.log(`  p${f.page}: ${f.reason}`);
}
if (flagged.length > 10) console.log(`  … and ${flagged.length - 10} more`);
console.log("");
console.log(`Inspect: cat ${outPath} | jq '.[0]'`);
