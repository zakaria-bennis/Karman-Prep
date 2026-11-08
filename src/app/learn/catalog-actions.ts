"use server";

import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { catalogPoolInputSchema } from "@/lib/question-bank/catalog-question-scope";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import { difficultyRangeFor, getPlan } from "@/lib/plans";

/** Read-only pool preview. Starting/saving a canonical attempt is a separate scoped lane.
 *  The student's plan decides the pool on the server (src/lib/plans): core plans (Free,
 *  Practice, school and tutor-code students) see difficulty 1 to 5, and a skill with no
 *  core questions serves its easiest rows instead; Pro and up see every question. */
export async function actionCatalogPracticePool(input: unknown) {
  const { userId } = await safeAuth();
  const role = userId ? await fetchUserRole(userId) : null;
  if (!userId || !["student", "admin"].includes(role ?? "")) {
    throw new Error("Student access required");
  }
  const scope = catalogPoolInputSchema.parse(input);
  if (role === "admin") return (await fetchCatalogQuestionPool(scope)).map(toStudentQuizQuestion);

  const plan = await getPlan(userId);
  const cap = difficultyRangeFor(plan).maximumDifficulty;
  const rows =
    scope.minimumDifficulty <= cap
      ? await fetchCatalogQuestionPool({
          ...scope,
          maximumDifficulty: Math.min(scope.maximumDifficulty, cap),
        })
      : [];
  if (rows.length > 0 || plan.entitlements.pool === "mastery") {
    return rows.map(toStudentQuizQuestion);
  }
  // Core must cover every skill: no core rows here, so serve the skill's easiest ones.
  const all = await fetchCatalogQuestionPool({
    ...scope,
    minimumDifficulty: 1,
    maximumDifficulty: 7,
  });
  const easiest = Math.min(...all.map((q) => q.difficulty_level));
  return all.filter((q) => q.difficulty_level === easiest).map(toStudentQuizQuestion);
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
