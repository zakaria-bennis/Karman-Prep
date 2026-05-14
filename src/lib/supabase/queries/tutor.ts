// ============================================================
// Supabase queries — Tutor portal
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { OverrideStatus, TutorNodeOverride, TutorCheckpointAssignment } from "@/types/quiz";
import type { CohortStatus, CohortTier } from "@/lib/supabase/queries/cohorts";

// ── Student roster ────────────────────────────────────────────
// Returns all users with role='student'. Real tutor–student assignment
// is a Prompt 3 concern.

export interface StudentRosterRow {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at: string;
  sat_test_date: string | null;
}

export async function fetchStudentRoster(): Promise<StudentRosterRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, email, first_name, last_name, role, created_at, sat_test_date")
    .eq("role", "student")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentRosterRow[];
}

export async function fetchStudentById(clerkId: string): Promise<StudentRosterRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("clerk_id, email, role, created_at, sat_test_date")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return (data as StudentRosterRow | null) ?? null;
}

// ── Node status snapshots (per-student table view) ─────────────

export interface NodeStatusSnapshot {
  node_id: string;
  status: string;
  best_quiz_score: number | null;
  last_quiz_score: number | null;
  attempts: number;
  watch_percentage: number | null;
  confidence_band: string | null;
  completed_at: string | null;
  updated_at: string;
}

export async function fetchNodeStatuses(studentId: string): Promise<NodeStatusSnapshot[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("learn_node_status")
    .select(
      "node_id, status, best_quiz_score, last_quiz_score, attempts, watch_percentage, confidence_band, completed_at, updated_at"
    )
    .eq("user_id", studentId);
  if (error) throw error;
  return (data ?? []) as NodeStatusSnapshot[];
}

// ── Tutor overrides ──────────────────────────────────────────
// All tutor actions write to tutor_node_overrides BEFORE updating the
// student's learn_node_status — this creates an audit trail.

