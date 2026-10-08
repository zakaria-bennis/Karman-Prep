import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: mock.from }),
}));

import { loadStudentCalendarData } from "./student-week-data";

type Result = { data: unknown[] | null; error: Error | null };
const results: Record<string, Result> = {};
const operations: Array<{ table: string; method: string; args: unknown[] }> = [];

beforeEach(() => {
  vi.clearAllMocks();
  operations.length = 0;
  Object.assign(results, {
    bookings: { data: [], error: null },
    cohort_members: { data: [], error: null },
    cohort_homework: { data: [], error: null },
    catalog_assignments: { data: [], error: null },
  });
  mock.from.mockImplementation((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "in", "gte", "lt", "order"]) {
      query[method] = (...args: unknown[]) => {
        operations.push({ table, method, args });
        return query;
      };
    }
    query.then = (resolve: (result: Result) => void, reject: (error: unknown) => void) =>
      Promise.resolve(results[table]).then(resolve, reject);
    return query;
  });
});

describe("student calendar reads", () => {
  it("uses only the student's booking, active cohort and canonical assignment identities", async () => {
    results.cohort_members = { data: [{ cohort_id: "cohort-1" }], error: null };
    results.bookings = {
      data: [
        {
          id: "booking-1",
          plan_tier: "group",
          scheduled_start: "2026-10-09T15:00:00Z",
          scheduled_end: "2026-10-09T16:00:00Z",
        },
      ],
      error: null,
    };
    results.cohort_homework = {
      data: [
        {
          id: "homework-1",
          title: "Review",
          body: null,
          assigned_at: "2026-10-08T00:00:00Z",
          due_at: null,
        },
      ],
      error: null,
    };
    results.catalog_assignments = {
      data: [
        {
          id: "assignment-1",
          title: "Math",
          catalog_skill_id: "skill-1",
          created_at: "2026-10-08T00:00:00Z",
          due_at: null,
        },
      ],
      error: null,
    };

    const feed = await loadStudentCalendarData(
      "student-uuid",
      "student-clerk-id",
      "2026-10-08T12:00:00Z"
    );
    expect(feed.sessions.items).toHaveLength(1);
    expect(feed.cohortHomework.items).toHaveLength(1);
    expect(feed.practiceAssignments.items).toHaveLength(1);
    expect(operations).toContainEqual({
      table: "bookings",
      method: "eq",
      args: ["student_id", "student-uuid"],
    });
    expect(operations).toContainEqual({
      table: "bookings",
      method: "eq",
      args: ["status", "scheduled"],
    });
    expect(operations).toContainEqual({
      table: "cohort_members",
      method: "eq",
      args: ["user_id", "student-uuid"],
    });
    expect(operations).toContainEqual({
      table: "cohort_members",
      method: "is",
      args: ["left_at", null],
    });
    expect(operations).toContainEqual({
      table: "cohort_homework",
      method: "in",
      args: ["cohort_id", ["cohort-1"]],
    });
    expect(operations).toContainEqual({
      table: "catalog_assignments",
      method: "eq",
      args: ["student_clerk_id", "student-clerk-id"],
    });
    expect(operations).toContainEqual({
      table: "catalog_assignments",
      method: "eq",
      args: ["status", "active"],
    });
  });

  it("does not read homework without an active cohort membership", async () => {
    const feed = await loadStudentCalendarData(
      "student-uuid",
      "student-clerk-id",
      "2026-10-08T12:00:00Z"
    );
    expect(feed.cohortHomework).toEqual({ state: "ready", items: [] });
    expect(mock.from).not.toHaveBeenCalledWith("cohort_homework");
  });

  it("marks an unapplied assignment table unavailable without hiding healthy sources", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    results.catalog_assignments = { data: null, error: new Error("relation unavailable") };
    const feed = await loadStudentCalendarData(
      "student-uuid",
      "student-clerk-id",
      "2026-10-08T12:00:00Z"
    );
    expect(feed.practiceAssignments).toEqual({ state: "unavailable", items: [] });
    expect(feed.sessions).toEqual({ state: "ready", items: [] });
    expect(feed.cohortHomework).toEqual({ state: "ready", items: [] });
    log.mockRestore();
  });
});
