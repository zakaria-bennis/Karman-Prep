/*
 * Redeeming a tutor's code from the student's account page (tutor affiliate plan, 2026-11-08).
 *
 * The real rules belong to the tutor-affiliate session:
 *   redeemAffiliateCode(deps, { studentClerkId, rawCode, switchTutor? }) -> RedeemResult
 *   in src/lib/tutor-affiliate/service.ts (branch claude/overnight-tutor-9d4a20, not merged here).
 * Until it merges, this adapter applies the same rules straight on its tables
 * (tutor_affiliates, tutor_affiliate_codes, tutor_affiliate_redemptions; the database caps a
 * group at its seat limit) and gives the student Practice through `plan_grants` when that table
 * exists. After the merge: make `redeemTutorCode` and `currentTutor` call the real service with
 * its Supabase deps, and delete the copies below. The account page and its action only rely on
 * `TutorCodeResult`, `redeemTutorCode` and `currentTutor`.
 *
 * Switching tutors is not offered here: a student already in a group is told whose it is.
 */
import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export type TutorCodeResult =
  | { ok: true; status: "joined" | "already_joined"; tutorName: string; practiceOpen: boolean }
  | { ok: false; reason: "invalid_code" | "not_student" | "unavailable" }
  | { ok: false; reason: "tutor_inactive" | "full" | "removed_by_tutor"; tutorName: string }
  | { ok: false; reason: "linked_elsewhere"; tutorName: string; currentTutorName: string };

/* Same code rules as src/lib/tutor-affiliate/rules.ts: 8 letters without I, O, 0 or 1, as XXXX-XXXX. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeTutorCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  if (compact.length !== 8) return null;
  for (const ch of compact) if (!CODE_ALPHABET.includes(ch)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

/** "Priya S.": first name and last initial, never the email. */
export function tutorDisplayName(first: string | null, last: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (f && l) return `${f} ${l[0].toUpperCase()}.`;
  return f || "Your tutor";
}

const MISSING_CODES = ["42P01", "42703", "PGRST204", "PGRST205"];
const missing = (error: PostgrestError | null) => !!error && MISSING_CODES.includes(error.code);

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

type Affiliate = { id: string; tutor_user_id: string; seat_limit: number };
type UserRow = {
  id: string;
  clerk_id: string;
  first_name: string | null;
  last_name: string | null;
};

async function userById(id: string): Promise<UserRow | null> {
  const { data } = await db()
    .from("users")
    .select("id, clerk_id, first_name, last_name")
    .eq("id", id)
    .maybeSingle();
  return (data as UserRow | null) ?? null;
}

async function affiliateById(id: string): Promise<Affiliate | null> {
  const { data } = await db()
    .from("tutor_affiliates")
    .select("id, tutor_user_id, seat_limit")
    .eq("id", id)
    .maybeSingle();
  return (data as Affiliate | null) ?? null;
}

async function nameOfAffiliate(affiliate: Affiliate): Promise<string> {
  const tutor = await userById(affiliate.tutor_user_id);
  return tutorDisplayName(tutor?.first_name ?? null, tutor?.last_name ?? null);
}

/** The tutor's $199 plan is live: active or trialing, or past due until the paid period ends. */
async function tutorPlanActive(tutorClerkId: string, now: Date): Promise<boolean> {
  const { data, error } = await db()
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", tutorClerkId)
    .eq("plan_id", "tutor-affiliate")
    .limit(5);
  if (missing(error)) {
    console.warn("[tutor-code] subscriptions.plan_id is not in this database yet");
    return false;
  }
  if (error) throw new Error("tutor plan unreadable");
  return ((data ?? []) as { status: string; current_period_end: string | null }[]).some(
    (r) =>
      r.status === "active" ||
      r.status === "trialing" ||
      (r.status === "past_due" &&
        r.current_period_end !== null &&
        Date.parse(r.current_period_end) > now.getTime())
  );
}

