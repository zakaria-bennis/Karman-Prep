// /tutor/billing — the affiliate tutor's $199 plan: status, Stripe's
// customer portal, or restarting a lapsed plan.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, MoreLink, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { getAffiliateOverview } from "@/lib/tutor-affiliate/service";
import {
  ManageBillingButton,
  StartTutorPlanButton,
} from "@/components/tutor-affiliate/BillingButtons";
import {
  AFFILIATE_TUTOR_NAV,
  TUTOR_PLAN_PRICE,
  billingLine,
} from "@/components/tutor-affiliate/nav";

export const metadata: Metadata = { title: "Billing — Karman tutor plan" };
export const dynamic = "force-dynamic";

export default async function TutorBillingPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if ((await fetchUserRole(clerkId)) !== "affiliate_tutor") redirect("/tutor");

  const [overview, me] = await Promise.all([
    getAffiliateOverview(affiliateDeps, clerkId),
    affiliateDeps.store.userByClerkId(clerkId),
  ]);
  const active = overview?.access === "active";
  const subscription = overview?.subscription ?? null;

  return (
    <PortalShell
      portal="Tutor"
      nav={AFFILIATE_TUTOR_NAV}
      title="Billing"
      name={me?.firstName ?? undefined}
      accountDetail={me?.email}
    >
      <Panel>
        <Card>
          <SectionHeader title="Your tutor plan" note={TUTOR_PLAN_PRICE} />
          <p className="kp-meta">{billingLine(subscription, active)}</p>
          <p className="kp-meta">
            Up to 50 students on your code get the Practice plan free while your plan is active. If
            it ends, they move to the Free plan and see a message saying so. Their work is kept.
          </p>
          {!isImpersonating &&
            (subscription && active ? (
              <ManageBillingButton asMain />
            ) : (
              <StartTutorPlanButton label="Restart the tutor plan" />
            ))}
          {!isImpersonating && subscription && !active && <ManageBillingButton />}
        </Card>
        <Card>
          <MoreLink href="/tutor">Back to your students</MoreLink>
        </Card>
      </Panel>
    </PortalShell>
  );
}
