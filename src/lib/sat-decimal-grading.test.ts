import { describe, expect, it } from "vitest";
import { evaluateQuizAnswer } from "./quiz-session";
import type { QuizQuestionWithChoices } from "@/types/quiz";

/**
 * The 51 live typed-answer questions the 2026-10-26 audit found rejecting
 * SAT-valid decimal entries: [id prefix, stored key, tolerance, reviewed
 * answer set, entries that were wrongly marked incorrect].
 */
const AUDIT_CASES: [string, string, number | null, string[], string[]][] = [
  ["0114324b", "2/7", 0, ["2/7"], [".2857", "0.285", "0.286"]],
  ["04d893b6", "47/3", 0, ["47/3"], ["15.66", "15.67"]],
  ["05099df5", "14/3", 0, ["14/3"], ["4.666", "4.667"]],
  ["0567fe4a", "76/3", 0, ["76/3"], ["25.33"]],
  ["073994b4", "-1/3", 0, ["-1/3"], ["-.3333", "-0.333"]],
  ["083ac270", "1/3", 0, ["1/3"], [".3333", "0.333"]],
  ["084160c3", "1/33", 0, ["1/33"], [".0303", "0.030"]],
  ["08507072", "-12/7", null, ["-12/7"], ["-1.714"]],
  ["0bd122fa", "17/3", 0, ["17/3"], ["5.666", "5.667"]],
  ["0e053786", "5/21", 0, ["5/21"], [".2380", ".2381", "0.238"]],
  ["12cf0af2", "21/29", 0, ["21/29"], [".7241", "0.724"]],
  ["18b673e5", "1/27", null, ["1/27"], [".0370", "0.037"]],
  ["2a770c2d", "1/46", 0, ["1/46"], [".0217", "0.021", "0.022"]],
  ["30b071c8", "4/31", 0, ["4/31"], [".1290", "0.129"]],
  ["367f4e2b", "2/3", 0, ["2/3"], [".6666", ".6667", "0.666", "0.667"]],
  ["3859cd95", "170/9", 0, ["170/9"], ["18.88", "18.89"]],
  ["3bf4377b", "36/13", 0, ["36/13"], ["2.769"]],
  ["3cd1f4c9", "-13/14", 0, ["-13/14", "-.9285", "-.9286"], ["-0.928", "-0.929"]],
  ["3d5c1bce", "1/6", 0, ["1/6", "0.166"], [".1666", ".1667", "0.167"]],
  ["3f3d0804", "13/12", 0, ["13/12"], ["1.083"]],
  ["3fc9ceb1", "5/19", 0, ["5/19"], [".2631", ".2632", "0.263"]],
  ["419bcfe7", "8/11", 0, ["8/11", "0.7272", "0.7273"], ["0.727"]],
  ["465f0e92", "4/225", null, ["4/225"], [".0177", ".0178", "0.017", "0.018"]],
  ["4b0453ec", "22/3", null, ["22/3"], ["7.333"]],
  ["4e6147f0", "35/12", 0, ["35/12"], ["2.916", "2.917"]],
  ["59b74555", "5/3", 0, ["5/3", "1.666"], ["1.667"]],
  ["5b72c5f1", "52/3", 0, ["52/3"], ["17.33"]],
  ["6390546b", "5/72", 0, ["5/72"], [".0694", "0.069"]],
  ["64574ec2", "5/12", 0, ["5/12", ".4166", ".4167"], ["0.416", "0.417"]],
  ["6a86537c", "-5/9", 0, ["-5/9", "-.5555", "-.5556"], ["-0.555", "-0.556"]],
  ["713db755", "1/17", 0, ["1/17"], [".0588", "0.058", "0.059"]],
  ["71957834", "26/3", null, ["26/3"], ["8.666", "8.667"]],
  ["7f09b85d", "-187/2700", 0, ["-187/2700"], ["-.0692", "-.0693", "-0.069"]],
  ["88b8556b", "5/9", 0, ["5/9", ".5555", ".5556"], ["0.555", "0.556"]],
  ["8a74eb27", "61/65", 0, ["61/65"], [".9384", ".9385", "0.938"]],
  ["94a01a17", "93/95", 0, ["93/95"], [".9789", "0.978", "0.979"]],
  ["a240d55e", "72/7", 0, ["72/7"], ["10.28", "10.29"]],
  ["a30a2c02", "50/3", 0, ["50/3"], ["16.66", "16.67"]],
  ["a9bfab20", "292/3", null, ["292/3"], ["97.33"]],
  ["acd9bcc6", "7/13", 0, ["7/13"], [".5384", ".5385", "0.538"]],
  ["b5571e44", "44/3", null, ["44/3"], ["14.66", "14.67"]],
  ["c682f3a0", "3.1205", null, ["3.1205"], ["3.120", "3.121"]],
  ["c710ecca", "16/3", 0, ["16/3"], ["5.333"]],
  ["cad3ac3b", "66/67", 0, ["66/67"], [".9850", ".9851", "0.985"]],
  ["cf5a0ecd", "36/13", 0, ["36/13"], ["2.769"]],
  ["d794516a", "116.82", 0, ["116.82", "116.823"], ["116.8"]],
  ["da95b329", "23/30", 0, ["23/30"], [".7666", ".7667", "0.766", "0.767"]],
  ["dcd9b26f", "1/56", null, ["1/56"], [".0178", ".0179", "0.017", "0.018"]],
  ["dfcd6dda", "1/12", 0, ["1/12"], [".0833", "0.083"]],
  ["eb7b7b6f", "441/677", 0, ["441/677", "0.651"], [".6514"]],
  ["f5387b46", "5/72", 0, ["5/72"], [".0694", "0.069"]],
];

