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
// year's dates, append them below. Copy them from College Board's
// page; never work a date out from a pattern (September 2027 was
// missed and two dates were a week off that way).
// Registration deadlines are left NULL — only the scraper fills
// those in (and the existing /onboarding flow doesn't surface them).
// ============================================================

export interface StaticSatDate {
  test_date: string; // YYYY-MM-DD
  registration_deadline: string | null;
  late_registration_deadline: string | null;
}

/** SAT weekend test dates as College Board lists them (read 2026-11-25).
 *  Source: satsuite.collegeboard.org/sat/dates-deadlines. Dates through June 2027 are open for
 *  registration; the 2027-28 dates are the ones College Board calls "anticipated". */
const row = (test_date: string): StaticSatDate => ({
  test_date,
  registration_deadline: null,
  late_registration_deadline: null,
});

export const STATIC_SAT_DATES: StaticSatDate[] = [
  // 2026
  "2026-03-14",
  "2026-05-02",
  "2026-06-06",
  "2026-08-22",
  "2026-10-03",
  "2026-11-07",
  "2026-12-05",
  // spring 2027 (registration open)
  "2027-03-06",
  "2027-05-01",
  "2027-06-05",
  // 2027-28 (anticipated)
  "2027-08-28",
  "2027-09-18",
  "2027-10-09",
  "2027-11-06",
  "2027-12-04",
  "2028-03-04",
  "2028-05-06",
  "2028-06-03",
].map(row);

/** Two dates this file once guessed from the first-Saturday pattern, which College Board then set
 *  a week apart. The table may still hold them until the migration that corrects it has run. */
const GUESSED_WRONG = ["2027-03-13", "2027-10-02"];

/** The SAT dates a student may pick from today on: the table's, with every date above added and
 *  the two wrong guesses left out, in order. */
export function knownSatDates(fromTable: readonly string[], today: string): string[] {
  const all = new Set([
    ...fromTable.map((d) => d.slice(0, 10)),
    ...STATIC_SAT_DATES.map((d) => d.test_date),
  ]);
  return [...all].filter((d) => d >= today && !GUESSED_WRONG.includes(d)).sort();
}
