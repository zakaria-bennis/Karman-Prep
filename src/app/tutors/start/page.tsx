// /tutors/start — a tutor (for example on Leland) starts the $199 plan.
// Signed-in student-role accounts check out with Stripe (test mode
// overnight); affiliate tutors go straight to their portal.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { StartTutorPlanButton } from "@/components/tutor-affiliate/BillingButtons";
import { TUTOR_PLAN_PRICE } from "@/components/tutor-affiliate/nav";

export const metadata: Metadata = { title: "The tutor plan — Karman" };
export const dynamic = "force-dynamic";

export default async function TutorStartPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect(`/auth/sign-up?redirect_url=${encodeURIComponent("/tutors/start")}`);
  const me = await affiliateDeps.store.userByClerkId(userId);
  if (!me) redirect("/onboarding");
  if (me.role === "affiliate_tutor") redirect("/tutor");

  return (
    <PortalShell
      portal="Tutor"
      nav={[]}
      title="The tutor plan"
      name={me.firstName ?? undefined}
      accountDetail={me.email}
    >
      <Panel>
        <Card>
          <SectionHeader title="For tutors" note={TUTOR_PLAN_PRICE} />
          <p className="kp-meta">
            You get one code. Up to 50 of your students join with it and get Karman&apos;s Practice
            plan free while your plan is active. You see their progress, give them homework and
            manage your roster. Cancel any time in Stripe.
          </p>
          {me.role === "student" ? (
            <StartTutorPlanButton label="Start the tutor plan" />
          ) : (
            <p className="kp-meta">
              This account already has a Karman role. Sign up with a separate account for your
              tutoring.
            </p>
          )}
        </Card>
      </Panel>
    </PortalShell>
  );
}
