// ============================================================
// POST /api/admin/moderation/reject
// Body: { kind: "chat"|"dm", messageId, reason? }
//
// Permanently rejects a flagged message. Sets moderation_status
// to 'rejected', stamps audit fields, and stores the (optional)
// admin reason as rejection_message — which the renderer already
// surfaces to the sender as a takedown notice.
//
// Admin-only.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findChatMessageById,
  findDirectMessageById,
  rejectChatMessage,
  rejectDirectMessage,
} from "@/lib/supabase/queries/chat";
import { moderationActionBodySchema } from "../schemas";

const DEFAULT_REJECTION_MESSAGE = "This message was removed by an admin after review.";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = moderationActionBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const adminUuid = await getUserUuidByClerkId(userId);
  if (!adminUuid) return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });

  const rejectionMessage = body.reason?.trim() || DEFAULT_REJECTION_MESSAGE;

  if (body.kind === "chat") {
    const row = await findChatMessageById(body.messageId);
    if (!row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (row.moderation_status !== "flagged") {
      return NextResponse.json(
        { error: `Message is already ${row.moderation_status}` },
        { status: 409 }
      );
    }
    const updated = await rejectChatMessage({ messageId: row.id, adminUuid, rejectionMessage });
    return NextResponse.json({ message: updated });
  }

  // kind === "dm"
  const row = await findDirectMessageById(body.messageId);
  if (!row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (row.moderation_status !== "flagged") {
    return NextResponse.json(
      { error: `Message is already ${row.moderation_status}` },
      { status: 409 }
    );
  }
  const updated = await rejectDirectMessage({ messageId: row.id, adminUuid, rejectionMessage });
  return NextResponse.json({ message: updated });
}
