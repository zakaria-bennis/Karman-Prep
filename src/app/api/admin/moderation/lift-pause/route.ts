// ============================================================
// POST /api/admin/moderation/lift-pause
// Body: { targetUserUuid }
//
// A student's chats were paused by the moderation check (answer-
// sharing twice, or sexual content). An admin has looked and lets
// them chat again: the pause is lifted and the count starts over.
// Admin-only.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { liftPause } from "@/lib/chat/standing";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { moderationLiftPauseBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = moderationLiftPauseBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const adminUuid = await getUserUuidByClerkId(userId);
  if (!adminUuid) return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });

  await liftPause(parsed.data.targetUserUuid, adminUuid);
  return NextResponse.json({ ok: true });
}
