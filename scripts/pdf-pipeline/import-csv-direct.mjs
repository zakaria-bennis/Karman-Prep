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
import { createHash } from "node:crypto";
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
//
// The curriculum was migrated from the source file to the DB
// at some point. If src/data/curriculum.ts is missing, that's
// fine — we just leave node_id null on every inserted row, and
// the question lands in the bank for triage at /admin/questions/review
// (this is the bank-import model: rows enter unassigned, admin
// routes them later). Log a warning so the operator knows.
const SLUG_TO_NODE = new Map();
const NODE_TO_DOMAIN = new Map();
try {
  const curr = readFileSync("src/data/curriculum.ts", "utf-8");
  // Match blocks like:   id: "rw-00", tier: 1, difficulty: 1,
  //                      concept_slug: "main-idea-and-central-claims",
  const re = /id:\s*"([a-z0-9-]+)",[\s\S]*?concept_slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(curr)) !== null) {
    SLUG_TO_NODE.set(m[2], m[1]);
  }
  console.log(`loaded ${SLUG_TO_NODE.size} slug→node mappings from curriculum.ts`);
} catch (err) {
  if (err?.code === "ENOENT") {
    console.log(
      "curriculum.ts not found — inserting all rows with node_id=null (bank-import model). Routes happen in /admin/questions/review."
    );
  } else {
    throw err;
  }
}

const VALID_DOMAINS = new Set([
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
]);
const READING_DOMAINS = new Set([
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
]);

const CLUSTER_BY_DOMAIN = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry & Trigonometry",
  data_analysis: "Problem-Solving & Data Analysis",
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};

// ── Minimal RFC4180-ish CSV parser ───────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    i = 0,
    inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
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

// ── v2 content hash (sha256, includes passage fields) ────────
// Replaces v1 SHA-1 hash that only covered question_text + 4 choices,
// causing collisions on cross-text questions where stem + choices
// were identical but passages differed (audit CRIT-4).
// Phase 1 writes this alongside v1 content_hash — not yet UNIQUE in
// the DB until backfill is collision-tested.
function computeContentHashV2(fields) {
  const parts = [
    fields.subject ?? "",
    fields.domain ?? "",
    fields.answer_format ?? "",
    fields.passage_intro ?? "",
    fields.passage ?? "",
    fields.passage_a ?? "",
    fields.passage_b ?? "",
    fields.question_text ?? "",
    fields.choice_a ?? "",
    fields.choice_b ?? "",
    fields.choice_c ?? "",
    fields.choice_d ?? "",
  ];
  const normalized = parts.map((p) => String(p).trim().toLowerCase()).join("|");
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
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
  const need = [
    "question_text",
    "correct_answer",
    "domain",
    "concept_slug",
    "source_pdf",
    "content_hash",
    "import_status",
    "question_format",
  ];
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
    const explanationPerChoice = eA || eB || eC || eD ? { A: eA, B: eB, C: eC, D: eD } : null;

    // ── v2 phase 1: publish_status gating ────────────────
    // New rows do NOT become student-facing on import. Only
    // publish-gate.mjs (run after grading + KaTeX validation)
    // promotes them to 'publish_ready'. import_status='ok' is
    // now ingestion metadata only.
    const publishStatus = isFlagged ? "needs_human_review" : "draft";

    // ── v2 phase 1: content_hash_v2 ──────────────────────
    const contentHashV2 = computeContentHashV2({
      subject,
      domain,
      answer_format: format,
      passage_intro: get("passage_intro"),
      passage: get("passage"),
      passage_a: get("passage_a"),
      passage_b: get("passage_b"),
      question_text: get("question_text"),
      choice_a: get("choice_a"),
      choice_b: get("choice_b"),
      choice_c: get("choice_c"),
      choice_d: get("choice_d"),
    });

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
      content_hash_v2: contentHashV2,
      import_status: importStatus,
      import_flag_type: flagType,
      import_flag_reason: flagReason,
      publish_status: publishStatus,
      // Figure URL + alt-text from the extract-figures.mjs stage.
      // Without these, every figure cropped + uploaded to R2 by
      // the pipeline was silently dropped during DB insert — the
      // pre-existing import script was built for the ChatGPT
      // base64-data-URL flow and never handled the R2-URL case.
      image_url: get("image_url") || null,
      image_alt: get("image_alt") || null,
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

    // ── v2 phase 1: seed answer_key_entries ──────────────
    // For now we mirror the printed correct_answer as the selected
    // official answer with status 'printed_key_used_no_correction'.
    // Phase 2 will replace this with correction-aware parsing that
    // detects crossed-out / hand-corrected key pages.
    const correctLetter = get("correct_answer");
    if (correctLetter) {
      const { error: akeErr } = await supabase.from("answer_key_entries").insert({
        question_id: inserted.id,
        printed_answer: correctLetter,
        printed_answer_crossed_out: false,
        manual_correction_present: false,
        selected_official_answer: correctLetter,
        selection_reason: "phase1_seed_from_printed_correct_answer",
        status: "printed_key_used_no_correction",
      });
      if (akeErr) {
        // Non-fatal — log but keep the question. The publish-gate
        // will surface missing answer_key_entries if it cares.
        console.log(`  row ${idx + 2}: answer_key_entries insert failed: ${akeErr.message}`);
      }

      // Also mirror to quiz_questions.selected_official_answer +
      // answer_key_status so the publish-gate can read either source
      // of truth.
      await supabase
        .from("quiz_questions")
        .update({
          selected_official_answer: correctLetter,
          answer_key_status: "printed_key_used_no_correction",
        })
        .eq("id", inserted.id);
    }

    // ── v2 phase 1: register figure as a source_asset ────
    // The image_url column is the runtime view; source_assets is the
    // audit/lineage registry. Phase 4 will add page_image, question_crop,
    // answer_key_crop rows; for now only figure_crop is populated.
    const imageUrl = get("image_url");
    if (imageUrl) {
      const { error: saErr } = await supabase.from("source_assets").insert({
        question_id: inserted.id,
        source_pdf: get("source_pdf") || null,
        page_number: Number.isFinite(sourcePage) ? sourcePage : null,
        asset_type: "figure_crop",
        asset_path: imageUrl,
        public_url: imageUrl,
        crop_complete: true,
        relevance: "required",
        use_in_solving: true,
        validation_status: "imported_from_v1",
      });
      if (saErr) {
        console.log(`  row ${idx + 2}: source_assets insert failed: ${saErr.message}`);
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
  const { count: q } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true });
  const { count: c } = await supabase
    .from("answer_choices")
    .select("id", { count: "exact", head: true });
  console.log(`\nbank now: ${q} questions, ${c} choices`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
