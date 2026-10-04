import { describe, expect, it } from "vitest";
import { evaluateQuizAnswer, prepareQuizSession, selectNextQuestion } from "./quiz-session";
import type { QuestionResponse, QuizQuestionWithChoices } from "@/types/quiz";

const question = (id: string, level = 1): QuizQuestionWithChoices =>
  ({
    id,
    difficulty_level: level,
    display_order: Number(id.slice(1)),
    difficulty: "foundational",
  }) as QuizQuestionWithChoices;
const response = (id: string, correct: boolean): QuestionResponse =>
  ({
    question_id: id,
    student_answer: "A",
    is_correct: correct,
    response_time_seconds: 3,
  }) as QuestionResponse;

describe("quiz session planning", () => {
  it("does not create an active question for an empty node", () => {
    const plan = prepareQuizSession([], []);
    expect(plan.targetLength).toBe(0);
    expect(plan.next).toBeNull();
  });

  it("uses the distinct available pool when fewer than ten questions exist", () => {
    const plan = prepareQuizSession([question("q1"), question("q2"), question("q2")], []);
    expect(plan.targetLength).toBe(2);
    expect(plan.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(plan.next?.id).toBe("q1");
  });

  it("never selects an already used question, even when it is the closest difficulty", () => {
    expect(selectNextQuestion([question("q1", 1), question("q2", 3)], 1, new Set(["q1"]))?.id).toBe(
      "q2"
    );
    expect(selectNextQuestion([question("q1")], 1, new Set(["q1"]))).toBeNull();
  });

  it("resumes after saved answers and completes an exhausted pool", () => {
    const questions = [question("q1"), question("q2"), question("q3")];
    const resumed = prepareQuizSession(questions, [response("q1", true), response("q2", false)]);
    expect(resumed.answeredQuestions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(resumed.next?.id).toBe("q3");
    const exhausted = prepareQuizSession(questions, [
      response("q1", true),
      response("q2", false),
      response("q3", true),
    ]);
    expect(exhausted.next).toBeNull();
    expect(exhausted.responses).toHaveLength(3);
  });

  it("ignores duplicated and withdrawn response rows during resume", () => {
    const plan = prepareQuizSession(
      [question("q1"), question("q2")],
      [response("q1", true), response("q1", false), response("withdrawn", true)]
    );
    expect(plan.responses).toHaveLength(1);
    expect(plan.next?.id).toBe("q2");
  });

  it("evaluates numeric fractions without accepting blank or malformed entries", () => {
    const numeric = {
      ...question("q1"),
      answer_format: "numeric_entry" as const,
      correct_answer: "1/2",
      numeric_tolerance: 0,
    };
    expect(evaluateQuizAnswer("0.5", numeric)).toBe(true);
    expect(evaluateQuizAnswer("", numeric)).toBe(false);
    expect(evaluateQuizAnswer("0.5 points", numeric)).toBe(false);
  });
});
