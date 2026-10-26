// Test-only: live Desmos's error wording (captured 2026-10-19 to 2026-10-20) and its translation
// into Karman's own short copy (owner decision, 2026-10-21). The reference parity tests keep the
// captured Desmos texts as they were recorded and compare the engine's message with the
// translation, so they still check the error and the names it carries. Never imported by
// production code.

import type { RowErrorCode } from "../../corpus/types";
import { rowErrorMessage, tooManyVariables } from "../messages";

const DESMOS: Readonly<Record<RowErrorCode, string>> = {
  syntax: "Sorry, I don't understand this.",
  unsupported: "This calculator doesn't support that notation.",
  "point-arity": "Points may only have 2 coordinates.",
  "point-syntax": "Points are written like this: (1, 2).",
  "relation-chain": "Cannot mix inequalities and equations in a chain of comparisons.",
  "relation-side": "You need something on both sides of the '{n}' symbol.",
  "too-many-nodes": "This row is too long to evaluate. Split it into smaller definitions.",
  "too-deep": "This row is nested too deeply.",
  "sim-side": "You need something on both sides of the '{n}' symbol.",
  "function-parentheses": "'{n}' is a function. Try using parentheses.",
  "argument-parentheses": "Use parentheses around the argument of '{n}'.",
  "comma-side": "You need something on both sides of the ',' symbol.",
  "range-bound": "Range must have an upper and lower bound.",
  "log-power": "Only {n}^2 is supported. Otherwise, use parens.",
  "trig-power": "Only {n}^2 and {n}^-1 are supported. Otherwise, use parens.",
  "empty-subscript": "Subscripts cannot be empty.",
  "name-subscript": "'{n}' cannot have a subscript.",
  "too-many-params": "Functions can have at most 8 parameters.",
  "duplicate-definition":
    "You've defined '{n}' in more than one place. Try deleting some of the definitions of '{n}'.",
  dependency: "{n} has more than one definition.",
  cycle: "{n} can't be defined in terms of each other.",
  "function-cycle": "The definitions of functions {n} depend on each other.",
  "recursive-cycle": "The definitions of functions {n} depend on each other.",
  "implicit-variables": "We only support implicit equations of x and y.",
  "repeated-parameter": "Cannot use '{n}' for multiple parameters of this function.",
  "function-coordinate": "Try including '{n}' as an argument by defining the function as '{k}'.",
  "parameter-defined":
    "You can't use '{n}' as a parameter of this function because '{n}' is already defined.",
  "equation-required": "Try adding '{n}' to the beginning of this equation.",
  "reserved-name": "{n} is reserved and can't be redefined.",
  arity: "Function '{n}' requires {k} arguments.",
  "point-coordinates": "Too many variables, I don't know what to do with this.",
  "mixed-variables": "Try adding an equals sign to turn this into an equation.",
  "polar-variable": "{n} only has a meaning in a polar equation.",
  timeout: "This is taking too long. Try a smaller range or fewer terms.",
  "regression-data": "Regression needs a list of data.",
  "regression-predictor":
    "'{n}' may not be used as a regression parameter. Try using a different variable name.",
  "regression-params": "A regression can fit at most 8 parameters.",
  "regression-fit": "We couldn't find any region where this model is defined.",
  "nested-list": "Cannot store a list of numbers in a list.",
  "sample-size": "Sample size must be a finite, non-negative number.",
  "nested-empty-list": "Cannot store an empty list in a list.",
  "list-too-long": "Lists may not have more than 10,000 elements.",
  "range-step": "Ranges must be arithmetic sequences.",
  "list-mixed": "All elements of a list must have the same type.",
  "index-type": "Cannot index {n} with {k}.",
  "list-length-free": "Can't plot a list whose length depends on free variable '{n}'.",
  "empty-brackets": "Square brackets cannot be empty.",
  "empty-root": "Radical cannot be empty.",
  "empty-root-index": "Radical index cannot be empty.",
  "reducer-arguments":
    "Function '{n}' requires at least one argument. For example, try typing: {n}(1, 2).",
  "first-argument-list":
    "The first argument of '{n}' must be a list. For example, try typing: {n}([1,2,3], 1).",
  "argument-type": "Function '{n}' cannot be applied to {k}.",
  "both-lists":
    "Both arguments of '{n}' must be lists. For example, try typing: {n}([1,2,3], [3,2,1]).",
  "repeat-count": "'repeat' count must be a finite, non-negative integer.",
  "repeat-counts": "Each 'repeat' count must be a finite, non-negative integer.",
  "refused-function": "This calculator does not support the '{n}' function.",
  "repeat-lengths": "When the arguments of 'repeat' are lists, they must have the same length.",
  "colon-side": "You need something on both sides of the ':' symbol.",
  "colon-condition": "The left side of a ':' must be a condition, like 'x>1'.",
  "piecewise-condition": "A piecewise expression must have at least one condition.",
  "piecewise-part": "Every part of a piecewise expression must have a condition except the last.",
  "piecewise-types":
    "Cannot use {n} and {k} as the branches in a piecewise. Every branch must have the same type.",
  "comparator-types": "Cannot compare {n} to {k}.",
  "chained-equation": "This calculator cannot plot chained equations.",
  "long-chain": "This calculator cannot plot chains of more than 2 inequalities.",
  "double-inequality":
    "We only support solved double inequalities. Try deleting one side of the inequality.",
  "double-direction": "Double inequalities must both go the same way, e.g. 1 < y < 2.",
  "distribution-call":
    "'{n}' should be called on a distribution with a number. For example, try typing: D.{n}(x) where D=normaldist().",
  "distribution-function": "Cannot call distribution '{n}' as a function. Try '{n}.pdf(x)'.",
  "add-types": "Cannot add {n} and {k}.",
  "subtract-types": "Cannot subtract {k} from {n}.",
  "multiply-types": "Cannot multiply {n} by {k}.",
  "divide-types": "Cannot divide {n} by {k}.",
  "power-types": "Cannot raise {n} to {k}.",
  "negate-type": "Cannot negate {n}.",
  "point-coordinate-type": "Cannot use {n} as a coordinate of a point.",
  "coordinate-type": "Cannot access coordinate '.{n}' of {k}.",
  "point-function-arguments": "Function '{n}' requires {k}.",
  "point-function-arity": "Function '{n}' requires {k} arguments. ",
  "dot-call": "Function '{n}' cannot be called with dot notation.",
  "member-target": "Cannot call '.{n}' on {k}.",
  "unexpected-symbol": "Sorry, I don't understand the way that '{n}' is used here.",
  "logic-outside-condition": "'{n}' can only be used as part of a condition.",
  "too-many-variables": "Too many variables. Try defining '{n}'.",
  "operator-side": "You need something on both sides of the '{n}' symbol.",
  "operator-after": "You need something after the '{n}' symbol.",
  "operator-before": "You need something before the '{n}' symbol.",
  unmatched: "Expected '{n}' to match '{k}'.",
  "unknown-symbol": "Sorry, I don't understand the '{n}' symbol.",
  "empty-parentheses": "Parentheses cannot be empty.",
  "empty-pipe": "Absolute value symbol cannot be empty.",
  "empty-superscript": "Superscripts cannot be empty.",
  "fraction-empty": "You need a numerator and denominator for your fraction.",
  "fraction-numerator": "You need a numerator for the top of your fraction.",
  "fraction-denominator": "You need a denominator for the bottom of your fraction.",
  "invalid-subscript": "Subscripts may only contain letters and digits. '{n}' is not allowed.",
  "subscript-target": "Only functions and variables may have subscripts.",
  "adjacent-numbers":
    "Sorry, I don't know what to do with adjacent numbers '{n}' and '{k}'. Try using parentheses or a '*' symbol.",
  "for-duplicate": "You can't define '{n}' more than once on the right-hand side of 'for'.",
  "for-ambiguous": "Ambiguous use of ',' and 'for'. Add parentheses around the 'for' expression.",
  "for-list":
    "A definition on the right-hand side of 'for' must be a list, but {n} is a number. Try {n}=[{k}].",
  "mixed-number":
    "Sorry, I don't know what to do with mixed number '{n}'. Try using a '*' symbol around it.",
  "number-dot": "Sorry, I don't understand this use of '.' after a constant number.",
  "point-3d": "This calculator cannot plot a 3d point.",
  "percent-of": "'%' must be used with 'of'. Try '25% of 12'.",
  "prime-use": "Sorry, I don't understand this use of prime notation.",
  "prime-arity": "Prime notation can only be used for functions of a single argument.",
  "equality-here": "Cannot use an equality here.",
  "inequality-here": "Cannot use an inequality here.",
  "prime-superscript": "Superscripts and primes cannot be combined.",
  "function-undefined": "Function '{n}' is not defined.",
  "color-arity": "'{n}' should be called with 3 arguments. For example, try typing: {n}({k}).",
  "random-arguments":
    "'random' should be called with no arguments, or an optional number of samples. For example, try random() or random(10).",
  "requires-list": "'{n}' requires a list. For example, try typing: {n}([1,2,3]).",
  "too-many-arguments": "'{n}' accepts at most {k} arguments.",
  "polygon-points": "Function 'polygon' requires several points.",
  "symbol-context": "You can't use '{n}' in this context.",
  "complex-only": "The '{n}' function is only available in complex mode.",
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIXED: Record<string, string> = {
  "The first column needs a name, such as x₁.": "The first column needs a name, like x₁.",
  "First column may not be 'y', 'r', or 'θ'.": "The first column can't be y, r or θ.",
  "Table entry cannot be a point.": "A table cell can't be a point.",
  "Table entries must be simple expressions. Equations are not allowed.":
    "A table cell can't be an equation.",
  "Table entries must be simple expressions. Inequalities are not allowed.":
    "A table cell can't be an inequality.",
  "Table entries must be simple expressions. Lists are not allowed.":
    "A table cell can't be a list.",
  "Table entries must be simple expressions. Regressions are not allowed.":
    "A table cell can't be a regression.",
  "Table entries must be simple expressions. Function definitions are not allowed.":
    "A table cell can't define a function.",
  "Table entries must be simple expressions. This type of expression is not allowed.":
    "A table cell must be a simple expression.",
  "Table header cannot be a point.": "A column header can't be a point.",
  "Table headers must be simple expressions. Equations are not allowed.":
    "A column header can't be an equation.",
  "Table headers must be simple expressions. Inequalities are not allowed.":
    "A column header can't be an inequality.",
  "Table headers must be simple expressions. Lists are not allowed.":
    "A column header can't be a list.",
  "Table headers must be simple expressions. Regressions are not allowed.":
    "A column header can't be a regression.",
  "Table headers must be simple expressions. Function definitions are not allowed.":
    "A column header can't define a function.",
  "Table headers must be simple expressions. This type of expression is not allowed.":
    "A column header must be a simple expression.",
  "There's an error in the provided data.": "Some of the data has errors.",
  "Logarithmic regressions only work if the first column is all positive numbers.":
    "A log fit needs a positive first column.",
  "Invalid slider min. Try using any number.": "The slider min must be a number.",
  "Invalid slider max. Try using any number.": "The slider max must be a number.",
  "Invalid slider step. Try using any number.": "The slider step must be a number.",
  "Invalid slider limits. Min should be less than max.":
    "The slider min must be less than the max.",
  "These columns can't be referenced outside of the table. To export the regression model, first try renaming the columns.":
    "Rename these columns to export the model.",
  "Try adding an equals sign to turn this into an equation.":
    "Add an equals sign to make an equation.",
  "Too many variables, I don't know what to do with this.": "Too many unknown variables.",
};
const quoted = (s: string) => [...s.matchAll(/'([^']*)'/g)].map((m) => m[1]);

function translate(text: string): string | null {
  if (text in FIXED) return FIXED[text];
  let m: RegExpExecArray | null;
  if ((m = /^Too many variables\. Try defining (.*)\.$/.exec(text)))
    return tooManyVariables(quoted(m[1]));
  if ((m = /^Slider limits cannot depend on the slider variable '(.*)'\.$/.exec(text)))
    return `Slider limits can't use ${m[1]} itself.`;
  if (
    (m =
      /^Column (.*) can't be referenced outside of the table\. To create a standalone regression, first try renaming that column\.$/.exec(
        text
      ))
  )
    return `Rename column ${m[1]} to export the model.`;
  if ((m = /^Cannot regress (.*) against (.*)\.$/.exec(text)))
    return `Can't regress ${m[1]} against ${m[2]}.`;
  if (
    (m =
      /^Function '(.+?)' requires (an argument|only 1 argument|\d+ arguments)\. For example, try typing: (.*)\.$/.exec(
        text
      ))
  ) {
    const n = m[1];
    const needs =
      m[2] === "an argument"
        ? "needs an input"
        : m[2] === "only 1 argument"
          ? "takes only 1 input"
          : `needs ${m[2].replace(" arguments", "")} inputs`;
    return `${n} ${needs}, like ${m[3]}.`;
  }
  if ((m = /^(.*) can't be defined in terms of each other\.$/.exec(text)))
    return rowErrorMessage("cycle", quoted(m[1]));
  if ((m = /^The definition of function '(.*?)' depends on itself\.( If .*)?$/.exec(text)))
    return rowErrorMessage(m[2] ? "recursive-cycle" : "function-cycle", [m[1]]);
  if ((m = /^The definitions of functions (.*) depend on each other\.( If .*)?$/.exec(text)))
    return rowErrorMessage(m[2] ? "recursive-cycle" : "function-cycle", quoted(m[1]));
  if ((m = /^(.*) is for polar graphs, which aren't available yet\.$/.exec(text)))
    return `Polar graphs (${m[1]}) aren't available yet.`;
  for (const [code, tpl] of Object.entries(DESMOS) as [RowErrorCode, string][]) {
    if (code === "arity" || code === "too-many-variables" || code.endsWith("cycle")) continue;
    const re = new RegExp(
      "^" +
        esc(tpl)
          .replace(/\\\{n\\\}/, "(?<n>.*?)")
          .replace(/\\\{n\\\}/g, "\\k<n>")
          .replace(/\\\{k\\\}/, "(?<k>.*?)")
          .replace(/\\\{k\\\}/g, "\\k<k>") +
        "$"
    );
    const r = re.exec(text);
    if (r) {
      const names = [r.groups?.n ?? "", r.groups?.k ?? ""];
      if (code === "unmatched") return rowErrorMessage(code, [names[0]]);
      if (code === "equation-required") return rowErrorMessage(code, [names[0]]);
      return rowErrorMessage(
        code,
        tpl.includes("{k}") ? names : tpl.includes("{n}") ? [names[0]] : []
      );
    }
  }
  return null;
}

/** Karman's copy for a captured Desmos error text; a text it does not recognise comes back as is. */
export function karmanCopy(desmosText: string): string {
  return translate(desmosText) ?? desmosText;
}
