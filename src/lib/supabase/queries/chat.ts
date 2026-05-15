// ============================================================
// Chat queries — used by every /api/chat/* route. Service-role
// access; route handlers do their own auth + ownership checks
// before calling these.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export type ChatMessageType = "cohort_message" | "qa_question" | "qa_answer";
export type ModerationStatus = "pending" | "approved" | "flagged" | "rejected";
export type HumanReviewAction = "approved" | "removed" | "warned";

export interface ChatChannelRow {
  id: string;
  slack_channel_id: string;
  cohort_id: string;
  channel_type: "cohort_chat" | "qa";
  display_name: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  slack_message_ts: string;
  channel_id: string;
  sender_id: string;
  is_anonymous: boolean;
  display_name_override: string | null;
  message_type: ChatMessageType;
  content: string | null;
  media_urls: string[];
  parent_message_id: string | null;
  is_pinned: boolean;
  is_highlighted: boolean;
  moderation_status: ModerationStatus;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  human_reviewed: boolean;
  human_review_action: HumanReviewAction | null;
  human_reviewed_by: string | null;
  human_reviewed_at: string | null;
  rejection_message: string | null;
  cohort_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectMessageRow {
  id: string;
  slack_dm_channel_id: string | null;
  slack_message_ts: string | null;
  sender_id: string;
  recipient_id: string;
  cohort_id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: ModerationStatus;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  human_reviewed: boolean;
  human_review_action: HumanReviewAction | null;
  human_reviewed_by: string | null;
  human_reviewed_at: string | null;
  rejection_message: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Channel lookups
// ─────────────────────────────────────────────────────────────

export async function findChatChannelById(channelId: string): Promise<ChatChannelRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("id", channelId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChatChannelRow | null) ?? null;
}

/** All channels (cohort_chat + qa) for a given cohort. Returns 0, 1, or 2 rows. */
export async function findChannelsByCohort(cohortId: string): Promise<ChatChannelRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("cohort_id", cohortId);
  if (error) throw error;
  return (data as ChatChannelRow[] | null) ?? [];
}

export interface InsertChatChannelInput {
  slack_channel_id: string;
  cohort_id: string;
  channel_type: "cohort_chat" | "qa";
  display_name: string;
}

export async function insertChatChannel(input: InsertChatChannelInput): Promise<ChatChannelRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chat_channels").insert(input).select("*").single();
  if (error) throw error;
  return data as ChatChannelRow;
}

/** Is the user (UUID) an active member of the given cohort?
 *
 *  Callers in chat routes typically already have the `channel` object
 *  (and therefore `channel.cohort_id`) from `findChatChannelById`, so
 *  this function takes the cohort id directly instead of doing its own
 *  channel lookup. Net effect: one DB round-trip per call (down from
 *  two), which is real wall-clock latency on every chat send / message
 *  fetch since this check sits on the hot path. */
export async function isStudentInCohort(studentUuid: string, cohortId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("cohort_members")
    .select("user_id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .eq("user_id", studentUuid)
    .is("left_at", null);
  return (count ?? 0) > 0;
}

/** Is the user the tutor of the channel's cohort? */
export async function isTutorOfChannel(tutorUuid: string, channelId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: channel } = await supabase
    .from("chat_channels")
    .select("cohort_id, cohorts!inner(tutor_user_id)")
    .eq("id", channelId)
    .maybeSingle();
  type ChannelTutorJoin = { cohort_id: string; cohorts: { tutor_user_id: string } | null } | null;
  const tj = channel as ChannelTutorJoin;
  return tj?.cohorts?.tutor_user_id === tutorUuid;
}

/** Active mute on (student, channel)? */
export async function isStudentMuted(studentUuid: string, channelId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const { count, error } = await supabase
    .from("channel_mutes")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentUuid)
    .eq("channel_id", channelId)
    .or(`muted_until.is.null,muted_until.gt.${nowIso}`);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Both users in the same active cohort? Returns the cohort id if yes. */
export async function findSharedCohort(
  userUuidA: string,
  userUuidB: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: aMemberships } = await supabase
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userUuidA)
    .is("left_at", null);
  if (!aMemberships || aMemberships.length === 0) return null;
  const aCohorts = aMemberships.map((m) => m.cohort_id);

  const { data: shared } = await supabase
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", userUuidB)
    .in("cohort_id", aCohorts)
    .is("left_at", null)
    .limit(1);
  return shared && shared.length > 0 ? (shared[0].cohort_id as string) : null;
}

// ─────────────────────────────────────────────────────────────
// Inserts (called by send route after moderation passes)
// ─────────────────────────────────────────────────────────────

