import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approvedCatalogEvidence,
  catalogQuestion,
  catalogSkillId,
} from "../../../tests/fixtures/approved-catalog";

const fixture = vi.hoisted(() => ({
  evidenceRows: [] as Array<{ question_id: string; raw_model_response: unknown }>,
  error: false,
}));
vi.mock("@/lib/supabase/queries/catalog-question-pool", () => ({
  fetchCatalogQuestionPool: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "answer_key_entries") throw new Error("Unexpected table");
      return {
        select: () => ({
          in: async () => ({
            data: fixture.evidenceRows,
            error: fixture.error ? { message: "synthetic failure" } : null,
          }),
        }),
      };
    },
  }),
}));

import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { catalogAssignmentSelection } from "./selection";

const questionId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.resetAllMocks();
  fixture.evidenceRows = [
    { question_id: questionId, raw_model_response: approvedCatalogEvidence("source-Q1") },
  ];
  fixture.error = false;
  vi.mocked(fetchCatalogQuestionPool).mockResolvedValue([catalogQuestion(questionId) as never]);
});

describe("canonical assignment question selection", () => {
  it("binds the approved snapshot and source reference in requested order", async () => {
    const result = await catalogAssignmentSelection.select(catalogSkillId, [questionId]);
    expect(result).toHaveLength(1);
    expect(result[0].snapshot.binding).toMatchObject({
      questionId,
      stableQuestionId: "source-Q1",
      catalogSkillId,
    });
    expect(result[0].snapshot.binding.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(catalogAssignmentSelection.questionId(result[0])).toBe(questionId);
    expect(catalogAssignmentSelection.sameVersion(result[0], { ...result[0] })).toBe(true);
    const persisted = JSON.parse(JSON.stringify(result[0])) as (typeof result)[number];
    persisted.snapshot.binding = {
      payloadSha256: persisted.snapshot.binding.payloadSha256,
      catalogSkillId: persisted.snapshot.binding.catalogSkillId,
      stableQuestionId: persisted.snapshot.binding.stableQuestionId,
      questionId: persisted.snapshot.binding.questionId,
    };
    expect(catalogAssignmentSelection.sameVersion(persisted, result[0])).toBe(true);
    persisted.snapshot.binding.payloadSha256 = "0".repeat(64);
    expect(catalogAssignmentSelection.sameVersion(persisted, result[0])).toBe(false);
  });

  it("rejects an ID absent from the approved pool", async () => {
    await expect(
      catalogAssignmentSelection.select(catalogSkillId, ["22222222-2222-4222-8222-222222222222"])
    ).rejects.toThrow("not in the approved skill pool");
  });

  it("holds unpublished, changed, or ambiguous private evidence", async () => {
    fixture.evidenceRows = [
      { question_id: questionId, raw_model_response: approvedCatalogEvidence("source-Q1", false) },
    ];
    await expect(catalogAssignmentSelection.select(catalogSkillId, [questionId])).rejects.toThrow(
      "version is unavailable"
    );
    fixture.evidenceRows = [
      { question_id: questionId, raw_model_response: approvedCatalogEvidence("source-Q1") },
    ];
    vi.mocked(fetchCatalogQuestionPool).mockResolvedValue([
      { ...catalogQuestion(questionId), question_text: "Edited after approval" } as never,
    ]);
    await expect(catalogAssignmentSelection.select(catalogSkillId, [questionId])).rejects.toThrow(
      "version is unavailable"
    );
    fixture.evidenceRows.push(fixture.evidenceRows[0]);
    await expect(catalogAssignmentSelection.select(catalogSkillId, [questionId])).rejects.toThrow(
      "ambiguous"
    );
  });
});
