// ============================================================
// Billing / Subscription Management page
// Shows current plan, trial status, and CTA to Stripe portal.
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import BillingClient from "@/components/dashboard/BillingClient";
import { PRICING_TIERS } from "@/types";

export const metadata: Metadata = { title: "Billing & Subscription" };

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const currentTier = PRICING_TIERS.find((t) => t.id === sub?.tier);

  return (
    <BillingClient subscription={sub} currentTier={currentTier || null} allTiers={PRICING_TIERS} />
  );
}
