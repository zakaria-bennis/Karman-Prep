// ============================================================
// GET /api/chat/me
//
// What the chat page needs to begin: who the caller is, their
// class's chat channel if they have one, and whether their chats
// are paused. 401 when signed out.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStanding } from "@/lib/chat/standing";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const selfUuid = await getUserUuidByClerkId(userId);
  if (!selfUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const supa = createAdminClient();
  const [{ data: membership }, standing] = await Promise.all([
    supa
      .from("cohort_members")
      .select("cohort_id")
      .eq("user_id", selfUuid)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getStanding(selfUuid),
  ]);

  let classChannel: { id: string; name: string } | null = null;
  if (membership?.cohort_id) {
    const { data: channel } = await supa
      .from("chat_channels")
      .select("id, display_name")
      .eq("cohort_id", membership.cohort_id)
      .eq("channel_type", "cohort_chat")
      .maybeSingle();
    if (channel) classChannel = { id: channel.id, name: channel.display_name };
  }

  return NextResponse.json({ selfUuid, classChannel, paused: standing.paused });
}
