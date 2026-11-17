// ============================================================
// POST /api/chat/react
//
// Sets, changes or takes back the caller's reaction to one message. A class message may be reacted
// to by the class, its tutor and admins; a private message by the two people in that chat.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findChatChannelById,
  findChatMessageById,
  findDirectMessageById,
  isStudentInCohort,
  isTutorOfChannel,
} from "@/lib/supabase/queries/chat";
import { setReaction } from "@/lib/chat/extras";
import { reactBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = reactBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const body = parsed.data;
  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  if (body.kind === "dm") {
    const message = await findDirectMessageById(body.messageId);
    if (!message || message.moderation_status !== "approved")
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (message.sender_id !== callerUuid && message.recipient_id !== callerUuid)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const message = await findChatMessageById(body.messageId);
    if (!message || message.moderation_status !== "approved")
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const channel = await findChatChannelById(message.channel_id);
    if (!channel) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const [role, isMember, isTutor] = await Promise.all([
      fetchUserRole(userId),
      isStudentInCohort(callerUuid, channel.cohort_id),
      isTutorOfChannel(callerUuid, channel.id),
    ]);
    if (!isMember && !isTutor && role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await setReaction({
      kind: body.kind,
      messageId: body.messageId,
      userUuid: callerUuid,
      reaction: body.reaction,
    });
  } catch (error) {
    console.error("[api/chat/react] failed:", error);
    return NextResponse.json({ error: "The reaction was not saved" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
