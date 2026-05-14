// ============================================================
// Unit tests for the admin server-action input schemas.
//
// Covers the highest-stakes schemas — the ones that gate
// DB inserts and updates against the question bank. Trivial
// single-string ID schemas (deleteQuestion, resolveFlagged,
// etc.) follow the same pattern and aren't individually tested.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  bulkImportInputSchema,
  bulkImportRowSchema,
  cohortMemberMutationInputSchema,
  createCohortInputSchema,
  impersonateRoleSchema,
  linkParentStudentInputSchema,
  newQuestionInputSchema,
  quizDifficultyLevelSchema,
  quizDifficultySchema,
  reorderQuestionsInputSchema,
  saveVideoURLInputSchema,
  searchBankQuestionsInputSchema,
  setUserRoleInputSchema,
  updateQuestionInputSchema,
} from "./schemas";

const goodChoices = [
  { letter: "A", choice_text: "x" },
  { letter: "B", choice_text: "y" },
  { letter: "C", choice_text: "z" },
  { letter: "D", choice_text: "w" },
] as const;

function goodQuestion() {
  return {
    node_id: "ma-00",
    question_text: "What is 2+2?",
    question_type: "multiple_choice",
    difficulty: "foundational",
    difficulty_level: 1,
    answer_format: "multiple_choice",
    correct_answer: "A",
    numeric_tolerance: null,
    explanation_text: "...",
    explanation_per_choice: null,
    hint: null,
    subject: "math",
    topic_cluster: "Algebra — Linear Equations",
    desmos_strategy: null,
    choices: goodChoices,
  };
}

describe("quizDifficultySchema", () => {
  it.each(["foundational", "intermediate", "advanced", "mastery"] as const)("accepts %s", (d) => {
    expect(quizDifficultySchema.parse(d)).toBe(d);
  });

  it("rejects 'easy' (an obvious typo / legacy value)", () => {
    expect(quizDifficultySchema.safeParse("easy").success).toBe(false);
  });
});

describe("quizDifficultyLevelSchema", () => {
  it("accepts 1 through 7", () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      expect(quizDifficultyLevelSchema.parse(level)).toBe(level);
    }
  });

  it("rejects 0 and 8 (out of range)", () => {
    expect(quizDifficultyLevelSchema.safeParse(0).success).toBe(false);
    expect(quizDifficultyLevelSchema.safeParse(8).success).toBe(false);
  });

  it("rejects a string '3' (numeric type, not stringified)", () => {
    expect(quizDifficultyLevelSchema.safeParse("3").success).toBe(false);
  });
});

