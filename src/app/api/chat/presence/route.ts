// ============================================================
// POST /api/chat/presence
//
// The chat page calls this every few seconds while it is open. It notes that the caller is here
// and where they are typing, and answers with who is typing in the chat they have open.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findChatChannelById,
  isStudentInCohort,
  isTutorOfChannel,
} from "@/lib/supabase/queries/chat";
import { createAdminClient } from "@/lib/supabase/server";
import { markPresence, shortName, typingIn } from "@/lib/chat/extras";
import { typingPlace } from "@/lib/chat/shared";
import { presenceBodySchema } from "../schemas";

type Place = { channelId: string } | { withClerkId: string };

/** A place the caller may be in, as the key others are looked up by; null when they may not. */
async function resolve(
  place: Place,
  callerUuid: string
): Promise<{ mine: string; theirs: string } | null> {
  if ("channelId" in place) {
    const channel = await findChatChannelById(place.channelId);
    if (!channel) return null;
    const [isMember, isTutor] = await Promise.all([
      isStudentInCohort(callerUuid, channel.cohort_id),
      isTutorOfChannel(callerUuid, channel.id),
    ]);
    if (!isMember && !isTutor) return null;
    const key = typingPlace.channel(channel.id);
    return { mine: key, theirs: key };
  }
  const otherUuid = await getUserUuidByClerkId(place.withClerkId);
  if (!otherUuid || otherUuid === callerUuid) return null;
  // I type "to them"; they are typing here when they type "to me"
  return { mine: typingPlace.dm(otherUuid), theirs: typingPlace.dm(callerUuid) };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = presenceBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const [typing, watch] = await Promise.all([
    parsed.data.typing ? resolve(parsed.data.typing, callerUuid) : null,
    parsed.data.watch ? resolve(parsed.data.watch, callerUuid) : null,
  ]);
  await markPresence(callerUuid, typing?.mine ?? null);

  let people: { clerkId: string; name: string }[] = [];
  if (watch) {
    const uuids = (await typingIn(watch.theirs, callerUuid)).filter(
      // in a private chat only the other person counts
      (uuid) => !("withClerkId" in parsed.data.watch!) || watch.mine === typingPlace.dm(uuid)
    );
    if (uuids.length > 0) {
      const { data } = await createAdminClient()
        .from("users")
        .select("clerk_id, first_name, last_name, email")
        .in("id", uuids);
      people = (data ?? [])
        .filter((u) => u.clerk_id)
        .map((u) => ({ clerkId: u.clerk_id!, name: shortName(u) }));
    }
  }
  return NextResponse.json({ typing: people });
}
