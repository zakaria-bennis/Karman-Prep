import type { SupabaseClient } from "@supabase/supabase-js";
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

const answeredSchema = z.object({
  question_id: z.string().uuid(),
  answered_at: z.string(),
});
const PAGE = 1000;

/** The catalog practice tables are not in the generated types; read them untyped. */
function tables(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
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
  async abandon(sessionId, studentId) {
    // Closing frees the one-open-session slot. The score stays empty: it was never finished.
    // catalog_practice_record_once refuses answers once completed_at is set.
    const { error } = await tables()
      .from("catalog_practice_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("student_id", studentId)
      .is("completed_at", null);
    if (error) throw new Error("Practice session could not be closed");
  },
  async answeredQuestions(studentId, skillId) {
    const db = tables();
    const sessionIds: string[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db
        .from("catalog_practice_sessions")
        .select("id")
        .eq("student_id", studentId)
        .eq("skill_id", skillId)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error("Saved practice could not be loaded");
      sessionIds.push(
        ...z
          .array(z.object({ id: z.string().uuid() }))
          .parse(data ?? [])
          .map((row) => row.id)
      );
      if ((data ?? []).length < PAGE) break;
    }
    const answers: { questionId: string; answeredAt: string }[] = [];
    for (let chunk = 0; chunk < sessionIds.length; chunk += 100) {
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await db
          .from("catalog_practice_responses")
          .select("question_id, answered_at")
          .in("session_id", sessionIds.slice(chunk, chunk + 100))
          .order("id", { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (error) throw new Error("Saved practice could not be loaded");
        for (const row of z.array(answeredSchema).parse(data ?? [])) {
          answers.push({ questionId: row.question_id, answeredAt: row.answered_at });
        }
        if ((data ?? []).length < PAGE) break;
      }
    }
    return answers;
  },
};

/**
 * Read private approved evidence separately; never send it to the browser.
 * A question with no evidence row, or more than one, is left out with a log line, so one
 * bad row never breaks the whole skill (the session then skips that question).
 */
export async function loadCatalogQuestionEvidence(
  questionIds: string[]
): Promise<Map<string, unknown>> {
  const result = new Map<string, unknown>();
  const ambiguous = new Set<string>();
  const db = createAdminClient();
  for (let offset = 0; offset < questionIds.length; offset += 200) {
    const { data, error } = await db
      .from("answer_key_entries")
      .select("question_id, raw_model_response")
      .in("question_id", questionIds.slice(offset, offset + 200));
    if (error) throw new Error("Reviewed question evidence could not be loaded");
    for (const row of data ?? []) {
      if (!row.question_id) continue;
      if (result.has(row.question_id)) ambiguous.add(row.question_id);
      result.set(row.question_id, row.raw_model_response);
    }
  }
  for (const id of ambiguous) {
    console.error(
      `[catalog practice] skipped question ${id}: reviewed question evidence is ambiguous`
    );
    result.delete(id);
  }
  for (const id of questionIds) {
    if (!result.has(id) && !ambiguous.has(id)) {
      console.error(
        `[catalog practice] skipped question ${id}: reviewed question evidence is missing`
      );
    }
  }
  return result;
}
