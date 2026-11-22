// What the booking endpoints say. Every answer meant for a person is one short plain sentence in
// `error`, which the Schedule tab and the tutor's schedule show as it is.
import { NextResponse } from "next/server";
import { CalAdapterError } from "@/lib/integrations/cal";
import { BOOKING, CALENDAR_LENGTH, type Refusal } from "@/lib/bookings/rules";

export const say = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

export const refuse = (r: Refusal) =>
  NextResponse.json({ error: r.message, why: r.why }, { status: r.status });

export const SAY = {
  signIn: "Please sign in again.",
  body: "Something in that request was missing. Please try again.",
  account: "Your account could not be found. Please sign in again.",
  notFound: "That session could not be found.",
  forbidden: "Only you or your tutor can change this session.",
  busy: "Another change is going through. Please wait a few seconds.",
  broke: "Something went wrong. Please try again.",
  tutorOnly: "Message your tutor to change this session.",
  noCalendar: "This session cannot be changed here. Message your tutor.",
} as const;

/** A session that is no longer booked. */
export const already = (status: string) =>
  say(409, `That session is already ${status === "cancelled" ? "canceled" : "over"}.`);

/** What a refusal from the tutor's calendar (Cal.com) means for the person. */
export function calSays(err: unknown, action: "book" | "move" | "cancel", minutes?: number) {
  const status = err instanceof CalAdapterError ? err.statusCode : 0;
  const text = err instanceof CalAdapterError ? JSON.stringify(err.body ?? "").toLowerCase() : "";
  const refused = status >= 400 && status < 500;
  if (refused && minutes && minutes !== BOOKING.plainMinutes && text.includes("length"))
    return say(422, CALENDAR_LENGTH);
  if (refused && action !== "cancel")
    return say(409, "That time is no longer open. Please pick another.");
  const what = action === "book" ? "booking" : action;
  return say(502, `The ${what} did not go through. Please try again in a minute.`);
}
