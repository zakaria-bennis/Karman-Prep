// ============================================================
// /admin/moderation — review queue for flagged chat messages
// and DMs.
//
// Layer 2/2.5 outcomes that previously delivered with a flag
// are now HELD: the recipient sees a "pending review" placeholder
// until an admin lands here and either approves (publishing to
// Slack for chat, or making content visible for DMs) or rejects.
//
// Two tabs: Waiting for review (status=flagged) and Rejected
// (status=rejected).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { WbPage, WbStats, WbTabs } from "@/components/admin/workbench";
import {
  listFlaggedChatMessages,
  listFlaggedDirectMessages,
  searchFlaggedMessages,
  type ChatMessageRow,
  type DirectMessageRow,
  type ModerationStatus,
} from "@/lib/supabase/queries/chat";
import { createAdminClient } from "@/lib/supabase/server";
import ModerationQueueClient from "./ModerationQueueClient";

export const metadata: Metadata = { title: "Moderation queue" };

const PAGE_LIMIT = 50;

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string }>;
}

export interface QueueItem {
  kind: "chat" | "dm";
  id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: ModerationStatus;
  ai_flag_reason: string | null;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  rejection_message: string | null;
  created_at: string;
  sender: { uuid: string; display_name: string; email: string; warning_count: number };
  channel?: { id: string; name: string | null };
  recipient?: { uuid: string; display_name: string; email: string };
}

async function fetchQueueForTab(tab: "pending" | "history", q?: string): Promise<QueueItem[]> {
  const statuses: ModerationStatus[] = tab === "pending" ? ["flagged"] : ["rejected"];
  let chatRows: ChatMessageRow[];
  let dmRows: DirectMessageRow[];
  if (q && q.trim().length > 0) {
    const r = await searchFlaggedMessages({ query: q.trim(), statuses, limit: PAGE_LIMIT });
    chatRows = r.chat;
    dmRows = r.dm;
  } else {
    const [c, d] = await Promise.all([
      listFlaggedChatMessages({ statuses, limit: PAGE_LIMIT }),
      listFlaggedDirectMessages({ statuses, limit: PAGE_LIMIT }),
    ]);
    chatRows = c;
    dmRows = d;
  }

  const userIds = new Set<string>();
  for (const r of chatRows) userIds.add(r.sender_id);
  for (const r of dmRows) {
    userIds.add(r.sender_id);
    userIds.add(r.recipient_id);
  }
  const channelIds = new Set<string>(chatRows.map((r) => r.channel_id));
  const senderIds = new Set<string>();
  for (const r of chatRows) senderIds.add(r.sender_id);
  for (const r of dmRows) senderIds.add(r.sender_id);

  const supa = createAdminClient();
  const [usersResp, channelsResp, warningsResp] = await Promise.all([
    userIds.size > 0
      ? supa.from("users").select("id, first_name, last_name, email").in("id", Array.from(userIds))
      : Promise.resolve({ data: [] }),
    channelIds.size > 0
      ? supa.from("chat_channels").select("id, display_name").in("id", Array.from(channelIds))
      : Promise.resolve({ data: [] }),
    // Warning counts: pull all warn-rows for the senders in this page,
    // then count locally. One round-trip beats N count() calls.
    senderIds.size > 0
      ? supa
          .from("moderation_actions")
          .select("target_student_id")
          .eq("action_type", "warn")
          .in("target_student_id", Array.from(senderIds))
      : Promise.resolve({ data: [] }),
  ]);

  type UserMini = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  type ChannelMini = { id: string; display_name: string | null };
  type WarnRow = { target_student_id: string };
  const userById = new Map<string, UserMini>();
  for (const u of (usersResp.data ?? []) as UserMini[]) userById.set(u.id, u);
  const channelById = new Map<string, ChannelMini>();
  for (const c of (channelsResp.data ?? []) as ChannelMini[]) channelById.set(c.id, c);
  const warningCountById = new Map<string, number>();
  for (const w of (warningsResp.data ?? []) as WarnRow[]) {
    warningCountById.set(w.target_student_id, (warningCountById.get(w.target_student_id) ?? 0) + 1);
  }

  function toSenderMini(uuid: string, includeWarnings: boolean) {
    const u = userById.get(uuid);
    const base = !u
      ? { uuid, display_name: "Unknown user", email: "" }
      : (() => {
          const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
          return { uuid: u.id, display_name: name || u.email, email: u.email };
        })();
    return { ...base, warning_count: includeWarnings ? (warningCountById.get(uuid) ?? 0) : 0 };
  }

  const chatItems: QueueItem[] = chatRows.map((r: ChatMessageRow) => ({
    kind: "chat",
    id: r.id,
    content: r.content,
    media_urls: r.media_urls,
    moderation_status: r.moderation_status,
    ai_flag_reason: r.ai_flag_reason,
    keyword_flagged: r.keyword_flagged,
    ai_flagged: r.ai_flagged,
    rejection_message: r.rejection_message,
    created_at: r.created_at,
    sender: toSenderMini(r.sender_id, true),
    channel: { id: r.channel_id, name: channelById.get(r.channel_id)?.display_name ?? null },
  }));
  const dmItems: QueueItem[] = dmRows.map((r: DirectMessageRow) => ({
    kind: "dm",
    id: r.id,
    content: r.content,
    media_urls: r.media_urls,
    moderation_status: r.moderation_status,
    ai_flag_reason: r.ai_flag_reason,
    keyword_flagged: r.keyword_flagged,
    ai_flagged: r.ai_flagged,
    rejection_message: r.rejection_message,
    created_at: r.created_at,
    sender: toSenderMini(r.sender_id, true),
    recipient: { ...toSenderMini(r.recipient_id, false) },
  }));

  return [...chatItems, ...dmItems]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, PAGE_LIMIT);
}

export default async function ModerationQueuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab: "pending" | "history" = params.tab === "history" ? "history" : "pending";
  const q = params.q?.trim() || undefined;

  // Fetch the current tab. The "pending" tab count for the badge
  // is the visible items count when on pending; otherwise issue a
  // small head-count query.
  const items = await fetchQueueForTab(tab, q);
  let pendingCount = items.length;
  if (tab === "history") {
    const supa = createAdminClient();
    const [chatCount, dmCount] = await Promise.all([
      supa
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "flagged"),
      supa
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "flagged"),
    ]);
    pendingCount = (chatCount.count ?? 0) + (dmCount.count ?? 0);
  }

  const channelCount = items.filter((i) => i.kind === "chat").length;

  return (
    <WbPage
      title="Moderation queue"
      summary={
        <>
          Flagged channel messages and direct messages wait here until you approve or reject them.
          Senders see their message marked &ldquo;pending review&rdquo;; recipients see a
          placeholder.
        </>
      }
      actions={<Link href="/admin/curriculum">Back to admin</Link>}
    >
      <WbStats
        items={[
          { label: "Waiting for review", value: pendingCount },
          { label: "Channel messages shown", value: channelCount },
          { label: "Direct messages shown", value: items.length - channelCount },
        ]}
      />

      <WbTabs
        label="Queue"
        param="tab"
        value={tab}
        basePath="/admin/moderation"
        options={[
          { value: "pending", label: "Waiting for review", count: pendingCount },
          { value: "history", label: "Rejected" },
        ]}
      />

      <ModerationQueueClient initialItems={items} tab={tab} initialQuery={q ?? ""} />
    </WbPage>
  );
}
