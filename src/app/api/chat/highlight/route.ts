// ============================================================
// POST /api/chat/highlight   — { messageId, highlighted }
// Tutor highlights an answer in Q&A. Visual-only — no Slack mirror
// (Slack has no "highlight" concept; the UI uses is_highlighted to
// render a subtle purple background per spec).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  findChatChannelById,
  findChatMessageById,
  isTutorOfChannel,
  setMessageHighlighted,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

interface HighlightRequest {
  messageId: string;
  highlighted: boolean;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<HighlightRequest>;
  try {
    body = (await req.json()) as Partial<HighlightRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.messageId || typeof body.highlighted !== "boolean") {
    return NextResponse.json({ error: "Missing messageId or highlighted" }, { status: 400 });
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

  await setMessageHighlighted(message.id, body.highlighted);
  return NextResponse.json({ ok: true });
}
