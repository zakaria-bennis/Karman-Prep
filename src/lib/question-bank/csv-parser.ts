// ============================================================
// Shared CSV parser for the bulk-import flow.
//
// Audit #9 fix: previously this code lived twice — once inside
// `src/components/admin/BulkImportPanel.tsx` (a "use client" file)
// and once inline inside `src/app/api/cron/ingest-csv-inbox/route.ts`.
// Either fork could drift without the other; importing from a
// "use client" file into a server route also wasn't ideal even when
// the symbols were just data utilities.
//
// Both call sites now import from here. Edit the format once.
// ============================================================

import type { BulkImportRow } from "./bulk-import";

/** Canonical CSV header list, in column order. Both the admin
 *  template-download button and the cron-side parser rely on this
 *  order so a future column addition only needs editing here. */
export const CSV_HEADERS = [
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
] as const;

/** Minimal CSV parser. Handles quoted fields with commas, doubled
 *  quotes inside quoted fields (`""` → `"`), CRLF line endings,
 *  blank lines, and trailing whitespace per cell. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
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
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

/** Map a header-keyed object record (as produced by parseCsv) onto
 *  the typed BulkImportRow shape, applying defaults + enum coercion. */
export function toBulkRows(parsed: Record<string, string>[]): BulkImportRow[] {
  return parsed.map((r) => ({
    question_text: r.question_text ?? "",
    choice_a: r.choice_a || undefined,
    choice_b: r.choice_b || undefined,
    choice_c: r.choice_c || undefined,
    choice_d: r.choice_d || undefined,
    correct_answer: (r.correct_answer ?? "").toUpperCase().trim() || (r.correct_answer ?? ""),
    difficulty: r.difficulty || "4",
    topic_cluster: r.topic_cluster || undefined,
    hint: r.hint || undefined,
    explanation_text: r.explanation_text ?? "",
    explanation_a: r.explanation_a || undefined,
    explanation_b: r.explanation_b || undefined,
    explanation_c: r.explanation_c || undefined,
    explanation_d: r.explanation_d || undefined,
    desmos_strategy: r.desmos_strategy || undefined,
    passage_intro: r.passage_intro || undefined,
    passage: r.passage || undefined,
    passage_a: r.passage_a || undefined,
    passage_b: r.passage_b || undefined,
    question_format: r.question_format === "numeric_entry" ? "numeric_entry" : "multiple_choice",
    numeric_tolerance: r.numeric_tolerance || undefined,
    domain: r.domain || undefined,
    concept_slug: r.concept_slug || undefined,
    answer_source:
      r.answer_source === "inferred" || r.answer_source === "hand_corrected"
        ? r.answer_source
        : r.answer_source === "extracted"
          ? "extracted"
          : undefined,
    source_pdf: r.source_pdf || undefined,
    source_page: r.source_page || undefined,
    content_hash: r.content_hash || undefined,
    import_status:
      r.import_status === "needs_review"
        ? "needs_review"
        : r.import_status === "ok"
          ? "ok"
          : undefined,
    import_flag_type:
      r.import_flag_type === "skip" || r.import_flag_type === "partial_emit"
        ? r.import_flag_type
        : undefined,
    import_flag_reason: r.import_flag_reason || undefined,
    image_url: r.image_url || undefined,
    image_alt: r.image_alt || undefined,
  }));
}
