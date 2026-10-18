import { expect, it } from "vitest";
import { lexQuestionMath } from "./lex";

const rule = (s: string) => {
  const r = lexQuestionMath(s);
  return r.ok ? "ok" : r.rule;
};
const kinds = (s: string) => {
  const r = lexQuestionMath(s);
  if (!r.ok) throw new Error(`${s}: ${r.rule} ${r.detail}`);
  return r.tokens.map((t) => `${t.kind}:${t.text}`);
};

it("TR-8 table 4.2's allowed forms lex to tokens with source offsets", () => {
  expect(kinds("y=2x+3")).toEqual(["name:y", "rel:=", "num:2", "name:x", "op:+", "num:3"]);
  expect(kinds("\\frac{1}{2}\\cdot x\\div\\sqrt[3]{a_1}")).toEqual([
    "frac:\\frac",
    "open:{",
    "num:1",
    "close:}",
    "open:{",
    "num:2",
    "close:}",
    "op:*",
    "name:x",
    "op:/",
    "sqrt:\\sqrt",
    "open:[",
    "num:3",
    "close:]",
    "open:{",
    "name:a_{1}",
    "close:}",
  ]);
  expect(kinds("\\left|x\\right|\\le\\pi")).toEqual([
    "absOpen:\\left|",
    "name:x",
    "absClose:\\right|",
    "rel:<=",
    "pi:\\pi",
  ]);
  expect(kinds("\\sin^{-1}x+\\log_{2}8+\\alpha_{2}")).toEqual([
    "fn:sin",
    "op:^",
    "open:{",
    "op:-",
    "num:1",
    "close:}",
    "name:x",
    "op:+",
    "fn:log",
    "op:_",
    "open:{",
    "num:2",
    "close:}",
    "num:8",
    "op:+",
    "name:\\alpha_{2}",
  ]);
  expect(kinds("\\left\\{\\begin{array}{l}y=x\\\\y>2\\end{array}\\right.")).toEqual([
    "sysOpen:\\left\\{",
    "begin:array",
    "name:y",
    "rel:=",
    "name:x",
    "newline:\\\\",
    "name:y",
    "rel:>",
    "num:2",
    "end:array",
    "sysClose:\\right.",
  ]);
  expect(kinds("\\begin{aligned}2x+y&=5\\end{aligned}")).toEqual([
    "begin:aligned",
    "num:2",
    "name:x",
    "op:+",
    "name:y",
    "amp:&",
    "rel:=",
    "num:5",
    "end:aligned",
  ]);
  expect(kinds("ln x+sin(x);(1,2)")).toEqual([
    "fn:ln",
    "name:x",
    "op:+",
    "fn:sin",
    "open:(",
    "name:x",
    "close:)",
    "semi:;",
    "open:(",
    "num:1",
    "comma:,",
    "num:2",
    "close:)",
  ]);
  const r = lexQuestionMath("y = a_1x");
  expect(r.ok && r.tokens.map((t) => [t.start, t.end])).toEqual([
    [0, 1],
    [2, 3],
    [4, 7],
    [7, 8],
  ]);
});
it("TR-8 any other token or command means no control", () => {
  for (const s of [
    "\\Delta x",
    "\\tau",
    "x\\lt3",
    "\\operatorname{abs}(x)",
    "3!",
    "\\{1\\}",
    "\\lvert x\\rvert",
    "\\vec{v}",
    "x:y",
    "1.2.3",
    "2\\ x",
    "x\\qquad y",
    "√2",
    "\\frac12", // D3
    "\\sqrt2", // D3
    "x|y",
    "\\left.x\\right|",
    "a\\\\b",
    "x&y",
    "\\csch x",
    "\\arcsec x",
    "x_{1+2}",
    "*",
  ])
    expect(rule(s), s).toBe("TR-8");
});
it("TR-9 every excluded token of table 4.2 means no control", () => {
  const excluded = [
    "i+2",
    "2i",
    "f'(x)",
    "f^\\prime",
    "abc+1",
    "[2,5]",
    "\\begin{pmatrix}1\\\\2\\end{pmatrix}",
    "\\begin{array}{cc}1&2\\end{array}",
    "x=?",
    "1,2,\\ldots,10",
    "1+\\cdots+n",
    "\\dots",
    "1+...+n",
    "x\\approx3",
    "y\\sim x",
    "a\\cong b",
    "a\\equiv b",
    "x\\ne3",
    "x\\neq3",
    "\\pm2",
    "\\mp2",
    "\\infty",
    "x\\in A",
    "x\\notin A",
    "A\\subset B",
    "A\\cup B",
    "A\\cap B",
    "x\\to2",
    "p\\Rightarrow q",
    "p\\iff q",
    "12\\text{ cm}",
    "\\mathrm{kg}",
    "\\textrm{ft}",
    "\\mbox{in}",
    "90^\\circ",
    "90^{\\circ}",
    "90°",
    "\\$12.50",
    "15\\%",
    "€5",
    "£5",
    "¢5",
    "\\angle B",
    "\\measuredangle B",
    "\\triangle ABC",
    "\\overleftrightarrow{AB}",
    "\\overrightarrow{AB}",
    "\\widehat{A}",
    "AB\\parallel CD",
    "AB\\perp CD",
    "\\square",
    "\\odot",
    "\\circ",
    "\\overline{AB}",
    "12cm",
    "5 mm", // D2
    "3km",
    "6ft",
    "2yd",
    "4mi",
    "2in",
    "3hr",
    "5kg",
    "2lb",
    "8oz",
    "250mL",
  ];
  for (const s of excluded) expect(rule(s), s).toBe("TR-9");
});
it("TR-9 the exclusions are exact", () => {
  for (const s of [
    "x_{i}",
    "ab+1",
    "x cm",
    "\\sin x",
    "sin x",
    "ln2",
    "2\\pi",
    "\\theta",
    "\\sinh x",
  ])
    expect(rule(s), s).toBe("ok");
});
