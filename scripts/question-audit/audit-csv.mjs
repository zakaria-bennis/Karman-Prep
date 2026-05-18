// ============================================================
// Phase-1 question auditor — deterministic CSV inspection.
//
// Reads one or two CSVs in the locked 32-column format
// (canonical: CSV_HEADERS in src/lib/question-bank/csv-parser.ts).
// Runs every catchable schema / formatting / cross-field check
// per row and produces:
//
//   ./audit-out/audit-report.md   human-readable, severity-grouped
//   ./audit-out/audit-report.json machine-readable, per-row findings
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/audit-csv.mjs \
//     question-imports/extract-out/202408usv2/questions.csv \
//     [question-imports/extract-out/202408usv2/questions_needs_review.csv]
//
//   # Or run against ALL prod rows from Supabase:
//   node --env-file=.env.local scripts/question-audit/audit-csv.mjs --from-db
//
// SEVERITIES
//   BLOCKING — must be fixed before the row can be shown to a
//              student. Examples: missing answer key, KaTeX
//              syntax error, MC row missing a choice.
//   WARNING  — likely a bug, fix before launch. Examples: very
//              short hint, image_alt that sounds like UI noise,
//              mixed smart/straight quotes.
//   NOTICE   — stylistic or quality concern. Examples: short
//              explanation_text, missing per-choice explanations.
//
// COVERAGE — what this DOES catch
//   · Schema integrity (all 32 cols present, valid enums, valid hash)
//   · Required-field presence (question_text, correct_answer, etc.)
//   · Format-specific shape (MC must have 4 choices, SPR must have 0)
//   · KaTeX delimiter balance + brace balance
//   · Smart/straight quote mixing
//   · Cross-field: figure-implied-but-missing, alt text quality
//   · Cross-field: cross-text passage requires both A and B
//   · Duplicate content_hash within source_pdf
//   · Per-choice distinctness (MC choices must differ)
//
// COVERAGE — what this DOES NOT catch (Phase 2+ work)
//   · Whether the answer is actually correct (LLM grader, Phase 2)
//   · Whether the figure visually matches the question (inspector
//     UI, Phase 3)
//   · Pedagogical quality of explanations (human judgment)
//   · KaTeX that's syntactically OK but renders weirdly
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const FROM_DB = args.includes("--from-db");
const csvPaths = args.filter((a) => !a.startsWith("--"));

if (!FROM_DB && csvPaths.length === 0) {
  console.error("Usage: audit-csv.mjs <csv1> [csv2] | --from-db");
  process.exit(1);
}

// ── Canonical taxonomies (mirror src/data/curriculum + csv-parser.ts) ──
const DOMAIN_TO_CLUSTER = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry & Trigonometry",
  data_analysis: "Problem-Solving & Data Analysis",
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};
const DOMAINS = new Set(Object.keys(DOMAIN_TO_CLUSTER));
const MATH_DOMAINS = new Set(["algebra", "advanced_math", "geometry", "data_analysis"]);

// Lazy-loaded from src/data/curriculum.ts via dynamic import below.
let CONCEPT_SLUGS = new Set();

const CSV_HEADERS = [
  "question_text",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_answer",
  "difficulty",
  "topic_cluster",
  "hint",
  "explanation_text",
  "explanation_a",
  "explanation_b",
  "explanation_c",
  "explanation_d",
  "desmos_strategy",
  "passage_intro",
  "passage",
  "passage_a",
  "passage_b",
  "question_format",
  "numeric_tolerance",
  "domain",
  "concept_slug",
  "answer_source",
  "source_pdf",
  "source_page",
  "content_hash",
  "import_status",
  "import_flag_type",
  "import_flag_reason",
  "image_url",
  "image_alt",
];

// ── CSV parser (matches src/lib/question-bank/csv-parser.ts) ──
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
  const data = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, data };
}

// ── Finding accumulator ──
const findings = [];
function flag(rowIdx, sourceFile, severity, category, code, message, value) {
  findings.push({
    row_idx: rowIdx,
    source_file: sourceFile,
    severity,
    category,
    code,
    message,
    value: value === undefined ? null : String(value).slice(0, 300),
  });
}

