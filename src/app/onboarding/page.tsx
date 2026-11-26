// ============================================================
// Onboarding page: the guided intake. It can be taken before an account exists.
// Wraps the client component in Suspense for useSearchParams.
// Upcoming SAT dates come from the sat_dates table.
// ============================================================

import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";
import { knownSatDates } from "@/lib/sat-dates-static";
import { Suspense } from "react";
import { dayKey } from "@/lib/student/streak";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const today = dayKey(Date.now());
  const { data } = await createAdminClient()
    .from("sat_dates")
    .select("test_date")
    .gte("test_date", today)
    .order("test_date", { ascending: true })
    .limit(10);
  const signedIn = await safeAuth()
    .then((a) => Boolean(a.userId))
    .catch(() => false);
  // College Board's own list fills any gap in the table (September 2027 was missing from it)
  const satDates = knownSatDates(
    ((data ?? []) as { test_date: string }[]).map((r) => r.test_date),
    today
  );
  // Who this is, when it is already known, so "student or parent" is not asked: a parent account, or a
  // link that says so (/onboarding?as=student from a class code, a tutor's code or a parent's invite;
  // ?as=parent from a page written for parents).
  const me = signedIn
    ? await safeAuth()
        .then(async (a) => {
          if (!a.userId) return null;
          const { clerkId } = await resolveEffectiveClerkId(a.userId);
          const [role, { data: answers }] = await Promise.all([
            resolveEffectiveRole(clerkId),
            createAdminClient()
              .from("users")
              .select("goal_sat_score, sat_test_date")
              .eq("clerk_id", clerkId)
              .maybeSingle(),
          ]);
          // a student account that has answered these questions before already said who it is
          return { role, answered: Boolean(answers?.goal_sat_score || answers?.sat_test_date) };
        })
        .catch(() => null)
    : null;
  const who =
    me?.role === "parent"
      ? "parent"
      : me?.role === "student" && me.answered
        ? "student"
        : as === "parent" || as === "student"
          ? as
          : null;
  // In the home page's world, with nothing to wander off to: the landscape is flown by the steps.
  return (
    <SitePage kind="lit" bare noTheme drive="steps" className={litFonts}>
      <Suspense fallback={null}>
        <OnboardingClient satDates={satDates} signedIn={signedIn} who={who} />
      </Suspense>
    </SitePage>
  );
}
