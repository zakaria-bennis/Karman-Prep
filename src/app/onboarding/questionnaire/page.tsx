// ============================================================
// /onboarding/questionnaire — post-payment intake.
//
// Multi-step form: SAT schedule → Background → Availability
// (Private/Elite only) → Family → How-did-you-hear → submit.
// On submit: places into a cohort (group/small_group) or assigns
// a tutor (private/elite) and marks onboarding_completed_at so
// the dashboard layout stops redirecting here.
// ============================================================

import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/supabase/queries/bookings";
import { dayKey } from "@/lib/student/streak";
import QuestionnaireClient, { type SatDateOption } from "./QuestionnaireClient";

export const metadata: Metadata = { title: "Tell us about your prep" };
export const dynamic = "force-dynamic";

export default async function OnboardingQuestionnairePage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    redirect("/billing?required=1");
  }

  const supa = createAdminClient();
  const { data: existing } = await supa
    .from("users")
    .select("onboarding_completed_at, first_name")
    .eq("clerk_id", userId)
    .maybeSingle();
  if (existing?.onboarding_completed_at) {
    // Already onboarded — bounce them to the dashboard.
    redirect("/dashboard/student");
  }

  // Upcoming SAT dates from the sat_dates table. When it is empty, the student can still answer
  // "Not registered yet" (or pick PSAT); a stale hard-coded list would offer past dates.
  const today = dayKey(Date.now());
  const { data: satRows } = await supa
    .from("sat_dates")
    .select("test_date")
    .gte("test_date", today)
    .order("test_date", { ascending: true })
    .limit(10);

  const satDates: SatDateOption[] = (satRows ?? []).map((r) => ({
    iso: r.test_date as string,
    label: formatSatDate(r.test_date as string),
  }));

  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? existing?.first_name ?? "there";

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10">
      <AuthBackdrop />
      <Link href="/" className="relative z-10 mb-8" aria-label="Karman home">
        <KarmanLogo size={56} variant="stacked" />
      </Link>

      <QuestionnaireClient
        firstName={firstName}
        tier={sub.tier as "group" | "small_group" | "private" | "elite"}
        satDates={satDates}
        today={today}
      />
    </div>
  );
}

function formatSatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
