export type AssignmentRole = "student" | "parent" | "tutor" | "admin" | null;

export interface AssignmentActor {
  clerkId: string;
  role: AssignmentRole;
}

export interface AssignmentTarget {
  studentClerkId: string;
}

export interface AssignmentRelationships {
  tutorHasStudent(tutorClerkId: string, studentClerkId: string): Promise<boolean>;
}

/** Service-role database access must follow this relationship check, never precede it. */
export async function assertCanManageAssignment(
  actor: AssignmentActor,
  target: AssignmentTarget,
  relationships: AssignmentRelationships
): Promise<void> {
  if (actor.role === "admin") return;
  if (
    actor.role !== "tutor" ||
    !(await relationships.tutorHasStudent(actor.clerkId, target.studentClerkId))
  ) {
    throw new Error("Assignment access denied");
  }
}

/** Students can see only their own assignment; educators need a current relationship. */
export async function assertCanReadAssignment(
  actor: AssignmentActor,
  target: AssignmentTarget,
  relationships: AssignmentRelationships
): Promise<void> {
  if (actor.role === "student" && actor.clerkId === target.studentClerkId) return;
  await assertCanManageAssignment(actor, target, relationships);
}
