// ============================================================
// Database access for scholarship claims (server only).
//
// The scholarship tables are newer than src/types/supabase.ts
// (generated from production), so this module uses an untyped
// client and parses every row with Zod instead.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { claimRowSchema, eventRowSchema, type ClaimRow, type EventRow } from "./schemas";
import type { RankInput } from "./ranking";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

export interface StudentRecord {
  id: string;
  clerkId: string;
  role: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface CohortRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  satDate: string | null;
}

export async function getUserByClerkId(clerkId: string): Promise<StudentRecord | null> {
  const { data } = await db()
    .from("users")
    .select("id, clerk_id, role, email, first_name, last_name")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    clerkId: data.clerk_id,
    role: data.role,
    email: data.email ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

export async function getUserById(userId: string): Promise<StudentRecord | null> {
  const { data } = await db()
    .from("users")
    .select("id, clerk_id, role, email, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    clerkId: data.clerk_id,
    role: data.role,
    email: data.email ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
  };
}

function toCohort(row: {
  id: string;
  name: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  sat_date: string | null;
}): CohortRecord {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    endedAt: row.ended_at,
    satDate: row.sat_date,
  };
}

/** Every cohort the student belongs to or belonged to, newest first. */
export async function getStudentCohorts(userId: string): Promise<CohortRecord[]> {
  const { data } = await db()
    .from("cohort_members")
    .select("cohort_id, joined_at, cohorts(id, name, status, created_at, ended_at, sat_date)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  const out: CohortRecord[] = [];
  for (const row of (data ?? []) as Array<{ cohorts: unknown }>) {
    const c = Array.isArray(row.cohorts) ? row.cohorts[0] : row.cohorts;
    if (c) out.push(toCohort(c as Parameters<typeof toCohort>[0]));
  }
  return out;
}

export async function getCohort(cohortId: string): Promise<CohortRecord | null> {
  const { data } = await db()
    .from("cohorts")
    .select("id, name, status, created_at, ended_at, sat_date")
    .eq("id", cohortId)
    .maybeSingle();
  return data ? toCohort(data) : null;
}

/** The cohort's window: first day, last day (ended_at, else its SAT date). */
export function cohortWindow(c: CohortRecord): { start: string | null; end: string | null } {
  return {
    start: c.createdAt ? c.createdAt.slice(0, 10) : null,
    end: (c.endedAt ?? c.satDate)?.slice(0, 10) ?? null,
  };
}

export async function getClaim(claimId: string): Promise<ClaimRow | null> {
  const { data } = await db()
    .from("scholarship_claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  return data ? claimRowSchema.parse(data) : null;
}

export async function getClaimFor(cohortId: string, userId: string): Promise<ClaimRow | null> {
  const { data } = await db()
    .from("scholarship_claims")
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? claimRowSchema.parse(data) : null;
}

export async function listStudentClaims(userId: string): Promise<ClaimRow[]> {
  const { data } = await db()
    .from("scholarship_claims")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });
  return (data ?? []).map((r) => claimRowSchema.parse(r));
}

export async function hashUsedByOtherStudent(sha256: string, userId: string): Promise<boolean> {
  const { data } = await db()
    .from("scholarship_claims")
    .select("id")
    .eq("report_sha256", sha256)
    .neq("user_id", userId)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function upsertClaim(row: Record<string, unknown>): Promise<ClaimRow> {
  const { data, error } = await db()
    .from("scholarship_claims")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return claimRowSchema.parse(data);
}

/** Update only when the claim is still in one of the expected statuses (no lost races). */
export async function updateClaim(
  claimId: string,
  patch: Record<string, unknown>,
  expect?: { status?: string[]; payoutStatus?: string[] }
): Promise<ClaimRow | null> {
  let q = db().from("scholarship_claims").update(patch).eq("id", claimId);
  if (expect?.status) q = q.in("status", expect.status);
  if (expect?.payoutStatus) q = q.in("payout_status", expect.payoutStatus);
  const { data, error } = await q.select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? claimRowSchema.parse(data) : null;
}

export async function addEvent(
  claimId: string,
  kind: string,
  actorUserId: string | null,
  detail: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await db()
    .from("scholarship_claim_events")
    .insert({ claim_id: claimId, kind, actor_user_id: actorUserId, detail });
  if (error) console.error("[scholarship] event insert failed", error.message);
}

export async function listEvents(claimId: string): Promise<EventRow[]> {
  const { data } = await db()
    .from("scholarship_claim_events")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => eventRowSchema.parse(r));
}

export interface AdminClaimListItem extends ClaimRow {
  studentName: string;
  studentEmail: string | null;
  cohortName: string;
}

export async function listClaimsForAdmin(): Promise<AdminClaimListItem[]> {
  const { data, error } = await db()
    .from("scholarship_claims")
    .select("*, users!scholarship_claims_user_id_fkey(first_name, last_name, email), cohorts(name)")
    .order("submitted_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown> & {
      users?: { first_name: string | null; last_name: string | null; email: string | null } | null;
      cohorts?: { name: string } | null;
    };
    const name = [r.users?.first_name, r.users?.last_name].filter(Boolean).join(" ");
    return {
      ...claimRowSchema.parse(r),
      studentName: name || r.users?.email || "Unknown student",
      studentEmail: r.users?.email ?? null,
      cohortName: r.cohorts?.name ?? "Unknown cohort",
    };
  });
}

export function toRankInput(c: ClaimRow): RankInput {
  return {
    id: c.id,
    cohortId: c.cohort_id,
    status: c.status,
    extractedTotal: c.extracted_total_score,
    declaredTotal: c.declared_total_score,
    extractedTestDate: c.extracted_test_date,
    declaredTestDate: c.declared_test_date,
    submittedAt: c.submitted_at,
    awardCents: c.award_cents,
  };
}

export async function cohortClaims(cohortId: string): Promise<ClaimRow[]> {
  const { data } = await db().from("scholarship_claims").select("*").eq("cohort_id", cohortId);
  return (data ?? []).map((r) => claimRowSchema.parse(r));
}
