// ============================================================
// Zod schemas for chat API route bodies.
//
// Route handlers parse req.json() through these before doing
// any auth checks or DB writes. Compile-time TS types on
// Partial<Request> shapes don't protect against a malformed
// client (or curl) — these schemas do.
// ============================================================

import { z } from "zod";

const nonEmptyString = z.string().min(1);

// ── chat/send ─────────────────────────────────────────────

const chatMessageTypeSchema = z.enum(["cohort_message", "qa_question", "qa_answer"]);

export const sendMessageBodySchema = z
  .object({
    channelId: nonEmptyString,
    content: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    isAnonymous: z.boolean().optional(),
    messageType: chatMessageTypeSchema,
    parentMessageId: z.string().optional(),
  })
  .refine((d) => (d.content && d.content.length > 0) || (d.mediaUrls && d.mediaUrls.length > 0), {
    message: "Message must have content or at least one image",
    path: ["content"],
  })
  .refine((d) => d.messageType !== "qa_answer" || !!d.parentMessageId, {
    message: "qa_answer requires parentMessageId",
    path: ["parentMessageId"],
  });

// ── chat/dm ───────────────────────────────────────────────

export const sendDmBodySchema = z
  .object({
    recipientId: nonEmptyString,
    content: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
  })
  .refine((d) => (d.content && d.content.length > 0) || (d.mediaUrls && d.mediaUrls.length > 0), {
    message: "Message must have content or at least one image",
    path: ["content"],
  });

// ── chat/dm/read ──────────────────────────────────────────

export const readDmBodySchema = z.object({
  withClerkId: nonEmptyString,
});

// ── chat/pin ──────────────────────────────────────────────

export const pinMessageBodySchema = z.object({
  messageId: nonEmptyString,
  pinned: z.boolean(),
});

// ── chat/highlight ────────────────────────────────────────

export const highlightMessageBodySchema = z.object({
  messageId: nonEmptyString,
  highlighted: z.boolean(),
});
