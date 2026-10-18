import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import type { AssignmentActor, AssignmentRelationships, AssignmentRole } from "./access";

export async function currentAssignmentActor(): Promise<AssignmentActor> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const role = (await fetchUserRole(userId)) as AssignmentRole;
  return { clerkId: userId, role };
}

export const assignmentRelationships: AssignmentRelationships = {
  tutorHasStudent: canTutorAccessStudent,
};
