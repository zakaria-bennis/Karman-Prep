// ============================================================
// GET /api/chat/unread
//
// Returns the caller's total unread message count for the
// dashboard nav badge. Currently DMs only — direct_messages
// rows where recipient_id = caller and read_at IS NULL.
//
// (Cohort / Q&A unread tracking would require a per-user
// per-channel last_read_at table; not in scope yet.)
//
// Cheap: covered by the dm_unread_idx partial index from
// migration 016.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ total: 0 });

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ total: 0 });

  const supa = createAdminClient();
  const { count, error } = await supa
    .from("direct_messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", callerUuid)
    .is("read_at", null)
    .neq("moderation_status", "rejected");

  if (error) {
    console.error("[api/chat/unread] count failed:", error);
    return NextResponse.json({ total: 0 });
  }

  return NextResponse.json({ total: count ?? 0 });
}
