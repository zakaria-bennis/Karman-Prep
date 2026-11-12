// Moderation queries for chat (/admin/moderation): the flagged queue, reviews and the action log.
// Re-exported from chat.ts.

import { createAdminClient } from "@/lib/supabase/server";
import type { ChatMessageRow, DirectMessageRow, ModerationStatus } from "./chat";

// ─────────────────────────────────────────────────────────────
// Moderation queue (/admin/moderation)
// ─────────────────────────────────────────────────────────────

export interface ListModerationQueueArgs {
  /** Which moderation states to include. Default: ['flagged']. */
  statuses?: ModerationStatus[];
  limit: number;
  /** ISO created_at; returns rows STRICTLY OLDER than this. */
  before?: string;
}

export async function listFlaggedChatMessages(
  args: ListModerationQueueArgs
): Promise<ChatMessageRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("chat_messages")
    .select("*")
    .in("moderation_status", args.statuses ?? ["flagged"])
    .order("created_at", { ascending: false })
    .limit(args.limit);
  if (args.before) q = q.lt("created_at", args.before);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ChatMessageRow[] | null) ?? [];
}

export async function listFlaggedDirectMessages(
  args: ListModerationQueueArgs
): Promise<DirectMessageRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("direct_messages")
    .select("*")
    .in("moderation_status", args.statuses ?? ["flagged"])
    .order("created_at", { ascending: false })
    .limit(args.limit);
  if (args.before) q = q.lt("created_at", args.before);
  const { data, error } = await q;
  if (error) throw error;
  return (data as DirectMessageRow[] | null) ?? [];
}

// ─────────────────────────────────────────────────────────────
// Moderation actions (approve / reject from /admin/moderation)
// ─────────────────────────────────────────────────────────────

/** Updates a chat_message row to 'approved' state after a human
 *  review. Also stamps the human_review_* audit fields. The Slack
 *  post is performed by the caller (it needs the channel context);
 *  the resulting slack_message_ts is passed here. */
export async function approveChatMessage(args: {
  messageId: string;
  adminUuid: string;
  slackMessageTs: string;
}): Promise<ChatMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .update({
      moderation_status: "approved",
      slack_message_ts: args.slackMessageTs,
      human_reviewed: true,
      human_review_action: "approved",
      human_reviewed_by: args.adminUuid,
      human_reviewed_at: new Date().toISOString(),
    })
    .eq("id", args.messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatMessageRow;
}

export async function rejectChatMessage(args: {
  messageId: string;
  adminUuid: string;
  rejectionMessage: string;
}): Promise<ChatMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .update({
      moderation_status: "rejected",
      rejection_message: args.rejectionMessage,
      human_reviewed: true,
      human_review_action: "removed",
      human_reviewed_by: args.adminUuid,
      human_reviewed_at: new Date().toISOString(),
    })
    .eq("id", args.messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatMessageRow;
}

export async function approveDirectMessage(args: {
  messageId: string;
  adminUuid: string;
}): Promise<DirectMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .update({
      moderation_status: "approved",
      human_reviewed: true,
      human_review_action: "approved",
      human_reviewed_by: args.adminUuid,
      human_reviewed_at: new Date().toISOString(),
    })
    .eq("id", args.messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DirectMessageRow;
}

export async function rejectDirectMessage(args: {
  messageId: string;
  adminUuid: string;
  rejectionMessage: string;
}): Promise<DirectMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .update({
      moderation_status: "rejected",
      rejection_message: args.rejectionMessage,
      human_reviewed: true,
      human_review_action: "removed",
      human_reviewed_by: args.adminUuid,
      human_reviewed_at: new Date().toISOString(),
    })
    .eq("id", args.messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DirectMessageRow;
}

// ─────────────────────────────────────────────────────────────
// Moderation audit log + warnings (moderation_actions table)
// ─────────────────────────────────────────────────────────────

export type ModerationActionType =
  | "warn"
  | "mute"
  | "unmute"
  | "remove"
  | "approve_message"
  | "remove_message";
