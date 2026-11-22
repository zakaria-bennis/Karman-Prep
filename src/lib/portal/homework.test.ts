import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { StudentHomeworkItem } from "@/lib/student/homework-model";
import { workOf } from "./homework";

const item = (over: Partial<StudentHomeworkItem>): StudentHomeworkItem => ({
  key: "k",
  source: "cohort",
  title: "Transitions practice",
  size: { questions: 8 },
  dueOn: null,
  dueAt: null,
  state: "open",
  href: "/learn/set?skill=x",
  note: null,
  from: null,
  completedAt: null,
  result: null,
  ...over,
});

describe("workOf", () => {
  it("places work that has only a due time on its Central day", () => {
    // 3 am UTC on the 24th is still the 23rd in Central
    const w = workOf(item({ dueAt: "2026-11-24T03:00:00Z" }), "2026-11-22");
    expect(w?.from).toBe(1);
    expect(w?.state).toBe("todo");
  });

  it("puts open work with no date at all on today instead of dropping it", () => {
    const w = workOf(item({}), "2026-11-22");
    expect(w?.from).toBe(0);
  });

  it("still drops done work with no date at all", () => {
    expect(workOf(item({ state: "done" }), "2026-11-22")).toBeNull();
  });
});
