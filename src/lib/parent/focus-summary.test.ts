import { describe, expect, it } from "vitest";
import { buildParentFocusSummary } from "./focus-summary";

describe("buildParentFocusSummary", () => {
  const today = "2026-10-07";

  it("uses the nearest upcoming assignment and the latest posted assignment", () => {
    expect(
      buildParentFocusSummary(
        "  Linear equations ",
        [
          { title: "Newer review", assigned_at: "2026-10-06", due_at: "2026-10-20" },
          { title: "Due soon", assigned_at: "2026-10-01", due_at: "2026-10-09" },
        ],
        today
      )
    ).toEqual({
      focus: "Linear equations",
      nextAction: "Due soon",
      nextDueAt: "2026-10-09",
      recentAssignment: "Newer review",
    });
  });

  it("does not present past or undated assignments as upcoming commitments", () => {
    expect(
      buildParentFocusSummary(
        null,
        [
          { title: "Past", assigned_at: "2026-10-01", due_at: "2026-10-03" },
          { title: "Undated", assigned_at: "2026-10-06", due_at: null },
        ],
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
    expect(buildParentFocusSummary("  ", [], today)).toEqual({
      focus: null,
      nextAction: null,
      nextDueAt: null,
      recentAssignment: null,
    });
  });
});
