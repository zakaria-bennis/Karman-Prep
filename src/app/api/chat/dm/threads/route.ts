// ============================================================
// GET /api/chat/dm/threads
//
// Returns the caller's distinct DM threads — one entry per
// other-party — sorted by most-recent activity. Each entry
// carries the last message preview, the timestamp, and the
// caller's unread count.
//
// Powers the chat shell's left sidebar (engaged conversations)
// and lets the UI pull threads with new messages to the top
// without a full reload.
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

interface ThreadEntry {
  /** Other party's Clerk id (used by /api/chat/dm send + read). */
  otherClerkId: string;
  /** First-name + last-initial preview. */
  displayName: string;
  /** Real name. */
  realName: string;
  /** Last message text (truncated to 140 chars; null if image-only). */
  lastMessagePreview: string | null;
  lastMessageAt: string;
  /** Unread = messages from other → me, read_at IS NULL. */
  unreadCount: number;
}

/**
 * Fetch every DM where the caller is sender or recipient. We do
 * one query, then collapse in JS to one row per other-party.
 * Volume is capped by recency since we cap how many DMs we
 * pull (last 500 per user). For the chat shell sidebar this
 * is plenty; we never expect a student to have hundreds of DM
 * partners in their cohort.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const supa = createAdminClient();

  const { data: rows, error } = await supa
    .from("direct_messages")
    .select(
      "id, sender_id, recipient_id, content, media_urls, read_at, created_at, moderation_status"
    )
    .or(`sender_id.eq.${callerUuid},recipient_id.eq.${callerUuid}`)
    .neq("moderation_status", "rejected")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[api/chat/dm/threads] query failed:", error);
    return NextResponse.json({ error: "Thread query failed" }, { status: 500 });
  }

  type Row = {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string | null;
    media_urls: string[] | null;
    read_at: string | null;
    created_at: string;
    moderation_status: string;
  };

  // Collapse to one entry per other-party. Track unread on the fly.
  const byOther = new Map<
    string,
    {
      lastRow: Row;
      unread: number;
    }
  >();

  for (const r of (rows as Row[] | null) ?? []) {
    const otherUuid = r.sender_id === callerUuid ? r.recipient_id : r.sender_id;
    const existing = byOther.get(otherUuid);
    if (!existing) {
      byOther.set(otherUuid, {
        lastRow: r,
        unread: r.recipient_id === callerUuid && r.read_at === null ? 1 : 0,
      });
    } else {
      // Newer rows overwrite lastRow only if they're actually newer.
      if (new Date(r.created_at).getTime() > new Date(existing.lastRow.created_at).getTime()) {
        existing.lastRow = r;
      }
      if (r.recipient_id === callerUuid && r.read_at === null) existing.unread += 1;
    }
  }

  if (byOther.size === 0) {
    return NextResponse.json({ threads: [] satisfies ThreadEntry[] });
  }

  // Resolve other-party identities in one batch.
  const otherUuids = Array.from(byOther.keys());
  const { data: users } = await supa
    .from("users")
    .select("id, clerk_id, first_name, last_name, email")
    .in("id", otherUuids);

  const userById = new Map<
    string,
    { clerk_id: string | null; first_name: string | null; last_name: string | null; email: string }
  >();
  for (const u of (users as Array<{
    id: string;
    clerk_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }> | null) ?? []) {
    userById.set(u.id, u);
  }

  const threads: ThreadEntry[] = [];
  for (const [otherUuid, { lastRow, unread }] of byOther.entries()) {
    const u = userById.get(otherUuid);
    if (!u || !u.clerk_id) continue; // can't DM a user without a Clerk id
    const first = (u.first_name ?? "").trim() || u.email.split("@")[0];
    const last = (u.last_name ?? "").trim();
    const lastInitial = last ? `${last[0].toUpperCase()}.` : "";
    const realFull = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
    const preview = (() => {
      if (!lastRow.content) {
        return lastRow.media_urls && lastRow.media_urls.length > 0 ? "📷 Photo" : null;
      }
      const trimmed = lastRow.content.replace(/\s+/g, " ").trim();
      return trimmed.length > 140 ? trimmed.slice(0, 137) + "…" : trimmed;
    })();
    threads.push({
      otherClerkId: u.clerk_id,
      displayName: lastInitial ? `${first} ${lastInitial}` : first,
      realName: realFull,
      lastMessagePreview: preview,
      lastMessageAt: lastRow.created_at,
      unreadCount: unread,
    });
  }

  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json({ threads });
}
