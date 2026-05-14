// ============================================================
// Two-layer moderation pipeline.
//
// Every chat send route MUST run content through moderateMessage()
// before writing to Supabase or posting to Slack. No shortcuts.
//
// Layer 1: keyword + regex blocklist (instant; src/lib/moderation/blocklist.ts).
// Layer 2: OpenAI Moderation (src/lib/moderation/providers.ts).
//          Categorical safety: sexual/minors, self-harm, violence,
//          hate, harassment. 4-second hard timeout.
// Layer 3: caller's responsibility (write Supabase + post Slack).
//
// Combination rule:
//   · Layer 1 keyword hit       → reject (held).
//   · Layer 2 flagged + HIGH    → reject (held).
//   · Layer 2 flagged (medium)  → approved_with_flag (delivered + queued).
//   · Layer 2 errors out        → REJECT (fail-CLOSED) so a provider
//                                  outage doesn't open the floodgates.
//                                  User sees "try again" message.
//   · Layer 2 clean             → approved.
// ============================================================

import { scanForBlocked } from "./blocklist";
import { callOpenAIModeration } from "./providers";
import { type ModerationInput, type ModerationOutcome } from "./types";

/** Shown to the student in place of their message when Layer 1 fires
 *  (explicit profanity, slurs, sexual terms, self-harm signals, PII). */
const KEYWORD_REJECTION_MESSAGE =
  "This message breaches Karman's terms of use and was not sent. If you believe this is an error, please contact your tutor.";

/** Layer 2 high-severity hold — message is queued for human review. */
const AI_HIGH_REJECTION_MESSAGE =
  "This message breaches Karman's terms of use and is being reviewed by our team. You'll be notified once review is complete.";

/** Layer 2 errored out — fail-closed. The student should try again
 *  in a few seconds; transient OpenAI hiccups are short-lived. */
const AI_UNAVAILABLE_MESSAGE =
  "We're having a momentary issue checking your message. Please try again in a few seconds.";

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

  // No text means image-only. We don't moderate images yet — bypass Layer 2.
  if (!input.content || input.content.trim().length === 0) {
    return { decision: "approved" };
  }

  // ─── Layer 2 — OpenAI Moderation ───────────────────────────
  let result;
  try {
    result = await callOpenAIModeration(input.content);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[moderation] openai error sender=${input.senderId}:`, errMsg);
    // Fail CLOSED — single provider down means we can't safely deliver.
    return {
      decision: "rejected",
      layer: "ai",
      reason: `OpenAI moderation unavailable: ${errMsg}`,
      rejection_message: AI_UNAVAILABLE_MESSAGE,
    };
  }

  // High-severity → reject.
  if (result.flagged && result.isHighSeverity) {
    return {
      decision: "rejected",
      layer: "ai",
      reason: `OpenAI: ${result.worstCategory ?? "unknown"} (${result.worstScore.toFixed(2)})`,
      rejection_message: AI_HIGH_REJECTION_MESSAGE,
    };
  }

  // Medium-severity → deliver + queue for review.
  if (result.flagged) {
    return {
      decision: "approved_with_flag",
      reason: `OpenAI: ${result.worstCategory ?? "unknown"} (${result.worstScore.toFixed(2)})`,
    };
  }

  // Clean.
  return { decision: "approved" };
}