const numericQuestion = (key: string, tolerance: number | null, set: string[]) =>
  ({
    id: "q1",
    answer_format: "numeric_entry",
    correct_answer: key,
    numeric_tolerance: tolerance,
    reviewed_numeric_answers: set,
  }) as unknown as QuizQuestionWithChoices;

describe("SAT decimal grading for the audited questions", () => {
  it("covers all 51 audited questions", () => {
    expect(AUDIT_CASES).toHaveLength(51);
  });

  it.each(AUDIT_CASES)("%s (%s) accepts the SAT-valid decimals", (_id, key, tol, set, entries) => {
    const question = numericQuestion(key, tol, set);
    for (const entry of entries) expect(evaluateQuizAnswer(entry, question), entry).toBe(true);
  });

  it.each(AUDIT_CASES)("%s (%s) still accepts its key and answer set", (_id, key, tol, set) => {
    const question = numericQuestion(key, tol, set);
    for (const answer of [key, ...set]) expect(evaluateQuizAnswer(answer, question)).toBe(true);
  });

  it.each(AUDIT_CASES)("%s (%s) rejects short or wrong decimals", (_id, key, tol, set, entries) => {
    const question = numericQuestion(key, tol, set);
    // A reviewed set may list a shorter decimal on purpose (1/6 lists 0.166); that stays.
    const reviewed = (entry: string) => set.some((answer) => Number(answer) === Number(entry));
    for (const entry of entries) {
      const shorter = entry.slice(0, -1);
      if (!reviewed(shorter)) expect(evaluateQuizAnswer(shorter, question), shorter).toBe(false);
      const last = Number(entry.at(-1));
      const offByTwo = `${shorter}${last + 2}`;
      if (last <= 7 && !entries.includes(offByTwo) && !reviewed(offByTwo))
        expect(evaluateQuizAnswer(offByTwo, question), offByTwo).toBe(false);
    }
  });
});

describe("SAT decimal grading keeps existing behaviour", () => {
  it("accepts equivalent fractions and still rejects 0.28 for 2/7", () => {
    const question = numericQuestion("2/7", 0, ["2/7"]);
    expect(evaluateQuizAnswer("4/14", question)).toBe(true);
    expect(evaluateQuizAnswer("2/7", question)).toBe(true);
    expect(evaluateQuizAnswer("0.28", question)).toBe(false);
    expect(evaluateQuizAnswer("0.29", question)).toBe(false);
    expect(evaluateQuizAnswer(".285", question)).toBe(false);
    expect(evaluateQuizAnswer("1 2/7", question)).toBe(false);
  });

  it("falls back to the stored key when there is no reviewed set", () => {
    const question = { ...numericQuestion("2/3", null, []), reviewed_numeric_answers: undefined };
    expect(evaluateQuizAnswer("0.667", question)).toBe(true);
    expect(evaluateQuizAnswer("0.67", question)).toBe(false);
  });

  it("keeps tolerance-based grading", () => {
    const question = numericQuestion("2.5", 0.1, ["2.5"]);
    expect(evaluateQuizAnswer("2.45", question)).toBe(true);
    expect(evaluateQuizAnswer("2.7", question)).toBe(false);
  });

  it("does not shorten keys that fit in the box", () => {
    const question = numericQuestion("0.125", 0, ["0.125"]);
    expect(evaluateQuizAnswer(".125", question)).toBe(true);
    expect(evaluateQuizAnswer("1/8", question)).toBe(true);
    expect(evaluateQuizAnswer("0.13", question)).toBe(false);
    expect(evaluateQuizAnswer("0.12", question)).toBe(false);
  });
});
