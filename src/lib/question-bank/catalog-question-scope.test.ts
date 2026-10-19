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

describe("evidence formats written by later reviewed release batches", () => {
  const skillLabel = "Linear equations in one variable";
  // Later batches name the question `stable_question_id` instead of `question_id`.
  const renamed = () => {
    const { question_id, ...rest } = approvedCatalogEvidence();
    return { ...rest, stable_question_id: question_id };
  };
  const withoutOriginalD = () => {
    const { D_original_record: _d, ...rest } = renamed();
    void _d;
    return rest;
  };

  it("accepts evidence that names the question stable_question_id instead of question_id", () => {
    expect(readCatalogQuestionScope(renamed()).publicationAllowed).toBe(true);
  });

  it("rejects a missing, foreign or conflicting evidence question identity", () => {
    const { stable_question_id: _s, ...anonymous } = renamed();
    void _s;
    for (const changed of [
      anonymous,
      { ...renamed(), stable_question_id: "other-question" },
      { ...approvedCatalogEvidence(), stable_question_id: "other-question" },
    ])
      expect(() => readCatalogQuestionScope(changed)).toThrow(/differs/);
  });

  it("accepts a delivery-payload-sealed approval that has no pilot-row hash", () => {
    const evidence = renamed();
    const { pilot_row_sha256: _p, ...tags } = evidence.approved_tags;
    void _p;
    expect(readCatalogQuestionScope({ ...evidence, approved_tags: tags }).publicationAllowed).toBe(
      true
    );
  });

  it("still requires a pilot-row hash or a delivery-payload seal", () => {
    const evidence = renamed();
    const { pilot_row_sha256: _p, question_payload_sha256: _q, ...tags } = evidence.approved_tags;
    void _p;
    void _q;
    expect(() => readCatalogQuestionScope({ ...evidence, approved_tags: tags })).toThrow(
      /unavailable/
    );
  });

  const independent = () => ({
    ...withoutOriginalD(),
    independent_D_review_sha256: "e".repeat(64),
    independent_D_record: { skill: skillLabel, domain: "Algebra", level: 3, reason: "Solve." },
  });

  it("accepts an independent D skill review that confirms the tagged skill and domain", () => {
    expect(readCatalogQuestionScope(independent()).publicationAllowed).toBe(true);
  });

  it("rejects an independent D review for another skill or domain, or without its review hash", () => {
    const base = independent();
    for (const changed of [
      {
        ...base,
        independent_D_record: { ...base.independent_D_record, skill: "Linear functions" },
      },
      { ...base, independent_D_record: { ...base.independent_D_record, domain: "Advanced Math" } },
      { ...base, independent_D_review_sha256: "not-a-hash" },
      withoutOriginalD(),
    ])
      expect(() => readCatalogQuestionScope(changed)).toThrow(/differs/);
  });

  const classified = () => ({
    ...withoutOriginalD(),
    D_classification_sha256: "f".repeat(64),
    D_classification_record: {
      stable_question_id: "synthetic-math-M1-Q1",
      D_classification_sha256: "f".repeat(64),
      D_skill: skillLabel,
      D_domain: "Algebra",
      D_content_sha256: "a".repeat(64),
      D_difficulty_level: 2,
    },
  });

  it("accepts a D classification record bound to the row's classification hash and content", () => {
    expect(readCatalogQuestionScope(classified()).publicationAllowed).toBe(true);
  });

  it("rejects a D classification for other content, another skill, another question or hash", () => {
    const base = classified();
    const record = base.D_classification_record;
    for (const changed of [
      { ...base, D_classification_record: { ...record, D_content_sha256: "9".repeat(64) } },
      { ...base, D_classification_record: { ...record, D_skill: "Linear functions" } },
      { ...base, D_classification_record: { ...record, D_domain: "Advanced Math" } },
      { ...base, D_classification_record: { ...record, stable_question_id: "other-question" } },
      { ...base, D_classification_sha256: "8".repeat(64) },
    ])
      expect(() => readCatalogQuestionScope(changed)).toThrow(/differs/);
  });

  it("never lets a weaker review rescue an original D record that fails", () => {
    const evidence = approvedCatalogEvidence();
    expect(() =>
      readCatalogQuestionScope({
        ...evidence,
        D_original_record: { ...evidence.D_original_record, uncertain: true },
        independent_D_review_sha256: "e".repeat(64),
        independent_D_record: { skill: skillLabel, domain: "Algebra", level: 3, reason: "Solve." },
      })
    ).toThrow(/differs/);
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
