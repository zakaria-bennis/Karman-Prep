// ============================================================
// Three-layer moderation pipeline.
//
// Every chat send route MUST run content through moderateMessage()
// before writing to Supabase or posting to Slack. No shortcuts.
//
// Layer 1: keyword + regex blocklist (instant; src/lib/moderation/blocklist.ts).
// Layer 2: TWO providers in parallel (src/lib/moderation/providers.ts):
//          · OpenAI Moderation — categorical safety, especially
//            sexual/minors. Decides high vs medium based on
//            OPENAI_HIGH_SEVERITY set in providers.ts.
//          · Gemini Flash       — nuanced LLM for subtle bullying,
//            off-topic, cheating-adjacent.
//          Each has a 4-second hard timeout.
// Layer 3: caller's responsibility (write Supabase + post Slack).
//
// Combination rule:
//   · ANY provider says HIGH severity     → reject (held).
//   · Otherwise ANY provider FLAGS at all → approved_with_flag
//                                            (delivered + queued).
//   · Both providers fail (network / etc) → approved_with_flag
//                                            (fail OPEN, retroactive
//                                            human review).
//   · Both providers approve cleanly      → approved.
// ============================================================

import { scanForBlocked } from "./blocklist";
import {
  callGeminiModeration,
  callOpenAIModeration,
  type GeminiModerationResult,
  type OpenAIModerationResult,
} from "./providers";
import { type ModerationInput, type ModerationOutcome } from "./types";

/** Spec-locked rejection copy shown to the student in place of their
 *  message when Layer 1 fires. */
const KEYWORD_REJECTION_MESSAGE =
  "This message could not be sent as it contains content that violates Strata's Community Guidelines. If you believe this is an error please contact your tutor.";

/** Same shape, different copy for Layer 2 high-severity holds. */
const AI_HIGH_REJECTION_MESSAGE =
  "This message is being reviewed by our team before it can be sent. You'll be notified once review is complete.";

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

  // ─── Layer 2 — OpenAI Moderation + Gemini Flash in PARALLEL ─
  const [openaiResult, geminiResult] = await Promise.allSettled([
    callOpenAIModeration(input.content),
    callGeminiModeration(input.content),
  ]);

  // Build a unified view of each provider's outcome.
  const openai: { ok: true; value: OpenAIModerationResult } | { ok: false; err: unknown } =
    openaiResult.status === "fulfilled"
      ? { ok: true, value: openaiResult.value }
      : { ok: false, err: openaiResult.reason };
  const gemini: { ok: true; value: GeminiModerationResult } | { ok: false; err: unknown } =
    geminiResult.status === "fulfilled"
      ? { ok: true, value: geminiResult.value }
      : { ok: false, err: geminiResult.reason };

  if (!openai.ok) console.error(`[moderation] openai error sender=${input.senderId}:`, openai.err);
  if (!gemini.ok) console.error(`[moderation] gemini error sender=${input.senderId}:`, gemini.err);

  // Both errored — fail OPEN: deliver, flag for retroactive review.
  if (!openai.ok && !gemini.ok) {
    return {
      decision: "approved_with_flag",
      reason: "Both moderation providers errored — delivering and flagging for review.",
    };
  }

  // High-severity from EITHER side → reject.
  const openaiHigh = openai.ok && openai.value.flagged && openai.value.isHighSeverity;
  const geminiHigh = gemini.ok && gemini.value.flagged && gemini.value.severity === "high";
  if (openaiHigh || geminiHigh) {
    const reasons: string[] = [];
    if (openai.ok && openai.value.flagged) {
      reasons.push(`OpenAI: ${openai.value.worstCategory ?? "unknown"} (${openai.value.worstScore.toFixed(2)})`);
    }
    if (gemini.ok && gemini.value.flagged) {
      reasons.push(`Gemini: ${gemini.value.reason}`);
    }
    return {
      decision: "rejected",
      layer: "ai",
      reason: reasons.join(" | "),
      rejection_message: AI_HIGH_REJECTION_MESSAGE,
    };
  }

  // Anything else flagged = deliver + queue.
  const openaiFlagged = openai.ok && openai.value.flagged;
  const geminiFlagged = gemini.ok && gemini.value.flagged;
  if (openaiFlagged || geminiFlagged) {
    const reasons: string[] = [];
    if (openaiFlagged && openai.ok) {
      reasons.push(`OpenAI: ${openai.value.worstCategory ?? "unknown"} (${openai.value.worstScore.toFixed(2)})`);
    }
    if (geminiFlagged && gemini.ok) {
      reasons.push(`Gemini: ${gemini.value.reason} (${gemini.value.severity})`);
    }
    return {
      decision: "approved_with_flag",
      reason: reasons.join(" | "),
    };
  }

  // Clean.
  return { decision: "approved" };
}
