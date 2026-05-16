// ============================================================
// GET /api/cron/sync-sat-dates
//
// Daily job that re-scrapes the official College Board SAT dates
// page and upserts any new rows or updated deadlines into
// public.sat_dates. Never deletes rows — past test dates stay in
// the table for historical cohort references. Upsert-only.
//
// Trigger: Cloudflare Worker cron schedule "0 6 * * *" in
// wrangler.toml [triggers].crons, dispatched here by
// cf-worker-with-cron.js. The dispatcher attaches
// `Authorization: Bearer <CRON_SECRET>`.
//
// Set CRON_SECRET as a Cloudflare Worker secret (and in
// .env.local for local dev / curl testing).
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchSatDatesFromCollegeBoard, SAT_DATES_SOURCE_URL } from "@/lib/sat-dates-source";
import { STATIC_SAT_DATES } from "@/lib/sat-dates-static";
import { withCronInstrumentation } from "@/lib/observability/cron";

// Force Node runtime — we use `@supabase/supabase-js` with the
// service role key, which needs Node APIs (edge runtime would
// silently fail on some internals).
export const runtime = "nodejs";
// Don't cache the cron response.
export const dynamic = "force-dynamic";

export const GET = withCronInstrumentation("sync-sat-dates", async (req: Request) => {
  // Only Vercel Cron (or the dev operator with the secret) can run this.
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. Static fallback first — covers the case where College Board's
  //    page layout has changed and the scraper returns nothing.
  //    Audit #15. Uses the same upsert key so a subsequent scraper-
  //    fetched row replaces the seed when fresher deadlines arrive.
  const seedRows = STATIC_SAT_DATES.map((d) => ({
    test_date: d.test_date,
    registration_deadline: d.registration_deadline,
    late_registration_deadline: d.late_registration_deadline,
    source_url: "static-seed",
    imported_at: now,
  }));
  const { error: seedErr } = await supabase
    .from("sat_dates")
    .upsert(seedRows, { onConflict: "test_date", ignoreDuplicates: true });
  if (seedErr) {
    console.error("[sync-sat-dates] static seed upsert error:", seedErr);
  }

  // 2. Try the live scraper. Failure is non-fatal: the seed above
  //    keeps the table populated. We still return 200 so Cloudflare
  //    doesn't retry-loop; Sentry catches the console.error.
  let parsed: Awaited<ReturnType<typeof fetchSatDatesFromCollegeBoard>> = [];
  try {
    parsed = await fetchSatDatesFromCollegeBoard();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-sat-dates] scraper threw:", message);
  }

  if (parsed.length === 0) {
    console.error(
      "[sync-sat-dates] scraper returned 0 dates — page layout may have changed; static seed still in place"
    );
    return NextResponse.json({
      ok: true,
      fetched: 0,
      seeded: seedRows.length,
      used_fallback: true,
      at: now,
    });
  }

  const rows = parsed.map((d) => ({
    test_date: d.test_date,
    registration_deadline: d.registration_deadline,
    late_registration_deadline: d.late_registration_deadline,
    source_url: SAT_DATES_SOURCE_URL,
    imported_at: now,
  }));
  const { error } = await supabase.from("sat_dates").upsert(rows, { onConflict: "test_date" });
  if (error) {
    console.error("[sync-sat-dates] Supabase upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fetched: parsed.length,
    upserted: rows.length,
    seeded: seedRows.length,
    used_fallback: false,
    at: now,
  });
});
