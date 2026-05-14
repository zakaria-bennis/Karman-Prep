// ============================================================
// Zod schemas for /api/auth route bodies.
// ============================================================

import { z } from "zod";

// `role` is optional and falls back to "student" inside the route.
// The only currently-valid roles for sync are student | tutor; admin
// is set out-of-band so we don't accept it here.
export const syncUserBodySchema = z.object({
  role: z.enum(["student", "tutor"]).optional(),
});
