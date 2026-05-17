// ============================================================
// SAT dates — fetches & parses the official College Board
// dates page. Used by the daily cron job at
// /api/cron/sync-sat-dates.
//
// College Board renders this page server-side (it's a
// marketing page they want crawlable), so a plain fetch()
// plus a forgiving regex parser is enough — no headless
// browser needed.
//
// If College Board ever changes the page markup and the
// parser finds zero dates, the cron logs to Sentry and
// returns 502. Our seeded dates stay valid through 2027,
// so there's a long runway to fix the parser.
// ============================================================

export const SAT_DATES_SOURCE_URL = "https://satsuite.collegeboard.org/sat/dates-deadlines";

export interface ParsedSatDate {
  test_date: string; // YYYY-MM-DD
  registration_deadline: string | null; // YYYY-MM-DD, null if not yet published
  late_registration_deadline: string | null;
}

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function toIsoDate(month: string, day: number, year: number): string | null {
  const m = MONTH_INDEX[month.toLowerCase()];
  if (!m) return null;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Strip HTML tags and collapse whitespace — we only care about the
// readable text, not the markup structure.
function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchSatDatesFromCollegeBoard(): Promise<ParsedSatDate[]> {
  const res = await fetch(SAT_DATES_SOURCE_URL, {
    headers: {
      // Identify ourselves so College Board can block us if needed
      // rather than blocking us silently.
      "User-Agent": "KarmanBot/1.0 (+https://karmanprep.com/bot)",
      Accept: "text/html",
    },
    // Don't cache at the edge — we want fresh data daily.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`College Board fetch failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  const text = stripToText(html);

  // Scan the text for date phrases and the section labels around them.
  // The page lists each test date as a block containing the test date
  // phrase and (if published) the registration + late registration dates.
  //
  // We take a windowed approach: find every date phrase, then for each
  // test-date anchor, look at the following ~400 chars for reg / late-reg
  // dates. Labels on the CB page include "Registration Deadline" and
  // "Late Registration Deadline".
  const rows: ParsedSatDate[] = [];

  // The page interleaves all three kinds of dates (test / reg / late-reg)
  // by block. Easiest robust approach: walk sequentially, tagging each
  // date occurrence based on the nearest preceding label.
  //
  // We re-scan the text to build a labeled list of [label, iso].
  const LABELED = new RegExp(
    // Either a label word (optional), then the date phrase
    "(test\\s+date|registration\\s+deadline|late\\s+registration\\s+deadline)?[^a-z0-9]{0,180}(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday),?\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\s+(\\d{1,2}),?\\s+(\\d{4})",
    "gi"
  );

  const labeled: { label: "test" | "reg" | "late" | null; date: string }[] = [];
  let lastLabel: "test" | "reg" | "late" | null = null;
  for (const m of text.matchAll(LABELED)) {
    const rawLabel = (m[1] || "").toLowerCase();
    const iso = toIsoDate(m[2], parseInt(m[3], 10), parseInt(m[4], 10));
    if (!iso) continue;

    if (rawLabel.startsWith("test")) lastLabel = "test";
    else if (rawLabel.startsWith("late")) lastLabel = "late";
    else if (rawLabel.startsWith("registration")) lastLabel = "reg";
    // If no explicit label, the most recent label applies (CB pattern:
    // "Test Date: Sat May 2, 2026 — Registration Deadline: Apr 17 ...")

    labeled.push({ label: lastLabel, date: iso });
  }

  // Group sequentially: every "test" starts a new row; any "reg" / "late"
  // that follow (before the next "test") belong to that row.
  let current: ParsedSatDate | null = null;
  for (const entry of labeled) {
    if (entry.label === "test" || entry.label === null) {
      if (current) rows.push(current);
      current = {
        test_date: entry.date,
        registration_deadline: null,
        late_registration_deadline: null,
      };
    } else if (current && entry.label === "reg") {
      current.registration_deadline ??= entry.date;
    } else if (current && entry.label === "late") {
      current.late_registration_deadline ??= entry.date;
    }
  }
  if (current) rows.push(current);

  // Deduplicate by test_date (first occurrence wins), and sort ascending
  const byDate = new Map<string, ParsedSatDate>();
  for (const r of rows) if (!byDate.has(r.test_date)) byDate.set(r.test_date, r);
  return Array.from(byDate.values()).sort((a, b) => a.test_date.localeCompare(b.test_date));
}
