"use client";

// ============================================================
// BulkImportPanel — CSV/JSON upload with preview + confirm.
//
// Accepts both the legacy 15-column template AND the 30-column
// routine output (PDF-ingestion routine). Header detection is
// substring-based — any column the row doesn't have just stays
// undefined and the importer applies sensible defaults.
//
// Rendered per-node from /admin/curriculum/[nodeId]; for the
// top-level bank import (PDF-routine flow) see BankImportPanel.
// ============================================================

import { useRef, useState } from "react";
import { Upload, Download, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subject } from "@/data/curriculum";
import {
  actionBulkImport,
  type BulkImportRow,
  type BulkImportResult,
} from "@/app/admin/actions";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
}

// 30 columns in exact spec §2 order — used for both the template
// download and as the canonical header set.
export const CSV_HEADERS = [
  "question_text",
  "choice_a", "choice_b", "choice_c", "choice_d",
  "correct_answer", "difficulty", "topic_cluster",
  "hint", "explanation_text",
  "explanation_a", "explanation_b", "explanation_c", "explanation_d",
  "desmos_strategy",
  "passage_intro", "passage", "passage_a", "passage_b",
  "question_format", "numeric_tolerance",
  "domain", "concept_slug", "answer_source",
  "source_pdf", "source_page", "content_hash",
  "import_status", "import_flag_type", "import_flag_reason",
] as const;

function buildCsvTemplate(topicCluster: string): string {
  // Sample row: a foundational MC algebra question with full
  // distractor explanations and the new ingestion fields populated.
  // Per-node uploads can leave the ingestion columns blank.
  return [
    CSV_HEADERS.join(","),
    [
      '"If 3x + 5 = 26, what is the value of x?"',
      '"5"', '"6"', '"7"', '"8"',
      "C", "2", `"${topicCluster}"`,
      '"Start by isolating the variable term."',
      '"Subtract 5 from both sides to get 3x = 21, then divide by 3 to find x = 7."',
      '"5 results from forgetting to subtract 5 first."',
      '"6 is a small arithmetic slip."',
      '"Correct — x = 7."',
      '"8 results from dividing 24 by 3 instead of 21."',
      '"Type 3x+5=26 into Desmos and read the intersection."',
      "", "", "", "",
      "multiple_choice", "",
      "algebra", "linear-equations", "extracted",
      "", "", "",
      "ok", "", "",
    ].join(","),
  ].join("\n");
}

// Minimal CSV parser — handles quoted fields with commas, doubled
// quotes inside quoted fields ("" → "), CRLF line endings, blank
// lines, and trailing whitespace per cell.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
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
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

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
    question_format:
      r.question_format === "numeric_entry" ? "numeric_entry" : "multiple_choice",
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
    import_status: r.import_status === "needs_review" ? "needs_review" : r.import_status === "ok" ? "ok" : undefined,
    import_flag_type:
      r.import_flag_type === "skip" || r.import_flag_type === "partial_emit"
        ? r.import_flag_type
        : undefined,
    import_flag_reason: r.import_flag_reason || undefined,
  }));
}

export default function BulkImportPanel({ nodeId, subject, topicCluster }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    const text = await file.text();
    try {
      let rows: BulkImportRow[];
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("JSON must be an array of question objects");
        rows = data as BulkImportRow[];
      } else {
        rows = toBulkRows(parseCsv(text));
      }
      if (rows.length === 0) throw new Error("No rows found");
      setPreview(rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse error");
      setPreview(null);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setImporting(true);
    try {
      const r = await actionBulkImport(nodeId, subject, preview);
      setResult(r);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([buildCsvTemplate(topicCluster)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nodeId}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Bulk import</h3>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <Download className="w-3.5 h-3.5" /> CSV template
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Upload a CSV or JSON file. Accepts the legacy 15-column template AND
        the 30-column routine template (PDF-ingestion output). Required:
        <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded mx-1">question_text</code>,
        <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded mx-1">correct_answer</code>,
        <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded mx-1">explanation_text</code>.
        Choices are required for multiple-choice rows; SPR rows leave them blank
        and set <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded mx-0.5">question_format=numeric_entry</code>.
      </p>

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold hover:bg-slate-700"
        >
          <Upload className="w-3.5 h-3.5" /> Choose file
        </button>
        {preview && (
          <span className="text-xs text-slate-500">{preview.length} rows parsed</span>
        )}
      </div>

      {parseError && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" /> {parseError}
        </div>
      )}

      {result && <ImportResultBanner result={result} />}

      {preview && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview</h4>
          <div className="rounded-lg border border-slate-800 max-h-80 overflow-y-auto text-xs">
            <table className="w-full">
              <thead className="bg-slate-800 sticky top-0 text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Question</th>
                  <th className="text-left px-3 py-2 font-semibold">Difficulty</th>
                  <th className="text-left px-3 py-2 font-semibold">Correct</th>
                  <th className="text-left px-3 py-2 font-semibold">Slug</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-200 truncate max-w-[24rem]">{r.question_text}</td>
                    <td className="px-3 py-2 text-slate-500">{r.difficulty}</td>
                    <td className="px-3 py-2 text-slate-500">{r.correct_answer}</td>
                    <td className="px-3 py-2 text-slate-500">{r.concept_slug ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                          r.import_status === "needs_review"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        )}
                      >
                        {r.import_status ?? "ok"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-indigo-500",
                importing ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-400"
              )}
            >
              {importing ? "Importing…" : `Import ${preview.length} questions`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ImportResultBanner({ result }: { result: BulkImportResult }) {
  const total =
    result.inserted + result.skipped_duplicates + result.flagged_for_review + result.errored;
  return (
    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
      <div className="flex items-center gap-2 font-semibold">
        <Check className="w-3.5 h-3.5" /> Imported {total} rows
      </div>
      <ul className="mt-1.5 space-y-0.5 text-emerald-200/80">
        <li>· {result.inserted} live</li>
        <li>· {result.flagged_for_review} flagged for review</li>
        <li>· {result.skipped_duplicates} skipped (duplicate)</li>
        {result.errored > 0 && (
          <li className="text-rose-300">· {result.errored} errored</li>
        )}
      </ul>
      {result.errors.length > 0 && (
        <details className="mt-2 cursor-pointer text-rose-300">
          <summary className="font-semibold">Show {result.errors.length} error{result.errors.length === 1 ? "" : "s"}</summary>
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {result.errors.map((e, i) => (
              <li key={i}>row {e.row}: {e.message}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
