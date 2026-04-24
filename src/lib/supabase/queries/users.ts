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
}

export interface LinkedStudentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// All users with basic profile info + linked-student counts
// (for parents). Used by /admin/users.
// ─────────────────────────────────────────────────────────────
export async function fetchAdminUsersList(): Promise<AdminUserRow[]> {
  const supabase = createAdminClient();

  const [usersRes, linksRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, clerk_id, email, first_name, last_name, role, created_at")
      .order("role",       { ascending: true })
      .order("first_name", { ascending: true, nullsFirst: false }),
    supabase
      .from("parent_student_links")
      .select("parent_user_id"),
  ]);
  if (usersRes.error) throw usersRes.error;
  if (linksRes.error) throw linksRes.error;

  const linkCounts = new Map<string, number>();
  for (const r of (linksRes.data ?? []) as { parent_user_id: string }[]) {
    linkCounts.set(r.parent_user_id, (linkCounts.get(r.parent_user_id) ?? 0) + 1);
  }

  return (usersRes.data ?? []).map((u) => ({
    id: u.id as string,
    clerk_id: u.clerk_id as string,
    email: u.email as string,
    first_name: (u.first_name as string | null) ?? null,
    last_name:  (u.last_name  as string | null) ?? null,
    role: u.role as AppRole,
    created_at: u.created_at as string,
    linked_student_count: linkCounts.get(u.id as string) ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────
// Students linked to a given parent.
// ─────────────────────────────────────────────────────────────
export async function fetchLinkedStudentsForParent(parentUserId: string): Promise<LinkedStudentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("parent_student_links")
    .select(`
      student:users!parent_student_links_student_user_id_fkey
        (id, first_name, last_name, email)
    `)
    .eq("parent_user_id", parentUserId);
  if (error) throw error;

  type Row = { student: LinkedStudentRow | LinkedStudentRow[] | null };
  return ((data ?? []) as Row[]).flatMap((r) => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    return s ? [s] : [];
  });
}
