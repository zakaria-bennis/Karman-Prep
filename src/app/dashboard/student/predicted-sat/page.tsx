// ============================================================
// /dashboard/student/predicted-sat — weekly SAT trajectory chart
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import PredictedSATChart from "@/components/dashboard/PredictedSATChart";

export const metadata: Metadata = { title: "Predicted SAT — Karman Prep" };

export interface WeekPoint {
  weekLabel: string;
  weekIndex: number;
  isoDate: string;
  scoreMid: number;
  scoreLow: number;
  scoreHigh: number;
  masteredSoFar: number;
  source: "diagnostic" | "projection";
}

/** Build a rough weekly projection from baseline diagnostic + cumulative mastery. */
function buildWeeklySeries(
  diagnostics: { taken_at: string; score_range_low: number; score_range_high: number }[],
  mastery: { completed_at: string | null }[]
): WeekPoint[] {
  if (diagnostics.length === 0 && mastery.length === 0) return [];

  // Start = earliest diagnostic or earliest mastery event
  const startCandidates: Date[] = [];
  diagnostics.forEach((d) => startCandidates.push(new Date(d.taken_at)));
  mastery.forEach((m) => { if (m.completed_at) startCandidates.push(new Date(m.completed_at)); });
  if (startCandidates.length === 0) return [];

  const start = new Date(Math.min(...startCandidates.map((d) => d.getTime())));
  start.setHours(0, 0, 0, 0);
  // Snap to Monday
  const dow = start.getDay();
  const offset = (dow === 0 ? 6 : dow - 1);
  start.setDate(start.getDate() - offset);

  const now = new Date();
  const weeksElapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
  const numWeeks = Math.min(16, Math.max(4, weeksElapsed));

  // Baseline from first diagnostic (or a default if none)
  const firstDiag = [...diagnostics].sort((a, b) => a.taken_at.localeCompare(b.taken_at))[0];
  const baselineLow  = firstDiag?.score_range_low  ?? 1000;
  const baselineHigh = firstDiag?.score_range_high ?? 1100;

  // Model: +8 points per mastered node, applied to both bounds
  const POINTS_PER_MASTERED = 8;

  const points: WeekPoint[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Mastery acquired before end of this week
    const masteredByWeek = mastery.filter((m) => {
      if (!m.completed_at) return false;
      return new Date(m.completed_at) < weekEnd;
    }).length;

    const delta = masteredByWeek * POINTS_PER_MASTERED;
    const low  = Math.min(1600, baselineLow  + delta);
    const high = Math.min(1600, baselineHigh + delta);

    // Use diagnostic mid-range if a new diagnostic landed this week
    const diagThisWeek = diagnostics.find((d) => {
      const t = new Date(d.taken_at);
      return t >= weekStart && t < weekEnd;
    });

    const source: WeekPoint["source"] = diagThisWeek ? "diagnostic" : "projection";
    const effectiveLow  = diagThisWeek?.score_range_low  ?? low;
    const effectiveHigh = diagThisWeek?.score_range_high ?? high;

    points.push({
      weekLabel: `W${w + 1}`,
      weekIndex: w + 1,
      isoDate: weekStart.toISOString(),
      scoreMid: Math.round((effectiveLow + effectiveHigh) / 2),
      scoreLow: effectiveLow,
      scoreHigh: effectiveHigh,
      masteredSoFar: masteredByWeek,
      source,
    });
  }
  return points;
}

export default async function PredictedSATPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  // Resolve internal user id from clerk_id
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const internalId = (user as { id?: string } | null)?.id ?? null;

  let diagnostics: { taken_at: string; score_range_low: number; score_range_high: number }[] = [];
  if (internalId) {
    const { data: diags } = await supabase
      .from("diagnostic_results")
      .select("taken_at, score_range_low, score_range_high")
      .eq("user_id", internalId)
      .order("taken_at", { ascending: true });
    diagnostics = (diags ?? []) as typeof diagnostics;
  }

  // Mastery events (completed_at) for progress delta
  const { data: mastery } = await supabase
    .from("learn_node_status")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "mastered");

  const points = buildWeeklySeries(diagnostics, (mastery ?? []) as { completed_at: string | null }[]);

  return <PredictedSATChart points={points} diagnosticsCount={diagnostics.length} />;
}
