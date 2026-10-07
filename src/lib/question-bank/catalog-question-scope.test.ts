import { describe, expect, it } from "vitest";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import {
  approvedCatalogEvidence,
  catalogQuestion,
  catalogSkillId,
} from "../../../tests/fixtures/approved-catalog";
import {
  catalogPoolInputSchema,
  readCatalogQuestionScope,
  catalogQuestionPayloadHash,
} from "./catalog-question-scope";

describe("canonical skill evidence read contract", () => {
  it("reads both official and generated envelopes and retains the private-publication hold", () => {
    const evidence = approvedCatalogEvidence("held", false);
    for (const value of [evidence, { kind: "independently_confirmed_generated", evidence }]) {
      const scope = readCatalogQuestionScope(value);
      expect(scope.skill.id).toBe(catalogSkillId);
      expect(scope.publicationAllowed).toBe(false);
    }
    expect(readCatalogQuestionScope(approvedCatalogEvidence()).publicationAllowed).toBe(true);
  });

  it("rejects a different content version, question identity, domain or uncertain D review", () => {
    const evidence = approvedCatalogEvidence();
    for (const changed of [
      { ...evidence, B_student_sha256: "e".repeat(64) },
      { ...evidence, question_id: "other-question" },
      { ...evidence, approved_tags: { ...evidence.approved_tags, catalog_domain_id: "geometry" } },
      { ...evidence, D_original_record: { ...evidence.D_original_record, uncertain: true } },
    ])
      expect(() => readCatalogQuestionScope(changed)).toThrow(/differs/);
  });

  it("rejects ambiguous envelopes and never converts an old slug to a canonical skill", () => {
    const evidence = approvedCatalogEvidence();
    expect(() =>
      readCatalogQuestionScope({
        kind: "independently_confirmed_generated",
        evidence,
        approved_tags: evidence.approved_tags,
      })
    ).toThrow(/ambiguous/);
    expect(() =>
      readCatalogQuestionScope({ concept_slug: "linear-equations-one-variable" })
    ).toThrow(/unavailable/);
    expect(catalogPoolInputSchema.safeParse({ skillId: "ma-00" }).success).toBe(false);
    expect(
      catalogPoolInputSchema.safeParse({ skillId: `${catalogSkillId},is_live.eq.false` }).success
    ).toBe(false);
    expect(
      catalogPoolInputSchema.safeParse({
        skillId: catalogSkillId,
        minimumDifficulty: 6,
        maximumDifficulty: 2,
      }).success
    ).toBe(false);
  });
});

describe("source formatting in canonical delivery", () => {
  const formatted = () => ({
    ...catalogQuestion(),
    question_text: "Use [[u]]the marked sentence[[/u]] and $x^2$; retain the figure note.",
    passage_intro: "Source attribution retained separately.",
    passage: "<u>Source sentence.</u>\nEssential note: values are in cm².",
    figure_kind: "table" as const,
    figure_table_data: {
      caption: "Distance (cm)",
      header_row: ["Time (s)", "Distance (cm)"],
      rows: [["1", "2"]],
      footer_note: "Values rounded to the nearest tenth.",
    },
    answer_choices: [
      {
        id: "choice-1",
        question_id: "question-1",
        letter: "A" as const,
        choice_text: "<u>Marked option.</u>",
        choice_table_data: {
          header_row: ["x", "y"],
          rows: [["1", "2"]],
          footer_note: "x in seconds",
        },
      },
    ],
  });

  it("passes explicit text markers and structured notes to students without stripping them", () => {
    const question = formatted() as unknown as QuizQuestionWithChoices;
    const student = toStudentQuizQuestion(question);
    expect(student.question_text).toBe(question.question_text);
    expect(student.passage).toBe(question.passage);
    expect(student.passage_intro).toBe(question.passage_intro);
    expect(student.figure_table_data).toEqual(question.figure_table_data);
    expect(student.answer_choices[0].choice_text).toBe(question.answer_choices[0].choice_text);
    expect(student.answer_choices[0].choice_table_data).toEqual(
      question.answer_choices[0].choice_table_data
    );
    expect(student).not.toHaveProperty("correct_answer");
  });

  it("changes the delivery seal when formatting, essential notes or structured units are lost", () => {
    const original = formatted();
    const seal = catalogQuestionPayloadHash(original as unknown as QuizQuestionWithChoices);
    const mutations = [
      {
        ...original,
        question_text: original.question_text.replace("[[u]]", "").replace("[[/u]]", ""),
      },
      { ...original, passage: "Source sentence." },
      { ...original, figure_table_data: { ...original.figure_table_data, footer_note: null } },
      {
        ...original,
        figure_table_data: { ...original.figure_table_data, header_row: ["Time", "Distance"] },
      },
      {
        ...original,
        answer_choices: [{ ...original.answer_choices[0], choice_text: "Marked option." }],
      },
      {
        ...original,
        answer_choices: [
          {
            ...original.answer_choices[0],
            choice_table_data: {
              ...original.answer_choices[0].choice_table_data,
              footer_note: null,
            },
          },
        ],
      },
    ];
    for (const mutation of mutations) {
      expect(catalogQuestionPayloadHash(mutation as unknown as QuizQuestionWithChoices)).not.toBe(
        seal
      );
    }
  });
});
