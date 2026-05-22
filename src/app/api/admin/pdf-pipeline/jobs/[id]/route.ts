// ============================================================
// GET /api/admin/pdf-pipeline/jobs/[id]
//
// Returns the current pdf_processing_jobs row. Used by the
// JobDetailClient component to poll for live progress.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { selectPdfJob } from "@/lib/supabase/queries/pdf-jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const { id } = await params;
  try {
    const job = await selectPdfJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
