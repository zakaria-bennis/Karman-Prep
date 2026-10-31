"use server";

import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { catalogPoolInputSchema } from "@/lib/question-bank/catalog-question-scope";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";

/** Read-only pool preview. Starting/saving a canonical attempt is a separate scoped lane. */
export async function actionCatalogPracticePool(input: unknown) {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new Error("Student access required");
  }
  const scope = catalogPoolInputSchema.parse(input);
  return (await fetchCatalogQuestionPool(scope)).map(toStudentQuizQuestion);
}

/** Preview only; creates no assignment, email or learner record. */
export async function actionCatalogAssignmentPool(input: unknown) {
  const { userId } = await safeAuth();
  const parsed = z
    .object({
      studentId: z.string().trim().min(1).max(200),
      scope: catalogPoolInputSchema,
    })
    .strict()
    .parse(input);
  if (!userId || !(await canTutorAccessStudent(userId, parsed.studentId))) {
    throw new Error("Assigned tutor access required");
  }
  return (await fetchCatalogQuestionPool(parsed.scope)).map(toStudentQuizQuestion);
}
