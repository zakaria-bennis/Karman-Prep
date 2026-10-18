import {
  currentAssignmentActor,
  assignmentRelationships,
} from "@/lib/catalog-assignments/server-access";
import { assertCanManageAssignment } from "@/lib/catalog-assignments/access";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";

export class BriefingAccessError extends Error {}

/** Match the canonical practice lane: real educator identity, never a preview persona. */
export async function requireBriefingEducator(studentClerkId?: string) {
  const actor = await currentAssignmentActor();
  if (actor.role !== "tutor" && actor.role !== "admin") {
    throw new BriefingAccessError("Educator access required");
  }
  const effective = await resolveEffectiveClerkId(actor.clerkId);
  if (effective.isImpersonating || effective.clerkId !== actor.clerkId) {
    throw new BriefingAccessError("Leave account preview to view saved practice");
  }
  if (studentClerkId !== undefined) {
    try {
      await assertCanManageAssignment(actor, { studentClerkId }, assignmentRelationships);
    } catch {
      throw new BriefingAccessError("Student briefing unavailable");
    }
  }
  return actor;
}
