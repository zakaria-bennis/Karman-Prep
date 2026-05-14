// ============================================================
// Onboarding placement + tutor-matching algorithm.
//
// Called from /api/onboarding/submit after the student finishes
// the questionnaire. Decides which cohort they land in (if any)
// and which tutor handles them (for 1:1 tiers).
//
// Locked rules (per project_tiers.md + onboarding spec):
//   · Seminar (group)     → cohort tutor is ALWAYS Nabil.
//   · Small Group         → cohort tutor is ALWAYS Zakaria.
//   · Private + Elite     → 1:1 algorithm:
//                            1. load-balance — fewest active
//                               tutor_assignments first
//                            2. availability filter — overlap
//                               days × times if both sides set
//                            3. random tiebreak among lowest-load
//                               candidates that pass the filter
//
// Cohort matching: tier + sat_date + has space → place; else
// auto-create with the tier's default tutor.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

/** Default tutor assignments for cohort tiers. Override via env in
 *  prod when the real tutors have stable Clerk ids. */
const DEFAULT_SEMINAR_TUTOR_CLERK = process.env.DEFAULT_SEMINAR_TUTOR_CLERK ?? "test_tutor_nabil";
const DEFAULT_SMALLGROUP_TUTOR_CLERK =
  process.env.DEFAULT_SMALLGROUP_TUTOR_CLERK ?? "test_tutor_zakaria";

const COHORT_MAX_SIZE: Record<"group" | "small_group", number> = {
  group: 200,
  small_group: 5,
};

interface TutorRow {
  id: string;
  available_days: string[] | null;
  available_times: string[] | null;
}

// ─────────────────────────────────────────────────────────────
// Cohort placement
// ─────────────────────────────────────────────────────────────

export interface PlaceInCohortInput {
  studentUuid: string;
  tier: "group" | "small_group";
  satTestDate: string; // ISO date YYYY-MM-DD
}

export interface PlaceInCohortResult {
  cohortId: string;
  created: boolean;
  cohortName: string;
}

export async function placeInCohort(input: PlaceInCohortInput): Promise<PlaceInCohortResult> {
  const supabase = createAdminClient();

  // Find candidate cohorts: tier + sat_date + not completed.
  const { data: cohorts, error: cErr } = await supabase
    .from("cohorts")
    .select("id, name, max_size, status")
    .eq("tier", input.tier)
    .eq("sat_date", input.satTestDate)
    .neq("status", "completed");
  if (cErr) throw cErr;

  // Get current member counts per cohort in one query.
  const cohortIds = (cohorts ?? []).map((c) => c.id as string);
  const memberCounts = new Map<string, number>();
  if (cohortIds.length > 0) {
    const { data: members } = await supabase
      .from("cohort_members")
      .select("cohort_id")
      .in("cohort_id", cohortIds)
      .is("left_at", null);
    for (const m of (members ?? []) as Array<{ cohort_id: string }>) {
      memberCounts.set(m.cohort_id, (memberCounts.get(m.cohort_id) ?? 0) + 1);
    }
  }

  // Filter to those with space, pick lowest fullness.
  const open = (cohorts ?? [])
    .map((c) => {
      const used = memberCounts.get(c.id as string) ?? 0;
      return { ...c, used, room: (c.max_size as number) - used };
    })
    .filter((c) => c.room > 0)
    .sort((a, b) => a.used - b.used);

  if (open.length > 0) {
    const target = open[0];
    const { error: insErr } = await supabase
      .from("cohort_members")
      .insert({ cohort_id: target.id as string, user_id: input.studentUuid });
    if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
      throw insErr;
    }
    return {
      cohortId: target.id as string,
      created: false,
      cohortName: target.name as string,
    };
  }

  // No matching cohort with space → auto-create one.
  const tutorClerkId =
    input.tier === "group" ? DEFAULT_SEMINAR_TUTOR_CLERK : DEFAULT_SMALLGROUP_TUTOR_CLERK;
  const { data: tutorRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", tutorClerkId)
    .maybeSingle();
  if (!tutorRow) {
    throw new Error(
      `Default ${input.tier} tutor (${tutorClerkId}) not found in users table — cannot auto-create cohort`
    );
  }

  // Name pattern: "Seminar — Nov 7 2026 — Cohort N"
  // N counts existing cohorts (including completed) for this tier+date.
  const nIdx = (cohorts?.length ?? 0) + 1;
  const labelPrefix = input.tier === "group" ? "Seminar" : "Small Group";
  const dateLabel = formatSatDate(input.satTestDate);
  const newCohortName = `${labelPrefix} — ${dateLabel} — Cohort ${nIdx}`;

  const { data: newCohort, error: ncErr } = await supabase
    .from("cohorts")
    .insert({
      name: newCohortName,
      tier: input.tier,
      tutor_user_id: tutorRow.id,
      sat_date: input.satTestDate,
      status: "active",
      max_size: COHORT_MAX_SIZE[input.tier],
    })
    .select("id, name")
    .single();
  if (ncErr) throw ncErr;

  await supabase.from("cohort_members").insert({
    cohort_id: newCohort.id as string,
    user_id: input.studentUuid,
  });

  return {
    cohortId: newCohort.id as string,
    created: true,
    cohortName: newCohort.name as string,
  };
}

