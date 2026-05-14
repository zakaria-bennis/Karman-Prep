"use server";

// ============================================================
// Server Actions — Admin user management
// Role-gated: admin only (via the REAL role, not the
// impersonated one — so you can't elevate yourself while
// impersonating as student).
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole, type AppRole } from "@/lib/supabase/queries/admin";
import {
  linkParentStudentInputSchema,
  setUserRoleInputSchema,
  unlinkParentStudentInputSchema,
} from "../schemas";

async function guardAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const role = await fetchUserRole(userId); // real role, not impersonated
  if (role !== "admin") throw new Error("Admin role required");
  return userId;
}

export async function actionSetUserRole(targetUserId: string, nextRole: AppRole) {
  // Schema enforces non-empty targetUserId + valid AppRole.
  setUserRoleInputSchema.parse({ targetUserId, nextRole });
  await guardAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase.from("users").update({ role: nextRole }).eq("id", targetUserId);
  if (error) throw new Error(error.message);

  // If the user was demoted from parent, their links remain — on purpose.
  // Admin can re-promote and the links are intact. Manual cleanup if needed.

  revalidatePath("/admin/users");
}

export async function actionLinkParentToStudent(parentUserId: string, studentUserId: string) {
  // Schema enforces non-empty IDs + parentUserId !== studentUserId.
  linkParentStudentInputSchema.parse({ parentUserId, studentUserId });
  await guardAdmin();

  const supabase = createAdminClient();

  // Sanity-check roles — keep bad data out even though RLS/CHECK aren't
  // enforcing it at the DB level.
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, role")
    .in("id", [parentUserId, studentUserId]);
  if (usersErr) throw new Error(usersErr.message);

  const parent = users?.find((u) => u.id === parentUserId);
  const student = users?.find((u) => u.id === studentUserId);
  if (!parent || parent.role !== "parent") throw new Error("Parent user must have role='parent'");
  if (!student || student.role !== "student")
    throw new Error("Student user must have role='student'");

  const { error } = await supabase
    .from("parent_student_links")
    .insert({ parent_user_id: parentUserId, student_user_id: studentUserId });
  if (error && error.code !== "23505") {
    // 23505 = unique_violation (already linked)
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}

export async function actionUnlinkParentFromStudent(parentUserId: string, studentUserId: string) {
  unlinkParentStudentInputSchema.parse({ parentUserId, studentUserId });
  await guardAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("parent_student_links")
    .delete()
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
