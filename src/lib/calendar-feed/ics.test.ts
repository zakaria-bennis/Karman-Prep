import { describe, expect, it } from "vitest";
import { buildIcsCalendar, escapeText, foldLine, formatUtc, type FeedCalendar } from "./ics";

const generatedAt = new Date("2026-10-26T12:00:00.000Z");

function calendar(events: FeedCalendar["events"]): string {
  return buildIcsCalendar({
    name: "Karman",
    description: "Your Karman calendar.",
    generatedAt,
    events,
  });
}

/** Undo RFC 5545 line folding so property values can be asserted whole. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

describe("escapeText", () => {
  it("escapes backslashes, semicolons, commas and every newline style", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf\rg")).toBe("a\\\\b\\;c\\,d\\ne\\nf\\ng");
  });

  it("escapes the backslash first so escapes are not doubled", () => {
    expect(escapeText(";")).toBe("\\;");
    expect(escapeText("\\;")).toBe("\\\\\\;");
  });
});

describe("formatUtc", () => {
  it("writes UTC DATE-TIME with a Z suffix and no milliseconds", () => {
    expect(formatUtc(new Date("2026-11-01T15:30:45.123Z"))).toBe("20261101T153045Z");
  });

  it("converts offset times to UTC", () => {
    expect(formatUtc(new Date("2026-11-01T09:00:00-05:00"))).toBe("20261101T140000Z");
  });

  it("rejects invalid dates", () => {
    expect(() => formatUtc(new Date("nope"))).toThrow();
  });
});

describe("foldLine", () => {
  it("leaves lines of 75 octets alone", () => {
    const line = "X".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds longer lines so no physical line passes 75 octets", () => {
    const folded = foldLine("SUMMARY:" + "a".repeat(200));
    const physical = folded.split("\r\n");
    expect(physical.length).toBeGreaterThan(1);
    for (const line of physical)
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(physical.slice(1).every((line) => line.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe("SUMMARY:" + "a".repeat(200));
  });

  it("never splits a multi-byte character", () => {
    const value = "SUMMARY:" + "é".repeat(80) + "日本語".repeat(20);
    const folded = foldLine(value);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      expect(line).not.toContain("�");
    }
    expect(folded.replace(/\r\n /g, "")).toBe(value);
  });
});

describe("buildIcsCalendar", () => {
  it("writes a valid empty calendar with CRLF endings and refresh hints", () => {
    const ics = calendar([]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const lines = unfold(ics);
    expect(lines).toContain("PRODID:-//Karman Prep//Karman Calendar//EN");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("X-WR-CALNAME:Karman");
    expect(lines).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
    expect(lines).not.toContain("BEGIN:VEVENT");
  });

  it("writes timed events in UTC with the given stable UID", () => {
    const lines = unfold(
      calendar([
        {
          kind: "timed",
          uid: "session-b1-s1@karmanprep.com",
          summary: "Karman 1:1 session with Sam",
          description: "Join on Zoom: https://zoom.us/j/1?pwd=a,b\n\nDetails in Karman",
          location: "https://zoom.us/j/1",
          url: "https://karmanprep.com/dashboard/student/schedule",
          start: new Date("2026-11-03T22:00:00.000Z"),
          end: new Date("2026-11-03T23:00:00.000Z"),
        },
      ])
    );
    expect(lines).toEqual(
      expect.arrayContaining([
        "BEGIN:VEVENT",
        "UID:session-b1-s1@karmanprep.com",
        "DTSTAMP:20261026T120000Z",
        "DTSTART:20261103T220000Z",
        "DTEND:20261103T230000Z",
        "SUMMARY:Karman 1:1 session with Sam",
        "DESCRIPTION:Join on Zoom: https://zoom.us/j/1?pwd=a\\,b\\n\\nDetails in Karman",
        "LOCATION:https://zoom.us/j/1",
        "URL:https://karmanprep.com/dashboard/student/schedule",
        "END:VEVENT",
      ])
    );
    // No floating times or TZID: every timed value is explicit UTC.
    expect(lines.filter((line) => /^DT(START|END)/.test(line)).every((l) => l.endsWith("Z"))).toBe(
      true
    );
  });

  it("writes due dates as all-day, non-blocking events ending the next day", () => {
    const lines = unfold(
      calendar([
        {
          kind: "allDay",
          uid: "homework-h1-s1@karmanprep.com",
          summary: "Homework due: Algebra; set 2, part B",
          date: "2026-12-31",
        },
      ])
    );
    expect(lines).toContain("DTSTART;VALUE=DATE:20261231");
    expect(lines).toContain("DTEND;VALUE=DATE:20270101");
    expect(lines).toContain("TRANSP:TRANSPARENT");
    expect(lines).toContain("SUMMARY:Homework due: Algebra\\; set 2\\, part B");
    expect(lines.some((line) => line.startsWith("DESCRIPTION"))).toBe(false);
  });

  it("is byte-for-byte stable for the same input", () => {
    const event = {
      kind: "timed" as const,
      uid: "session-x-y@karmanprep.com",
      summary: "Live class",
      start: new Date("2026-11-03T22:00:00Z"),
      end: new Date("2026-11-03T23:00:00Z"),
    };
    expect(calendar([event])).toBe(calendar([event]));
  });

  it("drops URL values that would break the line", () => {
    const lines = unfold(
      calendar([
        {
          kind: "allDay",
          uid: "p@karmanprep.com",
          summary: "Practice due",
          url: "https://karmanprep.com/x\r\nATTACH:evil",
          date: "2026-11-01",
        },
      ])
    );
    expect(lines.some((line) => line.startsWith("ATTACH"))).toBe(false);
    expect(lines.some((line) => line.startsWith("URL"))).toBe(false);
  });

  it("rejects malformed all-day dates", () => {
    expect(() =>
      calendar([{ kind: "allDay", uid: "u@karmanprep.com", summary: "x", date: "2026-1-1" }])
    ).toThrow();
  });
});
