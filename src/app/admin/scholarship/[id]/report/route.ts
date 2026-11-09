// ============================================================
// GET /admin/scholarship/:id/report — the uploaded score report.
//
// Admin only, checked here (route handlers don't go through the
// admin layout). The file is private: no public URL, no caching.
// ============================================================

import { z } from "zod";
import { adminOrNull } from "@/lib/auth/admin-guard";
import { getReportBytes } from "@/lib/scholarship/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await adminOrNull();
  if (!admin) return new Response("Not found", { status: 404 });

  const parsed = z.guid().safeParse((await ctx.params).id);
  if (!parsed.success) return new Response("Not found", { status: 404 });

  const file = await getReportBytes(parsed.data).catch(() => null);
  if (!file) return new Response("The file is missing from storage.", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="score-report-${parsed.data.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
