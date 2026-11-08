// /tutors/welcome — Stripe sends a new tutor here after checkout. Once the
// $199 subscription is active, the account becomes an affiliate tutor with
// its first code, and goes to the portal.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { activateAffiliateTutor } from "@/lib/tutor-affiliate/service";

export const metadata: Metadata = { title: "Welcome — Karman tutor plan" };
export const dynamic = "force-dynamic";

export default async function TutorWelcomePage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const result = await activateAffiliateTutor(affiliateDeps, { clerkId: userId });
  if (result.ok) redirect("/tutor");

  const text =
    result.reason === "not_paid"
      ? "We're still confirming your payment with Stripe. This usually takes a few seconds."
      : result.reason === "wrong_account"
        ? "This account already has another Karman role, so it can't become a tutor plan account."
        : "We couldn't find your account. Please sign in again.";

  return (
    <PortalShell portal="Tutor" nav={[]} title="Setting up your tutor plan">
      <Panel>
        <Card>
          <SectionHeader title="Almost there" />
          <p className="kp-meta">{text}</p>
          {result.reason === "not_paid" && (
            <Link className="kp-link" href="/tutors/welcome">
              Check again
            </Link>
          )}
        </Card>
      </Panel>
    </PortalShell>
  );
}
