// ============================================================
// POST /api/admin/moderation/approve
// Body: { kind: "chat"|"dm", messageId, reason? }
//
// Releases a flagged message:
//   · chat: posts to Slack now, then flips the row to approved
//     and stamps the real slack_message_ts.
//   · dm:   no Slack involvement (DMs are Supabase-only); just
//     flips the row to approved.
//
// Admin-only. Audit fields (human_reviewed*) are populated by
// the query helper.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  approveChatMessage,
  approveDirectMessage,
  findChatChannelById,
  findChatMessageById,
  findDirectMessageById,
} from "@/lib/supabase/queries/chat";
import { postMessage as slackPostMessage, SlackAdapterError } from "@/lib/integrations/slack";
import { moderationActionBodySchema } from "../schemas";

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

  if (body.kind === "chat") {
    const row = await findChatMessageById(body.messageId);
    if (!row) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (row.moderation_status !== "flagged") {
      return NextResponse.json(
        { error: `Message is already ${row.moderation_status}` },
        { status: 409 }
      );
    }
    const channel = await findChatChannelById(row.channel_id);
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    let slackTs: string;
    try {
      const result = await slackPostMessage({
        channelId: channel.slack_channel_id,
        displayName: row.display_name_override ?? "Karman",
        content: row.content ?? "",
        imageUrls: row.media_urls,
      });
      slackTs = result.ts;
    } catch (err) {
      const isAdapter = err instanceof SlackAdapterError;
      console.error(
        "[admin/moderation/approve] slack post failed:",
        isAdapter ? err.toString() : err
      );
      return NextResponse.json(
        { error: "Failed to deliver approved message to Slack" },
        { status: 502 }
      );
    }
    const updated = await approveChatMessage({
      messageId: row.id,
      adminUuid,
      slackMessageTs: slackTs,
    });
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
  const updated = await approveDirectMessage({ messageId: row.id, adminUuid });
  return NextResponse.json({ message: updated });
}
