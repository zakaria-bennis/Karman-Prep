import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  CalendarSource,
  PostedHomework,
  PostedPractice,
  SavedSession,
  StudentCalendarData,
} from "./week-calendar";

type Db = ReturnType<typeof createAdminClient>;

function withinQueryWindow(asOf: string) {
  const now = Date.parse(asOf);
  const day = 86_400_000;
  // Cover seven local days in every IANA zone, including DST boundaries.
  return {
    from: new Date(now - 2 * day).toISOString(),
    until: new Date(now + 9 * day).toISOString(),
  };
}

async function readSessions(db: Db, studentUuid: string, asOf: string): Promise<SavedSession[]> {
  const window = withinQueryWindow(asOf);
  const { data, error } = await db
    .from("bookings")
    .select("id, plan_tier, scheduled_start, scheduled_end")
    .eq("student_id", studentUuid)
    .eq("status", "scheduled")
    .gte("scheduled_start", window.from)
    .lt("scheduled_start", window.until)
    .order("scheduled_start", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavedSession[];
}

async function readCohortHomework(db: Db, studentUuid: string): Promise<PostedHomework[]> {
  const { data: memberships, error: membershipError } = await db
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", studentUuid)
    .is("left_at", null);
  if (membershipError) throw membershipError;
  const cohortIds = [...new Set((memberships ?? []).map((row) => row.cohort_id))];
  if (cohortIds.length === 0) return [];
  const { data, error } = await db
    .from("cohort_homework")
    .select("id, title, body, assigned_at, due_at")
    .in("cohort_id", cohortIds)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PostedHomework[];
}

async function readAssignedPractice(db: Db, studentClerkId: string): Promise<PostedPractice[]> {
  // This table is in the accepted local canonical contract. Its migration is
  // not yet live or in generated types; a missing table is shown as unavailable.
  const catalogDb = db as unknown as SupabaseClient;
  const { data, error } = await catalogDb
    .from("catalog_assignments")
    .select("id, title, catalog_skill_id, created_at, due_at")
    .eq("student_clerk_id", studentClerkId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PostedPractice[];
}

function settledSource<T>(result: PromiseSettledResult<T[]>): CalendarSource<T> {
  if (result.status === "fulfilled") return { state: "ready", items: result.value };
  return { state: "unavailable", items: [] };
}

/** Service-role reads are scoped to the authenticated student's two identities. */
export async function loadStudentCalendarData(
  studentUuid: string,
  studentClerkId: string,
  asOf: string
): Promise<StudentCalendarData> {
  const db = createAdminClient();
  const [sessions, cohortHomework, practiceAssignments] = await Promise.allSettled([
    readSessions(db, studentUuid, asOf),
    readCohortHomework(db, studentUuid),
    readAssignedPractice(db, studentClerkId),
  ]);
  if (sessions.status === "rejected")
    console.error("[student calendar] sessions read failed", sessions.reason);
  if (cohortHomework.status === "rejected")
    console.error("[student calendar] cohort work read failed", cohortHomework.reason);
  if (practiceAssignments.status === "rejected")
    console.error("[student calendar] assigned practice read failed", practiceAssignments.reason);
  return {
    sessions: settledSource(sessions),
    cohortHomework: settledSource(cohortHomework),
    practiceAssignments: settledSource(practiceAssignments),
  };
}
