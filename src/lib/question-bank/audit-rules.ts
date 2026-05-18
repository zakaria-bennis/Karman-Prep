// ============================================================
// Pure deterministic audit rules — the subset of checks from
// scripts/question-audit/audit-csv.mjs that work on a single row
// without cross-row state.
//
// Importable from both the Node CLI (audit-csv.mjs reads this via
// dynamic import-from-build, but for now duplicates inline) AND
// the Next.js server actions (Inspector "Re-run checks" button).
//
// Stays minimal on purpose — the CLI has ~30 codes total; we
// implement the ~15 most impactful here. The CLI keeps its own
// version for codes that require cross-row context (E1 duplicate
// content_hash) or full-CSV state.
// ============================================================

import { isValidSlug } from "@/lib/question-bank/taxonomy";

export type Severity = "BLOCKING" | "WARNING" | "NOTICE";

export interface RuleFinding {
  code: string;
  severity: Severity;
  category: "schema" | "formatting" | "cross_field" | "quality" | "ocr_pattern";
  message: string;
  value?: string | null;
}

/** Minimal row shape the rules operate on. Pulled from a
 *  quiz_questions row + its answer_choices array — populated by the
 *  caller. Keep the field list tight so the server action only has
 *  to query the columns we actually inspect. */
export interface AuditableRow {
  question_text: string | null;
  correct_answer: string | null;
  answer_format: string | null; // 'multiple_choice' | 'numeric_entry'
  difficulty_level: number | null;
  hint: string | null;
  explanation_text: string | null;
  explanation_per_choice: Record<string, string> | null;
  passage: string | null;
  passage_intro: string | null;
  passage_a: string | null;
  passage_b: string | null;
  domain: string | null;
  concept_slug: string | null;
  image_url: string | null;
  image_alt: string | null;
  numeric_tolerance: number | null;
  choices: { letter: string; choice_text: string; is_correct: boolean }[];
}

