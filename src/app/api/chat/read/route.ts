// ============================================================
// POST /api/chat/read
//
// Notes that the caller has read their class chat, or its announcements, up to now. (A private
// chat is marked read by /api/chat/dm/read.)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findChatChannelById,
  isStudentInCohort,
  isTutorOfChannel,
} from "@/lib/supabase/queries/chat";
import { markChannelRead } from "@/lib/chat/extras";
import { readChannelBodySchema } from "../schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = readChannelBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  const channel = await findChatChannelById(parsed.data.channelId);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  const [isMember, isTutor] = await Promise.all([
    isStudentInCohort(callerUuid, channel.cohort_id),
    isTutorOfChannel(callerUuid, channel.id),
  ]);
  if (!isMember && !isTutor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await markChannelRead(callerUuid, channel.id, parsed.data.scope);
  return NextResponse.json({ ok: true });
}
