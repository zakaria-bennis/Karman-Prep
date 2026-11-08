// Reviewed import tools and the retained legacy CSV adapter.

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
          className="mb-3 inline-flex items-center gap-1 text-xs text-[color:var(--mute)] hover:text-[color:var(--ink)]"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--ink)]">
          <Upload className="h-5 w-5 text-[color:var(--accent-text)]" /> Question import
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[color:var(--mute)]">
          Import reviewed questions using the offline JSON workflow. The existing CSV adapter
          remains available below; imported rows still require triage at{" "}
          <code className="rounded bg-[color-mix(in_srgb,var(--raised)_70%,transparent)] px-1.5 py-0.5 text-[11px] text-[color:var(--ink)]">
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
