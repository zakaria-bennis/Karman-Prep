// ============================================================
// import-csv-direct.mjs — read a 30-column CSV (the format that
// /admin/questions/import accepts) and insert each row directly
// into Supabase: quiz_questions + answer_choices, with concept_slug
// → node_id auto-attach.
//
// Usage:
//   node --env-file=.env.local scripts/import-csv-direct.mjs <csv-path>
//
// Use case: a CSV produced by ChatGPT Plus + Code Interpreter (the
// monthly workflow), so the user never touches the file — just hands
// it to this script and watches the bank fill.
//
// The (source_pdf, content_hash) UNIQUE index in quiz_questions makes
// this idempotent: re-running on the same CSV is safe; conflicts are
// reported as skipped_duplicates.
// ============================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: node scripts/import-csv-direct.mjs <csv-path>");
  process.exit(1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Build slug → node_id map by regex-parsing curriculum.ts
//    (faster than running a tsx-compiled module). ─────────────
const curr = readFileSync("src/data/curriculum.ts", "utf-8");
const SLUG_TO_NODE = new Map();
const NODE_TO_DOMAIN = new Map();
{
  // Match blocks like:   id: "rw-00", tier: 1, difficulty: 1,
  //                      concept_slug: "main-idea-and-central-claims",
  const re = /id:\s*"([a-z0-9-]+)",[\s\S]*?concept_slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(curr)) !== null) {
    SLUG_TO_NODE.set(m[2], m[1]);
  }
}
console.log(`loaded ${SLUG_TO_NODE.size} slug→node mappings from curriculum.ts`);

const VALID_DOMAINS = new Set([
  "algebra", "advanced_math", "geometry", "data_analysis",
  "info_ideas", "craft_structure", "expression_ideas", "conventions",
]);
const READING_DOMAINS = new Set(["info_ideas", "craft_structure", "expression_ideas", "conventions"]);

const CLUSTER_BY_DOMAIN = {
  algebra:          "Algebra",
  advanced_math:    "Advanced Math",
  geometry:         "Geometry & Trigonometry",
  data_analysis:    "Problem-Solving & Data Analysis",
  info_ideas:       "Information & Ideas",
  craft_structure:  "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions:      "Standard English Conventions",
};

// ── Minimal RFC4180-ish CSV parser ───────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", i = 0, inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (ch === '"') { inQuotes = false; i++; continue; }
      cell += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(cell); cell = ""; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
    cell += ch; i++;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// ── Difficulty 1-7 → legacy enum ─────────────────────────────
function legacyDifficulty(level) {
  const n = parseInt(level, 10);
  if (!Number.isFinite(n)) return "intermediate";
  if (n <= 2) return "foundational";
  if (n <= 4) return "intermediate";
  if (n <= 6) return "advanced";
  return "mastery";
}