// ── Regex helpers (mirror audit-csv.mjs) ─────────────────────
const HAS_FIGURE_HINT_RE = new RegExp(
  [
    "\\bshown\\s+(above|below|here|in\\s+the)\\b",
    "\\bthe\\s+(figure|scatterplot|scatter\\s*plot|histogram|box\\s*plot|diagram)\\b",
    "\\bthe\\s+(table|chart|graph|bar\\s+graph|line\\s+graph)\\s+(shown|above|below|here|preceding)\\b",
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

function extractMathRegions(s: string) {
  const out: { content: string }[] = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("$", i);
    if (start === -1) break;
    const isDisplay = s[start + 1] === "$";
    const openLen = isDisplay ? 2 : 1;
    const closeNeedle = isDisplay ? "$$" : "$";
    const end = s.indexOf(closeNeedle, start + openLen);
    if (end === -1) break;
    out.push({ content: s.substring(start + openLen, end) });
    i = end + closeNeedle.length;
  }
  return out;
}

/** Run every deterministic check on a single row. Returns the
 *  unique findings — duplicates by code on the same row collapse
 *  into one (last-occurrence wins). The caller is responsible for
 *  diffing against existing findings + upserting/resolving. */
export function auditRow(row: AuditableRow): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const push = (f: RuleFinding) => findings.push(f);

  const isSpr = row.answer_format === "numeric_entry";
  const isMc = row.answer_format === "multiple_choice";

  // ── A. Schema-level required fields ───────────────────────
  if (!row.question_text) {
    push({
      code: "A2_empty_question_text",
      severity: "BLOCKING",
      category: "schema",
      message: "question_text is empty",
    });
  }
  if (!row.correct_answer) {
    push({
      code: "A3_empty_correct_answer",
      severity: "BLOCKING",
      category: "schema",
      message: "correct_answer is empty",
    });
  }
  if (row.difficulty_level == null || row.difficulty_level < 1 || row.difficulty_level > 7) {
    push({
      code: "A7_bad_difficulty",
      severity: "BLOCKING",
      category: "schema",
      message: "difficulty_level must be 1-7",
      value: String(row.difficulty_level),
    });
  }
  if (row.concept_slug && !isValidSlug(row.concept_slug)) {
    push({
      code: "A9_bad_concept_slug",
      severity: "BLOCKING",
      category: "schema",
      message: "concept_slug not in canonical 89",
      value: row.concept_slug,
    });
  }

  // MC: 4 choices required, all distinct
  if (isMc) {
    if (!/^[A-D]$/.test(row.correct_answer ?? "")) {
      push({
        code: "A15_mc_bad_letter",
        severity: "BLOCKING",
        category: "schema",
        message: "MC correct_answer must be A|B|C|D",
        value: row.correct_answer ?? "",
      });
    }
    const choiceTexts = row.choices.map((c) => c.choice_text.trim());
    if (choiceTexts.some((t) => !t)) {
      push({
        code: "A17_mc_missing_choice",
        severity: "BLOCKING",
        category: "schema",
        message: "MC row missing one or more choice texts",
      });
    }
    const dup = new Set<string>();
    for (const t of choiceTexts) {
      if (t && dup.has(t.toLowerCase())) {
        push({
          code: "C6_duplicate_choices",
          severity: "BLOCKING",
          category: "cross_field",
          message: "two or more MC choices have identical text",
          value: t.slice(0, 60),
        });
        break;
      }
      if (t) dup.add(t.toLowerCase());
    }
    // Verify the correct-letter has a non-empty choice
    const target = row.choices.find((c) => c.letter === row.correct_answer);
    if (target && !target.choice_text.trim()) {
      push({
        code: "C6b_correct_letter_empty",
        severity: "BLOCKING",
        category: "cross_field",
        message: `correct_answer=${row.correct_answer} but that choice is empty`,
      });
    }
  } else if (isSpr) {
    if (row.choices.some((c) => c.choice_text.trim() !== "")) {
      push({
        code: "A18_spr_has_choice",
        severity: "WARNING",
        category: "schema",
        message: "SPR row has non-empty choice text",
      });
    }
  }

  // ── B. Formatting / KaTeX ──────────────────────────────────
  const textFields: Array<[string, string | null]> = [
    ["question_text", row.question_text],
    ["hint", row.hint],
    ["explanation_text", row.explanation_text],
    ["passage", row.passage],
    ["passage_intro", row.passage_intro],
    ["passage_a", row.passage_a],
    ["passage_b", row.passage_b],
    ...row.choices.map(
      (c) => [`choice_${c.letter.toLowerCase()}`, c.choice_text] as [string, string | null]
    ),
  ];
  for (const [name, v] of textFields) {
    if (!v) continue;
    // Balanced $ delimiters
    const inlineDollars = (v.match(/(^|[^\\])\$/g) || []).length;
    if (inlineDollars % 2 !== 0) {
      push({
        code: "B1_unbalanced_dollar",
        severity: "BLOCKING",
        category: "formatting",
        message: `${name}: odd number of $ delimiters`,
        value: v.slice(0, 80),
      });
    }
    // Balanced braces
    let depth = 0;
    let braceFail = false;
    for (const c of v) {
      if (c === "{") depth++;
      else if (c === "}") {
        if (depth === 0) {
          braceFail = true;
          break;
        }
        depth--;
      }
    }
    if (braceFail || depth !== 0) {
      push({
        code: "B5_unbalanced_braces",
        severity: "BLOCKING",
        category: "formatting",
        message: `${name}: unbalanced { } braces`,
        value: v.slice(0, 80),
      });
    }
  }

  // ── C. Cross-field: figure implied but missing ───────────
  if (row.question_text && HAS_FIGURE_HINT_RE.test(row.question_text) && !row.image_url) {
    push({
      code: "C1_figure_missing",
      severity: "BLOCKING",
      category: "cross_field",
      message: "question text references a figure but image_url is empty",
      value: row.question_text.slice(0, 100),
    });
  }
  // image_alt sounds like UI noise
  if (row.image_alt) {
    const altLow = row.image_alt.toLowerCase();
    const hit = REJECT_ALT_SUBSTRINGS.find((s) => altLow.includes(s));
    if (hit) {
      push({
        code: "C2_alt_ui_noise",
        severity: "WARNING",
        category: "cross_field",
        message: `image_alt mentions UI/instruction phrase '${hit}'`,
        value: row.image_alt,
      });
    }
  }
  // Cross-text passages must come in pairs
  if ((row.passage_a && !row.passage_b) || (row.passage_b && !row.passage_a)) {
    push({
      code: "C4_lone_passage_ab",
      severity: "BLOCKING",
      category: "cross_field",
      message: "passage_a/passage_b must both be set or both empty",
    });
  }

  // ── D. Quality heuristics ──────────────────────────────────
  if (!row.explanation_text) {
    push({
      code: "D0_no_explanation",
      severity: "BLOCKING",
      category: "quality",
      message: "explanation_text is empty",
    });
  } else if (row.explanation_text.length < 30) {
    push({
      code: "D1_short_explanation",
      severity: "NOTICE",
      category: "quality",
      message: `explanation_text only ${row.explanation_text.length} chars`,
    });
  }
  if (isMc) {
    const epc = row.explanation_per_choice ?? {};
    const peCount = ["A", "B", "C", "D"].filter((l) => (epc[l] ?? "").trim()).length;
    if (peCount === 0) {
      push({
        code: "D6_no_per_choice_expl",
        severity: "NOTICE",
        category: "quality",
        message: "MC row has 0 per-choice explanations",
      });
    } else if (peCount < 4) {
      push({
        code: "D7_partial_per_choice_expl",
        severity: "NOTICE",
        category: "quality",
        message: `MC row has ${peCount}/4 per-choice explanations`,
      });
    }
  }

  // ── F. OCR patterns ───────────────────────────────────────
  for (const [name, v] of textFields) {
    if (!v) continue;
    // F1: bare letter+digit inside $...$ — likely missing exponent
    const mathRegions = extractMathRegions(v);
    let f1Hit = false;
    for (const region of mathRegions) {
      const re = /(?<![\^_0-9\\])([a-zA-Z])([2-9])(?![0-9])/g;
      if (re.test(region.content)) {
        f1Hit = true;
        break;
      }
    }
    if (f1Hit) {
      push({
        code: "F1_bare_digit_after_letter",
        severity: "WARNING",
        category: "ocr_pattern",
        message: `${name}: math expression has bare letter+digit (likely missing exponent)`,
        value: v.slice(0, 80),
      });
    }
    // F5: question_text ending mid-sentence
    if (name === "question_text") {
      const trimmed = v.trim();
      if (trimmed.length > 20) {
        const lastChar = trimmed.slice(-1);
        if (!".?:".includes(lastChar) && !"$})".includes(lastChar) && !/\d/.test(lastChar)) {
          push({
            code: "F5_no_terminal_punct",
            severity: "WARNING",
            category: "ocr_pattern",
            message: `${name}: ends mid-sentence without . ? :`,
            value: "..." + trimmed.slice(-60),
          });
        }
      }
    }
    // F7: Unicode replacement character
    if (/�/.test(v)) {
      push({
        code: "F7_replacement_char",
        severity: "BLOCKING",
        category: "ocr_pattern",
        message: `${name}: contains U+FFFD replacement char (encoding error)`,
      });
    }
  }

  // Dedupe by code (keep first)
  const seen = new Set<string>();
  return findings.filter((f) => {
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });
}
