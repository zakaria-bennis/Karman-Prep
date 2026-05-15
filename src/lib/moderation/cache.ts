// ============================================================
// Moderation cache — recent-pass shortcut.
//
// `moderateMessage()` invokes `hasRecentApprovedSend()` after Layer 1
// (keyword) passes. A hit lets the pipeline skip Layer 2 (OpenAI
// Moderation) and Layer 2.5 (Karman classifier) entirely:
//
//   · The sender JUST passed the same pipeline within the cache
//     window, so a fresh OpenAI call is unlikely to disagree.
//   · The keyword blocklist (Layer 1) still runs every time, so the
//     cache can never bypass the explicit safety floor.
//   · Caching pasts uptime through OpenAI outages: a sender who just
//     posted successfully keeps posting even if OpenAI's API is down
//     during their next send. New / occasional senders still hit
//     OpenAI and still fail closed on outages.
//
// This implementation reuses the existing chat_messages /
// direct_messages tables as the cache — every approved send already
// writes a row with moderation_status='approved'. No new table, no
// new write path, no extra cache invalidation logic.
//
// Window: 5 minutes (CACHE_WINDOW_MS). Picked so a quick reply or a
// student bouncing between cohort + DM doesn't get re-checked, but a
// sender who walked away and came back later still goes through the
// full pipeline.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

/** How recent a clean approval has to be to count as a cache hit. */
export const CACHE_WINDOW_MS = 5 * 60 * 1000;

export interface ModerationCacheLookupArgs {
  /** App-side users.id of the sender (NOT Clerk id). */
  senderUuid: string;
  /** Reference clock for testing. Defaults to Date.now(). */
  now?: () => number;
}

/** True iff this sender has at least one chat_messages or
 *  direct_messages row with moderation_status='approved' in the last
 *  CACHE_WINDOW_MS. Errors return false so the caller falls back to
 *  the full pipeline (fail-safe: we never approve via cache on lookup
 *  error). */
export async function hasRecentApprovedSend(args: ModerationCacheLookupArgs): Promise<boolean> {
  const now = args.now ? args.now() : Date.now();
  const since = new Date(now - CACHE_WINDOW_MS).toISOString();
  const supabase = createAdminClient();

  try {
    const [chatResp, dmResp] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", args.senderUuid)
        .eq("moderation_status", "approved")
        .gt("created_at", since),
      supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", args.senderUuid)
        .eq("moderation_status", "approved")
        .gt("created_at", since),
    ]);
    if (chatResp.error || dmResp.error) {
      console.error(
        "[moderation/cache] lookup error (falling back to full pipeline):",
        chatResp.error ?? dmResp.error
      );
      return false;
    }
    return (chatResp.count ?? 0) > 0 || (dmResp.count ?? 0) > 0;
  } catch (err) {
    console.error("[moderation/cache] unexpected error (falling back):", err);
    return false;
  }
}
