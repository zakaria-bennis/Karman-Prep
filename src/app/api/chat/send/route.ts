// ============================================================
// POST /api/chat/send
//
// Sends a cohort chat message, Q&A question, or Q&A answer.
//
// Flow:
//   1. Clerk auth
//   2. Resolve sender UUID + verify cohort membership for the
//      target channel (or Q&A authority for answers)
//   3. Mute check (channel_mutes), and the sender's standing (a paused student cannot send)
//   4. moderateMessage() — Layer 1 + 2 of the pipeline
//   5. If approved: postMessage to Slack, insert with status=approved
//   6. If approved_with_flag: HOLD — DO NOT post to Slack; insert
//      with status='flagged'. Sender sees their own message; the
//      recipient sees a "pending admin review" placeholder. Admin
//      acts on it from /admin/moderation, which either approves
//      (posts to Slack + flips to approved) or rejects.
//   7. If rejected: insert a rejected row and return the rejection.
//
// Email is NOT sent here. High-severity rejection alerts to
// MODERATION_ALERT_EMAIL fire from the moderation queue
// processor, not inline (so a slow Resend call doesn't block
// chat send).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { questionText } from "@/lib/chat/shared";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  findChatChannelById,
  findChatMessageByClientMsgId,
  insertChatMessage,
  isStudentInCohort,
  isStudentMuted,
  isTutorOfChannel,
  PG_UNIQUE_VIOLATION,
  updateChatMessageSlackTs,
  type ChatMessageRow,
  type InsertChatMessageInput,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { moderateMessage } from "@/lib/moderation/pipeline";
import { postMessage as slackPostMessage, SlackAdapterError } from "@/lib/integrations/slack";
import { evaluateSendChannelAuth } from "@/lib/chat/can-send";
import {
  applyConsequence,
  consequenceOf,
  getStanding,
  PAUSED_MESSAGE,
  WARNING_MESSAGE,
} from "@/lib/chat/standing";
import { deriveClientMsgId } from "@/lib/chat/idempotency";
import { sendMessageBodySchema } from "../schemas";

/** Insert a chat_messages row, returning the existing row on a unique
 *  violation. The unique key is (channel_id, client_msg_id) restricted
 *  to non-rejected rows — same content + sender within ~60s collapses
 *  to one row. We use this for every send path so the route stays
 *  idempotent regardless of which branch we hit. */
async function insertOrFindExisting(
  input: InsertChatMessageInput
): Promise<{ row: ChatMessageRow; created: boolean }> {
  try {
    const row = await insertChatMessage(input);
    return { row, created: true };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === PG_UNIQUE_VIOLATION &&
      input.client_msg_id
    ) {
      const existing = await findChatMessageByClientMsgId({
        channelId: input.channel_id,
        clientMsgId: input.client_msg_id,
      });
      if (existing) return { row: existing, created: false };
    }
    throw err;
  }
}

function isPendingSlackTs(ts: string): boolean {
  return ts.startsWith("pending-");
}

function lastInitial(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() + "." : "";
}

function formatDisplayName(
  firstName: string | null,
  lastName: string | null,
  isAnonymous: boolean
): string {
  if (isAnonymous) return "Anonymous";
  const first = (firstName ?? "").trim() || "Karman";
  const last = lastInitial(lastName);
  return last ? `${first} ${last}` : first;
}

