// ============================================================
// POST /api/chat/dm/read
//
// Body: { withClerkId: string }
//
// Marks all unread DMs sent FROM that user TO the caller as
// read (sets read_at = now()). Called by the chat shell when
// the user opens a DM thread or scrolls into focus.
//
// Idempotent — a no-op if there's nothing unread.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

interface ReadRequest {
  withClerkId: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<ReadRequest>;
  try {
    body = (await req.json()) as Partial<ReadRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.withClerkId) {
    return NextResponse.json({ error: "Missing withClerkId" }, { status: 400 });
  }

  const callerUuid = await getUserUuidByClerkId(userId);
  const otherUuid = await getUserUuidByClerkId(body.withClerkId);
  if (!callerUuid || !otherUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const supa = createAdminClient();
  const { error, count } = await supa
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() }, { count: "exact" })
    .eq("sender_id", otherUuid)
    .eq("recipient_id", callerUuid)
    .is("read_at", null);

  if (error) {
    console.error("[api/chat/dm/read] update failed:", error);
    return NextResponse.json({ error: "Mark-read failed" }, { status: 500 });
  }

  return NextResponse.json({ marked: count ?? 0 });
}
