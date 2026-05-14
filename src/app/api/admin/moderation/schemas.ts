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
