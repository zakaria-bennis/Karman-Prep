// ============================================================
// /dashboard/student/schedule — student's session management.
//
// Renders BookingWidget (for self-bookable tiers) + the
// student's upcoming session card. Group + small_group students
// see a read-only view of pushed sessions; they can't self-book.
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BookingWidget } from "@/components/dashboard/BookingWidget";
import {
  UpcomingSession,
  type UpcomingSessionBooking,
} from "@/components/dashboard/UpcomingSession";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getUpcomingBookingForStudent,
  type BookingPlanTier,
} from "@/lib/supabase/queries/bookings";
import { ensureEliteMonthlyTokens, getAvailableTokenCount } from "@/lib/supabase/queries/tokens";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

// TEMP: smoke-test wiring — single Cal event type for every
// self-bookable student. Replace with a per-tutor lookup before
// launch (likely a `users.cal_event_type_id` column populated when
// the tutor connects their Cal account).
const SMOKE_TEST_EVENT_TYPE_ID = 5489022;

export default async function StudentSchedulePage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .single();
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  if (!isActive) redirect("/billing?required=1");

  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!user?.id) redirect("/onboarding");

  const planTier = sub.tier as BookingPlanTier;
  const canSelfBook = planTier === "private" || planTier === "elite";

  let assignedTutor: { clerkId: string; name: string } | null = null;
  if (canSelfBook) {
    const { data: assignment } = await supabase
      .from("tutor_assignments")
      .select(
        "tutor:users!tutor_assignments_tutor_user_id_fkey ( clerk_id, first_name, last_name, email )"
      )
      .eq("student_user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();
    type TutorJoin = {
      tutor: {
        clerk_id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      } | null;
    };
    const tutorRow = (assignment as TutorJoin | null)?.tutor ?? null;
    if (tutorRow) {
      assignedTutor = {
        clerkId: tutorRow.clerk_id,
        name:
          [tutorRow.first_name, tutorRow.last_name].filter(Boolean).join(" ").trim() ||
          tutorRow.email,
      };
    }
  }

  let upcoming: UpcomingSessionBooking | null = null;
  const upcomingRow = await getUpcomingBookingForStudent(user.id);
  if (upcomingRow) {
    upcoming = {
      id: upcomingRow.id,
      scheduled_start: upcomingRow.scheduled_start,
      scheduled_end: upcomingRow.scheduled_end,
      zoom_join_url: upcomingRow.zoom_join_url,
      plan_tier: upcomingRow.plan_tier,
      reschedule_count: upcomingRow.reschedule_count,
    };
  }

  // Lazy-grant the current month's elite tokens before reading balance
  // so the widget shows the right count on the first visit each month.
  if (planTier === "elite") {
    await ensureEliteMonthlyTokens(user.id);
  }
  const tokensAvailable = canSelfBook ? await getAvailableTokenCount(user.id) : 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">Schedule</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <CalendarClock className="h-6 w-6 text-slate-400" />
            Your sessions
          </h1>
          {!upcoming ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {canSelfBook
                ? "You have no upcoming sessions yet. Pick a time below to book one with your tutor."
                : "You have no upcoming sessions yet. Your tutor will post seminar / small-group sessions here as they're scheduled."}
            </p>
          ) : null}
        </header>

        {upcoming ? (
          <UpcomingSession
            booking={upcoming}
            tutorName={assignedTutor?.name ?? "your tutor"}
            rescheduleProps={
              canSelfBook && assignedTutor
                ? {
                    tutorClerkId: assignedTutor.clerkId,
                    eventTypeId: SMOKE_TEST_EVENT_TYPE_ID,
                  }
                : undefined
            }
          />
        ) : null}

        {canSelfBook && assignedTutor ? (
          <BookingWidget
            tutorName={assignedTutor.name}
            tutorClerkId={assignedTutor.clerkId}
            eventTypeId={SMOKE_TEST_EVENT_TYPE_ID}
            tokensAvailable={tokensAvailable}
          />
        ) : null}

        {canSelfBook && !assignedTutor ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/5">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No tutor assigned yet. An admin will pair you with a tutor shortly.
            </p>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
