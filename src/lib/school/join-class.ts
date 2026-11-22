/*
 * A student joins a school class with its code, and the seat gives them a Practice plan of their own
 * (plan-bridge.ts). Only student accounts take a seat, and an archived class takes no one. The
 * student is always the signed-in account, resolved by the caller (settings-people-actions.ts).
 * Server only. Answers in plain words for the page, never by redirecting.
 */
import "server-only";
import { grantSchoolPractice } from "./plan-bridge";
import { untypedAdmin } from "./db";

export type JoinClassResult = { ok: true; joined: string } | { ok: false; error: string };

/** `code` is already normalized and checked (classCodeSchema). */
export async function joinSchoolClass(
  student: { id: string; clerkId: string; role: string | null },
  code: string
): Promise<JoinClassResult> {
  if (student.role !== "student")
    return { ok: false, error: "Only student accounts can join a class." };
  const supabase = untypedAdmin();
  const { data: cls } = await supabase
    .from("school_classes")
    .select("id, name, school_id, archived_at, school:schools!school_classes_school_id_fkey (name)")
    .eq("join_code", code)
    .maybeSingle();
  if (!cls || cls.archived_at)
    return { ok: false, error: "No class has that code. Check it with your teacher." };
  const { data: existing } = await supabase
    .from("school_seats")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_user_id", student.id)
    .is("removed_at", null)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase
      .from("school_seats")
      .insert({ school_id: cls.school_id, class_id: cls.id, student_user_id: student.id });
    if (error && error.code !== "23505") {
      console.error("[school] seat insert failed:", error.message);
      return { ok: false, error: "We couldn't add you just now. Try again in a moment." };
    }
  }
  await grantSchoolPractice({ studentClerkId: student.clerkId, schoolId: cls.school_id as string });
  const school = (Array.isArray(cls.school) ? cls.school[0] : cls.school) as {
    name?: string;
  } | null;
  return { ok: true, joined: `${cls.name as string}${school?.name ? ` at ${school.name}` : ""}` };
}
