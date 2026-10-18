import { expect, it } from "vitest";
import { splitMathText } from "../../components/learn/math-segments";
import { loneName, proseFunctionNames } from "./names";

const p = (text: string) => [...proseFunctionNames(splitMathText(text, false, true, true))].sort();

it("TR-19 a name directly after 'function' or 'functions' in prose is a question function name", () => {
  expect(p("the function $f$ is linear")).toEqual(["f"]);
  expect(p("functions $f$ and $g$ are defined")).toEqual(["f", "g"]);
  expect(p("functions $f$, $g$, and $h$")).toEqual(["f", "g", "h"]);
  expect(p("The function f is defined by")).toEqual(["f"]);
  expect(p("The function <i>f</i> is defined by")).toEqual(["f"]);
  expect(p("the function <i>$g$</i> is linear")).toEqual(["g"]);
  expect(p("Functions p and q")).toEqual(["p", "q"]);
  expect(p("the function $f(x)$ above")).toEqual(["f"]);
  expect(p("the function's graph, a functional $k$, the function below, function $y=2x$")).toEqual(
    []
  );
  expect([
    loneName("f"),
    loneName("f_{1}"),
    loneName("g(x)"),
    loneName("2f"),
    loneName("y=f(x)"),
  ]).toEqual(["f", "f_{1}", "g", null, null]);
});
