// ============================================================
// /tutor/settings/payment
//
// Tutor sets up / manages their Stripe Connect Express account
// for receiving payouts.
//
// Three states this page handles:
//  1. NOT_STARTED  — no stripe_connect_account_id yet
//                    → "Set up payments" button kicks off onboarding
//  2. INCOMPLETE   — account exists but onboarding not done
//                    → "Resume onboarding" button
//  3. READY        — payouts_enabled = true
//                    → "Update payment details" + "Open Stripe dashboard"
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchAccountStatus } from "@/lib/integrations/stripe/connect";
import PaymentSettingsClient from "./PaymentSettingsClient";

export const metadata: Metadata = { title: "Payment Settings — Karman" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ onboarded?: string; refresh?: string; updated?: string }>;
}

export default async function PaymentSettingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/auth/sign-in");

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select(
      "id, email, first_name, stripe_connect_account_id, stripe_payouts_enabled, stripe_connect_onboarded_at"
    )
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  // If we have a Connect account, pull live status. If the user just
  // returned from onboarding (?onboarded=1), this also opportunistically
  // updates the cached `stripe_payouts_enabled` flag.
  let payoutsEnabled = caller.stripe_payouts_enabled === true;
  let chargesEnabled = false;
  let detailsSubmitted = false;
  let instantPayoutsActive = false;
  let requirements: string[] = [];
  if (caller.stripe_connect_account_id) {
    try {
      const status = await fetchAccountStatus(caller.stripe_connect_account_id as string);
      chargesEnabled = status.charges_enabled;
      payoutsEnabled = status.payouts_enabled;
      detailsSubmitted = status.details_submitted;
      instantPayoutsActive = status.instant_payouts_active;
      requirements = status.requirements_currently_due;

      // Refresh the cached flag if it's stale.
      if (caller.stripe_payouts_enabled !== payoutsEnabled) {
        await supabase
          .from("users")
          .update({
            stripe_payouts_enabled: payoutsEnabled,
            stripe_connect_onboarded_at: payoutsEnabled ? new Date().toISOString() : null,
          })
          .eq("id", caller.id);
      }
    } catch (err) {
      console.error(
        "[settings/payment] fetchAccountStatus failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <Link
          href="/tutor/earnings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> My earnings
        </Link>

        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">
            Tutor Portal
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Payment settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Set up how you receive payouts from KarmanPrep.
          </p>
        </header>

        <PaymentSettingsClient
          state={{
            hasConnectAccount: !!caller.stripe_connect_account_id,
            payoutsEnabled,
            chargesEnabled,
            detailsSubmitted,
            instantPayoutsActive,
            requirements,
            justOnboarded: sp.onboarded === "1",
            justUpdated: sp.updated === "1",
          }}
        />
      </div>
    </DashboardLayout>
  );
}
