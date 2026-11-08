import { describe, expect, it } from "vitest";
import { sortFeedEvents, studentFeedEvents, type StudentFeedRows } from "./events";

const site = "https://karmanprep.com";

function rows(overrides: Partial<StudentFeedRows> = {}): StudentFeedRows {
  return {
    studentId: "stu-1",
    studentLabel: null,
    timeZone: "America/New_York",
    bookings: [],
    homework: [],
    practice: [],
    ...overrides,
  };
}

describe("studentFeedEvents", () => {
  it("titles 1:1 sessions and live classes by plan tier, with stable UIDs", () => {
    const events = studentFeedEvents(
      rows({
        bookings: [
          {
            id: "b1",
            plan_tier: "private",
            scheduled_start: "2026-11-03T22:00:00Z",
            scheduled_end: "2026-11-03T23:00:00Z",
            zoom_join_url: "https://zoom.us/j/1",
            tutor_name: "Sam",
          },
          {
            id: "b2",
            plan_tier: "group",
            scheduled_start: "2026-11-04T22:00:00Z",
            scheduled_end: "2026-11-04T23:30:00Z",
            zoom_join_url: null,
            tutor_name: null,
          },
          {
            id: "b3",
            plan_tier: "small_group",
            scheduled_start: "2026-11-05T22:00:00Z",
            scheduled_end: "2026-11-05T23:00:00Z",
            zoom_join_url: null,
            tutor_name: "Ana",
          },
        ],
      }),
      site
    );
    expect(events.map((e) => [e.uid, e.summary])).toEqual([
      ["session-b1-stu-1@karmanprep.com", "Karman 1:1 session with Sam"],
      ["session-b2-stu-1@karmanprep.com", "Karman live class"],
      ["session-b3-stu-1@karmanprep.com", "Karman small-group class with Ana"],
    ]);
    const first = events[0];
    expect(first.kind).toBe("timed");
    if (first.kind === "timed") {
      expect(first.location).toBe("https://zoom.us/j/1");
      expect(first.description).toContain("Join on Zoom: https://zoom.us/j/1");
      expect(first.url).toBe("https://karmanprep.com/dashboard/student/schedule");
    }
  });

  it("skips bookings with impossible times", () => {
    const events = studentFeedEvents(
      rows({
        bookings: [
          {
            id: "bad",
            plan_tier: "private",
            scheduled_start: "2026-11-03T23:00:00Z",
            scheduled_end: "2026-11-03T22:00:00Z",
            zoom_join_url: null,
            tutor_name: null,
          },
        ],
      }),
      site
    );
    expect(events).toEqual([]);
  });

  it("puts due dates on the learner's local day, not the UTC day", () => {
    // 02:30 UTC on Nov 4 is still Nov 3 in New York.
    const [event] = studentFeedEvents(
      rows({
        homework: [
          {
            id: "h1",
            title: "Reading set 4",
            body: "Pages 10 to 12",
            due_at: "2026-11-04T02:30:00Z",
            context: "Fall cohort",
            href: null,
          },
        ],
      }),
      site
    );
    expect(event).toMatchObject({
      kind: "allDay",
      uid: "homework-h1-stu-1@karmanprep.com",
      summary: "Homework due: Reading set 4",
      date: "2026-11-03",
      url: null,
    });
    expect(event.description).toBe("Due at 9:30 PM EST · Fall cohort\n\nPages 10 to 12");
  });

  it("links assigned practice to the practice page", () => {
    const [event] = studentFeedEvents(
      rows({
        timeZone: "UTC",
        practice: [
          {
            id: "p1",
            title: "Linear equations",
            body: null,
            due_at: "2026-11-10T17:00:00Z",
            context: null,
            href: "/learn/practice/math-linear?assignment=p1",
          },
        ],
      }),
      site
    );
    expect(event).toMatchObject({
      uid: "practice-p1-stu-1@karmanprep.com",
      summary: "Practice due: Linear equations",
      date: "2026-11-10",
      url: "https://karmanprep.com/learn/practice/math-linear?assignment=p1",
    });
  });

  it("prefixes titles with the student's name in a parent's feed", () => {
    const [event] = studentFeedEvents(
      rows({
        studentLabel: "Maya",
        bookings: [
          {
            id: "b1",
            plan_tier: "elite",
            scheduled_start: "2026-11-03T22:00:00Z",
            scheduled_end: "2026-11-03T23:00:00Z",
            zoom_join_url: null,
            tutor_name: null,
          },
        ],
      }),
      site
    );
    expect(event.summary).toBe("Maya: Karman 1:1 session");
  });
});

describe("sortFeedEvents", () => {
  it("orders by time, then UID, without mutating the input", () => {
    const input = [
      { kind: "allDay" as const, uid: "b", summary: "b", date: "2026-11-02" },
      {
        kind: "timed" as const,
        uid: "c",
        summary: "c",
        start: new Date("2026-11-01T10:00:00Z"),
        end: new Date("2026-11-01T11:00:00Z"),
      },
      { kind: "allDay" as const, uid: "a", summary: "a", date: "2026-11-02" },
    ];
    expect(sortFeedEvents(input).map((e) => e.uid)).toEqual(["c", "a", "b"]);
    expect(input.map((e) => e.uid)).toEqual(["b", "c", "a"]);
  });
});
