import { expect, it } from "vitest";
import { usesTrig } from "./AngleBadge";
import { isRegressionParameter } from "./fraction-toggle";

it("R-11 usesTrig finds sin to cot, their arc forms and inverses, never hyperbolic names", () => {
  for (const latex of [
    "\\sin(x)",
    "y=2\\cos x",
    "\\tan^{-1}(1)",
    "\\arcsin(0.5)",
    "\\operatorname{arcsec}(2)",
    "\\csc(1)+\\cot(1)",
    "\\sec(0)",
  ])
    expect(usesTrig(latex), latex).toBe(true);
  for (const latex of ["y=x^2", "\\sinh(1)", "\\operatorname{arcsinh}(1)", "\\cosh x", "s+i+n"])
    expect(usesTrig(latex), latex).toBe(false);
});

it("R-5 isRegressionParameter matches a bare fitted name only, and only from a successful fit", () => {
  const fit = (ok: boolean) => ({
    regression: {
      result: {
        ok,
        params: [
          { name: "m", value: 2.25 },
          { name: "b", value: -1 / 3 },
        ],
      },
    },
  });
  const rows = [fit(true)] as never[];
  expect(isRegressionParameter({ latex: "m" }, rows)).toBe(true);
  expect(isRegressionParameter({ latex: " b " }, rows)).toBe(true);
  expect(isRegressionParameter({ latex: "2m" }, rows)).toBe(false);
  expect(isRegressionParameter({ latex: "" }, rows)).toBe(false);
  expect(isRegressionParameter({ latex: "m" }, [fit(false)] as never[])).toBe(false);
});
