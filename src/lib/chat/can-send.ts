// ============================================================
// Pure helper — "can this user send this message in this channel?"
//
// Consolidates the nested authority + mute conditionals that
// chat/send/route.ts used to do inline. Pure function over the
// pre-fetched role / membership / tutor / mute flags so it can
// be unit-tested without standing up Clerk + Supabase mocks.
//
// The route is responsible for the I/O parts: resolving the
// caller's UUID, looking up channel + role + cohort_member +
// tutor_of_channel + channel_mute. This function just decides.
// ============================================================

import type { ChatMessageType } from "@/lib/supabase/queries/chat";

export type SendChannelAuthDecision = { ok: true } | { ok: false; status: 403; error: string };

export interface SendChannelAuthInputs {
  messageType: ChatMessageType;
  /** Active member of the channel's cohort. */
  isMember: boolean;
  /** Tutor of the channel's cohort (cohorts.tutor_user_id match). */
  isTutor: boolean;
  /** Real (non-impersonated) role is admin. */
  isAdmin: boolean;
  /** Has an active mute row on (channel_id, sender_id). */
  muted: boolean;
}

/** Returns ok / forbidden based on Karman's chat-send rules:
 *
 *  · `qa_answer` may only be posted by tutors + admins.
 *  · `cohort_message` and `qa_question` may be posted by an active
 *    cohort member, the cohort's tutor, or an admin.
 *  · Mutes apply only to students — tutors + admins bypass.
 *
 *  Add a new test in can-send.test.ts whenever you change these
 *  rules. The route handler is the only caller, but the rules
 *  themselves are product policy and worth treating as such.
 */
export function evaluateSendChannelAuth(args: SendChannelAuthInputs): SendChannelAuthDecision {
  const { messageType, isMember, isTutor, isAdmin, muted } = args;

  if (messageType === "qa_answer") {
    if (!isTutor && !isAdmin) {
      return { ok: false, status: 403, error: "Only tutors can post Q&A answers" };
    }
  } else {
    if (!isMember && !isTutor && !isAdmin) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  // Mute applies only to students; tutors + admins bypass.
  if (!isTutor && !isAdmin && muted) {
    return {
      ok: false,
      status: 403,
      error: "You're temporarily muted in this channel.",
    };
  }

  return { ok: true };
}
