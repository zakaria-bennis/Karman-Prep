// ============================================================
// /admin/questions/import — CSV upload for pre-baked question
// imports. Bank model: questions land with no node assignment,
// awaiting triage in /admin/questions/review.
//
// HISTORICAL NOTE: this page used to also expose a PdfUploadClient
// drag-and-drop that enqueued PDFs onto the local Claude-API
// daemon (`scripts/pdf-pipeline/pull-pdf-job.mjs`). That path was
// abandoned in favor of ChatGPT Custom GPT (ADR #3) and then
// the local Gemini pipeline (`npm run pdf:extract`). PDFs are no
// longer uploaded through the site — they're processed locally
// by the operator and only the resulting CSV comes here.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Upload } from "lucide-react";
import BankImportClient from "./BankImportClient";

export const metadata: Metadata = { title: "Admin — Question import | Karman" };

export default function QuestionImportPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Upload className="h-5 w-5 text-indigo-400" /> Question import
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
          Upload a pre-baked CSV from your local PDF pipeline (
          <code className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[11px] text-slate-200">
            npm run pdf:extract
          </code>
          ). Bank rows land with no node assignment, ready for triage in /admin/questions/review.
        </p>
      </div>
      <div className="space-y-4">
        <BankImportClient />
      </div>
    </div>
  );
}
