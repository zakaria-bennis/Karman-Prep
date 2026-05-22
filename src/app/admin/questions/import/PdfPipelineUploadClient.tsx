"use client";

// ============================================================
// PdfPipelineUploadClient — drag-drop ONE SAT PDF and trigger
// the GitHub-Actions-based extraction pipeline (Gemini Flash →
// figures → CSV → DB → Sonnet explanations → Haiku Desmos →
// multi-vote grader).
//
// Replaces the deleted PdfUploadClient (which fed the dead Claude
// daemon). Single-PDF-per-upload by design — each upload is its
// own job row with its own progress page.
//
// On successful dispatch, redirects the user to the job detail
// page where they can watch live progress.
// ============================================================

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  AlertCircle,
  Loader2,
  Sparkles,
  Cloud,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export default function PdfPipelineUploadClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFromList(list: FileList | File[]) {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    const f = arr[0];
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError(`"${f.name}" is not a .pdf file.`);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(`"${f.name}" exceeds 100 MB.`);
      return;
    }
    setError(null);
    setFile(f);
    if (arr.length > 1) {
      setError(
        `Only the first PDF was selected — each upload runs its own job. Drop one PDF at a time.`
      );
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length === 0) return;
    setFromList(e.dataTransfer.files);
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

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/admin/pdf-pipeline/dispatch", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Dispatch failed (${res.status})`);
      }
      router.push(`/admin/pdf-pipeline/jobs/${json.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Process a PDF end-to-end
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-400">
            Drop a single SAT PDF. The whole pipeline runs on GitHub Actions: extract questions,
            crop figures, write to the bank, fill explanations, audit answer keys. Live progress on
            the job detail page; nothing for you to babysit.
          </p>
        </div>
        <Link
          href="/admin/pdf-pipeline/jobs"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <ListChecks className="h-3.5 w-3.5" /> All jobs
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-7 transition-colors",
          dragActive
            ? "border-indigo-400 bg-indigo-500/5"
            : "border-slate-700 bg-slate-950/50 hover:border-slate-600"
        )}
      >
        <Cloud className="mb-2 h-7 w-7 text-slate-500" />
        <div className="text-sm font-semibold text-slate-200">
          {file ? file.name : "Drop a PDF here or click to choose"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : "Up to 100 MB. One PDF per upload."}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) setFromList(e.target.files);
          }}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {file && !uploading && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setError(null);
            }}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          disabled={!file || uploading}
          onClick={handleUpload}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> Upload + start pipeline
            </>
          )}
        </button>
      </div>
    </div>
  );
}
