// ============================================================
// Zod schemas for /api/email/* route bodies.
// ============================================================

import { z } from "zod";
import { LEAD_SOURCES } from "@/lib/marketing/offer";

// POST /api/email/subscribe — public lead capture (coming-soon notify,
// newsletter, free practice test registration, program interest).
// Zod's .email() check is RFC-5322-ish and is a strict superset of the
// previous regex check, so this is at least as strict as before.
// `source` defaults to "newsletter" so older clients keep working.
export const emailSubscribeBodySchema = z.object({
  email: z.string().trim().email({ message: "Valid email required" }),
  source: z.enum(LEAD_SOURCES).default("newsletter"),
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["student", "parent"]).optional(),
});
