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
import {
  CSV_HEADERS,
  parseCsv,
  toBulkRows,
  ImportResultBanner,
} from "@/components/admin/BulkImportPanel";
import { WbPill } from "@/components/admin/workbench";
import { actionBulkImport, type BulkImportRow, type BulkImportResult } from "@/app/admin/actions";

type InputMode = "file" | "paste";

function buildBankTemplate(): string {
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
      '"Algebra"',
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
      '"sample-pdf.pdf"',
      "47",
      '"a3b1c9d4e2f7..."',
      "ok",
      "",
      "",
    ].join(","),
  ].join("\n");
}

export default function BankImportClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>("file");
  const [filename, setFilename] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  function parseRows(text: string, isJson: boolean): BulkImportRow[] {
    let rows: BulkImportRow[];
    if (isJson) {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("JSON must be an array of question objects");
      rows = data as BulkImportRow[];
    } else {
      rows = toBulkRows(parseCsv(text));
    }
    if (rows.length === 0) throw new Error("No rows found");
    const missingDomain = rows.findIndex((r) => !r.domain?.trim());
    if (missingDomain >= 0) {
      throw new Error(
        `Row ${missingDomain + 2} has no \`domain\` value. The bank importer derives subject from domain — every row needs one of the 8 SAT domain slugs.`
      );
    }
    return rows;
  }

  async function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setFilename(file.name);
    const text = await file.text();
    try {
      setPreview(parseRows(text, file.name.endsWith(".json")));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse error");
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // Accept any single file; parser detects CSV vs JSON by extension.
    if (!/\.(csv|json|tsv|txt)$/i.test(file.name)) {
      setParseError(`Expected a .csv or .json file, got "${file.name}".`);
      return;
    }
    handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleParsePasted() {
    setParseError(null);
    setResult(null);
    setFilename(null);
    const text = pastedText.trim();
    if (!text) {
      setParseError("Paste a CSV or JSON payload first.");
      setPreview(null);
      return;
    }
    try {
      const isJson = text.startsWith("[") || text.startsWith("{");
      setPreview(parseRows(text, isJson));
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
      setPastedText("");
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
    <section className="wb-section" aria-labelledby="bank-import-title">
      <div className="wb-head" style={{ marginBottom: 12 }}>
        <div>
          <h2 id="bank-import-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
            Routine output to bank
          </h2>
          <p className="wb-note" style={{ marginTop: 4, maxWidth: "70ch" }}>
            Upload the <code>questions.csv</code> and <code>questions_needs_review.csv</code> the
            PDF-ingestion routine writes to <code>question-imports/runs/&lt;timestamp&gt;/</code>.
            Rows land in the bank with no node. Triage flagged rows on{" "}
            <a href="/admin/questions/review">the review page</a>; Modify there lets you assign a
            curriculum node before a question goes live.
          </p>
        </div>
        <button type="button" className="wb-btn" onClick={handleDownloadTemplate}>
          CSV template
        </button>
      </div>

      {/* Mode toggle: file vs paste */}
      <div className="wb-tabs" role="group" aria-label="Input" style={{ marginBottom: 12 }}>
        <ModeTab active={mode === "file"} onClick={() => setMode("file")} label="Choose file" />
        <ModeTab active={mode === "paste"} onClick={() => setMode("paste")} label="Paste CSV" />
      </div>

      {mode === "file" ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose or drop a CSV or JSON file"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="wb-empty"
            style={{
              cursor: "pointer",
              borderColor: dragActive ? "var(--accent)" : filename ? "var(--good)" : undefined,
              borderWidth: 2,
            }}
          >
            {filename ? (
              <>
                <b style={{ color: "var(--good)" }}>{filename}</b>
                Drop a different file or click to replace
                {previewBreakdown && (
                  <>
                    {" "}
                    · {previewBreakdown.ok} ok / {previewBreakdown.flagged} flagged
                  </>
                )}
              </>
            ) : (
              <>
                <b>{dragActive ? "Drop the CSV to upload" : "Drag and drop a CSV here"}</b>
                Or click to choose a file (.csv or .json)
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="wb-field">
            <span>CSV or JSON</span>
            <textarea
              className="wb-textarea"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Header row first, then data rows. Or a JSON array of question objects."
              style={{
                minHeight: "12rem",
                maxHeight: "24rem",
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
          </label>
          <div className="wb-toolbar" style={{ marginTop: 8 }}>
            <button type="button" className="wb-btn" onClick={handleParsePasted}>
              Parse pasted CSV
            </button>
            {pastedText && (
              <button
                type="button"
                className="wb-btn"
                onClick={() => {
                  setPastedText("");
                  setPreview(null);
                  setParseError(null);
                }}
              >
                Clear
              </button>
            )}
            {previewBreakdown && (
              <span className="wb-note">
                {previewBreakdown.ok} ok / {previewBreakdown.flagged} flagged
              </span>
            )}
          </div>
        </div>
      )}

      {parseError && (
        <p role="alert" className="wb-alert" style={{ marginTop: 12 }}>
          {parseError}
        </p>
      )}

      {result && <ImportResultBanner result={result} />}

      {preview && (
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
            Preview: {preview.length} rows
          </h3>
          <div className="wb-table-wrap" style={{ maxHeight: "28rem", overflowY: "auto" }}>
            <table className="wb-table">
              <caption className="sr-only">Rows to import</caption>
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Slug</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Difficulty
                  </th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Question">
                      <span style={{ minWidth: 0, overflowWrap: "anywhere", textAlign: "left" }}>
                        {r.question_text}
                      </span>
                    </td>
                    <td data-label="Domain">{r.domain ?? "—"}</td>
                    <td data-label="Slug">{r.concept_slug ?? "—"}</td>
                    <td data-label="Difficulty" data-num="">
                      {r.difficulty}
                    </td>
                    <td data-label="Source">
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {r.source_pdf
                          ? `${r.source_pdf}${r.source_page ? `:${r.source_page}` : ""}`
                          : "—"}
                      </span>
                    </td>
                    <td data-label="Status">
                      <WbPill tone={r.import_status === "needs_review" ? "warn" : "ok"}>
                        {r.import_status ?? "ok"}
                      </WbPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="wb-toolbar" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="wb-btn"
              onClick={() => {
                setPreview(null);
                setFilename(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wb-btn"
              data-variant="primary"
              onClick={handleConfirm}
              disabled={importing}
            >
              {importing ? "Importing…" : `Import ${preview.length} questions`}
            </button>
          </div>
        </div>
      )}

      <p className="wb-note" style={{ marginTop: 16 }}>
        Uploading the same file again is safe: the importer skips rows whose source_pdf and
        content_hash pair is already in the database. To force a re-import after editing the source
        PDF, delete the affected rows on the review page first.
      </p>
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="wb-tab"
      aria-pressed={active}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
