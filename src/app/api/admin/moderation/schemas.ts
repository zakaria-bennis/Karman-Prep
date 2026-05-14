// ============================================================
// Zod schemas for /api/admin/moderation route bodies.
// ============================================================

import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const moderationActionBodySchema = z.object({
  kind: z.enum(["chat", "dm"]),
  messageId: nonEmptyString,
  // Optional admin-supplied reason. For rejects we surface it back
  // to the sender as rejection_message; defaults to a generic.
  reason: z.string().optional(),
});

// /admin/moderation/warn — issue a warning against a user, optionally
// linked to a specific triggering message.
export const moderationWarnBodySchema = z.object({
  targetUserUuid: nonEmptyString,
  reason: nonEmptyString,
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  // Optional message context — if the warning was triggered by a
  // specific flagged message, the UI passes it here so the audit row
  // captures the link.
  relatedMessageId: nonEmptyString.optional(),
  relatedMessageKind: z.enum(["chat", "dm"]).optional(),
});
