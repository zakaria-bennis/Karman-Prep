// ============================================================
// /dashboard/student/schedule — student's session management.
//
// Renders BookingWidget (for self-bookable tiers) + the
// student's upcoming session card. Group + small_group students
// see a read-only view of pushed sessions; they can't self-book.
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BookingWidget } from "@/components/dashboard/BookingWidget";
import {
  UpcomingSession,
  type UpcomingSessionBooking,
} from "@/components/dashboard/UpcomingSession";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import {
  getUpcomingBookingForStudent,
  type BookingPlanTier,
} from "@/lib/supabase/queries/bookings";
import { ensureEliteMonthlyTokens, getAvailableTokenCount } from "@/lib/supabase/queries/tokens";
import {
  markAdminAlerted,
  shouldAlertAdminAboutMissingSetup,
} from "@/lib/supabase/queries/cal-oauth";
import { resend, FROM } from "@/lib/integrations/resend/client";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

/** Best-effort: fire an admin email when a student lands on the
 *  schedule page but their tutor hasn't finished Cal setup. Deduped
 *  per tutor with a 24h backoff so we don't fire on every page load.
 *  Wrapped in try/catch — failure must not block the page render. */
async function alertAdminAboutMissingTutorSetup(args: {
  tutorUuid: string;
  tutorName: string;
  studentName: string | null;
  status: "not_connected" | "needs_event_type";
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return; // not configured locally; skip silently
  try {
    const should = await shouldAlertAdminAboutMissingSetup(args.tutorUuid);
    if (!should) return;
    const headline =
      args.status === "not_connected"
        ? `${args.tutorName} hasn't connected Cal yet`
        : `${args.tutorName} hasn't picked their Karman event-type yet`;
    const cta =
      args.status === "not_connected"
        ? 'Ask them to visit /tutor/settings/booking and click "Connect Cal.com".'
        : "Ask them to visit /tutor/settings/booking and pick their event-type from the dropdown.";
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[Karman] Tutor setup needed — ${args.tutorName}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
          <h2 style="color: #070605;">${headline}</h2>
          <p style="color: #222018;">
            A student${args.studentName ? ` (${args.studentName})` : ""} tried to book a session
            but their assigned tutor hasn't finished setting up their Cal.com link in Karman.
          </p>
          <p style="color: #222018;"><strong>Next step:</strong> ${cta}</p>
          <p style="color: #B8B0A1; font-size: 12px; margin-top: 24px;">
            You'll only get one of these per tutor every 24 hours.
          </p>
        </div>
      `,
    });
    await markAdminAlerted(args.tutorUuid);
  } catch (err) {
    console.error("[schedule] admin alert email failed (non-fatal):", err);
  }
}

export default async function StudentSchedulePage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .single();
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  if (!isActive && !isImpersonating) redirect("/billing?required=1");
  // When impersonating an unsubscribed user there's nothing to schedule;
  // send the admin back to user list rather than render a broken page.
  if (isImpersonating && !sub) redirect("/admin/users");

  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
  if (!user?.id) redirect("/onboarding");

  const planTier = sub!.tier as BookingPlanTier;
  const canSelfBook = planTier === "private" || planTier === "elite";

  // Student's own name for the admin-alert email (no PII beyond Karman-internal).
  let studentName: string | null = null;
  {
    const { data: studentRow } = await supabase
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .maybeSingle();
    if (studentRow) {
      studentName =
        [studentRow.first_name, studentRow.last_name].filter(Boolean).join(" ").trim() ||
        studentRow.email ||
        null;
    }
  }

  interface AssignedTutor {
    uuid: string;
    clerkId: string;
    name: string;
    /** Cal event-type id the tutor bound on /tutor/settings/booking.
     *  Null when the tutor either hasn't connected Cal or connected but
     *  hasn't picked which event-type is the Karman session. */
    calEventTypeId: number | null;
    calConnected: boolean;
  }
  let assignedTutor: AssignedTutor | null = null;
  if (canSelfBook) {
    const { data: assignment } = await supabase
      .from("tutor_assignments")
      .select(
        "tutor:users!tutor_assignments_tutor_user_id_fkey ( id, clerk_id, first_name, last_name, email, cal_event_type_id, cal_connected_at )"
      )
      .eq("student_user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();
    type TutorJoin = {
      tutor: {
        id: string;
        clerk_id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        cal_event_type_id: number | null;
        cal_connected_at: string | null;
      } | null;
    };
    const tutorRow = (assignment as TutorJoin | null)?.tutor ?? null;
    if (tutorRow) {
      assignedTutor = {
        uuid: tutorRow.id,
        clerkId: tutorRow.clerk_id,
        name:
          [tutorRow.first_name, tutorRow.last_name].filter(Boolean).join(" ").trim() ||
          tutorRow.email,
        calEventTypeId:
          tutorRow.cal_event_type_id === null ? null : Number(tutorRow.cal_event_type_id),
        calConnected: !!tutorRow.cal_connected_at,
      };
    }
  }

  // Fire admin alert when self-bookable but tutor isn't ready. Deduped
  // for 24h per tutor inside alertAdminAboutMissingTutorSetup().
  if (canSelfBook && assignedTutor && assignedTutor.calEventTypeId === null) {
    await alertAdminAboutMissingTutorSetup({
      tutorUuid: assignedTutor.uuid,
      tutorName: assignedTutor.name,
      studentName,
      status: assignedTutor.calConnected ? "needs_event_type" : "not_connected",
    });
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
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-info">Schedule</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
            <CalendarClock className="h-6 w-6 text-taupe" />
            Your sessions
          </h1>
          {!upcoming ? (
            <p className="mt-2 text-sm text-taupe dark:text-taupe">
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
              canSelfBook && assignedTutor && assignedTutor.calEventTypeId !== null
                ? {
                    tutorClerkId: assignedTutor.clerkId,
                    eventTypeId: assignedTutor.calEventTypeId,
                  }
                : undefined
            }
          />
        ) : null}

        {canSelfBook && assignedTutor && assignedTutor.calEventTypeId !== null ? (
          <BookingWidget
            tutorName={assignedTutor.name}
            tutorClerkId={assignedTutor.clerkId}
            eventTypeId={assignedTutor.calEventTypeId}
            tokensAvailable={tokensAvailable}
          />
        ) : null}

        {canSelfBook && !assignedTutor ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 dark:border-warning/20 dark:bg-warning/5">
            <p className="text-sm text-warning dark:text-warning-bright">
              No tutor assigned yet. An admin will pair you with a tutor shortly.
            </p>
          </div>
        ) : null}

        {canSelfBook && assignedTutor && assignedTutor.calEventTypeId === null ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-4 dark:border-warning/20 dark:bg-warning/5">
            <p className="text-sm font-semibold text-warning dark:text-warning-bright">
              {assignedTutor.name} is finishing their schedule setup
            </p>
            <p className="mt-1 text-sm text-warning dark:text-warning-bright/80">
              Your tutor is connecting their Cal.com calendar to Karman. We&rsquo;ve let our team
              know &mdash; you&rsquo;ll get an email when booking opens. Usually takes less than a
              business day.
            </p>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
