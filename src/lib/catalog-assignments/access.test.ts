import { describe, expect, it, vi } from "vitest";
import {
  assertCanManageAssignment,
  assertCanReadAssignment,
  type AssignmentRelationships,
} from "./access";

const target = { studentClerkId: "student-a" };
const assigned: AssignmentRelationships = { tutorHasStudent: vi.fn(async () => true) };
const unassigned: AssignmentRelationships = { tutorHasStudent: vi.fn(async () => false) };

describe("canonical assignment access", () => {
  it("lets an assigned educator manage and denies an unassigned or revoked educator", async () => {
    const tutor = { clerkId: "tutor-a", role: "tutor" as const };
    await expect(assertCanManageAssignment(tutor, target, assigned)).resolves.toBeUndefined();
    await expect(assertCanManageAssignment(tutor, target, unassigned)).rejects.toThrow(
      "Assignment access denied"
    );
  });

  it("denies student, parent, and pending roles from managing another student's plan", async () => {
    for (const role of ["student", "parent", null] as const) {
      await expect(
        assertCanManageAssignment({ clerkId: "other", role }, target, assigned)
      ).rejects.toThrow("Assignment access denied");
    }
  });

  it("allows the student only to read their own plan", async () => {
    await expect(
      assertCanReadAssignment({ clerkId: "student-a", role: "student" }, target, unassigned)
    ).resolves.toBeUndefined();
    await expect(
      assertCanReadAssignment({ clerkId: "student-b", role: "student" }, target, assigned)
    ).rejects.toThrow("Assignment access denied");
  });

  it("allows an admin but keeps a parent outside this assignment read path", async () => {
    await expect(
      assertCanReadAssignment({ clerkId: "admin-a", role: "admin" }, target, unassigned)
    ).resolves.toBeUndefined();
    await expect(
      assertCanReadAssignment({ clerkId: "parent-a", role: "parent" }, target, assigned)
    ).rejects.toThrow("Assignment access denied");
  });
});
