// ============================================================
// Zod schemas for /api/email/* route bodies.
// ============================================================

import { z } from "zod";

// POST /api/email/subscribe — public waitlist signup. Zod's
// .email() check is RFC-5322-ish and is a strict superset of the
// previous regex check, so this is at least as strict as before.
export const emailSubscribeBodySchema = z.object({
  email: z.string().email({ message: "Valid email required" }),
});
