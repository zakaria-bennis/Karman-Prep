// ============================================================
// /admin/revenue — Revenue dashboard.
//
// Pulls subscription, booking, refund, and snapshot data from
// Supabase and computes:
//   · MRR + ARR
//   · ARPU
//   · Monthly churn rate (from subscriptions.canceled_at)
//   · LTV (= ARPU / monthly churn)
//   · New / cancelled subscribers (trailing 30d)
//   · Refund rate + total $ refunded (trailing 30d)
//   · MRR-trend sparkline (from revenue_snapshots)
//   · 3 / 6 / 12-month forecast (current MRR + net-add rate)
//   · Cohort retention matrix (rows = signup month, cols = months later)
//   · Dunning queue (past_due subscriptions with student names)
//   · Per-tutor revenue attribution (last 30d bookings × per-session price)
//   · Tier breakdown (count + revenue per tier)
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
  type TierBreakdown,
  type CohortRow,
  type DunningEntry,
  type TutorRevenueRow,
  type MrrSnapshot,
} from "./RevenueClient";
import { snapshotRevenueAction } from "./actions";

export const metadata: Metadata = { title: "Admin — Revenue | Karman" };
export const dynamic = "force-dynamic";

// Single source of truth for plan economics.
const TIER_ECONOMICS: Record<
  TierBreakdown["tier"],
  { label: string; price: number; model: "subscription" | "per_session"; color: string }
> = {
  group: { label: "Seminar", price: 40, model: "subscription", color: "#3B82F6" },
  small_group: { label: "Small Group", price: 60, model: "per_session", color: "#F59E0B" },
  private: { label: "Private", price: 135, model: "per_session", color: "#A855F7" },
  elite: { label: "Elite", price: 800, model: "subscription", color: "#10B981" },
};

const ESTIMATED_SESSIONS_PER_MONTH = 4;
const SUBSCRIPTION_TIERS = ["group", "elite"] as const;

async function getRevenueMetrics(): Promise<RevenueData> {
  const supabase = createAdminClient();
  const now = Date.now();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ─── Active + trialing subs per tier ─────────────────────
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("tier, status, created_at, canceled_at, user_id");
  const allSubs = (subRows ?? []) as Array<{
    tier: string;
    status: string;
    created_at: string;
    canceled_at: string | null;
    user_id: string;
  }>;

  const activeSubs = allSubs.filter((r) => r.status === "active" || r.status === "trialing");
  const activeByTier: Record<TierBreakdown["tier"], number> = {
    group: 0,
    small_group: 0,
    private: 0,
    elite: 0,
  };
  for (const r of activeSubs) {
    if (r.tier in activeByTier) activeByTier[r.tier as TierBreakdown["tier"]] += 1;
  }

  // ─── Bookings in last 30d per tier ────────────────────────
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("plan_tier, tutor_id, status")
    .gte("scheduled_start", since30d)
    .in("status", ["scheduled", "completed"]);
  const bookings30d = (bookingRows ?? []) as Array<{
    plan_tier: string;
    tutor_id: string;
    status: string;
  }>;
  const bookingsByTier: Record<TierBreakdown["tier"], number> = {
    group: 0,
    small_group: 0,
    private: 0,
    elite: 0,
  };
  for (const r of bookings30d) {
    if (r.plan_tier in bookingsByTier) bookingsByTier[r.plan_tier as TierBreakdown["tier"]] += 1;
  }

  // ─── Tier breakdown ───────────────────────────────────────
  let usedBookingFallback = false;
  const tiers: TierBreakdown[] = (Object.keys(activeByTier) as TierBreakdown["tier"][]).map((t) => {
    const econ = TIER_ECONOMICS[t];
    const studentCount = activeByTier[t];
    let revenue = 0;
    let unitsLabel: string;
    if (econ.model === "subscription") {
      revenue = studentCount * econ.price;
      unitsLabel = `${studentCount} subs × $${econ.price}/mo`;
    } else {
      const realBookings = bookingsByTier[t];
      const usedBookings =
        realBookings > 0 ? realBookings : studentCount * ESTIMATED_SESSIONS_PER_MONTH;
      if (realBookings === 0 && studentCount > 0) usedBookingFallback = true;
      revenue = usedBookings * econ.price;
      unitsLabel =
        realBookings > 0
          ? `${realBookings} sessions × $${econ.price}`
          : `~${usedBookings} est. sessions × $${econ.price}`;
    }
    return {
      tier: t,
      label: econ.label,
      color: econ.color,
      model: econ.model,
      price: econ.price,
      studentCount,
      revenue,
      unitsLabel,
    };
  });

  const totalMrr = tiers.reduce((s, t) => s + t.revenue, 0);
  const totalStudents = tiers.reduce((s, t) => s + t.studentCount, 0);
  const arpu = totalStudents > 0 ? Math.round(totalMrr / totalStudents) : 0;

  // ─── Subscription status breakdown ────────────────────────
  const statusCounts: Record<string, number> = {
    active: 0,
    trialing: 0,
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
  const startActive = totalStudents + cancellations30d;
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
  // Refund rate = refund $ / MRR (rough — refunds are one-offs).
  const refundRate = totalMrr > 0 ? refunds30dCents / 100 / totalMrr : 0;

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
    monthlyNetNewSubs = (totalStudents - oldest.activeStudents) / monthsSpan;
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
        const econ = TIER_ECONOMICS[r.tier as TierBreakdown["tier"]] ?? TIER_ECONOMICS.group;
        return {
          name: u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : r.user_id,
          email: u?.email ?? null,
          tier: econ.label,
          amountOwed:
            econ.model === "subscription" ? econ.price : econ.price * ESTIMATED_SESSIONS_PER_MONTH,
        };
      });
  }

  // ─── Per-tutor revenue attribution (last 30d) ─────────────
  const tutorBookings = new Map<string, { sessions: number; revenue: number }>();
  for (const b of bookings30d) {
    const econ = TIER_ECONOMICS[b.plan_tier as TierBreakdown["tier"]];
    if (!econ) continue;
    const rev = econ.model === "per_session" ? econ.price : 0;
    const cur = tutorBookings.get(b.tutor_id) ?? { sessions: 0, revenue: 0 };
    cur.sessions += 1;
    cur.revenue += rev;
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
    tiers,
    statusCounts,
    newSubs30d,
    cancellations30d,
    usedBookingFallback,
    estimatedSessionsPerStudent: ESTIMATED_SESSIONS_PER_MONTH,
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

// Dummy reference so SUBSCRIPTION_TIERS isn't tree-shaken into a
// "declared but never used" warning — it's there to make the
// model split readable for future maintainers.
void SUBSCRIPTION_TIERS;
