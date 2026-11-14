// ============================================================
// Onboarding page: the guided intake. It can be taken before an account exists.
// Wraps the client component in Suspense for useSearchParams.
// Upcoming SAT dates come from the sat_dates table.
// ============================================================

import { Suspense } from "react";
import { dayKey } from "@/lib/student/streak";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
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
  const satDates = ((data ?? []) as { test_date: string }[]).map((r) => r.test_date);
  // In the home page's world, with nothing to wander off to: the landscape is flown by the steps.
  return (
    <SitePage kind="lit" bare drive="steps" className={litFonts}>
      <Suspense fallback={null}>
        <OnboardingClient satDates={satDates} today={today} signedIn={signedIn} />
      </Suspense>
    </SitePage>
  );
}
