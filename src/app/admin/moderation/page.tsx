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
  searchFlaggedMessages,
  type ChatMessageRow,
  type DirectMessageRow,
  type ModerationStatus,
} from "@/lib/supabase/queries/chat";
import { createAdminClient } from "@/lib/supabase/server";
import ModerationQueueClient from "./ModerationQueueClient";

export const metadata: Metadata = { title: "Admin — Moderation queue | Karman" };

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
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

      <ModerationQueueClient initialItems={items} tab={tab} initialQuery={q ?? ""} />
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