// ── Per-row checks ──
// Strict figure-hint pattern. False positives on the previous version
// were dominated by "the graph of $y = f(x)$" where the function is
// given algebraically — no figure required. This pattern requires
// either an explicit visibility cue ("shown above|below|here|in") or
// a noun whose presence strongly implies a visible artifact
// (the figure / the scatterplot / the histogram). "the graph" alone
// is intentionally NOT a match.
const HAS_FIGURE_HINT_RE = new RegExp(
  [
    // Visibility cues
    "\\bshown\\s+(above|below|here|in\\s+the)\\b",
    // Strong nouns that almost always denote a visible artifact
    "\\bthe\\s+(figure|scatterplot|scatter\\s*plot|histogram|box\\s*plot|diagram)\\b",
    // Tables + charts when adjacent to a position cue
    "\\bthe\\s+(table|chart|graph|bar\\s+graph|line\\s+graph)\\s+(shown|above|below|here|preceding)\\b",
    // Coordinate plane with explicit figure reference
    "\\bcoordinate[\\s-]+plane\\s+(figure|graph)\\b",
  ].join("|"),
  "i"
);
const REJECT_ALT_SUBSTRINGS = [
  "answer box",
  "answer input",
  "input field",
  "input box",
  "empty rectangle",
  "blank box",
  "empty input",
  "mark for review",
  "examples",
  "acceptable ways",
  "directions",
  "instructions",
  "reference sheet",
  "formula sheet",
];

