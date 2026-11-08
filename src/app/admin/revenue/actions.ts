"use server";

// ============================================================
// Server actions for the admin Revenue dashboard.
//
// snapshotRevenueAction: captures a single revenue_snapshots row
// with the current MRR (renewing plans at monthly value), the
// active subscriber count and each plan's line. Wired
// to a "Snapshot now" button in the dashboard for manual use;
// production should hit this on a nightly cron (Vercel Cron,
// pg_cron, or a /api/admin/revenue-snapshot endpoint pointing
// at the same logic).
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { isOneTimePlan, planBreakdown, renewingMrr } from "./_economics";

export async function snapshotRevenueAction(): Promise<
  { ok: true; mrr: number } | { ok: false; error: string }
> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const role = await fetchUserRole(userId);
  if (role !== "admin") return { ok: false, error: "Admin only" };

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Active renewing plans (Practice, Pro, Tutor affiliate) at monthly value.
  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("plan_id, billing_term")
    .in("status", ["active", "trialing"]);
  const activeSubs = (subRows ?? []) as Array<{ plan_id: string; billing_term: string }>;

  // One-time purchases (Cohort, Private 10, Private 20).
  const { data: grantRows } = await supabase
    .from("plan_grants")
    .select("plan_id, created_at, expires_at")
    .eq("source", "purchase")
    .is("revoked_at", null);
  const purchases = (
    (grantRows ?? []) as Array<{ plan_id: string; created_at: string; expires_at: string | null }>
  ).filter((g) => isOneTimePlan(g.plan_id));
  const activeGrants = purchases.filter((g) => g.expires_at === null || g.expires_at > nowIso);
  const purchases30d = purchases.filter((g) => g.created_at >= since30d);

  const totalMrrCents = Math.round(renewingMrr(activeSubs) * 100);
  const byTier: Record<string, { students: number; revenue_cents: number }> = {};
  for (const row of planBreakdown(activeSubs, activeGrants, purchases30d)) {
    byTier[row.tier] = { students: row.studentCount, revenue_cents: row.revenue * 100 };
  }

  const { error } = await supabase.from("revenue_snapshots").insert({
    mrr_cents: totalMrrCents,
    active_students: activeSubs.length,
    by_tier: byTier,
  });
  if (error) {
    console.error("[snapshotRevenueAction] insert failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/revenue");
  return { ok: true, mrr: Math.round(totalMrrCents / 100) };
}
