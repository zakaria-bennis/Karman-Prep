// ============================================================
// /admin/moderation — review queue for flagged chat messages
// and DMs.
//
// Layer 2/2.5 outcomes that previously delivered with a flag
// are now HELD: the recipient sees a "pending review" placeholder
// until an admin lands here and either approves (publishing to
// Slack for chat, or making content visible for DMs) or rejects.
//
// Two tabs: Pending (status=flagged) and History (status=rejected).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldAlert } from "lucide-react";
import {
  listFlaggedChatMessages,
  listFlaggedDirectMessages,
  type ChatMessageRow,
  type DirectMessageRow,
  type ModerationStatus,
} from "@/lib/supabase/queries/chat";
import { createAdminClient } from "@/lib/supabase/server";
import ModerationQueueClient from "./ModerationQueueClient";

export const metadata: Metadata = { title: "Admin — Moderation queue | Karman" };

const PAGE_LIMIT = 50;

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
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
  sender: { uuid: string; display_name: string; email: string };
  channel?: { id: string; name: string | null };
  recipient?: { uuid: string; display_name: string; email: string };
}

async function fetchQueueForTab(tab: "pending" | "history"): Promise<QueueItem[]> {
  const statuses: ModerationStatus[] = tab === "pending" ? ["flagged"] : ["rejected"];
  const [chatRows, dmRows] = await Promise.all([
    listFlaggedChatMessages({ statuses, limit: PAGE_LIMIT }),
    listFlaggedDirectMessages({ statuses, limit: PAGE_LIMIT }),
  ]);

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
      : Promise.resolve({ data: [] }),
    channelIds.size > 0
      ? supa.from("chat_channels").select("id, display_name").in("id", Array.from(channelIds))
      : Promise.resolve({ data: [] }),
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

  function toSenderMini(uuid: string) {
    const u = userById.get(uuid);
    if (!u) return { uuid, display_name: "Unknown user", email: "" };
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    return { uuid: u.id, display_name: name || u.email, email: u.email };
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
    sender: toSenderMini(r.sender_id),
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
    sender: toSenderMini(r.sender_id),
    recipient: toSenderMini(r.recipient_id),
  }));

  return [...chatItems, ...dmItems]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, PAGE_LIMIT);
}

export default async function ModerationQueuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab: "pending" | "history" = params.tab === "history" ? "history" : "pending";

  // Fetch both tabs' counts in parallel for the tab badges.
  const [items, pendingForCount] = await Promise.all([
    fetchQueueForTab(tab),
    tab === "pending" ? Promise.resolve(null) : fetchQueueForTab("pending"),
  ]);
  const pendingCount = pendingForCount ? pendingForCount.length : items.length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <ShieldAlert className="h-5 w-5 text-rose-400" /> Moderation queue
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Flagged chat messages and DMs are held back until you approve or reject them. Senders see
          their own message marked &ldquo;pending review&rdquo;; recipients see a placeholder.
        </p>
      </div>

      <div className="mb-5 flex gap-2 border-b border-slate-800">
        <TabLink href="?tab=pending" active={tab === "pending"} count={pendingCount}>
          Pending review
        </TabLink>
        <TabLink href="?tab=history" active={tab === "history"}>
          History (rejected)
        </TabLink>
      </div>

      <ModerationQueueClient initialItems={items} tab={tab} />
    </div>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "relative -mb-px border-b-2 px-3 py-2.5 text-sm transition-colors " +
        (active
          ? "border-rose-400 text-white"
          : "border-transparent text-slate-400 hover:text-slate-200")
      }
    >
      {children}
      {typeof count === "number" && count > 0 ? (
        <span className="ml-2 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