function checkRow(rowIdx, sourceFile, r) {
  // ── A. Schema integrity ──
  if (!r.question_text)
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A2_empty_question_text",
      "question_text is empty"
    );
  if (!r.correct_answer)
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A3_empty_correct_answer",
      "correct_answer is empty"
    );
  if (!r.source_pdf)
    flag(rowIdx, sourceFile, "BLOCKING", "schema", "A4_empty_source_pdf", "source_pdf is empty");
  if (!r.source_page || !/^\d+$/.test(r.source_page)) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A5_bad_source_page",
      "source_page not a positive integer",
      r.source_page
    );
  }
  if (!r.content_hash || (r.content_hash !== "TBD" && !/^[0-9a-f]{40}$/i.test(r.content_hash))) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A6_bad_content_hash",
      "content_hash is not a 40-char sha1 (or TBD)",
      r.content_hash
    );
  }
  const diff = parseInt(r.difficulty, 10);
  if (!Number.isInteger(diff) || diff < 1 || diff > 7) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A7_bad_difficulty",
      "difficulty must be integer 1-7",
      r.difficulty
    );
  }
  if (!DOMAINS.has(r.domain)) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A8_bad_domain",
      "domain not in canonical 8",
      r.domain
    );
  }
  if (!CONCEPT_SLUGS.has(r.concept_slug)) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A9_bad_concept_slug",
      "concept_slug not in canonical 89",
      r.concept_slug
    );
  }
  if (
    DOMAIN_TO_CLUSTER[r.domain] &&
    r.topic_cluster &&
    r.topic_cluster !== DOMAIN_TO_CLUSTER[r.domain]
  ) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "schema",
      "A10_cluster_mismatch",
      `topic_cluster '${r.topic_cluster}' doesn't match domain '${r.domain}'`,
      r.topic_cluster
    );
  }
  if (r.import_status && !["ok", "needs_review"].includes(r.import_status)) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A11_bad_import_status",
      "import_status must be ok or needs_review",
      r.import_status
    );
  }
  if (r.import_flag_type && !["", "skip", "partial_emit"].includes(r.import_flag_type)) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "schema",
      "A12_bad_flag_type",
      "import_flag_type must be skip|partial_emit|empty",
      r.import_flag_type
    );
  }
  if (r.answer_source && !["extracted", "inferred", "hand_corrected"].includes(r.answer_source)) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "schema",
      "A13_bad_answer_source",
      "answer_source unrecognized",
      r.answer_source
    );
  }
  const isSpr = r.question_format === "numeric_entry";
  const isMc = r.question_format === "multiple_choice";
  if (!isSpr && !isMc) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "schema",
      "A14_bad_question_format",
      "question_format must be multiple_choice|numeric_entry",
      r.question_format
    );
  }
  if (isMc) {
    if (!/^[A-D]$/.test(r.correct_answer)) {
      flag(
        rowIdx,
        sourceFile,
        "BLOCKING",
        "schema",
        "A15_mc_bad_letter",
        "MC correct_answer must be A|B|C|D",
        r.correct_answer
      );
    }
    for (const c of ["choice_a", "choice_b", "choice_c", "choice_d"]) {
      if (!r[c])
        flag(
          rowIdx,
          sourceFile,
          "BLOCKING",
          "schema",
          "A17_mc_missing_choice",
          `MC row missing ${c}`,
          ""
        );
    }
  } else if (isSpr) {
    for (const c of ["choice_a", "choice_b", "choice_c", "choice_d"]) {
      if (r[c])
        flag(
          rowIdx,
          sourceFile,
          "WARNING",
          "schema",
          "A18_spr_has_choice",
          `SPR row has non-empty ${c}`,
          r[c]
        );
    }
    if (r.correct_answer && !/^[-+]?[0-9./\s$\\\-+*()a-zA-Z^{}]+$/.test(r.correct_answer)) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "schema",
        "A16_spr_bad_answer",
        "SPR correct_answer has suspicious chars",
        r.correct_answer
      );
    }
  }

  // ── B. Formatting / KaTeX ──
  for (const f of [
    "question_text",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "hint",
    "explanation_text",
    "explanation_a",
    "explanation_b",
    "explanation_c",
    "explanation_d",
    "passage",
    "passage_intro",
    "passage_a",
    "passage_b",
  ]) {
    const v = r[f] || "";
    if (!v) continue;
    // Balanced single-$ delimiters: count unescaped $
    const inlineDollars = (v.match(/(^|[^\\])\$/g) || []).length;
    if (inlineDollars % 2 !== 0) {
      flag(
        rowIdx,
        sourceFile,
        "BLOCKING",
        "formatting",
        "B1_unbalanced_dollar",
        `${f}: odd number of $ delimiters`,
        v.slice(0, 80)
      );
    }
    // Balanced curly braces (rough check)
    let open = 0;
    let bad = false;
    for (const c of v) {
      if (c === "{") open++;
      else if (c === "}") {
        if (open === 0) {
          bad = true;
          break;
        }
        open--;
      }
    }
    if (bad || open !== 0) {
      flag(
        rowIdx,
        sourceFile,
        "BLOCKING",
        "formatting",
        "B5_unbalanced_braces",
        `${f}: unbalanced { } braces`,
        v.slice(0, 80)
      );
    }
    // Raw HTML
    if (/<\s*(div|span|p|br|img|table|tr|td|script|style)\b/i.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "formatting",
        "B3_raw_html",
        `${f}: contains raw HTML tag`,
        v.slice(0, 80)
      );
    }
    // Control characters (excluding tab/newline)
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "formatting",
        "B4_control_chars",
        `${f}: contains control chars`,
        ""
      );
    }
    // \frac without arguments
    if (/\\frac(?!\s*\{)/.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "formatting",
        "B5_frac_no_args",
        `${f}: \\frac without {...} arguments`,
        v.slice(0, 80)
      );
    }
    // Smart + straight quote mixing in same field
    const hasSmart = /[“”‘’]/.test(v);
    const hasStraight = /["']/.test(v);
    if (hasSmart && hasStraight) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "formatting",
        "B6_mixed_quotes",
        `${f}: mixed smart and straight quotes`,
        v.slice(0, 80)
      );
    }
  }

  // ── C. Cross-field consistency ──
  // Figure implied but missing
  const qWantsFigure = HAS_FIGURE_HINT_RE.test(r.question_text || "");
  if (qWantsFigure && !r.image_url) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "cross_field",
      "C1_figure_missing",
      "question text references a figure but image_url is empty",
      r.question_text.slice(0, 100)
    );
  }
  // image_url present but alt empty
  if (r.image_url && !r.image_alt) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "cross_field",
      "C3_alt_missing",
      "image_url is set but image_alt is empty"
    );
  }
  // image_alt sounds like UI/instruction noise (stage 3 FP)
  if (r.image_alt) {
    const altLow = r.image_alt.toLowerCase();
    const matched = REJECT_ALT_SUBSTRINGS.find((s) => altLow.includes(s));
    if (matched) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "cross_field",
        "C2_alt_ui_noise",
        `image_alt matches FP substring '${matched}'`,
        r.image_alt
      );
    }
  }
  // image_url malformed
  if (
    r.image_url &&
    !r.image_url.startsWith("https://") &&
    !r.image_url.startsWith("data:image/")
  ) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "cross_field",
      "C2b_bad_url",
      "image_url is neither https nor data URL",
      r.image_url.slice(0, 80)
    );
  }
  // Cross-text passages must come in pairs
  if ((r.passage_a && !r.passage_b) || (r.passage_b && !r.passage_a)) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "cross_field",
      "C4_lone_passage_ab",
      "passage_a/passage_b must both be set or both empty"
    );
  }
  // R&W question without passage
  const isRW = !MATH_DOMAINS.has(r.domain);
  if (
    isRW &&
    !r.passage &&
    !r.passage_a &&
    !r.passage_intro &&
    r.domain !== "conventions" &&
    r.domain !== "expression_ideas"
  ) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "cross_field",
      "C10_rw_no_passage",
      `${r.domain} row has no passage content`,
      ""
    );
  }
  // MC choices distinct
  if (isMc) {
    const cs = [r.choice_a, r.choice_b, r.choice_c, r.choice_d].map((c) =>
      (c || "").trim().toLowerCase()
    );
    const seen = new Map();
    for (let i = 0; i < cs.length; i++) {
      if (!cs[i]) continue;
      if (seen.has(cs[i])) {
        const otherLetter = String.fromCharCode(65 + seen.get(cs[i]));
        const thisLetter = String.fromCharCode(65 + i);
        flag(
          rowIdx,
          sourceFile,
          "BLOCKING",
          "cross_field",
          "C6_duplicate_choices",
          `choice ${thisLetter} duplicates choice ${otherLetter}`,
          cs[i].slice(0, 60)
        );
      } else {
        seen.set(cs[i], i);
      }
    }
    // Correct-answer letter exists as a non-empty choice
    if (/^[A-D]$/.test(r.correct_answer)) {
      const target = r[`choice_${r.correct_answer.toLowerCase()}`];
      if (!target) {
        flag(
          rowIdx,
          sourceFile,
          "BLOCKING",
          "cross_field",
          "C6b_correct_letter_empty",
          `correct_answer=${r.correct_answer} but that choice is empty`
        );
      }
    }
  }
  // explanation_text identical to a per-choice explanation
  if (r.explanation_text) {
    for (const f of ["explanation_a", "explanation_b", "explanation_c", "explanation_d"]) {
      if (r[f] && r[f] === r.explanation_text) {
        flag(
          rowIdx,
          sourceFile,
          "NOTICE",
          "cross_field",
          "C7_explanation_dup",
          `${f} is identical to explanation_text`
        );
        break;
      }
    }
  }
  // Hint reveals answer
  const hintLow = (r.hint || "").toLowerCase();
  if (/\b(the answer is|answer:|choice [a-d]|option [a-d])\b/.test(hintLow)) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "cross_field",
      "C8_hint_reveals_answer",
      "hint reveals the answer",
      r.hint
    );
  }

  // ── D. Quality / heuristic ──
  if (!r.explanation_text) {
    flag(
      rowIdx,
      sourceFile,
      "BLOCKING",
      "quality",
      "D0_no_explanation",
      "explanation_text is empty"
    );
  } else if (r.explanation_text.length < 30) {
    flag(
      rowIdx,
      sourceFile,
      "NOTICE",
      "quality",
      "D1_short_explanation",
      `explanation_text only ${r.explanation_text.length} chars`,
      r.explanation_text
    );
  }
  if (r.hint && r.hint.length < 10) {
    flag(
      rowIdx,
      sourceFile,
      "NOTICE",
      "quality",
      "D2_short_hint",
      `hint only ${r.hint.length} chars`,
      r.hint
    );
  }
  if (r.question_text && r.question_text.length < 20) {
    flag(
      rowIdx,
      sourceFile,
      "WARNING",
      "quality",
      "D4_short_question",
      `question_text only ${r.question_text.length} chars`,
      r.question_text
    );
  }
  if (r.question_text && r.question_text.length > 1500) {
    flag(
      rowIdx,
      sourceFile,
      "NOTICE",
      "quality",
      "D5_long_question",
      `question_text ${r.question_text.length} chars`
    );
  }
  // MC missing per-choice explanations
  if (isMc) {
    const peCount = ["explanation_a", "explanation_b", "explanation_c", "explanation_d"].filter(
      (f) => r[f]
    ).length;
    if (peCount === 0) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "quality",
        "D6_no_per_choice_expl",
        "MC row has 0 per-choice explanations"
      );
    } else if (peCount < 4) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "quality",
        "D7_partial_per_choice_expl",
        `MC row has ${peCount}/4 per-choice explanations`
      );
    }
  }

  // ── F. OCR-corruption heuristics (Pass 6) ──
  // These flag PATTERNS that frequently indicate transcription bugs
  // from the stage 1 OCR / stage 2 LLM extraction pipeline. They are
  // heuristics — some false positives are expected. The Inspector UI
  // and human reviewer ultimately decide.
  checkOcrPatterns(rowIdx, sourceFile, r);
}

