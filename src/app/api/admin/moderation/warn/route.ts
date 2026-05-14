// ============================================================
// POST /api/admin/moderation/warn
// Body: { targetUserUuid, reason, severity, relatedMessageId?, relatedMessageKind? }
//
// Issues a warning against a user. Persists as a moderation_actions
// row with action_type='warn' and the chosen severity. Admin-only.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { recordModerationAction } from "@/lib/supabase/queries/chat";
import { moderationWarnBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = moderationWarnBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const adminUuid = await getUserUuidByClerkId(userId);
  if (!adminUuid) return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });

  await recordModerationAction({
    adminUuid,
    targetStudentUuid: body.targetUserUuid,
    actionType: "warn",
    reason: body.reason,
    severity: body.severity,
    messageId: body.relatedMessageKind === "chat" ? (body.relatedMessageId ?? null) : null,
    dmId: body.relatedMessageKind === "dm" ? (body.relatedMessageId ?? null) : null,
  });

  return NextResponse.json({ ok: true });
}
