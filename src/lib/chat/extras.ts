import "server-only";
// What the Chat page keeps beside the words of a message (founder, 2026-11-16): reactions, a
// question sent with a message, who is typing, who is here, and what has been read. Every table
// here arrives with migration 20261117050000; until it has run, reads come back empty and nothing
// breaks.
import { createAdminClient } from "@/lib/supabase/server";
import type { SharedQuestion } from "./shared";

export type MessageKind = "channel" | "dm";

/** How a message was reacted to, as one person sees it: their own, and how many of each. */
export interface ReactionSummary {
  mine: string | null;
  counts: Record<string, number>;
}

export async function reactionsFor(
  kind: MessageKind,
  messageIds: string[],
  viewerUuid: string
): Promise<Map<string, ReactionSummary>> {
  const out = new Map<string, ReactionSummary>();
  if (messageIds.length === 0) return out;
  const { data, error } = await createAdminClient()
    .from("chat_reactions")
    .select("message_id, user_id, reaction")
    .eq("message_kind", kind)
    .in("message_id", messageIds);
  if (error) return out;
  for (const row of data ?? []) {
    const entry = out.get(row.message_id) ?? { mine: null, counts: {} };
    if (row.user_id === viewerUuid) entry.mine = row.reaction;
    else entry.counts[row.reaction] = (entry.counts[row.reaction] ?? 0) + 1;
    out.set(row.message_id, entry);
  }
  return out;
}

/** Sets, changes or (with null) takes back one person's reaction to one message. */
export async function setReaction(args: {
  kind: MessageKind;
  messageId: string;
  userUuid: string;
  reaction: string | null;
}): Promise<void> {
  const supa = createAdminClient();
  if (args.reaction === null) {
    const { error } = await supa
      .from("chat_reactions")
      .delete()
      .eq("message_kind", args.kind)
      .eq("message_id", args.messageId)
      .eq("user_id", args.userUuid);
    if (error) throw error;
    return;
  }
  const { error } = await supa.from("chat_reactions").upsert(
    {
      message_kind: args.kind,
      message_id: args.messageId,
      user_id: args.userUuid,
      reaction: args.reaction,
      created_at: new Date().toISOString(),
    },
    { onConflict: "message_kind,message_id,user_id" }
  );
  if (error) throw error;
}

/** The question kept on a message, when it has one and it is well formed. */
export function questionOf(value: unknown): SharedQuestion | null {
  if (!value || typeof value !== "object") return null;
  const q = value as Partial<SharedQuestion>;
  if (typeof q.prompt !== "string" || !Array.isArray(q.choices)) return null;
  return q as SharedQuestion;
}

/** A student's tutor: the tutor of their class, or their private tutor. */
export async function tutorOf(
  studentUuid: string
): Promise<{ tutorUuid: string; cohortId: string | null } | null> {
  const supa = createAdminClient();
  const { data: memberships } = await supa
    .from("cohort_members")
    .select("cohort_id, cohorts(tutor_user_id)")
    .eq("user_id", studentUuid)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1);
  const first = (memberships ?? [])[0] as
    | { cohort_id: string; cohorts: { tutor_user_id: string | null } | null }
    | undefined;
  if (first?.cohorts?.tutor_user_id)
    return { tutorUuid: first.cohorts.tutor_user_id, cohortId: first.cohort_id };
  const { data: own } = await supa
    .from("tutor_assignments")
    .select("tutor_user_id")
    .eq("student_user_id", studentUuid)
    .is("ended_at", null)
    .maybeSingle();
  return own?.tutor_user_id ? { tutorUuid: own.tutor_user_id, cohortId: null } : null;
}

/** Whether two people may have a private chat, and the class it belongs to. Classmates may; so may
 *  a student and their own tutor (`cohortId` is null for a privately tutored student). */
export async function pairOf(
  aUuid: string,
  bUuid: string,
  sharedCohortId: string | null
): Promise<{ ok: boolean; cohortId: string | null; tutorUuid: string | null }> {
  if (sharedCohortId) return { ok: true, cohortId: sharedCohortId, tutorUuid: null };
  const [aTutor, bTutor] = await Promise.all([tutorOf(aUuid), tutorOf(bUuid)]);
  if (aTutor?.tutorUuid === bUuid) return { ok: true, cohortId: aTutor.cohortId, tutorUuid: bUuid };
  if (bTutor?.tutorUuid === aUuid) return { ok: true, cohortId: bTutor.cohortId, tutorUuid: aUuid };
  return { ok: false, cohortId: null, tutorUuid: null };
}

/** How long after the last sign of someone they still count as here, and as typing. */
export const HERE_MS = 90_000;
export const TYPING_MS = 7_000;

/** Notes that a person is here, and where they are typing (null when they are not). */
export async function markPresence(userUuid: string, typingIn: string | null): Promise<void> {
  const now = new Date().toISOString();
  await createAdminClient()
    .from("chat_presence")
    .upsert(
      { user_id: userUuid, seen_at: now, typing_in: typingIn, typing_at: typingIn ? now : null },
      { onConflict: "user_id" }
    );
}

/** Who is typing in a place right now, other than the person asking. */
export async function typingIn(place: string, exceptUuid: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("chat_presence")
    .select("user_id")
    .eq("typing_in", place)
    .gt("typing_at", new Date(Date.now() - TYPING_MS).toISOString())
    .neq("user_id", exceptUuid);
  return error ? [] : (data ?? []).map((row) => row.user_id);
}

export async function isHere(userUuid: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("chat_presence")
    .select("seen_at")
    .eq("user_id", userUuid)
    .maybeSingle();
  if (error || !data) return false;
  return Date.now() - new Date(data.seen_at).getTime() < HERE_MS;
}

export type ReadScope = "chat" | "announcements";

export async function markChannelRead(
  userUuid: string,
  channelId: string,
  scope: ReadScope
): Promise<void> {
  await createAdminClient()
    .from("chat_channel_reads")
    .upsert(
      { user_id: userUuid, channel_id: channelId, scope, read_at: new Date().toISOString() },
      { onConflict: "user_id,channel_id,scope" }
    );
}

/** How many approved messages from other people have come since each was last read. */
export async function channelUnread(
  userUuid: string,
  channelId: string
): Promise<Record<ReadScope, number>> {
  const supa = createAdminClient();
  const { data: reads, error } = await supa
    .from("chat_channel_reads")
    .select("scope, read_at")
    .eq("user_id", userUuid)
    .eq("channel_id", channelId);
  if (error) return { chat: 0, announcements: 0 };
  const since = (scope: ReadScope) =>
    (reads ?? []).find((row) => row.scope === scope)?.read_at ?? null;
  const count = async (scope: ReadScope) => {
    let q = supa
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .eq("moderation_status", "approved")
      .neq("sender_id", userUuid);
    q =
      scope === "announcements"
        ? q.eq("message_type", "announcement")
        : q.neq("message_type", "announcement");
    const from = since(scope);
    // never read: only the last week counts, so an old class chat does not arrive as a wall of red
    q = q.gt("created_at", from ?? new Date(Date.now() - 7 * 86_400_000).toISOString());
    const { count: n } = await q;
    return n ?? 0;
  };
  const [chat, announcements] = await Promise.all([count("chat"), count("announcements")]);
  return { chat, announcements };
}

/** A name as classmates see it: first name and last initial. */
export function shortName(user: {
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
}): string {
  const first = (user.first_name ?? "").trim() || (user.email ?? "").split("@")[0] || "Student";
  const last = (user.last_name ?? "").trim();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
