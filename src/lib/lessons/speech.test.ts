import { describe, expect, it } from "vitest";
import { speak, speakMath } from "./speech";

describe("lesson text read aloud", () => {
  it("reads math the way a tutor says it", () => {
    expect(speakMath("\\frac{72}{360} = \\frac{1}{5}")).toBe("72 over 360 equals 1 over 5");
    expect(speakMath("\\pi r^2")).toBe("pi r squared");
    expect(speakMath("\\sqrt{x+1}")).toBe("the square root of x plus 1");
    expect(speakMath("60^\\circ")).toBe("60 degrees");
    expect(speakMath("f(3) = -2")).toBe("f of 3 equals negative 2");
    expect(speakMath("x - 4 \\le 9")).toBe("x minus 4 is less than or equal to 9");
    expect(speakMath("40\\%")).toBe("40 percent");
  });

  it("drops the marks", () => {
    expect(speak("A **sector** has area $\\frac{1}{5} \\cdot 100\\pi$.")).toBe(
      "A sector has area 1 over 5 times 100 pi."
    );
    expect(speak("The bush ______ survives.")).toBe("The bush blank survives.");
  });
});
