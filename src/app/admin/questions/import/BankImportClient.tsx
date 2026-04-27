"use client";

// ============================================================
// BankImportClient — top-level CSV upload for the PDF-routine
// flow. No node/subject context: rows land with node_id = NULL
// in the bank, and an admin routes each one to a curriculum
// node later via /admin/questions/review.
//
// Reuses the parser + helpers from BulkImportPanel so the two
// import surfaces always agree on CSV semantics.
// ============================================================

import { useRef, useState } from "react";
import { Upload, AlertCircle, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CSV_HEADERS,
  parseCsv,
  toBulkRows,
  ImportResultBanner,
} from "@/components/admin/BulkImportPanel";
import { actionBulkImport, type BulkImportRow, type BulkImportResult } from "@/app/admin/actions";

function buildBankTemplate(): string {
  return [
    CSV_HEADERS.join(","),
    [
      '"If 3x + 5 = 26, what is the value of x?"',
      '"5"', '"6"', '"7"', '"8"',
      "C", "2", '"Algebra"',
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
      '"sample-pdf.pdf"', "47", '"a3b1c9d4e2f7..."',
      "ok", "", "",
    ].join(","),
  ].join("\n");
}

export default function BankImportClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setFilename(file.name);
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
      // Bank flow needs domain on every row to derive subject.
      const missingDomain = rows.findIndex((r) => !r.domain?.trim());
      if (missingDomain >= 0) {
        throw new Error(
          `Row ${missingDomain + 2} has no \`domain\` value. The bank importer derives subject from domain — every row needs one of the 8 SAT domain slugs.`
        );
      }
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
      const r = await actionBulkImport(null, null, preview);
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
    const blob = new Blob([buildBankTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "routine-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Counts in the parsed preview, for at-a-glance triage.
  const previewBreakdown = preview
    ? preview.reduce(
        (acc, r) => {
          if (r.import_status === "needs_review") acc.flagged++;
          else acc.ok++;
          return acc;
        },
        { ok: 0, flagged: 0 }
      )
    : null;

  return (
    <div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Routine output → bank</h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload the <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">questions.csv</code> and{" "}
              <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">questions_needs_review.csv</code> the
              PDF-ingestion routine writes to{" "}
              <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">question-imports/runs/&lt;timestamp&gt;/</code>.
              Rows land in the bank with no node assigned. Use{" "}
              <a href="/admin/questions/review" className="text-indigo-300 hover:text-indigo-200 underline">/admin/questions/review</a>{" "}
              to triage flagged rows; the Modify action lets you assign a curriculum node before sending a question live.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            CSV template
          </button>
        </div>

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
          {filename && <span className="text-xs text-slate-500">{filename}</span>}
          {previewBreakdown && (
            <span className="text-xs text-slate-500">
              · {previewBreakdown.ok} ok / {previewBreakdown.flagged} flagged
            </span>
          )}
        </div>

        {parseError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {parseError}
          </div>
        )}

        {result && <ImportResultBanner result={result} />}

        {preview && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview</h4>
            <div className="rounded-lg border border-slate-800 max-h-[28rem] overflow-y-auto text-xs">
              <table className="w-full">
                <thead className="bg-slate-800 sticky top-0 text-slate-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Question</th>
                    <th className="text-left px-3 py-2 font-semibold">Domain</th>
                    <th className="text-left px-3 py-2 font-semibold">Slug</th>
                    <th className="text-left px-3 py-2 font-semibold">Diff</th>
                    <th className="text-left px-3 py-2 font-semibold">Source</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-200 truncate max-w-[20rem]">{r.question_text}</td>
                      <td className="px-3 py-2 text-slate-500">{r.domain ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{r.concept_slug ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{r.difficulty}</td>
                      <td className="px-3 py-2 text-slate-500 truncate max-w-[12rem]">
                        {r.source_pdf ? `${r.source_pdf}${r.source_page ? `:${r.source_page}` : ""}` : "—"}
                      </td>
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
                onClick={() => { setPreview(null); setFilename(null); }}
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
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500 flex items-start gap-2">
        <FileWarning className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
        <span>
          Re-uploading the same file is safe — the importer skips rows whose
          (source_pdf, content_hash) pair is already in the database. To force a
          re-import after editing the source PDF, delete the affected rows in
          /admin/questions/review first.
        </span>
      </div>
    </div>
  );
}
