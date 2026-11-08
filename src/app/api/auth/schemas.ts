// ============================================================
// Zod schemas for /api/auth route bodies.
// ============================================================

import { z } from "zod";

// `role` is optional and falls back to "student" inside the route.
// Onboarding sends "parent" when a parent signs up; before 2026-11-08 that was rejected (400), the
// page carried on to checkout, and the family never got a users row. The route still writes the
// account as "student" (no role is ever taken from the body). Admin is set out-of-band.
export const syncUserBodySchema = z.object({
  role: z.enum(["student", "parent", "tutor"]).optional(),
});
