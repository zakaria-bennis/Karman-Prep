"use server";

// ============================================================
// Server actions for the admin Revenue dashboard.
//
// snapshotRevenueAction — captures a single revenue_snapshots
// row reflecting current MRR and active student counts. Wired
// to a "Snapshot now" button in the dashboard for manual use;
// production should hit this on a nightly cron (Vercel Cron,
// pg_cron, or a /api/admin/revenue-snapshot endpoint pointing
// at the same logic).
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";

const TIER_PRICES: Record<string, { price: number; model: "subscription" | "per_session" }> = {
  group: { price: 40, model: "subscription" },
  small_group: { price: 60, model: "per_session" },
  private: { price: 135, model: "per_session" },
  elite: { price: 800, model: "subscription" },
};
const ESTIMATED_SESSIONS_PER_MONTH = 4;

export async function snapshotRevenueAction(): Promise<
  { ok: true; mrr: number } | { ok: false; error: string }
> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const role = await fetchUserRole(userId);
  if (role !== "admin") return { ok: false, error: "Admin only" };

  const supabase = createAdminClient();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Active + trialing subs by tier.
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("tier")
    .in("status", ["active", "trialing"]);
  const activeByTier: Record<string, number> = {};
  for (const r of (subRows ?? []) as Array<{ tier: string }>) {
    activeByTier[r.tier] = (activeByTier[r.tier] ?? 0) + 1;
  }

  // Bookings in last 30d by tier (for per-session revenue).
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("plan_tier")
    .gte("scheduled_start", since30d)
    .in("status", ["scheduled", "completed"]);
  const bookingsByTier: Record<string, number> = {};
  for (const r of (bookingRows ?? []) as Array<{ plan_tier: string }>) {
    bookingsByTier[r.plan_tier] = (bookingsByTier[r.plan_tier] ?? 0) + 1;
  }

  let totalMrrCents = 0;
  let totalActive = 0;
  const byTier: Record<string, { students: number; revenue_cents: number }> = {};

  for (const [tier, econ] of Object.entries(TIER_PRICES)) {
    const students = activeByTier[tier] ?? 0;
    totalActive += students;
    let revenueCents = 0;
    if (econ.model === "subscription") {
      revenueCents = students * econ.price * 100;
    } else {
      const realBookings = bookingsByTier[tier] ?? 0;
      const sessions = realBookings > 0 ? realBookings : students * ESTIMATED_SESSIONS_PER_MONTH;
      revenueCents = sessions * econ.price * 100;
    }
    totalMrrCents += revenueCents;
    byTier[tier] = { students, revenue_cents: revenueCents };
  }

  const { error } = await supabase.from("revenue_snapshots").insert({
    mrr_cents: totalMrrCents,
    active_students: totalActive,
    by_tier: byTier,
  });
  if (error) {
    console.error("[snapshotRevenueAction] insert failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/revenue");
  return { ok: true, mrr: Math.round(totalMrrCents / 100) };
}
