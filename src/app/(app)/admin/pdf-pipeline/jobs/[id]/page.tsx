// ============================================================
// /admin/pdf-pipeline/jobs/[id] — live progress for a single PDF
// processing job. The page is a thin server wrapper; the live
// updates happen in JobDetailClient (polls every 3 seconds).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { selectPdfJob } from "@/lib/supabase/queries/pdf-jobs";
import JobDetailClient from "./JobDetailClient";

export const metadata: Metadata = { title: "Admin — PDF job | Karman" };
export const dynamic = "force-dynamic";

export default async function PdfJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await selectPdfJob(id);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/pdf-pipeline/jobs"
          className="mb-3 inline-flex items-center gap-1 text-xs text-taupe hover:text-ivory"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> All jobs
        </Link>
        <h1 className="text-2xl font-bold text-ivory">{job.source_pdf}</h1>
        <p className="mt-1 text-xs text-taupe">Job ID: {job.id}</p>
      </div>
      <JobDetailClient initialJob={job} />
    </div>
  );
}