// Extract substrings inside paired `$...$` delimiters. Used by the
// OCR-pattern heuristics so we can scrutinize math content without
// false-flagging plain-English uses of digits and letters.
function extractMathRegions(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("$", i);
    if (start === -1) break;
    // Skip $$...$$ display math by matching the second $ if present
    const isDisplay = s[start + 1] === "$";
    const openLen = isDisplay ? 2 : 1;
    const closeNeedle = isDisplay ? "$$" : "$";
    const searchFrom = start + openLen;
    const end = s.indexOf(closeNeedle, searchFrom);
    if (end === -1) break;
    out.push({ start, end, content: s.substring(searchFrom, end) });
    i = end + closeNeedle.length;
  }
  return out;
}

const _CHECK_FIELDS = [
  "question_text",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "hint",
  "explanation_text",
  "explanation_a",
  "explanation_b",
  "explanation_c",
  "explanation_d",
  "passage_intro",
  "passage",
  "passage_a",
  "passage_b",
];

function checkOcrPatterns(rowIdx, sourceFile, r) {
  for (const f of _CHECK_FIELDS) {
    const v = r[f] || "";
    if (!v) continue;

    // F7: Unicode replacement character — encoding error, ALWAYS bad.
    if (/�/.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "BLOCKING",
        "ocr_pattern",
        "F7_replacement_char",
        `${f}: contains Unicode replacement char U+FFFD (encoding error)`,
        v.slice(0, 80)
      );
    }

    // F1: bare letter+digit inside `$...$` regions — likely missing
    // exponent (`x2` should be `x^2`). Restrict to math regions to
    // avoid false-flagging "Step 1", "Type 2", coordinate labels, etc.
    const mathRegions = extractMathRegions(v);
    for (const m of mathRegions) {
      const math = m.content;
      // We want patterns like 'x2', 'y3', 'a4' — letter directly
      // followed by single digit 2-9 — NOT preceded by `^`, `_`,
      // or another digit. Also exclude common safe contexts.
      const re = /(?<![\^_0-9\\])([a-zA-Z])([2-9])(?![0-9])/g;
      let match;
      while ((match = re.exec(math))) {
        const letter = match[1];
        const digit = match[2];
        // Skip common false positives:
        //   · `\d N` units like 'cm2' (cm² acceptable but very
        //     specific — leave it for now; flag if user wants)
        //   · 'x100', 'y10' caught by lookahead already
        //   · 'log2' — exponent NOT meant here, but rare in SAT
        if (
          /^(cm|km|mm|kg|kn|kw|lb)/.test(
            math.substring(Math.max(0, match.index - 1), match.index + 1)
          )
        ) {
          continue;
        }
        flag(
          rowIdx,
          sourceFile,
          "WARNING",
          "ocr_pattern",
          "F1_bare_digit_after_letter",
          `${f}: math contains '${letter}${digit}' (likely missing exponent ^)`,
          math.slice(0, 60)
        );
        // One flag per math region is enough; don't spam
        break;
      }
    }

    // F2: bare `sqrt(...)` — should be `\sqrt{...}` for KaTeX.
    // Avoid matching `\sqrt(` (already escaped).
    if (/(?<!\\)sqrt\s*\(/.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "WARNING",
        "ocr_pattern",
        "F2_sqrt_not_latex",
        `${f}: contains plain 'sqrt(' — should be '\\sqrt{...}' for KaTeX`,
        v.slice(0, 80)
      );
    }

    // F3: Unicode math symbols mixed with LaTeX command equivalents
    // in the same field. Indicates inconsistent encoding pass.
    const hasUni = /[π√≤≥≠÷×∞∑∏∫°]/.test(v);
    const hasLatex = /\\(pi|sqrt|leq|geq|neq|div|times|infty|sum|prod|int)\b/.test(v);
    if (hasUni && hasLatex) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "ocr_pattern",
        "F3_unicode_latex_mix",
        `${f}: mixes Unicode math symbols with \\latex commands`,
        v.slice(0, 80)
      );
    }

    // F4: plain `N/M` outside math mode — likely should be `\frac{N}{M}`
    // or wrapped in `$...$`. Skip dates (1/2/2020).
    let textOutsideMath = v;
    for (const m of mathRegions) textOutsideMath = textOutsideMath.replace(`$${m.content}$`, "");
    const fracMatch = textOutsideMath.match(/(?<!\d)\b(\d{1,3})\/(\d{1,3})(?!\/\d{2})\b/);
    if (fracMatch && !/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(textOutsideMath)) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "ocr_pattern",
        "F4_fraction_outside_math",
        `${f}: contains '${fracMatch[0]}' outside math mode — may need '\\frac' or '$..$'`,
        v.slice(0, 80)
      );
    }

    // F5: question_text doesn't end with sentence terminator —
    // possible truncation by PDF extraction.
    if (f === "question_text") {
      const trimmed = v.trim();
      const lastChar = trimmed.slice(-1);
      if (!".?:".includes(lastChar) && trimmed.length > 20) {
        // Exception: if it ends with `$` (math expression) or a closing
        // brace `}` or a number, that's often legit ("What is x?", "find $f(x)$").
        const last2 = trimmed.slice(-2);
        if (!"$})".includes(lastChar) && !/[\d?]/.test(last2)) {
          flag(
            rowIdx,
            sourceFile,
            "WARNING",
            "ocr_pattern",
            "F5_no_terminal_punct",
            `${f}: ends mid-sentence without . ? : — possible truncation`,
            "..." + trimmed.slice(-60)
          );
        }
      }
    }

    // F6: question contains `___` or `[BLANK]` — verify the blank
    // position makes sense for fill-in conventions/expression questions.
    if (/_{3,}|\[BLANK\]/i.test(v)) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "ocr_pattern",
        "F6_blank_pattern",
        `${f}: contains '___' or '[BLANK]' — verify blank position`,
        v.slice(0, 80)
      );
    }

    // F8: adjacent duplicate words (`the the`, `is is`). OCR
    // sometimes produces these, especially across line breaks.
    // Skip common legitimate doubles: 'had had', 'that that', 'is is'
    // (some are real, but most ARE OCR bugs).
    const dupMatch = v.match(/\b(\w{3,})\s+\1\b/i);
    if (dupMatch) {
      flag(
        rowIdx,
        sourceFile,
        "NOTICE",
        "ocr_pattern",
        "F8_duplicate_word",
        `${f}: adjacent duplicate word '${dupMatch[1]}'`,
        dupMatch[0]
      );
    }
  }
}

