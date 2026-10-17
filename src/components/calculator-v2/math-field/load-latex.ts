// PR-3 spellings MathQuill's LaTeX parser cannot read, rewritten before latex(value) and
// write(latex). Only whole commands match (no letter may follow the name); every other
// character of the input is returned unchanged.

const REWRITES: Readonly<Record<string, string>> = Object.freeze({
  displaystyle: "",
  tfrac: "\\frac",
  leqslant: "\\le",
  geqslant: "\\ge",
  lvert: "\\left|",
  rvert: "\\right|",
});

// group 1: a named command from REWRITES; otherwise one of the spacing commands \, \; \: \!
const PATTERN = /\\(displaystyle|tfrac|leqslant|geqslant|lvert|rvert)(?![a-zA-Z])|\\[,;:!]/g;

export function toMathFieldLatex(latex: string): string {
  return latex.replace(PATTERN, (_match: string, name: string | undefined) =>
    name === undefined ? "" : REWRITES[name]
  );
}
