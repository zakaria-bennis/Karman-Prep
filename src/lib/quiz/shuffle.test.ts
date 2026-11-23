import { describe, expect, it } from "vitest";
import {
  choiceOrder,
  hash32,
  letterMap,
  remapLetterMentions,
  reviewForDisplay,
  shuffleQuestion,
  toDisplay,
  toOriginal,
} from "./shuffle";
import { FIXTURE, longSet } from "../../../tests/quiz-shell/fixture/questions";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

const LETTERS = ["A", "B", "C", "D"];

describe("choiceOrder", () => {
  it("is the same every time for the same seed and question", () => {
    const first = choiceOrder("student-1", "q-1", LETTERS);
    for (let i = 0; i < 5; i++) expect(choiceOrder("student-1", "q-1", LETTERS)).toEqual(first);
    // the order the letters arrive in changes nothing
    expect(choiceOrder("student-1", "q-1", ["D", "B", "A", "C"])).toEqual(first);
  });

  it("is always a true reordering of the question's own letters", () => {
    for (let i = 0; i < 300; i++) {
      const order = choiceOrder("seed", `q-${i}`, LETTERS);
      expect([...order].sort()).toEqual(LETTERS);
    }
    expect(choiceOrder("seed", "q", ["A", "B", "C", "D", "E"]).sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("changes with the seed and with the question", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 40; i++) orders.add(choiceOrder(`student-${i}`, "q-1", LETTERS).join(""));
    expect(orders.size).toBeGreaterThan(10);
    const byQuestion = new Set<string>();
    for (let i = 0; i < 40; i++)
      byQuestion.add(choiceOrder("student-1", `q-${i}`, LETTERS).join(""));
    expect(byQuestion.size).toBeGreaterThan(10);
  });

  it("puts each letter in each place about as often (a fair shuffle)", () => {
    const counts = LETTERS.map(() => [0, 0, 0, 0]);
    const runs = 8000;
    for (let i = 0; i < runs; i++) {
      choiceOrder("kp", `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, LETTERS).forEach(
        (letter, place) => counts[LETTERS.indexOf(letter)][place]++
      );
    }
    for (const row of counts)
      for (const n of row) {
        expect(n / runs).toBeGreaterThan(0.22);
        expect(n / runs).toBeLessThan(0.28);
      }
  });

  it("hashes the same way everywhere", () => {
    expect(hash32("")).toBe(0x811c9dc5);
    expect(hash32("a")).toBe(0xe40c292c);
  });
});

describe("letterMap", () => {
  it("letters by place and maps back to the question's own letters", () => {
    const map = letterMap(["C", "A", "D", "B"]);
    expect(map.order).toEqual(["C", "A", "D", "B"]);
    // C is shown first, so it is shown as A; A second, as B; and so on
    expect(map.display).toEqual({ C: "A", A: "B", D: "C", B: "D" });
    expect(map.original).toEqual({ A: "C", B: "A", C: "D", D: "B" });
    for (const letter of LETTERS) {
      expect(toOriginal(map, toDisplay(map, letter))).toBe(letter);
      expect(toDisplay(map, toOriginal(map, letter))).toBe(letter);
    }
  });

  it("leaves anything that is not a letter of the question alone", () => {
    const map = letterMap(["B", "A"]);
    expect(toDisplay(map, "12")).toBe("12");
    expect(toOriginal(map, "")).toBe("");
    expect(toDisplay(map, null)).toBeNull();
    expect(toDisplay(null, "A")).toBe("A");
    expect(toOriginal(map, "toString")).toBe("toString");
  });
});

describe("shuffleQuestion", () => {
  const math = FIXTURE[1].q;

  it("re-letters by place and keeps each choice's own text and id", () => {
    const { question, map } = shuffleQuestion(math, "student-1");
    expect(map).not.toBeNull();
    expect(question.answer_choices.map((c) => c.letter)).toEqual(LETTERS);
    question.answer_choices.forEach((shown, place) => {
      const own = math.answer_choices.find((c) => c.letter === map!.order[place])!;
      expect(shown.choice_text).toBe(own.choice_text);
      expect(shown.id).toBe(own.id);
    });
    // the host's question is never changed
    expect(math.answer_choices.map((c) => c.letter)).toEqual(LETTERS);
    expect(question).not.toBe(math);
  });

  it("is the same for the same student and differs between students", () => {
    const one = shuffleQuestion(math, "student-1").question.answer_choices.map((c) => c.id);
    expect(shuffleQuestion(math, "student-1").question.answer_choices.map((c) => c.id)).toEqual(
      one
    );
    const others = new Set<string>();
    for (let i = 0; i < 30; i++)
      others.add(
        shuffleQuestion(math, `student-${i}`)
          .question.answer_choices.map((c) => c.id)
          .join()
      );
    expect(others.size).toBeGreaterThan(5);
  });

  it("never moves a typed answer, and does nothing without a seed", () => {
    const typed = FIXTURE[4].q;
    expect(shuffleQuestion(typed, "student-1")).toEqual({ question: typed, map: null });
    expect(shuffleQuestion(math, undefined)).toEqual({ question: math, map: null });
    expect(shuffleQuestion(math, "")).toEqual({ question: math, map: null });
  });

  it("keeps the order when a choice points at others by place", () => {
    const q = longSet(1)[0].q;
    const pointing: StudentQuizQuestion = {
      ...q,
      answer_choices: q.answer_choices.map((c, i) =>
        i === 3 ? { ...c, choice_text: "Both A and B" } : c
      ),
    };
    expect(shuffleQuestion(pointing, "student-1").map).toBeNull();
    const above = {
      ...q,
      answer_choices: q.answer_choices.map((c, i) =>
        i === 3 ? { ...c, choice_text: "None of the above" } : c
      ),
    };
    expect(shuffleQuestion(above, "student-1").map).toBeNull();
  });

  it("moves table choices with their tables", () => {
    const table = FIXTURE[3].q;
    const { question, map } = shuffleQuestion(table, "student-9");
    question.answer_choices.forEach((shown, place) => {
      const own = table.answer_choices.find((c) => c.letter === map!.order[place])!;
      expect(shown.choice_table_data).toBe(own.choice_table_data);
    });
  });
});

describe("remapLetterMentions", () => {
  // A is shown as C, B as A, C as D, D as B
  const display = letterMap(["B", "D", "A", "C"]).display;
  const remap = (text: string) => remapLetterMentions(text, display);

  it("changes every way a choice is named by its letter", () => {
    expect(remap("Choice B is correct.")).toBe("Choice A is correct.");
    expect(remap("choice (B) is correct")).toBe("choice (A) is correct");
    expect(remap("Option B and option (C)")).toBe("Option A and option (D)");
    expect(remap("Choices A, B, and D are incorrect.")).toBe("Choices C, A, and B are incorrect.");
    expect(remap("Choices A and C fail.")).toBe("Choices C and D fail.");
    expect(remap("The correct answer is B.")).toBe("The correct answer is A.");
    expect(remap("Answer choice D")).toBe("Answer choice B");
    expect(remap("Answer: C")).toBe("Answer: D");
    expect(remap("so the answer is (A).")).toBe("so the answer is (C).");
    expect(remap("Choice B's claim")).toBe("Choice A's claim");
  });

  it("changes a lone letter in brackets, a letter that starts a line, and a bare verdict", () => {
    expect(remap("It is (B), since")).toBe("It is (A), since");
    expect(remap("(D) fits best.")).toBe("(B) fits best.");
    expect(remap("A. Too broad.\nB) Right.\nC: Too narrow.")).toBe(
      "C. Too broad.\nA) Right.\nD: Too narrow."
    );
    expect(remap("Choice B is right; C and D are incorrect.")).toBe(
      "Choice A is right; D and B are incorrect."
    );
    expect(remap("A is the best answer.")).toBe("C is the best answer.");
    expect(remap("so μ < 11.6. So D must be true.")).toBe("so μ < 11.6. So B must be true.");
    expect(remap("B cannot be true, and C is false.")).toBe("A cannot be true, and D is false.");
  });

  it("swaps all letters at once", () => {
    const swapAB = letterMap(["B", "A", "C", "D"]).display;
    expect(remapLetterMentions("Choice A, not choice B.", swapAB)).toBe("Choice B, not choice A.");
  });

  it("leaves words, functions and math alone", () => {
    const untouched = [
      "A student measured the plants.",
      "So P(A) = 0.3 and f(B) = 2.",
      "Choice Analysis shows a choice (Dark mode).",
      "Point A is the right angle of triangle ABC.",
      "Which choice best describes the data?",
      "B12 vitamins and Area A.",
      "$3x + 7 = 22$",
    ];
    for (const text of untouched) expect(remap(text)).toBe(text);
  });

  it("does nothing to empty text", () => {
    expect(remap("")).toBe("");
  });
});

describe("reviewForDisplay", () => {
  const map = letterMap(["C", "A", "D", "B"]);
  const review: StudentQuizReview = {
    correct_answer: "C",
    numeric_tolerance: null,
    explanation_text: "Choice C matches the passage. Choice A is too broad.",
    explanation_per_choice: { A: "Too broad; unlike choice C.", C: "Right." },
    desmos_strategy: "Graph choice D and choice B.",
    isCorrect: false,
    studentAnswer: "A",
  };

  it("re-letters the answers, the notes on each choice and the explanations", () => {
    const shown = reviewForDisplay(review, map);
    expect(shown.correct_answer).toBe("A");
    expect(shown.studentAnswer).toBe("B");
    expect(shown.explanation_text).toBe("Choice A matches the passage. Choice B is too broad.");
    expect(shown.explanation_per_choice).toEqual({ B: "Too broad; unlike choice A.", A: "Right." });
    expect(shown.desmos_strategy).toBe("Graph choice C and choice D.");
    expect(shown.isCorrect).toBe(false);
    // the host's review is never changed
    expect(review.correct_answer).toBe("C");
  });

  it("is the same review when nothing moved", () => {
    expect(reviewForDisplay(review, null)).toBe(review);
  });

  it("copes with missing notes", () => {
    const bare = { ...review, explanation_per_choice: null, desmos_strategy: null };
    const shown = reviewForDisplay(bare, map);
    expect(shown.explanation_per_choice).toBeNull();
    expect(shown.desmos_strategy).toBeNull();
  });
});
