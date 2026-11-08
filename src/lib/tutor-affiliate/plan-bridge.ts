// ============================================================
// Billing and grants for the tutor affiliate plan, through the
// pricing work's tables (src/lib/plans/, see its README):
//   · the tutor's $199 subscription: public.subscriptions,
//     plan_id "tutor-affiliate"
//   · the student's free Practice: public.plan_grants,
//     source "tutor-affiliate", source_ref = our redemption id,
//     sponsor_user_id = the tutor's Clerk id
// Both tables key users by Clerk id. When src/lib/plans/ is on this
// branch, swap these bodies for grantPlan / revokeGrant / getPlan.
// ============================================================

import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { AffiliateBilling, AffiliateGrants, TutorSubscription } from "./types";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** The pricing tables may not exist yet in a local database. */
function missingPlanTables(error: PostgrestError | null): boolean {
  return (
    !!error &&
    process.env.NODE_ENV !== "production" &&
    ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)
  );
}

async function clerkIdsFor(userIds: readonly string[]): Promise<Map<string, string>> {
  const { data, error } = await db()
    .from("users")
    .select("id, clerk_id")
    .in("id", [...userIds]);
  if (error) throw new Error("Couldn't look up the accounts for this plan.");
  return new Map(
    ((data ?? []) as { id: string; clerk_id: string }[]).map((r) => [r.id, r.clerk_id])
  );
}

export const planBilling: AffiliateBilling = {
  async subscriptionFor(tutorUserId): Promise<TutorSubscription | null> {
    const clerkId = (await clerkIdsFor([tutorUserId])).get(tutorUserId);
    if (!clerkId) return null;
    const { data, error } = await db()
      .from("subscriptions")
      .select("status, current_period_end, created_at")
      .eq("user_id", clerkId)
      .eq("plan_id", "tutor-affiliate")
      .order("created_at", { ascending: false })
      .limit(5);
    if (missingPlanTables(error)) {
      console.warn("[tutor-affiliate] subscriptions.plan_id is not in this database yet");
      return null;
    }
    if (error) throw new Error("Couldn't read the tutor plan's billing.");
    const rows = (data ?? []) as { status: string; current_period_end: string | null }[];
    const row = rows.find((r) => r.status === "active" || r.status === "trialing") ?? rows[0];
    return row ? { status: row.status, currentPeriodEnd: row.current_period_end } : null;
  },
};

export const planGrants: AffiliateGrants = {
  async grant({ studentUserId, tutorUserId, redemptionId }) {
    const ids = await clerkIdsFor([studentUserId, tutorUserId]);
    const { error } = await db()
      .from("plan_grants")
      .upsert(
        {
          user_id: ids.get(studentUserId),
          plan_id: "practice",
          source: "tutor-affiliate",
          source_ref: redemptionId,
          sponsor_user_id: ids.get(tutorUserId),
          revoked_at: null,
        },
        { onConflict: "source,source_ref,user_id" }
      );
    if (missingPlanTables(error)) {
      console.warn(
        "[tutor-affiliate] plan_grants is not in this database yet; Practice not granted"
      );
      return;
    }
    if (error) throw new Error("Couldn't give this student the Practice plan.");
  },

  async revoke({ redemptionId }) {
    const { error } = await db()
      .from("plan_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("source", "tutor-affiliate")
      .eq("source_ref", redemptionId)
      .is("revoked_at", null);
    if (missingPlanTables(error)) return;
    if (error) throw new Error("Couldn't end this student's Practice plan.");
  },
};

/** The Stripe customer behind the tutor's tutor-affiliate subscription, for the billing portal. */
export async function tutorStripeCustomerId(tutorClerkId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("subscriptions")
    .select("stripe_customer_id, created_at")
    .eq("user_id", tutorClerkId)
    .eq("plan_id", "tutor-affiliate")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (missingPlanTables(error)) return null;
  if (error) throw new Error("Couldn't read the tutor plan's billing.");
  return (data as { stripe_customer_id: string } | null)?.stripe_customer_id ?? null;
}
