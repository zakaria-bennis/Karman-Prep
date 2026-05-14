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

/** Is the user (UUID) an active member of the channel's cohort? */
export async function isStudentInChannelCohort(
  studentUuid: string,
  channelId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: channel } = await supabase
    .from("chat_channels")
    .select("cohort_id")
    .eq("id", channelId)
    .maybeSingle();
  if (!channel) return false;
  const { count } = await supabase
    .from("cohort_members")
    .select("user_id", { count: "exact", head: true })
    .eq("cohort_id", channel.cohort_id)
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
}

export async function insertChatMessage(input: InsertChatMessageInput): Promise<ChatMessageRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chat_messages").insert(input).select("*").single();
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
