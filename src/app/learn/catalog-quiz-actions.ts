"use server";

import { safeAuth } from "@/lib/auth/dev-auth";
import { assertQuestionsLeft } from "@/lib/assembler/plan-gate";
import { PLAN_ENTITLEMENTS, difficultyRangeFor, getPlan, usesPracticeSet } from "@/lib/plans";
import { withPlanLimit } from "@/lib/assembler/plan-limit";
import { awardForAnswer } from "@/lib/quiz/points";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { loadActiveAssignment } from "@/lib/catalog-assignments/server";
import {
  createCatalogPracticeService,
  type StartCatalogPracticeInput,
} from "@/lib/catalog-practice/session";
import {
  loadCatalogQuestionEvidence,
  supabaseCatalogSessionStore,
} from "@/lib/catalog-practice/supabase-store";

const deps = {
  fetchPool: fetchCatalogQuestionPool,
  loadEvidence: loadCatalogQuestionEvidence,
  loadOwnedAssignment: loadActiveAssignment,
  store: supabaseCatalogSessionStore,
  award: awardForAnswer,
};
const service = createCatalogPracticeService(deps);

/** Starting a session reads the pool: a core plan (Free, Practice, a school seat) reads only the
 *  Practice plan's fixed set, at most its own top level. */
async function serviceFor(clerkId: string) {
  const plan = await getPlan(clerkId).catch(() => ({ entitlements: PLAN_ENTITLEMENTS.free }));
  const cap = difficultyRangeFor(plan).maximumDifficulty;
  const practiceSet = usesPracticeSet(plan);
  return createCatalogPracticeService({
    ...deps,
    fetchPool: (input) =>
      fetchCatalogQuestionPool(
        { ...input, maximumDifficulty: Math.min(input.maximumDifficulty, cap) },
        "practice",
        { practiceSet }
      ),
  });
}

async function studentId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new Error("Student access required");
  }
  return userId;
}

export async function actionStartCatalogPractice(input: StartCatalogPracticeInput) {
  const id = await studentId();
  return (await serviceFor(id)).start(input, id);
}

export async function actionResumeCatalogPractice(sessionId: string) {
  const id = await studentId();
  return (await serviceFor(id)).resume(sessionId, id);
}

export async function actionSubmitCatalogPractice(input: {
  sessionId: string;
  questionId: string;
  answer: string;
  responseTimeSeconds: number;
}) {
  return withPlanLimit(async () => {
    const id = await studentId();
    await assertQuestionsLeft(id);
    return service.submit(input, id);
  });
}

export async function actionCompleteCatalogPractice(sessionId: string) {
  return service.complete(sessionId, await studentId());
}
