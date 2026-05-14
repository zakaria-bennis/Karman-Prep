// ============================================================
// Zod schemas for /api/attendance/* route bodies.
// ============================================================

import { z } from "zod";

const nonEmptyString = z.string().min(1);

// POST /api/attendance/override — tutor/admin manually flips a
// student's attendance for a booking. `reason` is a hard
// requirement; we want an audit trail on every override.
export const attendanceOverrideBodySchema = z.object({
  bookingId: nonEmptyString,
  studentClerkId: nonEmptyString,
  overrideValue: z.boolean(),
  reason: nonEmptyString,
});
