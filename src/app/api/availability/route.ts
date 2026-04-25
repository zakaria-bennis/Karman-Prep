// ============================================================
// GET /api/availability
//
// Returns Cal.com available slots for a given event type + window.
// Gated by Clerk auth + plan tier — only Private and Elite can hit
// it (group/small_group don't self-book).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAvailability, CalAdapterError } from "@/lib/cal";
import { canSelfBook, getActiveSubscription } from "@/lib/supabase/queries/bookings";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }
  if (!canSelfBook(sub.tier)) {
    return NextResponse.json(
      { error: "Plan not eligible for self-booking" },
      { status: 403 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const eventTypeId = sp.get("eventTypeId");
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const timeZone = sp.get("timeZone") ?? undefined;

  if (!eventTypeId || !dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "Missing eventTypeId, dateFrom, or dateTo" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailability({ eventTypeId, dateFrom, dateTo, timeZone });
    return NextResponse.json({ slots });
  } catch (err) {
    const isAdapter = err instanceof CalAdapterError;
    console.error("[api/availability]", isAdapter ? err.toString() : err);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: isAdapter && err.statusCode >= 400 && err.statusCode < 500 ? 400 : 502 }
    );
  }
}