export async function applyTutorNodeOverride(input: {
  tutor_id: string;
  student_id: string;
  node_id: string;
  override_status: OverrideStatus;
  locked_pathway: boolean;
  reason?: string;
}): Promise<void> {
  const supabase = createAdminClient();

  // 1. Audit row — always append.
  const { error: overrideErr } = await supabase.from("tutor_node_overrides").insert({
    tutor_id: input.tutor_id,
    student_id: input.student_id,
    node_id: input.node_id,
    override_status: input.override_status,
    locked_pathway: input.locked_pathway,
    reason: input.reason ?? null,
  });
  if (overrideErr) throw overrideErr;

  // 2. Apply to learn_node_status. Map "unlocked" → "available".
  const applied = input.override_status === "unlocked" ? "available" : input.override_status;

  await supabase.from("learn_node_status").upsert({
    user_id: input.student_id,
    node_id: input.node_id,
    status: applied,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchTutorOverrides(studentId: string): Promise<TutorNodeOverride[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tutor_node_overrides")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TutorNodeOverride[];
}

// ── Checkpoint assignments ───────────────────────────────────

export async function assignCheckpointRetake(input: {
  tutor_id: string;
  student_id: string;
  checkpoint_id: string; // "reading:1" etc.
  reason?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tutor_checkpoint_assignments").insert({
    tutor_id: input.tutor_id,
    student_id: input.student_id,
    checkpoint_id: input.checkpoint_id,
    reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function overrideCheckpointCooldown(input: {
  tutor_id: string;
  student_id: string;
  checkpoint_id: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tutor_checkpoint_assignments").insert({
    tutor_id: input.tutor_id,
    student_id: input.student_id,
    checkpoint_id: input.checkpoint_id,
    cooldown_override: true,
  });
  if (error) throw error;
}

export async function fetchCheckpointAssignments(
  studentId: string
): Promise<TutorCheckpointAssignment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tutor_checkpoint_assignments")
    .select("*")
    .eq("student_id", studentId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TutorCheckpointAssignment[];
}

// ── Aggregate / dashboard queries ────────────────────────────

export interface StudentDashboardRow {
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  reading_mastered: number;
  math_mastered: number;
  reading_total: number;
  math_total: number;
  struggling_count: number;
  flagged_open: number;
  last_active: string | null;
  atmosphere_level: 0 | 1 | 2 | 3;
  /** Most-recent active subscription tier; null if none. */
  plan_tier: "group" | "small_group" | "private" | "elite" | "annual" | null;
  /** Cohort_ids the student is currently an active member of. */
  cohort_ids: string[];
}

export async function fetchStudentDashboardRows(
  onlyClerkIds?: string[] | null
): Promise<StudentDashboardRow[]> {
  const supabase = createAdminClient();

  const [students, statuses, flagsOpen, subs, members] = await Promise.all([
    fetchStudentRoster(),
    supabase
      .from("learn_node_status")
      .select("user_id, node_id, status, confidence_band, updated_at"),
    supabase.from("flagged_questions").select("student_id").eq("resolved", false),
    supabase
      .from("subscriptions")
      .select("user_id, tier, status, created_at")
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false }),
    supabase.from("cohort_members").select("user_id, cohort_id").is("left_at", null),
  ]);

  // Optional scoping: when called with a list of clerk_ids, drop everyone else.
  // Pass `null`/omit to keep the legacy "show all students" behavior (admin use).
  const filteredStudents = onlyClerkIds
    ? students.filter((s) => onlyClerkIds.includes(s.clerk_id))
    : students;

  // Most-recent tier per Clerk userid (subscriptions.user_id is TEXT).
  const tierByClerkId = new Map<string, StudentDashboardRow["plan_tier"]>();
  for (const r of (subs.data ?? []) as Array<{ user_id: string; tier: string }>) {
    if (!tierByClerkId.has(r.user_id)) {
      tierByClerkId.set(r.user_id, r.tier as StudentDashboardRow["plan_tier"]);
    }
  }
  // Map student UUID → Clerk id (we have the roster) so we can correlate
  // cohort_members (user_id UUID) back to clerk_id-keyed rows.
  const clerkIdByUuid = new Map<string, string>();
  for (const s of students) clerkIdByUuid.set(s.id, s.clerk_id);
  const cohortIdsByClerkId = new Map<string, string[]>();
  for (const r of (members.data ?? []) as Array<{ user_id: string; cohort_id: string }>) {
    const ck = clerkIdByUuid.get(r.user_id);
    if (!ck) continue;
    if (!cohortIdsByClerkId.has(ck)) cohortIdsByClerkId.set(ck, []);
    cohortIdsByClerkId.get(ck)!.push(r.cohort_id);
  }

  const statusMap = new Map<
    string,
    Array<{ node_id: string; status: string; confidence_band: string | null; updated_at: string }>
  >();
  for (const row of statuses.data ?? []) {
    const r = row as {
      user_id: string;
      node_id: string;
      status: string;
      confidence_band: string | null;
      updated_at: string;
    };
    if (!statusMap.has(r.user_id)) statusMap.set(r.user_id, []);
    statusMap.get(r.user_id)!.push(r);
  }

  const flagMap = new Map<string, number>();
  for (const f of flagsOpen.data ?? []) {
    const r = f as { student_id: string };
    flagMap.set(r.student_id, (flagMap.get(r.student_id) ?? 0) + 1);
  }

  return filteredStudents.map((s) => {
    const rows = statusMap.get(s.clerk_id) ?? [];
    const readingMastered = rows.filter(
      (r) => r.node_id.startsWith("rw-") && r.status === "mastered"
    ).length;
    const mathMastered = rows.filter(
      (r) => r.node_id.startsWith("ma-") && r.status === "mastered"
    ).length;
    const struggling = rows.filter((r) => r.confidence_band === "struggling").length;
    const lastActive =
      rows
        .map((r) => r.updated_at)
        .sort()
        .reverse()[0] ?? null;

    // Atmospheric level = how many tiers fully mastered
    // (15 Tier-1 + 20 Tier-2 + 15 Tier-3 per subject)
    const tier1Done =
      rows.filter((r) => /^(rw|ma)-(0\d|1[0-4])$/.test(r.node_id) && r.status === "mastered")
        .length === 30;
    const tier2Done =
      rows.filter((r) => /^(rw|ma)-(1[5-9]|2\d|3[0-4])$/.test(r.node_id) && r.status === "mastered")
        .length === 40;
    const tier3Done =
      rows.filter((r) => /^(rw|ma)-(3[5-9]|4\d)$/.test(r.node_id) && r.status === "mastered")
        .length === 30;
    const atmosphereLevel: 0 | 1 | 2 | 3 = tier3Done ? 3 : tier2Done ? 2 : tier1Done ? 1 : 0;

    return {
      clerk_id: s.clerk_id,
      email: s.email,
      first_name: s.first_name ?? null,
      last_name: s.last_name ?? null,
      reading_mastered: readingMastered,
      math_mastered: mathMastered,
      reading_total: 50,
      math_total: 50,
      struggling_count: struggling,
      flagged_open: flagMap.get(s.clerk_id) ?? 0,
      last_active: lastActive,
      atmosphere_level: atmosphereLevel,
      plan_tier: tierByClerkId.get(s.clerk_id) ?? null,
      cohort_ids: cohortIdsByClerkId.get(s.clerk_id) ?? [],
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Tutor-scoped data: cohorts this tutor leads and the clerk_ids
// of every student visible to them (cohort members + 1:1).
// ─────────────────────────────────────────────────────────────

export interface TutorCohortRow {
  id: string;
  name: string;
  tier: CohortTier;
  sat_date: string;
  max_size: number;
  current_topic: string | null;
  status: CohortStatus;
  member_count: number;
  homework_count: number;
}

export interface TutorScope {
  cohorts: TutorCohortRow[];
  /** Clerk IDs of every student under this tutor's care */
  studentClerkIds: string[];
  /** UUID of the tutor user row (for notes / homework lookups) */
  tutorUserId: string | null;
}

export async function fetchTutorScope(tutorClerkId: string): Promise<TutorScope> {
  const supabase = createAdminClient();

  // 1. Resolve the tutor's users.id from their clerk_id.
  const { data: tutorRow } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_id", tutorClerkId)
    .maybeSingle();
  if (!tutorRow) return { cohorts: [], studentClerkIds: [], tutorUserId: null };

  const tutorUserId = tutorRow.id as string;

  // 2. Cohorts this tutor leads, plus member + homework counts.
  //    Student clerk_ids are pulled in via FK-relation joins on the
  //    same round-trip — we used to do a third `.in("id", [...])` on
  //    `users` after this batch resolved, costing an extra sequential
  //    network hop on every tutor page load.
  const [cohortsRes, membersRes, homeworkRes, assignmentsRes] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, tier, sat_date, max_size, current_topic, status")
      .eq("tutor_user_id", tutorUserId)
      .is("archived_at", null)
      .order("sat_date", { ascending: true }),
    supabase
      .from("cohort_members")
      .select("cohort_id, user_id, student:users!cohort_members_user_id_fkey(clerk_id)")
      .is("left_at", null),
    supabase.from("cohort_homework").select("cohort_id"),
    supabase
      .from("tutor_assignments")
      .select("student_user_id, student:users!tutor_assignments_student_user_id_fkey(clerk_id)")
      .eq("tutor_user_id", tutorUserId)
      .is("ended_at", null),
  ]);

  if (cohortsRes.error) throw cohortsRes.error;
  if (membersRes.error) throw membersRes.error;
  if (homeworkRes.error) throw homeworkRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  // Supabase types FK joins as object-or-array depending on the
  // multiplicity it can infer. Both forms collapse to one clerk_id
  // since user_id is a single-fk reference. Helper accepts either.
  type StudentJoin = { clerk_id: string } | { clerk_id: string }[] | null;
  function pickClerkId(student: StudentJoin): string | null {
    if (!student) return null;
    if (Array.isArray(student)) return student[0]?.clerk_id ?? null;
    return student.clerk_id ?? null;
  }

  const cohortIds = new Set<string>((cohortsRes.data ?? []).map((c) => c.id as string));
  const memberCounts = new Map<string, number>();
  const clerkIdSet = new Set<string>();

  for (const r of (membersRes.data ?? []) as Array<{
    cohort_id: string;
    user_id: string;
    student: StudentJoin;
  }>) {
    if (!cohortIds.has(r.cohort_id)) continue;
    memberCounts.set(r.cohort_id, (memberCounts.get(r.cohort_id) ?? 0) + 1);
    const clerkId = pickClerkId(r.student);
    if (clerkId) clerkIdSet.add(clerkId);
  }

  const homeworkCounts = new Map<string, number>();
  for (const r of (homeworkRes.data ?? []) as { cohort_id: string }[]) {
    if (!cohortIds.has(r.cohort_id)) continue;
    homeworkCounts.set(r.cohort_id, (homeworkCounts.get(r.cohort_id) ?? 0) + 1);
  }

  for (const a of (assignmentsRes.data ?? []) as Array<{
    student_user_id: string;
    student: StudentJoin;
  }>) {
    const clerkId = pickClerkId(a.student);
    if (clerkId) clerkIdSet.add(clerkId);
  }

  const studentClerkIds = [...clerkIdSet];

  const cohorts: TutorCohortRow[] = (cohortsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    tier: c.tier as CohortTier,
    sat_date: c.sat_date as string,
    max_size: c.max_size as number,
    current_topic: (c.current_topic as string | null) ?? null,
    status: c.status as CohortStatus,
    member_count: memberCounts.get(c.id as string) ?? 0,
    homework_count: homeworkCounts.get(c.id as string) ?? 0,
  }));

  return { cohorts, studentClerkIds, tutorUserId };
}

// ─────────────────────────────────────────────────────────────
// Tutor's view of a single cohort — with ownership enforced at
// the query layer so a tutor can't URL-hack into another's cohort.
// ─────────────────────────────────────────────────────────────

export interface TutorCohortMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface TutorHomework {
  id: string;
  title: string;
  body: string | null;
  assigned_at: string;
  due_at: string | null;
}

export interface TutorCohortDetail {
  cohort: {
    id: string;
    name: string;
    tier: CohortTier;
    sat_date: string;
    max_size: number;
    current_topic: string | null;
    status: CohortStatus;
  };
  members: TutorCohortMember[];
  noteBody: string; // '' if no note yet
  noteId: string | null; // null if no note row yet
  homework: TutorHomework[];
}

/**
 * Fetch a cohort from the tutor's perspective. Returns null if the
 * cohort doesn't exist OR the caller is not its tutor (so the caller
 * can 404 either way — no data leak).
 */
export async function fetchTutorCohortDetail(
  cohortId: string,
  tutorClerkId: string
): Promise<TutorCohortDetail | null> {
  const supabase = createAdminClient();

  // Parallelize all 5 reads. The tutor lookup + cohort lookup used
  // to be sequential `maybeSingle()` calls before the parallel batch,
  // adding 2 extra round-trips on every cohort-detail page load.
  // The note query's `tutor_user_id` filter is redundant given the
  // one-tutor-per-cohort schema (`cohorts.tutor_user_id` is the
  // single source of truth), so we can drop it from this read and
  // do the ownership check on the cohort row instead.
  const [tutorRes, cohortRes, membersRes, noteRes, homeworkRes] = await Promise.all([
    supabase.from("users").select("id").eq("clerk_id", tutorClerkId).maybeSingle(),
    supabase
      .from("cohorts")
      .select("id, name, tier, sat_date, max_size, current_topic, status, tutor_user_id")
      .eq("id", cohortId)
      .maybeSingle(),
    supabase
      .from("cohort_members")
      .select(
        `
        joined_at,
        user:users!cohort_members_user_id_fkey (id, first_name, last_name, email, avatar_url)
      `
      )
      .eq("cohort_id", cohortId)
      .is("left_at", null)
      .order("joined_at", { ascending: true }),
    supabase.from("tutor_notes").select("id, body").eq("cohort_id", cohortId).maybeSingle(),
    supabase
      .from("cohort_homework")
      .select("id, title, body, assigned_at, due_at")
      .eq("cohort_id", cohortId)
      .order("assigned_at", { ascending: false }),
  ]);

  const tutor = tutorRes.data;
  if (!tutor) return null;
  const tutorUserId = tutor.id as string;

  if (cohortRes.error) throw cohortRes.error;
  const cohort = cohortRes.data;
  if (!cohort) return null;
  if ((cohort as { tutor_user_id: string }).tutor_user_id !== tutorUserId) {
    return null; // not this tutor's cohort — pretend it doesn't exist
  }

  if (membersRes.error) throw membersRes.error;
  if (noteRes.error) throw noteRes.error;
  if (homeworkRes.error) throw homeworkRes.error;

  type RawMember = {
    joined_at: string;
    user:
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          avatar_url: string | null;
        }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          avatar_url: string | null;
        }>
      | null;
  };
  const members: TutorCohortMember[] = ((membersRes.data ?? []) as RawMember[]).flatMap((r) => {
    const u = Array.isArray(r.user) ? r.user[0] : r.user;
    return u
      ? [
          {
            user_id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            avatar_url: u.avatar_url,
            joined_at: r.joined_at,
          },
        ]
      : [];
  });

  const note = noteRes.data as { id: string; body: string } | null;

  return {
    cohort: {
      id: cohort.id as string,
      name: cohort.name as string,
      tier: cohort.tier as CohortTier,
      sat_date: cohort.sat_date as string,
      max_size: cohort.max_size as number,
      current_topic: (cohort.current_topic as string | null) ?? null,
      status: cohort.status as CohortStatus,
    },
    members,
    noteBody: note?.body ?? "",
    noteId: note?.id ?? null,
    homework: (homeworkRes.data ?? []) as TutorHomework[],
  };
}
