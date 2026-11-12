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
