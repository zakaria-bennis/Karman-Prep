/*
 * A stored generated question passes the same gate every student lane uses, and nothing a
 * student receives carries its origin.
 */
import { describe, expect, it } from "vitest";
import { buildCatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { readCatalogQuestionScope } from "@/lib/question-bank/catalog-question-scope";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { buildItem, isItem } from "./math/core/build";
import { twoStep } from "./math/skills/solving-linear-equations";
import { batchManifestSha, evidenceFor, fromMathItem, rowsFor, sealOf } from "./store";

function stored(seed: number) {
  const template = twoStep;
  const item = buildItem(template, seed);
  if (!isItem(item)) throw new Error("no item");
  const q = fromMathItem(item);
  const ids = {
    question: "00000000-0000-4000-8000-00000000000" + (seed % 10),
    choices: q.choices.map((_, i) => `00000000-0000-4000-8000-0000000001${seed % 10}${i}`),
  };
  const rows = rowsFor(q, "gen-test", ids);
  const row = {
    ...rows.question,
    answer_choices: rows.choices,
  } as unknown as QuizQuestionWithChoices;
  const evidence = evidenceFor(q, "gen-test", batchManifestSha("gen-test", [q]), sealOf(row));
  return { q, rows, row, evidence };
}

describe("stored generated questions", () => {
  it("pass the catalog gate and the delivery seal", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { row, evidence, q } = stored(seed);
      const scope = readCatalogQuestionScope(evidence);
      expect(scope.publicationAllowed).toBe(true);
      expect(scope.tags.stable_question_id).toBe(q.stableId);
      expect(() => buildCatalogDeliverySnapshot(row, evidence)).not.toThrow();
    }
  });

  it("fail the gate when the delivered text changes after sealing", () => {
    const { row, evidence } = stored(6);
    const changed = { ...row, question_text: `${row.question_text} ` };
    expect(() => buildCatalogDeliverySnapshot(changed, evidence)).toThrow();
  });

  it("are practice-only, marked generated, and never show it to students", () => {
    const { rows, row } = stored(7);
    expect(rows.question.origin).toBe("generated");
    expect(rows.question.pool).toBe("practice");
    expect(rows.binding).toMatchObject({
      decided_by: "generator",
      confidence: 1,
      skill_id: "m-solving-linear-equations",
    });
    const student = toStudentQuizQuestion(row);
    expect(JSON.stringify(student)).not.toMatch(/origin|generator|gen:/);
  });
});
