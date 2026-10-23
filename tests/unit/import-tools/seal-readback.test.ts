import { describe, expect, it } from "vitest";
import { namesQuestion } from "../../../scripts/import-tools/ts/seal-readback";

// Synthetic ids only.
describe("seal-readback: the evidence names this question", () => {
  it("accepts question_id, stable_question_id or both when they equal the stable id", () => {
    expect(namesQuestion({ question_id: "SYN_Q01" }, "SYN_Q01")).toBe(true);
    expect(namesQuestion({ stable_question_id: "SYN_Q01" }, "SYN_Q01")).toBe(true);
    expect(
      namesQuestion({ question_id: "SYN_Q01", stable_question_id: "SYN_Q01" }, "SYN_Q01")
    ).toBe(true);
  });

  it("refuses evidence that names no question or another one", () => {
    expect(namesQuestion({}, "SYN_Q01")).toBe(false);
    expect(namesQuestion({ question_id: "SYN_Q02" }, "SYN_Q01")).toBe(false);
    expect(namesQuestion({ stable_question_id: "SYN_Q02" }, "SYN_Q01")).toBe(false);
    expect(
      namesQuestion({ question_id: "SYN_Q01", stable_question_id: "SYN_Q02" }, "SYN_Q01")
    ).toBe(false);
  });
});
