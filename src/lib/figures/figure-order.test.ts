import { describe, expect, it } from "vitest";
import { figureLeadsText } from "./figure-order";

describe("figureLeadsText", () => {
  it("puts the figure first for Reading and Writing only", () => {
    expect(figureLeadsText("reading")).toBe(true);
    expect(figureLeadsText("math")).toBe(false);
    expect(figureLeadsText(null)).toBe(false);
  });
});
