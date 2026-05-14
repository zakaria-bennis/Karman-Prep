// ============================================================
// POST /api/chat/pin   — { messageId, pinned }
// Tutor or admin pins/unpins a message. Mirrors to Slack.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  findChatChannelById,
  findChatMessageById,
  isTutorOfChannel,
  setMessagePinned,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { pinMessage, unpinMessage, SlackAdapterError } from "@/lib/integrations/slack";

interface PinRequest {
  messageId: string;
  pinned: boolean;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<PinRequest>;
  try {
    body = (await req.json()) as Partial<PinRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.messageId || typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "Missing messageId or pinned" }, { status: 400 });
  }

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const message = await findChatMessageById(body.messageId);
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  const channel = await findChatChannelById(message.channel_id);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const role = await fetchUserRole(userId);
  const isTutor = await isTutorOfChannel(callerUuid, channel.id);
  if (role !== "admin" && !isTutor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (body.pinned) {
      await pinMessage(channel.slack_channel_id, message.slack_message_ts);
    } else {
      await unpinMessage(channel.slack_channel_id, message.slack_message_ts);
    }
  } catch (err) {
    const isAdapter = err instanceof SlackAdapterError;
    console.error("[api/chat/pin] slack error:", isAdapter ? err.toString() : err);
    return NextResponse.json({ error: "Failed to pin on Slack" }, { status: 502 });
  }

  await setMessagePinned(message.id, body.pinned);
  return NextResponse.json({ ok: true });
}