async function main() {
  const text = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("CSV has no data rows");
    process.exit(1);
  }
  const header = rows[0];
  const data = rows.slice(1).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ""));
  console.log(`parsed ${data.length} data rows from CSV`);

  // index columns by name so we don't depend on order
  const col = (name) => header.indexOf(name);
  const need = ["question_text", "correct_answer", "domain", "concept_slug",
                "source_pdf", "content_hash", "import_status", "question_format"];
  for (const n of need) {
    if (col(n) < 0) {
      console.error(`CSV missing required column: ${n}`);
      process.exit(1);
    }
  }

  const result = { inserted: 0, skippedDup: 0, flaggedReview: 0, errored: 0, errors: [] };

  for (let idx = 0; idx < data.length; idx++) {
    const r = data[idx];
    const get = (name) => (r[col(name)] || "").trim();

    const slug = get("concept_slug");
    const domain = get("domain");
    const node_id = SLUG_TO_NODE.get(slug) || null;
    const subject = READING_DOMAINS.has(domain) ? "reading" : "math";

    if (!VALID_DOMAINS.has(domain)) {
      result.errored++;
      result.errors.push({ row: idx + 2, msg: `unknown domain "${domain}"` });
      continue;
    }
    if (slug && !SLUG_TO_NODE.has(slug)) {
      // slug present but unknown — flag, don't error out
      console.log(`  row ${idx + 2}: unknown slug "${slug}" — inserting unattached`);
    }

    const importStatus = get("import_status") || "ok";
    const flagType = get("import_flag_type") || null;
    const flagReason = get("import_flag_reason") || null;
    const isFlagged = importStatus === "needs_review";
    if (isFlagged && !flagReason) {
      result.errored++;
      result.errors.push({ row: idx + 2, msg: "needs_review row missing flag_reason" });
      continue;
    }

    const format = get("question_format") || "multiple_choice";
    const questionType = subject === "reading" ? "evidence_based" : "math_computation";
    const cluster = CLUSTER_BY_DOMAIN[domain] || get("topic_cluster") || "";

    const tolerance = get("numeric_tolerance");
    const sourcePage = parseInt(get("source_page"), 10);
    const difficultyLevel = parseInt(get("difficulty"), 10) || 3;

    const eA = get("explanation_a");
    const eB = get("explanation_b");
    const eC = get("explanation_c");
    const eD = get("explanation_d");
    const explanationPerChoice = (eA || eB || eC || eD) ? { A: eA, B: eB, C: eC, D: eD } : null;

    // Insert quiz_questions
    const insertPayload = {
      node_id,
      question_text: get("question_text"),
      question_type: questionType,
      difficulty: legacyDifficulty(difficultyLevel),
      difficulty_level: difficultyLevel,
      answer_format: format,
      correct_answer: get("correct_answer"),
      numeric_tolerance: tolerance ? Number.parseFloat(tolerance) : null,
      explanation_text: get("explanation_text"),
      explanation_per_choice: explanationPerChoice,
      hint: get("hint") || null,
      subject,
      topic_cluster: cluster,
      desmos_strategy: get("desmos_strategy") || null,
      passage_intro: get("passage_intro") || null,
      passage: get("passage") || null,
      passage_a: get("passage_a") || null,
      passage_b: get("passage_b") || null,
      domain,
      concept_slug: slug || null,
      answer_source: get("answer_source") || null,
      source_pdf: get("source_pdf") || null,
      source_page: Number.isFinite(sourcePage) ? sourcePage : null,
      content_hash: get("content_hash") || null,
      import_status: importStatus,
      import_flag_type: flagType,
      import_flag_reason: flagReason,
    };

    const { data: inserted, error } = await supabase
      .from("quiz_questions")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      // Postgres unique-violation on (source_pdf, content_hash) → 23505 / "duplicate"
      if (error.code === "23505" || /duplicate/i.test(error.message)) {
        result.skippedDup++;
        continue;
      }
      result.errored++;
      result.errors.push({ row: idx + 2, msg: error.message });
      continue;
    }

    // For MC, insert 4 answer_choices
    if (format === "multiple_choice") {
      const choiceRows = ["A", "B", "C", "D"].map((letter) => ({
        question_id: inserted.id,
        letter,
        choice_text: get("choice_" + letter.toLowerCase()),
        is_correct: get("correct_answer").toUpperCase() === letter,
      }));
      const { error: ce } = await supabase.from("answer_choices").insert(choiceRows);
      if (ce) {
        result.errored++;
        result.errors.push({ row: idx + 2, msg: `choices: ${ce.message}` });
        continue;
      }
    }

    if (isFlagged) result.flaggedReview++;
    else result.inserted++;
  }

  console.log();
  console.log("─".repeat(56));
  console.log(`inserted (ok):       ${result.inserted}`);
  console.log(`flagged (review):    ${result.flaggedReview}`);
  console.log(`skipped (duplicate): ${result.skippedDup}`);
  console.log(`errored:             ${result.errored}`);
  if (result.errors.length) {
    console.log("\nerrors:");
    for (const e of result.errors.slice(0, 10)) console.log(`  row ${e.row}: ${e.msg}`);
    if (result.errors.length > 10) console.log(`  …and ${result.errors.length - 10} more`);
  }
  // Final bank totals
  const { count: q } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true });
  const { count: c } = await supabase.from("answer_choices").select("id", { count: "exact", head: true });
  console.log(`\nbank now: ${q} questions, ${c} choices`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
