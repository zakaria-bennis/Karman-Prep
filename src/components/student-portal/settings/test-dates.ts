/*
 * The student's test and date: SAT or PSAT (founder, 2026-11-07). Shared by the account page and
 * onboarding. SAT dates come from the `sat_dates` table (College Board's US dates); PSAT dates are
 * set by each school, so the student types theirs in. No date means "not registered yet".
 * Pure, so the server actions, the forms and the tests share one rule.
 */

export const TEST_TYPES = ["sat", "psat"] as const;
export type TestType = (typeof TEST_TYPES)[number];

export const TEST_NAMES: Readonly<Record<TestType, string>> = { sat: "SAT", psat: "PSAT" };

/** A PSAT date may be at most this many days ahead. */
export const MAX_DAYS_AHEAD = 730;
const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isTestType(value: unknown): value is TestType {
  return value === "sat" || value === "psat";
}

/** A YYYY-MM-DD day that really exists (no Feb 30). */
export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const t = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** "Sat, Mar 13, 2027". Read as a calendar day, so no time zone can shift it. */
export function formatTestDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The saved state in words: "SAT on Sat, Mar 13, 2027", "PSAT, not registered yet". */
export function describeTest(type: TestType | null, date: string | null): string {
  if (!type && !date) return "Not set yet";
  const name = TEST_NAMES[type ?? "sat"];
  return date ? `${name} on ${formatTestDate(date)}` : `${name}, not registered yet`;
}

/** The short form for a card header: "SAT, Mar 13, 2027", "PSAT", or null when unset. */
export function shortTest(type: TestType | null, date: string | null): string | null {
  if (!type && !date) return null;
  const name = TEST_NAMES[type ?? "sat"];
  if (!date) return name;
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${name}, ${day}`;
}

/**
 * Why a test and date can't be saved, or null when they can. An SAT date must be one of the
 * upcoming dates in `satDates`; a PSAT date must be today or later, within two years.
 */
export function testDateProblem(
  type: TestType,
  date: string | null,
  today: string,
  satDates: readonly string[]
): string | null {
  if (date === null) return null;
  if (!isIsoDay(date)) return "Pick a date.";
  if (date < today) return "That date has already passed.";
  if (type === "sat") {
    return satDates.includes(date) ? null : "Pick one of the SAT dates in the list.";
  }
  return date > addDays(today, MAX_DAYS_AHEAD) ? "Pick a date within the next two years." : null;
}
