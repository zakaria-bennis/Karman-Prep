import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import {
  approvedCatalogEvidence,
  catalogQuestion,
  catalogSkillId,
} from "../../../tests/fixtures/approved-catalog";

const mock = vi.hoisted(() => ({
  pools: new Map<string, unknown[]>(),
  evidence: new Map<string, unknown>(),
  pool: vi.fn(),
  loadEvidence: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/catalog-question-pool", () => ({
  fetchCatalogQuestionPool: mock.pool,
}));
vi.mock("@/lib/catalog-practice/supabase-store", () => ({
  loadCatalogQuestionEvidence: mock.loadEvidence,
}));

import { loadDailySlot, reviewDailyAnswer } from "./server";

function hard(id: string, difficulty = 6) {
  const question = {
    ...catalogQuestion(id),
    difficulty_level: difficulty,
    numeric_tolerance: null,
    explanation_text: "The reviewed explanation.",
    explanation_per_choice: null,
    desmos_strategy: null,
  } as unknown as QuizQuestionWithChoices;
  const evidence = approvedCatalogEvidence(`stable-${id}`);
  evidence.approved_tags.question_payload_sha256 = catalogQuestionPayloadHash(question);
  mock.evidence.set(id, evidence);
  return question;
}
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mock.pools.clear();
  mock.evidence.clear();
  mock.pool.mockReset();
  mock.loadEvidence.mockReset();
  mock.pool.mockImplementation(
    async ({ skillId }: { skillId: string }) => mock.pools.get(skillId) ?? []
  );
  mock.loadEvidence.mockImplementation(
    async (ids: string[]) => new Map(ids.map((key) => [key, mock.evidence.get(key)]))
  );
});

describe("daily challenge from the live catalog pools", () => {
  it("is empty when no skill has a hard question", async () => {
    expect(await loadDailySlot("math", 7, new Date("2026-11-08T12:00:00Z"))).toEqual({
      state: "empty",
    });
    expect(mock.pool).toHaveBeenCalledWith({
      skillId: expect.any(String),
      minimumDifficulty: 5,
      maximumDifficulty: 7,
    });
  });

  it("finds the one skill with a hard question and serves it key-free", async () => {
    mock.pools.set(catalogSkillId, [hard(id(1))]);
    const slot = await loadDailySlot("math", 7, new Date());
    expect(slot.state).toBe("ready");
    if (slot.state !== "ready") return;
    expect(slot.value.question.id).toBe(id(1));
    expect(JSON.stringify(slot.value.question)).not.toContain("correct_answer");
    expect(JSON.stringify(slot.value.question)).not.toContain("reviewed explanation");
    const review = await reviewDailyAnswer("math", slot.value.day, id(1), "A", 7);
    expect(review).toMatchObject({ correct_answer: "A", isCorrect: true });
    await expect(reviewDailyAnswer("math", slot.value.day, id(2), "A", 7)).rejects.toThrow(
      "no longer available"
    );
    const award = vi.fn(async () => 15 as const);
    const signedIn = await reviewDailyAnswer("math", slot.value.day, id(1), "A", 7, {
      clerkId: "user_s",
      award,
    });
    expect(award).toHaveBeenCalledWith({
      key: `daily:${slot.value.day}:math`,
      clerkId: "user_s",
      correct: true,
      difficulty: 6,
      skillId: catalogSkillId,
    });
    expect(signedIn.points).toBe(15);
    expect(review.points).toBe(0);
  });

  it("rotates across the pool by day and never serves outside difficulty 5–7", async () => {
    const pool = Array.from({ length: 40 }, (_, n) => hard(id(n + 1)));
    mock.pools.set(catalogSkillId, [...pool, hard(id(99), 4)]);
    const served = new Set<string>();
    for (let day = 1; day <= 20; day++) {
      const slot = await loadDailySlot("math", 7, new Date(Date.UTC(2026, 10, day, 12)));
      if (slot.state === "ready") served.add(slot.value.question.id);
    }
    expect(served.size).toBeGreaterThan(8);
    expect(served.has(id(99))).toBe(false);
  });

  it("serves core plans difficulty 5 only and mastery plans up to 7", async () => {
    mock.pools.set(catalogSkillId, [hard(id(1), 6), hard(id(2), 7)]);
    const day = new Date("2026-11-08T12:00:00Z");
    expect((await loadDailySlot("math", 5, day)).state).toBe("empty");
    expect(mock.pool).toHaveBeenCalledWith({
      skillId: expect.any(String),
      minimumDifficulty: 5,
      maximumDifficulty: 5,
    });
    mock.pools.set(catalogSkillId, [hard(id(1), 6), hard(id(2), 7), hard(id(3), 5)]);
    const core = await loadDailySlot("math", 5, day);
    expect(core.state === "ready" && core.value.question.id).toBe(id(3));
    const mastery = await loadDailySlot("math", 7, day);
    expect(mastery.state).toBe("ready");
    // A core student cannot answer a mastery question served to someone else.
    if (mastery.state === "ready" && mastery.value.question.id !== id(3))
      await expect(
        reviewDailyAnswer("math", mastery.value.day, mastery.value.question.id, "A", 5)
      ).rejects.toThrow("no longer available");
  });

  it("skips a re-sealed row instead of failing the day", async () => {
    const changed = hard(id(1));
    changed.question_text = "Edited after review";
    mock.pools.set(catalogSkillId, [changed, hard(id(2))]);
    const slot = await loadDailySlot("math", 7, new Date("2026-11-08T12:00:00Z"));
    expect(slot.state === "ready" && slot.value.question.id).toBe(id(2));
  });

  it("is unavailable, not broken, when the bank read fails", async () => {
    mock.pool.mockRejectedValue(new Error("synthetic failure"));
    expect(await loadDailySlot("reading", 7, new Date("2026-11-08T12:00:00Z"))).toEqual({
      state: "unavailable",
    });
  });
});
