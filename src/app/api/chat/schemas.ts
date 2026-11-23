// ============================================================
// Zod schemas for chat API route bodies.
//
// Route handlers parse req.json() through these before doing
// any auth checks or DB writes. Compile-time TS types on
// Partial<Request> shapes don't protect against a malformed
// client (or curl) — these schemas do.
// ============================================================

import { z } from "zod";
import { isChatMediaUrl, MAX_PICTURES } from "@/lib/chat/media";
import { MESSAGE_MAX, REACTIONS, sharedQuestionSchema } from "@/lib/chat/shared";

const nonEmptyString = z.string().min(1);

// ── chat/send ─────────────────────────────────────────────

// A picture must be one the sender uploaded to Karman's own chat-media bucket; no other address
// is accepted (see src/lib/chat/media.ts for why).
const pictures = z
  .array(
    z.string().refine((url) => isChatMediaUrl(url), {
      message: "Pictures must be uploaded through chat",
    })
  )
  .max(MAX_PICTURES)
  .optional();

const chatMessageTypeSchema = z.enum([
  "cohort_message",
  "qa_question",
  "qa_answer",
  "announcement",
]);

/** A message needs words, a picture or a question. */
const hasBody = (d: { content?: string; mediaUrls?: string[]; question?: unknown }) =>
  (!!d.content && d.content.length > 0) ||
  (!!d.mediaUrls && d.mediaUrls.length > 0) ||
  !!d.question;

export const sendMessageBodySchema = z
  .object({
    channelId: nonEmptyString,
    content: z.string().max(MESSAGE_MAX).optional(),
    mediaUrls: pictures,
    isAnonymous: z.boolean().optional(),
    messageType: chatMessageTypeSchema,
    parentMessageId: z.string().optional(),
    question: sharedQuestionSchema.optional(),
  })
  .refine(hasBody, {
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
    content: z.string().max(MESSAGE_MAX).optional(),
    mediaUrls: pictures,
    parentMessageId: z.string().uuid().optional(),
    question: sharedQuestionSchema.optional(),
  })
  .refine(hasBody, {
    message: "Message must have content or at least one image",
    path: ["content"],
  });

// ── chat/react ────────────────────────────────────────────

export const reactBodySchema = z.object({
  kind: z.enum(["channel", "dm"]),
  messageId: z.string().uuid(),
  /** Null takes the reaction back. */
  reaction: z.enum(REACTIONS).nullable(),
});

// ── chat/read ─────────────────────────────────────────────

export const readChannelBodySchema = z.object({
  channelId: z.string().uuid(),
  scope: z.enum(["chat", "announcements"]),
});

// ── chat/presence ─────────────────────────────────────────

const place = z.union([
  z.object({ channelId: z.string().uuid() }),
  z.object({ withClerkId: nonEmptyString }),
]);
export const presenceBodySchema = z.object({
  /** Where the caller is typing right now, if anywhere. */
  typing: place.nullable().optional(),
  /** The chat the caller has open: who is typing there is sent back. */
  watch: place.nullable().optional(),
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
