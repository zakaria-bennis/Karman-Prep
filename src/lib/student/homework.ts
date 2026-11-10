/*
 * Student homework: work a tutor or cohort assigns, grouped the way Canvas does it
 * (founder, 2026-11-07): Past due, Tonight, Tomorrow, This week, Later, and Done.
 *
 * Sources, all read on the server:
 *   - tutor_homework       (tutor-affiliate session): skill practice, Domain quiz, full-length test.
 *                          Read when the table exists; before that merge it is simply empty.
 *   - catalog_assignments  a tutor's assigned 10-question practice set (done when a completed
 *                          catalog practice session points at it).
 *   - student_assignments  the Oct 27 time trials and full-length tests a tutor opens on the day
 *                          (states from ./unlocks: open, scheduled, locked, done).
 *   - cohort_homework      the cohort's posts. There is no completion record, so a post stays
 *                          open until it is due, shows in Past due for 3 days, then drops off.
 *
 * Time estimates count active time only (founder, 2026-11-07): each answer is capped at
 * 2 minutes so long pauses don't count, sets answered faster than 8 seconds a question are
 * ignored as rushed, and the student's pace is blended with everyone's until they have 30
 * answers of their own. Days are counted in Central time.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { catalogSessionHref } from "@/lib/catalog-practice/student-entry";
import { listSchoolHomeworkForStudent } from "@/lib/school/homework";
import { createAdminClient } from "@/lib/supabase/server";
import { assignedSetHref, courseSlug, practiceHref } from "./course";
import {
  COHORT_LATE_DAYS,
  FULL_LENGTH,
  PAUSE_CAP_SECONDS,
  RUSHED_MEDIAN_SECONDS,
  activeSeconds,
  blendedPace,
  median,
  type HomeworkResult,
  type StudentHomeworkItem,
} from "./homework-model";
import { CB_MODULE, type TrialSection } from "./time-trial";
import { assignmentState, type Assignment } from "./unlocks";

export * from "./homework-model";

const PRACTICE_SET_QUESTIONS = 10;
const DOMAIN_QUIZ_QUESTIONS = 12;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------- reading the database

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** A table another session adds may not exist yet: treat that as no rows. */
function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the table/i.test(error.message ?? "")
  );
}

async function rows(
  query: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
): Promise<Row[]> {
  const { data, error } = await query;
  if (error) {
    if (!missingTable(error)) console.error("[homework] read failed:", error.code ?? error.message);
    return [];
  }
  return (data ?? []) as Row[];
}

const skillLabel = (id: string | null) => CATALOG_SKILLS.find((s) => s.id === id)?.label ?? null;

function domainHref(domainId: string | null): string {
  const domain = SKILL_DOMAINS.find((d) => d.id === domainId);
  if (!domain) return "/dashboard/student/library";
  return `/dashboard/student/library/${courseSlug(domain.subject)}?domain=${encodeURIComponent(domain.id)}`;
}

interface SessionInfo {
  id: string;
  skillId: string;
  assignmentId: string | null;
  completedAt: string | null;
  answers: { correct: boolean; seconds: number }[];
}

function sessionResult(s: SessionInfo): HomeworkResult | null {
  if (s.answers.length === 0) return null;
  return {
    correct: s.answers.filter((a) => a.correct).length,
    total: s.answers.length,
    seconds: s.answers.reduce((n, a) => n + Math.min(PAUSE_CAP_SECONDS, a.seconds), 0),
    reviewHref: catalogSessionHref(s.skillId, s.id),
  };
}

export interface StudentHomework {
  items: StudentHomeworkItem[];
  /** Typical active seconds per question for this student. */
  paceSeconds: number;
}

/**
 * Every piece of homework for one student. `withResults: false` skips the practice history
 * (results and pace), for the tab badge.
 */