// ── Cross-row checks (run after all rows are parsed) ──
function checkDuplicates(allRows) {
  const byKey = new Map();
  for (const { rowIdx, sourceFile, r } of allRows) {
    const key = `${r.source_pdf}|${r.content_hash}`;
    if (key.includes("|") && r.content_hash && r.content_hash !== "TBD") {
      if (byKey.has(key)) {
        const other = byKey.get(key);
        flag(
          rowIdx,
          sourceFile,
          "BLOCKING",
          "duplicate",
          "E1_dup_content_hash",
          `same (source_pdf, content_hash) as row ${other.rowIdx} in ${other.sourceFile}`,
          r.content_hash.slice(0, 12)
        );
      } else {
        byKey.set(key, { rowIdx, sourceFile });
      }
    }
  }
}

// ── Main ──
async function loadConceptSlugs() {
  // Source of truth: src/data/curriculum/{math,reading-writing}.ts.
  // Each node literal carries `concept_slug: "kebab-string"`. We read
  // both files and union the slugs by regex. Avoids tsx so this stays
  // node-only.
  const set = new Set();
  for (const f of ["src/data/curriculum/math.ts", "src/data/curriculum/reading-writing.ts"]) {
    try {
      const text = await readFile(f, "utf-8");
      const matches = text.matchAll(/concept_slug:\s*"([a-z0-9-]+)"/g);
      for (const m of matches) set.add(m[1]);
    } catch {
      /* file missing — partial coverage is fine */
    }
  }
  return set;
}

