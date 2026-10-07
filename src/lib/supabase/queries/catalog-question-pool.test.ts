import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approvedCatalogEvidence,
  catalogQuestion,
  catalogSkillId,
} from "../../../../tests/fixtures/approved-catalog";

const fixture = vi.hoisted(() => ({
  keys: [] as unknown[],
  questions: [] as unknown[],
  calls: [] as unknown[][],
  error: false,
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from(table: string) {
      fixture.calls.push(["from", table]);
      let range = [0, 9999];
      const query = {
        select(value: unknown) {
          fixture.calls.push(["select", value]);
          return query;
        },
        or(value: unknown) {
          fixture.calls.push(["or", value]);
          return query;
        },
        eq(column: string, value: unknown) {
          fixture.calls.push(["eq", column, value]);
          return query;
        },
        in(column: string, value: unknown) {
          fixture.calls.push(["in", column, value]);
          return query;
        },
        gte(column: string, value: unknown) {
          fixture.calls.push(["gte", column, value]);
          return query;
        },
        lte(column: string, value: unknown) {
          fixture.calls.push(["lte", column, value]);
          return query;
        },
        order(column: string) {
          fixture.calls.push(["order", column]);
          return query;
        },
        range(start: number, end: number) {
          range = [start, end];
          fixture.calls.push(["range", start, end]);
          return query;
        },
        then(resolve: (result: unknown) => unknown) {
          return Promise.resolve(
            resolve({
              data: (table === "answer_key_entries" ? fixture.keys : fixture.questions).slice(
                range[0],
                range[1] + 1
              ),
              error: fixture.error ? { message: "synthetic failure" } : null,
            })
          );
        },
      };
      return query;
    },
  }),
}));
import { fetchCatalogQuestionPool } from "./catalog-question-pool";

beforeEach(() => {
  fixture.keys = [];
  fixture.questions = [];
  fixture.calls = [];
  fixture.error = false;
});
describe("canonical skill pool query", () => {
  it("reads official and generated tag paths and uses publication/domain/difficulty gates without node mapping", async () => {
    const evidence = approvedCatalogEvidence();
    fixture.keys = [
      { question_id: "q1", raw_model_response: evidence },
      {
        question_id: "q2",
        raw_model_response: {
          kind: "independently_confirmed_generated",
          evidence: approvedCatalogEvidence("second"),
        },
      },
    ];
    fixture.questions = [catalogQuestion("q1"), catalogQuestion("q2")];
    expect(
      await fetchCatalogQuestionPool({
        skillId: catalogSkillId,
        minimumDifficulty: 2,
        maximumDifficulty: 5,
      })
    ).toHaveLength(2);
    expect(fixture.calls).toContainEqual([
      "or",
      `raw_model_response->approved_tags->>catalog_skill_id.eq.${catalogSkillId},raw_model_response->evidence->approved_tags->>catalog_skill_id.eq.${catalogSkillId}`,
    ]);
    expect(fixture.calls).toContainEqual(["eq", "is_live", true]);
    expect(fixture.calls).toContainEqual([
      "in",
      "publish_status",
      ["publish_ready", "publish_ready_with_verified_repair"],
    ]);
    expect(fixture.calls).toContainEqual(["eq", "domain", "algebra"]);
    expect(fixture.calls).toContainEqual(["gte", "difficulty_level", 2]);
    expect(fixture.calls).toContainEqual(["lte", "difficulty_level", 5]);
    expect(fixture.calls.some((call) => call[1] === "node_id" || call[1] === "concept_slug")).toBe(
      false
    );
  });

  it("keeps private pilot tags out of playable pools and rejects duplicate evidence", async () => {
    fixture.keys = [
      { question_id: "held", raw_model_response: approvedCatalogEvidence("held", false) },
    ];
    expect(await fetchCatalogQuestionPool({ skillId: catalogSkillId })).toEqual([]);
    expect(fixture.calls).not.toContainEqual(["from", "quiz_questions"]);
    fixture.keys.push(...fixture.keys);
    await expect(fetchCatalogQuestionPool({ skillId: catalogSkillId })).rejects.toThrow(
      /ambiguous/
    );
  });

  it("rejects an edited delivered question or an absent frozen delivery seal", async () => {
    const evidence = approvedCatalogEvidence();
    fixture.keys = [{ question_id: "q1", raw_model_response: evidence }];
    fixture.questions = [{ ...catalogQuestion("q1"), question_text: "Changed after review" }];
    await expect(fetchCatalogQuestionPool({ skillId: catalogSkillId })).rejects.toThrow(
      /snapshot differs/
    );
    fixture.questions = [catalogQuestion("q1")];
    const unsealed = JSON.parse(JSON.stringify(evidence));
    delete unsealed.approved_tags.question_payload_sha256;
    fixture.keys = [{ question_id: "q1", raw_model_response: unsealed }];
    await expect(fetchCatalogQuestionPool({ skillId: catalogSkillId })).rejects.toThrow(
      /snapshot differs/
    );
  });

  it("paginates private key metadata without truncating a pool at the API default", async () => {
    fixture.keys = Array.from({ length: 501 }, (_, index) => ({
      question_id: `q${index}`,
      raw_model_response: approvedCatalogEvidence(`source${index}`, false),
    }));
    expect(await fetchCatalogQuestionPool({ skillId: catalogSkillId })).toEqual([]);
    expect(fixture.calls).toContainEqual(["range", 0, 499]);
    expect(fixture.calls).toContainEqual(["range", 500, 999]);
  });

  it("surfaces read failure and rejects unapproved scope before a database read", async () => {
    await expect(fetchCatalogQuestionPool({ skillId: "ma-00" })).rejects.toThrow();
    expect(fixture.calls).toEqual([]);
    fixture.error = true;
    await expect(fetchCatalogQuestionPool({ skillId: catalogSkillId })).rejects.toThrow(
      /could not be loaded/
    );
  });
});