export interface InsertChatMessageInput {
  slack_message_ts: string;
  channel_id: string;
  sender_id: string;
  is_anonymous: boolean;
  display_name_override: string | null;
  message_type: ChatMessageType;
  content: string;
  media_urls: string[];
  parent_message_id: string | null;
  moderation_status: ModerationStatus;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  rejection_message: string | null;
  cohort_label: string | null;
  /** Deterministic dedupe key — see src/lib/chat/idempotency.ts.
   *  When present, a partial unique index on (channel_id, client_msg_id)
   *  rejects a second insert (Postgres error code 23505) so the route
   *  can treat the duplicate as a no-op + return the existing row. */
  client_msg_id?: string | null;
}

/** Postgres error code returned by a unique-index violation. */
export const PG_UNIQUE_VIOLATION = "23505";

export async function insertChatMessage(input: InsertChatMessageInput): Promise<ChatMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chat_messages").insert(input).select("*").single();
  if (error) throw error;
  return data as ChatMessageRow;
}

/** Lookup the row that a 23505 collision refers to. The unique index
 *  is (channel_id, client_msg_id) so the (channel, key) pair is the
 *  natural lookup. */
export async function findChatMessageByClientMsgId(args: {
  channelId: string;
  clientMsgId: string;
}): Promise<ChatMessageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("channel_id", args.channelId)
    .eq("client_msg_id", args.clientMsgId)
    .neq("moderation_status", "rejected")
    .maybeSingle();
  if (error) throw error;
  return (data as ChatMessageRow | null) ?? null;
}

/** Patch the row's slack_message_ts after a successful Slack post.
 *  Called by chat/send after the insert + Slack post both succeed. */
export async function updateChatMessageSlackTs(
  messageId: string,
  slackTs: string
): Promise<ChatMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ slack_message_ts: slackTs })
    .eq("id", messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatMessageRow;
}

export interface InsertDirectMessageInput {
  sender_id: string;
  recipient_id: string;
  cohort_id: string;
  content: string;
  media_urls: string[];
  moderation_status: ModerationStatus;
  keyword_flagged: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  rejection_message: string | null;
  client_msg_id?: string | null;
}

/** Mirror of findChatMessageByClientMsgId for DMs. The unique index is
 *  (sender_id, recipient_id, client_msg_id). */
export async function findDirectMessageByClientMsgId(args: {
  senderUuid: string;
  recipientUuid: string;
  clientMsgId: string;
}): Promise<DirectMessageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("sender_id", args.senderUuid)
    .eq("recipient_id", args.recipientUuid)
    .eq("client_msg_id", args.clientMsgId)
    .neq("moderation_status", "rejected")
    .maybeSingle();
  if (error) throw error;
  return (data as DirectMessageRow | null) ?? null;
}

export async function insertDirectMessage(
  input: InsertDirectMessageInput
): Promise<DirectMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("direct_messages").insert(input).select("*").single();
  if (error) throw error;
  return data as DirectMessageRow;
}

// ─────────────────────────────────────────────────────────────
// Reads (paginated)
// ─────────────────────────────────────────────────────────────

export async function listChatMessages(args: {
  channelId: string;
  limit: number;
  /** ISO created_at; returns rows STRICTLY OLDER than this. Omit
   *  for the most recent page. */
  before?: string;
}): Promise<ChatMessageRow[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("chat_messages")
    .select("*")
    .eq("channel_id", args.channelId)
    .order("created_at", { ascending: false })
    .limit(args.limit);
  if (args.before) q = q.lt("created_at", args.before);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ChatMessageRow[] | null) ?? [];
}

export async function listDirectMessages(args: {
  userUuidA: string;
  userUuidB: string;
  limit: number;
  before?: string;
}): Promise<DirectMessageRow[]> {
  const supabase = createAdminClient();
  // Two OR'd legs cover both directions of the conversation.
  let q = supabase
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${args.userUuidA},recipient_id.eq.${args.userUuidB}),` +
        `and(sender_id.eq.${args.userUuidB},recipient_id.eq.${args.userUuidA})`
    )
    .order("created_at", { ascending: false })
    .limit(args.limit);
  if (args.before) q = q.lt("created_at", args.before);
  const { data, error } = await q;
  if (error) throw error;
  return (data as DirectMessageRow[] | null) ?? [];
}

// ─────────────────────────────────────────────────────────────
// Updates (pin / highlight)
// ─────────────────────────────────────────────────────────────

export async function setMessagePinned(messageId: string, pinned: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_pinned: pinned })
    .eq("id", messageId);
  if (error) throw error;
}

export async function setMessageHighlighted(
  messageId: string,
  highlighted: boolean
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_highlighted: highlighted })
    .eq("id", messageId);
  if (error) throw error;
}

export async function findChatMessageById(messageId: string): Promise<ChatMessageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChatMessageRow | null) ?? null;
}

export async function findDirectMessageById(messageId: string): Promise<DirectMessageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw error;
  return (data as DirectMessageRow | null) ?? null;
}

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
