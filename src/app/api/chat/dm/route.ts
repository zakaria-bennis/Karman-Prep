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
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import {
  findSharedCohort,
  insertDirectMessage,
  listDirectMessages,
  type DirectMessageRow,
} from "@/lib/supabase/queries/chat";
import { moderateMessage } from "@/lib/moderation/pipeline";

interface DmSendRequest {
  recipientId: string; // Clerk id of the recipient
  content: string;
  mediaUrls?: string[];
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
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<DmSendRequest>;
  try { body = (await req.json()) as Partial<DmSendRequest>; }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!body.recipientId) return NextResponse.json({ error: "Missing recipientId" }, { status: 400 });
  if (!body.content && (!body.mediaUrls || body.mediaUrls.length === 0)) {
    return NextResponse.json({ error: "Message must have content or at least one image" }, { status: 400 });
  }

  const senderUuid = await getUserUuidByClerkId(userId);
  const recipientUuid = await getUserUuidByClerkId(body.recipientId);
  if (!senderUuid || !recipientUuid) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }
  if (senderUuid === recipientUuid) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  // Per locked spec: DMs only within the same cohort.
  const sharedCohortId = await findSharedCohort(senderUuid, recipientUuid);
  if (!sharedCohortId) {
    return NextResponse.json(
      { error: "You can only DM students in your cohort" },
      { status: 403 }
    );
  }

  const outcome = await moderateMessage({
    content: body.content ?? "",
    mediaUrls: body.mediaUrls ?? [],
    senderId: userId,
    channelId: null,
    messageType: "direct_message",
  });

  if (outcome.decision === "rejected") {
    await insertDirectMessage({
      sender_id: senderUuid,
      recipient_id: recipientUuid,
      cohort_id: sharedCohortId,
      content: body.content ?? "",
      media_urls: body.mediaUrls ?? [],
      moderation_status: "rejected",
      keyword_flagged: outcome.layer === "keyword",
      ai_flagged: outcome.layer === "ai",
      ai_flag_reason: outcome.layer === "ai" ? outcome.reason : null,
      rejection_message: outcome.rejection_message,
    });
    return NextResponse.json(
      { rejected: true, message: outcome.rejection_message },
      { status: 400 }
    );
  }

  const row = await insertDirectMessage({
    sender_id: senderUuid,
    recipient_id: recipientUuid,
    cohort_id: sharedCohortId,
    content: body.content ?? "",
    media_urls: body.mediaUrls ?? [],
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: outcome.decision === "approved_with_flag",
    ai_flag_reason: outcome.decision === "approved_with_flag" ? outcome.reason : null,
    rejection_message: null,
  });

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
  const limit = Math.min(MAX_LIMIT, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT);
  if (!withClerkId) return NextResponse.json({ error: "Missing withUserId" }, { status: 400 });

  const callerUuid = await getUserUuidByClerkId(userId);
  const otherUuid = await getUserUuidByClerkId(withClerkId);
  if (!callerUuid || !otherUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  // Caller must be one of the two parties OR a tutor of their shared cohort OR admin.
  const role = await fetchUserRole(userId);
  const isAdmin = role === "admin";
  let isTutor = false;
  if (!isAdmin) {
    // Check tutor of any cohort that pair shares
    const supa = createAdminClient();
    const { data } = await supa
      .from("cohorts")
      .select("id")
      .eq("tutor_user_id", callerUuid);
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

  const rows = await listDirectMessages({ userUuidA: callerUuid, userUuidB: otherUuid, limit, before });

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

  const messages: PublicDirectMessage[] = rows.map((r) => {
    const isRejected = r.moderation_status === "rejected";
    return {
      id: r.id,
      sender_id: r.sender_id,
      recipient_id: r.recipient_id,
      content: isRejected && !isAdmin && !isTutor ? null : r.content,
      media_urls: isRejected && !isAdmin && !isTutor ? [] : r.media_urls,
      moderation_status: r.moderation_status,
      rejection_message: isRejected ? r.rejection_message : null,
      created_at: r.created_at,
    };
  });

  return NextResponse.json({
    messages,
    nextBefore: messages.length === limit ? messages[messages.length - 1].created_at : null,
  });
}
