// ============================================================
// /admin/questions/import — two upload paths into the question bank:
//
//   1. PdfPipelineUploadClient — drop a PDF, runs the full
//      automated pipeline on GitHub Actions (Gemini extraction +
//      figure cropping + Sonnet/Haiku explanations + answer-key
//      audit). Live progress at /admin/pdf-pipeline/jobs/[id].
//
//   2. BankImportClient — upload a pre-baked CSV (manual workflow
//      or ChatGPT path). Direct insert into the bank, no
//      pipeline.
//
// Bank rows from either path land with no node assignment,
// awaiting triage at /admin/questions/review.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Upload } from "lucide-react";
import BankImportClient from "./BankImportClient";
import PdfPipelineUploadClient from "./PdfPipelineUploadClient";

export const metadata: Metadata = { title: "Admin — Question import | Karman" };

export default function QuestionImportPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-taupe hover:text-ivory"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ivory">
          <Upload className="h-5 w-5 text-gold" /> Question import
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-taupe">
          Two ways in: drop a PDF for the automated pipeline, or upload a pre-baked CSV. Either way,
          rows land in the bank for triage at{" "}
          <code className="rounded bg-surface-raised/70 px-1.5 py-0.5 text-[11px] text-ivory">
            /admin/questions/review
          </code>
          .
        </p>
      </div>
      <div className="space-y-4">
        <PdfPipelineUploadClient />
        <BankImportClient />
      </div>
    </div>
  );
}
