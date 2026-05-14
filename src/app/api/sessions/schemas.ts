// ============================================================
// Zod schemas for /api/sessions/* route bodies.
// ============================================================

import { z } from "zod";

const nonEmptyString = z.string().min(1);

// POST /api/sessions/push — admin pushes a single seminar /
// small-group session to a cohort. Start/end are ISO 8601 datetimes;
// zoomJoinUrl is required (the route falls back to extracting the
// meeting id from the URL if zoomMeetingId is absent).
export const pushSessionBodySchema = z.object({
  cohortId: nonEmptyString,
  sessionStart: z.string().datetime({ message: "sessionStart must be ISO 8601 datetime" }),
  sessionEnd: z.string().datetime({ message: "sessionEnd must be ISO 8601 datetime" }),
  zoomMeetingId: nonEmptyString.optional(),
  zoomJoinUrl: nonEmptyString,
  zoomStartUrl: nonEmptyString.optional(),
  timeZone: nonEmptyString.optional(),
});
