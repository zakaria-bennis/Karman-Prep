// ============================================================
// Admin student data for /admin/students and
// /admin/students/[clerkId]: the roster, one student, and every
// homework item (mappers in student-homework.ts). Service role,
// on the server only, read-only. Homework reads are defensive: a table
// that is not on this database (PGRST205 or 42P01) is skipped and
// any other read error is reported, never thrown. Pure helpers
// are tested in students.test.ts.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { isMissingTable } from "./plans";
import {
  mapCatalogAssignment,
  mapCheckpointAssignment,
  mapCohortHomework,
  mapStudentAssignment,
  mapTutorHomework,
  sortHomework,
  type CatalogAssignmentRow,
  type CheckpointAssignmentRow,
  type CohortHomeworkRow,
  type HomeworkItem,
  type HomeworkSource,
  type StudentAssignmentRow,
  type TutorHomeworkRow,
} from "./student-homework";

const db = () => createAdminClient() as unknown as SupabaseClient;

export const ROSTER_CAP = 200;
const QUIZ_ROWS_CAP = 1000;

/** Clerk ids are letters, digits and underscores (user_2abc...). */
export const clerkIdSchema = z
  .string()
  .max(128)
  .regex(/^[A-Za-z0-9_]+$/);

// ── Pure helpers ─────────────────────────────────────────────

export function displayName(
  first: string | null | undefined,
  last: string | null | undefined,
  email: string | null | undefined
): string {
  const name = [first, last]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || email || "Unnamed student";
}

/** Search words with every PostgREST filter character removed. */
export function searchTokens(q: string | null | undefined): string[] {
  return (q ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}@._+'-]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.slice(0, 64))
    .filter(Boolean)
    .slice(0, 4);
}

/** One `or` filter: the word is in the first name, last name or email. */
export function tokenFilter(token: string): string {
  const pattern = `%${token}%`;
  return `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`;
}

/** The newest timestamp per key. */
export function latestByKey<T>(
  rows: readonly T[],
  key: (row: T) => string,
  at: (row: T) => string | null
): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    const time = at(row);
    if (!time) continue;
    const prev = out.get(key(row));
    if (!prev || Date.parse(time) > Date.parse(prev)) out.set(key(row), time);
  }
  return out;
}

/** Runs `fn` over the items a few at a time, keeping their order. */
export async function mapInBatches<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const step = Math.max(1, Math.floor(size));
  const out: R[] = [];
  for (let i = 0; i < items.length; i += step) {
    out.push(...(await Promise.all(items.slice(i, i + step).map(fn))));
  }
  return out;
}

export function summarizeAttempts(attempts: ReadonlyArray<{ score: number | null }>): {
  count: number;
  averageScore: number | null;
} {
  const scored = attempts.filter((a) => a.score !== null);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length)
    : null;
  return { count: attempts.length, averageScore };
}

export function countMastered(
  statuses: ReadonlyArray<{ node_id: string; status: string }>,
  nodeIds: readonly string[]
): number {
  const mastered = new Set(statuses.filter((s) => s.status === "mastered").map((s) => s.node_id));
  return nodeIds.filter((id) => mastered.has(id)).length;
}

const TIMING_LABEL: Record<string, string> = {
  standard: "Standard time",
  time_and_half: "Time and a half",
  double: "Double time",
};

export function timingLabel(value: string | null | undefined): string {
  return TIMING_LABEL[value ?? "standard"] ?? "Standard time";
}

// ── Reads ────────────────────────────────────────────────────

interface SourceResult<Row> {
  rows: Row[];
  missing: boolean;
  error: string | null;
}

type Reply = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;

