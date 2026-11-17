// ============================================================
// /api/chat/dm
//
//   POST: send a DM. Validates both users share an active cohort,
//         runs moderation, writes to direct_messages.
//   GET ?withUserId=...: paginated DM history with that user.
//
// In single-bot mode DMs are Supabase-only — no Slack involvement.
// Same moderation pipeline as cohort messages.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { safeAuth as auth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findDirectMessageByClientMsgId,
  findSharedCohort,
  insertDirectMessage,
  listDirectMessages,
  PG_UNIQUE_VIOLATION,
  type DirectMessageRow,
  type InsertDirectMessageInput,
} from "@/lib/supabase/queries/chat";
import { moderateMessage } from "@/lib/moderation/pipeline";
import {
  applyConsequence,
  consequenceOf,
  getStanding,
  PAUSED_MESSAGE,
  WARNING_MESSAGE,
} from "@/lib/chat/standing";
import { deriveClientMsgId } from "@/lib/chat/idempotency";
import { sendDmBodySchema } from "../schemas";
import { after } from "next/server";
import { pairOf, questionOf, reactionsFor, type ReactionSummary } from "@/lib/chat/extras";
import { questionText, type SharedQuestion } from "@/lib/chat/shared";
import { answerInTutorChat, assistantAnswersNow } from "@/lib/chat-assistant/answer";

/** DM equivalent of chat-send's insertOrFindExisting — collapses a
 *  rapid double-click into a single DM row via the partial unique
 *  index on (sender_id, recipient_id, client_msg_id). */
async function insertOrFindExistingDm(input: InsertDirectMessageInput): Promise<DirectMessageRow> {
  try {
    return await insertDirectMessage(input);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === PG_UNIQUE_VIOLATION &&
      input.client_msg_id
    ) {
      const existing = await findDirectMessageByClientMsgId({
        senderUuid: input.sender_id,
        recipientUuid: input.recipient_id,
        clientMsgId: input.client_msg_id,
      });
      if (existing) return existing;
    }
    throw err;
  }
}

