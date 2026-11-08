// ============================================================
// /admin/revenue: Revenue dashboard.
//
// Pulls subscription, one-time purchase, booking, refund and
// snapshot data from Supabase and computes:
//   · MRR + ARR (renewing plans at their monthly value)
//   · ARPU (MRR per subscriber)
//   · Monthly churn rate (from subscriptions.canceled_at)
//   · LTV (= ARPU / monthly churn)
//   · New / cancelled subscribers (trailing 30d)
//   · Refund rate + total $ refunded (trailing 30d)
//   · MRR-trend sparkline (from revenue_snapshots)
//   · 3 / 6 / 12-month forecast (current MRR + net-add rate)
//   · Cohort retention matrix (rows = signup month, cols = months later)
//   · Dunning queue (past_due subscriptions with student names)
//   · Per-tutor revenue (last 30d private sessions at the package's hourly price)
//   · Plan breakdown: Practice, Pro and Tutor affiliate from
//     subscriptions; the Cohort, Private 10 and Private 20 from
//     plan_grants purchases (prices in src/lib/marketing/offer.ts,
//     rules in ./_economics.ts)
//   · Subscription status breakdown
//
// PRODUCTION SWAP-IN POINT: when going live we should swap the
// Supabase queries inside getRevenueMetrics for Stripe API calls
// so the numbers reflect what Stripe actually billed. The return
// shape doesn't change, just the data source.
// ============================================================

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import RevenueClient, {
  type RevenueData,
  type CohortRow,
  type DunningEntry,
  type TutorRevenueRow,
  type MrrSnapshot,
} from "./RevenueClient";
import { snapshotRevenueAction } from "./actions";
import {
  ONE_TIME_PLANS,
  RENEWING_PLANS,
  isOneTimePlan,
  isRenewingPlan,
  paymentFor,
  planBreakdown,
  renewingMrr,
} from "./_economics";

export const metadata: Metadata = { title: "Admin: Revenue | Karman" };
export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["active", "trialing"];

