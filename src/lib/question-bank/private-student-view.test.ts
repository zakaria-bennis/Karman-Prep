import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogQuestion } from "../../../tests/fixtures/approved-catalog";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestionPayloadHash } from "./catalog-question-scope";

const fixture = vi.hoisted(() => ({
  userId: "real-admin" as string | null,
  role: "admin" as string | null,
  question: null as unknown,
  error: null as unknown,
  calls: [] as unknown[][],
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => {
    fixture.calls.push(["auth"]);
    return { userId: fixture.userId };
  },
}));
vi.mock("@/lib/supabase/queries/admin", () => ({
  fetchUserRole: async (id: string) => {
    fixture.calls.push(["real-role", id]);
    return fixture.role;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    fixture.calls.push(["question-client"]);
    const query = {
      select: (fields: string) => {
        fixture.calls.push(["select", fields]);
        return query;
      },
      eq: (field: string, value: unknown) => {
        fixture.calls.push(["eq", field, value]);
        return query;
      },
      is: (field: string, value: unknown) => {
        fixture.calls.push(["is", field, value]);
        return query;
      },
      maybeSingle: async () => ({ data: fixture.question, error: fixture.error }),
    };
    return {
      from: (table: string) => {
        fixture.calls.push(["from", table]);
        return query;
      },
    };
  },
}));
import { readPrivateStudentView } from "./private-student-view";

const id = "3c89d697-c811-5db9-a6b3-f23b520e1433";
function heldQuestion() {
  return {
    ...catalogQuestion(id),
    is_live: false,
    import_status: "needs_review",
    publish_status: "needs_human_review",
    archived_at: null,
    source_version: "a".repeat(64),
    raw_question_text: "private-source-text",
    correct_answer: "private-key",
    explanation_text: "private-explanation",
    explanation_per_choice: { A: "private-choice-explanation" },
    desmos_strategy: "private-strategy",
    reviewed_numeric_answers: ["private-numeric-set"],
    answer_choices: [
      {
        id: "choice-1",
        question_id: id,
        letter: "A",
        choice_text: "3",
        is_correct: true,
        raw_choice_text: "private-raw-choice",
      },
    ],
  } as unknown as QuizQuestionWithChoices;
}
function request() {
  return { questionId: id, payloadSha256: catalogQuestionPayloadHash(heldQuestion()) };
}
beforeEach(() => {
  fixture.userId = "real-admin";
  fixture.role = "admin";
  fixture.question = heldQuestion();
  fixture.error = null;
  fixture.calls = [];
});

describe("private unanswered student view read boundary", () => {
  it("denies a signed-out caller before any role or question read", async () => {
    fixture.userId = null;
    await expect(readPrivateStudentView(request())).rejects.toMatchObject({
      reason: "unauthorized",
    });
    expect(fixture.calls).toEqual([["auth"]]);
  });
  it.each(["student", "tutor", "parent", null])(
    "denies %s before the content client",
    async (role) => {
      fixture.role = role;
      await expect(readPrivateStudentView(request())).rejects.toThrow("unavailable");
      expect(fixture.calls).toEqual([["auth"], ["real-role", "real-admin"]]);
    }
  );
  it.each([
    { questionId: "bad-id", payloadSha256: "a".repeat(64) },
    { questionId: id, payloadSha256: "bad-hash" },
    { questionId: id, payloadSha256: ["a".repeat(64), "b".repeat(64)] },
    { questionId: id },
  ])("rejects malformed/missing pins before a content read", async (input) => {
    await expect(readPrivateStudentView(input)).rejects.toThrow("unavailable");
    expect(fixture.calls.some(([name]) => name === "question-client")).toBe(false);
  });
  it("authorizes first, reads exactly one held UUID, and returns only unanswered student data", async () => {
    const result = await readPrivateStudentView(request());
    expect(fixture.calls.slice(0, 3)).toEqual([
      ["auth"],
      ["real-role", "real-admin"],
      ["question-client"],
    ]);
    expect(fixture.calls).toContainEqual(["eq", "id", id]);
    expect(fixture.calls).toContainEqual(["eq", "is_live", false]);
    expect(fixture.calls).toContainEqual(["eq", "import_status", "needs_review"]);
    expect(fixture.calls).toContainEqual(["eq", "publish_status", "needs_human_review"]);
    expect(result.question.question_text).toBe(heldQuestion().question_text);
    expect(JSON.stringify(result)).not.toContain("private-");
    expect(result.question.answer_choices[0]).not.toHaveProperty("is_correct");
    expect(result.question).not.toHaveProperty("correct_answer");
    expect(result.question).not.toHaveProperty("explanation_text");
  });
  it.each([
    { question_text: "changed displayed version" },
    { correct_answer: "changed key" },
    { explanation_text: "changed explanation" },
    { is_live: true },
    { import_status: "ok" },
    { publish_status: "publish_ready" },
    { archived_at: "2026-10-08T00:00:00Z" },
    { id: "79273762-8c55-58a1-adea-892514611588" },
  ])("rejects drift or loss of the private hold: %j", async (change) => {
    fixture.question = { ...heldQuestion(), ...change };
    await expect(readPrivateStudentView(request())).rejects.toThrow("unavailable");
  });
  it("fails closed on an absent row or failed database read", async () => {
    fixture.question = null;
    await expect(readPrivateStudentView(request())).rejects.toThrow("unavailable");
    fixture.question = heldQuestion();
    fixture.error = { message: "failed" };
    await expect(readPrivateStudentView(request())).rejects.toThrow("unavailable");
  });
});
