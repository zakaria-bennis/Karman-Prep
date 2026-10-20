import { expect, it } from "vitest";
import { nextSequenceTerm } from "./next-term";

it("RT-7 Enter continues an arithmetic first column, else leaves the new cell blank", () => {
  expect(nextSequenceTerm([-2, -1, 0, 1, 2])).toBe("3");
  expect(nextSequenceTerm([0.1, 0.2, 0.3])).toBe("0.4");
  expect(nextSequenceTerm([10, 7, 4])).toBe("1");
  expect(nextSequenceTerm([5, 5])).toBe("5");
  expect(nextSequenceTerm([1, 2, 3])).toBe("4");
  expect(nextSequenceTerm([1 / 3, 2 / 3])).toBe("\\frac{3}{3}");
  expect(nextSequenceTerm([1])).toBeNull();
  expect(nextSequenceTerm([1, 2, 4])).toBeNull();
  expect(nextSequenceTerm([Math.PI, 2 * Math.PI])).toBeNull();
  expect(nextSequenceTerm([0.33333333, 0.66666666])).toBeNull();
  expect(nextSequenceTerm([1, null])).toBeNull();
});
