import { describe, expect, it } from "vitest";
import {
  buildCalendarWeek,
  dateKeyAt,
  resolveCalendarTimeZone,
  type StudentCalendarData,
} from "./week-calendar";

const empty: StudentCalendarData = {
  sessions: { state: "ready", items: [] },
  cohortHomework: { state: "ready", items: [] },
  practiceAssignments: { state: "ready", items: [] },
};

describe("student calendar projection", () => {
  it("keeps both fall-back clock instants on the same local day without merging sessions", () => {
    const week = buildCalendarWeek(
      {
        ...empty,
        sessions: {
          state: "ready",
          items: [
            {
              id: "first-130",
              plan_tier: "group",
              scheduled_start: "2026-11-01T05:30:00Z",
              scheduled_end: "2026-11-01T06:30:00Z",
            },
            {
              id: "second-130",
              plan_tier: "small_group",
              scheduled_start: "2026-11-01T06:30:00Z",
              scheduled_end: "2026-11-01T07:30:00Z",
            },
          ],
        },
      },
      "2026-11-01T05:10:00Z",
      "America/New_York"
    );
    expect(week.days.map((day) => day.key)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
    expect(week.days[0].items.map((item) => item.id)).toEqual([
      "session:first-130",
      "session:second-130",
    ]);
    expect(week.days[0].items.map((item) => item.title)).toEqual([
      "Seminar session",
      "Small-group session",
    ]);
    expect(week.days[0].items[0].href).toBe("/dashboard/student/schedule");
    expect(week.days[0].items[1].href).toBeNull();
  });

  it("sorts real due dates, separates undated posts, and never infers completion", () => {
    const week = buildCalendarWeek(
      {
        ...empty,
        cohortHomework: {
          state: "ready",
          items: [
            {
              id: "due-later",
              title: "Reading set",
              body: "Use the tutor notes",
              assigned_at: "2026-10-07T12:00:00Z",
              due_at: "2026-10-10T15:00:00Z",
            },
            {
              id: "undated",
              title: "Optional review",
              body: null,
              assigned_at: "2026-10-08T12:00:00Z",
              due_at: null,
            },
          ],
        },
        practiceAssignments: {
          state: "ready",
          items: [
            {
              id: "assignment-1",
              title: "Linear equations",
              catalog_skill_id: "algebra-linear-equations",
              created_at: "2026-10-07T13:00:00Z",
              due_at: "2026-10-08T17:00:00Z",
            },
            {
              id: "earlier",
              title: "Earlier assignment",
              catalog_skill_id: "algebra-linear-equations",
              created_at: "2026-10-01T13:00:00Z",
              due_at: "2026-10-06T17:00:00Z",
            },
          ],
        },
      },
      "2026-10-08T14:00:00Z",
      "America/Chicago"
    );
    expect(week.days[0].items).toMatchObject([
      {
        id: "practice:assignment-1",
        sourceLabel: "Practice posted by your educator",
        href: "/learn/practice/algebra-linear-equations?assignment=assignment-1",
      },
    ]);
    expect(week.days[2].items).toMatchObject([{ id: "cohort:due-later", href: null }]);
    expect(week.undated.map((item) => item.id)).toEqual(["cohort:undated"]);
    expect(week.earlierDue.map((item) => item.id)).toEqual(["practice:earlier"]);
    expect(week.earlierDue[0]).not.toHaveProperty("completed");
  });

  it("distinguishes unavailable sources from a confirmed empty week", () => {
    const emptyWeek = buildCalendarWeek(empty, "2026-10-08T14:00:00Z", "UTC");
    expect(emptyWeek.unavailableSources).toEqual([]);
    const partial = buildCalendarWeek(
      { ...empty, practiceAssignments: { state: "unavailable", items: [] } },
      "2026-10-08T14:00:00Z",
      "UTC"
    );
    expect(partial.unavailableSources).toEqual(["assigned practice"]);
  });

  it("uses an IANA account zone or an explicit device/UTC fallback", () => {
    expect(resolveCalendarTimeZone("America/Chicago", "Europe/London")).toBe("America/Chicago");
    expect(resolveCalendarTimeZone("bad-zone", "Europe/London")).toBe("Europe/London");
    expect(resolveCalendarTimeZone(null)).toBe("UTC");
    expect(dateKeyAt("2026-10-08T01:30:00Z", "America/Chicago")).toBe("2026-10-07");
  });
});
