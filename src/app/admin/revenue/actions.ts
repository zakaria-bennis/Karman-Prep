"use server";

// ============================================================
// Server actions for the admin Revenue dashboard.
//
// snapshotRevenueAction: captures a single revenue_snapshots row
// with the current MRR (renewing plans at monthly value), the
// active subscriber count and each plan's line. Wired
// to a "Snapshot now" button in the dashboard; the daily cron
// takes the same snapshot every night (see _snapshot.ts).
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { takeRevenueSnapshot } from "./_snapshot";

export async function snapshotRevenueAction(): Promise<
  { ok: true; mrr: number } | { ok: false; error: string }
> {
  const { userId } = await safeAuth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const role = await fetchUserRole(userId);
  if (role !== "admin") return { ok: false, error: "Admin only" };

  const result = await takeRevenueSnapshot(createAdminClient());
  if (!result.ok) return result;
  revalidatePath("/admin/revenue");
  return result;
}