async function loadFromCsv(filePath) {
  const text = await readFile(filePath, "utf-8");
  const { headers, data } = parseCsv(text);
  if (JSON.stringify(headers) !== JSON.stringify(CSV_HEADERS)) {
    console.warn(`Warning: ${filePath} header doesn't match 32-col canonical:`);
    for (let i = 0; i < Math.max(headers.length, CSV_HEADERS.length); i++) {
      if (headers[i] !== CSV_HEADERS[i]) {
        console.warn(`  col ${i + 1}: csv='${headers[i]}' expected='${CSV_HEADERS[i]}'`);
      }
    }
  }
  return data;
}

async function loadFromDb() {
  // Lazy-import only when needed so the CSV path stays node-only.
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("--from-db needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  }
  const supa = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supa
    .from("quiz_questions")
    .select("*, answer_choices(letter, choice_text)")
    .order("created_at");
  if (error) throw error;
  // Convert DB rows to CSV-shaped objects so the same checks apply.
  // Per-choice explanations live in the `explanation_per_choice` JSONB
  // column on quiz_questions, not on answer_choices.
  return (data ?? []).map((row) => {
    const cs = row.answer_choices || [];
    const lookup = (l) => cs.find((c) => c.letter === l) || {};
    const epc = row.explanation_per_choice || {};
    return {
      question_text: row.question_text ?? "",
      choice_a: lookup("A").choice_text ?? "",
      choice_b: lookup("B").choice_text ?? "",
      choice_c: lookup("C").choice_text ?? "",
      choice_d: lookup("D").choice_text ?? "",
      correct_answer: row.correct_answer ?? "",
      difficulty: String(row.difficulty_level ?? ""),
      topic_cluster: row.topic_cluster ?? "",
      hint: row.hint ?? "",
      explanation_text: row.explanation_text ?? "",
      explanation_a: epc.A ?? "",
      explanation_b: epc.B ?? "",
      explanation_c: epc.C ?? "",
      explanation_d: epc.D ?? "",
      desmos_strategy: row.desmos_strategy ?? "",
      passage_intro: row.passage_intro ?? "",
      passage: row.passage ?? "",
      passage_a: row.passage_a ?? "",
      passage_b: row.passage_b ?? "",
      // DB schema diverges from CSV:
      //   · answer_format (DB) ↔ question_format (CSV)
      //   · difficulty_level (DB 1-4) ↔ difficulty (CSV 1-7); use _level so the
      //     A7 integer range check passes the same way it would on a CSV.
      question_format: row.answer_format ?? "multiple_choice",
      numeric_tolerance: row.numeric_tolerance != null ? String(row.numeric_tolerance) : "",
      domain: row.domain ?? "",
      concept_slug: row.concept_slug ?? "",
      answer_source: row.answer_source ?? "",
      source_pdf: row.source_pdf ?? "",
      source_page: row.source_page != null ? String(row.source_page) : "",
      content_hash: row.content_hash ?? "",
      import_status: row.import_status ?? "ok",
      import_flag_type: row.import_flag_type ?? "",
      import_flag_reason: row.import_flag_reason ?? "",
      image_url: row.image_url ?? "",
      image_alt: row.image_alt ?? "",
    };
  });
}

async function main() {
  CONCEPT_SLUGS = await loadConceptSlugs();
  console.log(`Loaded ${CONCEPT_SLUGS.size} canonical concept slugs.`);

  const allRows = [];
  if (FROM_DB) {
    const dbRows = await loadFromDb();
    console.log(`Loaded ${dbRows.length} rows from quiz_questions table.`);
    dbRows.forEach((r, i) => allRows.push({ rowIdx: i + 1, sourceFile: "DB:quiz_questions", r }));
  } else {
    for (const p of csvPaths) {
      const data = await loadFromCsv(p);
      console.log(`Loaded ${data.length} rows from ${p}`);
      data.forEach((r, i) => allRows.push({ rowIdx: i + 1, sourceFile: p, r }));
    }
  }

  for (const { rowIdx, sourceFile, r } of allRows) checkRow(rowIdx, sourceFile, r);
  checkDuplicates(allRows);

  // ── Output ──
  const outDir = "audit-out";
  await mkdir(outDir, { recursive: true });

  // JSON report
  await writeFile(
    path.join(outDir, "audit-report.json"),
    JSON.stringify(
      {
        inputs: FROM_DB ? ["DB:quiz_questions"] : csvPaths,
        total_rows: allRows.length,
        total_findings: findings.length,
        findings,
      },
      null,
      2
    )
  );

  // Markdown report
  const md = [];
  md.push(`# Question audit report\n`);
  md.push(`**Generated**: ${new Date().toISOString()}\n`);
  md.push(`**Inputs**: ${FROM_DB ? "DB: quiz_questions" : csvPaths.join(", ")}\n`);
  md.push(`**Total rows scanned**: ${allRows.length}\n`);
  md.push(`**Total findings**: ${findings.length}\n\n`);

  // Severity buckets
  const bySev = { BLOCKING: [], WARNING: [], NOTICE: [] };
  for (const f of findings) bySev[f.severity].push(f);

  md.push(`## Severity summary\n`);
  md.push(`| Severity | Count | Unique rows |`);
  md.push(`|---|---|---|`);
  for (const s of ["BLOCKING", "WARNING", "NOTICE"]) {
    const uniq = new Set(bySev[s].map((f) => `${f.source_file}#${f.row_idx}`)).size;
    md.push(`| ${s} | ${bySev[s].length} | ${uniq} |`);
  }
  md.push("");

  // Category breakdown per severity
  for (const sev of ["BLOCKING", "WARNING", "NOTICE"]) {
    if (!bySev[sev].length) continue;
    md.push(`## ${sev}\n`);
    const byCode = {};
    for (const f of bySev[sev]) {
      byCode[f.code] = byCode[f.code] || [];
      byCode[f.code].push(f);
    }
    const sortedCodes = Object.entries(byCode).sort((a, b) => b[1].length - a[1].length);
    for (const [code, items] of sortedCodes) {
      const first = items[0];
      md.push(`### \`${code}\` — ${items.length} rows`);
      md.push(`**Category:** ${first.category}  `);
      md.push(`**Message:** ${first.message}`);
      md.push(``);
      md.push(
        `<details>\n<summary>Show ${Math.min(items.length, 25)} example${items.length === 1 ? "" : "s"}</summary>\n`
      );
      md.push(`| Row | File | Value |`);
      md.push(`|---|---|---|`);
      for (const it of items.slice(0, 25)) {
        const file = it.source_file.split("/").pop();
        const val = (it.value || "").replace(/\|/g, "\\|").replace(/\n/g, " ↵ ");
        md.push(`| ${it.row_idx} | ${file} | \`${val.slice(0, 80)}\` |`);
      }
      if (items.length > 25) md.push(`| … | … | _${items.length - 25} more_ |`);
      md.push(`</details>\n`);
    }
  }

  // Per-row drill-down — rows with multiple flags
  md.push(`## Rows with 3+ flags\n`);
  const byRow = new Map();
  for (const f of findings) {
    const k = `${f.source_file}#${f.row_idx}`;
    byRow.set(k, byRow.get(k) || []);
    byRow.get(k).push(f);
  }
  const dirty = [...byRow.entries()]
    .filter(([, fs]) => fs.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  if (dirty.length === 0) {
    md.push(`_No rows have 3 or more findings._\n`);
  } else {
    for (const [key, fs] of dirty.slice(0, 30)) {
      md.push(`### \`${key}\` — ${fs.length} flags`);
      for (const f of fs) md.push(`- **${f.severity}** \`${f.code}\` — ${f.message}`);
      md.push(``);
    }
    if (dirty.length > 30) md.push(`_... and ${dirty.length - 30} more rows with 3+ flags._\n`);
  }

  await writeFile(path.join(outDir, "audit-report.md"), md.join("\n"));

  // Stdout summary
  console.log("");
  console.log(`Rows scanned: ${allRows.length}`);
  console.log(`Findings    : ${findings.length}`);
  console.log(`  BLOCKING  : ${bySev.BLOCKING.length}`);
  console.log(`  WARNING   : ${bySev.WARNING.length}`);
  console.log(`  NOTICE    : ${bySev.NOTICE.length}`);
  console.log(``);
  console.log(`Reports:`);
  console.log(`  ${path.join(outDir, "audit-report.md")}`);
  console.log(`  ${path.join(outDir, "audit-report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
