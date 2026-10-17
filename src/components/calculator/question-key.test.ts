import { expect, it } from "vitest";
import { makeQuestionKey, questionIdFromKey } from "./question-key";

it("AR-58 a question key joins session and question ids and gives the question id back", () => {
  expect(makeQuestionKey("attempt-1", "q3")).toBe("attempt-1:q3");
  expect(questionIdFromKey("attempt-1:q3")).toBe("q3");
  expect(questionIdFromKey("2026-10-16:abc:def")).toBe("abc:def");
  expect(questionIdFromKey("q7")).toBe("q7");
});
