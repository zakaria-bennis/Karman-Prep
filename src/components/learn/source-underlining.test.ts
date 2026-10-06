import { describe, expect, it } from "vitest";
import { parseSourceUnderlining } from "./source-underlining";

describe("source underlining", () => {
  it("preserves the exact marked clause and surrounding punctuation", () => {
    expect(parseSourceUnderlining("Before; [[u]]the target clause.[[/u]] After.")).toEqual([
      { text: "Before; ", underlined: false },
      { text: "the target clause.", underlined: true },
      { text: " After.", underlined: false },
    ]);
  });
  it("supports multiple separate spans without expanding their boundaries", () => {
    expect(
      parseSourceUnderlining("[[u]]one[[/u]], then [[u]]two[[/u]].")
        .filter((r) => r.underlined)
        .map((r) => r.text)
    ).toEqual(["one", "two"]);
  });
  it.each(["[[u]]unclosed", "orphan[[/u]]", "[[u]]nested [[u]]text[[/u]][[/u]]", "[[u]][[/u]]"])(
    "preserves malformed formatting literally: %s",
    (text) => {
      expect(parseSourceUnderlining(text)).toEqual([{ text, underlined: false }]);
    }
  );
  it("leaves ordinary bracketed source words unchanged", () => {
    const text = "[Katharine's] descent and [a celebrated poet].";
    expect(parseSourceUnderlining(text)).toEqual([{ text, underlined: false }]);
  });
});
