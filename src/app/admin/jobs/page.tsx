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
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import type { PdfProcessingJob } from "@/types/pdf-job";
import JobsClient from "./JobsClient";

export const metadata: Metadata = { title: "Admin — PDF jobs | Karman" };
export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const { userId } = await auth();
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
      <div className="max-w-5xl mx-auto px-5 py-8 text-rose-300 text-sm">
        Failed to load jobs: {error.message}
      </div>
    );
  }

  const jobs = (data ?? []) as PdfProcessingJob[];

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
          <ListChecks className="w-5 h-5 text-indigo-400" /> PDF processing queue
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Each row tracks one uploaded SAT PDF through the four-module
          extraction pipeline. CSVs auto-import into the bank when complete.
        </p>
      </div>

      <JobsClient initialJobs={jobs} />
    </div>
  );
}
