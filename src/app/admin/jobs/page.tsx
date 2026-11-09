// ============================================================
// /admin/jobs — PDF processing job queue.
//
// Lists every uploaded PDF and its per-module processing status.
// Admins use this to see what's queued, what's running, and what
// failed. The hybrid runner (admin's local machine) updates the
// rows as it works through each PDF.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WbPage, WbStats } from "@/components/admin/workbench";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import type { PdfProcessingJob } from "@/types/pdf-job";
import JobsClient from "./JobsClient";

export const metadata: Metadata = { title: "Admin — PDF jobs | Karman" };
export const dynamic = "force-dynamic";

const TITLE = "PDF jobs";
const SUMMARY =
  "Each row follows one uploaded SAT PDF through the extraction steps. Finished files import into the bank on their own.";

export default async function AdminJobsPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) redirect("/");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(200);

  const actions = (
    <>
      <Link className="wb-btn" href="/admin/questions/import">
        Upload a PDF
      </Link>
      <Link className="wb-btn" href="/admin/curriculum">
        Back to admin
      </Link>
    </>
  );

  if (error) {
    return (
      <WbPage title={TITLE} summary={SUMMARY} actions={actions}>
        <p role="alert" className="wb-alert">
          Failed to load jobs: {error.message}
        </p>
      </WbPage>
    );
  }

  const jobs = (data ?? []) as unknown as PdfProcessingJob[];
  const active = jobs.filter((j) => j.status === "queued" || j.status === "running").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const imported = jobs.reduce(
    (sum, j) => sum + Object.values(j.imported_counts ?? {}).reduce((s, n) => s + (n ?? 0), 0),
    0
  );

  return (
    <WbPage title={TITLE} summary={SUMMARY} actions={actions}>
      <WbStats
        items={[
          { label: "Jobs", value: jobs.length.toLocaleString("en-US") },
          { label: "Queued or running", value: active.toLocaleString("en-US") },
          { label: "Failed", value: failed.toLocaleString("en-US") },
          { label: "Questions imported", value: imported.toLocaleString("en-US") },
        ]}
      />
      <JobsClient initialJobs={jobs} />
    </WbPage>
  );
}
