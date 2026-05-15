// ============================================================
// Static seed for SAT test dates — fallback when the College Board
// scraper fails. Audit issue #15.
//
// The daily cron at /api/cron/sync-sat-dates re-scrapes College
// Board's announced test-date page and upserts into sat_dates. If
// the page layout changes (rare but inevitable) or College Board
// temporarily 5xxs us out, the scraper returns zero rows. Before
// this seed, the cron returned 502 and the table got increasingly
// stale until someone noticed.
//
// Now the cron upserts this baseline FIRST, then layers any real
// scraper data on top. Real deadlines win because the upsert
// uses test_date as the conflict key. If the scraper fails the
// seed is still there — students can still pick an SAT date at
// onboarding.
//
// MAINTENANCE: when College Board officially announces a new
// year's dates, append them below. The dates here are based on
// historically-announced first-Saturday patterns; treat any
// pattern-derived date as best-effort until College Board confirms.
// Registration deadlines are left NULL — only the scraper fills
// those in (and the existing /onboarding flow doesn't surface them).
// ============================================================

export interface StaticSatDate {
  test_date: string; // YYYY-MM-DD
  registration_deadline: string | null;
  late_registration_deadline: string | null;
}

/** Officially announced SAT test dates as of 2026-05.
 *  Source: collegeboard.org/digital-sat → "test dates" page. */
export const STATIC_SAT_DATES: StaticSatDate[] = [
  // ── 2026 (College Board confirmed) ─────────────────────────
  { test_date: "2026-03-14", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-05-02", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-06-06", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-08-22", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-10-03", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-11-07", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2026-12-05", registration_deadline: null, late_registration_deadline: null },

  // ── 2027 (projected — first Saturday of each month College Board
  //         typically administers; replace once announced) ────
  { test_date: "2027-03-13", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-05-01", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-06-05", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-08-28", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-10-02", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-11-06", registration_deadline: null, late_registration_deadline: null },
  { test_date: "2027-12-04", registration_deadline: null, late_registration_deadline: null },
];
