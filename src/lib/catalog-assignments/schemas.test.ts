import { describe, expect, it } from "vitest";
import { assignmentTargetSchema, createAssignmentSchema, updateAssignmentSchema } from "./schemas";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const valid = {
  requestId: a,
  studentClerkId: "synthetic-student",
  skillId: "ma-skill-linear-equations-in-one-variable",
  questionIds: [a, b],
  title: "  Linear equations  ",
  dueAt: null,
};

describe("assignment inputs", () => {
  it("accepts only catalog-scoped, distinct, bounded question IDs and trims a title", () => {
    expect(createAssignmentSchema.parse(valid).title).toBe("Linear equations");
    expect(() => createAssignmentSchema.parse({ ...valid, questionIds: [a, a] })).toThrow();
    expect(() => createAssignmentSchema.parse({ ...valid, skillId: "legacy-node" })).toThrow();
    expect(() => createAssignmentSchema.parse({ ...valid, questionIds: [] })).toThrow();
  });

  it("rejects caller-supplied educator or status fields", () => {
    expect(() => createAssignmentSchema.parse({ ...valid, educatorClerkId: "forged" })).toThrow();
    expect(() => createAssignmentSchema.parse({ ...valid, status: "active" })).toThrow();
  });

  it("requires revision checks for update and cancellation", () => {
    expect(() => assignmentTargetSchema.parse({ assignmentId: a, expectedRevision: 0 })).toThrow();
    expect(
      updateAssignmentSchema.parse({
        assignmentId: a,
        expectedRevision: 2,
        title: "Next practice",
        dueAt: null,
      }).title
    ).toBe("Next practice");
  });
});
