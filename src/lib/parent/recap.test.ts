import { describe, expect, it } from "vitest";
import { buildProgressGlance } from "@/lib/progress-glance/levels";
import { recapHtml, recapLines, recapSubject, type RecapInput } from "./recap";

function input(overrides: Partial<RecapInput["week"]> = {}): RecapInput {
  return {
    childFirstName: "Maya",
    parentFirstName: "Rachel",
    portalUrl: "http://localhost:3110/dashboard/parent/x",
    weekOf: "November 8",
    week: {
      homework: {
        done: 2,
        late: 1,
        dueThisWeek: 1,
        open: [{ title: "Practice: Percentages", dueOn: "2026-11-01", late: true }],
      },
      minutesThisWeek: 74,
      upcoming: [],
      past: [],
      glance: buildProgressGlance([]),
      score: { current: 1300, history: [{ takenAt: "2026-11-02", score: 1300 }] },
      guarantee: {
        plan: "Private",
        baseline: 1190,
        target: 1290,
        gained: 110,
        needed: 100,
        met: true,
      },
      tutorNote: null,
      plan: { tier: "private", status: "active", customerId: null },
      ...overrides,
    },
  };
}

describe("weekly recap email", () => {
  it("says the week in counts", () => {
    expect(recapSubject(input())).toBe("Maya's week at Karman");
    const lines = recapLines(input());
    expect(lines).toContain("Homework: 2 of 3 done, 1 past due.");
    expect(lines).toContain("Practice: 74 minutes in the last 7 days.");
    expect(lines).toContain("Predicted score: 1300.");
    expect(lines).toContain("Score guarantee: met, +110 points.");
  });

  it("escapes names and never lists a question", () => {
    const html = recapHtml({ ...input(), childFirstName: "<b>Maya</b>" });
    expect(html).toContain("&lt;b&gt;Maya&lt;/b&gt;");
    expect(html).not.toMatch(/question_id|student_answer|is_correct/);
  });
});