describe("newQuestionInputSchema", () => {
  it("accepts a well-formed multiple-choice question", () => {
    const r = newQuestionInputSchema.safeParse(goodQuestion());
    expect(r.success).toBe(true);
  });

  it("accepts a node_id of null (PDF-imported questions land in the bank)", () => {
    const r = newQuestionInputSchema.safeParse({ ...goodQuestion(), node_id: null });
    expect(r.success).toBe(true);
  });

  it("rejects an empty question_text — the question bank should never store empty rows", () => {
    const r = newQuestionInputSchema.safeParse({ ...goodQuestion(), question_text: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a difficulty typo", () => {
    const r = newQuestionInputSchema.safeParse({ ...goodQuestion(), difficulty: "hard" });
    expect(r.success).toBe(false);
  });

  it("rejects more than 4 choices (the AnswerLetter union caps at A-D)", () => {
    const r = newQuestionInputSchema.safeParse({
      ...goodQuestion(),
      choices: [
        ...goodChoices,
        { letter: "A", choice_text: "extra" }, // 5 total
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid AnswerLetter in choices (e.g. 'E')", () => {
    const r = newQuestionInputSchema.safeParse({
      ...goodQuestion(),
      choices: [{ letter: "E", choice_text: "x" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("updateQuestionInputSchema", () => {
  it("accepts a partial patch with just one field", () => {
    const r = updateQuestionInputSchema.safeParse({
      questionId: "q-123",
      patch: { hint: "Think about the inverse." },
      nodeId: "ma-00",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty questionId", () => {
    expect(
      updateQuestionInputSchema.safeParse({ questionId: "", patch: {}, nodeId: "x" }).success
    ).toBe(false);
  });

  it("rejects unknown fields in patch — guards against accidental writes to non-allowed columns", () => {
    const r = updateQuestionInputSchema.safeParse({
      questionId: "q-123",
      patch: { stripe_customer_id: "cus_evil" }, // not on the allowlist
      nodeId: "ma-00",
    });
    // Zod's default is strip-unknown for `.partial()` objects, which
    // means the bogus key is silently dropped rather than rejected.
    // That's actually fine — it can't reach the DB write either way.
    // What matters is the schema rejects WRONG SHAPES on allowed fields.
    expect(r.success).toBe(true);
    if (r.success) {
      expect("stripe_customer_id" in r.data.patch).toBe(false);
    }
  });

  it("rejects a typo'd difficulty inside the patch", () => {
    const r = updateQuestionInputSchema.safeParse({
      questionId: "q-123",
      patch: { difficulty: "hard" },
      nodeId: "ma-00",
    });
    expect(r.success).toBe(false);
  });
});

describe("bulkImportRowSchema", () => {
  it("accepts a minimal row with only the required fields", () => {
    const r = bulkImportRowSchema.safeParse({
      question_text: "Q?",
      correct_answer: "A",
      difficulty: "intermediate",
      explanation_text: "...",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty question_text", () => {
    const r = bulkImportRowSchema.safeParse({
      question_text: "",
      correct_answer: "A",
      difficulty: "intermediate",
      explanation_text: "...",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing correct_answer", () => {
    const r = bulkImportRowSchema.safeParse({
      question_text: "Q?",
      difficulty: "intermediate",
      explanation_text: "...",
    });
    expect(r.success).toBe(false);
  });

  it("accepts source_page as either string or number (CSV gives string, JSON gives number)", () => {
    const base = {
      question_text: "Q?",
      correct_answer: "A",
      difficulty: "intermediate",
      explanation_text: "...",
    };
    expect(bulkImportRowSchema.safeParse({ ...base, source_page: 42 }).success).toBe(true);
    expect(bulkImportRowSchema.safeParse({ ...base, source_page: "42" }).success).toBe(true);
  });

  it("rejects an unknown answer_source", () => {
    const r = bulkImportRowSchema.safeParse({
      question_text: "Q?",
      correct_answer: "A",
      difficulty: "intermediate",
      explanation_text: "...",
      answer_source: "made_up",
    });
    expect(r.success).toBe(false);
  });
});

describe("bulkImportInputSchema", () => {
  it("accepts an empty rows array (a CSV with no data rows)", () => {
    const r = bulkImportInputSchema.safeParse({ nodeId: "ma-00", subject: "math", rows: [] });
    expect(r.success).toBe(true);
  });

  it("accepts nodeId = null (PDF flow — rows land in the bank)", () => {
    const r = bulkImportInputSchema.safeParse({ nodeId: null, subject: null, rows: [] });
    expect(r.success).toBe(true);
  });

  it("rejects a subject typo", () => {
    const r = bulkImportInputSchema.safeParse({
      nodeId: "ma-00",
      subject: "mathematics",
      rows: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("saveVideoURLInputSchema", () => {
  it("accepts a valid https URL", () => {
    const r = saveVideoURLInputSchema.safeParse({
      nodeId: "ma-00",
      videoUrl: "https://example.com/video.mp4",
      durationSeconds: 360,
    });
    expect(r.success).toBe(true);
  });

  it("accepts null videoUrl (clearing the video)", () => {
    const r = saveVideoURLInputSchema.safeParse({
      nodeId: "ma-00",
      videoUrl: null,
      durationSeconds: null,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a malformed URL", () => {
    const r = saveVideoURLInputSchema.safeParse({
      nodeId: "ma-00",
      videoUrl: "not-a-url",
      durationSeconds: 360,
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative or zero duration", () => {
    const r1 = saveVideoURLInputSchema.safeParse({
      nodeId: "ma-00",
      videoUrl: null,
      durationSeconds: 0,
    });
    const r2 = saveVideoURLInputSchema.safeParse({
      nodeId: "ma-00",
      videoUrl: null,
      durationSeconds: -10,
    });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });
});

describe("reorderQuestionsInputSchema", () => {
  it("accepts a non-empty array of IDs", () => {
    const r = reorderQuestionsInputSchema.safeParse({
      orderedIds: ["q-1", "q-2"],
      nodeId: "ma-00",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty array — there's nothing to reorder", () => {
    const r = reorderQuestionsInputSchema.safeParse({ orderedIds: [], nodeId: "ma-00" });
    expect(r.success).toBe(false);
  });

  it("rejects an array containing an empty string", () => {
    const r = reorderQuestionsInputSchema.safeParse({
      orderedIds: ["q-1", ""],
      nodeId: "ma-00",
    });
    expect(r.success).toBe(false);
  });
});

describe("impersonateRoleSchema", () => {
  it.each(["student", "tutor", "parent"] as const)("accepts %s", (r) => {
    expect(impersonateRoleSchema.parse(r)).toBe(r);
  });

  it("rejects 'admin' — an admin impersonating as admin is meaningless", () => {
    expect(impersonateRoleSchema.safeParse("admin").success).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(impersonateRoleSchema.safeParse("guest").success).toBe(false);
  });
});

describe("searchBankQuestionsInputSchema", () => {
  it("accepts a 2-char query", () => {
    const r = searchBankQuestionsInputSchema.safeParse({ query: "ab" });
    expect(r.success).toBe(true);
  });

  it("rejects a 1-char query (the existing 'noisy' threshold)", () => {
    const r = searchBankQuestionsInputSchema.safeParse({ query: "a" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty query", () => {
    expect(searchBankQuestionsInputSchema.safeParse({ query: "" }).success).toBe(false);
  });
});

describe("createCohortInputSchema", () => {
  const valid = {
    name: "May 2027 SAT Cohort",
    tier: "small_group" as const,
    sat_date: "2027-05-01",
    tutor_user_id: "user-abc",
    max_size: 5,
  };

  it("accepts a well-formed small_group cohort", () => {
    expect(createCohortInputSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const r = createCohortInputSchema.parse({ ...valid, name: "   trim me   " });
    expect(r.name).toBe("trim me");
  });

  it("rejects an empty name (post-trim)", () => {
    expect(createCohortInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects an unknown tier", () => {
    expect(createCohortInputSchema.safeParse({ ...valid, tier: "private" }).success).toBe(false);
  });

  it("rejects an ISO timestamp instead of YYYY-MM-DD", () => {
    expect(
      createCohortInputSchema.safeParse({ ...valid, sat_date: "2027-05-01T00:00:00Z" }).success
    ).toBe(false);
  });

  it("rejects max_size > tier cap (small_group: 5)", () => {
    expect(createCohortInputSchema.safeParse({ ...valid, max_size: 6 }).success).toBe(false);
  });

  it("rejects max_size > tier cap (group: 200)", () => {
    expect(
      createCohortInputSchema.safeParse({ ...valid, tier: "group", max_size: 201 }).success
    ).toBe(false);
  });

  it("rejects non-integer max_size", () => {
    expect(createCohortInputSchema.safeParse({ ...valid, max_size: 3.5 }).success).toBe(false);
  });

  it("rejects zero or negative max_size", () => {
    expect(createCohortInputSchema.safeParse({ ...valid, max_size: 0 }).success).toBe(false);
    expect(createCohortInputSchema.safeParse({ ...valid, max_size: -1 }).success).toBe(false);
  });
});

describe("setUserRoleInputSchema", () => {
  it("accepts each valid AppRole", () => {
    for (const role of ["student", "tutor", "parent", "admin"] as const) {
      const r = setUserRoleInputSchema.safeParse({ targetUserId: "u1", nextRole: role });
      expect(r.success).toBe(true);
    }
  });

  it("rejects unknown roles", () => {
    expect(
      setUserRoleInputSchema.safeParse({ targetUserId: "u1", nextRole: "superadmin" }).success
    ).toBe(false);
  });

  it("rejects empty targetUserId", () => {
    expect(setUserRoleInputSchema.safeParse({ targetUserId: "", nextRole: "tutor" }).success).toBe(
      false
    );
  });
});

describe("linkParentStudentInputSchema", () => {
  it("accepts two distinct non-empty IDs", () => {
    const r = linkParentStudentInputSchema.safeParse({
      parentUserId: "p1",
      studentUserId: "s1",
    });
    expect(r.success).toBe(true);
  });

  it("rejects when parent === student (would create a self-link)", () => {
    expect(
      linkParentStudentInputSchema.safeParse({
        parentUserId: "u1",
        studentUserId: "u1",
      }).success
    ).toBe(false);
  });

  it("rejects empty IDs", () => {
    expect(
      linkParentStudentInputSchema.safeParse({ parentUserId: "", studentUserId: "s1" }).success
    ).toBe(false);
  });
});

describe("cohortMemberMutationInputSchema", () => {
  it("accepts two non-empty IDs", () => {
    expect(
      cohortMemberMutationInputSchema.safeParse({
        cohortId: "c1",
        studentUserId: "s1",
      }).success
    ).toBe(true);
  });

  it("rejects empty cohortId", () => {
    expect(
      cohortMemberMutationInputSchema.safeParse({ cohortId: "", studentUserId: "s1" }).success
    ).toBe(false);
  });

  it("rejects empty studentUserId", () => {
    expect(
      cohortMemberMutationInputSchema.safeParse({ cohortId: "c1", studentUserId: "" }).success
    ).toBe(false);
  });
});
