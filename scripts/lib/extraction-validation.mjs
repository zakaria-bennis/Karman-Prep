// Post-extraction validation for the Stage 1 question extractor.
//
// Kimi K2.5 via Moonshot runs in JSON-object mode, which guarantees a
// syntactically valid JSON object but NOT enum/schema/taxonomy
// compliance. So we validate every extracted row in code here, after
// the call. This module is pure + unit-tested (extraction-validation.test.ts)
// and is imported by extract-with-gemini.mjs.
//
// Design rules (from the Stage 1 spec):
//   · NEVER fabricate, delete, or silently rewrite question rows.
//   · Compute a full report (counts + per-row issues + aggregate warnings).
//   · Mark a row needs_review ONLY when the issue maps obviously to that
//     row (invalid enum/slug, malformed choices, missing answer, etc.).
//     Aggregate problems (missing question numbers, low totals) are
//     surfaced as warnings for a human, not silent row mutations.
//
// Floors / expected counts are shared with the existing under-extraction
// guard so the two stay consistent.

import {
  DOMAINS,
  TOPIC_CLUSTERS,
  CONCEPT_SLUG_VALUES,
  ANSWER_FORMATS,
  CLUSTER_BY_DOMAIN,
} from "./taxonomy.generated.mjs";
import { FLOORS, EXPECTED, MATH_DOMAINS } from "./extraction-coverage.mjs";

// Fixed enums not part of the curriculum taxonomy. Keep in sync with the
// Stage 1 system prompt + the responseSchema in extract-with-gemini.mjs.
export const ANSWER_SOURCES = Object.freeze(["extracted", "inferred", "hand_corrected"]);
export const IMPORT_STATUSES = Object.freeze(["ok", "needs_review"]);

// Per-module expected question counts (digital SAT). Used only to surface
// "obvious missing question numbers" — never to fabricate rows.
const EXPECTED_PER_MODULE = Object.freeze({ reading_writing: 27, math: 22 });

const DOMAIN_SET = new Set(DOMAINS);
const CLUSTER_SET = new Set(TOPIC_CLUSTERS);
const SLUG_SET = new Set(CONCEPT_SLUG_VALUES);
const FORMAT_SET = new Set(ANSWER_FORMATS);
const ANSWER_SOURCE_SET = new Set(ANSWER_SOURCES);
const IMPORT_STATUS_SET = new Set(IMPORT_STATUSES);

const isBlank = (v) => v == null || (typeof v === "string" && v.trim() === "");
const moduleKey = (r) => `${r?.section ?? "?"}|${r?.module_number ?? "?"}`;

/**
 * Normalize topic_cluster from domain BEFORE validation. topic_cluster is
 * 1:1 with domain (CLUSTER_BY_DOMAIN), so it is fully derivable — we don't
 * trust the model for it (Kimi occasionally emits granular skill names
 * like "Vocabulary in Context" instead of one of the 8 canonical
 * clusters). For each row with a valid domain, overwrite topic_cluster
 * with the canonical value. Rows with an invalid domain are left untouched
 * so the validator still flags them. Mutates in place; returns the count
 * changed.
 *
 * @param {any[]} rows
 * @returns {number}
 */
export function deriveTopicClusters(rows) {
  if (!Array.isArray(rows)) return 0;
  let changed = 0;
  for (const r of rows) {
    const derived = CLUSTER_BY_DOMAIN[r?.domain];
    if (derived && r.topic_cluster !== derived) {
      r.topic_cluster = derived;
      changed++;
    }
  }
  return changed;
}

/**
 * @typedef {Object} ValidationReport
 * @property {{ total_questions: number, rw_count: number, math_count: number, multiple_choice_count: number, numeric_entry_count: number, module_counts: Record<string, number> }} metrics
 * @property {Record<string, any>} issues
 * @property {string[]} warnings
 * @property {{ index: number, reasons: string[] }[]} rowsToFlag
 */

