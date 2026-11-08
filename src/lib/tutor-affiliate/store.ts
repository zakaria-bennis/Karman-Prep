// ============================================================
// Tutor affiliate plan — Supabase implementation of AffiliateStore.
// Service role only: callers must have checked identity first
// (see ./server.ts). Invariants live in the database
// (20261108043000_tutor_affiliate.sql); this file maps its
// errors back to typed ones.
// ============================================================

import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import {
  CodeTakenError,
  SeatLimitReachedError,
  StudentAlreadyLinkedError,
  type AffiliateCode,
  type AffiliateLink,
  type AffiliateRecord,
  type AffiliateStore,
  type AffiliateUser,
  type LinkRemover,
} from "./types";

// The generated Database types predate these tables.
function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

const USER_COLUMNS = "id, clerk_id, role, first_name, last_name, email";
const LINK_COLUMNS =
  "id, affiliate_id, code_id, student_user_id, redeemed_at, removed_at, removed_by, student_notice_seen_at";
const CODE_COLUMNS = "id, affiliate_id, code, created_at, retired_at";

type UserRow = {
  id: string;
  clerk_id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
};
type LinkRow = {
  id: string;
  affiliate_id: string;
  code_id: string;
  student_user_id: string;
  redeemed_at: string;
  removed_at: string | null;
  removed_by: LinkRemover | null;
  student_notice_seen_at: string | null;
};
type CodeRow = {
  id: string;
  affiliate_id: string;
  code: string;
  created_at: string;
  retired_at: string | null;
};
type AffiliateRow = { id: string; tutor_user_id: string; seat_limit: number };

const toUser = (r: UserRow): AffiliateUser => ({
  id: r.id,
  clerkId: r.clerk_id,
  role: r.role,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
});
const toLink = (r: LinkRow): AffiliateLink => ({
  id: r.id,
  affiliateId: r.affiliate_id,
  codeId: r.code_id,
  studentUserId: r.student_user_id,
  redeemedAt: r.redeemed_at,
  removedAt: r.removed_at,
  removedBy: r.removed_by,
  studentNoticeSeenAt: r.student_notice_seen_at,
});
const toCode = (r: CodeRow): AffiliateCode => ({
  id: r.id,
  affiliateId: r.affiliate_id,
  code: r.code,
  createdAt: r.created_at,
  retiredAt: r.retired_at,
});
const toAffiliate = (r: AffiliateRow): AffiliateRecord => ({
  id: r.id,
  tutorUserId: r.tutor_user_id,
  seatLimit: r.seat_limit,
});

function fail(error: PostgrestError | null): void {
  if (error) throw new Error(`Tutor plan data could not be loaded (${error.code}).`);
}

