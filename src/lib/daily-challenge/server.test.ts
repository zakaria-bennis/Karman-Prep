import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { DailyCandidate } from "./selection";

const mock = vi.hoisted(() => ({
  candidates: [] as DailyCandidate[],
  pool: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("./candidates", () => ({ DAILY_CANDIDATES: mock.candidates }));
vi.mock("@/lib/supabase/queries/catalog-question-pool", () => ({
  fetchCatalogQuestionPool: mock.pool,
}));
vi.mock("@/lib/question-bank/catalog-question-scope", () => ({
  catalogQuestionPayloadHash: mock.hash,
}));

import { loadDailySlot, reviewDailyAnswer } from "./server";

const question = {
  id: "00000000-0000-4000-8000-000000000001",
  subject: "math",
  difficulty_level: 5,
  answer_format: "multiple_choice",
  correct_answer: "A",
  numeric_tolerance: null,
  explanation_text: "The reviewed explanation.",
  explanation_per_choice: null,
  desmos_strategy: null,
  answer_choices: [{ id: "choice-a", question_id: "id", letter: "A", choice_text: "209" }],
} as QuizQuestionWithChoices;

beforeEach(() => {
  mock.candidates.length = 0;
  mock.pool.mockReset();
  mock.hash.mockReset();
  mock.pool.mockResolvedValue([question]);
  mock.hash.mockReturnValue("a".repeat(64));
});

describe("daily challenge admission and response", () => {
  it("shows an empty state without a reviewed receipt and does not query the bank", async () => {
    expect(await loadDailySlot("math", new Date("2026-10-08T12:00:00Z"))).toEqual({
      state: "empty",
    });
    expect(mock.pool).not.toHaveBeenCalled();
  });

  it("requires the current approved version and difficulty 5–7", async () => {
    mock.candidates.push({
      subject: "math",
      questionId: question.id,
      skillId: "ma-skill",
      payloadSha256: "b".repeat(64),
    });
    expect(await loadDailySlot("math", new Date("2026-10-08T12:00:00Z"))).toEqual({
      state: "empty",
    });
    mock.candidates[0].payloadSha256 = "a".repeat(64);
    mock.pool.mockResolvedValue([{ ...question, difficulty_level: 4 }]);
    expect(await loadDailySlot("math", new Date("2026-10-08T12:00:00Z"))).toEqual({
      state: "empty",
    });
  });

  it("delivers a key-free question, then returns review only after a response", async () => {
    const today = new Date();
    mock.candidates.push({
      subject: "math",
      questionId: question.id,
      skillId: "ma-skill",
      payloadSha256: "a".repeat(64),
    });
    const slot = await loadDailySlot("math", today);
    expect(slot.state).toBe("ready");
    if (slot.state !== "ready") return;
    expect(JSON.stringify(slot.value.question)).not.toContain("correct_answer");
    expect(JSON.stringify(slot.value.question)).not.toContain("reviewed explanation");
    const review = await reviewDailyAnswer("math", slot.value.day, question.id, "A");
    expect(review).toMatchObject({ correct_answer: "A", isCorrect: true });
    await expect(reviewDailyAnswer("math", slot.value.day, "different", "A")).rejects.toThrow();
  });
});