/**
 * Validate an array of Stage 1 question rows. Pure: same input → same
 * report.
 *
 * - metrics: counts the operator wants at a glance.
 * - issues: row-level problems, each entry carrying the row index.
 * - warnings: aggregate, human-readable strings (low counts, missing
 *   question numbers, non-sequential order).
 * - rowsToFlag: [{ index, reasons[] }] — rows whose problems map obviously
 *   to that row, so flagging them needs_review is safe.
 *
 * @param {any[]} rows
 * @returns {ValidationReport}
 */
export function validateExtraction(rows) {
  const list = Array.isArray(rows) ? rows : [];

  // ── metrics ──────────────────────────────────────────────────────
  const moduleCounts = {};
  let rwCount = 0;
  let mathCount = 0;
  let mcCount = 0;
  let neCount = 0;
  for (const r of list) {
    moduleCounts[moduleKey(r)] = (moduleCounts[moduleKey(r)] ?? 0) + 1;
    if (r?.section === "math") mathCount++;
    else if (r?.section === "reading_writing") rwCount++;
    if (r?.question_format === "multiple_choice") mcCount++;
    else if (r?.question_format === "numeric_entry") neCount++;
  }
  const metrics = {
    total_questions: list.length,
    rw_count: rwCount,
    math_count: mathCount,
    multiple_choice_count: mcCount,
    numeric_entry_count: neCount,
    module_counts: moduleCounts,
  };

  // ── per-row issues + row flags ───────────────────────────────────
  const issues = {
    invalid_domains: [],
    invalid_topic_clusters: [],
    invalid_concept_slugs: [],
    invalid_question_formats: [],
    invalid_answer_sources: [],
    invalid_import_statuses: [],
    missing_choices_for_multiple_choice: [],
    choices_present_for_numeric_entry: [],
    empty_rw_passage: [],
    math_passage_not_empty: [],
    passage_duplicated_in_question_text: [],
    missing_correct_answer: [],
    invalid_source_page: [],
    question_number_visible_mismatch: [],
    section_domain_mismatch: [],
  };
  const flagMap = new Map(); // index -> Set(reasons)
  const flag = (index, reason) => {
    if (!flagMap.has(index)) flagMap.set(index, new Set());
    flagMap.get(index).add(reason);
  };

  list.forEach((r, i) => {
    const entry = (extra = {}) => ({ index: i, extraction_order: r?.extraction_order, ...extra });

    if (!DOMAIN_SET.has(r?.domain)) {
      issues.invalid_domains.push(entry({ value: r?.domain }));
      flag(i, "invalid_domain");
    }
    if (!CLUSTER_SET.has(r?.topic_cluster)) {
      issues.invalid_topic_clusters.push(entry({ value: r?.topic_cluster }));
      flag(i, "invalid_topic_cluster");
    }
    if (!SLUG_SET.has(r?.concept_slug)) {
      issues.invalid_concept_slugs.push(entry({ value: r?.concept_slug }));
      flag(i, "invalid_concept_slug");
    }
    if (!FORMAT_SET.has(r?.question_format)) {
      issues.invalid_question_formats.push(entry({ value: r?.question_format }));
      flag(i, "invalid_question_format");
    }
    if (!ANSWER_SOURCE_SET.has(r?.answer_source)) {
      issues.invalid_answer_sources.push(entry({ value: r?.answer_source }));
      flag(i, "invalid_answer_source");
    }
    if (!IMPORT_STATUS_SET.has(r?.import_status)) {
      issues.invalid_import_statuses.push(entry({ value: r?.import_status }));
      flag(i, "invalid_import_status");
    }

    if (r?.question_format === "multiple_choice") {
      if (["choice_a", "choice_b", "choice_c", "choice_d"].some((c) => isBlank(r?.[c]))) {
        issues.missing_choices_for_multiple_choice.push(entry());
        flag(i, "missing_choices_for_multiple_choice");
      }
    }
    if (r?.question_format === "numeric_entry") {
      if (["choice_a", "choice_b", "choice_c", "choice_d"].some((c) => !isBlank(r?.[c]))) {
        issues.choices_present_for_numeric_entry.push(entry());
        flag(i, "choices_present_for_numeric_entry");
      }
    }

    if (r?.section === "reading_writing") {
      if (isBlank(r?.passage) && isBlank(r?.passage_a) && isBlank(r?.passage_b)) {
        issues.empty_rw_passage.push(entry());
        flag(i, "empty_rw_passage");
      }
    }
    if (r?.section === "math") {
      if (
        !isBlank(r?.passage) ||
        !isBlank(r?.passage_intro) ||
        !isBlank(r?.passage_a) ||
        !isBlank(r?.passage_b)
      ) {
        issues.math_passage_not_empty.push(entry());
        flag(i, "math_passage_not_empty");
      }
    }

    if (!isBlank(r?.passage) && !isBlank(r?.question_text)) {
      const p = r.passage.trim();
      const q = r.question_text.trim();
      if (q.includes(p) || (p.length >= 40 && q.includes(p.slice(0, 40)))) {
        issues.passage_duplicated_in_question_text.push(entry());
        flag(i, "passage_duplicated_in_question_text");
      }
    }

    if (isBlank(r?.correct_answer)) {
      issues.missing_correct_answer.push(entry());
      flag(i, "missing_correct_answer");
    }

    if (!Number.isInteger(r?.source_page) || r.source_page < 1) {
      issues.invalid_source_page.push(entry({ value: r?.source_page }));
      flag(i, "invalid_source_page");
    }

    // question_number is the per-module visible number — it must match
    // question_number_visible. A mismatch means the model used a global
    // running count instead of restarting at 1 per module.
    if (Number.isInteger(r?.question_number) && typeof r?.question_number_visible === "string") {
      const visible = Number(r.question_number_visible.trim());
      if (Number.isInteger(visible) && visible !== r.question_number) {
        issues.question_number_visible_mismatch.push(
          entry({
            question_number: r.question_number,
            question_number_visible: r.question_number_visible,
          })
        );
        flag(i, "question_number_visible_mismatch");
      }
    }

    // section must match the domain's subject: R&W domains belong to R&W
    // sections, math domains to math sections. Catches e.g. an R&W
    // command-of-evidence question ("uses data from the table") mislabeled
    // domain=data_analysis (a math domain). The correct domain is not
    // derivable, so flag for human review rather than rewrite.
    if (DOMAIN_SET.has(r?.domain) && (r?.section === "math" || r?.section === "reading_writing")) {
      const expectedSection = MATH_DOMAINS.has(r.domain) ? "math" : "reading_writing";
      if (r.section !== expectedSection) {
        issues.section_domain_mismatch.push(
          entry({ section: r.section, domain: r.domain, expected_section: expectedSection })
        );
        flag(i, "section_domain_mismatch");
      }
    }
  });

  // ── aggregate: question-number coverage per section/module ───────
  const missingByModule = {};
  const duplicateByModule = {};
  const byModule = {};
  list.forEach((r) => {
    (byModule[moduleKey(r)] ??= []).push(r?.question_number);
  });
  for (const [key, numbers] of Object.entries(byModule)) {
    const section = key.split("|")[0];
    const present = numbers.filter((n) => Number.isInteger(n));
    const counts = present.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map());
    const dups = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);
    if (dups.length) duplicateByModule[key] = dups.sort((a, b) => a - b);
    const expected = EXPECTED_PER_MODULE[section] ?? 0;
    const ceiling = Math.max(expected, present.length ? Math.max(...present) : 0);
    const missing = [];
    for (let n = 1; n <= ceiling; n++) if (!counts.has(n)) missing.push(n);
    if (missing.length) missingByModule[key] = missing;
  }
  issues.missing_question_numbers_by_section_module = missingByModule;
  issues.duplicate_question_numbers_by_section_module = duplicateByModule;

  // ── aggregate warnings (human-readable) ──────────────────────────
  const warnings = [];
  if (metrics.total_questions < FLOORS.total)
    warnings.push(
      `total=${metrics.total_questions} < ${FLOORS.total} (expected ~${EXPECTED.total}, missing ${EXPECTED.total - metrics.total_questions})`
    );
  if (metrics.rw_count < FLOORS.rw)
    warnings.push(`rw=${metrics.rw_count} < ${FLOORS.rw} (expected ~${EXPECTED.rw})`);
  if (metrics.math_count < FLOORS.math)
    warnings.push(`math=${metrics.math_count} < ${FLOORS.math} (expected ~${EXPECTED.math})`);
  if (metrics.numeric_entry_count === 0)
    warnings.push(
      "numeric_entry_count = 0 (re-check Math modules — SAT math has student-produced responses)"
    );
  for (const [key, count] of Object.entries(moduleCounts))
    if (count === 0) warnings.push(`module ${key} has 0 questions`);
  for (const [key, missing] of Object.entries(missingByModule))
    warnings.push(`module ${key} missing question numbers: ${missing.join(", ")}`);

  // extraction_order should be a unique 1..N sequence
  const orders = list.map((r) => r?.extraction_order);
  const allInts = orders.every((n) => Number.isInteger(n));
  const sorted = [...orders].sort((a, b) => a - b);
  const sequential = allInts && sorted.every((n, i) => n === i + 1);
  if (list.length && !sequential)
    warnings.push(
      `extraction_order is not a unique 1..${list.length} sequence (got min=${sorted[0]}, max=${sorted[sorted.length - 1]})`
    );

  // ── rows to flag ─────────────────────────────────────────────────
  const rowsToFlag = [...flagMap.entries()]
    .map(([index, reasons]) => ({ index, reasons: [...reasons] }))
    .sort((a, b) => a.index - b.index);

  return { metrics, issues, warnings, rowsToFlag };
}

