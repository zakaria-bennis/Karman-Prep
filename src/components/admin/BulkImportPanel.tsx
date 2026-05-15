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
import { actionBulkImport, type BulkImportRow, type BulkImportResult } from "@/app/admin/actions";
import {
  CSV_HEADERS as SHARED_CSV_HEADERS,
  parseCsv as sharedParseCsv,
  toBulkRows as sharedToBulkRows,
} from "@/lib/question-bank/csv-parser";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
}

// 32 columns in exact spec §2 order — used for both the template
// download and as the canonical header set.
//
// image_url accepts BOTH a regular URL and a base64 data URL
// (data:image/png;base64,...). When the bulk importer sees a data
// URL, it decodes the bytes, uploads them to R2, and replaces the
// cell with the resulting public R2 URL before insert. That keeps
// the "single CSV in, single CSV upload" workflow intact for the
// Custom-GPT pipeline that inlines figures into the file.
// Re-exported from src/lib/question-bank/csv-parser.ts so existing
// callers (admin actions, template generator) continue to import
// from here without churn while the single source of truth lives
// in the shared module (audit #9).
export const CSV_HEADERS = SHARED_CSV_HEADERS;

function buildCsvTemplate(topicCluster: string): string {
  // Sample row: a foundational MC algebra question with full
  // distractor explanations and the new ingestion fields populated.
  // Per-node uploads can leave the ingestion columns blank.
  return [
    CSV_HEADERS.join(","),
    [
      '"If 3x + 5 = 26, what is the value of x?"',
      '"5"',
      '"6"',
      '"7"',
      '"8"',
      "C",
      "2",
      `"${topicCluster}"`,
      '"Start by isolating the variable term."',
      '"Subtract 5 from both sides to get 3x = 21, then divide by 3 to find x = 7."',
      '"5 results from forgetting to subtract 5 first."',
      '"6 is a small arithmetic slip."',
      '"Correct — x = 7."',
      '"8 results from dividing 24 by 3 instead of 21."',
      '"Type 3x+5=26 into Desmos and read the intersection."',
      "",
      "",
      "",
      "",
      "multiple_choice",
      "",
      "algebra",
      "linear-equations-one-variable",
      "extracted",
      "",
      "",
      "",
      "ok",
      "",
      "",
      "",
      "",
    ].join(","),
  ].join("\n");
}

// Re-exported from the shared module so consumers that imported
// `parseCsv` / `toBulkRows` from this file keep working unchanged.
export const parseCsv = sharedParseCsv;
export const toBulkRows = sharedToBulkRows;

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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Bulk import</h3>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <Download className="h-3.5 w-3.5" /> CSV template
        </button>
      </div>
      <p className="mb-4 max-w-2xl text-xs text-slate-500">
        Upload a CSV or JSON file. Accepts the legacy 15-column template AND the 30-column routine
        template (PDF-ingestion output). Required:
        <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-300">question_text</code>,
        <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-300">correct_answer</code>
        ,
        <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-300">
          explanation_text
        </code>
        . Choices are required for multiple-choice rows; SPR rows leave them blank and set{" "}
        <code className="mx-0.5 rounded bg-slate-800 px-1 py-0.5 text-slate-300">
          question_format=numeric_entry
        </code>
        .
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-700"
        >
          <Upload className="h-3.5 w-3.5" /> Choose file
        </button>
        {preview && <span className="text-xs text-slate-500">{preview.length} rows parsed</span>}
      </div>

      {parseError && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <AlertCircle className="h-3.5 w-3.5" /> {parseError}
        </div>
      )}

      {result && <ImportResultBanner result={result} />}

      {preview && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preview
          </h4>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-800 text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Question</th>
                  <th className="px-3 py-2 text-left font-semibold">Difficulty</th>
                  <th className="px-3 py-2 text-left font-semibold">Correct</th>
                  <th className="px-3 py-2 text-left font-semibold">Slug</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="max-w-[24rem] truncate px-3 py-2 text-slate-200">
                      {r.question_text}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.difficulty}</td>
                    <td className="px-3 py-2 text-slate-500">{r.correct_answer}</td>
                    <td className="px-3 py-2 text-slate-500">{r.concept_slug ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
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
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing}
              className={cn(
                "rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-bold text-white",
                importing ? "cursor-not-allowed opacity-50" : "hover:bg-indigo-400"
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
        <Check className="h-3.5 w-3.5" /> Imported {total} rows
      </div>
      <ul className="mt-1.5 space-y-0.5 text-emerald-200/80">
        <li>· {result.inserted} live</li>
        <li>· {result.flagged_for_review} flagged for review</li>
        <li>· {result.skipped_duplicates} skipped (duplicate)</li>
        {result.errored > 0 && <li className="text-rose-300">· {result.errored} errored</li>}
      </ul>
      {result.errors.length > 0 && (
        <details className="mt-2 cursor-pointer text-rose-300">
          <summary className="font-semibold">
            Show {result.errors.length} error{result.errors.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {result.errors.map((e, i) => (
              <li key={i}>
                row {e.row}: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
