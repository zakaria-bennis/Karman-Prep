// ============================================================
// Three-layer moderation pipeline.
//
// Every chat send route MUST run content through moderateMessage()
// before writing to Supabase or posting to Slack. No shortcuts.
//
// Layer 1: keyword + regex blocklist (instant; src/lib/moderation/blocklist.ts).
//          Text-only — images don't have a Layer 1 gate.
// Layer 2: OpenAI Moderation (src/lib/moderation/providers.ts).
//          Categorical safety: sexual/minors, self-harm, violence,
//          hate, harassment. Multimodal — moderates text AND any
//          attached image URLs in a single call. 4-second hard
//          timeout. FAILS CLOSED — outage = rejection.
// Layer 2.5: Karman's own check, Claude Haiku
//          (src/lib/moderation/karman-classifier.ts). Runs in
//          parallel with Layer 2 on the words and every picture.
//          It knows the room (students of 14 to 18) and says what
//          kind of problem it found. FAILS CLOSED as well.
// Layer 3: caller's responsibility (write Supabase + post Slack).
//
// Combination rule:
//   · Layer 1 keyword hit                → reject (held).
//   · Layer 2 flagged + HIGH category    → reject (held).
//   · Layer 2 flagged + score ≥ 0.5      → reject (held).
//                                          For a 14-18 school audience
//                                          we don't let high-confidence
//                                          flags through just because
//                                          the category isn't on the
//                                          always-HIGH list.
//   · Layer 2.5 says "cheating"          → reject, layer "integrity":
//                                          passing answers about. The
//                                          caller counts these.
//   · Layer 2.5 (Karman) flagged         → reject (held). Karman's
//                                          school-audience prompt is
//                                          stricter than OpenAI's
//                                          safety classifier — when
//                                          it says flag, we don't
//                                          second-guess.
//   · Layer 2 flagged (medium, < 0.5)    → approved_with_flag (delivered
//        AND Karman clean                  + queued for review).
//   · Layer 2 errors out                 → REJECT (fail-CLOSED) so a
//                                          provider outage doesn't open
//                                          the floodgates. User sees
//                                          "try again" message.
//   · Layer 2.5 errors out               → REJECT (fail-CLOSED), the
//                                          same "try again" message.
//   · Both Layer 2 and 2.5 clean         → approved.
//
// Empty message guard: a message with no text AND no images can't
// reach this function — the chat send/dm routes reject those at
// validation. If we ever see one here, we approve (no content to
// review).
// ============================================================

import { scanForBlocked } from "./blocklist";
import { callKarmanClassifier, type KarmanClassifierResult } from "./karman-classifier";
import { callOpenAIModeration } from "./providers";
import { type ModerationInput, type ModerationOutcome } from "./types";

/** Shown to the student in place of their message when Layer 1 fires
 *  (explicit profanity, slurs, sexual terms, self-harm signals, PII). */
const KEYWORD_REJECTION_MESSAGE =
  "This message breaches Karman's terms of use and was not sent. If you believe this is an error, please contact your tutor.";

/** Layer 2 high-severity hold — message is queued for human review. */
const AI_HIGH_REJECTION_MESSAGE =
  "This message breaches Karman's terms of use and is being reviewed by our team. You'll be notified once review is complete.";

/** Layer 2.5 judged the message to be passing answers about, not working a question out. */
const INTEGRITY_REJECTION_MESSAGE =
  "This message was not sent. Chat is for working questions out together, not for passing answers. Your tutor has been told.";

/** Layer 2 errored out — fail-closed. The student should try again
 *  in a few seconds; transient OpenAI hiccups are short-lived. */
const AI_UNAVAILABLE_MESSAGE =
  "We're having a momentary issue checking your message. Please try again in a few seconds.";

/** For a 14-18 school audience: any OpenAI flag at or above this
 *  category-score threshold rejects, even if the category isn't on
 *  the always-HIGH list. 0.5 is a deliberately permissive bar —
 *  better to make a student rephrase than have a parent see vile
 *  content delivered with a "we're reviewing it" badge. */
const SCHOOL_REJECT_THRESHOLD = 0.5;

