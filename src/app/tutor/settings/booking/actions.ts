"use server";

// ============================================================
// Server actions for /tutor/settings/booking.
//
// pickCalEventTypeAction — saves the tutor's choice from the
// dropdown shown after OAuth when keyword auto-match didn't find
// exactly one Karman event-type.
//
// All actions:
//   · Require Clerk auth.
//   · Require role tutor or admin.
//   · Validate the input via Zod.
//   · Re-fetch the tutor's event-types using their stored access
//     token so a client can't fabricate an event-type-id we'd
//     blindly trust — the picked id must exist in the tutor's
//     own Cal account.
// ============================================================

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { getValidCalAccessToken, setCalEventType } from "@/lib/supabase/queries/cal-oauth";
import { listEventTypes } from "@/lib/integrations/cal/oauth";

const pickEventTypeSchema = z.object({
  eventTypeId: z.number().int().positive(),
});

export async function pickCalEventTypeAction(input: { eventTypeId: number }): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") throw new Error("Forbidden");

  const parsed = pickEventTypeSchema.parse(input);

  const tutorUuid = await getUserUuidByClerkId(userId);
  if (!tutorUuid) throw new Error("Profile not found");

  const accessToken = await getValidCalAccessToken(tutorUuid);
  if (!accessToken) throw new Error("Cal connection has expired — please reconnect.");

  const eventTypes = await listEventTypes(accessToken);
  const target = eventTypes.find((ev) => ev.id === parsed.eventTypeId);
  if (!target) {
    throw new Error(
      "That event-type isn't in your Cal account anymore. Refresh the page and pick again."
    );
  }

  await setCalEventType({
    tutorUserId: tutorUuid,
    eventTypeId: target.id,
    eventTypeTitle: target.title,
  });
  revalidatePath("/tutor/settings/booking");
  revalidatePath("/tutor");
}
