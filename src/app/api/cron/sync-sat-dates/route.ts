// ============================================================
// GET /api/cron/sync-sat-dates
//
// Daily job (run by Vercel Cron, see vercel.json) that re-scrapes
// the official College Board SAT dates page and upserts any new
// rows or updated deadlines into public.sat_dates.
//
// Never deletes rows — past test dates must stay in the table
// for historical cohort references. Upsert-only.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
// Set CRON_SECRET in Vercel env vars (and .env.local for testing).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchSatDatesFromCollegeBoard,
  SAT_DATES_SOURCE_URL,
} from "@/lib/sat-dates-source";

// Force Node runtime — we use `@supabase/supabase-js` with the
// service role key, which needs Node APIs (edge runtime would
// silently fail on some internals).
export const runtime = "nodejs";
// Don't cache the cron response.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Only Vercel Cron (or the dev operator with the secret) can run this.
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await fetchSatDatesFromCollegeBoard();
    if (parsed.length === 0) {
      // College Board page changed shape or was blocked — fail loudly so
      // Sentry catches it. Existing rows stay intact.
      console.error("[sync-sat-dates] Parser found zero dates — page layout may have changed");
      return NextResponse.json(
        { error: "parser found zero dates — page layout may have changed" },
        { status: 502 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const rows = parsed.map((d) => ({
      test_date: d.test_date,
      registration_deadline: d.registration_deadline,
      late_registration_deadline: d.late_registration_deadline,
      source_url: SAT_DATES_SOURCE_URL,
      imported_at: now,
    }));

    const { error } = await supabase
      .from("sat_dates")
      .upsert(rows, { onConflict: "test_date" });

    if (error) {
      console.error("[sync-sat-dates] Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      fetched: parsed.length,
      upserted: rows.length,
      at: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-sat-dates] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
