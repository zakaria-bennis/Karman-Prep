// ============================================================
// /tutor/settings/booking — tutor connects their Cal.com account.
//
// Three states render here:
//   1. Not connected → the "Connect Cal.com" main button.
//   2. Connected but no event-type bound → dropdown of the tutor's
//      Cal event-types (we tried to auto-match by keyword and the
//      callback couldn't pick one — multiple matches or none).
//   3. Connected with event-type bound → status card showing
//      which event-type students book against, plus a "change"
//      dropdown and "disconnect" button.
//
// The dedicated /tutor home banner that prompts setup links here.
// The Settings tab opens this page; payment settings are linked below.
// ============================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { getCalConnectionStatus, getValidCalAccessToken } from "@/lib/supabase/queries/cal-oauth";
import { listEventTypes, type CalEventType } from "@/lib/integrations/cal/oauth";
import { Card, MoreLink, SectionHeader } from "@/components/portal";
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
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);
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
    <div className="wb" style={{ paddingBlock: 0 }}>
      <p className="wb-note">
        Connect your Cal.com account so your students book sessions on your real calendar.
      </p>

      {errorMessage ? (
        <p className="wb-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="wb-alert" data-tone="ok" role="status">
          {successMessage}
        </p>
      ) : null}

      <CalConnectionClient
        status={status}
        eventTypes={eventTypes}
        eventTypesError={eventTypesError}
      />

      <Card>
        <SectionHeader title="Need a Cal account?" />
        <p className="kp-meta">
          Sign up at{" "}
          <a className="kp-link" href="https://cal.com" target="_blank" rel="noreferrer">
            cal.com
          </a>{" "}
          (the free plan is fine). Make one event type for Karman sessions with &ldquo;Karman&rdquo;
          or &ldquo;SAT&rdquo; in the title and we&rsquo;ll find it. Otherwise you pick it from a
          list after connecting.
        </p>
      </Card>

      <Card>
        <SectionHeader title="Payment settings" />
        <p className="kp-meta">Set up how Karman pays you through Stripe.</p>
        <MoreLink href="/tutor/settings/payment">Payment settings</MoreLink>
      </Card>
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
