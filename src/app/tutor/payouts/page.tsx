// ============================================================
// /tutor/payouts — the actual money flow.
//
// Three sections:
//   1. Hero — pending payout amount + 2 big buttons (Instant / ACH).
//      If the tutor isn't onboarded with Stripe yet, link to settings.
//   2. Sessions ready for payout — table of eligible bookings
//      so the tutor sees exactly what's being bundled.
//   3. Payout history — last 10 requests with status pills.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchTutorEarningsSummary,
  fetchTutorPayoutRequests,
  fetchTutorStudentSessionCounts,
  type TutorEarningsSession,
} from "@/lib/supabase/queries/earnings";
import { fetchAccountStatus } from "@/lib/integrations/stripe/connect";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PayoutsClient from "./PayoutsClient";

export const metadata: Metadata = { title: "Payouts — Karman" };
export const dynamic = "force-dynamic";

export default async function TutorPayoutsPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id, first_name, stripe_connect_account_id, stripe_payouts_enabled")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  const tutorUserId = caller.id as string;

  // Eligible SESSIONS — ready to be bundled into a payout request.
  const { data: eligibleRaw } = await supabase
    .from("sessions")
    .select(
      `
      id, scheduled_start, duration_minutes, status, cohort_id,
      zoom_meeting_id, zoom_attended_emails,
      recap_email_sent, recap_sent_at, payout_status, payout_amount, tutor_hours,
      cohort:cohorts(id, name, tier),
      bookings(student:users!bookings_student_id_fkey(id, first_name, last_name, email))
    `
    )
    .eq("tutor_id", tutorUserId)
    .eq("recap_email_sent", true)
    .eq("payout_status", "pending")
    .order("scheduled_start", { ascending: false });

  const arr = <T,>(v: unknown): T | null =>
    Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null);

  const eligible: TutorEarningsSession[] = (eligibleRaw ?? []).map((row) => {
    const cohortObj = arr<TutorEarningsSession["cohort"]>(row.cohort);
    const bookingsArr = (row.bookings as Array<{ student?: unknown }> | null) ?? [];
    const enrolled = bookingsArr
      .map((b) =>
        arr<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>(b.student)
      )
      .filter((s): s is NonNullable<typeof s> => !!s && !!s.id);
    return {
      id: row.id as string,
      scheduled_start: row.scheduled_start as string,
      duration_minutes: (row.duration_minutes as number | null) ?? null,
      tier: cohortObj?.tier ?? "private",
      status: row.status as string,
      cohort_id: (row.cohort_id as string | null) ?? null,
      zoom_meeting_id: (row.zoom_meeting_id as string | null) ?? null,
      zoom_attended_emails: (row.zoom_attended_emails as string[] | null) ?? null,
      recap_email_sent: row.recap_email_sent === true,
      recap_sent_at: (row.recap_sent_at as string | null) ?? null,
      payout_status: (row.payout_status as string) ?? "pending",
      payout_amount: (row.payout_amount as number | null) ?? null,
      tutor_hours: (row.tutor_hours as number | null) ?? null,
      cohort: cohortObj,
      enrolled,
    };
  });

  const [summary, history, studentCounts] = await Promise.all([
    fetchTutorEarningsSummary(tutorUserId),
    fetchTutorPayoutRequests(tutorUserId, 10),
    fetchTutorStudentSessionCounts(tutorUserId),
  ]);

  // Map → object so it crosses the server/client boundary cleanly.
  const studentCountsObj: Record<string, number> = {};
  for (const [k, v] of studentCounts) studentCountsObj[k] = v;

  // Pull live Stripe status so the page can correctly enable/disable
  // the Instant button (requires a debit card on file). Failures here
  // are non-fatal — we just disable Instant and let ACH still work.
  let instantAvailable = false;
  if (caller.stripe_connect_account_id) {
    try {
      const status = await fetchAccountStatus(caller.stripe_connect_account_id as string);
      instantAvailable = status.instant_payouts_active;
    } catch (err) {
      console.warn(
        "[payouts] fetchAccountStatus failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Link
          href="/tutor/earnings"
          className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-ivory dark:hover:text-ivory"
        >
          <ChevronLeft className="h-4 w-4" /> My earnings
        </Link>

        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-info">Tutor Portal</p>
          <h1 className="text-2xl font-extrabold text-ivory dark:text-ivory">Get paid</h1>
          <p className="mt-1 text-sm text-taupe dark:text-taupe">
            Pick instant or ACH. Money moves from KarmanPrep to your Stripe account, then to your
            bank or debit card.
          </p>
        </header>

        {!caller.stripe_connect_account_id || !caller.stripe_payouts_enabled ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-5 dark:border-warning/40 dark:bg-warning/10">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning dark:text-warning-bright" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-warning dark:text-warning-bright">
                Set up payments first
              </h2>
              <p className="mt-1 text-sm text-warning dark:text-warning-bright/90">
                Before you can request a payout, finish Stripe onboarding so we know where to send
                the money.
              </p>
              <Link
                href="/tutor/settings/payment"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-night hover:bg-warning-bright"
              >
                Go to payment settings
              </Link>
            </div>
          </div>
        ) : (
          <PayoutsClient
            pendingAmount={summary.pending_amount}
            eligibleSessions={eligible}
            history={history}
            instantAvailable={instantAvailable}
            studentSessionCounts={studentCountsObj}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
