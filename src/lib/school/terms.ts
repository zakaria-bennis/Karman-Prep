/*
 * The school plan's terms as the school portal shows and bills them. The founder's decision
 * (2026-11-08): the first year is free, then $8 per student a year, and every student gets a
 * Practice plan of their own, never a shared pool.
 *
 * Merge note: the pricing session owns prices in src/lib/marketing/offer.ts (SCHOOL_PLAN:
 * pricePerStudentPerYear 8, studentPlan "practice"). When that lands on the same branch,
 * replace these two values with SCHOOL_PLAN's and delete them here.
 */
export const SCHOOL_TERMS = {
  pricePerStudentPerYear: 8,
  studentPlan: "practice",
} as const;

export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Free until August 31, 2027, then $8 per student a year". */
export function planStatusLine(freeUntil: string): string {
  return `Free until ${formatLongDate(freeUntil)}, then $${SCHOOL_TERMS.pricePerStudentPerYear} per student a year`;
}

/** What the first paid year costs for this many students, in dollars. */
export function yearlyCost(students: number): number {
  return Math.max(0, students) * SCHOOL_TERMS.pricePerStudentPerYear;
}

/** Join codes: six letters and digits without look-alikes (no I, O, 0 or 1). */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function makeJoinCode(random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(6);
  let code = "";
  for (const b of bytes) code += JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length];
  return code;
}

function defaultRandom(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Codes are typed by hand: accept lower case, spaces and dashes. */
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

const DAY_S = 86_400;

/** The renewal's first charge: the free-until date, if Stripe allows it (two days out or more). */
export function trialEndFor(freeUntil: string, now: Date = new Date()): number | undefined {
  const end = Math.floor(Date.parse(`${freeUntil.slice(0, 10)}T00:00:00Z`) / 1000);
  return end - Math.floor(now.getTime() / 1000) > 2 * DAY_S ? end : undefined;
}

/**
 * How much of the free year is left on a given day: whole days to `freeUntil` (never below 0) and
 * that as a share of a 365-day year, for the school's free-year ring.
 */
export function freeYearLeft(
  freeUntil: string,
  now: Date = new Date()
): { days: number; share: number } {
  const end = Date.parse(`${freeUntil.slice(0, 10)}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Number.isFinite(end) ? Math.max(0, Math.round((end - today) / 86_400_000)) : 0;
  return { days, share: Math.min(1, days / 365) };
}
