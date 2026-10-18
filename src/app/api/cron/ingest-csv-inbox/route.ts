import { NextResponse } from "next/server";
import { withCronInstrumentation } from "@/lib/observability/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Historical pdf_processing_jobs remain readable. The retired paid pipeline's
// CSV inbox must never feed the legacy bulk importer, even if a completed job
// or an old caller still invokes this URL with the cron secret.
export const POST = withCronInstrumentation("ingest-csv-inbox", async (req: Request) => {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      error: "Legacy question-pipeline CSV ingestion is retired. Use the reviewed import workflow.",
    },
    { status: 410, headers: { "cache-control": "no-store" } }
  );
});