function formatSatDate(iso: string): string {
  // "2026-11-07" → "Nov 7 2026"
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─────────────────────────────────────────────────────────────
// 1:1 tutor matching for Private + Elite
// ─────────────────────────────────────────────────────────────

export interface AssignTutorInput {
  studentUuid: string;
  availableDays?: string[];
  availableTimes?: string[];
}

export interface AssignTutorResult {
  tutorUuid: string;
  /** True if the tutor was picked from a strict availability match.
   *  False means we fell back to load-only because no availability
   *  intersection existed; admin may want to manually re-pair. */
  matchedAvailability: boolean;
}

export async function assignTutorOneToOne(
  input: AssignTutorInput
): Promise<AssignTutorResult | null> {
  const supabase = createAdminClient();

  const { data: tutorRows, error: tErr } = await supabase
    .from("users")
    .select("id, available_days, available_times")
    .eq("role", "tutor");
  if (tErr) throw tErr;
  const tutors = (tutorRows ?? []) as TutorRow[];
  if (tutors.length === 0) return null;

  const { data: assignmentRows } = await supabase
    .from("tutor_assignments")
    .select("tutor_user_id")
    .is("ended_at", null);
  const loadByTutor = new Map<string, number>();
  for (const a of (assignmentRows ?? []) as Array<{ tutor_user_id: string }>) {
    loadByTutor.set(a.tutor_user_id, (loadByTutor.get(a.tutor_user_id) ?? 0) + 1);
  }

  const studentDays = input.availableDays ?? [];
  const studentTimes = input.availableTimes ?? [];

  let candidates = tutors;
  let matched = false;

  if (studentDays.length > 0 && studentTimes.length > 0) {
    candidates = tutors.filter((t) => {
      const td = t.available_days ?? [];
      const tt = t.available_times ?? [];
      // Tutor with no availability set = treat as flexible (don't filter out).
      if (td.length === 0 || tt.length === 0) return true;
      const dayOverlap = studentDays.some((d) => td.includes(d));
      const timeOverlap = studentTimes.some((t2) => tt.includes(t2));
      return dayOverlap && timeOverlap;
    });
    matched = candidates.length > 0;
    // Fall back to all tutors if no overlap.
    if (candidates.length === 0) candidates = tutors;
  }

  // Pick lowest-loaded with random tiebreak.
  const minLoad = Math.min(...candidates.map((t) => loadByTutor.get(t.id) ?? 0));
  const tied = candidates.filter((t) => (loadByTutor.get(t.id) ?? 0) === minLoad);
  const picked = tied[Math.floor(Math.random() * tied.length)];

  // Insert the active assignment row.
  const { error: insErr } = await supabase
    .from("tutor_assignments")
    .insert({ tutor_user_id: picked.id, student_user_id: input.studentUuid });
  if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
    throw insErr;
  }

  return { tutorUuid: picked.id, matchedAvailability: matched };
}
