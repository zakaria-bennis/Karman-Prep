// ============================================================
// Tutor affiliate plan — pure rules (no I/O).
//
// A tutor pays $199 a month. Their code gives up to 50 students
// the Practice plan free while the subscription is active. The
// database enforces the 50-seat cap race-safely
// (supabase/migrations/20261108043000_tutor_affiliate.sql); these
// rules decide what depends on the subscription and on codes.
// ============================================================

export const AFFILIATE_SEAT_LIMIT = 50;

/** "active": the code grants Practice. "lapsed": students are on Free. */
export type AffiliateAccess = "active" | "lapsed";

/**
 * The tutor's $199 subscription lives in the pricing session's
 * `subscriptions` table (plan "tutor-affiliate"). The same statuses
 * that keep a student's own paid plan working keep the code working.
 */
export function affiliateAccess(subscription: { status: string } | null): AffiliateAccess {
  return subscription?.status === "active" || subscription?.status === "trialing"
    ? "active"
    : "lapsed";
}

export type AffiliateCapability =
  | "view_roster"
  | "view_progress"
  | "assign"
  | "remove"
  | "regenerate_code";

/**
 * What a tutor may do with their own students. A lapsed tutor keeps
 * the roster (so they can see who is waiting) and may remove students,
 * which frees seats for when they restart.
 */
export function affiliateCapabilities(access: AffiliateAccess): ReadonlySet<AffiliateCapability> {
  if (access === "active") {
    return new Set(["view_roster", "view_progress", "assign", "remove", "regenerate_code"]);
  }
  return new Set(["view_roster", "remove"]);
}

// ── Codes ─────────────────────────────────────────────────────
// Eight characters from a 32-letter alphabet without I, O, 0 or 1,
// shown as XXXX-XXXX. 32^8 ≈ 1.1 trillion codes, so guessing one is
// impractical. 256 is a multiple of 32, so byte % 32 has no bias.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Canonical "ABCD-EFGH", or null when the input can't be a code. */
export function normalizeAffiliateCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  if (compact.length !== CODE_LENGTH) return null;
  for (const ch of compact) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function generateAffiliateCode(
  randomBytes: (length: number) => Uint8Array = (length) =>
    crypto.getRandomValues(new Uint8Array(length))
): string {
  const bytes = randomBytes(CODE_LENGTH);
  let compact = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    compact += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

// ── Seats ─────────────────────────────────────────────────────

export interface SeatSummary {
  used: number;
  limit: number;
  remaining: number;
  full: boolean;
}

export function seatSummary(used: number, limit: number = AFFILIATE_SEAT_LIMIT): SeatSummary {
  const remaining = Math.max(0, limit - used);
  return { used, limit, remaining, full: remaining === 0 };
}
