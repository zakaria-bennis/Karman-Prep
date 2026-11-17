import { describe, expect, it } from "vitest";
import { tidyMathText } from "./tidy-math";

describe("math typed as plain text in an answer", () => {
  it("closes the gap between a number and a letter with a power", () => {
    expect(tidyMathText("−9 x⁶ + 6 x³ + x + 2")).toBe("−9x⁶ + 6x³ + x + 2");
  });
  it("puts a space after a minus stuck to the next term", () => {
    expect(tidyMathText("−9 x⁶ + 6 x³ −13x + 6")).toBe("−9x⁶ + 6x³ − 13x + 6");
  });
  it("leaves evenly typed math as it is", () => {
    expect(tidyMathText("−3x⁹ − 13x − 6")).toBe("−3x⁹ − 13x − 6");
    expect(tidyMathText("−8x⁶ + 3x³ + 4x + 1")).toBe("−8x⁶ + 3x³ + 4x + 1");
  });
  it("leaves a leading negative number, prose and LaTeX alone", () => {
    expect(tidyMathText("−13")).toBe("−13");
    expect(tidyMathText("The graph has 3 x-intercepts")).toBe("The graph has 3 x-intercepts");
    expect(tidyMathText("It rose from 5 to 12 points")).toBe("It rose from 5 to 12 points");
    expect(tidyMathText("\\(10x^{8} + 2 x^{6}\\)")).toBe("\\(10x^{8} + 2 x^{6}\\)");
  });
});
