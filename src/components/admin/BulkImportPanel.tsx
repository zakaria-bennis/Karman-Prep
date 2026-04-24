"use client";

// ============================================================
// BulkImportPanel — CSV or JSON upload with preview + confirm.
// Includes a "Download template" link for the exact format.
// ============================================================

import { useRef, useState } from "react";
import { Upload, Download, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subject } from "@/data/curriculum";
import { actionBulkImport, type BulkImportRow } from "@/app/admin/actions";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
}

const CSV_HEADERS = [
  "question_text","choice_a","choice_b","choice_c","choice_d",
  "correct_answer","difficulty","topic_cluster","hint","explanation_text",
  "explanation_a","explanation_b","explanation_c","explanation_d",
  "desmos_strategy",
];

function buildCsvTemplate(topicCluster: string): string {
  return [
    CSV_HEADERS.join(","),
    [
      '"What is 2 + 2?"',
      '"3"','"4"','"5"','"6"',
      "B","foundational",`"${topicCluster}"`,
      '"Think about basic addition."',
      '"Two plus two equals four by basic arithmetic."',
      '"3 is too low — check your addition."','"Correct — 2 + 2 = 4."','"5 is off by one."','"6 is too high — try again."',
      '"Type 2+2 into Desmos to verify."',
    ].join(","),
  ].join("\n");
}

// Minimal CSV parser — handles quoted fields with commas inside, ignores blank lines.
function parseCsv(text: string): Record<string, string>[] {
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
  if (field !== "" || row.length) { row.push(field); if (row.some((v) => v.trim() !== "")) rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

function toBulkRows(parsed: Record<string, string>[]): BulkImportRow[] {
  return parsed.map((r) => ({
    question_text: r.question_text,
    choice_a: r.choice_a,
    choice_b: r.choice_b,
    choice_c: r.choice_c,
    choice_d: r.choice_d,
    correct_answer: (r.correct_answer.toUpperCase() as BulkImportRow["correct_answer"]) || "A",
    difficulty: (r.difficulty as BulkImportRow["difficulty"]) || "foundational",
    topic_cluster: r.topic_cluster,
    hint: r.hint || undefined,
    explanation_text: r.explanation_text,
    explanation_a: r.explanation_a || undefined,
    explanation_b: r.explanation_b || undefined,
    explanation_c: r.explanation_c || undefined,
    explanation_d: r.explanation_d || undefined,
    desmos_strategy: r.desmos_strategy || undefined,
  }));
}

export default function BulkImportPanel({ nodeId, subject, topicCluster }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setSuccess(null);
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
      const result = await actionBulkImport(nodeId, subject, preview);
      setSuccess(`Imported ${result.inserted} questions.`);
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
        Upload a CSV or JSON file with many questions at once. The file is previewed before anything is saved. Required columns: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">question_text</code>, <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">choice_a</code>–<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">choice_d</code>, <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">correct_answer</code>, <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">difficulty</code>, <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">explanation_text</code>. Optional: <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">hint</code>.
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

      {success && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" /> {success}
        </div>
      )}

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
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-slate-200 truncate max-w-[28rem]">{r.question_text}</td>
                    <td className="px-3 py-2 text-slate-500">{r.difficulty}</td>
                    <td className="px-3 py-2 text-slate-500">{r.correct_answer}</td>
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
