// ============================================================
// /admin/pdf-pipeline/jobs/[id] — live progress for a single PDF
// processing job. The page is a thin server wrapper; the live
// updates happen in JobDetailClient (polls every 3 seconds).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WbPage } from "@/components/admin/workbench";
import { selectPdfJob } from "@/lib/supabase/queries/pdf-jobs";
import JobDetailClient from "./JobDetailClient";

export const metadata: Metadata = { title: "Admin — PDF job | Karman" };
export const dynamic = "force-dynamic";

export default async function PdfJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await selectPdfJob(id);
  if (!job) notFound();

  return (
    <WbPage
      title={job.source_pdf}
      summary={`Job ID: ${job.id}`}
      actions={
        <Link className="wb-btn" href="/admin/pdf-pipeline/jobs">
          All jobs
        </Link>
      }
    >
      <JobDetailClient initialJob={job} />
    </WbPage>
  );
}
