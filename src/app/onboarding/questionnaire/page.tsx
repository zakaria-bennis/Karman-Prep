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
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";
import { createAdminClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/supabase/queries/bookings";
import QuestionnaireClient, { type SatDateOption } from "./QuestionnaireClient";

export const metadata: Metadata = { title: "Tell us about your prep" };
export const dynamic = "force-dynamic";

export default async function OnboardingQuestionnairePage() {
  const { userId } = await auth();
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

  // Pull upcoming SAT dates from sat_dates table; fall back to a
  // sane hardcoded set if the table is empty (e.g. early dev).
  const { data: satRows } = await supa
    .from("sat_dates")
    .select("test_date")
    .gte("test_date", new Date().toISOString().slice(0, 10))
    .order("test_date", { ascending: true })
    .limit(10);

  const satDates: SatDateOption[] =
    satRows && satRows.length > 0
      ? satRows.map((r) => ({
          iso: r.test_date as string,
          label: formatSatDate(r.test_date as string),
        }))
      : FALLBACK_SAT_DATES;

  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? existing?.first_name ?? "there";

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10">
      <AuthBackdrop />
      <Link href="/" className="relative z-10 mb-8" aria-label="Karman home">
        <StrataLogo size={56} variant="stacked" />
      </Link>

      <QuestionnaireClient
        firstName={firstName}
        tier={sub.tier as "group" | "small_group" | "private" | "elite"}
        satDates={satDates}
      />
    </div>
  );
}

const FALLBACK_SAT_DATES: SatDateOption[] = [
  { iso: "2026-08-23", label: "Aug 23, 2026" },
  { iso: "2026-09-13", label: "Sep 13, 2026" },
  { iso: "2026-10-04", label: "Oct 4, 2026" },
  { iso: "2026-11-07", label: "Nov 7, 2026" },
  { iso: "2026-12-06", label: "Dec 6, 2026" },
];

function formatSatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
