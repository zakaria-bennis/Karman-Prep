// ============================================================
// GET /api/admin/moderation/sender/[userUuid]
//
// Returns triage context for a single user: warning count, recent
// flagged / rejected messages, and last N moderation actions taken
// against them. Drives the queue UI's sender drill-in panel.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  countWarningsForUser,
  listActionsForUser,
  listRecentFlaggedFromSender,
} from "@/lib/supabase/queries/chat";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userUuid: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userUuid } = await params;
  if (!userUuid) return NextResponse.json({ error: "Missing userUuid" }, { status: 400 });

  const [warningCount, recentFlagged, recentActions, userResp] = await Promise.all([
    countWarningsForUser(userUuid),
    listRecentFlaggedFromSender(userUuid, 10),
    listActionsForUser(userUuid, 10),
    createAdminClient()
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("id", userUuid)
      .maybeSingle(),
  ]);

  if (userResp.error || !userResp.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const u = userResp.data;

  return NextResponse.json({
    user: {
      uuid: u.id,
      display_name:
        [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || (u.email as string),
      email: u.email,
    },
    warningCount,
    recentFlagged: recentFlagged.map((m) => ({
      kind: m.kind,
      id: m.row.id,
      content: m.row.content,
      moderation_status: m.row.moderation_status,
      ai_flag_reason: m.row.ai_flag_reason,
      created_at: m.row.created_at,
    })),
    recentActions: recentActions.map((a) => ({
      id: a.id,
      action_type: a.action_type,
      reason: a.reason,
      severity: a.severity,
      created_at: a.created_at,
    })),
  });
}
