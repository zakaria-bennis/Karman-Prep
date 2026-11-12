// One revenue_snapshots row: MRR (renewing plans at monthly value), active subscribers and each
// plan's line. Taken by the "Snapshot now" button on /admin/revenue and every night by the daily
// cron (api/cron/sync-sat-dates, the Worker's "0 6 * * *" trigger), so the MRR history fills in.
import type { createAdminClient } from "@/lib/supabase/server";
import { isOneTimePlan, planBreakdown, renewingMrr } from "./_economics";

type Admin = ReturnType<typeof createAdminClient>;

export async function takeRevenueSnapshot(
  supabase: Admin
): Promise<{ ok: true; mrr: number } | { ok: false; error: string }> {
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
    console.error("[revenue-snapshot] insert failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, mrr: Math.round(totalMrrCents / 100) };
}
