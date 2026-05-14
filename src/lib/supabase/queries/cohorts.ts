// ============================================================
// Supabase queries — Cohorts + SAT dates + tutors
// Used by the /admin/cohorts page.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export type CohortTier = "group" | "small_group";
export type CohortStatus = "forming" | "active" | "completed";

export interface AdminCohortRow {
  id: string;
  name: string;
  tier: CohortTier;
  sat_date: string; // ISO date
  max_size: number;
  current_topic: string | null;
  status: CohortStatus;
  created_at: string;
  ended_at: string | null;
  tutor: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  member_count: number; // active members (left_at IS NULL)
}

export interface SatDateRow {
  test_date: string;
  registration_deadline: string | null;
  late_registration_deadline: string | null;
}

export interface TutorRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// All cohorts with tutor info + active member count.
// ─────────────────────────────────────────────────────────────
export async function fetchCohorts(): Promise<AdminCohortRow[]> {
  const supabase = createAdminClient();

  const [cohortsRes, membersRes] = await Promise.all([
    supabase
      .from("cohorts")
      .select(
        `id, name, tier, sat_date, max_size, current_topic, status, created_at, ended_at,
         tutor:users!cohorts_tutor_user_id_fkey (id, first_name, last_name, email)`
      )
      .is("archived_at", null)
      .order("sat_date", { ascending: true })
      .order("tier", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("cohort_members").select("cohort_id").is("left_at", null),
  ]);

  if (cohortsRes.error) throw cohortsRes.error;
  if (membersRes.error) throw membersRes.error;

  // Group active members by cohort for counts
  const counts = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    counts.set(m.cohort_id, (counts.get(m.cohort_id) ?? 0) + 1);
  }

  // Supabase types the joined `tutor` as an array OR object depending on the
  // relationship — in our case it's a 1:1 via FK, but the typegen defaults to
  // array. Normalise here.
  const rows: AdminCohortRow[] = [];
  for (const r of cohortsRes.data ?? []) {
    const tutor = Array.isArray(r.tutor) ? r.tutor[0] : r.tutor;
    if (!tutor) continue;
    rows.push({
      id: r.id,
      name: r.name,
      tier: r.tier as CohortTier,
      sat_date: r.sat_date,
      max_size: r.max_size,
      current_topic: r.current_topic,
      status: r.status as CohortStatus,
      created_at: r.created_at,
      ended_at: r.ended_at,
      tutor,
      member_count: counts.get(r.id) ?? 0,
    });
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────
// Upcoming SAT dates for the "Create cohort" SAT-date dropdown.
// Past dates are hidden — you can't create a cohort for a date
// that's already passed.
// ─────────────────────────────────────────────────────────────
export async function fetchUpcomingSatDates(): Promise<SatDateRow[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sat_dates")
    .select("test_date, registration_deadline, late_registration_deadline")
    .gte("test_date", today)
    .order("test_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// All users with role='tutor' — populates the tutor dropdown.
// ─────────────────────────────────────────────────────────────
export async function fetchTutors(): Promise<TutorRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("role", "tutor")
    .order("first_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Students eligible to be added to a cohort (for the admin
// "Add member" dialog). Eligibility rules:
//   · role = 'student'
//   · NOT currently a member of any active cohort (DB already
//     rejects this via the partial unique index, but we filter
//     in the query so the dropdown only shows valid candidates)
//
// Subscription tier is returned so the admin UI can warn when
// the student's paid tier doesn't match the cohort's tier —
// the admin can still override (sometimes useful for testing /
// edge cases); the DB won't reject the mismatch.
// ─────────────────────────────────────────────────────────────
export interface EligibleStudentRow {
  id: string; // users.id (uuid)
  first_name: string | null;
  last_name: string | null;
  email: string;
  subscription_tier: string | null; // from subscriptions.tier if active/trialing
}

export async function fetchEligibleStudentsForCohort(
  _cohortId: string
): Promise<EligibleStudentRow[]> {
  const supabase = createAdminClient();

  // All active-cohort members — we exclude these.
  const { data: activeMembers, error: amErr } = await supabase
    .from("cohort_members")
    .select("user_id")
    .is("left_at", null);
  if (amErr) throw amErr;

  const inACohort = new Set<string>((activeMembers ?? []).map((m) => m.user_id));

  const { data: students, error: sErr } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, clerk_id, role")
    .eq("role", "student")
    .order("first_name", { ascending: true, nullsFirst: false });
  if (sErr) throw sErr;

  const eligibleUsers = (students ?? []).filter((s) => !inACohort.has(s.id));

  if (eligibleUsers.length === 0) return [];

  // Fetch latest active subscription per student to show their paid tier.
  const clerkIds = eligibleUsers.map((s) => s.clerk_id);
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("user_id, tier, status")
    .in("user_id", clerkIds)
    .in("status", ["active", "trialing"]);

  const tierByClerk = new Map<string, string>();
  for (const s of subs ?? []) {
    // Keep first seen — a student shouldn't have multiple active subs.
    if (!tierByClerk.has(s.user_id)) tierByClerk.set(s.user_id, s.tier);
  }

  return eligibleUsers.map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    subscription_tier: tierByClerk.get(s.clerk_id) ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────
// Stripe lifecycle hooks — keep cohort membership in sync with
// subscription state.
//
// Called from /api/stripe/webhook on:
//   · subscription.deleted  → dropFromActiveCohort
//   · subscription.updated  with status canceled / unpaid /
//     incomplete_expired / past_due → dropFromActiveCohort
//   · subscription.updated/created with status active / trialing
//     → restoreLastCohort (idempotent — no-op if already in one)
// ─────────────────────────────────────────────────────────────

/**
 * Soft-remove the user from any cohort they're currently in.
 * Returns the cohort id they were dropped from, or null.
 */
export async function dropFromActiveCohort(clerkId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) return null;

  const userId = user.id;

  // Find the active membership first so we can return the cohort id.
  const { data: active } = await supabase
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();
  if (!active) return null;

  const cohortId = active.cohort_id;
  const { error } = await supabase
    .from("cohort_members")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .is("left_at", null);
  if (error) {
    console.error("[cohorts] dropFromActiveCohort error:", error);
    return null;
  }
  await archiveCohortIfEmpty(cohortId);
  return cohortId;
}

/**
 * If the user has a previously-left cohort, restore them by clearing
 * left_at on that row — only if:
 *   · they're not already in another active cohort
 *   · the previous cohort isn't completed
 *   · the previous cohort still has at least one open seat
 *
 * Returns the cohort id they were restored to, or null.
 */
export async function restoreLastCohort(clerkId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user) return null;
  const userId = user.id;

  // Skip if they're already in an active cohort (idempotent).
  const { data: existingActive } = await supabase
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();
  if (existingActive) return null;

  // Most recently-left cohort.
  const { data: lastLeft } = await supabase
    .from("cohort_members")
    .select("cohort_id, left_at")
    .eq("user_id", userId)
    .not("left_at", "is", null)
    .order("left_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastLeft) return null;

  const cohortId = lastLeft.cohort_id;

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, max_size, status")
    .eq("id", cohortId)
    .maybeSingle();
  if (!cohort) return null;
  if (cohort.status === "completed") return null;

  // Check seat availability.
  const { count: filled } = await supabase
    .from("cohort_members")
    .select("*", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .is("left_at", null);
  if ((filled ?? 0) >= cohort.max_size) return null;

  // Restore: clear left_at on the existing row. This works because
  // the row's primary key is (cohort_id, user_id) — there's still
  // exactly one row for this pair.
  const { error } = await supabase
    .from("cohort_members")
    .update({ left_at: null })
    .eq("user_id", userId)
    .eq("cohort_id", cohortId);
  if (error) {
    console.error("[cohorts] restoreLastCohort error:", error);
    return null;
  }
  // If this cohort was archived (because they were the last to leave),
  // bring it back. Idempotent — no-op on already-active cohorts.
  await unarchiveCohort(cohortId);
  return cohortId;
}

// ─────────────────────────────────────────────────────────────
// Soft-archive on empty: silently remove cohorts from every
// dashboard when the last active member leaves. Re-activates
// automatically if a member rejoins (Stripe restore path).
// ─────────────────────────────────────────────────────────────

/** Sets cohorts.archived_at = now() iff the cohort has zero active
 *  members AND isn't already archived. Idempotent. Returns true if
 *  this call performed the archive. */
export async function archiveCohortIfEmpty(cohortId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count, error: countErr } = await supabase
    .from("cohort_members")
    .select("user_id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .is("left_at", null);
  if (countErr) {
    console.error("[cohorts] archiveCohortIfEmpty count error:", countErr);
    return false;
  }
  if ((count ?? 0) > 0) return false;

  const { data, error } = await supabase
    .from("cohorts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", cohortId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[cohorts] archiveCohortIfEmpty update error:", error);
    return false;
  }
  return data !== null;
}

/** Clears archived_at on a cohort. Called when a student rejoins
 *  a previously-archived cohort so it reappears on dashboards. */
export async function unarchiveCohort(cohortId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("cohorts")
    .update({ archived_at: null })
    .eq("id", cohortId)
    .not("archived_at", "is", null);
  if (error) {
    console.error("[cohorts] unarchiveCohort error:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// Cohort detail page — one cohort + its members + tutor note + homework.
// ─────────────────────────────────────────────────────────────

export interface CohortMemberRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface HomeworkRow {
  id: string;
  title: string;
  body: string | null;
  assigned_at: string;
  due_at: string | null;
  created_by: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface CohortDetail {
  cohort: AdminCohortRow;
  members: CohortMemberRow[];
  tutorNote: string | null; // body of the tutor's per-cohort note (if any)
  homework: HomeworkRow[];
}

export async function fetchCohortDetail(cohortId: string): Promise<CohortDetail | null> {
  const supabase = createAdminClient();

  // Fetch the cohort with its tutor in one round-trip.
  const { data: cohortRow, error: cohortErr } = await supabase
    .from("cohorts")
    .select(
      `id, name, tier, sat_date, max_size, current_topic, status, created_at, ended_at,
       tutor:users!cohorts_tutor_user_id_fkey (id, first_name, last_name, email)`
    )
    .eq("id", cohortId)
    .maybeSingle();
  if (cohortErr) throw cohortErr;
  if (!cohortRow) return null;

  type RawCohort = Omit<AdminCohortRow, "tutor" | "member_count"> & {
    tutor: AdminCohortRow["tutor"] | AdminCohortRow["tutor"][] | null;
  };
  const rc = cohortRow as RawCohort;
  const tutor = Array.isArray(rc.tutor) ? rc.tutor[0] : rc.tutor;
  if (!tutor) return null;

  // Parallel: members, tutor note, homework.
  const [membersRes, noteRes, homeworkRes] = await Promise.all([
    supabase
      .from("cohort_members")
      .select(
        `joined_at,
         user:users!cohort_members_user_id_fkey (id, first_name, last_name, email, avatar_url)`
      )
      .eq("cohort_id", cohortId)
      .is("left_at", null)
      .order("joined_at", { ascending: true }),
    supabase
      .from("tutor_notes")
      .select("body")
      .eq("cohort_id", cohortId)
      .eq("tutor_user_id", tutor.id)
      .maybeSingle(),
    supabase
      .from("cohort_homework")
      .select(
        `id, title, body, assigned_at, due_at,
         created_by:users!cohort_homework_created_by_user_id_fkey (first_name, last_name, email)`
      )
      .eq("cohort_id", cohortId)
      .order("assigned_at", { ascending: false }),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (noteRes.error) throw noteRes.error;
  if (homeworkRes.error) throw homeworkRes.error;

  // Normalize joined user rows.
  type RawMember = {
    joined_at: string;
    user: CohortMemberRow | CohortMemberRow[] | null;
  };
  const members: CohortMemberRow[] = ((membersRes.data ?? []) as unknown as RawMember[]).flatMap(
    (r) => {
      const u = Array.isArray(r.user) ? r.user[0] : r.user;
      return u ? [{ ...u, joined_at: r.joined_at }] : [];
    }
  );

  type RawHw = Omit<HomeworkRow, "created_by"> & {
    created_by: HomeworkRow["created_by"] | HomeworkRow["created_by"][] | null;
  };
  const homework: HomeworkRow[] = ((homeworkRes.data ?? []) as unknown as RawHw[]).flatMap((h) => {
    const cb = Array.isArray(h.created_by) ? h.created_by[0] : h.created_by;
    if (!cb) return [];
    return [
      {
        id: h.id,
        title: h.title,
        body: h.body,
        assigned_at: h.assigned_at,
        due_at: h.due_at,
        created_by: cb,
      },
    ];
  });

  return {
    cohort: {
      id: rc.id,
      name: rc.name,
      tier: rc.tier,
      sat_date: rc.sat_date,
      max_size: rc.max_size,
      current_topic: rc.current_topic,
      status: rc.status,
      created_at: rc.created_at,
      ended_at: rc.ended_at,
      tutor,
      member_count: members.length,
    },
    members,
    tutorNote: (noteRes.data as { body?: string } | null)?.body ?? null,
    homework,
  };
}
