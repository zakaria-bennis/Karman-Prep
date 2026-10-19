import { describe, expect, it } from "vitest";
import { learningPlanCopy, studentLessonLabel } from "./copy";

describe("learning plan wording", () => {
  it("distinguishes an in-progress lesson from an available one", () => {
    expect(studentLessonLabel("in_progress")).toBe("Continue this lesson");
    expect(studentLessonLabel("available")).toBe("Available lesson");
  });

  it("distinguishes a tutor plan from an assignment posted for a family", () => {
    expect(learningPlanCopy.tutorPracticeField).toContain("plan");
    expect(learningPlanCopy.parentUpcomingLabel).toContain("posted");
    expect(learningPlanCopy.parentEvidenceNote).toContain("not assignment completion");
  });
});
