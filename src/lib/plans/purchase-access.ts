// ============================================================
// How long a one-time purchase (cohort, private-10, private-20) opens
// its plan (founder, 2026-11-08): until the student's SAT date, the one
// given at onboarding (`public.users.sat_test_date`). The SAT date is the
// last day of access. With no date, access stays open until one is set.
// Pure, safe anywhere.
// ============================================================

/** A `date` column as Postgres returns it. */
export const SAT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const HOUR = 3_600_000;
/**
 * The SAT day is over once it is over in every time zone (UTC-12), so no
 * student loses access before their own SAT day ends.
 */
const HOURS_AFTER_UTC_MIDNIGHT = 24 + 12;

/**
 * When a purchase stops counting: the end of the SAT day everywhere, 12:00
 * UTC on the day after the SAT. Null while the student has no SAT date.
 */
export function purchaseAccessEndsAt(satTestDate: string | null): string | null {
  if (satTestDate === null) return null;
  const midnightUtc = Date.parse(`${satTestDate}T00:00:00.000Z`);
  if (!SAT_DATE_PATTERN.test(satTestDate) || Number.isNaN(midnightUtc))
    throw new Error("The SAT date must be YYYY-MM-DD");
  return new Date(midnightUtc + HOURS_AFTER_UTC_MIDNIGHT * HOUR).toISOString();
}

/** True while there is no SAT date, or until the SAT day is over. */
export function isPurchaseAccessOpen(satTestDate: string | null, now: Date): boolean {
  const endsAt = purchaseAccessEndsAt(satTestDate);
  return endsAt === null || Date.parse(endsAt) > now.getTime();
}
