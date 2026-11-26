// /tutors/welcome — Stripe sends a new tutor here after checkout. Once the
// tutor plan's subscription is active, the account becomes an affiliate tutor
// with its first code, and goes to the portal. Stripe's confirmation can
// arrive a few seconds after the tutor does, so the page checks again by
// itself for about a minute; the link stays for after that.
// Checkout also sends an account here when it may not buy the tutor plan (a
// parent's, or a student's with a plan of its own): the one line says why.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Card, Panel, PortalShell, SectionHeader } from "@/components/portal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { ensureUserRow } from "@/lib/auth/ensure-user";
import { TUTOR_PLAN_REFUSED, tutorPlanRefused } from "@/lib/tutor-affiliate/buyer";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { activateAffiliateTutor } from "@/lib/tutor-affiliate/service";

export const metadata: Metadata = { title: "Welcome — Karman tutor plan" };
export const dynamic = "force-dynamic";

/** Seconds between the page's own checks, and how many it makes before leaving it to the link. */
const RETRY_SECONDS = 5;
const RETRIES = 12;
const trySchema = z.coerce.number().int().min(0).max(RETRIES).catch(0);

export default async function TutorWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ try?: string | string[] }>;
}) {
  const { userId } = await safeAuth();
  if (!userId) redirect(`/auth/sign-in?redirect_url=${encodeURIComponent("/tutors/welcome")}`);
  // A brand-new account has no record yet; the tutor plan starts from one.
  await ensureUserRow(userId);
  const result = await activateAffiliateTutor(affiliateDeps, { clerkId: userId });
  if (result.ok) redirect("/tutor");

  const refused =
    result.reason === "wrong_account" ||
    (result.reason === "not_paid" && (await tutorPlanRefused(userId, "student")));
  const waiting = result.reason === "not_paid" && !refused;
  const tries = trySchema.parse((await searchParams).try);

  const text = refused
    ? TUTOR_PLAN_REFUSED
    : waiting
      ? "We're still confirming your payment with Stripe. This usually takes a few seconds."
      : "We couldn't find your account. Please sign in again.";

  return (
    <PortalShell
      portal="Tutor"
      nav={[]}
      title={refused ? "The tutor plan" : "Setting up your tutor plan"}
    >
      {waiting && tries < RETRIES && (
        <meta
          httpEquiv="refresh"
          content={`${RETRY_SECONDS};url=/tutors/welcome?try=${tries + 1}`}
        />
      )}
      <Panel>
        <Card>
          {!refused && <SectionHeader title="Almost there" />}
          <p className="kp-meta">{text}</p>
          {waiting && (
            <Link className="kp-link" href="/tutors/welcome">
              Check again
            </Link>
          )}
        </Card>
      </Panel>
    </PortalShell>
  );
}
