import { catalogQuestion, catalogSkillId } from "../../../tests/fixtures/approved-catalog";
import type { SavedResponse, SavedSession } from "./saved-practice";
export const sessionId = "11111111-1111-4111-8111-111111111111";
export const questionId = "22222222-2222-4222-8222-222222222222";
export const assignmentId = "33333333-3333-4333-8333-333333333333";
export const studentUuid = "44444444-4444-4444-8444-444444444444";
export const tutorUuid = "55555555-5555-4555-8555-555555555555";
export const bookingId = "66666666-6666-4666-8666-666666666666";
export function saved(overrides: Partial<SavedSession> = {}): SavedSession {
  return {
    id: sessionId,
    student_id: "student-a",
    skill_id: catalogSkillId,
    assignment_id: assignmentId,
    started_at: "2026-10-09T08:00:00Z",
    completed_at: "2026-10-09T08:05:00Z",
    score: 0,
    snapshots: [
      {
        binding: {
          questionId,
          stableQuestionId: "synthetic-only-Q1",
          catalogSkillId,
          payloadSha256: "a".repeat(64),
        },
        student: catalogQuestion(questionId),
        answer: { correctAnswer: "PRIVATE_KEY" },
        review: { explanation_text: "PRIVATE_EXPLANATION" },
        evidence: { secret: "PRIVATE_EVIDENCE" },
      },
    ],
    ...overrides,
  };
}
export function response(overrides: Partial<SavedResponse> = {}): SavedResponse {
  return {
    session_id: sessionId,
    ordinal: 0,
    question_id: questionId,
    student_answer: "B",
    is_correct: false,
    answered_at: "2026-10-09T08:04:00Z",
    ...overrides,
  };
}
export function fakeDatabase(rows: Record<string, Array<{ data: unknown; error?: unknown }>>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  return {
    calls,
    client: {
      from(table: string) {
        calls.push({ table, method: "from", args: [] });
        const value = rows[table]?.shift();
        if (!value) throw new Error("Unexpected table read: " + table);
        const chain: Record<string, unknown> = {};
        for (const method of [
          "select",
          "eq",
          "in",
          "is",
          "not",
          "gte",
          "lt",
          "order",
          "limit",
          "maybeSingle",
        ]) {
          chain[method] = (...args: unknown[]) => {
            calls.push({ table, method, args });
            return chain;
          };
        }
        chain.then = (resolve: (value: unknown) => unknown) =>
          Promise.resolve(resolve({ error: null, ...value }));
        return chain;
      },
    },
  };
}
