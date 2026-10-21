import { expect, it } from "vitest";
import { usesTrig } from "./AngleBadge";

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
