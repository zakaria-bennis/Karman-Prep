// ============================================================
// Supabase queries — admin user-management views.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/queries/admin";

export interface AdminUserRow {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  created_at: string;
  /** Count of linked students. Only set when role === 'parent'. */
  linked_student_count: number;
  /** Most-recent active/trialing subscription tier; null if none. */
  tier: "group" | "small_group" | "private" | "elite" | "annual" | null;
  /** All cohort_ids the user is currently an active member of. */
  cohort_ids: string[];
  /** Pending diagnostic retake grants. Admin clicks "Allow retake" to
   *  bump this; the student consumes one per submission. */
  diagnostic_retakes_remaining: number;
}

export interface AdminCohortLite {
  id: string;
  name: string;
  tier: "group" | "small_group";
}

export interface LinkedStudentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// All users with basic profile info + linked-student counts
// (for parents) + active subscription tier + cohort memberships.
// Used by /admin/users.
// ─────────────────────────────────────────────────────────────
export async function fetchAdminUsersList(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();

  const [usersRes, linksRes, subsRes, membersRes] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, clerk_id, email, first_name, last_name, role, created_at, diagnostic_retakes_remaining"
      )
      .order("role", { ascending: true })
      .order("first_name", { ascending: true, nullsFirst: false }),
    supabase.from("parent_student_links").select("parent_user_id"),
    supabase
      .from("subscriptions")
      .select("user_id, tier, status, created_at")
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false }),
    supabase.from("cohort_members").select("user_id, cohort_id").is("left_at", null),
  ]);
  if (usersRes.error) throw usersRes.error;
  if (linksRes.error) throw linksRes.error;
  if (subsRes.error) throw subsRes.error;
  if (membersRes.error) throw membersRes.error;

  const linkCounts = new Map<string, number>();
  for (const r of linksRes.data ?? []) {
    linkCounts.set(r.parent_user_id, (linkCounts.get(r.parent_user_id) ?? 0) + 1);
  }

  // First (most-recent due to ORDER BY) tier per Clerk-userid.
  // subscriptions.user_id is TEXT (Clerk id), not the users.id UUID.
  const tierByClerkId = new Map<string, AdminUserRow["tier"]>();
  for (const r of subsRes.data ?? []) {
    if (!tierByClerkId.has(r.user_id)) {
      tierByClerkId.set(r.user_id, r.tier as AdminUserRow["tier"]);
    }
  }

  const cohortIdsByUuid = new Map<string, string[]>();
  for (const r of membersRes.data ?? []) {
    if (!cohortIdsByUuid.has(r.user_id)) cohortIdsByUuid.set(r.user_id, []);
    cohortIdsByUuid.get(r.user_id)!.push(r.cohort_id);
  }

  return (usersRes.data ?? []).map((u) => ({
    id: u.id,
    clerk_id: u.clerk_id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role as AppRole,
    created_at: u.created_at,
    linked_student_count: linkCounts.get(u.id) ?? 0,
    tier: tierByClerkId.get(u.clerk_id) ?? null,
    cohort_ids: cohortIdsByUuid.get(u.id) ?? [],
    diagnostic_retakes_remaining:
      (u as { diagnostic_retakes_remaining?: number }).diagnostic_retakes_remaining ?? 0,
  }));
}

/** Lightweight cohort list for admin UI dropdowns. */
export async function fetchAdminCohortsLite(): Promise<AdminCohortLite[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("id, name, tier")
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminCohortLite[];
}

// ─────────────────────────────────────────────────────────────
// Students linked to a given parent.
// ─────────────────────────────────────────────────────────────
export async function fetchLinkedStudentsForParent(
  parentUserId: string
): Promise<LinkedStudentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("parent_student_links")
    .select(
      `
      student:users!parent_student_links_student_user_id_fkey
        (id, first_name, last_name, email)
    `
    )
    .eq("parent_user_id", parentUserId);
  if (error) throw error;

  return (data ?? []).flatMap((r) => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    return s ? [s] : [];
  });
}
