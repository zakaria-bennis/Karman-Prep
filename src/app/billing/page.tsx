// ============================================================
// Billing page: the user's renewing plan (Practice, Pro or Tutor
// affiliate), with Manage plan (Stripe portal) or checkout.
// The pricing and For tutors pages link here as
// /billing?plan=practice&term=month; that plan shows preselected
// and checkout starts only when the user clicks. Students see it
// in the portal's Settings (Plan and billing).
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { settingsHref } from "@/lib/portal/settings-rules";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";
import BillingClient, { type BillingSelection } from "@/components/dashboard/BillingClient";
import { BILLING_TERMS, hasTermChoice, type BillingTerm } from "@/lib/integrations/stripe/prices";
import { SUBSCRIPTION_PLAN_IDS, type SubscriptionPlanId } from "@/lib/plans/catalog";

export const metadata: Metadata = { title: "Billing & Subscription" };

type SearchParams = Record<string, string | string[] | undefined>;

/** The plan named in ?plan=&term=, or null. Anything not on the list is ignored. */
function readSelection(params: SearchParams): BillingSelection | null {
  const plan = typeof params.plan === "string" ? params.plan : null;
  if (!plan || !(SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(plan)) return null;
  const planId = plan as SubscriptionPlanId;
  if (!hasTermChoice(planId)) return { planId, term: "month" };
  const term = typeof params.term === "string" ? params.term : null;
  return {
    planId,
    term:
      term && (BILLING_TERMS as readonly string[]).includes(term) ? (term as BillingTerm) : "month",
  };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const selected = readSelection(params);

  const { userId } = await safeAuth();
  if (!userId) {
    const back = selected ? `/billing?plan=${selected.planId}&term=${selected.term}` : "/billing";
    redirect(`/auth/sign-in?redirect_url=${encodeURIComponent(back)}`);
  }

  // A student's plan and billing live in the portal's Settings (Plan and billing).
  const { clerkId } = await resolveEffectiveClerkId(userId);
  if ((await resolveEffectiveRole(clerkId)) === "student") redirect(settingsHref("plan"));

  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, billing_term, status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ivory">Billing & Subscription</h1>
      <BillingClient
        subscription={sub ?? null}
        selected={selected}
        required={params.required === "1"}
      />
    </main>
  );
}
