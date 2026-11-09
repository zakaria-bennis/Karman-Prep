import "server-only";
/*
 * School homework: the small, documented interface between the school portal and the
 * student's Homework tab (overnight, 2026-11-08).
 *
 * A teacher assigns work to a class once (school_assignments). Every student seated in that
 * class sees it in their Homework through `listSchoolHomeworkForStudent`; there is no copy per
 * student, so a removed student stops seeing it at once and a student who joins later gets the
 * open work too. The item shape matches the tutor-affiliate session's HomeworkItem (kind,
 * targetId, title, dueOn, status), so the Homework tab can list both side by side.
 *
 * Completion: a skill practice item is done when the student finished a practice set on that
 * skill after it was assigned (catalog practice or the adaptive set), a Domain quiz item when
 * they finished that Domain's quiz. Full-length tests show as open.
 */
import { subSkillTitle } from "@/lib/subskills/taxonomy";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { domainQuiz, practiceSet } from "@/lib/student/quiz-routes";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";

export const SCHOOL_HOMEWORK_KINDS = ["skill_practice", "domain_quiz", "full_length_test"] as const;
export type SchoolHomeworkKind = (typeof SCHOOL_HOMEWORK_KINDS)[number];

export interface SchoolHomeworkItem {
  id: string;
  classId: string;
  className: string;
  kind: SchoolHomeworkKind;
  /** Catalog skill id, SAT Domain id, or null for a full-length test. */
  targetId: string | null;
  title: string;
  /** YYYY-MM-DD */
  dueOn: string;
  status: "assigned" | "completed";
  completedAt: string | null;
  /** Where the student starts the work. */
  href: string;
}

/** The title for a target, or null when the target does not fit the kind. */
export function homeworkTitle(kind: SchoolHomeworkKind, targetId: string | null): string | null {
  if (kind === "full_length_test") return targetId === null ? "Full-length practice test" : null;
  if (kind === "skill_practice") {
    // A sub-skill (founder, 2026-11-08), or a whole catalog skill for older assignments.
    const title = targetId ? subSkillTitle(targetId) : undefined;
    const skill = CATALOG_SKILLS.find((s) => s.id === targetId);
    return title ? `Practice: ${title}` : skill ? `Practice: ${skill.label}` : null;
  }
  const domain = SKILL_DOMAINS.find((d) => d.id === targetId);
  return domain ? `Domain quiz: ${domain.label}` : null;
}

/** A practice set opens the adaptive set, a Domain quiz its quiz, a full-length test the tests page. */
export function homeworkHref(kind: SchoolHomeworkKind, targetId: string | null): string {
  if (kind === "skill_practice" && targetId) return practiceSet(targetId).path;
  if (kind === "domain_quiz" && targetId) return domainQuiz(targetId).path;
  return "/learn/tests";
}

export interface AssignmentRow {
  id: string;
  class_id: string;
  kind: SchoolHomeworkKind;
  target_id: string | null;
  title: string;
  due_on: string;
  created_at: string;
}

export interface FinishedPractice {
  /** The skill (practice set) or Domain (Domain quiz) that was finished. */
  skill_id: string;
  completed_at: string | null;
  /** Which homework kind it completes; a practice set when absent. */
  kind?: "skill_practice" | "domain_quiz";
}

/** When a student finished the assignment, or null while it is open. Pure. */
export function completionFor(
  a: AssignmentRow,
  finished: readonly FinishedPractice[]
): string | null {
  if (a.kind === "full_length_test") return null;
  const done = finished
    .filter(
      (p) =>
        (p.kind ?? "skill_practice") === a.kind &&
        p.skill_id === a.target_id &&
        p.completed_at &&
        p.completed_at >= a.created_at
    )
    .map((p) => p.completed_at as string)
    .sort();
  return done[0] ?? null;
}

type Admin = UntypedAdmin;

/** Open and finished school work for one student, soonest due first. */
export async function listSchoolHomeworkForStudent(
  student: { userId: string; clerkId: string },
  supabase: Admin = untypedAdmin()
): Promise<SchoolHomeworkItem[]> {
  const { data: seats, error: seatError } = await supabase
    .from("school_seats")
    .select("class_id, class:school_classes!school_seats_class_id_fkey (id, name, archived_at)")
    .eq("student_user_id", student.userId)
    .is("removed_at", null);
  if (seatError) throw seatError;
  type SeatRow = {
    class_id: string;
    class:
      | { id: string; name: string; archived_at: string | null }
      | { id: string; name: string; archived_at: string | null }[]
      | null;
  };
  const classes = new Map<string, string>();
  for (const s of (seats ?? []) as SeatRow[]) {
    const c = Array.isArray(s.class) ? s.class[0] : s.class;
    if (c && !c.archived_at) classes.set(c.id, c.name);
  }
  if (!classes.size) return [];
  const [{ data: rows, error }, { data: finished, error: finishedError }, runs] = await Promise.all(
    [
      supabase
        .from("school_assignments")
        .select("id, class_id, kind, target_id, title, due_on, created_at")
        .in("class_id", [...classes.keys()])
        .is("cancelled_at", null),
      supabase
        .from("catalog_practice_sessions")
        .select("skill_id, completed_at")
        .eq("student_id", student.clerkId)
        .not("completed_at", "is", null),
      // The quiz flows' adaptive practice sets and Domain quizzes.
      supabase
        .from("quiz_runs")
        .select("kind, scope, completed_at")
        .eq("student_id", student.clerkId)
        .in("kind", ["practice-set", "domain-quiz"])
        .not("completed_at", "is", null),
    ]
  );
  if (error) throw error;
  if (finishedError) throw finishedError;
  if (runs.error) throw runs.error;
  const done: FinishedPractice[] = [
    ...((finished ?? []) as FinishedPractice[]),
    ...((runs.data ?? []) as { kind: string; scope: string | null; completed_at: string }[]).map(
      (r) => ({
        skill_id: r.scope ?? "",
        completed_at: r.completed_at,
        kind: r.kind === "domain-quiz" ? ("domain_quiz" as const) : ("skill_practice" as const),
      })
    ),
  ];
  return ((rows ?? []) as AssignmentRow[])
    .map((a) => {
      const completedAt = completionFor(a, done);
      return {
        id: a.id,
        classId: a.class_id,
        className: classes.get(a.class_id) ?? "",
        kind: a.kind,
        targetId: a.target_id,
        title: a.title,
        dueOn: a.due_on,
        status: completedAt ? ("completed" as const) : ("assigned" as const),
        completedAt,
        href: homeworkHref(a.kind, a.target_id),
      };
    })
    .sort((x, y) => x.dueOn.localeCompare(y.dueOn));
}
