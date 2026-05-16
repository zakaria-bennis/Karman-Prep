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
import { ChevronRight, ListChecks } from "lucide-react";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import type { PdfProcessingJob } from "@/types/pdf-job";
import JobsClient from "./JobsClient";

export const metadata: Metadata = { title: "Admin — PDF jobs | Karman" };
export const dynamic = "force-dynamic";

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

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-rose-300">
        Failed to load jobs: {error.message}
      </div>
    );
  }

  const jobs = (data ?? []) as unknown as PdfProcessingJob[];

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
          <ListChecks className="h-5 w-5 text-indigo-400" /> PDF processing queue
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Each row tracks one uploaded SAT PDF through the four-module extraction pipeline. CSVs
          auto-import into the bank when complete.
        </p>
      </div>

      <JobsClient initialJobs={jobs} />
    </div>
  );
}
