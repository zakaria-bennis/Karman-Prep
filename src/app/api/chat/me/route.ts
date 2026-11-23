// ============================================================
// GET /api/chat/me
//
// What the chat page needs to begin, and to keep its marks right: who the caller is, the chat
// channel of their class (or of every class they teach), their tutor, what is unread, and whether their chats are paused.
// 401 when signed out.
// ============================================================

import { NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { channelUnread, isHere, shortName, tutorOf } from "@/lib/chat/extras";
import { ensureClassChats } from "@/lib/chat/provisioning";
import { getStanding } from "@/lib/chat/standing";
import { isAfterHours } from "@/lib/chat-assistant/model";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const selfUuid = await getUserUuidByClerkId(userId);
  if (!selfUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const supa = createAdminClient();
  const [{ data: membership }, standing, mine] = await Promise.all([
    supa
      .from("cohort_members")
      .select("cohort_id")
      .eq("user_id", selfUuid)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getStanding(selfUuid),
    tutorOf(selfUuid),
  ]);

  // A student has their one class; a tutor has every class they teach.
  const { data: taught } = membership?.cohort_id
    ? { data: null }
    : await supa.from("cohorts").select("id").eq("tutor_user_id", selfUuid);
  const staff = (taught ?? []).length > 0;
  const cohortIds = membership?.cohort_id
    ? [membership.cohort_id]
    : (taught ?? []).map((c) => c.id);
  let classes: { id: string; name: string }[] = [];
  let unread = { chat: 0, announcements: 0 };
  if (cohortIds.length > 0) {
    const read = () =>
      supa
        .from("chat_channels")
        .select("id, cohort_id, display_name")
        .in("cohort_id", cohortIds)
        .eq("channel_type", "cohort_chat")
        .order("display_name");
    let { data: channels } = await read();
    // a class without its chat yet gets it now, then is read again
    if (
      await ensureClassChats(
        cohortIds,
        (channels ?? []).map((c) => c.cohort_id)
      )
    )
      ({ data: channels } = await read());
    classes = (channels ?? []).map((c) => ({ id: c.id, name: c.display_name }));
    if (!staff && classes[0]) unread = await channelUnread(selfUuid, classes[0].id);
  }

  let tutor: { clerkId: string; name: string; here: boolean } | null = null;
  if (mine) {
    const [{ data: person }, here] = await Promise.all([
      supa
        .from("users")
        .select("clerk_id, first_name, last_name, email")
        .eq("id", mine.tutorUuid)
        .maybeSingle(),
      isHere(mine.tutorUuid),
    ]);
    if (person?.clerk_id) tutor = { clerkId: person.clerk_id, name: shortName(person), here };
  }

  return NextResponse.json({
    selfUuid,
    classes,
    // a tutor: may post announcements, and writes to their students
    staff,
    tutor,
    unread,
    afterHours: isAfterHours(),
    paused: standing.paused,
  });
}
