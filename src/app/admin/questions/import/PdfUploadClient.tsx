"use client";

// ============================================================
// PdfUploadClient — drag-drop one or more SAT PDFs to enqueue
// processing jobs.
//
// Companion to BankImportClient (which uploads already-processed
// CSV files). PDFs land in R2 + a pdf_processing_jobs row, then
// the local hybrid runner picks them up. Status visible at
// /admin/jobs.
// ============================================================

import { useRef, useState } from "react";
import {
  Upload, AlertCircle, FileCheck2, Loader2, ListChecks, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

interface UploadedJob {
  id: string;
  source_pdf: string;
  pdf_storage_path: string;
}

export default function PdfUploadClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  function addFiles(filesToAdd: File[]) {
    const valid: File[] = [];
    const errors: string[] = [];
    for (const f of filesToAdd) {
      if (!f.name.toLowerCase().endsWith(".pdf")) {
        errors.push(`"${f.name}" is not a .pdf file.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        errors.push(`"${f.name}" exceeds 50 MB.`);
        continue;
      }
      valid.push(f);
    }
    if (errors.length) setError(errors.join(" "));
    else setError(null);
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    addFiles(files);
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

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      pendingFiles.forEach((f) => fd.append("pdfs", f));
      const res = await fetch("/api/admin/pdf-upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Upload failed (${res.status})`);
      }
      setUploaded((prev) => [...prev, ...(json.jobs as UploadedJob[])]);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" /> Upload PDFs for automated processing
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Drop one or more full-length SAT PDFs here. Each PDF gets queued for
            extraction; the local runner on your Mac processes them module-by-module
            and the resulting questions auto-import into the bank.
          </p>
        </div>
        <Link
          href="/admin/jobs"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <ListChecks className="w-3.5 h-3.5" /> View queue
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
          dragActive
            ? "border-indigo-400 bg-indigo-500/10"
            : pendingFiles.length > 0
              ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
              : "border-slate-700 bg-slate-950/40 hover:border-slate-500 hover:bg-slate-900/60"
        )}
      >
        {pendingFiles.length > 0 ? (
          <div className="flex flex-col items-center gap-2 text-sm">
            <FileCheck2 className="w-8 h-8 text-emerald-400" />
            <div className="text-emerald-200 font-semibold">
              {pendingFiles.length} PDF{pendingFiles.length === 1 ? "" : "s"} ready
              <span className="text-slate-500 font-normal">
                {" "}· {(totalBytes / 1024 / 1024).toFixed(1)} MB total
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Drop more files or click to add
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm">
            <Upload className={cn("w-8 h-8", dragActive ? "text-indigo-300" : "text-slate-500")} />
            <div className={cn("font-semibold", dragActive ? "text-indigo-200" : "text-slate-300")}>
              {dragActive ? "Drop PDFs to queue them" : "Drag & drop SAT PDFs here"}
            </div>
            <div className="text-xs text-slate-500">
              or click anywhere in this box · multiple files OK · 50 MB max each
            </div>
          </div>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="mt-3 space-y-1">
          {pendingFiles.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950/40 border border-slate-800 text-xs"
            >
              <span className="text-slate-300 flex-1 truncate">{f.name}</span>
              <span className="text-slate-500 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-500 hover:text-rose-300"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setPendingFiles([])}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-white/5 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Queue {pendingFiles.length} PDF{pendingFiles.length === 1 ? "" : "s"}</>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {uploaded.length > 0 && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          Queued {uploaded.length} PDF{uploaded.length === 1 ? "" : "s"} for processing.{" "}
          <Link href="/admin/jobs" className="underline hover:text-emerald-100">
            Track progress at /admin/jobs →
          </Link>
        </div>
      )}
    </div>
  );
}