export type WarnSeverity = "low" | "medium" | "high";

/** Append-only audit log row. Written on every approve, reject,
 *  and warn. The caller provides the message context (chat vs DM
 *  via the channel_id/message_id vs dm_id columns). */
export async function recordModerationAction(args: {
  adminUuid: string;
  targetStudentUuid: string;
  actionType: ModerationActionType;
  channelId?: string | null;
  messageId?: string | null;
  dmId?: string | null;
  reason?: string | null;
  severity?: WarnSeverity | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("moderation_actions").insert({
    admin_id: args.adminUuid,
    target_student_id: args.targetStudentUuid,
    action_type: args.actionType,
    channel_id: args.channelId ?? null,
    message_id: args.messageId ?? null,
    dm_id: args.dmId ?? null,
    reason: args.reason ?? null,
    severity: args.severity ?? null,
  });
  if (error) throw error;
}

/** How many warnings (action_type='warn') has this user received? */
export async function countWarningsForUser(targetStudentUuid: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("moderation_actions")
    .select("id", { count: "exact", head: true })
    .eq("target_student_id", targetStudentUuid)
    .eq("action_type", "warn");
  if (error) throw error;
  return count ?? 0;
}

export interface ModerationActionRow {
  id: string;
  admin_id: string;
  target_student_id: string;
  channel_id: string | null;
  message_id: string | null;
  dm_id: string | null;
  action_type: ModerationActionType;
  reason: string | null;
  severity: WarnSeverity | null;
  created_at: string;
}

/** Recent moderation actions taken against a user — feeds the
 *  /admin/moderation sender drill-in panel. */
export async function listActionsForUser(
  targetStudentUuid: string,
  limit = 20
): Promise<ModerationActionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("moderation_actions")
    .select("*")
    .eq("target_student_id", targetStudentUuid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ModerationActionRow[] | null) ?? [];
}

/** Recent flagged or rejected messages from a given sender —
 *  used by the queue UI to show "this user has 5 other flagged
 *  messages this month" context. */
export async function listRecentFlaggedFromSender(
  senderUuid: string,
  limit = 10
): Promise<Array<{ kind: "chat" | "dm"; row: ChatMessageRow | DirectMessageRow }>> {
  const supabase = createAdminClient();
  const [chatResp, dmResp] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*")
      .eq("sender_id", senderUuid)
      .in("moderation_status", ["flagged", "rejected"])
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("direct_messages")
      .select("*")
      .eq("sender_id", senderUuid)
      .in("moderation_status", ["flagged", "rejected"])
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (chatResp.error) throw chatResp.error;
  if (dmResp.error) throw dmResp.error;
  const chat = ((chatResp.data ?? []) as ChatMessageRow[]).map((r) => ({
    kind: "chat" as const,
    row: r as ChatMessageRow | DirectMessageRow,
  }));
  const dm = ((dmResp.data ?? []) as DirectMessageRow[]).map((r) => ({
    kind: "dm" as const,
    row: r as ChatMessageRow | DirectMessageRow,
  }));
  return [...chat, ...dm]
    .sort((a, b) => (a.row.created_at < b.row.created_at ? 1 : -1))
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Queue search (filter by content substring)
// ─────────────────────────────────────────────────────────────

export async function searchFlaggedMessages(args: {
  query: string;
  statuses: ModerationStatus[];
  limit: number;
}): Promise<{ chat: ChatMessageRow[]; dm: DirectMessageRow[] }> {
  const supabase = createAdminClient();
  const pattern = `%${args.query}%`;
  const [chatResp, dmResp] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*")
      .in("moderation_status", args.statuses)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(args.limit),
    supabase
      .from("direct_messages")
      .select("*")
      .in("moderation_status", args.statuses)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(args.limit),
  ]);
  if (chatResp.error) throw chatResp.error;
  if (dmResp.error) throw dmResp.error;
  return {
    chat: (chatResp.data as ChatMessageRow[] | null) ?? [],
    dm: (dmResp.data as DirectMessageRow[] | null) ?? [],
  };
}
