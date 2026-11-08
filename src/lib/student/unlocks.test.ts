import { describe, expect, it } from "vitest";
import {
  assignmentState,
  canStart,
  nextAssignment,
  spacingWarning,
  withOverrides,
  type Assignment,
} from "./unlocks";

const now = Date.parse("2026-10-27T15:00:00Z");
const a = (over: Partial<Assignment>): Assignment => ({
  id: "x",
  kind: "time_trial",
  section: "math",
  title: "Math Time Trial",
  scheduledFor: "2026-10-29",
  unlockedAt: null,
  completedAt: null,
  tutor: "David",
  ...over,
});

describe("assignmentState", () => {
  it("is scheduled until the tutor opens it", () => {
    expect(assignmentState(a({}), now)).toBe("scheduled");
    expect(canStart(a({}), now)).toBe(false);
  });
  it("opens when unlocked, and only once", () => {
    const open = a({ unlockedAt: "2026-10-27T10:00:00Z" });
    expect(canStart(open, now)).toBe(true);
    expect(assignmentState({ ...open, completedAt: "2026-10-27T12:00:00Z" }, now)).toBe("done");
  });
  it("stays locked for a future unlock time", () => {
    expect(canStart(a({ unlockedAt: "2026-10-30T10:00:00Z" }), now)).toBe(false);
  });
  it("is locked with no schedule", () => {
    expect(assignmentState(a({ scheduledFor: "" }), now)).toBe("locked");
  });
});

describe("spacingWarning", () => {
  it("warns when the last full-length exam was under 14 days ago", () => {
    const done = a({
      id: "d",
      kind: "full_length",
      section: null,
      completedAt: "2026-10-20T15:00:00Z",
    });
    const next = a({ id: "n", kind: "full_length", section: null });
    expect(spacingWarning(next, [done, next], now)).toBe(
      "Last one was 7 days ago. We suggest waiting 7 more days."
    );
  });
  it("is quiet once the gap has passed, and per section for trials", () => {
    const done = a({ id: "d", completedAt: "2026-10-20T15:00:00Z" });
    expect(spacingWarning(a({ id: "n" }), [done], now)).toBeNull();
    const other = a({ id: "r", section: "reading", completedAt: "2026-10-27T10:00:00Z" });
    expect(spacingWarning(a({ id: "n" }), [other], now)).toBeNull();
  });
});

describe("nextAssignment", () => {
  it("prefers an open item, then the earliest scheduled", () => {
    const later = a({ id: "1", scheduledFor: "2026-11-03" });
    const sooner = a({ id: "2", scheduledFor: "2026-10-29" });
    expect(nextAssignment([later, sooner], "time_trial", "math", now)?.id).toBe("2");
    const open = a({ id: "3", scheduledFor: "2026-11-10", unlockedAt: "2026-10-27T00:00:00Z" });
    expect(nextAssignment([later, sooner, open], "time_trial", "math", now)?.id).toBe("3");
  });
});

describe("withOverrides", () => {
  it("applies preview unlocks and completions", () => {
    const [x] = withOverrides([a({})], { x: "2026-10-27T00:00:00Z" }, {});
    expect(canStart(x, now)).toBe(true);
  });
});
