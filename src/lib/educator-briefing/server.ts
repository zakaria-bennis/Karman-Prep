import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireBriefingEducator } from "./access";
import {
  savedSessionSchema,
  savedResponseSchema,
  presentSavedSession,
  practiceSummary,
  type SavedSession,
} from "./saved-practice";

const studentIdSchema = z.string().min(1).max(200);
const sessionColumns =
  "id,student_id,skill_id,assignment_id,snapshots,started_at,completed_at,score";
const responseColumns = "session_id,ordinal,question_id,student_answer,is_correct,answered_at";
const assignmentSchema = z.object({
  id: z.string().uuid(),
  student_clerk_id: z.string(),
  catalog_skill_id: z.string(),
  title: z.string(),
  status: z.enum(["draft", "active", "cancelled"]),
  due_at: z.string().datetime({ offset: true }).nullable(),
});

async function responsesFor(db: SupabaseClient, sessions: SavedSession[]) {
  if (!sessions.length) return [];
  const ids = new Set(sessions.map((session) => session.id));
  const result = await db
    .from("catalog_practice_responses")
    .select(responseColumns)
    .in("session_id", [...ids])
    .order("ordinal", { ascending: true });
  if (result.error) throw new Error("Saved answers could not be loaded");
  const responses = z.array(savedResponseSchema).parse(result.data ?? []);
  if (responses.some((row) => !ids.has(row.session_id)))
    throw new Error("Unexpected saved answers");
  return responses;
}

/** Current relationship check precedes all service-role student, assignment and snapshot reads. */
export async function readStudentBriefing(studentClerkId: string) {
  studentIdSchema.parse(studentClerkId);
  await requireBriefingEducator(studentClerkId);
  const db = createAdminClient() as unknown as SupabaseClient;
  const studentResult = await db
    .from("users")
    .select("clerk_id,email,time_zone")
    .eq("clerk_id", studentClerkId)
    .maybeSingle();
  if (studentResult.error) throw new Error("Student could not be loaded");
  if (!studentResult.data) return null;
  const student = z
    .object({
      clerk_id: z.literal(studentClerkId),
      email: z.string(),
      time_zone: z.string().nullable(),
    })
    .parse(studentResult.data);
  const result = await db
    .from("catalog_practice_sessions")
    .select(sessionColumns)
    .eq("student_id", studentClerkId)
    .order("started_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(31);
  if (result.error) throw new Error("Saved practice could not be loaded");
  const all = z.array(savedSessionSchema).parse(result.data ?? []);
  if (all.some((row) => row.student_id !== studentClerkId))
    throw new Error("Unexpected student practice");
  const sessions = all.slice(0, 30);
  const responses = await responsesFor(db, sessions);
  const assignmentIds = [
    ...new Set(
      sessions.flatMap((session) => (session.assignment_id ? [session.assignment_id] : []))
    ),
  ];
  let assignments: z.infer<typeof assignmentSchema>[] = [];
  if (assignmentIds.length) {
    const a = await db
      .from("catalog_assignments")
      .select("id,student_clerk_id,catalog_skill_id,title,status,due_at")
      .eq("student_clerk_id", studentClerkId)
      .in("id", assignmentIds);
    if (a.error) throw new Error("Assigned practice details could not be loaded");
    assignments = z.array(assignmentSchema).parse(a.data ?? []);
    if (
      assignments.some(
        (row) => row.student_clerk_id !== studentClerkId || !assignmentIds.includes(row.id)
      )
    )
      throw new Error("Unexpected assignment");
  }
  const attempts = sessions.map((session) => {
    const assignment = assignments.find((row) => row.id === session.assignment_id);
    if (assignment && assignment.catalog_skill_id !== session.skill_id)
      throw new Error("Assignment skill differs from saved practice");
    return {
      ...practiceSummary(
        presentSavedSession(
          session,
          responses.filter((row) => row.session_id === session.id)
        )
      ),
      assignment: assignment
        ? { title: assignment.title, status: assignment.status, dueAt: assignment.due_at }
        : null,
    };
  });
  return {
    studentClerkId,
    studentEmail: student.email,
    studentTimeZone: student.time_zone,
    attempts,
    hasMore: all.length > 30,
  };
}

/** Historical display only. Does not call start, resume, submit, complete, grade or a writer RPC. */
export async function readEducatorPracticeReview(studentClerkId: string, sessionId: string) {
  studentIdSchema.parse(studentClerkId);
  z.string().uuid().parse(sessionId);
  await requireBriefingEducator(studentClerkId);
  const db = createAdminClient() as unknown as SupabaseClient;
  const result = await db
    .from("catalog_practice_sessions")
    .select(sessionColumns)
    .eq("id", sessionId)
    .eq("student_id", studentClerkId)
    .maybeSingle();
  if (result.error) throw new Error("Saved practice could not be loaded");
  if (!result.data) return null;
  const session = savedSessionSchema.parse(result.data);
  if (session.id !== sessionId || session.student_id !== studentClerkId)
    throw new Error("Unexpected student practice");
  return presentSavedSession(session, await responsesFor(db, [session]));
}
