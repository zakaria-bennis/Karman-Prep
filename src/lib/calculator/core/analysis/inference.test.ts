// FN-53 to FN-58: the inference errors a row shows, each with the error live Desmos (College Board
// version) gave on 2026-10-26 in the comment; Karman's own copy says the same thing.

import { describe, expect, it } from "vitest";
import { analyzeRows } from "./index";
import { evaluateLatex } from "../eval/compile";

const T = (args: string) => `T=\\operatorname{ttest}(${args})`;

function errorOf(rows: string[]): { code: string; message: string } | null {
  const a = analyzeRows(
    rows.map((latex, k) => ({ id: String(k), latex, hidden: false })),
    { angleMode: "radians", complex: false }
  );
  const last = a.rows[a.rows.length - 1];
  return last.error === null ? null : { code: last.error.code, message: last.error.message };
}

describe("inference errors (FN-53 to FN-58)", () => {
  it.each([
    // "Function '.dof' cannot be applied to a one-sample z-inference object."
    [["T=\\operatorname{ztest}([1,2,3],2)", "T.\\operatorname{dof}"], "member-target", "Can't use .dof on a one-sample z test."], // prettier-ignore
    // "Function '.lower' cannot be applied to a one-sample t-inference object."
    [[T("[1,2,3]"), "T.\\operatorname{lower}"], "member-target", "Can't use .lower on a one-sample t test."], // prettier-ignore
    // "Function '.estimate' cannot be applied to a t test."
    [[T("[1,2,3]"), "T.\\operatorname{null}(1).\\operatorname{estimate}"], "member-target", "Can't use .estimate on a t test with a null value."], // prettier-ignore
    // "Function '.score' cannot be applied to a confidence interval."
    [[T("[1,2,3]"), "T.\\operatorname{conf}(0.9).\\operatorname{score}"], "member-target", "Can't use .score on a confidence interval."], // prettier-ignore
    // "Function '.pleft' cannot be applied to a chi-square goodness of fit test."
    [["T=\\operatorname{chisqgof}([1,2,3])", "T.\\operatorname{pleft}"], "member-target", "Can't use .pleft on a χ² goodness of fit test."], // prettier-ignore
    // "Function '.conf' cannot be applied to a chi-square test for independence and a number."
    [["T=\\operatorname{chisqtest}([1,2],[3,4])", "T.\\operatorname{conf}(0.9)"], "member-target", "Can't use .conf on a χ² test for independence."], // prettier-ignore
    // "Function '.null' requires an argument. For example, try typing: .null(x)."
    [[T("[1,2,3]"), "T.\\operatorname{null}"], "arity", ".null needs an input, like .null(x)."],
    // "Function 'ttest' cannot be applied to a list of numbers and a number."
    [["\\operatorname{ttest}([1,2,3],2)"], "argument-type", "ttest can't take a list of numbers and a number."], // prettier-ignore
    // "Function 'ztest' cannot be applied to a number and a list of numbers."
    [["\\operatorname{ztest}(3,[1,2,3])"], "argument-type", "ztest can't take a number and a list of numbers."], // prettier-ignore
    // "Function 'chisqtest' requires 2 arguments. For example, try typing: chisqtest(1, 2)."
    [["\\operatorname{chisqtest}([1,2])"], "arity", "chisqtest needs 2 inputs, like chisqtest(1, 2)."], // prettier-ignore
    // "Function 'ttest' requires an argument. For example, try typing: ttest(x)."
    [["\\operatorname{ttest}()"], "arity", "ttest needs an input, like ttest(x)."],
    // "Function 'ztest' requires 2 arguments. For example, try typing: ztest(1, 2)."
    [["\\operatorname{ztest}([1,2])"], "arity", "ztest needs 2 inputs, like ztest(1, 2)."],
    // "Function 'ttest' requires 6 arguments. For example, try typing: ttest(1, 2, 3, 4, 5, 6)."
    [["\\operatorname{ttest}(10,2,3,12,4,5,7)"], "arity", "ttest needs 6 inputs, like ttest(1, 2, 3, 4, 5, 6)."], // prettier-ignore
    // "Sorry, I don't understand the way that '.' is used here." (p after a list)
    [["L=[1,2]", "L.p"], "unexpected-symbol", "'.' can't be used here."],
  ])("%j", (rows, code, message) => {
    expect(errorOf(rows)).toEqual({ code, message });
  });

  it.each([
    // "Sample for 'ttest' must have at least 2 observations."
    ["\\operatorname{ttest}([1]).p", "inference-sample"],
    ["\\operatorname{ttest}(1,2,3).p", "inference-sample"],
    ["\\operatorname{ttest}([1,2],[3]).p", "inference-sample"],
    // "Each argument of 'chisqgof' must be a list with at least 2 elements."
    ["\\operatorname{chisqgof}([1]).p", "inference-short"],
    // "Arguments of 'chisqgof' must be lists with the same length."
    ["\\operatorname{chisqgof}([1,2],[1,2,3]).p", "inference-lengths"],
    // "Arguments of 'chisqtest' must be lists with the same length."
    ["\\operatorname{chisqtest}([1,2],[3]).p", "inference-lengths"],
  ])("%s is the value error %s", (latex, code) => {
    expect(evaluateLatex(latex)).toEqual({ type: "undefined", error: code });
  });

  it("a test row has no error, and arithmetic on one is refused", () => {
    expect(errorOf([T("[1,2,3]")])).toBeNull();
    expect(errorOf([T("[1,2,3]"), "T+1"])).toEqual({
      code: "add-types",
      message: "Can't add a one-sample t test and a number.",
    });
  });
});
