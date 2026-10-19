import { expect, it } from "vitest";
import { functionDefinitionHead } from "./function-head";

it("PR-23 functionDefinitionHead finds f(p1,…,pn)= heads for single letters", () => {
  expect(
    ["f(x)=x^{2}", "g(a,b)=a+b", "P(t)=500(1.03)^{t}", "f_{1}(x)=x", "f\\left(x\\right)=x"].map(
      functionDefinitionHead
    )
  ).toEqual([
    { name: "f", params: ["x"] },
    { name: "g", params: ["a", "b"] },
    { name: "P", params: ["t"] },
    { name: "f_{1}", params: ["x"] },
    { name: "f", params: ["x"] },
  ]);
  expect(
    [
      "y=2x",
      "f(2)=3",
      "f(x)",
      "f(x)<3",
      "a(x-h)^{2}+k=y",
      "f(xy)=1",
      "ln(x)=2",
      "",
      "\\alpha(x)=x",
      "f(\\theta)=\\theta",
    ].map(functionDefinitionHead)
  ).toEqual(Array(10).fill(null)); // the last two: G15, Latin-only heads
});