async function senderName(
  senderUuid: string
): Promise<{ first_name: string | null; last_name: string | null } | null> {
  const { data } = await createAdminClient()
    .from("users")
    .select("first_name, last_name")
    .eq("id", senderUuid)
    .maybeSingle();
  return data ?? null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = sendMessageBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // ─── Wave 1: independent prereqs run in parallel ─────────────
  // senderUuid and the channel lookup don't depend on each other.
  const [senderUuid, channel] = await Promise.all([
    getUserUuidByClerkId(userId),
    findChatChannelById(body.channelId),
  ]);
  if (!senderUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // ─── Wave 2: every remaining read fires in parallel ──────────
  // Auth checks (role/member/tutor/mute), the Clerk user lookup for
  // display name, and the moderation pipeline are all independent
  // of each other — they just need senderUuid + channel. Doing them
  // serially was the single biggest contributor to chat-send wall-
  // clock latency. The mute lookup runs even for tutors/admins (who
  // are exempt) so we don't add a second round-trip wave for the
  // common student case; the wasted check on tutor sends is cheap.
  //
  // Moderation runs alongside the auth checks: if the sender turns
  // out to be unauthorized we paid for one OpenAI call we'll discard,
  // but the typical authorized send saves ~500-2000ms of wall-clock.
  const isAnonymous = body.isAnonymous === true && body.messageType !== "qa_answer";
  const checkedText = [body.content ?? "", body.question ? questionText(body.question) : ""]
    .filter(Boolean)
    .join("\n");
  // kept only when there is one, so a send still works before the column exists
  const extras = body.question ? { question: body.question } : {};
  const roleLookup = fetchUserRole(userId);
  const tutorLookup = isTutorOfChannel(senderUuid, channel.id);
  const [role, isMember, isTutor, muted, clerkUser, standing, outcome] = await Promise.all([
    roleLookup,
    isStudentInCohort(senderUuid, channel.cohort_id),
    tutorLookup,
    isStudentMuted(senderUuid, channel.id),
    // the name is a nicety: a sign-in service hiccup must not stop the message
    currentUser().catch(() => null),
    getStanding(senderUuid),
    moderateMessage({
      // a question sent with the message is read by the check along with it
      content: checkedText,
      mediaUrls: body.mediaUrls ?? [],
      senderId: userId,
      senderUuid,
      channelId: channel.id,
      messageType: body.messageType,
      staff: Promise.all([roleLookup, tutorLookup]).then(
        ([role, teaches]) => role === "admin" || teaches
      ),
    }),
  ]);
  const isAdmin = role === "admin";

  // All the authority + mute logic lives in `evaluateSendChannelAuth`
  // so the rules can be unit-tested without standing up Clerk +
  // Supabase mocks. See src/lib/chat/can-send.ts.
  const authDecision = evaluateSendChannelAuth({
    messageType: body.messageType,
    isMember,
    isTutor,
    isAdmin,
    muted,
  });
  if (!authDecision.ok) {
    return NextResponse.json({ error: authDecision.error }, { status: authDecision.status });
  }

  // A student whose chats are paused cannot send until a tutor or admin has reviewed them.
  // Tutors and admins are never paused.
  const isStudentSender = !isTutor && !isAdmin;
  if (isStudentSender && standing.paused) {
    return NextResponse.json({ paused: true, message: PAUSED_MESSAGE }, { status: 403 });
  }

  // Resolve sender's display name for the post.
  // (the sign-in service's name, or Karman's own record of it when that is not to hand)
  const onFile = clerkUser?.firstName ? null : await senderName(senderUuid);
  const displayName = formatDisplayName(
    clerkUser?.firstName ?? onFile?.first_name ?? null,
    clerkUser?.lastName ?? onFile?.last_name ?? null,
    isAnonymous
  );

  // Deterministic dedupe key — same content/sender/channel/minute
  // produces the same id, so a double-tap on Send collapses to one
  // Slack post AND one DB row. See src/lib/chat/idempotency.ts.
  const clientMsgId = deriveClientMsgId({
    senderUuid,
    channelId: channel.id,
    content: checkedText,
    mediaUrls: body.mediaUrls ?? [],
  });

  // ─── Rejected: persist as 'rejected' for the moderation queue ─
  if (outcome.decision === "rejected") {
    // Rejected rows are excluded from the dedupe unique index so a
    // subsequent legitimate (different) message isn't blocked. The
    // client_msg_id is still recorded for the moderation queue's audit.
    await insertChatMessage({
      slack_message_ts: `rejected-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel_id: channel.id,
      sender_id: senderUuid,
      is_anonymous: isAnonymous,
      display_name_override: displayName,
      message_type: body.messageType,
      content: body.content ?? "",
      media_urls: body.mediaUrls ?? [],
      parent_message_id: body.parentMessageId ?? null,
      ...extras,
      moderation_status: "rejected",
      keyword_flagged: outcome.layer === "keyword",
      // Karman classifier rejections are AI-driven too — record them
      // as ai_flagged with the layer source visible in the reason
      // string so the moderation queue can group them.
      ai_flagged: outcome.layer !== "keyword",
      ai_flag_reason: outcome.layer !== "keyword" ? outcome.reason : null,
      rejection_message: outcome.rejection_message,
      cohort_label: channel.display_name,
      client_msg_id: clientMsgId,
    });
    // Answer-sharing is counted (a warning, then a pause); sexual content pauses at once.
    const cost = isStudentSender
      ? await applyConsequence(senderUuid, consequenceOf(outcome))
      : null;
    return NextResponse.json(
      {
        rejected: true,
        message: cost?.paused ? PAUSED_MESSAGE : outcome.rejection_message,
        ...(cost?.warned ? { warning: WARNING_MESSAGE } : {}),
        ...(cost?.paused ? { paused: true } : {}),
      },
      { status: 400 }
    );
  }

  // ─── Approved with flag: HOLD — do NOT post to Slack yet ─
  // The sender's UI shows their message as "pending review"; the
  // recipient sees a placeholder. /admin/moderation triggers the
  // Slack post on approve, or marks rejected to keep it hidden.
  if (outcome.decision === "approved_with_flag") {
    const { row } = await insertOrFindExisting({
      slack_message_ts: `flagged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel_id: channel.id,
      sender_id: senderUuid,
      is_anonymous: isAnonymous,
      display_name_override: displayName,
      message_type: body.messageType,
      content: body.content ?? "",
      media_urls: body.mediaUrls ?? [],
      parent_message_id: body.parentMessageId ?? null,
      ...extras,
      moderation_status: "flagged",
      keyword_flagged: false,
      ai_flagged: true,
      ai_flag_reason: outcome.reason,
      rejection_message: null,
      cohort_label: channel.display_name,
      client_msg_id: clientMsgId,
    });
    return NextResponse.json({ message: row, pendingReview: true }, { status: 201 });
  }

  // ─── Approved (clean): insert FIRST so we have a journal entry,
  //     then post to Slack with the same client_msg_id (Slack also
  //     dedupes natively), then patch the row with the real ts.
  //     If insert hits 23505 (a recent identical send), we return
  //     the existing row — no double Slack post.
  const pendingTs = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { row, created } = await insertOrFindExisting({
    slack_message_ts: pendingTs,
    channel_id: channel.id,
    sender_id: senderUuid,
    is_anonymous: isAnonymous,
    display_name_override: displayName,
    message_type: body.messageType,
    content: body.content ?? "",
    media_urls: body.mediaUrls ?? [],
    parent_message_id: body.parentMessageId ?? null,
    ...extras,
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: false,
    ai_flag_reason: null,
    rejection_message: null,
    cohort_label: channel.display_name,
    client_msg_id: clientMsgId,
  });

  // Existing row already has a real ts — fully duplicate send, done.
  if (!created && !isPendingSlackTs(row.slack_message_ts)) {
    return NextResponse.json({ message: row }, { status: 201 });
  }

  // Either we just inserted, or we matched an existing row that
  // never made it to Slack (prior failure). In both cases the
  // Slack post needs to fire — we pass the same client_msg_id so
  // Slack dedupes if it actually received the prior attempt.
  // A local test server has no Slack: the message is kept and shown, and nothing is posted.
  if (process.env.NODE_ENV !== "production" && !process.env.SLACK_BOT_TOKEN) {
    const kept = await updateChatMessageSlackTs(row.id, "local-" + Date.now());
    return NextResponse.json({ message: kept }, { status: 201 });
  }

  let slackTs: string;
  try {
    const result = await slackPostMessage({
      channelId: channel.slack_channel_id,
      displayName,
      content:
        (body.messageType === "announcement" ? "Announcement: " : "") +
        (body.content ?? "") +
        (body.question ? `\n[Question] ${body.question.prompt}` : ""),
      imageUrls: body.mediaUrls ?? [],
      clientMsgId,
    });
    slackTs = result.ts;
  } catch (err) {
    const isAdapter = err instanceof SlackAdapterError;
    console.error("[api/chat/send] slack post failed:", isAdapter ? err.toString() : err);
    // Row stays with the pending ts so a retry can re-attempt Slack
    // (Slack will dedupe via client_msg_id if it secretly received).
    return NextResponse.json(
      { error: "Failed to deliver message — please retry" },
      { status: 502 }
    );
  }

  const updated = await updateChatMessageSlackTs(row.id, slackTs);
  return NextResponse.json({ message: updated }, { status: 201 });
}