async function readSource<Row>(run: () => Reply): Promise<SourceResult<Row>> {
  try {
    const { data, error } = await run();
    if (error) {
      const missing = isMissingTable(error);
      return { rows: [], missing, error: missing ? null : error.message };
    }
    return { rows: (data ?? []) as Row[], missing: false, error: null };
  } catch (err) {
    return { rows: [], missing: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface AdminStudentListRow {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  joinedAt: string;
  lastQuizAt: string | null;
}

export interface StudentRoster {
  rows: AdminStudentListRow[];
  total: number;
  /** False when the last-quiz read was capped or failed. */
  lastQuizComplete: boolean;
}

interface UserRow {
  id: string;
  clerk_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

/** Newest students first, capped at ROSTER_CAP. Every search word must match. */
export async function listStudentsForAdmin(q: string): Promise<StudentRoster> {
  const supabase = db();
  let query = supabase
    .from("users")
    .select("id, clerk_id, email, first_name, last_name, created_at", { count: "exact" })
    .eq("role", "student");
  for (const token of searchTokens(q)) query = query.or(tokenFilter(token));
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(0, ROSTER_CAP - 1);
  if (error) throw new Error(error.message);
  const users = (data ?? []) as UserRow[];

  // Last quiz: the newest attempts for the shown students, 50 ids per read.
  const clerkIds = users.map((u) => u.clerk_id).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < clerkIds.length; i += 50) chunks.push(clerkIds.slice(i, i + 50));
  const reads = await Promise.all(
    chunks.map((ids) =>
      readSource<{ student_id: string; started_at: string | null }>(() =>
        supabase
          .from("quiz_attempts")
          .select("student_id, started_at")
          .in("student_id", ids)
          .order("started_at", { ascending: false })
          .limit(QUIZ_ROWS_CAP)
      )
    )
  );
  const lastQuiz = latestByKey(
    reads.flatMap((r) => r.rows),
    (r) => r.student_id,
    (r) => r.started_at
  );

  return {
    rows: users.map((u) => ({
      id: u.id,
      clerkId: u.clerk_id,
      name: displayName(u.first_name, u.last_name, null),
      email: u.email ?? "",
      joinedAt: u.created_at,
      lastQuizAt: lastQuiz.get(u.clerk_id) ?? null,
    })),
    total: count ?? users.length,
    lastQuizComplete: reads.every((r) => !r.error && !r.missing && r.rows.length < QUIZ_ROWS_CAP),
  };
}

export interface AdminStudent {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  joinedAt: string;
  satTestDate: string | null;
  timing: string | null;
}

/** One student account, or null when there is no student with this Clerk id. */
export async function fetchStudentForAdmin(clerkId: string): Promise<AdminStudent | null> {
  const { data, error } = await db()
    .from("users")
    .select(
      "id, clerk_id, email, first_name, last_name, role, created_at, sat_test_date, timing_accommodation"
    )
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "student") return null;
  return {
    id: data.id,
    clerkId: data.clerk_id,
    name: displayName(data.first_name, data.last_name, data.email),
    email: data.email ?? "",
    joinedAt: data.created_at,
    satTestDate: data.sat_test_date ?? null,
    timing: data.timing_accommodation ?? null,
  };
}

export interface StudentHomework {
  items: HomeworkItem[];
  /** Sources whose table is not on this database. */
  missing: HomeworkSource[];
  failed: Array<{ source: HomeworkSource; message: string }>;
}

type CohortHomeworkWithName = CohortHomeworkRow & { cohortName: string | null };

async function readCohortHomework(
  supabase: SupabaseClient,
  userId: string
): Promise<SourceResult<CohortHomeworkWithName>> {
  const members = await readSource<{ cohort_id: string }>(() =>
    supabase.from("cohort_members").select("cohort_id").eq("user_id", userId)
  );
  if (members.missing || members.error || members.rows.length === 0) {
    return { rows: [], missing: members.missing, error: members.error };
  }
  const ids = [...new Set(members.rows.map((m) => m.cohort_id))];
  const [homework, cohorts] = await Promise.all([
    readSource<CohortHomeworkRow>(() =>
      supabase
        .from("cohort_homework")
        .select("id, cohort_id, title, body, assigned_at, due_at")
        .in("cohort_id", ids)
    ),
    readSource<{ id: string; name: string }>(() =>
      supabase.from("cohorts").select("id, name").in("id", ids)
    ),
  ]);
  if (homework.missing || homework.error) return { ...homework, rows: [] };
  const names = new Map(cohorts.rows.map((c) => [c.id, c.name]));
  return {
    rows: homework.rows.map((h) => ({ ...h, cohortName: names.get(h.cohort_id) ?? null })),
    missing: false,
    error: null,
  };
}

/** Every homework item for one student, from every homework table on this database. */
export async function fetchHomeworkForStudent(
  student: { id: string; clerkId: string },
  now: Date = new Date()
): Promise<StudentHomework> {
  const supabase = db();
  const [tutor, catalog, checkpoint, cohort, test] = await Promise.all([
    readSource<TutorHomeworkRow>(() =>
      supabase
        .from("tutor_homework")
        .select("id, kind, title, note, due_on, status, completed_at, created_at")
        .eq("student_user_id", student.id)
    ),
    readSource<CatalogAssignmentRow>(() =>
      supabase
        .from("catalog_assignments")
        .select("id, title, catalog_skill_id, due_at, status, created_at")
        .eq("student_clerk_id", student.clerkId)
    ),
    readSource<CheckpointAssignmentRow>(() =>
      supabase
        .from("tutor_checkpoint_assignments")
        .select("id, checkpoint_id, reason, assigned_at, cooldown_override")
        .eq("student_id", student.clerkId)
    ),
    readCohortHomework(supabase, student.id),
    readSource<StudentAssignmentRow>(() =>
      supabase
        .from("student_assignments")
        .select("id, kind, section, title, scheduled_for, unlocked_at, completed_at, created_at")
        .eq("student_id", student.clerkId)
    ),
  ]);

  const results: Array<[HomeworkSource, SourceResult<unknown>]> = [
    ["tutor", tutor],
    ["catalog", catalog],
    ["checkpoint", checkpoint],
    ["cohort", cohort],
    ["test", test],
  ];
  return {
    items: sortHomework([
      ...tutor.rows.map((r) => mapTutorHomework(r, now)),
      ...catalog.rows.map(mapCatalogAssignment),
      ...checkpoint.rows.map(mapCheckpointAssignment),
      ...cohort.rows.map((r) => mapCohortHomework(r, r.cohortName)),
      ...test.rows.map(mapStudentAssignment),
    ]),
    missing: results.filter(([, r]) => r.missing).map(([source]) => source),
    failed: results.flatMap(([source, r]) => (r.error ? [{ source, message: r.error }] : [])),
  };
}