export const supabaseAffiliateStore: AffiliateStore = {
  async userByClerkId(clerkId) {
    const { data, error } = await db()
      .from("users")
      .select(USER_COLUMNS)
      .eq("clerk_id", clerkId)
      .maybeSingle();
    fail(error);
    return data ? toUser(data as UserRow) : null;
  },

  async usersByIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await db()
      .from("users")
      .select(USER_COLUMNS)
      .in("id", [...ids]);
    fail(error);
    return ((data ?? []) as UserRow[]).map(toUser);
  },

  async setUserRole(userId, role) {
    // Only a plain student account is ever promoted; staff roles stay as they are.
    const { error } = await db()
      .from("users")
      .update({ role })
      .eq("id", userId)
      .eq("role", "student");
    fail(error);
  },

  async affiliateById(id) {
    const { data, error } = await db()
      .from("tutor_affiliates")
      .select("id, tutor_user_id, seat_limit")
      .eq("id", id)
      .maybeSingle();
    fail(error);
    return data ? toAffiliate(data as AffiliateRow) : null;
  },

  async affiliateByTutor(tutorUserId) {
    const { data, error } = await db()
      .from("tutor_affiliates")
      .select("id, tutor_user_id, seat_limit")
      .eq("tutor_user_id", tutorUserId)
      .maybeSingle();
    fail(error);
    return data ? toAffiliate(data as AffiliateRow) : null;
  },

  async ensureAffiliate(tutorUserId) {
    const { error } = await db()
      .from("tutor_affiliates")
      .upsert(
        { tutor_user_id: tutorUserId },
        { onConflict: "tutor_user_id", ignoreDuplicates: true }
      );
    fail(error);
    const record = await this.affiliateByTutor(tutorUserId);
    if (!record) throw new Error("Tutor plan could not be set up.");
    return record;
  },

  async liveCodeByValue(code) {
    const { data, error } = await db()
      .from("tutor_affiliate_codes")
      .select(CODE_COLUMNS)
      .eq("code", code)
      .is("retired_at", null)
      .maybeSingle();
    fail(error);
    return data ? toCode(data as CodeRow) : null;
  },

  async liveCodeForAffiliate(affiliateId) {
    const { data, error } = await db()
      .from("tutor_affiliate_codes")
      .select(CODE_COLUMNS)
      .eq("affiliate_id", affiliateId)
      .is("retired_at", null)
      .maybeSingle();
    fail(error);
    return data ? toCode(data as CodeRow) : null;
  },

  async replaceLiveCode(affiliateId, code) {
    const { data, error } = await db().rpc("tutor_affiliate_replace_code", {
      p_affiliate_id: affiliateId,
      p_code: code,
    });
    if (error?.code === "23505") throw new CodeTakenError();
    fail(error);
    const row = (Array.isArray(data) ? data[0] : data) as CodeRow | undefined;
    if (!row) throw new Error("The new code was not saved.");
    return toCode(row);
  },

  async liveLinksForAffiliate(affiliateId) {
    const { data, error } = await db()
      .from("tutor_affiliate_redemptions")
      .select(LINK_COLUMNS)
      .eq("affiliate_id", affiliateId)
      .is("removed_at", null)
      .order("redeemed_at", { ascending: true });
    fail(error);
    return ((data ?? []) as LinkRow[]).map(toLink);
  },

  async liveLinkForStudent(studentUserId) {
    const { data, error } = await db()
      .from("tutor_affiliate_redemptions")
      .select(LINK_COLUMNS)
      .eq("student_user_id", studentUserId)
      .is("removed_at", null)
      .maybeSingle();
    fail(error);
    return data ? toLink(data as LinkRow) : null;
  },

  async latestLinkForStudent(studentUserId) {
    const { data, error } = await db()
      .from("tutor_affiliate_redemptions")
      .select(LINK_COLUMNS)
      .eq("student_user_id", studentUserId)
      .order("redeemed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail(error);
    return data ? toLink(data as LinkRow) : null;
  },

  async tutorRemovedStudentFromCode(studentUserId, codeId) {
    const { data, error } = await db()
      .from("tutor_affiliate_redemptions")
      .select("id")
      .eq("student_user_id", studentUserId)
      .eq("code_id", codeId)
      .in("removed_by", ["tutor", "admin"])
      .limit(1);
    fail(error);
    return (data ?? []).length > 0;
  },

  async insertLink(input) {
    const { data, error } = await db()
      .from("tutor_affiliate_redemptions")
      .insert({
        affiliate_id: input.affiliateId,
        code_id: input.codeId,
        student_user_id: input.studentUserId,
        redeemed_at: input.at,
      })
      .select(LINK_COLUMNS)
      .single();
    if (error?.message?.includes("tutor_affiliate_seat_limit_reached")) {
      throw new SeatLimitReachedError();
    }
    if (error?.code === "23505") throw new StudentAlreadyLinkedError();
    fail(error);
    return toLink(data as LinkRow);
  },

  async endLink(linkId, removedBy, at) {
    const { error } = await db()
      .from("tutor_affiliate_redemptions")
      .update({ removed_at: at, removed_by: removedBy })
      .eq("id", linkId)
      .is("removed_at", null);
    fail(error);
  },

  async markNoticeSeen(linkId, at) {
    const { error } = await db()
      .from("tutor_affiliate_redemptions")
      .update({ student_notice_seen_at: at })
      .eq("id", linkId)
      .is("student_notice_seen_at", null);
    fail(error);
  },
};
