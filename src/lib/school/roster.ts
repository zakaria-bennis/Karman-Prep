import "server-only";
/*
 * A class roster for the school portal: each seated student with a progress ring (both
 * courses' way to Conquered) and skill squares by Domain, plus how many of the class's
 * assignments they finished. Never question-level detail.
 */
import { buildProgressGlance, type ProgressGlance } from "@/lib/progress-glance/levels";
import { loadPracticeActivity } from "@/lib/progress-glance/server";
import { untypedAdmin } from "@/lib/school/db";
import { completionFor, type AssignmentRow, type FinishedPractice } from "./homework";

export interface RosterStudent {
  seatId: string;
  userId: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  glance: ProgressGlance;
  /** 0 to 100 across both courses. */
  percent: number;
  assignmentsDone: number;
  lastPracticedAt: string | null;
}

export interface ClassAssignment extends AssignmentRow {
  done: number;
}

export interface ClassRoster {
  students: RosterStudent[];
  assignments: ClassAssignment[];
}

const WEEK_MS = 7 * 86_400_000;

export async function loadClassRoster(
  schoolId: string,
  classId: string,
  now: Date = new Date()
): Promise<ClassRoster> {
  const supabase = untypedAdmin();
  const [{ data: seats, error: seatError }, { data: assignments, error: aError }] =
    await Promise.all([
      supabase
        .from("school_seats")
        .select(
          "id, joined_at, student:users!school_seats_student_user_id_fkey (id, clerk_id, first_name, last_name, email)"
        )
        .eq("school_id", schoolId)
        .eq("class_id", classId)
        .is("removed_at", null)
        .order("joined_at", { ascending: true }),
      supabase
        .from("school_assignments")
        .select("id, class_id, kind, target_id, title, due_on, created_at")
        .eq("class_id", classId)
        .is("cancelled_at", null)
        .order("due_on", { ascending: true }),
    ]);
  if (seatError) throw seatError;
  if (aError) throw aError;
  type UserRow = {
    id: string;
    clerk_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  type SeatRow = { id: string; joined_at: string; student: UserRow | UserRow[] | null };
  const people = ((seats ?? []) as SeatRow[]).flatMap((s) => {
    const u = Array.isArray(s.student) ? s.student[0] : s.student;
    return u ? [{ seatId: s.id, joinedAt: s.joined_at, user: u }] : [];
  });
  const clerkIds = people.map((p) => p.user.clerk_id);
  const [activity, { data: finished, error: fError }] = await Promise.all([
    loadPracticeActivity(clerkIds, new Date(now.getTime() - WEEK_MS), supabase),
    clerkIds.length
      ? supabase
          .from("catalog_practice_sessions")
          .select("student_id, skill_id, completed_at")
          .in("student_id", clerkIds)
          .not("completed_at", "is", null)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (fError) throw fError;
  const finishedBy = new Map<string, FinishedPractice[]>();
  for (const f of (finished ?? []) as (FinishedPractice & { student_id: string })[]) {
    const list = finishedBy.get(f.student_id) ?? [];
    list.push(f);
    finishedBy.set(f.student_id, list);
  }
  const rows = (assignments ?? []) as AssignmentRow[];
  const doneCounts = new Map<string, number>(rows.map((a) => [a.id, 0]));
  const students: RosterStudent[] = people.map((p) => {
    const act = activity.get(p.user.clerk_id);
    const glance = buildProgressGlance(act?.answers ?? [], now, act?.stored);
    const mine = finishedBy.get(p.user.clerk_id) ?? [];
    let assignmentsDone = 0;
    for (const a of rows) {
      if (completionFor(a, mine)) {
        assignmentsDone += 1;
        doneCounts.set(a.id, (doneCounts.get(a.id) ?? 0) + 1);
      }
    }
    const name =
      [p.user.first_name, p.user.last_name].filter(Boolean).join(" ") || p.user.email || "Student";
    return {
      seatId: p.seatId,
      userId: p.user.id,
      clerkId: p.user.clerk_id,
      name,
      joinedAt: p.joinedAt,
      glance,
      percent: Math.round((glance.coursePercent.math + glance.coursePercent.reading) / 2),
      assignmentsDone,
      lastPracticedAt: act?.lastPracticedAt ?? null,
    };
  });
  return {
    students,
    assignments: rows.map((a) => ({ ...a, done: doneCounts.get(a.id) ?? 0 })),
  };
}

/** Active seats per class, for the class list. */
export async function seatCounts(schoolId: string): Promise<Map<string, number>> {
  const supabase = untypedAdmin();
  const { data, error } = await supabase
    .from("school_seats")
    .select("class_id, student_user_id")
    .eq("school_id", schoolId)
    .is("removed_at", null);
  if (error) throw error;
  const out = new Map<string, number>();
  for (const r of (data ?? []) as { class_id: string }[])
    out.set(r.class_id, (out.get(r.class_id) ?? 0) + 1);
  return out;
}

/** Distinct seated students across the school: the number the renewal bills. */
export async function schoolStudentCount(schoolId: string): Promise<number> {
  const supabase = untypedAdmin();
  const { data, error } = await supabase
    .from("school_seats")
    .select("student_user_id")
    .eq("school_id", schoolId)
    .is("removed_at", null);
  if (error) throw error;
  return new Set(((data ?? []) as { student_user_id: string }[]).map((r) => r.student_user_id))
    .size;
}
