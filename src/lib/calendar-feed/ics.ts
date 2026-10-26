// ============================================================
// iCalendar (RFC 5545) serializer for the subscribed calendar feed.
//
// Pure and dependency-free so the exact bytes are unit-tested:
// CRLF line endings, 75-octet line folding, TEXT escaping, UTC
// times for timed events and VALUE=DATE for all-day due dates.
// ============================================================

export interface TimedFeedEvent {
  kind: "timed";
  /** Globally unique and stable across fetches, so calendars update in place. */
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  start: Date;
  end: Date;
}

export interface AllDayFeedEvent {
  kind: "allDay";
  uid: string;
  summary: string;
  description?: string | null;
  url?: string | null;
  /** Calendar day in the learner's own time zone, YYYY-MM-DD. */
  date: string;
}

export type FeedEvent = TimedFeedEvent | AllDayFeedEvent;

export interface FeedCalendar {
  name: string;
  description: string;
  /** DTSTAMP for every event. Pass a fixed value in tests. */
  generatedAt: Date;
  events: FeedEvent[];
}

const PRODID = "-//Karman Prep//Karman Calendar//EN";
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** RFC 5545 §3.3.11: escape backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** UTC DATE-TIME form, e.g. 20261101T153000Z. */
export function formatUtc(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid event time");
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function formatDate(day: string): string {
  if (!DATE_KEY.test(day)) throw new Error("Invalid all-day date");
  return day.replace(/-/g, "");
}

function nextDay(day: string): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** RFC 5545 §3.1: fold lines longer than 75 octets, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      // Continuation lines start with one space, which counts toward the 75.
      limit = 74;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function textProp(name: string, value: string | null | undefined): string[] {
  return value ? [`${name}:${escapeText(value)}`] : [];
}

function uriProp(name: string, value: string | null | undefined): string[] {
  // URI values are not TEXT-escaped, but must not break the line.
  return value && !/[\r\n]/.test(value) ? [`${name}:${value}`] : [];
}

function eventLines(event: FeedEvent, stamp: string): string[] {
  const timing =
    event.kind === "timed"
      ? [`DTSTART:${formatUtc(event.start)}`, `DTEND:${formatUtc(event.end)}`]
      : [
          `DTSTART;VALUE=DATE:${formatDate(event.date)}`,
          `DTEND;VALUE=DATE:${formatDate(nextDay(event.date))}`,
          // Due dates should not block time in the student's day.
          "TRANSP:TRANSPARENT",
        ];
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    ...timing,
    `SUMMARY:${escapeText(event.summary)}`,
    ...textProp("DESCRIPTION", event.description),
    ...(event.kind === "timed" ? textProp("LOCATION", event.location) : []),
    ...uriProp("URL", event.url),
    "END:VEVENT",
  ];
}

export function buildIcsCalendar(calendar: FeedCalendar): string {
  const stamp = formatUtc(calendar.generatedAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    `X-WR-CALDESC:${escapeText(calendar.description)}`,
    // Ask subscribing apps to refresh hourly (Google and Apple treat this as a hint).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...calendar.events.flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
