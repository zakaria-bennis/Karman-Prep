// ============================================================
// Supabase queries — Tutor portal
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type {
  OverrideStatus,
  TutorNodeOverride,
  TutorCheckpointAssignment,
} from "@/types/quiz";

// ── Student roster ────────────────────────────────────────────
// Returns all users with role='student'. Real tutor–student assignment
// is a Prompt 3 concern.

export interface StudentRosterRow {
  clerk_id: string;
  email: string;
  role: string | null;
  created_at: string;
  sat_test_date: string | null;
}

export async function fetchStudentRoster(): Promise<StudentRosterRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("clerk_id, email, role, created_at, sat_test_date")
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

export async function fetchNodeStatuses(
  studentId: string
): Promise<NodeStatusSnapshot[]> {
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
  const applied =
    input.override_status === "unlocked" ? "available" : input.override_status;

  await supabase.from("learn_node_status").upsert({
    user_id: input.student_id,
    node_id: input.node_id,
    status: applied,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchTutorOverrides(
  studentId: string
): Promise<TutorNodeOverride[]> {
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
  checkpoint_id: string;       // "reading:1" etc.
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
  reading_mastered: number;
  math_mastered: number;
  reading_total: number;
  math_total: number;
  struggling_count: number;
  flagged_open: number;
  last_active: string | null;
  atmosphere_level: 0 | 1 | 2 | 3;
}

export async function fetchStudentDashboardRows(): Promise<StudentDashboardRow[]> {
  const supabase = createAdminClient();

  const [students, statuses, flagsOpen] = await Promise.all([
    fetchStudentRoster(),
    supabase.from("learn_node_status").select("user_id, node_id, status, confidence_band, updated_at"),
    supabase.from("flagged_questions").select("student_id").eq("resolved", false),
  ]);

  const statusMap = new Map<string, Array<{ node_id: string; status: string; confidence_band: string | null; updated_at: string }>>();
  for (const row of statuses.data ?? []) {
    const r = row as { user_id: string; node_id: string; status: string; confidence_band: string | null; updated_at: string };
    if (!statusMap.has(r.user_id)) statusMap.set(r.user_id, []);
    statusMap.get(r.user_id)!.push(r);
  }

  const flagMap = new Map<string, number>();
  for (const f of flagsOpen.data ?? []) {
    const r = f as { student_id: string };
    flagMap.set(r.student_id, (flagMap.get(r.student_id) ?? 0) + 1);
  }

  return students.map((s) => {
    const rows = statusMap.get(s.clerk_id) ?? [];
    const readingMastered = rows.filter((r) => r.node_id.startsWith("rw-") && r.status === "mastered").length;
    const mathMastered = rows.filter((r) => r.node_id.startsWith("ma-") && r.status === "mastered").length;
    const struggling = rows.filter((r) => r.confidence_band === "struggling").length;
    const lastActive = rows
      .map((r) => r.updated_at)
      .sort()
      .reverse()[0] ?? null;

    // Atmospheric level = how many tiers fully mastered
    // (15 Tier-1 + 20 Tier-2 + 15 Tier-3 per subject)
    const tier1Done = rows.filter((r) =>
      /^(rw|ma)-(0\d|1[0-4])$/.test(r.node_id) && r.status === "mastered"
    ).length === 30;
    const tier2Done = rows.filter((r) =>
      /^(rw|ma)-(1[5-9]|2\d|3[0-4])$/.test(r.node_id) && r.status === "mastered"
    ).length === 40;
    const tier3Done = rows.filter((r) =>
      /^(rw|ma)-(3[5-9]|4\d)$/.test(r.node_id) && r.status === "mastered"
    ).length === 30;
    const atmosphereLevel: 0 | 1 | 2 | 3 = tier3Done ? 3 : tier2Done ? 2 : tier1Done ? 1 : 0;

    return {
      clerk_id: s.clerk_id,
      email: s.email,
      reading_mastered: readingMastered,
      math_mastered: mathMastered,
      reading_total: 50,
      math_total: 50,
      struggling_count: struggling,
      flagged_open: flagMap.get(s.clerk_id) ?? 0,
      last_active: lastActive,
      atmosphere_level: atmosphereLevel,
    };
  });
}
