// ============================================================
// Moderation pipeline — TypeScript types.
// ============================================================

/** Three-state outcome of running a message through the pipeline. */
export type ModerationOutcome =
  /** Layer 1 (keyword) matched, Layer 2 returned high severity, OR
   *  Layer 2.5 (Karman bullying classifier) flagged. Either way,
   *  the message must NOT be delivered to Slack. The
   *  rejection_message field contains the copy to show the student. */
  | {
      decision: "rejected";
      reason: string;
      rejection_message: string;
      /** "integrity" is academic dishonesty: passing answers about, or fishing for them,
       *  in place of working a question out. The caller counts these against the sender
       *  (a warning, then a pause until a tutor has looked). */
      layer: "keyword" | "ai" | "karman" | "integrity";
    }
  /** Layer 2 returned low/medium severity AND Layer 2.5 was clean.
   *  Deliver, but the message enters the human review queue and
   *  `ai_flagged=true` on the row. */
  | { decision: "approved_with_flag"; reason: string }
  /** Clean — every layer passed. Deliver normally. */
  | { decision: "approved" };

export type ClaudeSeverity = "low" | "medium" | "high";

/** Strict shape Claude is instructed to return. We `Object.assign` a
 *  default-shaped fallback if Claude wanders off-format. */
export interface ClaudeModerationResult {
  flagged: boolean;
  reason: string;
  severity: ClaudeSeverity;
}

/** Inputs a caller (chat send route) gives to moderateMessage. */
export interface ModerationInput {
  /** The message body to moderate. Empty string = no content (image-only). */
  content: string;
  /** Image URLs the student attached. Every one is sent to the Layer 2 check, every time. */
  mediaUrls: string[];
  /** Clerk user id of the sender. Logged for audit. */
  senderId: string;
  /** App-side users.id of the sender. */
  senderUuid: string;
  /** Channel id (chat_channels.id) for cohort/Q&A messages, or null
   *  for DMs (caller passes the recipient context separately). */
  channelId: string | null;
  /** chat_messages.message_type or 'direct_message'. */
  messageType: "cohort_message" | "qa_question" | "qa_answer" | "announcement" | "direct_message";
  /** The sender is the tutor here, or an admin. Two rules are for students only and are not held
   *  against staff: answer-sharing (a tutor explains answers) and contact details (a tutor shares
   *  class links). Every other rule applies to everyone. May be a promise, so the caller can look
   *  the sender up while the checks run. */
  staff?: boolean | Promise<boolean>;
}

export class ModerationError extends Error {
  constructor(
    public readonly stage: string,
    message: string,
    public readonly context?: unknown
  ) {
    super(`moderation:${stage}: ${message}`);
    this.name = "ModerationError";
  }
}
