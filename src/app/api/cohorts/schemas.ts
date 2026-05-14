// ============================================================
// Zod schemas for /api/cohorts/* route bodies.
// ============================================================

import { z } from "zod";

// POST /api/cohorts/provision — admin re-provisions a cohort's
// Slack channels. Idempotent on the route side.
export const provisionCohortBodySchema = z.object({
  cohortId: z.string().min(1),
});
