// ============================================================
// POST /api/chat/send
//
// Sends a cohort chat message, Q&A question, or Q&A answer.
//
// Flow:
//   1. Clerk auth
//   2. Resolve sender UUID + verify cohort membership for the
//      target channel (or Q&A authority for answers)
//   3. Mute check (channel_mutes)
//   4. moderateMessage() — Layer 1 + 2 of the pipeline
//   5. If approved or approved_with_flag: postMessage to Slack
//      and insert chat_messages row with the moderation state
//   6. If rejected: insert a rejected row (so it appears in the
//      moderation queue) and return the rejection message
//
// Email is NOT sent here. High-severity rejection alerts to
// MODERATION_ALERT_EMAIL fire from the moderation queue
// processor, not inline (so a slow Resend call doesn't block
// chat send).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  findChatChannelById,
  insertChatMessage,
  isStudentInCohort,
  isStudentMuted,
  isTutorOfChannel,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { moderateMessage } from "@/lib/moderation/pipeline";
import { postMessage as slackPostMessage, SlackAdapterError } from "@/lib/integrations/slack";
import { evaluateSendChannelAuth } from "@/lib/chat/can-send";
import { sendMessageBodySchema } from "../schemas";

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
  const [role, isMember, isTutor, muted, clerkUser, outcome] = await Promise.all([
    fetchUserRole(userId),
    isStudentInCohort(senderUuid, channel.cohort_id),
    isTutorOfChannel(senderUuid, channel.id),
    isStudentMuted(senderUuid, channel.id),
    currentUser(),
    moderateMessage({
      content: body.content ?? "",
      mediaUrls: body.mediaUrls ?? [],
      senderId: userId,
      channelId: channel.id,
      messageType: body.messageType,
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

  // Resolve sender's display name for the post.
  const displayName = formatDisplayName(
    clerkUser?.firstName ?? null,
    clerkUser?.lastName ?? null,
    isAnonymous
  );

  // ─── Rejected: persist as 'rejected' for the moderation queue ─
  if (outcome.decision === "rejected") {
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
      moderation_status: "rejected",
      keyword_flagged: outcome.layer === "keyword",
      // Karman classifier rejections are AI-driven too — record them
      // as ai_flagged with the layer source visible in the reason
      // string so the moderation queue can group them.
      ai_flagged: outcome.layer === "ai" || outcome.layer === "karman",
      ai_flag_reason: outcome.layer === "ai" || outcome.layer === "karman" ? outcome.reason : null,
      rejection_message: outcome.rejection_message,
      cohort_label: channel.display_name,
    });
    return NextResponse.json(
      { rejected: true, message: outcome.rejection_message },
      { status: 400 }
    );
  }

  // ─── Approved (or approved_with_flag): post to Slack first ─
  let slackTs: string;
  try {
    const result = await slackPostMessage({
      channelId: channel.slack_channel_id,
      displayName,
      content: body.content ?? "",
      imageUrls: body.mediaUrls ?? [],
    });
    slackTs = result.ts;
  } catch (err) {
    const isAdapter = err instanceof SlackAdapterError;
    console.error("[api/chat/send] slack post failed:", isAdapter ? err.toString() : err);
    return NextResponse.json(
      { error: "Failed to deliver message — please retry" },
      { status: 502 }
    );
  }

  const row = await insertChatMessage({
    slack_message_ts: slackTs,
    channel_id: channel.id,
    sender_id: senderUuid,
    is_anonymous: isAnonymous,
    display_name_override: displayName,
    message_type: body.messageType,
    content: body.content ?? "",
    media_urls: body.mediaUrls ?? [],
    parent_message_id: body.parentMessageId ?? null,
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: outcome.decision === "approved_with_flag",
    ai_flag_reason: outcome.decision === "approved_with_flag" ? outcome.reason : null,
    rejection_message: null,
    cohort_label: channel.display_name,
  });

  return NextResponse.json({ message: row }, { status: 201 });
}
