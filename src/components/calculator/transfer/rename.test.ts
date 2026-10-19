import { expect, it } from "vitest";
import { nameBase, renameName } from "./rename";

it("TR-36 renameName replaces every identifier occurrence and nothing inside commands, environments or other names", () => {
  const rows: [string, string, string, string][] = [
    ["g(x)=f(x)+3", "f", "f_{2}", "g(x)=f_{2}(x)+3"],
    ["f(x)=x^{2}", "f", "f_{2}", "f_{2}(x)=x^{2}"],
    ["a=2", "a", "a_{2}", "a_{2}=2"],
    ["y=ax+\\frac{a}{2}", "a", "a_{3}", "y=a_{3}x+\\frac{a_{3}}{2}"],
    ["x_1=2", "x_{1}", "x_{2}", "x_{2}=2"],
    ["y=x_{a}+a", "a", "a_{2}", "y=x_{a}+a_{2}"],
    ["\\log_{a}x+\\sqrt[a]{8}", "a", "a_{2}", "\\log_{a_{2}}x+\\sqrt[a_{2}]{8}"],
    ["\\alpha+\\alpha_{1}", "\\alpha", "\\alpha_{2}", "\\alpha_{2}+\\alpha_{1}"],
    ["\\sin(s)+\\cos s", "s", "s_{2}", "\\sin(s_{2})+\\cos s_{2}"],
    ["\\left|c\\right|", "c", "c_{2}", "\\left|c_{2}\\right|"],
    [
      "\\begin{cases}a=2\\\\y=ax\\end{cases}",
      "a",
      "a_{2}",
      "\\begin{cases}a_{2}=2\\\\y=a_{2}x\\end{cases}",
    ],
  ];
  for (const [latex, from, to, out] of rows) expect(renameName(latex, from, to), latex).toBe(out);
  expect(renameName("x\\ne3", "x", "x_{2}")).toBeNull();
  expect([nameBase("a_{1}"), nameBase("v_{max}"), nameBase("\\alpha_{2}"), nameBase("f")]).toEqual([
    "a",
    "v",
    "\\alpha",
    "f",
  ]);
});
