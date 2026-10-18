import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import type { CatalogSession, CatalogSessionStore, CatalogResponse } from "./session";

const responseSchema = z.object({
  questionId: z.string().uuid(),
  studentAnswer: z.string(),
  isCorrect: z.boolean(),
  responseTimeSeconds: z.number().int(),
});
const sessionSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string(),
  skillId: z.string(),
  assignmentId: z.string().uuid().nullable(),
  snapshots: z.array(z.unknown()).min(1).max(10),
  responses: z.array(responseSchema),
  completedAt: z.string().nullable(),
  score: z.number().int().nullable(),
});

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = createAdminClient();
  const call = client.rpc.bind(client) as unknown as (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  return data;
}

function session(value: unknown): CatalogSession {
  return sessionSchema.parse(value) as CatalogSession;
}

export const supabaseCatalogSessionStore: CatalogSessionStore = {
  async start(input) {
    return session(
      await rpc("catalog_practice_start", {
        p_student_id: input.studentId,
        p_skill_id: input.skillId,
        p_assignment_id: input.assignmentId,
        p_snapshots: input.snapshots,
      })
    );
  },
  async getOwned(sessionId, studentId) {
    const value = await rpc("catalog_practice_owned", {
      p_session_id: sessionId,
      p_student_id: studentId,
    });
    return value == null ? null : session(value);
  },
  async recordOnce(input): Promise<CatalogResponse> {
    return responseSchema.parse(
      await rpc("catalog_practice_record_once", {
        p_session_id: input.sessionId,
        p_student_id: input.studentId,
        p_question_id: input.response.questionId,
        p_answer: input.response.studentAnswer,
        p_correct: input.response.isCorrect,
        p_seconds: input.response.responseTimeSeconds,
      })
    );
  },
  async complete(sessionId, studentId) {
    return session(
      await rpc("catalog_practice_complete", {
        p_session_id: sessionId,
        p_student_id: studentId,
      })
    );
  },
};

/** Read private approved evidence separately; never send it to the browser. */
export async function loadCatalogQuestionEvidence(
  questionIds: string[]
): Promise<Map<string, unknown>> {
  const result = new Map<string, unknown>();
  const db = createAdminClient();
  for (let offset = 0; offset < questionIds.length; offset += 200) {
    const { data, error } = await db
      .from("answer_key_entries")
      .select("question_id, raw_model_response")
      .in("question_id", questionIds.slice(offset, offset + 200));
    if (error) throw new Error("Reviewed question evidence could not be loaded");
    for (const row of data ?? []) {
      if (!row.question_id || result.has(row.question_id)) {
        throw new Error("Reviewed question evidence is ambiguous");
      }
      result.set(row.question_id, row.raw_model_response);
    }
  }
  if (result.size !== questionIds.length) throw new Error("Reviewed question evidence is missing");
  return result;
}
