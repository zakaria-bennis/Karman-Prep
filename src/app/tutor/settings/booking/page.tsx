// ============================================================
// /tutor/settings/booking — tutor connects their Cal.com account.
//
// Three states render here:
//   1. Not connected → big "Connect Cal account" button.
//   2. Connected but no event-type bound → dropdown of the tutor's
//      Cal event-types (we tried to auto-match by keyword and the
//      callback couldn't pick one — multiple matches or none).
//   3. Connected with event-type bound → status card showing
//      which event-type students book against, plus a "change"
//      dropdown and "disconnect" button.
//
// The dedicated /tutor home banner that prompts setup links here.
// ============================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { CalendarCheck, ChevronRight, ExternalLink } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { getCalConnectionStatus, getValidCalAccessToken } from "@/lib/supabase/queries/cal-oauth";
import { listEventTypes, type CalEventType } from "@/lib/integrations/cal/oauth";
import { CalConnectionClient } from "./CalConnectionClient";

export const metadata: Metadata = { title: "Booking settings" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    cal_connected?: string;
    cal_error?: string;
    auto_picked?: string;
    needs_pick?: string;
  }>;
}

export default async function TutorBookingSettingsPage({ searchParams }: PageProps) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const tutorUuid = await getUserUuidByClerkId(userId);
  if (!tutorUuid) redirect("/onboarding");

  const params = await searchParams;
  const status = await getCalConnectionStatus(tutorUuid);

  // Only fetch the live event-types if we need them — that's either
  // the just-connected case where the callback couldn't auto-pick,
  // or any time the tutor revisits this page wanting to change
  // their pick. (Fetching live ensures the dropdown is current with
  // anything they edited on Cal since their last visit.)
  let eventTypes: CalEventType[] = [];
  let eventTypesError: string | null = null;
  if (status.connected) {
    const accessToken = await getValidCalAccessToken(tutorUuid);
    if (!accessToken) {
      eventTypesError =
        "Your Cal connection seems to have expired. Disconnect and reconnect to refresh.";
    } else {
      try {
        eventTypes = await listEventTypes(accessToken);
      } catch (err) {
        console.error("[settings/booking] listEventTypes failed:", err);
        eventTypesError = "Couldn't load your Cal event-types right now. Try refreshing the page.";
      }
    }
  }

  const errorMessage = decodeCalError(params.cal_error);
  const successMessage = buildSuccessMessage(params, status.eventTypeTitle);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/tutor"
        className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-400"
      >
        <ChevronRight className="h-3 w-3 rotate-180" /> Back to tutor home
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <CalendarCheck className="h-5 w-5 text-blue-500" /> Booking settings
      </h1>
      <p className="mt-1.5 text-sm text-slate-400">
        Connect your Cal.com account so your students can book sessions on your real calendar.
      </p>

      {errorMessage ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6">
        <CalConnectionClient
          status={status}
          eventTypes={eventTypes}
          eventTypesError={eventTypesError}
        />
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-400">Need a Cal account?</p>
        <p className="mt-1">
          Sign up at{" "}
          <a
            href="https://cal.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
          >
            cal.com <ExternalLink className="h-3 w-3" />
          </a>{" "}
          (free tier works fine). Create one event-type for Karman sessions — name it something with
          &ldquo;Karman&rdquo; or &ldquo;SAT&rdquo; in the title and we&rsquo;ll auto-detect it.
          Otherwise you&rsquo;ll pick it from a dropdown after connecting.
        </p>
      </div>
    </div>
  );
}

function decodeCalError(code: string | undefined): string | null {
  switch (code) {
    case "bad_state":
      return "Connection attempt didn't complete — please try again.";
    case "no_profile":
      return "Your Karman profile wasn't found. Contact support.";
    case "exchange_failed":
      return "Cal.com rejected the connection. If this keeps happening, contact support.";
    case "store_failed":
      return "We connected to Cal but couldn't save the result. Please try again.";
    case "forbidden":
      return "Only tutors and admins can connect a Cal account.";
    default:
      return null;
  }
}

function buildSuccessMessage(
  params: { cal_connected?: string; auto_picked?: string; needs_pick?: string },
  currentTitle: string | null
): string | null {
  if (params.cal_connected !== "1") return null;
  if (params.auto_picked) {
    return `Connected — we auto-matched your event-type "${params.auto_picked}" as the Karman session.`;
  }
  if (params.needs_pick) {
    return "Connected. Now pick which of your event-types is the Karman session below.";
  }
  if (currentTitle) {
    return `Connected. Karman students will book against "${currentTitle}".`;
  }
  return "Connected.";
}
