// ============================================================
// .ics calendar invite builder for booking emails.
//
// Uses ical-generator 10.x. Stable UID per booking (cal_booking_uid)
// so REQUEST/CANCEL with the same UID updates the same calendar
// event in mail clients instead of creating duplicates.
// ============================================================

import ical, { ICalCalendarMethod } from "ical-generator";

export interface BookingIcsInput {
  /** Stable identifier — use cal_booking_uid so reschedules/cancels
   *  update the existing event in the recipient's calendar. */
  uid: string;
  studentName: string;
  tutorName: string;
  start: Date;
  end: Date;
  meetingUrl?: string | null;
  organizerEmail: string;
  organizerName?: string;
}

export type IcsMethod = "REQUEST" | "CANCEL";

export function buildBookingIcs(input: BookingIcsInput, method: IcsMethod): string {
  const cal = ical({
    name: "Strata SAT Prep",
    prodId: { company: "Strata", product: "Strata Booking", language: "EN" },
  });

  cal.method(method === "CANCEL" ? ICalCalendarMethod.CANCEL : ICalCalendarMethod.REQUEST);

  // Per spec: "StudentFirstName StudentLastName / TutorFirstName TutorLastName — SAT Prep Session"
  const summary = `${input.studentName} / ${input.tutorName} — SAT Prep Session`;

  cal.createEvent({
    id: input.uid,
    start: input.start,
    end: input.end,
    summary,
    location: input.meetingUrl ?? undefined,
    description: input.meetingUrl ? `Join: ${input.meetingUrl}` : undefined,
    organizer: {
      name: input.organizerName ?? "Strata",
      email: input.organizerEmail,
    },
  });

  return cal.toString();
}
