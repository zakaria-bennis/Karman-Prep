// ============================================================
// Token-system query helpers.
//
// All operations are idempotent so the same call from an API
// route AND from a webhook (Cal BOOKING_CANCELLED, Zoom
// meeting.ended) doesn't double-write. Idempotency invariants
// to preserve when extending:
//   · releasing an already-released token is a no-op
//   · consuming an already-consumed token is a no-op
//   · ensureEliteMonthlyTokens for the same (user, month) is a
//     no-op once that month's batch exists
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export type TokenSource = "elite_monthly" | "private_purchase" | "admin_grant";

export type ConsumedReason =
  | "completed"
  | "no_show"
  | "forfeited_within_window"
  | "expired";

export interface TokenRow {
  id: string;
  user_id: string;
  source: TokenSource;
  granted_at: string;
  granted_for_month: string | null;
  expires_at: string | null;
  assigned_booking_id: string | null;
  consumed_at: string | null;
  consumed_reason: ConsumedReason | null;
  created_at: string;
  updated_at: string;
}

/** "YYYY-MM" for the current UTC month — used as the elite_monthly key. */
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First instant of next UTC month — used as Elite expiry. */
function nextMonthStartIso(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

const ELITE_MONTHLY_GRANT = 8;

/** Lazy-grant Elite monthly tokens. Idempotent — if the user
 *  already has an elite_monthly batch for the current month
 *  (any token row with that month key), this returns without
 *  inserting. Safe to call from getAvailableTokenCount. */
export async function ensureEliteMonthlyTokens(userUuid: string): Promise<void> {
  const supabase = createAdminClient();
  const month = currentMonthKey();

  const { count, error: countErr } = await supabase
    .from("tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userUuid)
    .eq("source", "elite_monthly")
    .eq("granted_for_month", month);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return;

  const expires = nextMonthStartIso();
  const rows = Array.from({ length: ELITE_MONTHLY_GRANT }, () => ({
    user_id: userUuid,
    source: "elite_monthly" as const,
    granted_for_month: month,
    expires_at: expires,
  }));
  const { error } = await supabase.from("tokens").insert(rows);
  if (error) throw error;
}

/** Mint one private token. Called when Stripe confirms a per-session
 *  charge for a Private student. */
export async function grantPrivateToken(userUuid: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tokens").insert({
    user_id: userUuid,
    source: "private_purchase",
    expires_at: null,
  });
  if (error) throw error;
}

/** Live count of tokens the user can spend right now —
 *  un-consumed, un-reserved, un-expired. */
export async function getAvailableTokenCount(userUuid: string): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userUuid)
    .is("consumed_at", null)
    .is("assigned_booking_id", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  if (error) throw error;
  return count ?? 0;
}

/** Reserve a token by attaching it to a booking. Picks the soonest-
 *  expiring available token (so Elite monthly tokens are spent before
 *  longer-lived private/admin grants). Returns the token id, or null
 *  if no available tokens. */
export async function assignTokenToBooking(args: {
  userUuid: string;
  bookingId: string;
}): Promise<string | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: candidates, error: selErr } = await supabase
    .from("tokens")
    .select("id, expires_at")
    .eq("user_id", args.userUuid)
    .is("consumed_at", null)
    .is("assigned_booking_id", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    // null expires_at sorts last so monthly (expiring) tokens go first.
    .order("expires_at", { ascending: true, nullsFirst: false })
    .limit(1);
  if (selErr) throw selErr;
  if (!candidates || candidates.length === 0) return null;

  const tokenId = candidates[0].id as string;
  const { error: updErr } = await supabase
    .from("tokens")
    .update({ assigned_booking_id: args.bookingId })
    .eq("id", tokenId)
    .is("consumed_at", null)
    .is("assigned_booking_id", null); // race-safe: only update if still available
  if (updErr) throw updErr;
  return tokenId;
}

/** Release the booking's reserved token back to the user's bank.
 *  Used on cancel-outside-24h. Idempotent. */
export async function releaseTokenFromBooking(bookingId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tokens")
    .update({ assigned_booking_id: null })
    .eq("assigned_booking_id", bookingId)
    .is("consumed_at", null);
  if (error) throw error;
}

/** Permanently consume the booking's reserved token. Idempotent —
 *  consuming an already-consumed token is a no-op (the WHERE clause
 *  filters out already-consumed rows). */
export async function consumeTokenForBooking(args: {
  bookingId: string;
  reason: Exclude<ConsumedReason, "expired">;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tokens")
    .update({
      consumed_at: new Date().toISOString(),
      consumed_reason: args.reason,
    })
    .eq("assigned_booking_id", args.bookingId)
    .is("consumed_at", null);
  if (error) throw error;
}
