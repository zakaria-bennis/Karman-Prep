import Link from "next/link";
import DashboardLayout from "./DashboardLayout";
import LearnDashboard from "@/components/learn/LearnDashboard";
import type { LearnDashboardData } from "@/lib/learn/dashboard";
import type { StudentCalendarData } from "@/lib/learn/week-calendar";

interface Props {
  dashboard: LearnDashboardData;
  diagnostic: { score_range_low: number; score_range_high: number } | null;
  subscription: { status: string; trial_end: string | null } | null;
  showPlacementBanner?: boolean;
  calendar: StudentCalendarData;
  calendarAsOf: string;
  preferredTimeZone: string | null;
}

export default function StudentDashboardClient({
  dashboard,
  diagnostic,
  subscription,
  showPlacementBanner,
  calendar,
  calendarAsOf,
  preferredTimeZone,
}: Props) {
  const trialEndsLabel = subscription?.trial_end
    ? `Trial ends ${new Date(subscription.trial_end).toLocaleDateString()}`
    : null;

  return (
    <DashboardLayout>
      {(showPlacementBanner || (subscription?.status === "trialing" && trialEndsLabel)) && (
        <div className="mx-auto max-w-6xl space-y-3 px-5 pt-6 sm:px-8">
          {showPlacementBanner && (
            <div className="border-l-4 border-info bg-info/10 px-4 py-3 text-sm">
              <p className="font-semibold text-info">We&rsquo;re matching you with a tutor</p>
              <p className="mt-1 leading-relaxed text-taupe">
                Your answers are saved. Our team is pairing you with the right tutor or cohort.
                While you wait, you can take the diagnostic and explore the curriculum.
              </p>
            </div>
          )}
          {subscription?.status === "trialing" && trialEndsLabel && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-warning bg-warning/10 px-4 py-3 text-sm">
              <p className="text-ivory">
                {trialEndsLabel} — your card will be charged automatically.
              </p>
              <Link
                href="/billing"
                className="font-semibold text-warning underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              >
                Manage plan
              </Link>
            </div>
          )}
        </div>
      )}
      <LearnDashboard
        dashboard={dashboard}
        diagnostic={diagnostic}
        calendar={calendar}
        calendarAsOf={calendarAsOf}
        preferredTimeZone={preferredTimeZone}
        embedded
      />
    </DashboardLayout>
  );
}
