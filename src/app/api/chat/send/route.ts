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
  isStudentInChannelCohort,
  isStudentMuted,
  isTutorOfChannel,
  type ChatMessageType,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { moderateMessage } from "@/lib/moderation/pipeline";
import { postMessage as slackPostMessage, SlackAdapterError } from "@/lib/slack";

interface SendRequest {
  channelId: string;
  content: string;
  mediaUrls?: string[];
  isAnonymous?: boolean;
  messageType: ChatMessageType;
  /** Required when messageType = 'qa_answer' — the question this answers. */
  parentMessageId?: string;
}

function lastInitial(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() + "." : "";
}

function formatDisplayName(firstName: string | null, lastName: string | null, isAnonymous: boolean): string {
  if (isAnonymous) return "Anonymous";
  const first = (firstName ?? "").trim() || "Karman";
  const last = lastInitial(lastName);
  return last ? `${first} ${last}` : first;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<SendRequest>;
  try {
    body = (await req.json()) as Partial<SendRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.channelId || !body.messageType) {
    return NextResponse.json(
      { error: "Missing channelId or messageType" },
      { status: 400 }
    );
  }
  if (!body.content && (!body.mediaUrls || body.mediaUrls.length === 0)) {
    return NextResponse.json(
      { error: "Message must have content or at least one image" },
      { status: 400 }
    );
  }
  if (body.messageType === "qa_answer" && !body.parentMessageId) {
    return NextResponse.json(
      { error: "qa_answer requires parentMessageId" },
      { status: 400 }
    );
  }

  const senderUuid = await getUserUuidByClerkId(userId);
  if (!senderUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const channel = await findChatChannelById(body.channelId);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Authority check:
  //   · cohort_message + qa_question: sender must be an active cohort member OR the cohort's tutor
  //   · qa_answer:                    only tutors (and admins) may answer
  const role = await fetchUserRole(userId);
  const isMember = await isStudentInChannelCohort(senderUuid, channel.id);
  const isTutor = await isTutorOfChannel(senderUuid, channel.id);
  const isAdmin = role === "admin";

  if (body.messageType === "qa_answer") {
    if (!isTutor && !isAdmin) {
      return NextResponse.json(
        { error: "Only tutors can post Q&A answers" },
        { status: 403 }
      );
    }
  } else {
    if (!isMember && !isTutor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Mute check (only applies to students; tutors + admins bypass).
  if (!isTutor && !isAdmin) {
    const muted = await isStudentMuted(senderUuid, channel.id);
    if (muted) {
      return NextResponse.json(
        { error: "You're temporarily muted in this channel." },
        { status: 403 }
      );
    }
  }

  // Resolve sender's display fields for the post.
  const clerkUser = await currentUser();
  const isAnonymous = body.isAnonymous === true && body.messageType !== "qa_answer";
  const displayName = formatDisplayName(
    clerkUser?.firstName ?? null,
    clerkUser?.lastName ?? null,
    isAnonymous
  );

  // ─── Run the moderation pipeline ────────────────────────────
  const outcome = await moderateMessage({
    content: body.content ?? "",
    mediaUrls: body.mediaUrls ?? [],
    senderId: userId,
    channelId: channel.id,
    messageType: body.messageType,
  });

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
      ai_flagged: outcome.layer === "ai",
      ai_flag_reason: outcome.layer === "ai" ? outcome.reason : null,
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
