// ============================================================
// POST /api/cal/oauth/disconnect
//
// Wipe the tutor's Cal OAuth credentials + event-type binding.
// Students who were about to book with this tutor will start
// seeing the friendly "tutor finishing setup" banner again.
//
// Tutor (self) and admin can call this. Students get 403.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { clearCalConnection } from "@/lib/supabase/queries/cal-oauth";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tutorUuid = await getUserUuidByClerkId(userId);
  if (!tutorUuid) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    await clearCalConnection(tutorUuid);
  } catch (err) {
    console.error("[cal/oauth/disconnect] error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
