// ============================================================
// GET /api/chat/messages?channelId=...&before=...&limit=...
//
// Paginated read of cohort-channel or Q&A messages. Cursor is
// the `created_at` of the oldest message in the prior page.
//
// Display redaction:
//   · Students see display_name_override only (never the real
//     sender). For rejected messages, content is replaced with
//     rejection_message.
//   · Tutors and admins see both display_name_override AND a
//     real_name field (firstName + lastName).
//   · Parents see real_name only for messages sent BY their
//     linked child.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  findChatChannelById,
  isStudentInChannelCohort,
  isTutorOfChannel,
  listChatMessages,
  type ChatMessageRow,
} from "@/lib/supabase/queries/chat";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

interface PublicMessage {
  id: string;
  channel_id: string;
  message_type: ChatMessageRow["message_type"];
  parent_message_id: string | null;
  display_name: string;
  /** Only present for tutors / admins / parent-of-sender. */
  real_name?: string;
  content: string | null;
  media_urls: string[];
  is_anonymous: boolean;
  is_pinned: boolean;
  is_highlighted: boolean;
  moderation_status: ChatMessageRow["moderation_status"];
  /** Replaces content for the viewer when the message is rejected. */
  rejection_message: string | null;
  created_at: string;
  ai_flagged: boolean;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const channelId = sp.get("channelId");
  const before = sp.get("before") ?? undefined;
  const limitRaw = parseInt(sp.get("limit") ?? "", 10);
  const limit = Math.min(MAX_LIMIT, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT);
  if (!channelId) {
    return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
  }

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const channel = await findChatChannelById(channelId);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const role = await fetchUserRole(userId);
  const isMember = await isStudentInChannelCohort(callerUuid, channelId);
  const isTutor = await isTutorOfChannel(callerUuid, channelId);
  const isAdmin = role === "admin";
  const isParent = role === "parent";

  // Members + tutors + admins read the channel. Parents read only
  // messages where their linked child is the sender; we filter
  // post-fetch since cohort membership for parents is indirect.
  if (!isMember && !isTutor && !isAdmin && !isParent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listChatMessages({ channelId, limit, before });

  // Build the parent-allowed-sender set if needed.
  let parentAllowedSenders = new Set<string>();
  if (isParent && !isAdmin && !isTutor) {
    const supa = createAdminClient();
    const { data: links } = await supa
      .from("parent_student_links")
      .select("student_user_id")
      .eq("parent_user_id", callerUuid);
    parentAllowedSenders = new Set(((links ?? []) as Array<{ student_user_id: string }>).map((l) => l.student_user_id));
  }

  // Resolve real names in one batch for tutors / admins / parents.
  const seesRealNames = isTutor || isAdmin || isParent;
  let nameById = new Map<string, string>();
  if (seesRealNames) {
    const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
    if (senderIds.length > 0) {
      const supa = createAdminClient();
      const { data: users } = await supa
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", senderIds);
      for (const u of (users ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
        nameById.set(u.id, name || u.email);
      }
    }
  }

  const visible = rows.filter((r) => {
    if (isParent && !isAdmin && !isTutor) {
      return parentAllowedSenders.has(r.sender_id);
    }
    return true;
  });

  const messages: PublicMessage[] = visible.map((r) => {
    const isRejected = r.moderation_status === "rejected";
    const showRealName = seesRealNames && (isTutor || isAdmin || parentAllowedSenders.has(r.sender_id));
    return {
      id: r.id,
      channel_id: r.channel_id,
      message_type: r.message_type,
      parent_message_id: r.parent_message_id,
      display_name: r.display_name_override ?? "Strata",
      real_name: showRealName ? nameById.get(r.sender_id) : undefined,
      content: isRejected && !isTutor && !isAdmin ? null : r.content,
      media_urls: isRejected && !isTutor && !isAdmin ? [] : r.media_urls,
      is_anonymous: r.is_anonymous,
      is_pinned: r.is_pinned,
      is_highlighted: r.is_highlighted,
      moderation_status: r.moderation_status,
      rejection_message: isRejected ? r.rejection_message : null,
      created_at: r.created_at,
      ai_flagged: r.ai_flagged,
    };
  });

  return NextResponse.json({
    messages,
    nextBefore: messages.length === limit ? messages[messages.length - 1].created_at : null,
  });
}
