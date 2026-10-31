"use server";

import { safeAuth } from "@/lib/auth/dev-auth";
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

const service = createCatalogPracticeService({
  fetchPool: fetchCatalogQuestionPool,
  loadEvidence: loadCatalogQuestionEvidence,
  loadOwnedAssignment: loadActiveAssignment,
  store: supabaseCatalogSessionStore,
});

async function studentId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new Error("Student access required");
  }
  return userId;
}

export async function actionStartCatalogPractice(input: StartCatalogPracticeInput) {
  return service.start(input, await studentId());
}

export async function actionResumeCatalogPractice(sessionId: string) {
  return service.resume(sessionId, await studentId());
}

export async function actionSubmitCatalogPractice(input: {
  sessionId: string;
  questionId: string;
  answer: string;
  responseTimeSeconds: number;
}) {
  return service.submit(input, await studentId());
}

export async function actionCompleteCatalogPractice(sessionId: string) {
  return service.complete(sessionId, await studentId());
}
