// ============================================================
// Three-layer moderation pipeline.
//
// EVERY chat message — cohort chat, Q&A, DM — goes through this
// before being written to Supabase or posted to Slack. No
// shortcuts, no inline moderation logic anywhere else.
//
// Layer 1: keyword + regex blocklist (instant; rejects).
// Layer 2: Claude (claude-sonnet-4-6) with 4-second hard timeout.
//          High severity → reject + admin alert email.
//          Low/medium severity → deliver + add to human review.
//          Timeout / API error → deliver + flag for retroactive
//          review (fail open, not closed — chat shouldn't break
//          when Claude is slow).
// Layer 3: caller's responsibility (write to Supabase + Slack).
// ============================================================

import { scanForBlocked } from "./blocklist";
import {
  type ClaudeModerationResult,
  type ClaudeSeverity,
  type ModerationInput,
  type ModerationOutcome,
} from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_TIMEOUT_MS = 4_000;

/** Standardized rejection copy shown to the student in place of their
 *  message when Layer 1 fires. Spec-locked text. */
const KEYWORD_REJECTION_MESSAGE =
  "This message could not be sent as it contains content that violates Strata's Community Guidelines. If you believe this is an error please contact your tutor.";

/** Same copy variant for Layer 2 high-severity holds. */
const AI_HIGH_REJECTION_MESSAGE =
  "This message is being reviewed by our team before it can be sent. You'll be notified once review is complete.";

const SYSTEM_PROMPT = [
  "You are a content moderator for an educational platform that serves SAT-preparation students between the ages of 14 and 18.",
  "Your job is to flag chat messages that:",
  "- contain bullying or harassment, even if subtle (sarcasm, dog-piling, exclusion).",
  "- contain inappropriate romantic or sexual content.",
  "- contain personal identifying information not caught by the keyword filter — for example, partial phone numbers, addresses, school names paired with last names.",
  "- are completely unrelated to academics or normal supportive peer conversation (this is not a free-chat platform).",
  "- encourage cheating or academic dishonesty.",
  "- contain anything that would make a parent uncomfortable seeing their child send or receive.",
  "",
  'Respond ONLY with a single JSON object: {"flagged": boolean, "reason": string, "severity": "low" | "medium" | "high"}.',
  "Use severity high for content that should be held until a human reviews (sexual content, threats, doxxing, self-harm).",
  "Use severity medium for content the platform should still deliver but record for review (subtle bullying, off-topic chatter, possibly cheating-adjacent).",
  "Use severity low for borderline cases worth logging.",
  "Set flagged=false only if the message is clearly fine.",
  "Do not include any prose outside the JSON object.",
].join("\n");

/** Runs the full pipeline. Pure function — does NOT write to
 *  Supabase or Slack. Caller uses the outcome to decide what to do. */
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

  // ─── Layer 2 — Claude AI ───────────────────────────────────
  // Skip if no text at all (image-only message). Image moderation
  // is a future enhancement.
  if (!input.content || input.content.trim().length === 0) {
    return { decision: "approved" };
  }

  let claudeResult: ClaudeModerationResult | null = null;
  let claudeFailed = false;
  try {
    claudeResult = await callClaudeWithTimeout(input.content);
  } catch (err) {
    claudeFailed = true;
    console.error(`[moderation] claude error sender=${input.senderId}:`, err);
  }

  // Fail-open on Claude error / timeout: deliver, but mark as flagged
  // so a human reviews retroactively.
  if (claudeFailed || !claudeResult) {
    return {
      decision: "approved_with_flag",
      reason: "Claude moderation timed out or errored — deliver and flag for review.",
    };
  }

  if (!claudeResult.flagged) {
    return { decision: "approved" };
  }

  // Severity-driven branching
  if (claudeResult.severity === "high") {
    return {
      decision: "rejected",
      layer: "ai",
      reason: claudeResult.reason,
      rejection_message: AI_HIGH_REJECTION_MESSAGE,
    };
  }

  // Low / medium → deliver but flag
  return {
    decision: "approved_with_flag",
    reason: claudeResult.reason,
  };
}

// ─────────────────────────────────────────────────────────────
// Claude call (raw fetch — no SDK dependency)
// ─────────────────────────────────────────────────────────────

async function callClaudeWithTimeout(content: string): Promise<ClaudeModerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Moderate this student message:\n\n---\n${content}\n---`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`anthropic HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    interface AnthropicMessageResponse {
      content?: Array<{ type: string; text?: string }>;
    }
    const body = (await res.json()) as AnthropicMessageResponse;
    const text = body.content?.find((b) => b.type === "text")?.text ?? "";
    return parseClaudeJson(text);
  } finally {
    clearTimeout(timeout);
  }
}

/** Claude is instructed to respond with raw JSON only, but it
 *  occasionally wraps the response in prose or a code fence. Strip
 *  generously and JSON.parse — fall back to a "flagged: true" defensive
 *  default if we can't parse anything sensible. */
function parseClaudeJson(raw: string): ClaudeModerationResult {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^```\s*/i, "")
    .trim();

  // Find the first { and last } so prose around the JSON is tolerated.
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // Defensive: if Claude returned garbage, treat as "flagged for
    // human review at low severity" so the message still flows but
    // gets eyes on it.
    console.warn("[moderation] could not parse Claude response, defaulting to low-severity flag");
    return { flagged: true, reason: "Moderator response unparseable", severity: "low" };
  }

  const obj = parsed as Partial<ClaudeModerationResult>;
  const flagged = obj.flagged === true;
  const severity: ClaudeSeverity =
    obj.severity === "high" || obj.severity === "medium" || obj.severity === "low"
      ? obj.severity
      : "low";
  const reason = typeof obj.reason === "string" ? obj.reason : "";
  return { flagged, reason, severity };
}
