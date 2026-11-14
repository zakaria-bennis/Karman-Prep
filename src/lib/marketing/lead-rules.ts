// The checks every marketing form uses, on the visitor's screen (as a field is left) and again on the
// server (lead-actions.ts), so both say the same thing. Messages are in site-copy.ts ("form error ...").

/** name@domain.tld, no spaces. */
export function okEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 254;
}

/** A phone number: ten to fifteen digits, with the usual spaces, dots, dashes, brackets and a leading +. */
export function okPhone(v: string): boolean {
  const s = v.trim();
  const digits = s.replace(/\D/g, "").length;
  return /^\+?[\d\s().-]+$/.test(s) && digits >= 10 && digits <= 15;
}

/** A call time as the form sends it: "2026-11-19 5:00 pm". */
export function okSlot(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2} (1[0-2]|[1-9]):00 (am|pm)$/.test(v);
}

/** A person's name: letters in any alphabet, with spaces, hyphens, apostrophes and full stops between them.
 *  No digits and no other symbols. */
export function okName(v: string): boolean {
  return /^\p{L}[\p{L}\p{M}' .-]*$/u.test(v.trim());
}

/** A name as it is typed: anything a name cannot hold is dropped at once. */
export function cleanName(v: string): string {
  return v.replace(/[^\p{L}\p{M}' .-]/gu, "").replace(/^[' .-]+/, "");
}

/** A call slot that can really be booked: its date is today or later (a day of slack for time zones), no
 *  more than `days` ahead, and its hour is one the calendar offers (8 am to 11 pm Central). */
export function slotInWindow(v: string, now = new Date(), days = 32): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):00 (am|pm)$/.exec(v);
  if (!m) return false;
  const day = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hour = (Number(m[4]) % 12) + (m[5] === "pm" ? 12 : 0);
  const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 864e5;
  return day >= from && day <= from + (days + 1) * 864e5 && hour >= 8 && hour <= 23;
}

/** An SAT or PSAT total: a multiple of 10 from `lo` to 1600. */
export function okScore(v: string, lo: number): boolean {
  const s = v.trim();
  if (!/^\d{3,4}$/.test(s)) return false;
  const n = Number(s);
  return n >= lo && n <= 1600 && n % 10 === 0;
}

/** The lowest score each field accepts: a real latest score, and a target worth aiming for. */
export const SCORE_FLOOR = { latest: 320, target: 400 } as const;

export type LeadForm = "apply" | "call" | "seat";