export async function moderateMessage(input: ModerationInput): Promise<ModerationOutcome> {
  // ─── Layer 1 — keyword + regex ─────────────────────────────
  if (input.content && input.content.trim().length > 0) {
    const hit = scanForBlocked(input.content);
    if (hit) {
      console.log(
        `[moderation] keyword reject sender=${input.senderId} match=${hit.matched} (source=${hit.source})`
      );
      return {
        decision: "rejected",
        layer: "keyword",
        reason: `Blocked: ${hit.matched}`,
        rejection_message: KEYWORD_REJECTION_MESSAGE,
      };
    }
  }

  // Empty message guard: text + image counts both zero means there's
  // nothing to moderate. The send routes filter this case out upstream,
  // but defending here keeps the function pure-functional and easier
  // to reason about.
  const hasContent = !!input.content && input.content.trim().length > 0;
  const hasImages = input.mediaUrls.length > 0;
  if (!hasContent && !hasImages) {
    return { decision: "approved" };
  }

  // Every message and every image goes through Layer 2 and 2.5, every time. (There used to be a
  // five-minute pass for a sender who had just been approved; it let an image or a message through
  // unchecked, so it is gone. Students here are minors: nothing is waved through.)

  // ─── Layer 2 + 2.5 — run in parallel ──────────────────────
  // Both look at the words and at every picture.
  const [openaiResult, karmanResult] = await Promise.allSettled([
    callOpenAIModeration(input.content ?? "", input.mediaUrls),
    callKarmanClassifier(input.content ?? "", input.mediaUrls),
  ]);

  // OpenAI Moderation fails CLOSED — provider outage = rejection.
  if (openaiResult.status === "rejected") {
    const errMsg =
      openaiResult.reason instanceof Error
        ? openaiResult.reason.message
        : String(openaiResult.reason);
    console.error(`[moderation] openai error sender=${input.senderId}:`, errMsg);
    return {
      decision: "rejected",
      layer: "ai",
      reason: `OpenAI moderation unavailable: ${errMsg}`,
      rejection_message: AI_UNAVAILABLE_MESSAGE,
    };
  }
  const result = openaiResult.value;

  // Karman's check (Claude) fails CLOSED too: it is the one that looks at pictures with the room in
  // mind, so a message it could not check is not delivered.
  if (karmanResult.status === "rejected") {
    const errMsg =
      karmanResult.reason instanceof Error
        ? karmanResult.reason.message
        : String(karmanResult.reason);
    console.error(`[moderation] karman check error sender=${input.senderId}:`, errMsg);
    return {
      decision: "rejected",
      layer: "ai",
      reason: `Karman check unavailable: ${errMsg}`,
      rejection_message: AI_UNAVAILABLE_MESSAGE,
    };
  }
  const karman: KarmanClassifierResult = karmanResult.value;

  // Layer 2.5 (Karman) flag → reject. Karman's school-audience
  // prompt is stricter than OpenAI's safety categories — if it says
  // a parent would be uncomfortable, we don't second-guess.
  // Academic dishonesty is reported apart from other conduct, so the caller can count it.
  const studentRule = karman.category === "cheating" || karman.category === "contact";
  const karmanFlagged = karman.flagged && !(studentRule && (await input.staff) === true);
  if (karmanFlagged && karman.category === "cheating") {
    return {
      decision: "rejected",
      layer: "integrity",
      reason: `Karman: ${karman.reason}`,
      rejection_message: INTEGRITY_REJECTION_MESSAGE,
    };
  }

  if (karmanFlagged) {
    return {
      decision: "rejected",
      layer: "karman",
      // the kind leads the reason ("Karman: sexual: ..."), which standing.ts reads
      reason: `Karman: ${karman.category ?? "conduct"}: ${karman.reason}`,
      rejection_message: AI_HIGH_REJECTION_MESSAGE,
    };
  }

  // Layer 2 (OpenAI) HIGH-category OR score ≥ 0.5 → reject. For a
  // school audience we don't let high-confidence flags through just
  // because the category isn't on the always-HIGH list. The 0.93-
  // score `sexual` flag we saw in prod is exactly the kind of case
  // this catches.
  if (result.flagged && (result.isHighSeverity || result.worstScore >= SCHOOL_REJECT_THRESHOLD)) {
    return {
      decision: "rejected",
      layer: "ai",
      reason: `OpenAI: ${result.worstCategory ?? "unknown"} (${result.worstScore.toFixed(2)})`,
      rejection_message: AI_HIGH_REJECTION_MESSAGE,
    };
  }

  // Layer 2 medium-severity (score < 0.5) and Karman clean → deliver
  // + queue for review.
  if (result.flagged) {
    return {
      decision: "approved_with_flag",
      reason: `OpenAI: ${result.worstCategory ?? "unknown"} (${result.worstScore.toFixed(2)})`,
    };
  }

  // Clean.
  return { decision: "approved" };
}