async function getRevenueMetrics(): Promise<RevenueData> {
  const supabase = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ─── Renewing plans (subscriptions) ──────────────────────
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("plan_id, billing_term, status, created_at, canceled_at, user_id");
  const allSubs = (subRows ?? []) as Array<{
    plan_id: string;
    billing_term: string;
    status: string;
    created_at: string;
    canceled_at: string | null;
    user_id: string;
  }>;
  const activeSubs = allSubs.filter((r) => ACTIVE_STATUSES.includes(r.status));

  // ─── One-time plans (plan_grants purchases) ──────────────
  const { data: grantRows } = await supabase
    .from("plan_grants")
    .select("plan_id, user_id, created_at, expires_at, revoked_at")
    .eq("source", "purchase")
    .is("revoked_at", null);
  const purchases = (
    (grantRows ?? []) as Array<{
      plan_id: string;
      user_id: string;
      created_at: string;
      expires_at: string | null;
    }>
  ).filter((g) => isOneTimePlan(g.plan_id));
  const activeGrants = purchases.filter((g) => g.expires_at === null || g.expires_at > nowIso);
  const purchases30d = purchases.filter((g) => g.created_at >= since30d);

  // ─── Plan breakdown ──────────────────────────────────────
  const tiers = planBreakdown(activeSubs, activeGrants, purchases30d);
  const totalMrr = renewingMrr(activeSubs);
  const monthRevenue = tiers.reduce((s, t) => s + t.revenue, 0);
  const subscriberCount = activeSubs.length;
  const totalStudents = subscriberCount + new Set(activeGrants.map((g) => g.user_id)).size;
  const arpu = subscriberCount > 0 ? Math.round(totalMrr / subscriberCount) : 0;

  // ─── Sessions in the last 30d (per-tutor attribution) ────
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("plan_tier, tutor_id, student_id, duration_minutes, status")
    .gte("scheduled_start", since30d)
    .in("status", ["scheduled", "completed"]);
  const bookings30d = (bookingRows ?? []) as Array<{
    plan_tier: string;
    tutor_id: string;
    student_id: string;
    duration_minutes: number | null;
    status: string;
  }>;

  // ─── Subscription status breakdown ────────────────────────
  const statusCounts: Record<string, number> = {
    active: 0,
    past_due: 0,
    canceled: 0,
    incomplete: 0,
  };
  for (const r of allSubs) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }

  // ─── Trailing-30d momentum ────────────────────────────────
  const newSubs30d = allSubs.filter((r) => r.created_at >= since30d).length;
  const cancellations30d = allSubs.filter(
    (r) => r.canceled_at !== null && r.canceled_at >= since30d
  ).length;

  // ─── Monthly churn rate + LTV ─────────────────────────────
  // Denominator: subscribers that were active at the start of
  // the trailing-30d window. Approximation: current active count
  // + cancellations during the window (since canceled subs WERE
  // active at the start). This is reasonable for steady-state
  // but undercounts for fast-growing businesses.
  const startActive = subscriberCount + cancellations30d;
  const monthlyChurnRate = startActive > 0 ? cancellations30d / startActive : 0;
  const ltv = monthlyChurnRate > 0 && arpu > 0 ? Math.round(arpu / monthlyChurnRate) : null; // null = "not computable yet"

  // ─── Refunds (trailing 30d) ───────────────────────────────
  const { data: refundRows } = await supabase
    .from("refunds")
    .select("amount_cents")
    .gte("issued_at", since30d);
  const refunds30dCount = refundRows?.length ?? 0;
  const refunds30dCents = (refundRows ?? []).reduce(
    (s, r) => s + ((r as { amount_cents: number }).amount_cents ?? 0),
    0
  );
  // Refund rate = refund $ / the month's revenue (rough: refunds are one-offs).
  const refundRate = monthRevenue > 0 ? refunds30dCents / 100 / monthRevenue : 0;

  // ─── MRR snapshots (last 30 captures) ─────────────────────
  const { data: snapRows } = await supabase
    .from("revenue_snapshots")
    .select("captured_at, mrr_cents, active_students")
    .order("captured_at", { ascending: false })
    .limit(30);
  const snapshots: MrrSnapshot[] = (
    (snapRows ?? []) as Array<{
      captured_at: string;
      mrr_cents: number;
      active_students: number;
    }>
  )
    .map((r) => ({
      capturedAt: r.captured_at,
      mrr: Math.round((r.mrr_cents ?? 0) / 100),
      activeStudents: r.active_students,
    }))
    .reverse(); // chronological for the chart

  // ─── 3/6/12-month forecast ────────────────────────────────
  // Use 60-day delta in active subs (current vs. 60d ago) to
  // compute monthly net-add rate. If we don't have historical
  // snapshots, fall back to (newSubs30d − cancellations30d).
  let monthlyNetNewSubs: number;
  if (snapshots.length >= 2) {
    const oldest = snapshots[0];
    const monthsSpan = Math.max(
      0.25,
      (now - new Date(oldest.capturedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    monthlyNetNewSubs = (subscriberCount - oldest.activeStudents) / monthsSpan;
  } else {
    monthlyNetNewSubs = newSubs30d - cancellations30d;
  }
  const monthlyNetNewMrr = arpu * monthlyNetNewSubs;
  const forecast = {
    in3Months: Math.max(0, Math.round(totalMrr + monthlyNetNewMrr * 3)),
    in6Months: Math.max(0, Math.round(totalMrr + monthlyNetNewMrr * 6)),
    in12Months: Math.max(0, Math.round(totalMrr + monthlyNetNewMrr * 12)),
    monthlyNetNewSubs,
    monthlyNetNewMrr,
  };

  // ─── Cohort retention ────────────────────────────────────
  // Group all subs (active + canceled) by their signup month,
  // then for each cohort show how many remained active at month
  // 0 / 1 / 3 / 6 since signup. Limited to last 6 cohorts.
  const cohortMap = new Map<string, Array<{ created: Date; canceled: Date | null }>>();
  for (const s of allSubs) {
    const created = new Date(s.created_at);
    const cohortKey = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!cohortMap.has(cohortKey)) cohortMap.set(cohortKey, []);
    cohortMap.get(cohortKey)!.push({
      created,
      canceled: s.canceled_at ? new Date(s.canceled_at) : null,
    });
  }
  const cohortsByDateDesc = Array.from(cohortMap.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const cohorts: CohortRow[] = cohortsByDateDesc.slice(0, 6).map(([month, members]) => {
    const startOfMonth = new Date(`${month}-01T00:00:00Z`);
    const counts = [0, 1, 3, 6].map((monthsLater) => {
      const checkpoint = new Date(startOfMonth);
      checkpoint.setUTCMonth(checkpoint.getUTCMonth() + monthsLater + 1);
      // Skip future months — they haven't happened yet.
      if (checkpoint.getTime() > now) return null;
      const stillActive = members.filter((m) => {
        if (m.canceled === null) return true;
        return m.canceled.getTime() >= checkpoint.getTime();
      }).length;
      return stillActive;
    });
    return { month, size: members.length, counts };
  });

  // ─── Dunning queue (past_due) ─────────────────────────────
  const pastDueUserIds = allSubs.filter((r) => r.status === "past_due").map((r) => r.user_id);
  let dunning: DunningEntry[] = [];
  if (pastDueUserIds.length > 0) {
    const { data: pdUsers } = await supabase
      .from("users")
      .select("clerk_id, first_name, last_name, email")
      .in("clerk_id", pastDueUserIds);
    const userByClerk = new Map(
      (
        (pdUsers ?? []) as Array<{
          clerk_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }>
      ).map((u) => [u.clerk_id, u])
    );
    dunning = allSubs
      .filter((r) => r.status === "past_due")
      .map((r) => {
        const u = userByClerk.get(r.user_id);
        const renewing = isRenewingPlan(r.plan_id) ? r.plan_id : null;
        return {
          name: u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : r.user_id,
          email: u?.email ?? null,
          tier: renewing ? RENEWING_PLANS[renewing].label : r.plan_id,
          amountOwed: renewing ? paymentFor(renewing, r.billing_term) : 0,
        };
      });
  }

  // ─── Per-tutor revenue attribution (last 30d) ─────────────
  // Private sessions count at the hourly price of the student's latest
  // private package (Private 10 or Private 20). Cohort classes are sold
  // as one cohort price, so they count as sessions without revenue.
  const privateStudentIds = Array.from(
    new Set(
      bookings30d
        .filter((b) => b.plan_tier === "private" || b.plan_tier === "elite")
        .map((b) => b.student_id)
    )
  );
  const clerkByStudent = new Map<string, string>();
  if (privateStudentIds.length > 0) {
    const { data: studentRows } = await supabase
      .from("users")
      .select("id, clerk_id")
      .in("id", privateStudentIds);
    for (const u of (studentRows ?? []) as Array<{ id: string; clerk_id: string }>) {
      clerkByStudent.set(u.id, u.clerk_id);
    }
  }
  const hourlyByClerk = new Map<string, { hourly: number; boughtAt: string }>();
  for (const g of purchases) {
    if (!isOneTimePlan(g.plan_id)) continue;
    const plan = ONE_TIME_PLANS[g.plan_id];
    if (plan.hours === null) continue;
    const current = hourlyByClerk.get(g.user_id);
    if (!current || g.created_at > current.boughtAt) {
      hourlyByClerk.set(g.user_id, { hourly: plan.price / plan.hours, boughtAt: g.created_at });
    }
  }
  const tutorBookings = new Map<string, { sessions: number; revenue: number }>();
  for (const b of bookings30d) {
    const isPrivate = b.plan_tier === "private" || b.plan_tier === "elite";
    const clerkId = isPrivate ? clerkByStudent.get(b.student_id) : undefined;
    const hourly = clerkId ? (hourlyByClerk.get(clerkId)?.hourly ?? 0) : 0;
    const cur = tutorBookings.get(b.tutor_id) ?? { sessions: 0, revenue: 0 };
    cur.sessions += 1;
    cur.revenue += Math.round((hourly * (b.duration_minutes ?? 60)) / 60);
    tutorBookings.set(b.tutor_id, cur);
  }
  let tutorRevenue: TutorRevenueRow[] = [];
  if (tutorBookings.size > 0) {
    const { data: tutors } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", Array.from(tutorBookings.keys()));
    const tutorById = new Map(
      (
        (tutors ?? []) as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }>
      ).map((u) => [u.id, u])
    );
    tutorRevenue = Array.from(tutorBookings.entries())
      .map(([id, agg]) => {
        const u = tutorById.get(id);
        return {
          tutorId: id,
          name: u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : id,
          sessions: agg.sessions,
          revenue: agg.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  return {
    asOf: new Date().toISOString(),
    totalMrr,
    totalArr: totalMrr * 12,
    totalStudents,
    arpu,
    monthlyChurnRate,
    ltv,
    refunds30dCount,
    refunds30dDollars: Math.round(refunds30dCents / 100),
    refundRate,
    monthRevenue,
    tiers,
    statusCounts,
    newSubs30d,
    cancellations30d,
    snapshots,
    forecast,
    cohorts,
    dunning,
    tutorRevenue,
  };
}

export default async function AdminRevenuePage() {
  const data = await getRevenueMetrics();
  return <RevenueClient data={data} snapshotAction={snapshotRevenueAction} />;
}
