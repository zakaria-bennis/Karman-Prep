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
  sat_date: string;                 // ISO date
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
  member_count: number;             // active members (left_at IS NULL)
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
      .order("sat_date", { ascending: true })
      .order("tier", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("cohort_members")
      .select("cohort_id")
      .is("left_at", null),
  ]);

  if (cohortsRes.error) throw cohortsRes.error;
  if (membersRes.error) throw membersRes.error;

  // Group active members by cohort for counts
  const counts = new Map<string, number>();
  for (const m of (membersRes.data ?? []) as { cohort_id: string }[]) {
    counts.set(m.cohort_id, (counts.get(m.cohort_id) ?? 0) + 1);
  }

  // Supabase types the joined `tutor` as an array OR object depending on the
  // relationship — in our case it's a 1:1 via FK, but the typegen defaults to
  // array. Normalise here.
  type Raw = Omit<AdminCohortRow, "tutor" | "member_count"> & {
    tutor: AdminCohortRow["tutor"] | AdminCohortRow["tutor"][] | null;
  };
  const rows: AdminCohortRow[] = [];
  for (const r of (cohortsRes.data ?? []) as Raw[]) {
    const tutor = Array.isArray(r.tutor) ? r.tutor[0] : r.tutor;
    if (!tutor) continue;
    rows.push({
      id: r.id,
      name: r.name,
      tier: r.tier,
      sat_date: r.sat_date,
      max_size: r.max_size,
      current_topic: r.current_topic,
      status: r.status,
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
  return (data ?? []) as SatDateRow[];
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
  return (data ?? []) as TutorRow[];
}
