import { describe, expect, it } from "vitest";
import { buildParentFocusSummary } from "./focus-summary";

describe("buildParentFocusSummary", () => {
  const today = "2026-10-07";

  it("uses the separately selected upcoming assignment even when it is older than the five recent posts", () => {
    expect(
      buildParentFocusSummary(
        "  Linear equations ",
        "active",
        [
          { title: "Newest review", assigned_at: "2026-10-06", due_at: "2026-10-20" },
          { title: "Review 2", assigned_at: "2026-10-05", due_at: null },
          { title: "Review 3", assigned_at: "2026-10-04", due_at: null },
          { title: "Review 4", assigned_at: "2026-10-03", due_at: null },
          { title: "Review 5", assigned_at: "2026-10-02", due_at: null },
        ],
        { title: "Due soon", assigned_at: "2026-10-01", due_at: "2026-10-09" },
        today
      )
    ).toEqual({
      focus: "Linear equations",
      nextAction: "Due soon",
      nextDueAt: "2026-10-09",
      recentAssignment: "Newest review",
    });
  });

  it("does not present past or undated assignments as upcoming commitments", () => {
    expect(
      buildParentFocusSummary(
        null,
        "active",
        [
          { title: "Past", assigned_at: "2026-10-01", due_at: "2026-10-03" },
          { title: "Undated", assigned_at: "2026-10-06", due_at: null },
        ],
        { title: "Past", assigned_at: "2026-10-01", due_at: "2026-10-03" },
        today
      )
    ).toEqual({
      focus: null,
      nextAction: null,
      nextDueAt: null,
      recentAssignment: "Undated",
    });
  });

  it("keeps empty data explicitly unknown", () => {
    expect(buildParentFocusSummary("  ", "active", [], null, today)).toEqual({
      focus: null,
      nextAction: null,
      nextDueAt: null,
      recentAssignment: null,
    });
  });

  it("does not call a completed cohort topic the current focus", () => {
    expect(buildParentFocusSummary("Old topic", "completed", [], null, today).focus).toBeNull();
  });
});
