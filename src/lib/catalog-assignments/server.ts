import type { CatalogQuestionBinding } from "@/lib/catalog-practice/delivery-contract";
import { CatalogAssignmentService, type AssignmentRecord } from "./service";
import { catalogAssignmentSelection, type SelectedAssignmentQuestion } from "./selection";
import { catalogAssignmentStore } from "./store";
import { assignmentRelationships, currentAssignmentActor } from "./server-access";

export const catalogAssignmentService = new CatalogAssignmentService(
  catalogAssignmentStore,
  catalogAssignmentSelection,
  assignmentRelationships
);

/** This is the only student-facing projection; it omits answer/key snapshots. */
export function assignmentSummary(record: AssignmentRecord<SelectedAssignmentQuestion>) {
  return {
    id: record.id,
    studentClerkId: record.studentClerkId,
    skillId: record.skillId,
    title: record.title,
    dueAt: record.dueAt,
    status: record.status,
    revision: record.revision,
    questionCount: record.questionIds.length,
  };
}

/** Practice start calls this; caller identity is checked again at this boundary. */
export async function loadActiveAssignmentBindings(
  assignmentId: string,
  studentClerkId: string
): Promise<CatalogQuestionBinding[]> {
  return (await loadActiveAssignment(assignmentId, studentClerkId)).items;
}

/** Practice's server-only loader also binds the requested skill to the assignment. */
export async function loadActiveAssignment(
  assignmentId: string,
  studentClerkId: string
): Promise<{ skillId: string; items: CatalogQuestionBinding[] }> {
  const actor = await currentAssignmentActor();
  if (actor.role !== "student" || actor.clerkId !== studentClerkId) {
    throw new Error("Student assignment access required");
  }
  const record = await catalogAssignmentService.activeForStudent(actor, assignmentId);
  return {
    skillId: record.skillId,
    items: record.deliveries.map((delivery) => delivery.snapshot.binding),
  };
}
