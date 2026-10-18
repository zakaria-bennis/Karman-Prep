import { expect, it } from "vitest";
import { tableHeaderFor } from "./table-from-row";

const fns = new Set(["f", "g"]);

it("D-13 Create table from y=x^2 inserts x1 -2 to 2 and a computed x1^2 column in the row's colour", () => {
  expect(tableHeaderFor("y=x^2+x_{2}", fns)?.("x_{1}")).toBe("x_{1}^{2}+x_{2}");
  expect(tableHeaderFor("y=\\exp\\left(x\\right)", fns)?.("x_{3}")).toBe(
    "\\exp\\left(x_{3}\\right)"
  );
});

it("D-13 f(x)=E heads the computed column f(x1)", () => {
  expect(tableHeaderFor("f\\left(x\\right)=2x", fns)?.("x_{1}")).toBe("f\\left(x_{1}\\right)");
  expect(tableHeaderFor("g\\left(t\\right)=t^2", fns)?.("x_{1}")).toBe("g\\left(x_{1}\\right)");
});

it("D-13 other rows offer no table", () => {
  for (const latex of [
    "x=3",
    "y>x",
    "x^2+y^2=1",
    "(1,2)",
    "",
    "a=2",
    "y=",
    "f\\left(x,y\\right)=x",
  ])
    expect(tableHeaderFor(latex, fns)).toBeNull();
});
