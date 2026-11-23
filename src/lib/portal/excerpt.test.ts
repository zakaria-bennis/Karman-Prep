import { describe, expect, it } from "vitest";
import { excerpt } from "./excerpt";

describe("a question's excerpt", () => {
  it("keeps a short question whole", () => {
    expect(excerpt("What is $x$?", 50)).toBe("What is \\(x\\)?");
  });

  it("cuts at a word with an ellipsis", () => {
    expect(excerpt("The decrease in temperature each hour is steady", 30)).toBe(
      "The decrease in temperature…"
    );
  });

  it("never cuts inside math", () => {
    expect(excerpt("Solve \\(y = 5x + 7\\) and then the rest of it", 20)).toBe(
      "Solve \\(y = 5x + 7\\)…"
    );
    expect(excerpt("Solve $y = 5x + 7$ now", 8)).toBe("Solve…");
  });
});
