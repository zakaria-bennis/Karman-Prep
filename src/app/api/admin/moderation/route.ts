// ============================================================
// GET /api/admin/moderation?status=flagged|rejected|all&limit=&before=
//
// Returns the combined moderation queue: every flagged
// chat_message + flagged direct_message (most-recent first),
// enriched with sender info and channel/recipient context the
// admin UI needs.
//
// Admin-only. Drives /admin/moderation.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  listFlaggedChatMessages,
  listFlaggedDirectMessages,
  type ChatMessageRow,
  type DirectMessageRow,
  type ModerationStatus,
} from "@/lib/supabase/queries/chat";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

interface SenderMini {
  uuid: string;
  display_name: string;
  email: string;
}

interface QueueRow {
  kind: "chat" | "dm";
  id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: ModerationStatus;
  ai_flag_reason: string | null;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  created_at: string;
  sender: SenderMini;
  // Only for kind === "chat"
  channel?: { id: string; name: string | null };
  // Only for kind === "dm"
  recipient?: SenderMini;
}

function parseStatuses(raw: string | null): ModerationStatus[] {
  if (!raw || raw === "flagged") return ["flagged"];
  if (raw === "rejected") return ["rejected"];
  if (raw === "all") return ["flagged", "rejected"];
  return ["flagged"];
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await fetchUserRole(userId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const statuses = parseStatuses(sp.get("status"));
  const before = sp.get("before") ?? undefined;
  const limitRaw = parseInt(sp.get("limit") ?? "", 10);
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT
  );

  // Pull both tables in parallel, then merge + sort + paginate.
  const [chatRows, dmRows] = await Promise.all([
    listFlaggedChatMessages({ statuses, limit, before }),
    listFlaggedDirectMessages({ statuses, limit, before }),
  ]);

  // Resolve names for everyone involved (senders + DM recipients +
  // chat channels) in one batch per table.
  const userIds = new Set<string>();
  for (const r of chatRows) userIds.add(r.sender_id);
  for (const r of dmRows) {
    userIds.add(r.sender_id);
    userIds.add(r.recipient_id);
  }
  const channelIds = new Set<string>(chatRows.map((r) => r.channel_id));

  const supa = createAdminClient();
  const [usersResp, channelsResp] = await Promise.all([
    userIds.size > 0
      ? supa.from("users").select("id, first_name, last_name, email").in("id", Array.from(userIds))
      : Promise.resolve({ data: [] as Array<unknown>, error: null }),
    channelIds.size > 0
      ? supa.from("chat_channels").select("id, display_name").in("id", Array.from(channelIds))
      : Promise.resolve({ data: [] as Array<unknown>, error: null }),
  ]);

  type UserMini = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  type ChannelMini = { id: string; display_name: string | null };
  const userById = new Map<string, UserMini>();
  for (const u of (usersResp.data ?? []) as UserMini[]) userById.set(u.id, u);
  const channelById = new Map<string, ChannelMini>();
  for (const c of (channelsResp.data ?? []) as ChannelMini[]) channelById.set(c.id, c);

  function toSenderMini(u: UserMini | undefined, fallbackUuid: string): SenderMini {
    if (!u) return { uuid: fallbackUuid, display_name: "Unknown user", email: "" };
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    return { uuid: u.id, display_name: name || u.email, email: u.email };
  }

  const chatItems: QueueRow[] = chatRows.map((r: ChatMessageRow) => ({
    kind: "chat",
    id: r.id,
    content: r.content,
    media_urls: r.media_urls,
    moderation_status: r.moderation_status,
    ai_flag_reason: r.ai_flag_reason,
    keyword_flagged: r.keyword_flagged,
    ai_flagged: r.ai_flagged,
    created_at: r.created_at,
    sender: toSenderMini(userById.get(r.sender_id), r.sender_id),
    channel: { id: r.channel_id, name: channelById.get(r.channel_id)?.display_name ?? null },
  }));

  const dmItems: QueueRow[] = dmRows.map((r: DirectMessageRow) => ({
    kind: "dm",
    id: r.id,
    content: r.content,
    media_urls: r.media_urls,
    moderation_status: r.moderation_status,
    ai_flag_reason: r.ai_flag_reason,
    keyword_flagged: r.keyword_flagged,
    ai_flagged: r.ai_flagged,
    created_at: r.created_at,
    sender: toSenderMini(userById.get(r.sender_id), r.sender_id),
    recipient: toSenderMini(userById.get(r.recipient_id), r.recipient_id),
  }));

  // Merge + sort newest-first + slice to the page size.
  const all = [...chatItems, ...dmItems]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);

  return NextResponse.json({
    items: all,
    nextBefore: all.length === limit ? all[all.length - 1].created_at : null,
  });
}