/**
 * Apply the report's row flags: set import_status = "needs_review" and
 * append the machine reasons to import_flag_reason, preserving any reason
 * the model already supplied. Mutates rows in place; returns the count
 * newly flagged. Never deletes or fabricates.
 */
export function flagRowsNeedingReview(rows, report) {
  if (!Array.isArray(rows) || !report?.rowsToFlag) return 0;
  let flagged = 0;
  for (const { index, reasons } of report.rowsToFlag) {
    const row = rows[index];
    if (!row) continue;
    const already = row.import_status === "needs_review";
    const tag = `validation:${reasons.join(",")}`;
    const existing = isBlank(row.import_flag_reason) ? "" : `${row.import_flag_reason.trim()}; `;
    row.import_status = "needs_review";
    row.import_flag_reason = `${existing}${tag}`;
    if (!already) flagged++;
  }
  return flagged;
}

/** Render a compact, operator-facing summary of a validation report. */
export function formatValidationReport(report) {
  const { metrics, issues, warnings, rowsToFlag } = report;
  const lines = [];
  lines.push(
    `counts: total=${metrics.total_questions} rw=${metrics.rw_count} math=${metrics.math_count} ` +
      `mc=${metrics.multiple_choice_count} numeric=${metrics.numeric_entry_count}`
  );
  lines.push(
    `modules: ${Object.entries(metrics.module_counts)
      .map(([k, v]) => `${k}=${v}`)
      .join("  ")}`
  );
  const issueCounts = Object.entries(issues)
    .filter(([, v]) => (Array.isArray(v) ? v.length : Object.keys(v).length) > 0)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.length : Object.keys(v).length}`);
  lines.push(issueCounts.length ? `issues: ${issueCounts.join("  ")}` : "issues: none");
  if (warnings.length) {
    lines.push("warnings:");
    for (const w of warnings) lines.push(`  · ${w}`);
  }
  lines.push(`rows to flag needs_review: ${rowsToFlag.length}`);
  return lines.join("\n");
}
