import { describe, expect, it } from "vitest";
import { countParts } from "./count";

describe("countParts", () => {
  it("counts whole numbers, signs, dollars and percents", () => {
    expect(countParts(1340)).toEqual({ pre: "", value: 1340, post: "" });
    expect(countParts("62%")).toEqual({ pre: "", value: 62, post: "%" });
    expect(countParts("+40")).toEqual({ pre: "+", value: 40, post: "" });
    expect(countParts("$39")).toEqual({ pre: "$", value: 39, post: "" });
    expect(countParts(-5)).toEqual({ pre: "-", value: 5, post: "" });
    // JSX splits {n}% and +{n} into pieces.
    expect(countParts([62, "%"])).toEqual({ pre: "", value: 62, post: "%" });
    expect(countParts(["+", 15])).toEqual({ pre: "+", value: 15, post: "" });
  });

  it("leaves everything else as written", () => {
    expect(countParts(2.5)).toBeNull();
    expect(countParts("1,340")).toBeNull();
    expect(countParts("12m")).toBeNull();
    expect(countParts("3 of 10")).toBeNull();
    expect(countParts(["3", " of ", "10"])).toBeNull();
    expect(countParts([2.5, "%"])).toBeNull();
    expect(countParts(null)).toBeNull();
  });
});