/** The live group a student is in, by the tutor's display name. Null when none. */
export async function currentTutor(studentUserId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("tutor_affiliate_redemptions")
    .select("affiliate_id")
    .eq("student_user_id", studentUserId)
    .is("removed_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const affiliate = await affiliateById((data as { affiliate_id: string }).affiliate_id);
  return affiliate ? nameOfAffiliate(affiliate) : null;
}

/** Practice for the student while the tutor's plan is live, through the pricing session's grants. */
async function grantPractice(
  studentClerkId: string,
  tutorClerkId: string,
  redemptionId: string
): Promise<boolean> {
  const { error } = await db().from("plan_grants").upsert(
    {
      user_id: studentClerkId,
      plan_id: "practice",
      source: "tutor-affiliate",
      source_ref: redemptionId,
      sponsor_user_id: tutorClerkId,
      revoked_at: null,
    },
    { onConflict: "source,source_ref,user_id" }
  );
  if (missing(error)) {
    console.warn("[tutor-code] plan_grants is not in this database yet; Practice not granted");
    return false;
  }
  if (error) throw new Error("grant failed");
  return true;
}

export async function redeemTutorCode(
  input: {
    studentUserId: string;
    studentClerkId: string;
    studentRole: string | null;
    rawCode: string;
  },
  now: Date = new Date()
): Promise<TutorCodeResult> {
  const code = normalizeTutorCode(input.rawCode);
  if (!code) return { ok: false, reason: "invalid_code" };
  if (input.studentRole !== "student") return { ok: false, reason: "not_student" };

  const { data: codeRow, error: codeError } = await db()
    .from("tutor_affiliate_codes")
    .select("id, affiliate_id")
    .eq("code", code)
    .is("retired_at", null)
    .maybeSingle();
  if (missing(codeError)) return { ok: false, reason: "unavailable" };
  if (codeError) throw new Error("code lookup failed");
  if (!codeRow) return { ok: false, reason: "invalid_code" };
  const { id: codeId, affiliate_id: affiliateId } = codeRow as { id: string; affiliate_id: string };

  const affiliate = await affiliateById(affiliateId);
  if (!affiliate) return { ok: false, reason: "invalid_code" };
  const tutor = await userById(affiliate.tutor_user_id);
  if (!tutor) return { ok: false, reason: "invalid_code" };
  const tutorName = tutorDisplayName(tutor.first_name, tutor.last_name);

  if (!(await tutorPlanActive(tutor.clerk_id, now))) {
    return { ok: false, reason: "tutor_inactive", tutorName };
  }

  const { data: live } = await db()
    .from("tutor_affiliate_redemptions")
    .select("id, affiliate_id")
    .eq("student_user_id", input.studentUserId)
    .is("removed_at", null)
    .maybeSingle();
  const existing = live as { id: string; affiliate_id: string } | null;
  if (existing?.affiliate_id === affiliate.id) {
    return { ok: true, status: "already_joined", tutorName, practiceOpen: true };
  }
  if (existing) {
    const current = await affiliateById(existing.affiliate_id);
    const currentTutorName = current ? await nameOfAffiliate(current) : "another tutor";
    return { ok: false, reason: "linked_elsewhere", tutorName, currentTutorName };
  }

  const { count: removedBefore } = await db()
    .from("tutor_affiliate_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("student_user_id", input.studentUserId)
    .eq("code_id", codeId)
    .eq("removed_by", "tutor");
  if ((removedBefore ?? 0) > 0) return { ok: false, reason: "removed_by_tutor", tutorName };

  const { count: seatsUsed } = await db()
    .from("tutor_affiliate_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliate.id)
    .is("removed_at", null);
  if ((seatsUsed ?? 0) >= affiliate.seat_limit) return { ok: false, reason: "full", tutorName };

  const { data: inserted, error: insertError } = await db()
    .from("tutor_affiliate_redemptions")
    .insert({
      affiliate_id: affiliate.id,
      code_id: codeId,
      student_user_id: input.studentUserId,
      redeemed_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (insertError) {
    if (insertError.message.includes("tutor_affiliate_seat_limit_reached")) {
      return { ok: false, reason: "full", tutorName };
    }
    if (insertError.code === "23505") {
      return {
        ok: false,
        reason: "linked_elsewhere",
        tutorName,
        currentTutorName: "another tutor",
      };
    }
    throw new Error("redeem failed");
  }
  const practiceOpen = await grantPractice(
    input.studentClerkId,
    tutor.clerk_id,
    (inserted as { id: string }).id
  );
  return { ok: true, status: "joined", tutorName, practiceOpen };
}
