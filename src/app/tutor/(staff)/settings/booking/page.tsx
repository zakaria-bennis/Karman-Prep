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
  if (!tutorUuid) redirect("/tutor");

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
      eventTypesError = "Your Cal connection expired. Disconnect and connect again.";
    } else {
      try {
        eventTypes = await listEventTypes(accessToken);
      } catch (err) {
        console.error("[settings/booking] listEventTypes failed:", err);
        eventTypesError = "Your Cal event types didn't load. Refresh the page.";
      }
    }
  }

  const errorMessage = decodeCalError(params.cal_error);
  const successMessage = buildSuccessMessage(params, status.eventTypeTitle);

  return (
    <div className="wb" style={{ paddingBlock: 0 }}>
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
          (the free plan is fine). Put &ldquo;Karman&rdquo; or &ldquo;SAT&rdquo; in an event
          type&rsquo;s title and we&rsquo;ll find it.
        </p>
      </Card>

      <Card>
        <SectionHeader title="Payment settings" />
        <MoreLink href="/tutor/settings/payment">Payment settings</MoreLink>
      </Card>
    </div>
  );
}

function decodeCalError(code: string | undefined): string | null {
  switch (code) {
    case "bad_state":
      return "Cal didn't connect. Try again.";
    case "no_profile":
      return "Your Karman profile wasn't found. Contact support.";
    case "exchange_failed":
      return "Cal.com rejected the connection. If this keeps happening, contact support.";
    case "store_failed":
      return "We connected to Cal but couldn't save it. Try again.";
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
    return `Connected. Students book "${params.auto_picked}".`;
  }
  if (params.needs_pick) {
    return "Connected. Pick the Karman event type below.";
  }
  if (currentTitle) {
    return `Connected. Students book "${currentTitle}".`;
  }
  return "Connected.";
}
