import { describe, expect, it } from "vitest";
import { comparePracticeDomains, selectLinkedStudent, utcWeek } from "./weekly-model";

const students = [
  { id: "child-a", clerk_id: "clerk-a", first_name: "Alex", last_name: null },
  { id: "child-b", clerk_id: "clerk-b", first_name: "Bo", last_name: null },
];

describe("parent weekly view", () => {
  it("selects only an exactly linked student", () => {
    expect(selectLinkedStudent(students, undefined)?.id).toBe("child-a");
    expect(selectLinkedStudent(students, "child-b")?.id).toBe("child-b");
    expect(selectLinkedStudent(students, "other-child")).toBeNull();
    expect(selectLinkedStudent([], undefined)).toBeNull();
  });

  it("uses a nonoverlapping UTC week", () => {
    expect(utcWeek(new Date("2026-10-08T23:59:00Z"))).toEqual({
      start: "2026-10-05T00:00:00.000Z",
      end: "2026-10-12T00:00:00.000Z",
    });
  });

  it("compares only actual practice diagnostic domains", () => {
    const current = {
      algebra: 77,
      advanced_math: 72,
      geometry: 38,
      data_analysis: 64,
      info_ideas: 80,
      craft_structure: 71,
      expression_ideas: 65,
      conventions: 42,
    };
    const prior = { ...current, algebra: 71, geometry: 45 };
    const result = comparePracticeDomains(
      { taken_at: "2026-10-08T10:00:00Z", domain_scores: current },
      { domain_scores: prior }
    );
    expect(result.improving).toEqual(["Algebra"]);
    expect(result.attention).toEqual(["Geometry and Trigonometry", "Standard English Conventions"]);
    expect(comparePracticeDomains(null, null)).toEqual({
      improving: [],
      attention: [],
      diagnosticDate: null,
    });
  });
});
