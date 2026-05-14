// ============================================================
// /admin/questions/import — top-level CSV upload for the
// PDF-routine output. Bank model: questions land with no node
// assignment, awaiting triage in /admin/questions/review.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Upload } from "lucide-react";
import BankImportClient from "./BankImportClient";
import PdfUploadClient from "./PdfUploadClient";

export const metadata: Metadata = { title: "Admin — Question import | Karman" };

export default function QuestionImportPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3"
        >
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-400" /> Question import
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
          Two paths in: drop PDFs for automated processing, or upload pre-baked
          CSVs from a manual routine run.
        </p>
      </div>
      <div className="space-y-4">
        <PdfUploadClient />
        <BankImportClient />
      </div>
    </div>
  );
}