export async function loadStudentHomework(
  ids: { userId: string; clerkId: string },
  options: { withResults?: boolean; nowMs?: number } = {}
): Promise<StudentHomework> {
  const withResults = options.withResults ?? true;
  const nowMs = options.nowMs ?? Date.now();
  const client = db();

  const [tutorRows, catalogRows, trialRows, memberRows, schoolItems] = await Promise.all([
    rows(
      client
        .from("tutor_homework")
        .select(
          "id, assigned_by_user_id, kind, target_id, title, note, due_on, status, completed_at, created_at"
        )
        .eq("student_user_id", ids.userId)
        .neq("status", "cancelled")
        .limit(300)
    ),
    rows(
      client
        .from("catalog_assignments")
        .select("id, educator_clerk_id, catalog_skill_id, title, due_at, created_at")
        .eq("student_clerk_id", ids.clerkId)
        .eq("status", "active")
        .limit(300)
    ),
    rows(
      client
        .from("student_assignments")
        .select("id, kind, section, title, scheduled_for, unlocked_at, completed_at, created_by")
        .eq("student_id", ids.clerkId)
        .limit(300)
    ),
    rows(
      client
        .from("cohort_members")
        .select("cohort_id")
        .eq("user_id", ids.userId)
        .is("left_at", null)
    ),
    // A school student's teacher assignments. A school read failure never hides the rest.
    listSchoolHomeworkForStudent(ids).catch((error: unknown) => {
      console.error(
        "[homework] school read failed:",
        error instanceof Error ? error.message : error
      );
      return [];
    }),
  ]);

  const cohortIds = memberRows.map((r) => str(r.cohort_id)).filter((x): x is string => !!x);
  const catalogIds = catalogRows.map((r) => r.id as string);
  const trialIds = trialRows.map((r) => r.id as string);
  const [cohortRows, itemRows, runRows, sessionRows, everyoneRows] = await Promise.all([
    cohortIds.length
      ? rows(
          client
            .from("cohort_homework")
            .select("id, title, body, due_at, created_by_user_id")
            .in("cohort_id", cohortIds)
            .or(
              `due_at.is.null,due_at.gte.${new Date(nowMs - COHORT_LATE_DAYS * DAY_MS).toISOString()}`
            )
            .limit(100)
        )
      : Promise.resolve([]),
    catalogIds.length
      ? rows(
          client
            .from("catalog_assignment_items")
            .select("assignment_id")
            .in("assignment_id", catalogIds)
        )
      : Promise.resolve([]),
    trialIds.length
      ? rows(
          client
            .from("time_trial_runs")
            .select("assignment_id, questions, correct, elapsed_seconds, finished_at")
            .in("assignment_id", trialIds)
        )
      : Promise.resolve([]),
    withResults || catalogIds.length
      ? rows(
          client
            .from("catalog_practice_sessions")
            .select("id, skill_id, assignment_id, completed_at")
            .eq("student_id", ids.clerkId)
            .order("started_at", { ascending: false })
            .limit(withResults ? 300 : 100)
        )
      : Promise.resolve([]),
    withResults
      ? rows(
          client
            .from("catalog_practice_responses")
            .select("response_time_seconds")
            .order("answered_at", { ascending: false })
            .limit(2000)
        )
      : Promise.resolve([]),
  ]);

  // Practice sessions, with answers when results are wanted.
  const sessions = new Map<string, SessionInfo>();
  for (const r of sessionRows) {
    sessions.set(r.id as string, {
      id: r.id as string,
      skillId: str(r.skill_id) ?? "",
      assignmentId: str(r.assignment_id),
      completedAt: str(r.completed_at),
      answers: [],
    });
  }
  if (withResults && sessions.size) {
    const all = [...sessions.keys()];
    for (let i = 0; i < all.length; i += 150) {
      const answers = await rows(
        client
          .from("catalog_practice_responses")
          .select("session_id, is_correct, response_time_seconds")
          .in("session_id", all.slice(i, i + 150))
          .limit(2000)
      );
      for (const a of answers) {
        sessions.get(a.session_id as string)?.answers.push({
          correct: a.is_correct === true,
          seconds: Number(a.response_time_seconds) || 0,
        });
      }
    }
  }
  const completed = [...sessions.values()].filter((s) => s.completedAt);

  // Names of whoever assigned work.
  const userIds = new Set<string>();
  for (const r of tutorRows)
    if (str(r.assigned_by_user_id)) userIds.add(r.assigned_by_user_id as string);
  for (const r of cohortRows)
    if (str(r.created_by_user_id)) userIds.add(r.created_by_user_id as string);
  const clerkIds = new Set<string>();
  for (const r of catalogRows)
    if (str(r.educator_clerk_id)) clerkIds.add(r.educator_clerk_id as string);
  for (const r of trialRows) if (str(r.created_by)) clerkIds.add(r.created_by as string);
  const [byId, byClerk] = await Promise.all([
    userIds.size
      ? rows(
          client
            .from("users")
            .select("id, first_name")
            .in("id", [...userIds])
        )
      : Promise.resolve([]),
    clerkIds.size
      ? rows(
          client
            .from("users")
            .select("clerk_id, first_name")
            .in("clerk_id", [...clerkIds])
        )
      : Promise.resolve([]),
  ]);
  const nameById = new Map(byId.map((r) => [r.id as string, str(r.first_name)]));
  const nameByClerk = new Map(byClerk.map((r) => [r.clerk_id as string, str(r.first_name)]));

  const items: StudentHomeworkItem[] = [];

  for (const r of tutorRows) {
    const kind = str(r.kind);
    const target = str(r.target_id);
    const done = r.status === "completed";
    let href = "/dashboard/student/library#tests";
    let size: StudentHomeworkItem["size"] = {
      questions: FULL_LENGTH.questions,
      timedMinutes: FULL_LENGTH.minutes,
    };
    let result: HomeworkResult | null = null;
    if (kind === "skill_practice") {
      href = target ? practiceHref(target) : "/dashboard/student/library";
      size = { questions: PRACTICE_SET_QUESTIONS };
      if (done) {
        const from = str(r.created_at) ?? "";
        const until = str(r.completed_at) ?? "";
        const match = completed
          .filter((s) => s.skillId === target && (s.completedAt ?? "") >= from)
          .sort((a, b) => {
            const da = Math.abs(Date.parse(a.completedAt ?? "") - Date.parse(until));
            const dbb = Math.abs(Date.parse(b.completedAt ?? "") - Date.parse(until));
            return da - dbb;
          })[0];
        result = match ? sessionResult(match) : null;
      }
    } else if (kind === "domain_quiz") {
      href = domainHref(target);
      size = { questions: DOMAIN_QUIZ_QUESTIONS };
    }
    items.push({
      key: `tutor:${r.id as string}`,
      source: "tutor",
      title: str(r.title) ?? (skillLabel(target) ? `Practice: ${skillLabel(target)}` : "Homework"),
      size,
      dueOn: str(r.due_on),
      dueAt: null,
      state: done ? "done" : "open",
      href,
      note: str(r.note),
      from: nameById.get(r.assigned_by_user_id as string) ?? null,
      completedAt: str(r.completed_at),
      result,
    });
  }

  for (const s of schoolItems) {
    const done = s.status === "completed";
    items.push({
      key: `school:${s.id}`,
      source: "school",
      title: s.title,
      size:
        s.kind === "skill_practice"
          ? { questions: PRACTICE_SET_QUESTIONS }
          : s.kind === "domain_quiz"
            ? { questions: DOMAIN_QUIZ_QUESTIONS }
            : { questions: FULL_LENGTH.questions, timedMinutes: FULL_LENGTH.minutes },
      dueOn: s.dueOn,
      dueAt: null,
      state: done ? "done" : "open",
      href: s.href,
      note: null,
      from: s.className,
      completedAt: s.completedAt,
      result: null,
    });
  }

  const itemCounts = new Map<string, number>();
  for (const r of itemRows) {
    const id = r.assignment_id as string;
    itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
  }
  for (const r of catalogRows) {
    const id = r.id as string;
    const skill = str(r.catalog_skill_id) ?? "";
    const finished = completed
      .filter((s) => s.assignmentId === id)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
    items.push({
      key: `catalog:${id}`,
      source: "catalog",
      title:
        str(r.title) ?? (skillLabel(skill) ? `Practice: ${skillLabel(skill)}` : "Practice set"),
      size: { questions: itemCounts.get(id) || PRACTICE_SET_QUESTIONS },
      dueOn: null,
      dueAt: str(r.due_at),
      state: finished ? "done" : "open",
      href: assignedSetHref(skill, id),
      note: null,
      from: nameByClerk.get(r.educator_clerk_id as string) ?? null,
      completedAt: finished?.completedAt ?? null,
      result: finished ? sessionResult(finished) : null,
    });
  }

  const lastRun = new Map<string, Row>();
  for (const r of runRows) {
    const id = r.assignment_id as string;
    const prev = lastRun.get(id);
    if (!prev || String(r.finished_at) > String(prev.finished_at)) lastRun.set(id, r);
  }
  for (const r of trialRows) {
    const a: Assignment = {
      id: r.id as string,
      kind: r.kind === "full_length" ? "full_length" : "time_trial",
      section: r.section === "reading" || r.section === "math" ? (r.section as TrialSection) : null,
      title: str(r.title) ?? "",
      scheduledFor: str(r.scheduled_for) ?? "",
      unlockedAt: str(r.unlocked_at),
      completedAt: str(r.completed_at),
      tutor: nameByClerk.get(r.created_by as string) ?? "",
    };
    const state = assignmentState(a, nowMs);
    const run = lastRun.get(a.id);
    const trialModule = a.section ? CB_MODULE[a.section] : null;
    items.push({
      key: `trial:${a.id}`,
      source: "trial",
      title: a.title || (a.kind === "full_length" ? "Full-length test" : "Time trial"),
      size:
        a.kind === "full_length"
          ? { questions: FULL_LENGTH.questions, timedMinutes: FULL_LENGTH.minutes }
          : trialModule
            ? {
                questions: trialModule.questions,
                timedMinutes: Math.round(trialModule.seconds / 60),
              }
            : null,
      dueOn: a.scheduledFor || null,
      dueAt: null,
      state,
      // The time trial and test runners are being rebuilt in the Library; open work starts there.
      href: state === "open" ? "/dashboard/student/library#practice" : null,
      note: null,
      from: a.tutor || null,
      completedAt: a.completedAt,
      result: run
        ? {
            correct: Number(run.correct) || 0,
            total: Number(run.questions) || 0,
            seconds: Number(run.elapsed_seconds) || null,
            reviewHref: null,
          }
        : null,
    });
  }

  for (const r of cohortRows) {
    items.push({
      key: `cohort:${r.id as string}`,
      source: "cohort",
      title: str(r.title) ?? "Cohort homework",
      size: null,
      dueOn: null,
      dueAt: str(r.due_at),
      state: "open",
      href: null,
      note: str(r.body),
      from: nameById.get(r.created_by_user_id as string) ?? null,
      completedAt: null,
      result: null,
    });
  }

  const own = activeSeconds(
    [...sessions.values()].flatMap((s) =>
      s.answers.map((a) => ({ sessionId: s.id, seconds: a.seconds }))
    )
  );
  const everyone = median(
    everyoneRows
      .map((r) => Math.min(PAUSE_CAP_SECONDS, Number(r.response_time_seconds) || 0))
      .filter((s) => s >= RUSHED_MEDIAN_SECONDS)
  );
  return { items, paceSeconds: blendedPace(own, everyone) };
}

/** Open homework (not done, not waiting on the tutor), for the tab badge. */
export async function countOpenHomework(ids: { userId: string; clerkId: string }): Promise<number> {
  try {
    const { items } = await loadStudentHomework(ids, { withResults: false });
    return items.filter((i) => i.state === "open").length;
  } catch (error) {
    console.error("[homework] count failed:", error instanceof Error ? error.message : error);
    return 0;
  }
}