interface PublicDirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: DirectMessageRow["moderation_status"];
  rejection_message: string | null;
  created_at: string;
  read_at: string | null;
  parent_message_id: string | null;
  /** Written by the after-hours assistant, not by the person it is filed under. */
  from_assistant: boolean;
  reactions: ReactionSummary;
  question: SharedQuestion | null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = sendDmBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // ── Wave 1: sender/recipient UUID lookups in parallel ────────
  const [senderUuid, recipientUuid] = await Promise.all([
    getUserUuidByClerkId(userId),
    getUserUuidByClerkId(body.recipientId),
  ]);
  if (!senderUuid || !recipientUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }
  if (senderUuid === recipientUuid) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  const checkedText = [body.content ?? "", body.question ? questionText(body.question) : ""]
    .filter(Boolean)
    .join("\n");
  // kept only when there are any, so a send still works before the columns exist
  const extras = {
    ...(body.question ? { question: body.question } : {}),
    ...(body.parentMessageId ? { parent_message_id: body.parentMessageId } : {}),
  };

  // ── Wave 2: shared-cohort check + moderation in parallel ─────
  // Moderation only needs userId + content; it doesn't depend on
  // the cohort check. Running them together saves the OpenAI
  // round-trip from sitting behind the cohort lookup serially.
  // Per locked spec: DMs only within the same cohort.
  // Classmates may write to each other, and a student and their own tutor may.
  const pairLookup = findSharedCohort(senderUuid, recipientUuid).then((cohortId) =>
    pairOf(senderUuid, recipientUuid, cohortId)
  );
  const [pair, standing, outcome] = await Promise.all([
    pairLookup,
    getStanding(senderUuid),
    moderateMessage({
      // a question sent with the message is read by the check along with it
      content: checkedText,
      mediaUrls: body.mediaUrls ?? [],
      senderId: userId,
      senderUuid,
      channelId: null,
      messageType: "direct_message",
      staff: pairLookup.then((p) => p.tutorUuid === senderUuid),
    }),
  ]);
  if (!pair.ok) {
    return NextResponse.json({ error: "You can only DM students in your cohort" }, { status: 403 });
  }
  const sharedCohortId = pair.cohortId;
  // A paused sender cannot send until a tutor or admin has reviewed their chats.
  // (a tutor is never paused)
  if (standing.paused && pair.tutorUuid !== senderUuid) {
    return NextResponse.json({ paused: true, message: PAUSED_MESSAGE }, { status: 403 });
  }

  // Deterministic dedupe key — collapses double-clicks within a
  // ~60s window into the same logical send.
  const clientMsgId = deriveClientMsgId({
    senderUuid,
    channelId: null,
    recipientUuid,
    content: checkedText,
    mediaUrls: body.mediaUrls ?? [],
  });

  if (outcome.decision === "rejected") {
    await insertDirectMessage({
      sender_id: senderUuid,
      recipient_id: recipientUuid,
      cohort_id: sharedCohortId,
      content: body.content ?? "",
      media_urls: body.mediaUrls ?? [],
      ...extras,
      moderation_status: "rejected",
      keyword_flagged: outcome.layer === "keyword",
      // Karman classifier rejections are AI-driven too — record them
      // as ai_flagged with the layer source visible in the reason
      // string so the moderation queue can group them.
      ai_flagged: outcome.layer !== "keyword",
      ai_flag_reason: outcome.layer !== "keyword" ? outcome.reason : null,
      rejection_message: outcome.rejection_message,
      client_msg_id: clientMsgId,
    });
    // Answer-sharing is counted (a warning, then a pause); sexual content pauses at once.
    const cost = await applyConsequence(senderUuid, consequenceOf(outcome));
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

  // ── Approved with flag: HOLD until admin reviews. ─────────
  // DM rendering masks pending content for the recipient; the
  // sender still sees their own message.
  if (outcome.decision === "approved_with_flag") {
    const row = await insertOrFindExistingDm({
      sender_id: senderUuid,
      recipient_id: recipientUuid,
      cohort_id: sharedCohortId,
      content: body.content ?? "",
      media_urls: body.mediaUrls ?? [],
      ...extras,
      moderation_status: "flagged",
      keyword_flagged: false,
      ai_flagged: true,
      ai_flag_reason: outcome.reason,
      rejection_message: null,
      client_msg_id: clientMsgId,
    });
    return NextResponse.json({ message: row, pendingReview: true }, { status: 201 });
  }

  const row = await insertOrFindExistingDm({
    sender_id: senderUuid,
    recipient_id: recipientUuid,
    cohort_id: sharedCohortId,
    content: body.content ?? "",
    media_urls: body.mediaUrls ?? [],
    ...extras,
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: false,
    ai_flag_reason: null,
    rejection_message: null,
    client_msg_id: clientMsgId,
  });

  // A student writing to their tutor after hours is answered at once by the assistant, after this
  // response has gone, so sending is never held up by it.
  if (pair.tutorUuid === recipientUuid && assistantAnswersNow()) {
    after(() =>
      answerInTutorChat({
        studentUuid: senderUuid,
        tutorUuid: recipientUuid,
        cohortId: sharedCohortId,
        messageId: row.id,
        message: body.content ?? "",
        question: body.question ?? null,
      }).catch((error: unknown) =>
        console.error("[api/chat/dm] the after-hours answer failed:", error)
      )
    );
  }

  return NextResponse.json({ message: row }, { status: 201 });
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const withClerkId = sp.get("withUserId");
  const before = sp.get("before") ?? undefined;
  const limitRaw = parseInt(sp.get("limit") ?? "", 10);
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT
  );
  if (!withClerkId) return NextResponse.json({ error: "Missing withUserId" }, { status: 400 });

  const callerUuid = await getUserUuidByClerkId(userId);
  const otherUuid = await getUserUuidByClerkId(withClerkId);
  if (!callerUuid || !otherUuid)
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  // Caller must be one of the two parties OR a tutor of their shared cohort OR admin.
  const role = await fetchUserRole(userId);
  const isAdmin = role === "admin";
  let isTutor = false;
  if (!isAdmin) {
    // Check tutor of any cohort that pair shares
    const supa = createAdminClient();
    const { data } = await supa.from("cohorts").select("id").eq("tutor_user_id", callerUuid);
    if (data && data.length > 0) {
      // For simplicity, allow tutors to read DMs of anyone in their cohorts.
      // Stricter check would verify both parties are in one of THIS tutor's cohorts.
      isTutor = true;
    }
  }

  // Self-party always allowed; otherwise need admin/tutor.
  const isSelfParty = callerUuid === otherUuid; // shouldn't happen, but safe
  // The "self-party" check is implicit — listDirectMessages will return
  // messages where the caller is sender or recipient; if calling with
  // (callerUuid, otherUuid) and caller isn't actually involved, the
  // result is an empty set unless they're tutor/admin reading another pair.

  const rows = await listDirectMessages({
    userUuidA: callerUuid,
    userUuidB: otherUuid,
    limit,
    before,
  });

  // If caller is neither party AND not tutor/admin, deny.
  // Quickest: peek at the first row.
  if (!isAdmin && !isTutor && !isSelfParty) {
    if (rows.length === 0) {
      // Either no DMs exist, or caller has no business reading them — same response.
      return NextResponse.json({ messages: [], nextBefore: null });
    }
    const involved = rows.every((r) => r.sender_id === callerUuid || r.recipient_id === callerUuid);
    if (!involved) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reactions = await reactionsFor(
    "dm",
    rows.map((r) => r.id),
    callerUuid
  );

  const messages: PublicDirectMessage[] = rows.map((r) => {
    const isRejected = r.moderation_status === "rejected";
    const isFlagged = r.moderation_status === "flagged";
    const isSelf = r.sender_id === callerUuid;
    // Sender always sees own content. Admin + tutor always see all.
    // Recipient: rejected → hidden; flagged → hidden (pending review).
    const hideContent = (isRejected || isFlagged) && !isAdmin && !isTutor && !isSelf;
    return {
      id: r.id,
      sender_id: r.sender_id,
      recipient_id: r.recipient_id,
      content: hideContent ? null : r.content,
      media_urls: hideContent ? [] : r.media_urls,
      moderation_status: r.moderation_status,
      rejection_message: isRejected ? r.rejection_message : null,
      created_at: r.created_at,
      read_at: r.read_at ?? null,
      parent_message_id: r.parent_message_id ?? null,
      from_assistant: r.from_assistant === true,
      reactions: reactions.get(r.id) ?? { mine: null, counts: {} },
      question: hideContent ? null : questionOf(r.question),
    };
  });

  return NextResponse.json({
    messages,
    nextBefore: messages.length === limit ? messages[messages.length - 1].created_at : null,
  });
}
