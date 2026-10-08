import { createAdminClient } from "@/lib/supabase/server";
import {
  comparePracticeDomains,
  utcWeek,
  type LinkedParentStudent,
  type Section,
  type WeeklyParentView,
} from "./weekly-model";

type Client = ReturnType<typeof createAdminClient>;

export async function listLinkedParentStudents(parentClerkId: string): Promise<{
  parentId: string | null;
  students: LinkedParentStudent[];
}> {
  const db = createAdminClient();
  const { data: parent, error: parentError } = await db
    .from("users")
    .select("id")
    .eq("clerk_id", parentClerkId)
    .maybeSingle();
  if (parentError) throw parentError;
  if (!parent) return { parentId: null, students: [] };

  const { data, error } = await db
    .from("parent_student_links")
    .select(
      "student:users!parent_student_links_student_user_id_fkey(id, clerk_id, first_name, last_name)"
    )
    .eq("parent_user_id", parent.id);
  if (error) throw error;
  const students = (data ?? []).flatMap((row) => {
    const student = Array.isArray(row.student) ? row.student[0] : row.student;
    return student ? [student as LinkedParentStudent] : [];
  });
  students.sort((a, b) => studentName(a).localeCompare(studentName(b)));
  return { parentId: parent.id, students };
}

export function studentName(student: LinkedParentStudent): string {
  return [student.first_name, student.last_name].filter(Boolean).join(" ") || "Student";
}

/** Never query student data until the exact parent link is confirmed. */
export async function loadLinkedStudentWeek(
  parentId: string,
  student: LinkedParentStudent,
  now: Date = new Date()
): Promise<WeeklyParentView | null> {
  const db = createAdminClient();
  const { data: link, error: linkError } = await db
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", parentId)
    .eq("student_user_id", student.id)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) return null;

  const week = utcWeek(now);
  const [attempts, diagnostics, bookings, memberships] = await Promise.all([
    db
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.clerk_id)
      .gte("completed_at", week.start)
      .lt("completed_at", week.end),
    db
      .from("diagnostic_results")
      .select("taken_at, domain_scores")
      .eq("user_id", student.id)
      .order("taken_at", { ascending: false })
      .limit(2),
    db
      .from("bookings")
      .select("scheduled_start")
      .eq("student_id", student.id)
      .eq("status", "scheduled")
      .gt("scheduled_start", now.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(1),
    db.from("cohort_members").select("cohort_id").eq("user_id", student.id).is("left_at", null),
  ]);

  const completedPractice: Section<number> = attempts.error
    ? { status: "unavailable" }
    : { status: "ready", value: attempts.count ?? 0 };
  const practiceSkills: WeeklyParentView["practiceSkills"] = diagnostics.error
    ? { status: "unavailable" }
    : {
        status: "ready",
        value: comparePracticeDomains(diagnostics.data?.[0] ?? null, diagnostics.data?.[1] ?? null),
      };
  const nextSession: WeeklyParentView["nextSession"] = bookings.error
    ? { status: "unavailable" }
    : {
        status: "ready",
        value: bookings.data?.[0] ? { startsAt: bookings.data[0].scheduled_start } : null,
      };
  const assignments = await loadCohortPosts(db, memberships);

  return {
    student,
    weekStart: week.start,
    weekEnd: week.end,
    completedPractice,
    practiceSkills,
    nextSession,
    assignments,
  };
}

async function loadCohortPosts(
  db: Client,
  memberships: {
    data: Array<{ cohort_id: string }> | null;
    error: unknown;
  }
): Promise<WeeklyParentView["assignments"]> {
  if (memberships.error) return { status: "unavailable" };
  const ids = (memberships.data ?? []).map((row) => row.cohort_id);
  if (ids.length === 0) return { status: "ready", value: [] };
  const { data, error } = await db
    .from("cohort_homework")
    .select("id, title, due_at")
    .in("cohort_id", ids)
    .order("assigned_at", { ascending: false })
    .limit(3);
  return error
    ? { status: "unavailable" }
    : {
        status: "ready",
        value: (data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.due_at,
        })),
      };
}
