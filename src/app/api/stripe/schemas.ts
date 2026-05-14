// ============================================================
// Zod schemas for /api/stripe/* route bodies.
// ============================================================

import { z } from "zod";

// POST /api/stripe/portal — body is optional. If present and
// `action === "cancel"`, the route cancels the subscription;
// otherwise it opens the customer portal. Anything else is
// treated as the default flow, so the schema accepts any string.
export const stripePortalBodySchema = z.object({
  action: z.string().optional(),
});
